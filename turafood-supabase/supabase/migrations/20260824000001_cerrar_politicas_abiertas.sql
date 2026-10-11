-- ============================================================
-- TURAFOOD — Cerrar políticas RLS abiertas (USING true)
--
-- Auditoría con la clave anónima. Habían quedado políticas de prueba
-- "permisivas" (probablemente de los scripts PEGAR-EN-SUPABASE) que
-- anulaban a las buenas, porque en RLS las políticas permisivas se
-- suman con OR:
--
--   profiles   · profiles_update_own  USING ((auth.uid() = id) OR true)
--                + `role` sin guardia y con UPDATE concedido a anon y
--                authenticated  =>  CUALQUIERA, con una sesión anónima
--                gratis, podía ponerse role='admin' y tomar la consola
--                (aprobar negocios, liquidar pagos, leer todo).
--                · profiles_select_public: todos los correos y teléfonos.
--                · profiles_insert_own CHECK true.
--   orders     · orders_select_all: todos los pedidos (direcciones) legibles.
--                · orders_update_status: cualquiera cambiaba el estado de
--                  cualquier pedido.
--                · orders_insert_customer CHECK true.
--   messages   · select/insert abiertos: todos los chats.
--   reviews    · insert abierto: reseñas falsas a nombre de cualquiera.
--
-- Las políticas correctas ya existían (orders_select, orders_update,
-- messages_select...). Aquí se quitan las abiertas y se aprieta lo demás.
-- ============================================================

-- ------------------------------------------------------------
-- 0. is_admin() lee `profiles`, que ahora tiene políticas que la llaman:
--    row_security = off corta cualquier ciclo (ver TRASPASO 3.4).
-- ------------------------------------------------------------
ALTER FUNCTION public.is_admin() SET row_security = off;

-- ------------------------------------------------------------
-- 1. profiles
-- ------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_public ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own    ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own    ON public.profiles;

-- Quién puede ver el perfil de OTRA persona: quien comparte un pedido
-- con ella (cliente / negocio / repartidor), quien está en una relación
-- de referidos, y un negocio respecto de los repartidores activos (así
-- gestiona su equipo de reparto).
CREATE OR REPLACE FUNCTION public.profile_visible_to_me(p_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT auth.uid() IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.orders o
             WHERE (o.customer_id = auth.uid() AND (o.courier_id = p_id OR o.business_id = p_id))
                OR (o.courier_id  = auth.uid() AND (o.customer_id = p_id OR o.business_id = p_id))
                OR (o.business_id = auth.uid() AND (o.customer_id = p_id OR o.courier_id  = p_id))
        )
        OR EXISTS (
            SELECT 1 FROM public.referrals r
             WHERE (r.referrer_id = auth.uid() AND r.referred_id = p_id)
                OR (r.referred_id = auth.uid() AND r.referrer_id = p_id)
        )
        OR (
            EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = auth.uid())
            AND EXISTS (SELECT 1 FROM public.courier_profiles c
                         WHERE c.id = p_id AND c.approval_status = 'active')
        )
    );
$$;
REVOKE ALL ON FUNCTION public.profile_visible_to_me(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.profile_visible_to_me(UUID) TO authenticated;

CREATE POLICY profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin() OR public.profile_visible_to_me(id));

CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Sin sesión no se toca nada de profiles
REVOKE ALL ON public.profiles FROM anon;

-- Lo que una persona puede cambiar de SU perfil: nombre, teléfono, foto.
-- role, rating, tura_plus*, referral_code, referred_by y email quedan
-- fuera: solo cambian por funciones del servidor o por un admin. (Se hace
-- con permisos de COLUMNA y no con un trigger a propósito: un trigger
-- también revertiría los cambios de las funciones SECURITY DEFINER del
-- sistema, la trampa de los tres guards que ya nos mordió.)
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, avatar_url) ON public.profiles TO authenticated;

-- ------------------------------------------------------------
-- 2. orders
-- ------------------------------------------------------------
DROP POLICY IF EXISTS orders_select_all     ON public.orders;
DROP POLICY IF EXISTS orders_update_status  ON public.orders;
DROP POLICY IF EXISTS orders_insert_customer ON public.orders;

-- Las que quedan usan funciones sin EXECUTE para anon: se limitan a
-- quien tiene sesión (así un visitante recibe vacío, no un error).
ALTER POLICY orders_select          ON public.orders TO authenticated;
ALTER POLICY orders_select_dispatch ON public.orders TO authenticated;
ALTER POLICY orders_update          ON public.orders TO authenticated;

-- Los pedidos solo se crean por place_order() (SECURITY DEFINER): ahí
-- el servidor relee los precios. Sin política de INSERT no hay otra puerta.

-- ------------------------------------------------------------
-- 3. messages
-- ------------------------------------------------------------
DROP POLICY IF EXISTS messages_select_order_participants ON public.messages;
DROP POLICY IF EXISTS messages_insert_order_participants ON public.messages;
ALTER POLICY messages_select      ON public.messages TO authenticated;
ALTER POLICY messages_insert      ON public.messages TO authenticated;
ALTER POLICY messages_update_read ON public.messages TO authenticated;

-- ------------------------------------------------------------
-- 4. reviews: solo una reseña propia, de un pedido propio de ese negocio
-- ------------------------------------------------------------
DROP POLICY IF EXISTS reviews_insert_customer ON public.reviews;
CREATE POLICY reviews_insert_customer ON public.reviews
    FOR INSERT TO authenticated
    WITH CHECK (
        customer_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.orders o
             WHERE o.id = reviews.order_id
               AND o.customer_id = auth.uid()
               AND o.business_id = reviews.business_id
        )
    );

-- ------------------------------------------------------------
-- 5. Un visitante sin sesión (rol anon) no escribe en ninguna tabla.
--    Quien compra sin cuenta tiene sesión anónima de GoTrue, que es el
--    rol `authenticated`. Lo nuevo también nace sin esos permisos.
-- ------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon;
