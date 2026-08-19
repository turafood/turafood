-- ============================================================================
--  TURAFOOD — LA COMISION DEBE SEGUIR AL NICHO
--
--  Pegá TODO esto en:  Supabase -> SQL Editor -> New query -> Run
--
--  ES PLATA: hoy una licoreria o drogueria que entra por el arranque
--  nuevo queda pagando 10% cuando le corresponde 15%, y nadie se
--  daria cuenta. Comprobado creando una cuenta de prueba.
--
--  Tambien repara a los negocios que ya quedaron mal.
--  Es seguro correrlo dos veces.
-- ============================================================================


-- ============================================================
-- TURAFOOD — Que la comisión siga al nicho de verdad
--
-- Al escribir `guardar_onboarding` puse este comentario: "la comisión
-- sale del vertical, y el vertical del nicho. Nunca de lo que mande
-- el navegador". Era falso, y lo comprobé probándolo: una licorería
-- que contesta el arranque queda con vertical = 'liquor' y comisión
-- del 10%, cuando licores paga 15%.
--
-- POR QUÉ PASABA
--
-- El trigger `set_default_commission` corre BEFORE INSERT y clava
-- `commission_rate` con el valor del vertical de ese momento — que al
-- crear la cuenta siempre es 'restaurant', porque el nicho todavía no
-- se ha preguntado. Después `effective_commission_rate` hace
-- COALESCE(commission_rate, default_commission_rate(vertical)): como
-- `commission_rate` ya tiene un número, el vertical nunca se mira.
--
-- Cambiar el vertical no cambiaba nada. Cada droguería y cada
-- licorería que entrara por el arranque nuevo pagaría 10% en vez de
-- 15%, para siempre y sin que nadie lo notara.
--
-- CÓMO SE ARREGLA
--
-- `guardar_onboarding` mueve la comisión junto con el vertical, pero
-- SOLO si todavía tiene el valor por defecto del vertical anterior.
-- Si un admin le negoció una tarifa especial, esa no se toca — es
-- justo el caso que la columna existe para soportar.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Una puerta para las funciones de la casa
--
-- `guard_business_privileged_fields` revierte `commission_rate` en
-- todo UPDATE que no venga de un admin. `guardar_onboarding` es
-- SECURITY DEFINER, pero `auth.uid()` adentro sigue siendo el
-- negocio, así que `is_admin()` da falso y el guard le revertiría el
-- cambio.
--
-- Misma solución que ya usa `place_order` con los montos: una marca
-- que solo vive dentro de la transacción que la encendió. No la puede
-- prender nadie desde el navegador — `set_config` no se expone por
-- PostgREST.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_business_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF public.is_admin() THEN
        RETURN NEW;
    END IF;

    -- Las funciones de la base que sí tienen derecho a mover esto
    IF COALESCE(current_setting('turafood.sella_negocio', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.status           := OLD.status;
    NEW.commission_rate  := OLD.commission_rate;
    NEW.reviewed_at      := OLD.reviewed_at;
    NEW.reviewed_by      := OLD.reviewed_by;
    NEW.rejection_reason := OLD.rejection_reason;
    NEW.rating           := OLD.rating;
    NEW.reviews_count    := OLD.reviews_count;
    NEW.total_orders     := OLD.total_orders;
    NEW.pro_plan         := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;

    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 2. El arranque mueve la comisión con el vertical
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guardar_onboarding(p_respuestas JSONB)
RETURNS public.business_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz       UUID := auth.uid();
    v_nicho     TEXT := NULLIF(TRIM(p_respuestas->>'nicho'), '');
    v_actual    public.business_profiles%ROWTYPE;
    v_vertical  TEXT;
    v_comision  NUMERIC;
    v_fila      public.business_profiles%ROWTYPE;
BEGIN
    IF v_biz IS NULL THEN
        RAISE EXCEPTION 'Hay que estar dentro de una sesión';
    END IF;

    SELECT * INTO v_actual FROM business_profiles WHERE id = v_biz;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Esta cuenta no tiene un negocio';
    END IF;

    v_vertical := COALESCE(public.vertical_de_nicho(v_nicho), v_actual.vertical);

    -- La comisión se mueve SOLO si todavía es la de por defecto del
    -- vertical viejo. Si un admin le puso una tarifa negociada, esa
    -- manda: es exactamente para eso que existe la columna.
    v_comision := v_actual.commission_rate;

    IF v_vertical IS DISTINCT FROM v_actual.vertical
       AND v_actual.commission_rate IS NOT DISTINCT FROM
           public.default_commission_rate(v_actual.vertical)
    THEN
        v_comision := public.default_commission_rate(v_vertical);
    END IF;

    PERFORM set_config('turafood.sella_negocio', 'on', true);

    UPDATE business_profiles
       SET nicho           = COALESCE(v_nicho, nicho),
           vertical        = v_vertical,
           commission_rate = v_comision,
           onboarding      = p_respuestas,
           onboarding_at   = now()
     WHERE id = v_biz
    RETURNING * INTO v_fila;

    PERFORM set_config('turafood.sella_negocio', 'off', true);

    RETURN v_fila;
END;
$$;

REVOKE ALL ON FUNCTION public.guardar_onboarding(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_onboarding(JSONB) TO authenticated;


-- ------------------------------------------------------------
-- 3. Reparar a los que ya quedaron con la comisión equivocada
--
-- Solo los que tienen exactamente la tarifa por defecto de OTRO
-- vertical. A quien tenga una tarifa negociada no se le toca.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM set_config('turafood.sella_negocio', 'on', true);

    UPDATE public.business_profiles b
       SET commission_rate = public.default_commission_rate(b.vertical)
     WHERE b.commission_rate IS DISTINCT FROM public.default_commission_rate(b.vertical)
       -- Solo si lo que tiene es el default de algún vertical, o sea
       -- que nadie se lo negoció a mano.
       AND b.commission_rate IN (
           SELECT DISTINCT public.default_commission_rate(v)
             FROM unnest(ARRAY['restaurant','market','pharmacy','liquor','store','turbo','boat']) AS v
       );

    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('turafood.sella_negocio', 'off', true);

    RAISE NOTICE 'Negocios con la comisión corregida a la de su vertical: %', v_n;
END;
$$;
