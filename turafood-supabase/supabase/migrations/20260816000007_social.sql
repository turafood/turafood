-- ============================================================
-- TURAFOOD — FAVORITOS, NOTIFICACIONES Y MENSAJES
--
-- Las tres cosas que hasta ahora vivían solo en el navegador o se
-- derivaban de otra tabla. Al pasarlas a la base:
--   · los favoritos sobreviven al cambio de dispositivo;
--   · las notificaciones pueden crearse desde el servidor;
--   · el chat cliente–repartidor deja de ser una simulación.
-- ============================================================

-- ------------------------------------------------------------
-- 1. FAVORITOS
-- ------------------------------------------------------------
CREATE TABLE public.favorites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, business_id)
);

CREATE INDEX idx_favorites_user ON public.favorites (user_id, created_at DESC);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorites_own ON public.favorites
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- 2. NOTIFICACIONES
--    Las crea el servidor (triggers), nunca el cliente. El usuario
--    solo puede leerlas y marcarlas como leídas.
-- ------------------------------------------------------------
CREATE TABLE public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    kind       TEXT NOT NULL CHECK (kind IN (
        'order_status', 'promo', 'referral', 'payment', 'system'
    )),
    title      TEXT NOT NULL,
    body       TEXT,
    icon       TEXT,

    -- A dónde lleva al tocarla
    link       TEXT,
    order_id   UUID REFERENCES public.orders(id) ON DELETE CASCADE,

    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- Solo puede marcar como leída; no puede inventar notificaciones
CREATE POLICY notifications_update_own ON public.notifications
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.guard_notification_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN RETURN NEW; END IF;
    -- Lo único que el usuario cambia es el estado de lectura
    NEW.title := OLD.title;
    NEW.body := OLD.body;
    NEW.kind := OLD.kind;
    NEW.link := OLD.link;
    NEW.order_id := OLD.order_id;
    NEW.user_id := OLD.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notifications_guard
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.guard_notification_fields();

/**
 * Crea la notificación cuando el pedido cambia de estado.
 * Así el aviso queda registrado aunque el usuario tenga la app cerrada,
 * en vez de depender de que esté conectado por Realtime.
 */
CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS TRIGGER AS $$
DECLARE
    v_title TEXT;
    v_body  TEXT;
    v_icon  TEXT;
    v_biz   TEXT;
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT name INTO v_biz FROM public.business_profiles WHERE id = NEW.business_id;

    CASE NEW.status
        WHEN 'accepted'  THEN v_title := 'Pedido aceptado';
                              v_body := v_biz || ' está preparando tu pedido';
                              v_icon := 'restaurant';
        WHEN 'ready'     THEN v_title := 'Tu pedido está listo';
                              v_body := CASE WHEN NEW.mode = 'pickup'
                                             THEN 'Puedes recogerlo en ' || v_biz
                                             ELSE 'Buscando repartidor' END;
                              v_icon := 'takeout_dining';
        WHEN 'picked_up' THEN v_title := 'Tu pedido va en camino';
                              v_body := 'El repartidor ya lo recogió';
                              v_icon := 'two_wheeler';
        WHEN 'delivered' THEN v_title := 'Pedido entregado';
                              v_body := '¿Nos cuentas cómo te fue?';
                              v_icon := 'check_circle';
        WHEN 'cancelled' THEN v_title := 'Pedido cancelado';
                              v_body := COALESCE(NEW.cancel_reason, 'Revisa los detalles');
                              v_icon := 'cancel';
        ELSE RETURN NEW;
    END CASE;

    INSERT INTO public.notifications (user_id, kind, title, body, icon, link, order_id)
    VALUES (
        NEW.customer_id, 'order_status', v_title, v_body, v_icon,
        CASE WHEN NEW.status = 'delivered'
             THEN '/rate?order=' || NEW.id
             ELSE '/tracking?order=' || NEW.id END,
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER orders_notify_status
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- ------------------------------------------------------------
-- 3. MENSAJES DEL PEDIDO
--    Chat entre cliente, repartidor y negocio, atado a un pedido.
-- ------------------------------------------------------------
CREATE TABLE public.messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id   UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body       TEXT NOT NULL CHECK (LENGTH(TRIM(body)) BETWEEN 1 AND 1000),
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_order ON public.messages (order_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

/** Solo los involucrados en el pedido ven y escriben en su chat */
CREATE OR REPLACE FUNCTION public.can_access_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.orders o
         WHERE o.id = p_order_id
           AND (o.customer_id = auth.uid()
                OR o.business_id = auth.uid()
                OR o.courier_id = auth.uid())
    ) OR public.is_admin();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE POLICY messages_select ON public.messages
    FOR SELECT USING (public.can_access_order(order_id));

CREATE POLICY messages_insert ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND public.can_access_order(order_id)
    );

-- Marcar como leído: solo quien NO envió el mensaje
CREATE POLICY messages_update_read ON public.messages
    FOR UPDATE USING (sender_id <> auth.uid() AND public.can_access_order(order_id));

-- ------------------------------------------------------------
-- Realtime para que todo llegue sin recargar
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
