-- ====================================================================
-- TURAFOOD — ¿Este celular ya tiene cuenta verificada?
--
-- Al pedir, quien está como invitado escribe su celular. Si ese número ya
-- pertenece a una cuenta verificada (la creó en otro celular o navegador),
-- el checkout le pide un código antes de pedir en vez de abrirle una
-- cuenta nueva y separada.
--
-- Solo responde sí/no (nunca devuelve datos de la cuenta) y limita las
-- consultas por sesión, para que no sirva de buscador de números.
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.consultas_telefono (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   UUID NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultas_telefono_user ON public.consultas_telefono (user_id, creado_en DESC);
ALTER TABLE public.consultas_telefono ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consultas_telefono FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.telefono_tiene_cuenta(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
SET row_security = off
AS $$
DECLARE
    v_uid    UUID := auth.uid();
    v_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Necesitas una sesión';
    END IF;

    -- Solo celulares colombianos: 57 + 3xx xxx xxxx
    IF v_digits !~ '^573[0-9]{9}$' THEN
        RETURN false;
    END IF;

    IF (SELECT count(*) FROM public.consultas_telefono
         WHERE user_id = v_uid AND creado_en > now() - interval '1 hour') >= 20 THEN
        RAISE EXCEPTION 'Demasiadas consultas. Inténtalo de nuevo en un rato.';
    END IF;
    INSERT INTO public.consultas_telefono (user_id) VALUES (v_uid);

    -- Una cuenta real (no anónima) con ESTE celular ya verificado
    RETURN EXISTS (
        SELECT 1 FROM auth.users u
         WHERE u.phone = v_digits
           AND u.phone_confirmed_at IS NOT NULL
           AND COALESCE(u.is_anonymous, false) = false
           AND u.id <> v_uid
    );
END;
$$;

REVOKE ALL ON FUNCTION public.telefono_tiene_cuenta(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.telefono_tiene_cuenta(TEXT) TO authenticated;
