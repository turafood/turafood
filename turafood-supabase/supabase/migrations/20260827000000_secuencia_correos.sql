-- ====================================================================
-- TURAFOOD — Verificación por correo y secuencia de bienvenida (3 días)
--
-- Cuando alguien confirma su correo (con el código que le llega):
--   1. su correo queda copiado en profiles.email (lo usan el recibo y la secuencia);
--   2. se programan 4 correos: bienvenida AL INSTANTE (día 0) y uno por día (1, 2, 3);
--   3. la función de borde `secuencia-emails` los envía (la bienvenida en el acto,
--      el resto cada 10 minutos por pg_cron).
--
-- Solo para clientes y negocios (no para admin ni repartidores). Quien pida no
-- recibir más los consejos queda en email_bajas y no se le escribe de nuevo;
-- los códigos y los recibos son transaccionales y no se afectan.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.email_secuencia (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    rol           TEXT NOT NULL,
    paso          SMALLINT NOT NULL CHECK (paso BETWEEN 0 AND 3),
    enviar_en     TIMESTAMPTZ NOT NULL,
    enviado_en    TIMESTAMPTZ,
    intentos      SMALLINT NOT NULL DEFAULT 0,
    ultimo_error  TEXT,
    UNIQUE (user_id, paso)
);
CREATE INDEX IF NOT EXISTS idx_email_secuencia_pendientes
    ON public.email_secuencia (enviar_en) WHERE enviado_en IS NULL;

CREATE TABLE IF NOT EXISTS public.email_bajas (
    email      TEXT PRIMARY KEY,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_secuencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_bajas     ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_secuencia FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.email_bajas     FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- Llamada a la función de borde (asíncrona; nunca rompe lo que la dispara)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._llamar_secuencia(p_cuerpo JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM public.internal_config WHERE key = 'push_secret';
    IF v_secret IS NULL THEN RETURN; END IF;

    PERFORM net.http_post(
        url     := 'https://btaddjjzpvyqltkchqki.supabase.co/functions/v1/secuencia-emails',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
        body    := p_cuerpo,
        timeout_milliseconds := 8000
    );
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$$;
REVOKE ALL ON FUNCTION public._llamar_secuencia(JSONB) FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- Al confirmarse un correo: copiarlo al perfil y programar la secuencia
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.al_confirmar_correo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_rol TEXT;
BEGIN
    IF NEW.email IS NULL OR NEW.email_confirmed_at IS NULL THEN
        RETURN NEW;
    END IF;
    -- ya estaba confirmado y no cambió: nada que hacer
    IF TG_OP = 'UPDATE' AND OLD.email_confirmed_at IS NOT NULL AND OLD.email IS NOT DISTINCT FROM NEW.email THEN
        RETURN NEW;
    END IF;

    UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id AND email IS DISTINCT FROM NEW.email;

    SELECT role INTO v_rol FROM public.profiles WHERE id = NEW.id;
    IF v_rol IS NULL OR v_rol NOT IN ('customer', 'business') THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.email_secuencia (user_id, email, rol, paso, enviar_en)
    SELECT NEW.id, NEW.email, v_rol, p, now() + (p || ' days')::interval
      FROM generate_series(0, 3) AS p
    ON CONFLICT (user_id, paso) DO NOTHING;

    -- la bienvenida sale ya, sin esperar al programador
    PERFORM public._llamar_secuencia(jsonb_build_object('modo', 'inmediato', 'user_id', NEW.id));
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;     -- el correo de bienvenida nunca bloquea un registro
END;
$$;
REVOKE ALL ON FUNCTION public.al_confirmar_correo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS secuencia_correo ON auth.users;
CREATE TRIGGER secuencia_correo
    AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.al_confirmar_correo();

-- --------------------------------------------------------------------
-- Programador: cada 10 minutos envía lo que ya toca (días 1 a 3)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.procesar_secuencia_correos()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public._llamar_secuencia('{"modo":"procesar"}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.procesar_secuencia_correos() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    BEGIN PERFORM cron.unschedule('secuencia-correos'); EXCEPTION WHEN OTHERS THEN NULL; END;
    PERFORM cron.schedule('secuencia-correos', '*/10 * * * *', 'SELECT public.procesar_secuencia_correos()');
END $$;
