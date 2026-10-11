-- ============================================================
-- TURAFOOD — Notificaciones push (Web Push)
--
-- Piezas:
--   1. push_subscriptions: un registro por dispositivo/navegador.
--   2. register_push_subscription(): alta/actualización desde la app.
--      Es RPC (y no un INSERT directo) porque un mismo navegador puede
--      pasar de un usuario a otro (teléfono compartido, cierre de sesión):
--      el endpoint es único y debe reasignarse al usuario actual.
--   3. notifications -> push: cada fila nueva en `notifications` dispara
--      la Edge Function `send-push`. Así se reutiliza lo que ya genera
--      avisos (cambios de estado del pedido) y lo nuevo (pedido nuevo,
--      repartidor asignado).
--   4. internal_config: el secreto con el que la base se identifica ante
--      la Edge Function. Nadie lo lee por la API: sin políticas y sin
--      permisos para anon/authenticated. El valor NO va en este archivo
--      (el repositorio es público): se carga aparte.
--
-- Un fallo de push nunca puede romper un pedido: todo está envuelto en
-- EXCEPTION y el envío es asíncrono (pg_net).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Configuración interna (secretos de uso solo dentro de la base)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.internal_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
ALTER TABLE public.internal_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_config FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. Suscripciones push
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    app          TEXT NOT NULL CHECK (app IN ('cliente', 'negocio', 'repartidor', 'admin')),
    user_agent   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada quien ve y borra solo las suyas. Escribir se hace por el RPC.
DROP POLICY IF EXISTS push_subs_select_own ON public.push_subscriptions;
CREATE POLICY push_subs_select_own ON public.push_subscriptions
    FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_subs_delete_own ON public.push_subscriptions;
CREATE POLICY push_subs_delete_own ON public.push_subscriptions
    FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE INSERT, UPDATE ON public.push_subscriptions FROM anon, authenticated;
REVOKE ALL ON public.push_subscriptions FROM anon;

CREATE OR REPLACE FUNCTION public.register_push_subscription(
    p_endpoint   TEXT,
    p_p256dh     TEXT,
    p_auth       TEXT,
    p_app        TEXT,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión para activar los avisos';
    END IF;
    IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR length(p_endpoint) > 2000 THEN
        RAISE EXCEPTION 'Suscripción inválida';
    END IF;

    INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, app, user_agent)
    VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, p_app, left(p_user_agent, 300))
    ON CONFLICT (endpoint) DO UPDATE
       SET user_id      = auth.uid(),      -- el navegador cambió de dueño
           p256dh       = EXCLUDED.p256dh,
           auth         = EXCLUDED.auth,
           app          = EXCLUDED.app,
           user_agent   = EXCLUDED.user_agent,
           last_seen_at = now()
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.unregister_push_subscription(p_endpoint TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.push_subscriptions
     WHERE endpoint = p_endpoint AND user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.unregister_push_subscription(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_push_subscription(TEXT) TO authenticated;

-- ------------------------------------------------------------
-- 3. notifications -> Edge Function send-push
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM public.internal_config WHERE key = 'push_secret';
    IF v_secret IS NULL THEN
        RETURN NEW;                          -- push aún no configurado
    END IF;

    PERFORM net.http_post(
        url     := 'https://btaddjjzpvyqltkchqki.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
                       'Content-Type', 'application/json',
                       'x-push-secret', v_secret),
        body    := jsonb_build_object(
                       'notification_id', NEW.id,
                       'user_id', NEW.user_id,
                       'title', NEW.title,
                       'body', NEW.body,
                       'link', NEW.link,
                       'kind', NEW.kind),
        timeout_milliseconds := 5000
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;                              -- el aviso nunca rompe el pedido
END;
$$;

DROP TRIGGER IF EXISTS notifications_push ON public.notifications;
CREATE TRIGGER notifications_push
    AFTER INSERT ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();

-- ------------------------------------------------------------
-- 4. Avisos que faltaban: pedido nuevo (negocio) y asignación (repartidor)
--    El cliente ya recibe los suyos por notify_order_status().
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF COALESCE(NEW.is_demo, FALSE) THEN
        RETURN NEW;                          -- las comandas de ejemplo no suenan
    END IF;

    INSERT INTO public.notifications (user_id, kind, title, body, icon, link, order_id)
    VALUES (
        NEW.business_id, 'new_order', 'Pedido nuevo',
        -- Sin monto a propósito: place_order inserta el pedido y calcula los
        -- totales después, así que aquí el total aún puede ser 0.
        'Pedido ' || COALESCE(NEW.order_number::TEXT, '') || ' · revísalo y acéptalo',
        'receipt_long', '/negocio/pedidos', NEW.id
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_new ON public.orders;
CREATE TRIGGER orders_notify_new
    AFTER INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE OR REPLACE FUNCTION public.notify_courier_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.courier_id IS NULL OR NEW.courier_id IS NOT DISTINCT FROM OLD.courier_id
       OR COALESCE(NEW.is_demo, FALSE) THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, kind, title, body, icon, link, order_id)
    VALUES (
        NEW.courier_id, 'courier_assigned', 'Tienes un pedido',
        'Pedido ' || COALESCE(NEW.order_number::TEXT, '') || ' asignado a ti',
        'two_wheeler', '/repartidor', NEW.id
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_notify_courier ON public.orders;
CREATE TRIGGER orders_notify_courier
    AFTER UPDATE OF courier_id ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_courier_assigned();
