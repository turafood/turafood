-- Creación de tablas necesarias para la integración de ePayco
-- Ejecuta este script en el SQL Editor de tu proyecto de Supabase

-- 1. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
    payment_method TEXT,
    epayco_ref TEXT UNIQUE, -- Referencia de ePayco (ej. x_ref_payco)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Perfiles de Clientes
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    tura_plus BOOLEAN DEFAULT false,
    tura_plus_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Perfiles de Negocios
CREATE TABLE IF NOT EXISTS public.business_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT,
    pro_plan BOOLEAN DEFAULT false,
    pro_plan_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabla de Perfiles de Repartidores
CREATE TABLE IF NOT EXISTS public.rider_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    pro_plan BOOLEAN DEFAULT false,
    pro_plan_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Configuración de Seguridad RLS (Row Level Security) básica
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas (Policies) - Ajusta según las necesidades exactas de la app
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- NOTA IMPORTANTE PARA EL WEBHOOK:
-- La función Edge Function de Supabase usará el "Service Role Key" para hacer bypass de RLS 
-- y poder actualizar libremente el 'status' y los booleanos de 'pro_plan' / 'tura_plus' 
-- cuando reciba la confirmación de ePayco.
