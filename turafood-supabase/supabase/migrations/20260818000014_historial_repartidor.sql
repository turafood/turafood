-- ============================================================
-- TURAFOOD — Que al repartidor le cuenten las entregas
--
-- Encontrado haciendo una entrega completa: el pedido queda
-- `delivered`, con `courier_earnings` de $6.900 bien calculado… y el
-- historial del repartidor no se movió. Seguía en 1.284 entregas y
-- $4.820.000, exactamente igual que antes.
--
-- POR QUÉ
--
-- `complete_delivery` termina con:
--
--     UPDATE courier_profiles
--        SET total_deliveries = total_deliveries + 1,
--            total_earnings   = total_earnings + courier_earnings
--
-- Pero sobre esa tabla vive `guard_courier_privileged_fields`, que
-- revierte justo esas dos columnas para todo el que no sea admin. La
-- función es SECURITY DEFINER, sí — pero `auth.uid()` adentro sigue
-- siendo el repartidor, así que `is_admin()` da falso y el guard le
-- deshace el UPDATE.
--
-- El guard está bien: sin él, cualquier repartidor se pondría un
-- millón de ganancias desde el navegador. Lo que faltaba era una
-- puerta para las funciones de la casa.
--
-- CONSECUENCIA SI NO SE ARREGLA
--
-- La pantalla de Ganancias muestra siempre el mismo número, el nivel
-- (Bronce, Plata…) nunca sube, y lo que se le debe a cada repartidor
-- no queda registrado en ningún lado. Es plata.
--
-- Es la tercera vez que aparece este mismo patrón —montos del pedido,
-- comisión del negocio y ahora esto—: una función SECURITY DEFINER
-- chocando contra un guard que solo deja pasar a `is_admin()`.
-- ============================================================


-- ------------------------------------------------------------
-- 1. La puerta para las funciones de la casa
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_courier_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Las funciones de la base que sí tienen derecho a mover esto.
    -- La marca solo vive dentro de la transacción que la encendió y
    -- no se puede prender desde el navegador: `set_config` no se
    -- expone por PostgREST.
    IF COALESCE(current_setting('turafood.sella_repartidor', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.approval_status  := OLD.approval_status;
    NEW.commission_rate  := OLD.commission_rate;
    NEW.total_earnings   := OLD.total_earnings;
    NEW.total_deliveries := OLD.total_deliveries;
    NEW.pro_plan         := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;

    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 2. `complete_delivery`, marcada
--
-- Se reescribe completa para no perder nada de lo que ya hacía: el
-- bloqueo de la fila, el código de entrega y la idempotencia.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_delivery(
    p_order_id UUID,
    p_code     TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        RETURN v_row;   -- idempotente: reintentar no suma dos veces
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

    -- Acá estaba el problema: sin la marca, el guard revertía las dos
    -- columnas y la entrega no se le contaba a nadie.
    PERFORM set_config('turafood.sella_repartidor', 'on', true);

    UPDATE public.courier_profiles
       SET total_deliveries = total_deliveries + 1,
           total_earnings   = total_earnings + COALESCE(v_row.courier_earnings, 0)
     WHERE id = auth.uid();

    PERFORM set_config('turafood.sella_repartidor', 'off', true);

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_delivery(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- 3. Reconstruir el historial de quien ya entregó
--
-- Las entregas que se hicieron mientras el guard las revertía no se
-- contaron. Se recalculan desde `orders`, que es la fuente de verdad.
--
-- OJO: los repartidores de prueba traen números sembrados a mano
-- (1.284 entregas, $4.820.000) que no corresponden a ningún pedido
-- real. Recalcular los dejaría en su cifra real, que es lo correcto —
-- pero se hace solo para quien TIENE pedidos entregados de verdad,
-- para no borrar la demo de un plumazo.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM set_config('turafood.sella_repartidor', 'on', true);

    WITH reales AS (
        SELECT courier_id,
               count(*)                              AS entregas,
               COALESCE(sum(courier_earnings), 0)    AS ganado
          FROM public.orders
         WHERE status = 'delivered'
           AND courier_id IS NOT NULL
           AND NOT is_demo
         GROUP BY courier_id
    )
    UPDATE public.courier_profiles c
       SET total_deliveries = GREATEST(c.total_deliveries, r.entregas),
           total_earnings   = GREATEST(c.total_earnings, r.ganado)
      FROM reales r
     WHERE c.id = r.courier_id
       AND (c.total_deliveries < r.entregas OR c.total_earnings < r.ganado);

    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('turafood.sella_repartidor', 'off', true);

    RAISE NOTICE 'Repartidores con el historial al día: %', v_n;
END;
$$;
