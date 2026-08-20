-- ====================================================================
-- ACTUALIZACIÓN SUPABASE: TURAFOOD PREMIUM OVERHAUL
-- ====================================================================

-- 1. AUTH PASSWORDLESS Y GUEST MODE
-- Nota: La desactivación de email/password se hace desde el Panel de Supabase.
-- Ve a: Authentication -> Providers -> Email
-- Desactiva la opción: "Enable Email provider" si solo quieres usar Magic Links, 
-- o si usas OTP de celular, deja activo solo "Phone" y los proveedores de OAuth (Google, Facebook).
-- En nuestro código (auth/page.js) ya removimos el login con contraseña.

-- 2. TABLAS PARA EL MÓDULO DE CONOCIMIENTO (BLOG/GUÍAS)
-- Para reemplazar el Dummy Data en `conocimiento/page.js` cuando estés listo:

CREATE TABLE IF NOT EXISTS public.conocimiento_docs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    read_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas RLS para conocimiento_docs (Lectura pública para dueños de negocio)
ALTER TABLE public.conocimiento_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los artículos de conocimiento son públicos"
ON public.conocimiento_docs FOR SELECT
USING (true);

-- 3. TABLAS PARA PERFORMANCE (RENDIMIENTO ORGÁNICO)
-- Para reemplazar el Dummy Data en `PerformanceOverlay.js` cuando estés listo:

CREATE TABLE IF NOT EXISTS public.product_performance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    views INT DEFAULT 0,
    add_to_cart INT DEFAULT 0,
    checkouts INT DEFAULT 0,
    purchases INT DEFAULT 0,
    revenue NUMERIC(10, 2) DEFAULT 0,
    recorded_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(product_id, recorded_date)
);

-- Políticas RLS para product_performance
ALTER TABLE public.product_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los dueños ven el rendimiento de sus productos"
ON public.product_performance FOR SELECT
USING (auth.uid() = product_performance.business_id);

-- ====================================================================
-- Fin de la migración. Ejecuta este script en el SQL Editor de Supabase.
-- ====================================================================
