-- ============================================================
-- TURAFOOD — Cuenta de prueba con celular
--
-- Crea la cuenta +57 302 688 6449 con el número ya confirmado, su
-- perfil y su rol. Con esto la cuenta EXISTE; para poder entrar falta
-- un paso en el panel de Supabase que no se puede hacer por SQL (ver
-- abajo).
--
-- El rol decide a qué app entra:
--     customer  -> turafood.com        (app del cliente)
--     business  -> app.turafood.com    (panel del negocio)
--     courier   -> app.turafood.com    (app del repartidor)
--     admin     -> dash.turafood.com   (consola)
--
-- Cambia v_rol abajo y vuelve a correrlo para moverla de app.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
    v_phone TEXT := '+573026886449';
    v_nombre TEXT := 'Sophie';

    -- ⬇⬇ CAMBIA EL ROL AQUÍ ⬇⬇
    v_rol   TEXT := 'customer';

    -- Contraseña de respaldo. El acceso por celular no la usa, pero
    -- auth.users la exige y sirve si algún día quieres entrar por
    -- correo con esta misma cuenta.
    v_pass  TEXT := 'TuraFood2026!';

    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM auth.users WHERE phone = v_phone;

    IF v_id IS NULL THEN
        v_id := gen_random_uuid();

        INSERT INTO auth.users (
            instance_id, id, aud, role,
            phone, phone_confirmed_at,
            encrypted_password,
            raw_app_meta_data, raw_user_meta_data,
            created_at, updated_at,
            -- Ver seed-usuarios-prueba.sql: en NULL rompen el login
            confirmation_token, email_change,
            email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', v_id,
            'authenticated', 'authenticated',
            v_phone, now(),
            extensions.crypt(v_pass, extensions.gen_salt('bf')),
            '{"provider":"phone","providers":["phone"]}'::jsonb,
            jsonb_build_object('full_name', v_nombre, 'role', v_rol),
            now(), now(),
            '', '', '', ''
        );
    ELSE
        UPDATE auth.users
           SET phone_confirmed_at = COALESCE(phone_confirmed_at, now()),
               raw_user_meta_data = jsonb_build_object('full_name', v_nombre, 'role', v_rol),
               updated_at = now()
         WHERE id = v_id;
    END IF;

    -- Identidad de teléfono: sin esto Supabase no reconoce la cuenta
    -- como propia del proveedor 'phone' al verificar el código.
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
    )
    SELECT gen_random_uuid(), v_id, v_phone,
           jsonb_build_object('sub', v_id::text, 'phone', v_phone, 'phone_verified', true),
           'phone', now(), now(), now()
     WHERE NOT EXISTS (
         SELECT 1 FROM auth.identities i
          WHERE i.user_id = v_id AND i.provider = 'phone');

    -- El perfil con el rol: es lo que lee el proxy de cada dominio
    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (v_id, v_rol, v_nombre, v_phone)
    ON CONFLICT (id) DO UPDATE
        SET role = EXCLUDED.role,
            phone = EXCLUDED.phone;

    -- Si el rol es de negocio o repartidor, la ficha correspondiente
    IF v_rol = 'business' THEN
        INSERT INTO public.business_profiles (
            id, name, slug, category, vertical, address,
            status, is_open, prep_time_min, delivery_fee
        ) VALUES (
            v_id, 'Negocio de Sophie', 'negocio-sophie',
            'Restaurante', 'restaurant', 'Buenaventura',
            'active', TRUE, 25, 3900
        )
        ON CONFLICT (id) DO UPDATE SET status = 'active';
    END IF;

    IF v_rol = 'courier' THEN
        INSERT INTO public.courier_profiles (
            id, status, approval_status, vehicle_type, commission_rate
        ) VALUES (
            v_id, 'online', 'active', 'motorcycle', 0.15
        )
        ON CONFLICT (id) DO UPDATE
            SET approval_status = 'active', status = 'online';
    END IF;

    RAISE NOTICE 'Cuenta % lista con rol %', v_phone, v_rol;
END $$;

SELECT p.phone, p.role, p.full_name,
       (u.phone_confirmed_at IS NOT NULL) AS numero_confirmado
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE p.phone = '+573026886449';

-- ============================================================
-- FALTA UN PASO, Y NO ES SQL
--
-- Supabase manda el código por SMS a través de Twilio. Sin Twilio
-- configurado no llega ningún mensaje, pero hay una salida pensada
-- justo para esto:
--
--   Panel de Supabase
--     -> Authentication
--     -> Sign In / Providers
--     -> Phone
--        · activar el proveedor
--        · abajo, en "Test OTP", agregar:
--
--              +573026886449 = 123456
--
-- Con eso el código 123456 funciona siempre para ese número, sin
-- mandar ni pagar un solo SMS. Es exactamente para probar.
--
-- Para números reales sí hay que poner las credenciales de Twilio.
-- ============================================================
