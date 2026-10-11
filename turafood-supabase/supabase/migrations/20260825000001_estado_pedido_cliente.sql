-- ============================================================
-- TURAFOOD — El cliente no maneja el estado de su pedido
--
-- Hallazgo de la auditoría E2E (probado con una sesión anónima real): la
-- política orders_update deja al cliente actualizar su pedido, y los guards
-- existentes protegen montos, comisiones, pago y repartidor, pero NO el
-- estado. Un cliente podía hacer PATCH status='delivered' sobre su propio
-- pedido: la cocina dejaba de verlo y nunca lo preparaba.
--
-- Regla: quien SOLO es el cliente del pedido puede cancelarlo mientras está
-- pendiente (pending -> cancelled). Cualquier otro cambio de estado lo hacen
-- el negocio, el repartidor, el admin o el servidor (funciones y webhooks).
--
-- Es un trigger que solo VALIDA (no modifica nada), así que no cae en la
-- trampa de los guards contra SECURITY DEFINER: las funciones del sistema
-- (accept_order, courier_advance_order, complete_delivery) corren con el
-- auth.uid() del negocio o del repartidor, no del cliente, y los webhooks
-- con service_role no tienen auth.uid().
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_order_status_customer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    -- Solo se restringe a quien es ÚNICAMENTE el cliente de este pedido
    IF v_uid IS NOT NULL
       AND v_uid = OLD.customer_id
       AND v_uid IS DISTINCT FROM OLD.business_id
       AND v_uid IS DISTINCT FROM OLD.courier_id
       AND NOT public.is_admin() THEN

        IF OLD.status = 'pending' AND NEW.status = 'cancelled' THEN
            RETURN NEW;                      -- cancelar antes de que lo acepten: permitido
        END IF;
        RAISE EXCEPTION 'No puedes cambiar el estado del pedido. Si necesitas ayuda, escríbele al negocio o a soporte';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_guard_status_customer ON public.orders;
CREATE TRIGGER orders_guard_status_customer
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.guard_order_status_customer();
