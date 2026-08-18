-- ============================================================
-- TURAFOOD — El segundo ciclo: orders ↔ order_offers
--
-- Mismo síntoma que el anterior, otra pareja:
--
--   orders_select (orders)
--       └─ EXISTS (SELECT ... FROM order_offers ...)
--            └─ offers_select (order_offers)
--                 └─ EXISTS (SELECT ... FROM orders ...)   ← vuelve
--
-- Con `orders` caído no funciona nada: ni el tablero del negocio, ni
-- la bolsa del repartidor, ni el historial del cliente.
--
-- Barrí el resto de políticas buscando el mismo patrón y esta era la
-- última pareja que se apuntaba mutuamente.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ¿Tengo una oferta viva sobre este pedido?
--
-- Lo que preguntaba la política de `orders` a mano. Dentro de una
-- función con `row_security = off` la consulta a `order_offers` no
-- vuelve a evaluar sus políticas, y el ciclo no se forma.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_live_offer(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.order_offers f
         WHERE f.order_id = p_order_id
           AND f.courier_id = auth.uid()
           AND f.status = 'pending'
           AND f.expires_at > now()
    );
$$;

REVOKE ALL ON FUNCTION public.has_live_offer(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_live_offer(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 2. ¿Este pedido es de mi negocio?
--
-- El otro lado del ciclo, el que usa la política de `order_offers`.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_is_mine_as_business(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
          FROM public.orders o
         WHERE o.id = p_order_id
           AND o.business_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.order_is_mine_as_business(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.order_is_mine_as_business(UUID) TO authenticated;

-- ------------------------------------------------------------
-- 3. Las mismas políticas, sin el EXISTS cruzado
--
-- Quién ve y quién toca un pedido no cambia:
--   · el cliente que lo pidió,
--   · el negocio que lo despacha,
--   · el repartidor que lo lleva,
--   · un repartidor con una oferta viva sobre él,
--   · un administrador.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS orders_select ON public.orders;
CREATE POLICY orders_select ON public.orders
    FOR SELECT USING (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
        OR public.has_live_offer(orders.id)
    );

DROP POLICY IF EXISTS orders_update ON public.orders;
CREATE POLICY orders_update ON public.orders
    FOR UPDATE USING (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
        OR public.has_live_offer(orders.id)
    )
    WITH CHECK (
        customer_id = auth.uid()
        OR business_id = auth.uid()
        OR courier_id = auth.uid()
        OR public.is_admin()
        OR public.has_live_offer(orders.id)
    );

DROP POLICY IF EXISTS offers_select ON public.order_offers;
CREATE POLICY offers_select ON public.order_offers
    FOR SELECT USING (
        courier_id = auth.uid()
        OR public.is_admin()
        OR public.order_is_mine_as_business(order_id)
    );

-- ------------------------------------------------------------
-- 4. Comprobación
--
-- Sin sesión devuelve 0 filas, que es lo correcto. Lo que importa es
-- que devuelva algo en vez de reventar con 42P17.
-- ------------------------------------------------------------
SELECT count(*) AS pedidos_visibles FROM public.orders;
