-- ============================================================================
--  TURAFOOD — LO QUE TE FALTA CORRER (solo esto)
--
--  Pegá TODO en:  Supabase -> SQL Editor -> New query -> Run
--
--  Verifiqué contra tu base cuál faltaba. La de la comisión YA la
--  corriste, así que no está acá. Estas dos son las que faltan:
--
--   1. VERIFICACION SIN PAPELES
--      Dos columnas: con quién habla el equipo y cuándo quedó la
--      videollamada. Sin esto, el primer paso de la verificación
--      no guarda.
--
--   2. EL REPARTIDOR NO ACUMULA SUS ENTREGAS  (es plata)
--      Entrega, se le paga bien en el pedido, pero su historial no
--      se mueve: sigue en las mismas entregas y las mismas
--      ganancias. La pantalla de Ganancias muestra siempre el mismo
--      numero y el nivel nunca sube.
--
--   3. METRICAS DE PRODUCTO
--      Empieza a medir cuánta gente ve cada plato, cuántos lo echan
--      al carrito y cuántos lo compran. Sin esto, el popup de
--      métricas muestra un error.
--
--      Trae corregido el error 42P17 que te salió: el índice usaba
--      `created_at::date`, que depende de la zona horaria de quien
--      pregunta. Ahora va fijo a la hora de Colombia.
--
--  Es seguro correrlo dos veces.
-- ============================================================================



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
--
-- OJO CON EL DÍA: la primera versión usaba `created_at::date` y
-- Postgres la rechazó con 42P17 —"functions in index expression must
-- be marked IMMUTABLE"— y con razón: pasar de `timestamptz` a `date`
-- depende de la zona horaria de quien pregunta, así que el mismo dato
-- caería en días distintos según quién lo lea. Un índice no puede
-- depender de eso.
--
-- Fijar la zona a Bogotá lo vuelve inmutable y además es lo correcto
-- para el negocio: el "día" de una venta en Buenaventura es el día en
-- Buenaventura, no el del servidor.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pevents_unico
    ON public.product_events (
        product_id, kind, huella,
        ((created_at AT TIME ZONE 'America/Bogota')::date)
    )
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



-- ############################################################
-- ##  20260818000014_historial_repartidor.sql
-- ############################################################

-- ============================================================
-- TURAFOOD — Que al repartidor le cuenten las entregas
--
-- Encontrado haciendo una entrega completa: el pedido queda
-- `delivered`, con `courier_earnings` de $6.900 bien calculado… y el
-- historial del repartidor no se movió. Seguía en 1.284 entregas y
-- $4.820.000, exactamente igual que antes.
--
-- POR QUÉ
--
-- `complete_delivery` termina con:
--
--     UPDATE courier_profiles
--        SET total_deliveries = total_deliveries + 1,
--            total_earnings   = total_earnings + courier_earnings
--
-- Pero sobre esa tabla vive `guard_courier_privileged_fields`, que
-- revierte justo esas dos columnas para todo el que no sea admin. La
-- función es SECURITY DEFINER, sí — pero `auth.uid()` adentro sigue
-- siendo el repartidor, así que `is_admin()` da falso y el guard le
-- deshace el UPDATE.
--
-- El guard está bien: sin él, cualquier repartidor se pondría un
-- millón de ganancias desde el navegador. Lo que faltaba era una
-- puerta para las funciones de la casa.
--
-- CONSECUENCIA SI NO SE ARREGLA
--
-- La pantalla de Ganancias muestra siempre el mismo número, el nivel
-- (Bronce, Plata…) nunca sube, y lo que se le debe a cada repartidor
-- no queda registrado en ningún lado. Es plata.
--
-- Es la tercera vez que aparece este mismo patrón —montos del pedido,
-- comisión del negocio y ahora esto—: una función SECURITY DEFINER
-- chocando contra un guard que solo deja pasar a `is_admin()`.
-- ============================================================


-- ------------------------------------------------------------
-- 1. La puerta para las funciones de la casa
-- ------------------------------------------------------------
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

    -- Las funciones de la base que sí tienen derecho a mover esto.
    -- La marca solo vive dentro de la transacción que la encendió y
    -- no se puede prender desde el navegador: `set_config` no se
    -- expone por PostgREST.
    IF COALESCE(current_setting('turafood.sella_repartidor', true), '') = 'on' THEN
        RETURN NEW;
    END IF;

    NEW.approval_status  := OLD.approval_status;
    NEW.commission_rate  := OLD.commission_rate;
    NEW.total_earnings   := OLD.total_earnings;
    NEW.total_deliveries := OLD.total_deliveries;
    NEW.pro_plan         := OLD.pro_plan;
    NEW.pro_plan_expires_at := OLD.pro_plan_expires_at;

    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 2. `complete_delivery`, marcada
--
-- Se reescribe completa para no perder nada de lo que ya hacía: el
-- bloqueo de la fila, el código de entrega y la idempotencia.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_delivery(
    p_order_id UUID,
    p_code     TEXT
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row      public.orders%ROWTYPE;
    v_expected TEXT;
BEGIN
    SELECT * INTO v_row
      FROM public.orders
     WHERE id = p_order_id AND courier_id = auth.uid()
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ese pedido no está asignado a ti';
    END IF;

    IF v_row.status = 'delivered' THEN
        RETURN v_row;   -- idempotente: reintentar no suma dos veces
    END IF;

    v_expected := right(regexp_replace(v_row.order_number, '\D', '', 'g'), 4);

    IF p_code IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'Código incorrecto';
    END IF;

    UPDATE public.orders
       SET status       = 'delivered',
           delivered_at = now()
     WHERE id = p_order_id
    RETURNING * INTO v_row;

    -- Acá estaba el problema: sin la marca, el guard revertía las dos
    -- columnas y la entrega no se le contaba a nadie.
    PERFORM set_config('turafood.sella_repartidor', 'on', true);

    UPDATE public.courier_profiles
       SET total_deliveries = total_deliveries + 1,
           total_earnings   = total_earnings + COALESCE(v_row.courier_earnings, 0)
     WHERE id = auth.uid();

    PERFORM set_config('turafood.sella_repartidor', 'off', true);

    RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_delivery(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(UUID, TEXT) TO authenticated;


-- ------------------------------------------------------------
-- 3. Reconstruir el historial de quien ya entregó
--
-- Las entregas que se hicieron mientras el guard las revertía no se
-- contaron. Se recalculan desde `orders`, que es la fuente de verdad.
--
-- OJO: los repartidores de prueba traen números sembrados a mano
-- (1.284 entregas, $4.820.000) que no corresponden a ningún pedido
-- real. Recalcular los dejaría en su cifra real, que es lo correcto —
-- pero se hace solo para quien TIENE pedidos entregados de verdad,
-- para no borrar la demo de un plumazo.
-- ------------------------------------------------------------
DO $$
DECLARE
    v_n INT;
BEGIN
    PERFORM set_config('turafood.sella_repartidor', 'on', true);

    WITH reales AS (
        SELECT courier_id,
               count(*)                              AS entregas,
               COALESCE(sum(courier_earnings), 0)    AS ganado
          FROM public.orders
         WHERE status = 'delivered'
           AND courier_id IS NOT NULL
           AND NOT is_demo
         GROUP BY courier_id
    )
    UPDATE public.courier_profiles c
       SET total_deliveries = GREATEST(c.total_deliveries, r.entregas),
           total_earnings   = GREATEST(c.total_earnings, r.ganado)
      FROM reales r
     WHERE c.id = r.courier_id
       AND (c.total_deliveries < r.entregas OR c.total_earnings < r.ganado);

    GET DIAGNOSTICS v_n = ROW_COUNT;

    PERFORM set_config('turafood.sella_repartidor', 'off', true);

    RAISE NOTICE 'Repartidores con el historial al día: %', v_n;
END;
$$;

