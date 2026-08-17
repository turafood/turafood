-- ============================================================
-- TURAFOOD — SOLICITUDES DE SERVICIOS
--
-- Módulo de crecimiento del negocio: ficha de Google, campañas de
-- Google Ads y agente de voz que contesta y toma pedidos.
--
-- Ninguno de estos servicios se conecta solo. Lo que hace la app es
-- recoger, en un asistente guiado, TODO lo que el equipo de TuraFood
-- necesita para montarlo a mano, y dejarlo en una bandeja que el
-- Super Admin puede trabajar. La pantalla lo dice de frente: nadie
-- debe creer que apretando un botón ya quedó publicado en Google.
--
-- El borrador se guarda a medias a propósito: estos formularios son
-- largos y nadie los llena de una sentada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.service_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id  UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    kind         TEXT NOT NULL CHECK (kind IN (
                     'gmb',          -- ficha de Google (Google Business Profile)
                     'google_ads',   -- campañas de búsqueda o video
                     'voice_agent',  -- agente de voz que contesta la línea
                     'booking',      -- reservas con recordatorio automático
                     'website',      -- sitio web
                     'custom_app',   -- app a la medida
                     'other'
                 )),

    status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
                     'draft',        -- el negocio lo está llenando
                     'submitted',    -- lo mandó, esperando a TuraFood
                     'in_progress',  -- el equipo lo está montando
                     'active',       -- funcionando
                     'rejected',
                     'cancelled'
                 )),

    -- Respuestas del asistente. Va como JSON porque cada servicio pide
    -- cosas distintas y no vale la pena una tabla por cada uno.
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Lo que el equipo escribe de vuelta y el negocio ve en su panel
    team_notes   TEXT,
    reject_reason TEXT,

    assigned_to  UUID REFERENCES public.profiles(id),
    submitted_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),

    -- Un servicio activo por negocio a la vez: si quiere otro sitio web
    -- se edita el mismo, no se acumulan diez borradores iguales.
    UNIQUE (business_id, kind)
);

CREATE INDEX IF NOT EXISTS idx_service_requests_biz
    ON public.service_requests (business_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_queue
    ON public.service_requests (status, submitted_at)
    WHERE status IN ('submitted', 'in_progress');

CREATE TRIGGER service_requests_touch
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_requests_owner ON public.service_requests;
CREATE POLICY service_requests_owner ON public.service_requests
    FOR ALL
    USING (business_id = auth.uid() OR public.is_admin())
    WITH CHECK (business_id = auth.uid());

/**
 * El negocio no puede moverse el estado ni asignarse a nadie: eso lo
 * maneja el equipo. Solo puede editar sus respuestas y mandarlas.
 */
CREATE OR REPLACE FUNCTION public.guard_service_request()
RETURNS TRIGGER AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;
    NEW.status        := OLD.status;
    NEW.team_notes    := OLD.team_notes;
    NEW.reject_reason := OLD.reject_reason;
    NEW.assigned_to   := OLD.assigned_to;
    NEW.submitted_at  := OLD.submitted_at;
    NEW.business_id   := OLD.business_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS service_requests_guard ON public.service_requests;
CREATE TRIGGER service_requests_guard
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW EXECUTE FUNCTION public.guard_service_request();


/**
 * Guarda el borrador. Se puede llamar cuantas veces haga falta: el
 * negocio va llenando el asistente por partes.
 */
CREATE OR REPLACE FUNCTION public.save_service_draft(
    p_kind    TEXT,
    p_payload JSONB
)
RETURNS public.service_requests AS $$
DECLARE
    v_row public.service_requests%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.service_requests (business_id, kind, payload)
    VALUES (auth.uid(), p_kind, COALESCE(p_payload, '{}'::jsonb))
    ON CONFLICT (business_id, kind) DO UPDATE
        SET payload = COALESCE(EXCLUDED.payload, '{}'::jsonb)
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

/**
 * Manda la solicitud al equipo. Es SECURITY DEFINER porque el trigger
 * de arriba le impide al negocio tocar `status` por su cuenta, y este
 * es el único camino permitido para hacerlo.
 */
CREATE OR REPLACE FUNCTION public.submit_service_request(
    p_kind    TEXT,
    p_payload JSONB DEFAULT NULL
)
RETURNS public.service_requests AS $$
DECLARE
    v_row public.service_requests%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    INSERT INTO public.service_requests (business_id, kind, payload, status, submitted_at)
    VALUES (auth.uid(), p_kind, COALESCE(p_payload, '{}'::jsonb), 'submitted', now())
    ON CONFLICT (business_id, kind) DO UPDATE
        SET payload      = COALESCE(p_payload, public.service_requests.payload),
            status       = CASE
                               -- Si ya está andando, mandar de nuevo no lo
                               -- devuelve a la cola: solo actualiza datos.
                               WHEN public.service_requests.status IN ('in_progress', 'active')
                               THEN public.service_requests.status
                               ELSE 'submitted'
                           END,
            submitted_at = COALESCE(public.service_requests.submitted_at, now())
    RETURNING * INTO v_row;

    RETURN v_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.save_service_draft      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_service_request  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_service_draft     TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_service_request TO authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
