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
