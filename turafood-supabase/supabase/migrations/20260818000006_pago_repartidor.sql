-- ============================================================
-- TURAFOOD — El repartidor cobra, y nadie se firma su propio cheque
--
-- Dos cosas que salieron al hacer una entrega completa de verdad:
-- pedir, cocinar, despachar, recoger y entregar.
--
-- 1. EL REPARTIDOR ENTREGA GRATIS
--    `courier_earnings` nunca se escribe en ningún lado: se declara
--    con DEFAULT 0 y solo se lee, al sumarlo a su historial. Así que
--    entrega, la app le suma 0 a sus ganancias, y no tiene qué
--    retirar. El domicilio de $3.900 que paga el cliente no llega a
--    nadie.
--
--    Que sea del repartidor no lo estoy inventando: `place_order` ya
--    calcula `platform_revenue` como servicio + comisión, dejando el
--    domicilio y la propina deliberadamente por fuera. Eran suyos, lo
--    que faltaba era escribirlo.
--
--    >>> Si tu reparto es otro, el número está en UNA sola línea, más
--    >>> abajo, marcada. Cambiala ahí y ya.
--
-- 2. CADA UNO PUEDE ESCRIBIRSE SU PARTE
--    El guard protege subtotal, total, comisión y demás, pero se le
--    quedaron por fuera cuatro columnas de plata. Comprobado contra
--    la base, no leyendo el código:
--
--      · el repartidor se puso `courier_earnings` en 999.999
--      · el negocio se puso `restaurant_amount` en 777.777
--      · y también `commission_percentage` y
--        `payment_processing_cost`
--
--    Todas pasaron. Con `request_payout` de por medio, eso es retirar
--    plata que nunca se ganó.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Que el domicilio y la propina lleguen a quien maneja
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sellar_pago_repartidor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Se recalcula cada vez que cambian los montos del pedido, así un
    -- cupón de envío gratis o una propina agregada después quedan
    -- reflejados sin tener que acordarse de tocar esto aparte.
    --
    -- >>> ACÁ está el reparto. Hoy: todo el domicilio + toda la
    -- >>> propina son del repartidor. Si querés dejarle, por ejemplo,
    -- >>> el 80% del domicilio, sería:
    -- >>>     ROUND(COALESCE(NEW.delivery_fee,0) * 0.80) + COALESCE(NEW.tip,0)
    NEW.courier_earnings := COALESCE(NEW.delivery_fee, 0) + COALESCE(NEW.tip, 0);

    -- Para llevar: se lo lleva quien pidió, no hay quien maneje
    IF NEW.mode = 'pickup' THEN
        NEW.courier_earnings := 0;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sellar_pago_repartidor ON public.orders;

-- BEFORE, para que escriba sobre la misma fila sin un UPDATE aparte
-- que el guard tendría que volver a dejar pasar.
CREATE TRIGGER trg_sellar_pago_repartidor
    BEFORE INSERT OR UPDATE OF delivery_fee, tip, mode ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.sellar_pago_repartidor();


-- ------------------------------------------------------------
-- 2. Cerrar las cuatro columnas que quedaron abiertas
--
-- Es el mismo guard de la migración 004 con cuatro líneas más. Se
-- reescribe completo a propósito: un guard partido en pedazos entre
-- migraciones es imposible de leer cuando toca revisarlo con plata
-- de por medio.
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
    -- dentro de la transacción que la encendió.
    IF COALESCE(current_setting('turafood.sella_montos', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    -- El webhook de pagos: es la única autoridad sobre si un pago se
    -- dio por bueno, y entra con la llave de servicio.
    IF COALESCE(auth.role(), '') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Para todos los demás, los montos son de solo lectura.
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

    -- Las cuatro que faltaban. Cada una la escribía justo la parte a
    -- la que le convenía inflarla.
    NEW.courier_earnings        := OLD.courier_earnings;
    NEW.restaurant_amount       := OLD.restaurant_amount;
    NEW.commission_percentage   := OLD.commission_percentage;
    NEW.payment_processing_cost := OLD.payment_processing_cost;

    RETURN NEW;
END;
$guard$;


-- ------------------------------------------------------------
-- 3. Pagarle a quien ya entregó
--
-- Los pedidos que se entregaron con la versión anterior quedaron con
-- el repartidor en cero. Se recalculan con la misma regla.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM set_config('turafood.sella_montos', 'on', true);

    UPDATE public.orders
       SET courier_earnings = CASE
               WHEN mode = 'pickup' THEN 0
               ELSE COALESCE(delivery_fee, 0) + COALESCE(tip, 0)
           END
     WHERE courier_id IS NOT NULL
       AND COALESCE(courier_earnings, 0) <> CASE
               WHEN mode = 'pickup' THEN 0
               ELSE COALESCE(delivery_fee, 0) + COALESCE(tip, 0)
           END;

    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('turafood.sella_montos', 'off', true);

    RAISE NOTICE 'Pedidos con el pago del repartidor corregido: %', v_n;
END;
$$;
