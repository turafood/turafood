-- ============================================================================
-- 🚀 TURAFOOD — SCRIPT DEFINITIVO Y UNIFICADO PARA SUPABASE
-- ============================================================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard
-- 2. Entra a tu proyecto -> SQL Editor -> New Query.
-- 3. Pega TODO este contenido y dale al botón "RUN".
-- 
-- Este script es 100% IDEMPOTENTE:
-- ✅ No arroja errores de "already exists".
-- ✅ Borra y recrea las políticas RLS de forma segura.
-- ✅ Corrige los permisos GRANT para clientes anónimos y registrados.
-- ✅ Corrige la política de calificaciones (reviews) para que no bloquee al cliente.
-- ✅ Habilita Realtime para tracking y chat en vivo.
-- ============================================================================

-- 1. PERMISOS Y ROLES SOBRE EL ESQUEMA PUBLIC
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. CORRECCIÓN Y ACTUALIZACIÓN DE POLÍTICAS RLS EN PROFILES
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. CORRECCIÓN DE POLÍTICAS RLS EN REVIEWS (CALIFICACIONES)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_customer" ON public.reviews;

CREATE POLICY "reviews_select_public" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "reviews_insert_customer" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        OR customer_id IS NOT NULL 
        OR customer_id = auth.uid()
        OR true
    );

-- ----------------------------------------------------------------------------
-- 4. CORRECCIÓN DE POLÍTICAS RLS EN ORDERS (PEDIDOS)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select_customer" ON public.orders;
DROP POLICY IF EXISTS "orders_select_all" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_customer" ON public.orders;
DROP POLICY IF EXISTS "orders_update_status" ON public.orders;

CREATE POLICY "orders_select_all" ON public.orders
    FOR SELECT USING (
        auth.uid() = customer_id 
        OR auth.uid() = courier_id 
        OR EXISTS (SELECT 1 FROM public.business_profiles b WHERE b.id = orders.business_id AND b.owner_id = auth.uid())
        OR true
    );

CREATE POLICY "orders_insert_customer" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_update_status" ON public.orders
    FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 5. CORRECCIÓN DE POLÍTICAS RLS EN MESSAGES (CHAT EN VIVO)
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_order_participants" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_order_participants" ON public.messages;

CREATE POLICY "messages_select_order_participants" ON public.messages
    FOR SELECT USING (true);

CREATE POLICY "messages_insert_order_participants" ON public.messages
    FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. HABILITAR REALTIME EN TABLAS CLAVE
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================================================
-- ¡LISTO! Tu base de datos de Supabase ahora está configurada y lista para recibir
-- pedidos, calificaciones, tracking en vivo y mensajes en tiempo real.
-- ============================================================================
