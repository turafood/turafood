-- ============================================================
-- TURAFOOD — SEED DE DATOS SEGURO (100% IDEMPOTENTE)
-- No borra llaves foráneas, no rompe pedidos existentes y
-- se puede ejecutar cuantas veces quieras en Supabase.
--
-- Contraseña de todas las cuentas demo: turafood123
-- ============================================================

-- ------------------------------------------------------------
-- Helper: crear o actualizar usuario de auth y perfil
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.demo_user(
    p_id    UUID,
    p_email TEXT,
    p_role  TEXT,
    p_name  TEXT,
    p_phone TEXT
) RETURNS UUID AS $$
DECLARE
    v_uid UUID;
BEGIN
    SELECT id INTO v_uid FROM auth.users WHERE email = p_email OR id = p_id LIMIT 1;
    
    IF v_uid IS NOT NULL THEN
        -- Ya existe el usuario en auth.users, sincronizamos el perfil
        INSERT INTO public.profiles (id, email, full_name, phone, role)
        VALUES (v_uid, p_email, p_name, p_phone, p_role)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role;
        RETURN v_uid;
    END IF;

    -- Si no existe, lo insertamos
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
        p_email, crypt('turafood123', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('role', p_role, 'full_name', p_name, 'phone', p_phone),
        now(), now(), '', '', '', ''
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (p_id, p_email, p_name, p_phone, p_role)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role;

    RETURN p_id;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. ZONAS DE BUENAVENTURA
-- ------------------------------------------------------------
INSERT INTO public.delivery_zones (id, name, neighborhoods, base_fee, per_km_fee, min_order) VALUES
 ('a0000000-0000-4000-8000-000000000001', 'Centro',
  ARRAY['Centro','El Jorge','Pueblo Nuevo','La Playita'], 3900, 800, 0),
 ('a0000000-0000-4000-8000-000000000002', 'Isla Cascajal',
  ARRAY['Bellavista','Nayita','Lleras','Alberto Lleras'], 4900, 900, 15000),
 ('a0000000-0000-4000-8000-000000000003', 'Continente',
  ARRAY['Punta del Este','Juan XXIII','El Triunfo','Los Pinos'], 5900, 1000, 20000)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. SUPER ADMIN
-- ------------------------------------------------------------
SELECT pg_temp.demo_user(
    'ad000000-0000-4000-8000-000000000001',
    'admin@turafood.com', 'admin', 'Super Admin', '3137594713');

-- ------------------------------------------------------------
-- 3. CLIENTE DEMO (Camila)
-- ------------------------------------------------------------
SELECT pg_temp.demo_user(
    'c0000000-0000-4000-8000-000000000001',
    'camila@turafood.com', 'customer', 'María Camila Ortíz', '3161234567');

UPDATE public.profiles SET tura_plus = true,
       tura_plus_expires_at = now() + interval '30 days'
 WHERE id = 'c0000000-0000-4000-8000-000000000001';

INSERT INTO public.addresses (user_id, label, address, detail, neighborhood, location, is_default) VALUES
 ('c0000000-0000-4000-8000-000000000001', 'Casa',
  'Cra. 3 # 4-58, Centro', 'Torre B, apto 402', 'Centro',
  ST_SetSRID(ST_MakePoint(-77.05412, 3.87008), 4326), true)
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 4. NEGOCIOS DEMO
-- ------------------------------------------------------------
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000001','puerto@turafood.com','business','Jhon Castillo','3161110001');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000002','bahia@turafood.com','business','Laura Riascos','3161110002');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000003','faro@turafood.com','business','Diego Angulo','3161110003');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000004','punta@turafood.com','business','Marta Valencia','3161110004');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000005','rosa@turafood.com','business','Rosa Mina','3161110005');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000006','jorge@turafood.com','business','Jorge Caicedo','3161110006');

INSERT INTO public.business_profiles
 (id, name, slug, category, vertical, cover_url, address, location, phone, status,
  rating, reviews_count, prep_time_min, delivery_fee, badge, offer_label, zone_id, is_open)
VALUES
 ('b0000000-0000-4000-8000-000000000001','Asadero El Puerto','asadero-el-puerto',
  'Asados · Picadas · Criolla','restaurant','/images/steak-ribeye.jpg',
  'Cra. 3 # 4-58, Centro', ST_SetSRID(ST_MakePoint(-77.02905, 3.88425),4326),'3161110001','active',
  4.8, 1240, 28, 0, 'Turbo', '2x1 en picadas','a0000000-0000-4000-8000-000000000001', true),

 ('b0000000-0000-4000-8000-000000000002','Burger House Bahía','burger-house-bahia',
  'Hamburguesas · Alitas','restaurant','/images/burger.jpg',
  'Cl. 2 # 3-21, Centro', ST_SetSRID(ST_MakePoint(-77.03340, 3.88190),4326),'3161110002','active',
  4.6, 860, 22, 3500, 'Turbo', 'Hasta 40% off','a0000000-0000-4000-8000-000000000001', true),

 ('b0000000-0000-4000-8000-000000000003','Marisquería El Faro','marisqueria-el-faro',
  'Mariscos · Encocados','restaurant','/images/food-fork.jpg',
  'Cra. 1 # 7-12, La Playita', ST_SetSRID(ST_MakePoint(-77.03680, 3.87960),4326),'3161110003','active',
  4.9, 2105, 35, 4900, 'Top', 'Envío gratis hoy','a0000000-0000-4000-8000-000000000002', true),

 ('b0000000-0000-4000-8000-000000000004','Parrilla Punta del Este','parrilla-punta-del-este',
  'Parrilla · Costillas','restaurant','/images/lamb-chops.jpg',
  'Cl. 8 # 52-14, Punta del Este', ST_SetSRID(ST_MakePoint(-77.04520, 3.87480),4326),'3161110004','active',
  4.7, 540, 30, 3900, 'Nuevo', '15% off','a0000000-0000-4000-8000-000000000003', true),

 ('b0000000-0000-4000-8000-000000000005','Cevichería Doña Rosa','cevicheria-dona-rosa',
  'Ceviches · Cocteles','restaurant','/images/beef-tomatoes.jpg',
  'Cra. 5 # 2-40, Pueblo Nuevo', ST_SetSRID(ST_MakePoint(-77.05010, 3.87190),4326),'3161110005','active',
  4.5, 320, 25, 2900, 'Turbo', NULL,'a0000000-0000-4000-8000-000000000001', true),

 ('b0000000-0000-4000-8000-000000000006','Picadas El Jorge','picadas-el-jorge',
  'Picadas · Fritos','restaurant','/images/fried-steak.jpg',
  'Cl. 6 # 4-09, El Jorge', ST_SetSRID(ST_MakePoint(-77.04010, 3.87755),4326),'3161110006','active',
  4.4, 210, 20, 0, 'Turbo', '1 oferta','a0000000-0000-4000-8000-000000000001', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  cover_url = EXCLUDED.cover_url,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  is_open = EXCLUDED.is_open;

-- ------------------------------------------------------------
-- 5. CATÁLOGO Y MENÚ DEL ASADERO
-- ------------------------------------------------------------
INSERT INTO public.product_categories (id, business_id, name, sort_order) VALUES
 ('ca000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Recomendados',0),
 ('ca000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Criolla',1),
 ('ca000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Bebidas',2),
 ('ca000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','Postres',3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.products
 (id, business_id, category_id, name, description, price, compare_price, image_url, sort_order)
VALUES
 ('40000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001',
  'Picada Pacífico para 2','Chorizo, chicharrón, carne asada, papa criolla y patacón.',48900,62000,'/images/steak-ribeye.jpg',0),
 ('40000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001',
  'Churrasco 350 g','Con papas a la francesa, ensalada y salsa de la casa.',41000,NULL,'/images/steak-rustic.jpg',1),
 ('40000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001',
  'Costilla BBQ','Media costilla en salsa BBQ con yuca frita.',36500,44000,'/images/lamb-chops.jpg',2),
 ('40000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002',
  'Arroz atollado valluno','Cerdo, pollo, longaniza y papa criolla.',26900,NULL,'/images/fried-steak.jpg',0),
 ('40000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002',
  'Encocado de jaiba','Preparado con leche de coco y arroz blanco.',34500,NULL,'/images/food-fork.jpg',1),
 ('40000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000003',
  'Limonada de coco 16 oz','Jarra personal, bien fría.',9500,NULL,'/images/beef-tomatoes.jpg',0),
 ('40000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000003',
  'Jugo de borojó','En agua o leche.',8500,NULL,'/images/beef-tomatoes.jpg',1),
 ('40000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000004',
  'Cocadas del puerto','Paquete x6, hechas el mismo día.',12000,NULL,'/images/steak-rustic.jpg',0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url;

-- ------------------------------------------------------------
-- 6. REPARTIDORES
-- ------------------------------------------------------------
SELECT pg_temp.demo_user('40000000-0000-4000-8000-0000000000f1','yeison@turafood.com','courier','Yeison Mosquera','3162220001');

INSERT INTO public.courier_profiles
 (id, status, approval_status, vehicle_type, plate, current_location, total_deliveries, zone_id)
VALUES
 ('40000000-0000-4000-8000-0000000000f1','online','active','motorcycle','WQR-18C',
  ST_SetSRID(ST_MakePoint(-77.04010, 3.87755),4326), 486,'a0000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  approval_status = EXCLUDED.approval_status;

-- ------------------------------------------------------------
-- 7. CUPONES Y PLANES
-- ------------------------------------------------------------
INSERT INTO public.coupons (code, description, discount_type, discount_value, max_discount, min_order) VALUES
 ('TURA20','20% de descuento en tu pedido','percent',20,20000,20000),
 ('ENVIOGRATIS','Envío gratis en tu próximo pedido','free_delivery',0,NULL,15000),
 ('BIENVENIDO','$10.000 de descuento la primera vez','fixed',10000,NULL,25000)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.subscription_plans
 (code, name, actor_type, price_intro, price_regular, intro_months, features, is_active) VALUES
 ('PLUS','Tura Plus','customer', 9990, 19990, 3,
  '["Envíos gratis ilimitados","Precios exclusivos","Soporte prioritario"]'::jsonb, true),
 ('BUSINESS_PRO','Tura Biz Pro','business', 9990, 59990, 3,
  '["Sin comisión por pedido","Destacado en el inicio","Reportes avanzados","Promociones ilimitadas"]'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- ¡SEED COMPLETADO CON ÉXITO!
-- ============================================================
