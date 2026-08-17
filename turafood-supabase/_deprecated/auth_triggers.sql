-- ==========================================
-- TURAFOOD: AUTOMATIC PROFILE TRIGGERS
-- ==========================================
-- Este script crea un trigger que escucha cada vez que un usuario
-- se registra en Supabase Auth y automáticamente crea su perfil
-- en la tabla correspondiente basado en el rol ('CLIENT', 'BUSINESS', 'RIDER').

-- 1. Crear la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Extraer el rol de la metadata inyectada en el frontend al registrarse
  user_role := new.raw_user_meta_data->>'role';

  -- Enrutar la inserción según el rol
  IF user_role = 'CLIENT' THEN
    INSERT INTO public.profiles (id, full_name, phone_number, created_at)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'phone_number', 
      now()
    );
  ELSIF user_role = 'BUSINESS' THEN
    INSERT INTO public.business_profiles (id, business_name, created_at)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'business_name', 
      now()
    );
  ELSIF user_role = 'RIDER' THEN
    INSERT INTO public.rider_profiles (id, full_name, vehicle_type, created_at)
    VALUES (
      new.id, 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'vehicle_type', 
      now()
    );
  ELSE
    -- Comportamiento por defecto: si no hay rol, asume cliente básico
    INSERT INTO public.profiles (id, created_at)
    VALUES (new.id, now());
  END IF;

  RETURN new;
END;
$$;

-- 2. Asegurarse de que no exista un trigger previo para evitar duplicados
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Vincular el trigger a la tabla auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
