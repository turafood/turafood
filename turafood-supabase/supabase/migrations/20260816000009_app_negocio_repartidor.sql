-- ============================================================
-- TURAFOOD — SOPORTE PARA app.turafood.com
--
-- Añade lo que necesitan el panel del negocio y la app del
-- repartidor y que el esquema todavía no tenía:
--
--   1. Respuesta del negocio a una reseña.
--   2. Que un repartidor en línea vea los pedidos listos sin asignar.
--   3. Tomar un pedido sin que dos repartidores se lo peleen.
--   4. Marcar la entrega verificando el código del cliente.
--
-- Todo pasa por funciones SECURITY DEFINER con validaciones adentro:
-- la app nunca escribe montos ni se autoasigna un pedido a mano.
-- ============================================================

-- ------------------------------------------------------------
-- 1. RESPUESTA DEL NEGOCIO A UNA RESEÑA
-- ------------------------------------------------------------
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS business_reply TEXT,
    ADD COLUMN IF NOT EXISTS replied_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tags           TEXT[] DEFAULT '{}';

/**
 * El negocio responde una reseña suya. Se hace por función para que
 * solo pueda tocar la respuesta: ni la calificación, ni el comentario
 * del cliente, ni a quién pertenece la reseña.
 */
CREATE OR REPLACE FUNCTION public.reply_to_review(
    p_review_id UUID,
    p_reply     TEXT
)
RETURNS public.reviews AS $$
DECLARE
    v_row public.reviews%ROWTYPE;
BEGIN
    IF p_reply IS NULL OR btrim(p_reply) = '' THEN
        RAISE EXCEPTION 'La respuesta no puede estar vacía';
    END IF;

    UPDATE public.reviews
       SET business_reply = btrim(p_reply),
           replied_at     = now()
     WHERE id = p_review_id
       AND business_id = auth.uid()
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esa reseña no es de tu negocio';
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.reply_to_review FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_review TO authenticated;


-- ------------------------------------------------------------
-- 2. PEDIDOS DISPONIBLES PARA REPARTIDORES
--
-- Sin un despachador que reparta ofertas una por una, el modelo es
-- de bolsa: los pedidos listos y sin repartidor los ve cualquier
-- repartidor aprobado y en línea, y se los lleva el primero que
-- los tome. La política solo abre la LECTURA; asignarse el pedido
-- pasa por accept_order() más abajo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_courier()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.courier_profiles c
         WHERE c.id = auth.uid()
           AND c.approval_status = 'active'
           AND c.status = 'online'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.is_active_courier FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_courier TO authenticated;

DROP POLICY IF EXISTS orders_select_dispatch ON public.orders;
CREATE POLICY orders_select_dispatch ON public.orders
    FOR SELECT USING (
        courier_id IS NULL
        AND mode = 'delivery'
        AND status IN ('accepted', 'preparing', 'ready')
        AND public.is_active_courier()
    );

-- Para poder mostrar qué lleva el pedido antes de aceptarlo
DROP POLICY IF EXISTS order_items_select_dispatch ON public.order_items;
CREATE POLICY order_items_select_dispatch ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
             WHERE o.id = order_id
               AND o.courier_id IS NULL
               AND o.mode = 'delivery'
               AND o.status IN ('accepted', 'preparing', 'ready')
        )
        AND public.is_active_courier()
    );


-- ------------------------------------------------------------
-- 3. TOMAR UN PEDIDO
--
-- El WHERE con `courier_id IS NULL` es la carrera: si dos
-- repartidores tocan "Aceptar" a la vez, solo uno actualiza la fila
-- y el otro recibe el error. No hace falta bloqueo explícito.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_order(p_order_id UUID)
RETURNS public.orders AS $$
DECLARE
    v_row public.orders%ROWTYPE;
BEGIN
    IF NOT public.is_active_courier() THEN
        RAISE EXCEPTION 'Debes estar en línea y con la cuenta aprobada para tomar pedidos';
    END IF;

    UPDATE public.orders
       SET courier_id = auth.uid(),
           status     = 'courier_assigned'
     WHERE id = p_order_id
       AND courier_id IS NULL
       AND mode = 'delivery'
       AND status IN ('accepted', 'preparing', 'ready')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido ya lo tomó otro repartidor';
    END IF;

    -- Si existía una oferta para este repartidor, queda aceptada
    UPDATE public.order_offers
       SET status = 'accepted'
     WHERE order_id = p_order_id AND courier_id = auth.uid();

    -- Y las demás ofertas del mismo pedido se caen
    UPDATE public.order_offers
       SET status = 'expired'
     WHERE order_id = p_order_id AND courier_id <> auth.uid() AND status = 'pending';

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.accept_order FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_order TO authenticated;


-- ------------------------------------------------------------
-- 4. AVANZAR Y CERRAR LA ENTREGA
--
-- El repartidor solo puede mover SU pedido y solo hacia adelante.
-- Al entregar se valida el código que el cliente ve en su app: los
-- últimos 4 dígitos del número de pedido.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.courier_advance_order(
    p_order_id UUID,
    p_status   TEXT
)
RETURNS public.orders AS $$
DECLARE
    v_row public.orders%ROWTYPE;
BEGIN
    IF p_status NOT IN ('picked_up', 'delivering') THEN
        RAISE EXCEPTION 'Estado no permitido desde la app del repartidor';
    END IF;

    UPDATE public.orders
       SET status       = p_status,
           picked_up_at = CASE WHEN p_status = 'picked_up' THEN now() ELSE picked_up_at END
     WHERE id = p_order_id
       AND courier_id = auth.uid()
       AND status IN ('courier_assigned', 'picked_up', 'delivering')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no está asignado a ti';
    END IF;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Cierra la entrega. `p_code` son los 4 últimos dígitos del número de
 * pedido, que el cliente tiene a la vista en su seguimiento.
 */
CREATE OR REPLACE FUNCTION public.complete_delivery(
    p_order_id UUID,
    p_code     TEXT
)
RETURNS public.orders AS $$
DECLARE
    v_row      public.orders%ROWTYPE;
    v_expected TEXT;
BEGIN
    SELECT * INTO v_row
      FROM public.orders
     WHERE id = p_order_id AND courier_id = auth.uid()
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no está asignado a ti';
    END IF;

    IF v_row.status = 'delivered' THEN
        RETURN v_row;   -- idempotente: reintentar no rompe nada
    END IF;

    v_expected := right(regexp_replace(v_row.order_number, '\D', '', 'g'), 4);

    IF p_code IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'Código incorrecto';
    END IF;

    UPDATE public.orders
       SET status       = 'delivered',
           delivered_at = now()
     WHERE id = p_order_id
    RETURNING * INTO v_row;

    -- El repartidor suma la entrega a su historial
    UPDATE public.courier_profiles
       SET total_deliveries = total_deliveries + 1,
           total_earnings   = total_earnings + COALESCE(v_row.courier_earnings, 0)
     WHERE id = auth.uid();

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.courier_advance_order FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_delivery     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_advance_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_delivery     TO authenticated;


-- ------------------------------------------------------------
-- 5. PROMOCIONES DEL NEGOCIO
--
-- `coupons` era solo de plataforma. Con `business_id` un negocio
-- puede crear las suyas, que aplican únicamente en su tienda.
-- Las de plataforma (business_id NULL) las siguen manejando los
-- administradores.
-- ------------------------------------------------------------
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_coupons_business ON public.coupons (business_id);

DROP POLICY IF EXISTS coupons_business_write ON public.coupons;
CREATE POLICY coupons_business_write ON public.coupons
    FOR ALL
    USING (business_id IS NOT NULL AND business_id = auth.uid())
    WITH CHECK (business_id IS NOT NULL AND business_id = auth.uid());

-- El negocio ve las suyas aunque estén pausadas
DROP POLICY IF EXISTS coupons_select_own ON public.coupons;
CREATE POLICY coupons_select_own ON public.coupons
    FOR SELECT USING (business_id = auth.uid());


-- ------------------------------------------------------------
-- 6. Permisos sobre lo que se acaba de crear
-- ------------------------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
