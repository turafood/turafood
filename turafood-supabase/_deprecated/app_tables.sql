-- ==========================================
-- TURAFOOD: TABLAS DEL CATÁLOGO Y CARRITO
-- ==========================================
-- Ejecuta este script en el SQL Editor de tu Supabase.

-- 1. Actualizar tabla business_profiles
-- Se añaden columnas clave para que el inicio de la app luzca completo
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS delivery_time TEXT,
ADD COLUMN IF NOT EXISTS fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Crear tabla menu_items (Productos de los restaurantes)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Menu items are viewable by everyone" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Businesses can manage their own menu items" ON public.menu_items FOR ALL USING (auth.uid() = business_id);

-- 3. DATOS DE PRUEBA (SEED DATA)
-- Inserción de usuarios Mock (Restaurantes)
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'dona.jose@turafood.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"role":"BUSINESS"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'mercado@turafood.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"role":"BUSINESS"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'burger.puerto@turafood.com', crypt('123456', gen_salt('bf')), now(), '{"provider": "email", "providers": ["email"]}', '{"role":"BUSINESS"}', now(), now(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Inserción de perfiles de negocio (vinculados a los usuarios Mock creados)
INSERT INTO public.business_profiles (id, business_name, category, rating, delivery_time, fee, image_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Restaurante Doña Jose', 'Comida de mar', 4.9, '35-45 min', 3900, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4859?q=80&w=200&auto=format&fit=crop'),
  ('22222222-2222-2222-2222-222222222222', 'Mercado El Pueblo', 'Víveres y abarrotes', 4.7, '20-30 min', 4900, 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200&auto=format&fit=crop'),
  ('33333333-3333-3333-3333-333333333333', 'Burger Puerto', 'Comida rápida', 4.8, '15-25 min', 2900, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;

-- Inserción de productos para el Restaurante Doña Jose
INSERT INTO public.menu_items (business_id, name, description, price, image_url)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Encocado de Jaiba', 'Plato típico del Pacífico con arroz con coco y patacón.', 35000, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4859?q=80&w=600&auto=format&fit=crop'),
  ('11111111-1111-1111-1111-111111111111', 'Sancocho de Pescado', 'Sopa tradicional de pescado con hierbas de azotea.', 28000, 'https://images.unsplash.com/photo-1626074353765-517a681e40be?q=80&w=600&auto=format&fit=crop')
ON CONFLICT DO NOTHING;

-- Inserción de productos para Burger Puerto
INSERT INTO public.menu_items (business_id, name, description, price, image_url)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'Combo Hamburguesa', 'Hamburguesa doble con papas y gaseosa.', 22000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop')
ON CONFLICT DO NOTHING;
