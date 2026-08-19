-- ============================================================
-- TURAFOOD — El blindaje de montos bloqueaba a quien si debe escribir
--
-- Sintoma: TODO pedido hecho desde la app queda en total $0, aunque
-- sus productos tengan el precio correcto. Y el webhook de ePayco no
-- puede marcar un pago como recibido.
--
-- La causa:
--
--   `place_order()` crea el pedido vacio, le cuelga los productos
--   releyendo el precio real de la base, suma, y al final hace un
--   UPDATE con los totales.
--
--   `guard_order_amounts` corre BEFORE UPDATE y revierte subtotal,
--   total, comision y payment_status a lo que habia antes — salvo que
--   quien llame sea administrador.
--
--   Quien llama es un cliente. Asi que el disparador deshace justo el
--   UPDATE que sella los totales, y el pedido se queda en cero.
--
-- El blindaje esta bien pensado: sin el, cualquiera con la consola del
-- navegador abierta podria escribir total = 0 y pedir gratis. El error
-- fue no dejarle una puerta a las funciones que SI tienen derecho.
--
-- La puerta es una bandera de transaccion que `place_order` enciende
-- justo antes de su UPDATE. Al ser transaction-local (`is_local` en
-- true) se apaga sola al terminar, y no se puede encender desde el
-- navegador porque `set_config` no esta expuesta a la API.
--
-- Nota sobre lo que NO sirve aqui: comprobar `current_user` dentro del
-- disparador. Como el disparador es SECURITY DEFINER, ahi `current_user`
-- siempre es el dueno de la funcion — el chequeo daria verdadero para
-- todo el mundo y el blindaje quedaria desactivado. Para reconocer al
-- webhook se usa `auth.role()`, que sale del token y no se puede
-- falsificar desde el navegador.
-- ============================================================

-- ------------------------------------------------------------
-- 1. El blindaje, con sus dos excepciones
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_order_amounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $guard$
BEGIN
    -- Un administrador puede corregir un pedido a mano
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Las funciones de la base que sellan montos. La bandera solo vive
    -- dentro de la transaccion que la encendio.
    IF COALESCE(current_setting('turafood.sella_montos', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    -- El webhook de pagos: es la unica autoridad sobre si un pago se
    -- dio por bueno, y entra con la llave de servicio.
    IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Para todos los demas, los montos son de solo lectura.
    NEW.subtotal       := OLD.subtotal;
    NEW.delivery_fee   := OLD.delivery_fee;
    NEW.service_fee    := OLD.service_fee;
    NEW.tip            := OLD.tip;
    NEW.discount       := OLD.discount;
    NEW.total          := OLD.total;
    NEW.payment_status := OLD.payment_status;
    NEW.epayco_ref     := OLD.epayco_ref;
    NEW.business_commission := OLD.business_commission;
    NEW.platform_revenue    := OLD.platform_revenue;
    NEW.customer_id    := OLD.customer_id;
    NEW.business_id    := OLD.business_id;
    NEW.order_number   := OLD.order_number;

    RETURN NEW;
END;
$guard$;

-- ------------------------------------------------------------
-- 2. place_order, identica salvo que enciende la bandera al sellar
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_order(
    p_business_id  UUID,
    p_items        JSONB,      -- [{product_id, quantity, extra_ids:[], notes}]
    p_mode         TEXT DEFAULT 'delivery',
    p_address_id   UUID DEFAULT NULL,
    p_tip          NUMERIC DEFAULT 0,
    p_coupon_code  TEXT DEFAULT NULL,
    p_instructions TEXT DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash'
)
RETURNS public.orders AS $$
DECLARE
    v_user        UUID := auth.uid();
    v_biz         public.business_profiles%ROWTYPE;
    v_addr        public.addresses%ROWTYPE;
    v_item        JSONB;
    v_product     public.products%ROWTYPE;
    v_unit_price  NUMERIC;
    v_extras_json JSONB;
    v_qty         INTEGER;
    v_subtotal    NUMERIC := 0;
    v_delivery    NUMERIC := 0;
    v_service     NUMERIC := 0;
    v_discount    NUMERIC := 0;
    v_tip         NUMERIC := GREATEST(COALESCE(p_tip, 0), 0);
    v_total       NUMERIC;
    v_coupon      public.coupons%ROWTYPE;
    v_order       public.orders%ROWTYPE;
    v_is_plus     BOOLEAN := false;
BEGIN
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Debes iniciar sesión para hacer un pedido';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El carrito está vacío';
    END IF;

    SELECT * INTO v_biz FROM public.business_profiles WHERE id = p_business_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El negocio no existe';
    END IF;
    IF v_biz.status <> 'active' THEN
        RAISE EXCEPTION 'El negocio no está disponible en este momento';
    END IF;
    IF NOT v_biz.is_open THEN
        RAISE EXCEPTION 'El negocio está cerrado en este momento';
    END IF;

    -- Dirección (solo para domicilio, y solo si es del propio usuario)
    IF p_mode = 'delivery' THEN
        IF p_address_id IS NULL THEN
            RAISE EXCEPTION 'Selecciona una dirección de entrega';
        END IF;
        SELECT * INTO v_addr
          FROM public.addresses
         WHERE id = p_address_id AND user_id = v_user;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Dirección inválida';
        END IF;
    END IF;

    SELECT COALESCE(tura_plus, false)
             AND (tura_plus_expires_at IS NULL OR tura_plus_expires_at > now())
      INTO v_is_plus
      FROM public.profiles WHERE id = v_user;

    -- Crear el pedido vacío para poder colgarle los items
    INSERT INTO public.orders (
        customer_id, business_id, mode, status,
        delivery_address, delivery_detail, delivery_location, delivery_instructions,
        payment_method, coupon_code
    ) VALUES (
        v_user, p_business_id, p_mode, 'pending',
        v_addr.address, v_addr.detail, v_addr.location, p_instructions,
        p_payment_method, NULLIF(TRIM(p_coupon_code), '')
    ) RETURNING * INTO v_order;

    -- Recorrer items releyendo SIEMPRE el precio real de la BD
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        SELECT * INTO v_product
          FROM public.products
         WHERE id = (v_item->>'product_id')::uuid
           AND business_id = p_business_id
           AND is_available;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Un producto de tu carrito ya no está disponible';
        END IF;

        v_qty := GREATEST(COALESCE((v_item->>'quantity')::int, 1), 1);
        v_unit_price := v_product.price;
        v_extras_json := '[]'::jsonb;

        -- Sumar extras, validando que pertenezcan al producto
        IF v_item ? 'extra_ids' AND jsonb_array_length(v_item->'extra_ids') > 0 THEN
            SELECT COALESCE(SUM(e.price_delta), 0),
                   COALESCE(jsonb_agg(jsonb_build_object(
                       'id', e.id, 'group', e.group_name,
                       'name', e.name, 'price', e.price_delta)), '[]'::jsonb)
              INTO v_unit_price, v_extras_json
              FROM public.product_extras e
             WHERE e.product_id = v_product.id
               AND e.id IN (
                   SELECT (jsonb_array_elements_text(v_item->'extra_ids'))::uuid
               );
            v_unit_price := v_product.price + COALESCE(v_unit_price, 0);
        END IF;

        v_subtotal := v_subtotal + (v_unit_price * v_qty);

        INSERT INTO public.order_items (
            order_id, product_id, name, unit_price, quantity, extras, notes, subtotal
        ) VALUES (
            v_order.id, v_product.id, v_product.name, v_unit_price, v_qty,
            v_extras_json, NULLIF(v_item->>'notes', ''), v_unit_price * v_qty
        );
    END LOOP;

    IF v_subtotal < COALESCE(v_biz.min_order, 0) THEN
        RAISE EXCEPTION 'El pedido mínimo de este negocio es %', v_biz.min_order;
    END IF;

    -- Envío y tarifa de servicio
    IF p_mode = 'delivery' THEN
        v_delivery := COALESCE(v_biz.delivery_fee, 3900);
        IF v_is_plus THEN
            v_delivery := 0;   -- beneficio Tura Plus
        END IF;
    END IF;
    -- Tarifa de servicio fija ($1.900), como la muestra el diseño en
    -- carrito y checkout. No es un porcentaje del subtotal.
    v_service := CASE WHEN v_subtotal > 0 THEN 1900 ELSE 0 END;

    -- Cupón
    IF v_order.coupon_code IS NOT NULL THEN
        SELECT * INTO v_coupon
          FROM public.coupons
         WHERE UPPER(code) = UPPER(v_order.coupon_code)
           AND is_active
           AND (valid_until IS NULL OR valid_until > now())
           AND (uses_limit IS NULL OR uses_count < uses_limit);

        IF FOUND AND v_subtotal >= COALESCE(v_coupon.min_order, 0) THEN
            v_discount := CASE v_coupon.discount_type
                WHEN 'percent'       THEN LEAST(ROUND(v_subtotal * v_coupon.discount_value / 100),
                                                COALESCE(v_coupon.max_discount, 1e9))
                WHEN 'fixed'         THEN LEAST(v_coupon.discount_value, v_subtotal)
                WHEN 'free_delivery' THEN v_delivery
            END;
            UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
        ELSE
            UPDATE public.orders SET coupon_code = NULL WHERE id = v_order.id;
        END IF;
    END IF;

    v_total := GREATEST(v_subtotal + v_delivery + v_service + v_tip - v_discount, 0);

    -- Enciende la bandera que el blindaje respeta. Es local a esta
    -- transaccion: se apaga sola aunque algo falle, y no hay forma de
    -- encenderla desde el navegador porque set_config no esta expuesta.
    PERFORM set_config('turafood.sella_montos', 'on', true);

    UPDATE public.orders
       SET subtotal            = v_subtotal,
           delivery_fee        = v_delivery,
           service_fee         = v_service,
           tip                 = v_tip,
           discount            = v_discount,
           total               = v_total,
           -- 0% si el negocio tiene Biz Pro vigente (solo paga suscripción)
           business_commission = ROUND(v_subtotal * public.effective_commission_rate(p_business_id)),
           platform_revenue    = v_service
                                 + ROUND(v_subtotal * public.effective_commission_rate(p_business_id))
     WHERE id = v_order.id
     RETURNING * INTO v_order;

    PERFORM set_config('turafood.sella_montos', 'off', true);

    RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.place_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order TO authenticated;

-- ------------------------------------------------------------
-- 3. Reparar los pedidos que ya quedaron en cero
--
-- Se recalculan desde sus propios productos, que si tienen el precio
-- correcto. Los que ya tienen total no se tocan.
-- ------------------------------------------------------------
DO $reparar$
DECLARE
    o      RECORD;
    v_sub  NUMERIC;
    v_serv NUMERIC := 1900;
    v_rate NUMERIC;
    v_n    INT := 0;
BEGIN
    PERFORM set_config('turafood.sella_montos', 'on', true);

    FOR o IN
        SELECT id, business_id, delivery_fee, tip, discount
          FROM public.orders
         WHERE total = 0
    LOOP
        SELECT COALESCE(sum(subtotal), 0) INTO v_sub
          FROM public.order_items WHERE order_id = o.id;

        IF v_sub = 0 THEN
            CONTINUE;
        END IF;

        v_rate := public.effective_commission_rate(o.business_id);

        UPDATE public.orders
           SET subtotal            = v_sub,
               service_fee         = v_serv,
               total               = GREATEST(v_sub + COALESCE(o.delivery_fee, 0)
                                              + v_serv + COALESCE(o.tip, 0)
                                              - COALESCE(o.discount, 0), 0),
               business_commission = ROUND(v_sub * v_rate),
               platform_revenue    = v_serv + ROUND(v_sub * v_rate)
         WHERE id = o.id;

        v_n := v_n + 1;
    END LOOP;

    PERFORM set_config('turafood.sella_montos', 'off', true);
    RAISE NOTICE 'Pedidos reparados: %', v_n;
END $reparar$;

-- Comprobacion: no deberian quedar pedidos con productos y total cero
SELECT count(*) AS pedidos_en_cero_con_productos
  FROM public.orders o
 WHERE o.total = 0
   AND EXISTS (SELECT 1 FROM public.order_items i WHERE i.order_id = o.id);
