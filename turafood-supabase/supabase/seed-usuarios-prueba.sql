-- ============================================================
-- TURAFOOD — Cuentas de prueba
--
-- Crea una cuenta por cada lado de la plataforma para poder probar
-- las tres apps por separado. NO es parte de las migraciones a
-- propósito: esto se corre a mano, cuando se quiere, y no se ejecuta
-- solo al desplegar.
--
-- Cómo correrlo:
--   Panel de Supabase → SQL Editor → pegar y ejecutar.
--   O:  cd turafood-supabase && supabase db execute --file supabase/seed-usuarios-prueba.sql
--
-- IMPORTANTE: la contraseña es la misma para todas y está escrita aquí
-- en claro. Eso está bien para probar y está MAL para producción.
-- Cámbialas desde el panel de Supabase antes de abrirle esto a nadie,
-- o borra estas cuentas cuando termines (hay un bloque al final).
--
-- Volver a correrlo no duplica nada: si el correo ya existe, se
-- actualiza la contraseña y se deja el resto como estaba.
-- ============================================================

-- pgcrypto para poder cifrar la contraseña como lo hace Supabase Auth
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
    -- ⬇⬇ CAMBIA ESTO SI QUIERES OTRA CONTRASEÑA ⬇⬇
    v_password  TEXT := 'TuraFood2026!';

    v_admin     UUID;
    v_negocio   UUID;
    v_repartidor UUID;
    v_cliente   UUID;

    r RECORD;
BEGIN
    -- --------------------------------------------------------
    -- 1. Las cuatro cuentas en auth.users
    --
    -- `email_confirmed_at` se pone de una: sin eso Supabase pide
    -- confirmar por correo y la cuenta de prueba nace inservible.
    -- --------------------------------------------------------
    FOR r IN
        SELECT * FROM (VALUES
            ('admin@turafood.com',      'Sharick Grajales',  'admin'),
            ('negocio@turafood.com',    'Asadero El Puerto', 'business'),
            ('repartidor@turafood.com', 'Yeison Mosquera',   'courier'),
            ('cliente@turafood.com',    'Andres Riascos',    'customer')
        ) AS t(email, full_name, role)
    LOOP
        -- Nada de ON CONFLICT (email): el indice unico de correo en
        -- auth.users es PARCIAL (solo aplica a cuentas que no son SSO),
        -- y Postgres no acepta una clausula ON CONFLICT contra un
        -- indice parcial. Se mira primero y se decide.
        IF EXISTS (SELECT 1 FROM auth.users WHERE email = r.email) THEN
            UPDATE auth.users
               SET encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
                   email_confirmed_at = COALESCE(email_confirmed_at, now()),
                   raw_user_meta_data = jsonb_build_object('full_name', r.full_name, 'role', r.role),
                   updated_at         = now()
             WHERE email = r.email;
        ELSE
            INSERT INTO auth.users (
                instance_id, id, aud, role, email,
                encrypted_password, email_confirmed_at,
                raw_app_meta_data, raw_user_meta_data,
                created_at, updated_at
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated', 'authenticated', r.email,
                extensions.crypt(v_password, extensions.gen_salt('bf')),
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                jsonb_build_object('full_name', r.full_name, 'role', r.role),
                now(), now()
            );
        END IF;
    END LOOP;

    SELECT id INTO v_admin      FROM auth.users WHERE email = 'admin@turafood.com';
    SELECT id INTO v_negocio    FROM auth.users WHERE email = 'negocio@turafood.com';
    SELECT id INTO v_repartidor FROM auth.users WHERE email = 'repartidor@turafood.com';
    SELECT id INTO v_cliente    FROM auth.users WHERE email = 'cliente@turafood.com';

    -- Identidad de correo: sin esto algunos flujos de Supabase Auth
    -- no reconocen la cuenta como propia del proveedor 'email'.
    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    SELECT gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', now(), now(), now()
      FROM auth.users u
     WHERE u.email IN ('admin@turafood.com','negocio@turafood.com','repartidor@turafood.com','cliente@turafood.com')
       AND NOT EXISTS (
           SELECT 1 FROM auth.identities i
            WHERE i.user_id = u.id AND i.provider = 'email');

    -- --------------------------------------------------------
    -- 2. El perfil y el rol
    --
    -- El rol es lo que decide a qué app entra cada quien: lo lee el
    -- proxy de cada dominio contra esta tabla.
    -- --------------------------------------------------------
    INSERT INTO public.profiles (id, role, full_name, email, phone)
    VALUES
        (v_admin,      'admin',    'Sharick Grajales',  'admin@turafood.com',      '+573137594713'),
        (v_negocio,    'business', 'Jhon Castillo',     'negocio@turafood.com',    '+573204451189'),
        (v_repartidor, 'courier',  'Yeison Mosquera',   'repartidor@turafood.com', '+573112345567'),
        (v_cliente,    'customer', 'Andrés Riascos',    'cliente@turafood.com',    '+573160000002')
    ON CONFLICT (id) DO UPDATE
        SET role      = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            email     = EXCLUDED.email;

    -- --------------------------------------------------------
    -- 3. La ficha del negocio, ya aprobada
    --
    -- Aprobada para poder probar el panel completo sin tener que
    -- pasar primero por la consola de administración. Si quieres
    -- probar el flujo de aprobación, pon status = 'pending_review'.
    -- --------------------------------------------------------
    INSERT INTO public.business_profiles (
        id, name, slug, description, category, vertical,
        address, phone, status, is_open, rating, reviews_count,
        total_orders, prep_time_min, delivery_fee, min_order, commission_rate,
        accepts_pickup, reviewed_at
    )
    VALUES (
        v_negocio, 'Asadero El Puerto', 'asadero-el-puerto',
        'Carnes al carbón, picadas y comida del Pacífico.',
        'Restaurante', 'restaurant',
        'Cra. 3 # 4-58, Centro, Buenaventura', '+573204451189',
        'active', TRUE, 4.8, 212, 211, 25, 3900, 15000, 0.18,
        TRUE, now()
    )
    ON CONFLICT (id) DO UPDATE
        SET status  = 'active',
            is_open = TRUE;

    -- --------------------------------------------------------
    -- 4. El repartidor, ya aprobado y en línea
    -- --------------------------------------------------------
    INSERT INTO public.courier_profiles (
        id, status, approval_status, vehicle_type, plate,
        acceptance_rate, total_deliveries, total_earnings, commission_rate, reviewed_at
    )
    VALUES (
        v_repartidor, 'online', 'active', 'motorcycle', 'WQR-18C',
        0.92, 1284, 4820000, 0.15, now()
    )
    ON CONFLICT (id) DO UPDATE
        SET approval_status = 'active',
            status          = 'online';

    RAISE NOTICE 'Listo. Cuatro cuentas creadas o actualizadas con la contraseña indicada.';
END $$;

-- ============================================================
-- LO QUE QUEDA
--
--   dash.turafood.com   (o localhost:3200)
--       admin@turafood.com        · Super Admin
--
--   app.turafood.com    (o localhost:3100)
--       negocio@turafood.com      · Panel del negocio
--       repartidor@turafood.com   · App del repartidor
--
--   turafood.com        (o localhost:3000)
--       cliente@turafood.com      · App del cliente
--
--   Contraseña de todas: la que quedó en v_password arriba.
--
-- Las tres apps las mandan a la pantalla que les toca según el rol,
-- así que basta con entrar con el correo correspondiente en cada una.
-- ============================================================

-- Comprobación: si algo salió mal, esto lo muestra
SELECT p.email,
       p.role,
       p.full_name,
       (u.email_confirmed_at IS NOT NULL) AS correo_confirmado
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
 WHERE p.email LIKE '%@turafood.com'
 ORDER BY p.role;

-- ------------------------------------------------------------
-- PARA BORRARLAS DESPUÉS
--
-- Descomenta y ejecuta. El borrado en cascada se lleva el perfil, la
-- ficha del negocio y la del repartidor.
-- ------------------------------------------------------------
-- DELETE FROM auth.users
--  WHERE email IN ('admin@turafood.com','negocio@turafood.com',
--                  'repartidor@turafood.com','cliente@turafood.com');
