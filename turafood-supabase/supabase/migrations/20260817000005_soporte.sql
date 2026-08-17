-- ============================================================
-- TURAFOOD — SOPORTE
--
-- Cada solicitud es una conversación, no un correo perdido. El negocio
-- ve en qué va la suya y el equipo la trabaja desde el Super Admin.
--
-- El estado y la prioridad los mueve el equipo. El negocio abre, escribe
-- y puede cerrar la suya si se resolvió; nada más. Eso evita que una
-- solicitud aparezca "resuelta" sin que nadie la haya tocado.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quien abre. Puede ser un negocio o un repartidor: los dos entran
    -- por app.turafood.com y los dos necesitan pedir ayuda.
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Número corto para hablarlo por teléfono sin dictar un UUID
    reference   TEXT UNIQUE NOT NULL DEFAULT (
                    'TS-' || upper(substr(md5(gen_random_uuid()::text), 1, 6))
                ),

    subject     TEXT NOT NULL CHECK (length(btrim(subject)) BETWEEN 3 AND 140),
    category    TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
                    'orders',      -- pedidos y comandas
                    'payouts',     -- liquidaciones y pagos
                    'catalog',     -- menú y productos
                    'account',     -- cuenta y verificación
                    'growth',      -- servicios de crecimiento
                    'technical',   -- algo no funciona
                    'other'
                )),

    priority    TEXT NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
                    'open',         -- recién abierta
                    'in_progress',  -- el equipo la está viendo
                    'waiting',      -- esperando respuesta del negocio
                    'resolved',
                    'closed'
                )),

    assigned_to UUID REFERENCES public.profiles(id),

    -- Para medir de verdad qué tan rápido contestamos
    first_response_at TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ,

    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_for_user INTEGER DEFAULT 0,

    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_user
    ON public.support_tickets (user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_queue
    ON public.support_tickets (status, priority, created_at)
    WHERE status IN ('open', 'in_progress', 'waiting');

CREATE TRIGGER support_tickets_touch
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


CREATE TABLE IF NOT EXISTS public.support_messages (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id  UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- `user` es quien abrió; `team` es TuraFood
    author_role TEXT NOT NULL DEFAULT 'user' CHECK (author_role IN ('user', 'team')),

    body       TEXT NOT NULL CHECK (length(btrim(body)) > 0),
    attachment_url TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
    ON public.support_messages (ticket_id, created_at);


-- ------------------------------------------------------------
-- PERMISOS
-- ------------------------------------------------------------
ALTER TABLE public.support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tickets_owner ON public.support_tickets;
CREATE POLICY tickets_owner ON public.support_tickets
    FOR ALL USING (user_id = auth.uid() OR public.is_admin())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_messages_owner ON public.support_messages;
CREATE POLICY support_messages_owner ON public.support_messages
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND (t.user_id = auth.uid() OR public.is_admin())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.support_tickets t
         WHERE t.id = ticket_id AND t.user_id = auth.uid()
    ) AND author_role = 'user');

/**
 * El negocio no se mueve el estado, ni la prioridad, ni se asigna a
 * nadie. Lo único suyo es cerrar una solicitud que ya se resolvió.
 */
CREATE OR REPLACE FUNCTION public.guard_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    NEW.priority          := OLD.priority;
    NEW.assigned_to       := OLD.assigned_to;
    NEW.first_response_at := OLD.first_response_at;
    NEW.resolved_at       := OLD.resolved_at;
    NEW.user_id           := OLD.user_id;
    NEW.reference         := OLD.reference;

    -- Reabrir o cerrar la suya sí puede
    IF NEW.status NOT IN ('open', 'closed') THEN
        NEW.status := OLD.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS support_tickets_guard ON public.support_tickets;
CREATE TRIGGER support_tickets_guard
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW EXECUTE FUNCTION public.guard_support_ticket();

/** Mantiene la conversación ordenada por su último mensaje */
CREATE OR REPLACE FUNCTION public.touch_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.support_tickets
       SET last_message_at = NEW.created_at,
           -- Si contesta el equipo, al negocio le queda sin leer
           unread_for_user = CASE
               WHEN NEW.author_role = 'team' THEN unread_for_user + 1
               ELSE 0
           END,
           first_response_at = CASE
               WHEN NEW.author_role = 'team' AND first_response_at IS NULL
               THEN NEW.created_at ELSE first_response_at
           END,
           -- Una respuesta del negocio reabre lo que estaba esperándolo
           status = CASE
               WHEN NEW.author_role = 'user' AND status = 'waiting' THEN 'in_progress'
               ELSE status
           END
     WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS support_messages_touch ON public.support_messages;
CREATE TRIGGER support_messages_touch
    AFTER INSERT ON public.support_messages
    FOR EACH ROW EXECUTE FUNCTION public.touch_support_ticket();


/**
 * Abre una solicitud con su primer mensaje, en una sola transacción.
 * Sin esto puede quedar un ticket vacío si falla el segundo insert.
 */
CREATE OR REPLACE FUNCTION public.open_support_ticket(
    p_subject  TEXT,
    p_category TEXT,
    p_body     TEXT
)
RETURNS public.support_tickets AS $$
DECLARE
    v_row public.support_tickets%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.support_tickets (user_id, subject, category)
    VALUES (auth.uid(), btrim(p_subject), COALESCE(p_category, 'other'))
    RETURNING * INTO v_row;

    INSERT INTO public.support_messages (ticket_id, author_id, author_role, body)
    VALUES (v_row.id, auth.uid(), 'user', btrim(p_body));

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.open_support_ticket FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_support_ticket TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
