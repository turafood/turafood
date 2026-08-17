-- ============================================================
-- TURAFOOD — Marketing por correo (MailerLite)
--
-- Cuando un negocio activa un plan queremos que le llegue una
-- secuencia de correos. La tentación es llamar a MailerLite desde el
-- mismo momento en que se activa, pero eso ata dos sistemas: si
-- MailerLite está caído o el token venció, la activación del plan
-- falla. Y la activación del plan es lo que le importa al negocio.
--
-- Así que se separa en dos: aquí solo se ANOTA que hay que avisar
-- (`marketing_events`), dentro de la misma transacción que ya está
-- pasando. Una función aparte lee esa cola y llama a MailerLite. Si
-- falla, reintenta; el plan del negocio nunca se entera.
--
-- El token de MailerLite NO vive aquí ni en el repositorio: vive en
-- los secrets de Supabase, que solo el dueño pone.
--     supabase secrets set MAILERLITE_TOKEN=...
-- ============================================================

-- ------------------------------------------------------------
-- 1. A quién le escribimos
--
-- Guardamos el id que MailerLite nos devuelve para no crear el mismo
-- contacto dos veces cuando alguien compra un segundo plan.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_contacts (
    user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email        TEXT NOT NULL,
    full_name    TEXT,
    phone        TEXT,

    -- Identificador del contacto en MailerLite
    provider_id  TEXT,

    -- Si la persona se da de baja allá, lo reflejamos para no volver a
    -- meterla en grupos. MailerLite ya lo respeta, pero prefiero que la
    -- base también lo sepa: así ninguna consulta nuestra la cuenta.
    unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,

    synced_at    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_contacts IS
    'Espejo local de los contactos en MailerLite. provider_id evita duplicarlos.';

-- ------------------------------------------------------------
-- 2. La cola
--
-- Cada fila es "hay que decirle esto a MailerLite". La función
-- `mailerlite-sync` la drena. `status` no se toca desde el cliente:
-- solo service_role escribe aquí.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marketing_events (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    kind         TEXT NOT NULL CHECK (kind IN (
                     'business_registered',  -- creó su cuenta de negocio
                     'business_approved',    -- pasó la verificación
                     'plan_requested',       -- mandó la solicitud de un servicio
                     'plan_activated',       -- el plan quedó funcionando
                     'plan_cancelled'
                 )),

    -- Nombre del grupo en MailerLite. La función lo busca por nombre y
    -- lo crea si no existe: así no hay que copiar identificadores a
    -- mano cada vez que se inventa un plan nuevo.
    group_name   TEXT NOT NULL,

    -- Lo que se manda como campos del contacto (nombre del negocio,
    -- plan, precio). Nunca datos de tarjeta.
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,

    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    attempts     INT NOT NULL DEFAULT 0,
    last_error   TEXT,

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at      TIMESTAMPTZ
);

-- El índice que usa la función para drenar: solo lo pendiente
CREATE INDEX IF NOT EXISTS marketing_events_pending_idx
    ON public.marketing_events (created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS marketing_events_user_idx
    ON public.marketing_events (user_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. Quién puede ver qué
--
-- Nadie escribe estas tablas desde el navegador. El negocio puede ver
-- sus propios eventos (para que el panel pueda decir "te mandamos la
-- guía de arranque"), nada más.
-- ------------------------------------------------------------
ALTER TABLE public.marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_events   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_contacts_self ON public.marketing_contacts;
CREATE POLICY marketing_contacts_self
    ON public.marketing_contacts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS marketing_events_self ON public.marketing_events;
CREATE POLICY marketing_events_self
    ON public.marketing_events FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Sin políticas de INSERT/UPDATE a propósito: solo service_role
-- (la Edge Function) y los triggers SECURITY DEFINER escriben.

GRANT SELECT ON public.marketing_contacts TO authenticated;
GRANT SELECT ON public.marketing_events   TO authenticated;

-- ------------------------------------------------------------
-- 4. Encolar
--
-- Una función sola, para que los triggers no repitan la resolución
-- del correo. Si la persona no tiene correo (entró con celular) el
-- evento se marca 'skipped': no es un error, es que no hay a dónde
-- escribirle.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_marketing_event(
    p_user_id    UUID,
    p_kind       TEXT,
    p_group_name TEXT,
    p_payload    JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
    v_name  TEXT;
    v_phone TEXT;
BEGIN
    SELECT u.email,
           COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
           u.phone
      INTO v_email, v_name, v_phone
      FROM auth.users u
     WHERE u.id = p_user_id;

    -- Sin correo no hay a quién escribirle. Queda anotado igual, para
    -- que se pueda ver en el panel de administración que pasó.
    IF v_email IS NULL OR v_email = '' THEN
        INSERT INTO public.marketing_events (user_id, kind, group_name, payload, status, last_error)
        VALUES (p_user_id, p_kind, p_group_name, p_payload, 'skipped',
                'La cuenta no tiene correo: entró con celular o con un proveedor que no lo comparte.');
        RETURN;
    END IF;

    INSERT INTO public.marketing_contacts (user_id, email, full_name, phone)
    VALUES (p_user_id, v_email, v_name, v_phone)
    ON CONFLICT (user_id) DO UPDATE
        SET email     = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.marketing_contacts.full_name),
            phone     = COALESCE(EXCLUDED.phone, public.marketing_contacts.phone);

    INSERT INTO public.marketing_events (user_id, kind, group_name, payload)
    VALUES (p_user_id, p_kind, p_group_name, p_payload);
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_marketing_event(UUID, TEXT, TEXT, JSONB) FROM PUBLIC;

-- ------------------------------------------------------------
-- 5. Los disparadores
--
-- Nombres de grupo en español y legibles porque el dueño los va a ver
-- en MailerLite al armar las automatizaciones. "TuraFood · Ficha de
-- Google · Activo" se entiende; "svc_gmb_active" no.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_kind_label(p_kind TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE p_kind
        WHEN 'gmb'         THEN 'Ficha de Google'
        WHEN 'google_ads'  THEN 'Campañas en Google'
        WHEN 'voice_agent' THEN 'Agente de voz'
        WHEN 'booking'     THEN 'Reservas'
        WHEN 'website'     THEN 'Sitio web'
        WHEN 'custom_app'  THEN 'App a la medida'
        ELSE 'Otro servicio'
    END;
$$;

CREATE OR REPLACE FUNCTION public.on_service_request_marketing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_label   TEXT := public.service_kind_label(NEW.kind);
    v_plan    TEXT := COALESCE(NEW.payload ->> 'plan', 'sin plan');
    v_payload JSONB;
BEGIN
    -- Solo nos interesan los cambios de estado, no cada tecla que el
    -- negocio escribe mientras llena el asistente.
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    v_payload := jsonb_build_object(
        'servicio', v_label,
        'kind',     NEW.kind,
        'plan',     v_plan,
        'estado',   NEW.status
    );

    IF NEW.status = 'submitted' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_requested',
            'TuraFood · ' || v_label || ' · Solicitado', v_payload);

    ELSIF NEW.status = 'active' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_activated',
            'TuraFood · ' || v_label || ' · Activo', v_payload);

    ELSIF NEW.status = 'cancelled' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.business_id, 'plan_cancelled',
            'TuraFood · ' || v_label || ' · Cancelado', v_payload);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_requests_marketing ON public.service_requests;
CREATE TRIGGER service_requests_marketing
    AFTER INSERT OR UPDATE OF status ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.on_service_request_marketing();

-- Alta y aprobación del negocio: son los dos momentos donde una
-- secuencia de bienvenida rinde más.
CREATE OR REPLACE FUNCTION public.on_business_marketing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.id, 'business_registered', 'TuraFood · Negocios · Nuevos',
            jsonb_build_object('negocio', NEW.name));
        RETURN NEW;
    END IF;

    -- 'active' es el estado que pone el super admin al aprobar. Se
    -- compara contra el anterior para no reenviar la bienvenida cada
    -- vez que se suspende y se reactiva un negocio.
    IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
        PERFORM public.enqueue_marketing_event(
            NEW.id, 'business_approved', 'TuraFood · Negocios · Aprobados',
            jsonb_build_object('negocio', NEW.name));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS business_profiles_marketing ON public.business_profiles;
CREATE TRIGGER business_profiles_marketing
    AFTER INSERT OR UPDATE OF status ON public.business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.on_business_marketing();

-- ------------------------------------------------------------
-- 6. Lo que ve el super admin
--
-- Una vista para no repetir el join en el panel. Solo lectura y solo
-- para quien tenga rol admin: la política vive en la tabla de abajo.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.marketing_queue AS
SELECT e.id,
       e.kind,
       e.group_name,
       e.status,
       e.attempts,
       e.last_error,
       e.created_at,
       e.sent_at,
       c.email,
       c.full_name,
       e.payload
  FROM public.marketing_events e
  LEFT JOIN public.marketing_contacts c ON c.user_id = e.user_id;

COMMENT ON VIEW public.marketing_queue IS
    'Cola de correos con el contacto ya resuelto. Para el panel de administración.';
