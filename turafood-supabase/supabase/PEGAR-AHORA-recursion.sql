-- ============================================================
-- TURAFOOD — Cortar la recursión entre courier_profiles y orders
--
-- Síntoma: cualquier consulta a `courier_profiles` responde
--     42P17: infinite recursion detected in policy for relation "orders"
--
-- El ciclo:
--
--   courier_select (courier_profiles)
--       └─ EXISTS (SELECT ... FROM orders ...)      ← evalúa políticas de orders
--            └─ orders_select_dispatch (orders)
--                 └─ is_active_courier()
--                      └─ SELECT ... FROM courier_profiles   ← vuelve al inicio
--
-- `is_active_courier()` es SECURITY DEFINER, que en teoría debería
-- saltarse RLS. Pero el planificador expande las políticas antes de
-- resolver la llamada, y el ciclo se detecta igual.
--
-- La salida es no consultar `orders` desde una política de
-- `courier_profiles`. Se mete esa consulta en una función propia:
-- una función es opaca para el planificador de políticas, así que el
-- ciclo no llega a formarse.
--
-- Esto rompía la app del repartidor entera y la pantalla de flota del
-- super admin, sin fallar en el navegador: solo devolvía 500.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ¿Este repartidor lleva algún pedido mío?
--
-- Contesta la pregunta que hacía la política a mano. SECURITY DEFINER
-- y `row_security = off` explícito: no queremos que al mirar `orders`
-- se vuelvan a evaluar sus políticas, que es de donde salía el bucle.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.courier_shares_order(p_courier UUID)
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
         WHERE o.courier_id = p_courier
           AND (o.customer_id = auth.uid() OR o.business_id = auth.uid())
    );
$$;

REVOKE ALL ON FUNCTION public.courier_shares_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_shares_order(UUID) TO authenticated;

COMMENT ON FUNCTION public.courier_shares_order(UUID) IS
    'Si el repartidor lleva un pedido del usuario actual. Existe para que la política de courier_profiles no consulte orders directamente y no se forme una recursión.';

-- ------------------------------------------------------------
-- 2. La misma política, sin el EXISTS que causaba el ciclo
--
-- Quién ve a un repartidor no cambia:
--   · él mismo,
--   · un administrador,
--   · el cliente o el negocio del pedido que lleva.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS courier_select ON public.courier_profiles;
CREATE POLICY courier_select ON public.courier_profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.is_admin()
        OR public.courier_shares_order(courier_profiles.id)
    );

-- ------------------------------------------------------------
-- 3. Lo mismo del otro lado
--
-- `is_active_courier()` ya era SECURITY DEFINER pero sin apagar RLS
-- explícitamente. Se le pone, para que mirar `courier_profiles` desde
-- una política de `orders` no vuelva a evaluar las políticas de
-- `courier_profiles`.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_courier()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.courier_profiles c
         WHERE c.id = auth.uid()
           AND c.approval_status = 'active'
           AND c.status = 'online'
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_courier() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_courier() TO authenticated;

-- ------------------------------------------------------------
-- 4. Comprobación
--
-- Si esto devuelve filas sin error, el ciclo quedó roto.
-- ------------------------------------------------------------
SELECT count(*) AS repartidores_visibles FROM public.courier_profiles;
