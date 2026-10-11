-- ====================================================================
-- TURAFOOD — FLOTA PROPIA DEL NEGOCIO
--
-- Cada negocio pone sus propios repartidores. Hasta hoy los repartidores
-- eran un grupo común: cualquiera, aprobado y en línea, veía los pedidos
-- sin asignar de TODOS los negocios (con la dirección y el celular del
-- cliente).
--
-- Cómo queda:
--   · El negocio tiene un código de 6 caracteres (flota_codigos), que
--     comparte por WhatsApp. Solo él lo puede ver y cambiar.
--   · El repartidor se registra y escribe ese código (unirse_a_flota).
--     El negocio lo avala: queda activo y ligado a ese negocio.
--   · Un repartidor de un negocio SOLO ve y toma pedidos de ese negocio.
--   · Los repartidores sin negocio (el grupo común) siguen igual, salvo en
--     negocios que activan `solo_flota_propia`.
--   · El negocio puede quitar a un repartidor de su flota.
--
-- Además se cierra un hueco: un repartidor podía crear su propio perfil
-- directamente con approval_status = 'active' (la guarda solo cubría
-- UPDATE) y así ver los pedidos de todos.
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. COLUMNAS
-- --------------------------------------------------------------------
ALTER TABLE public.courier_profiles
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS flota_desde TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_courier_business
    ON public.courier_profiles (business_id) WHERE business_id IS NOT NULL;

ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS solo_flota_propia BOOLEAN NOT NULL DEFAULT false;

-- Si la tabla da permisos por columna, las nuevas también se pueden leer
GRANT SELECT (business_id, flota_desde) ON public.courier_profiles TO authenticated;
GRANT SELECT (solo_flota_propia) ON public.business_profiles TO anon, authenticated;

-- --------------------------------------------------------------------
-- 2. GUARDAS DE courier_profiles
--
-- UPDATE: además de lo que ya protegía, nadie se cambia de negocio a mano.
-- INSERT: un perfil nuevo siempre nace pendiente y sin historial.
-- Quien administra la base (auth.uid() nulo) y las funciones que prenden
-- la marca `turafood.sella_repartidor` quedan fuera de la guarda.
-- --------------------------------------------------------------------
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

    IF COALESCE(current_setting('turafood.sella_repartidor', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.approval_status  := OLD.approval_status;
    NEW.commission_rate  := OLD.commission_rate;
    NEW.total_earnings   := OLD.total_earnings;
    NEW.total_deliveries := OLD.total_deliveries;
    NEW.pro_plan         := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;
    NEW.business_id      := OLD.business_id;
    NEW.flota_desde      := OLD.flota_desde;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_courier_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR public.is_admin() THEN
        RETURN NEW;
    END IF;

    IF COALESCE(current_setting('turafood.sella_repartidor', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.approval_status     := 'pending_review';
    NEW.rejection_reason    := NULL;
    NEW.reviewed_at         := NULL;
    NEW.reviewed_by         := NULL;
    NEW.acceptance_rate     := 100.00;
    NEW.total_deliveries    := 0;
    NEW.total_earnings      := 0;
    NEW.commission_rate     := 0.10;
    NEW.pro_plan            := false;
    NEW.pro_plan_expires_at := NULL;
    NEW.business_id         := NULL;
    NEW.flota_desde         := NULL;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courier_guard_insert ON public.courier_profiles;
CREATE TRIGGER courier_guard_insert
    BEFORE INSERT ON public.courier_profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_courier_insert();

-- --------------------------------------------------------------------
-- 3. CÓDIGOS DE FLOTA E INTENTOS
--
-- Nadie lee estas tablas desde el navegador: todo pasa por las funciones
-- de abajo. RLS activo y sin políticas = cerradas.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.flota_codigos (
    business_id UUID PRIMARY KEY REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    codigo      TEXT NOT NULL UNIQUE,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flota_intentos (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id   UUID NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flota_intentos_user ON public.flota_intentos (user_id, creado_en DESC);

ALTER TABLE public.flota_codigos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flota_intentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.flota_codigos  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.flota_intentos FROM PUBLIC, anon, authenticated;

-- Código de 6 caracteres sin letras que se confunden (sin 0/O, 1/I/L)
CREATE OR REPLACE FUNCTION public._flota_generar_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    alfabeto CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    bytes    BYTEA;
    c        TEXT;
    i        INT;
BEGIN
    LOOP
        bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
        c := '';
        FOR i IN 0..5 LOOP
            c := c || substr(alfabeto, 1 + (get_byte(bytes, i) % length(alfabeto)), 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.flota_codigos WHERE codigo = c);
    END LOOP;
    RETURN c;
END;
$$;
REVOKE ALL ON FUNCTION public._flota_generar_codigo() FROM PUBLIC, anon, authenticated;

-- --------------------------------------------------------------------
-- 4. FUNCIONES DEL NEGOCIO
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flota_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_codigo TEXT;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede ver el código de su flota';
    END IF;

    SELECT codigo INTO v_codigo FROM public.flota_codigos WHERE business_id = auth.uid();
    IF v_codigo IS NULL THEN
        INSERT INTO public.flota_codigos (business_id, codigo)
        VALUES (auth.uid(), public._flota_generar_codigo())
        ON CONFLICT (business_id) DO UPDATE SET codigo = public.flota_codigos.codigo
        RETURNING codigo INTO v_codigo;
    END IF;
    RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.flota_nuevo_codigo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_codigo TEXT;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede cambiar el código de su flota';
    END IF;

    v_codigo := public._flota_generar_codigo();
    INSERT INTO public.flota_codigos (business_id, codigo)
    VALUES (auth.uid(), v_codigo)
    ON CONFLICT (business_id) DO UPDATE SET codigo = EXCLUDED.codigo, creado_en = now();
    RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.flota_mis_repartidores()
RETURNS TABLE (
    id          UUID,
    nombre      TEXT,
    telefono    TEXT,
    vehiculo    TEXT,
    placa       TEXT,
    estado      TEXT,
    entregas    INTEGER,
    desde       TIMESTAMPTZ,
    en_curso    BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede ver su flota';
    END IF;

    RETURN QUERY
    SELECT c.id,
           p.full_name,
           p.phone,
           c.vehicle_type,
           c.plate,
           c.status,
           COALESCE(c.total_deliveries, 0),
           c.flota_desde,
           EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.courier_id = c.id
                      AND o.status IN ('courier_assigned', 'picked_up', 'delivering'))
      FROM public.courier_profiles c
      LEFT JOIN public.profiles p ON p.id = c.id
     WHERE c.business_id = auth.uid()
     ORDER BY c.flota_desde DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.flota_quitar(p_courier UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede quitar repartidores de su flota';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.courier_profiles WHERE id = p_courier AND business_id = auth.uid()) THEN
        RAISE EXCEPTION 'Ese repartidor no es de tu flota';
    END IF;

    IF EXISTS (SELECT 1 FROM public.orders
                WHERE courier_id = p_courier
                  AND status IN ('courier_assigned', 'picked_up', 'delivering')) THEN
        RAISE EXCEPTION 'Tiene una entrega en curso: quítalo cuando la termine';
    END IF;

    PERFORM set_config('turafood.sella_repartidor', 'on', true);
    UPDATE public.courier_profiles
       SET business_id     = NULL,
           flota_desde     = NULL,
           approval_status = 'pending_review',
           status          = 'offline'
     WHERE id = p_courier;
    PERFORM set_config('turafood.sella_repartidor', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.flota_configurar(p_solo_propia BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.business_profiles WHERE id = auth.uid()) THEN
        RAISE EXCEPTION 'Solo un negocio puede configurar su flota';
    END IF;

    UPDATE public.business_profiles
       SET solo_flota_propia = COALESCE(p_solo_propia, false)
     WHERE id = auth.uid();
END;
$$;

-- --------------------------------------------------------------------
-- 5. FUNCIÓN DEL REPARTIDOR: unirse con el código
--
-- Los errores "de negocio" (código malo, ya está en otra flota…) se
-- devuelven en el resultado, no como excepción: una excepción desharía
-- el registro del intento y el límite no contaría.
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unirse_a_flota(p_codigo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_uid     UUID := auth.uid();
    v_codigo  TEXT;
    v_biz     UUID;
    v_nombre  TEXT;
    v_c       public.courier_profiles%ROWTYPE;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Inicia sesión para unirte a una flota';
    END IF;

    SELECT * INTO v_c FROM public.courier_profiles WHERE id = v_uid;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'sin_perfil',
            'mensaje', 'Primero crea tu cuenta de repartidor.');
    END IF;

    IF (SELECT count(*) FROM public.flota_intentos
         WHERE user_id = v_uid AND creado_en > now() - interval '1 hour') >= 8 THEN
        RETURN jsonb_build_object('ok', false, 'error', 'demasiados_intentos',
            'mensaje', 'Demasiados intentos. Prueba de nuevo en una hora.');
    END IF;

    v_codigo := upper(regexp_replace(COALESCE(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
    SELECT f.business_id, b.name INTO v_biz, v_nombre
      FROM public.flota_codigos f
      JOIN public.business_profiles b ON b.id = f.business_id
     WHERE f.codigo = v_codigo;

    IF v_biz IS NULL THEN
        INSERT INTO public.flota_intentos (user_id) VALUES (v_uid);
        RETURN jsonb_build_object('ok', false, 'error', 'codigo_invalido',
            'mensaje', 'Ese código no existe. Revísalo con tu negocio.');
    END IF;

    IF v_c.business_id = v_biz THEN
        RETURN jsonb_build_object('ok', true, 'negocio_id', v_biz, 'negocio', v_nombre);
    END IF;

    IF v_c.business_id IS NOT NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'ya_en_flota',
            'mensaje', 'Ya trabajas con otro negocio. Pídele que te quite de su flota.');
    END IF;

    IF v_c.approval_status IN ('suspended', 'rejected') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'cuenta_suspendida',
            'mensaje', 'Tu cuenta está suspendida. Escribe a soporte de TuraFood.');
    END IF;

    PERFORM set_config('turafood.sella_repartidor', 'on', true);
    UPDATE public.courier_profiles
       SET business_id      = v_biz,
           flota_desde      = now(),
           approval_status  = 'active',
           reviewed_at      = now(),
           rejection_reason = NULL
     WHERE id = v_uid;
    PERFORM set_config('turafood.sella_repartidor', 'off', true);

    RETURN jsonb_build_object('ok', true, 'negocio_id', v_biz, 'negocio', v_nombre);
END;
$$;

-- --------------------------------------------------------------------
-- 6. QUIÉN VE Y TOMA QUÉ PEDIDO
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.courier_puede_atender(p_business UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.courier_profiles c
         WHERE c.id = auth.uid()
           AND (
                c.business_id = p_business
                OR (c.business_id IS NULL
                    AND NOT COALESCE((SELECT b.solo_flota_propia
                                        FROM public.business_profiles b
                                       WHERE b.id = p_business), false))
           )
    );
$$;

DROP POLICY IF EXISTS orders_select_dispatch ON public.orders;
CREATE POLICY orders_select_dispatch ON public.orders
    FOR SELECT
    USING (
        courier_id IS NULL
        AND mode = 'delivery'
        AND status = ANY (ARRAY['accepted', 'preparing', 'ready'])
        AND public.is_active_courier()
        AND public.courier_puede_atender(business_id)
    );

CREATE OR REPLACE FUNCTION public.accept_order(p_order_id UUID)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.orders%ROWTYPE;
    v_biz UUID;
BEGIN
    IF NOT public.is_active_courier() THEN
        RAISE EXCEPTION 'Debes estar en línea y con la cuenta aprobada para tomar pedidos';
    END IF;

    SELECT business_id INTO v_biz FROM public.orders WHERE id = p_order_id;
    IF v_biz IS NOT NULL AND NOT public.courier_puede_atender(v_biz) THEN
        RAISE EXCEPTION 'Este pedido es de la flota de otro negocio';
    END IF;

    UPDATE public.orders
       SET courier_id = auth.uid(),
           status     = 'courier_assigned'
     WHERE id = p_order_id
       AND courier_id IS NULL
       AND mode = 'delivery'
       AND status IN ('accepted', 'preparing', 'ready')
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido ya lo tomó otro repartidor';
    END IF;

    -- Si existía una oferta para este repartidor, queda aceptada
    UPDATE public.order_offers
       SET status = 'accepted'
     WHERE order_id = p_order_id AND courier_id = auth.uid();

    -- Y las demás ofertas del mismo pedido se caen
    UPDATE public.order_offers
       SET status = 'expired'
     WHERE order_id = p_order_id AND courier_id <> auth.uid() AND status = 'pending';

    RETURN v_row;
END;
$$;

-- --------------------------------------------------------------------
-- 7. PERMISOS: solo usuarios con sesión (anon no)
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.flota_codigo()                  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.flota_nuevo_codigo()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.flota_mis_repartidores()        FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.flota_quitar(UUID)              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.flota_configurar(BOOLEAN)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unirse_a_flota(TEXT)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.courier_puede_atender(UUID)     FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.flota_codigo()               TO authenticated;
GRANT EXECUTE ON FUNCTION public.flota_nuevo_codigo()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.flota_mis_repartidores()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.flota_quitar(UUID)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.flota_configurar(BOOLEAN)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.unirse_a_flota(TEXT)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.courier_puede_atender(UUID)  TO authenticated;
