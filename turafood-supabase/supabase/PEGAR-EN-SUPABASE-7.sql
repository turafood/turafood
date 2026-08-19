-- ============================================================================
--  TURAFOOD — TRES COSAS EN UNA
--
--  Pegá TODO esto en:  Supabase -> SQL Editor -> New query -> Run
--
--   1. LA COMISION SIGUE AL NICHO (es plata)
--      Hoy una licoreria o drogueria que entra por el arranque queda
--      pagando 10% cuando le corresponde 15%. Incluye la reparacion
--      de los que ya quedaron mal.
--
--   2. VERIFICACION SIN PAPELES
--      Se acabaron RUT, camara de comercio y concepto sanitario. Dos
--      columnas nuevas: con quien se habla y cuando quedo la
--      videollamada.
--
--   3. METRICAS DE PRODUCTO
--      Se empieza a medir cuanta gente ve cada plato, cuantos lo
--      echan al carrito y cuantos lo compran. Antes no existia
--      NINGUN registro de eso.
--
--  Es seguro correrlo dos veces.
-- ============================================================================



-- ############################################################
-- ##  20260818000011_comision_sigue_al_nicho.sql
-- ############################################################

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


-- ############################################################
-- ##  20260818000012_verificacion_liviana.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Verificación sin papeles
--
-- Se quitó el requisito de RUT, cámara de comercio y concepto
-- sanitario. Eso dejaba por fuera a la mitad de los negocios del
-- puerto —los que trabajan hace años sin papeles al día— que es justo
-- a quienes queremos adentro.
--
-- Ahora se piden datos livianos y la verificación pasa en una
-- videollamada con el equipo. Un humano decidiendo en 30 minutos es
-- mejor filtro que un PDF que nadie mira.
--
-- Dos columnas nuevas: con quién se habla, y cuándo quedó la llamada.
-- ============================================================

ALTER TABLE public.business_profiles
    ADD COLUMN IF NOT EXISTS owner_name            TEXT,
    ADD COLUMN IF NOT EXISTS verification_call_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.business_profiles.owner_name IS
    'Con quién habla el equipo. No sale en la app de clientes.';
COMMENT ON COLUMN public.business_profiles.verification_call_at IS
    'Cuándo quedó agendada la videollamada de verificación. NULL = todavía no agenda.';

-- Para que el equipo encuentre las llamadas que vienen
CREATE INDEX IF NOT EXISTS idx_business_llamada
    ON public.business_profiles (verification_call_at)
    WHERE verification_call_at IS NOT NULL;

-- Los documentos ya no son obligatorios para operar. La tabla se
-- queda: los negocios que YA subieron sus papeles no tienen por qué
-- perderlos, y el equipo los puede seguir mirando si quiere.
COMMENT ON TABLE public.business_documents IS
    'Documentos del negocio. Desde el 19/08/2026 son OPCIONALES: la verificación se hace por videollamada.';


-- ############################################################
-- ##  20260818000013_metricas_de_producto.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Medir de verdad qué pasa con cada producto
--
-- Se pidió mostrarle al negocio cuánta gente vio un producto y no lo
-- compró, y cuántos llegaron al checkout y se fueron.
--
-- ESO NO SE PODÍA RESPONDER: no existía ningún registro de vistas ni
-- de abandonos. Lo único real era cuántos se vendieron, sacado de
-- `order_items`.
--
-- Se podía inventar los números. No se hizo: un dueño que ve "142
-- personas lo miraron y no compraron" va a bajarle el precio o a
-- cambiarle la foto. Tomar esa decisión con un número inventado es
-- peor que no tener el número.
--
-- Así que se empieza a medir. Los primeros días van a estar en cero y
-- la pantalla lo dice con todas las letras — eso es honesto y además
-- se llena solo en una semana.
--
-- QUÉ SE GUARDA Y QUÉ NO
--
--   · El id del producto, el del negocio y qué pasó.
--   · Una huella de sesión ANÓNIMA para no contar diez veces a la
--     misma persona que hace scroll arriba y abajo.
--   · NADA de quién es. Ni user_id, ni IP, ni nada que apunte a una
--     persona. Al negocio le sirve el número, no el nombre — y
--     guardar de más es asumir un riesgo sin ganar nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_events (
    id          BIGSERIAL PRIMARY KEY,
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

    kind        TEXT NOT NULL CHECK (kind IN (
        'view',       -- abrió la ficha del producto
        'add',        -- lo echó al carrito
        'checkout',   -- llegó al checkout con él adentro
        'purchase'    -- terminó el pedido
    )),

    -- Huella anónima de navegador. Sirve para no contar diez veces a
    -- la misma persona; no identifica a nadie ni se cruza con la
    -- cuenta.
    huella      TEXT,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pevents_producto
    ON public.product_events (product_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pevents_negocio
    ON public.product_events (business_id, created_at DESC);

-- Una persona, un evento de cada tipo por producto y por día. Sin
-- esto, alguien que abre la ficha cinco veces cuenta como cinco
-- personas y el número deja de significar algo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pevents_unico
    ON public.product_events (product_id, kind, huella, (created_at::date))
    WHERE huella IS NOT NULL;

COMMENT ON TABLE public.product_events IS
    'Qué pasa con cada producto: vistas, agregados al carrito, llegadas al checkout y compras. Anónimo — no guarda quién.';


-- ------------------------------------------------------------
-- Quién puede escribir y quién puede leer
--
-- Escribir: cualquiera, incluso sin cuenta — quien mira el catálogo
-- sin registrarse es justo a quien hay que contar. Pero SOLO INSERT:
-- nadie puede leer los eventos de otro ni borrarlos.
--
-- Leer: solo el negocio dueño del producto, y el admin.
-- ------------------------------------------------------------
ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pevents_insert ON public.product_events;
CREATE POLICY pevents_insert ON public.product_events
    FOR INSERT TO anon, authenticated
    WITH CHECK (
        -- Que el producto y el negocio se correspondan de verdad: si
        -- no, cualquiera podría inflarle las métricas a otro.
        EXISTS (
            SELECT 1 FROM public.products p
             WHERE p.id = product_id AND p.business_id = business_id
        )
    );

DROP POLICY IF EXISTS pevents_select_dueno ON public.product_events;
CREATE POLICY pevents_select_dueno ON public.product_events
    FOR SELECT TO authenticated
    USING (business_id = auth.uid() OR public.is_admin());

GRANT INSERT ON public.product_events TO anon, authenticated;
GRANT SELECT ON public.product_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.product_events_id_seq TO anon, authenticated;


-- ------------------------------------------------------------
-- Anotar un evento
--
-- Va por RPC para que el `ON CONFLICT DO NOTHING` viva en el
-- servidor: si el navegador manda el mismo evento dos veces —y lo va
-- a hacer, porque React monta y desmonta— no revienta ni duplica.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anotar_evento_producto(
    p_product_id UUID,
    p_kind       TEXT,
    p_huella     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz UUID;
BEGIN
    SELECT business_id INTO v_biz FROM products WHERE id = p_product_id;
    IF NOT FOUND THEN
        RETURN;   -- producto borrado: no es un error que valga la pena
    END IF;

    INSERT INTO product_events (product_id, business_id, kind, huella)
    VALUES (p_product_id, v_biz, p_kind, NULLIF(TRIM(p_huella), ''))
    ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.anotar_evento_producto(UUID, TEXT, TEXT) TO anon, authenticated;


-- ------------------------------------------------------------
-- Las métricas ya masticadas
--
-- El negocio no quiere filas de eventos: quiere cuatro números y un
-- porcentaje. Se calculan acá y no en el navegador para que la
-- pantalla no tenga que bajarse miles de filas.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.metricas_producto(
    p_product_id UUID,
    p_dias       INT DEFAULT 30
)
RETURNS TABLE (
    vistas            BIGINT,
    agregados         BIGINT,
    en_checkout       BIGINT,
    comprados         BIGINT,
    vendidos          BIGINT,
    ingresos          NUMERIC,
    tasa_conversion   NUMERIC,
    abandono_carrito  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_biz   UUID;
    v_desde TIMESTAMPTZ := now() - (p_dias || ' days')::interval;
BEGIN
    SELECT business_id INTO v_biz FROM products WHERE id = p_product_id;
    IF NOT FOUND THEN RETURN; END IF;

    -- Solo el dueño o el admin. La función es SECURITY DEFINER, así
    -- que sin este control cualquiera leería las métricas de la
    -- competencia con solo tener el id de un producto.
    IF NOT (v_biz = auth.uid() OR public.is_admin()) THEN
        RAISE EXCEPTION 'No puedes ver las métricas de este producto';
    END IF;

    RETURN QUERY
    WITH e AS (
        SELECT kind, count(*) AS n
          FROM product_events
         WHERE product_id = p_product_id AND created_at >= v_desde
         GROUP BY kind
    ),
    v AS (
        SELECT
            COALESCE(sum(oi.quantity), 0)               AS unidades,
            COALESCE(sum(oi.subtotal), 0)               AS plata
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = p_product_id
           AND o.created_at >= v_desde
           AND o.status <> 'cancelled'
           AND NOT o.is_demo
    )
    SELECT
        COALESCE((SELECT n FROM e WHERE kind = 'view'), 0),
        COALESCE((SELECT n FROM e WHERE kind = 'add'), 0),
        COALESCE((SELECT n FROM e WHERE kind = 'checkout'), 0),
        COALESCE((SELECT n FROM e WHERE kind = 'purchase'), 0),
        v.unidades::BIGINT,
        v.plata,
        -- De los que lo vieron, cuántos lo compraron
        CASE WHEN COALESCE((SELECT n FROM e WHERE kind = 'view'), 0) > 0
             THEN round(
                 COALESCE((SELECT n FROM e WHERE kind = 'purchase'), 0)::NUMERIC
                 / (SELECT n FROM e WHERE kind = 'view') * 100, 1)
             ELSE NULL END,
        -- De los que lo echaron al carrito, cuántos NO lo compraron
        CASE WHEN COALESCE((SELECT n FROM e WHERE kind = 'add'), 0) > 0
             THEN round(
                 (1 - COALESCE((SELECT n FROM e WHERE kind = 'purchase'), 0)::NUMERIC
                    / (SELECT n FROM e WHERE kind = 'add')) * 100, 1)
             ELSE NULL END
      FROM v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.metricas_producto(UUID, INT) TO authenticated;

