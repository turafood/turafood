-- ============================================================
-- TURAFOOD — SEED DE DESARROLLO
-- Datos idénticos a los del mockup "Tura Shop - Cliente.dc.html"
-- para que el diseño se vea igual con datos reales.
--
-- Se ejecuta con `supabase db reset`. NO usar en producción.
-- Contraseña de todas las cuentas demo: turafood123
-- ============================================================

-- ------------------------------------------------------------
-- Helper: crear un usuario de auth confirmado
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.demo_user(
    p_id    UUID,
    p_email TEXT,
    p_role  TEXT,
    p_name  TEXT,
    p_phone TEXT
) RETURNS UUID AS $$
BEGIN
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
  ARRAY['Punta del Este','Juan XXIII','El Triunfo','Los Pinos'], 5900, 1000, 20000);

-- ------------------------------------------------------------
-- 2. SUPER ADMIN
-- ------------------------------------------------------------
SELECT pg_temp.demo_user(
    'ad000000-0000-4000-8000-000000000001',
    'admin@turafood.com', 'admin', 'Super Admin', '3160000000');

-- ------------------------------------------------------------
-- 3. CLIENTE DEMO (Camila, la del mockup)
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
  ST_SetSRID(ST_MakePoint(-77.05412, 3.87008), 4326), true),
 ('c0000000-0000-4000-8000-000000000001', 'Trabajo',
  'Cl. 8 # 52-14, Punta del Este', 'Oficina 201', 'Punta del Este',
  ST_SetSRID(ST_MakePoint(-77.02905, 3.88425), 4326), false);

-- ------------------------------------------------------------
-- 4. NEGOCIOS — los 6 del mockup, ya aprobados
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
  4.4, 210, 20, 0, 'Turbo', '1 oferta','a0000000-0000-4000-8000-000000000001', true);

-- Horarios: lunes a domingo 10:00 - 22:00
INSERT INTO public.business_hours (business_id, day_of_week, opens_at, closes_at)
SELECT b.id, d, TIME '10:00', TIME '22:00'
  FROM public.business_profiles b CROSS JOIN generate_series(0,6) d;

-- ------------------------------------------------------------
-- 5. NEGOCIOS PENDIENTES — para probar el Super Admin
-- ------------------------------------------------------------
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000010','rebaja@turafood.com','business','Andrea Solís','3161110010');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000011','sabor@turafood.com','business','Nelson Grueso','3161110011');
SELECT pg_temp.demo_user('b0000000-0000-4000-8000-000000000012','frutas@turafood.com','business','Yamile Bonilla','3161110012');

INSERT INTO public.business_profiles
 (id, name, slug, category, vertical, cover_url, address, location, phone, status, zone_id)
VALUES
 -- Farmacia: el trigger le pone 15% de comisión automáticamente
 ('b0000000-0000-4000-8000-000000000010','Droguería La Rebaja','drogueria-la-rebaja',
  'Farmacia · Medicamentos','pharmacy','/images/steak-rustic.jpg',
  'Cl. 8 # 52-14, Centro', ST_SetSRID(ST_MakePoint(-77.03100, 3.88300),4326),'3161110010',
  'pending_review','a0000000-0000-4000-8000-000000000001'),

 ('b0000000-0000-4000-8000-000000000011','Sabor Pacífico','sabor-pacifico',
  'Comida de mar · Criolla','restaurant','/images/food-fork.jpg',
  'Cra. 4 # 9-30, Bellavista', ST_SetSRID(ST_MakePoint(-77.03900, 3.87600),4326),'3161110011',
  'pending_review','a0000000-0000-4000-8000-000000000002'),

 ('b0000000-0000-4000-8000-000000000012','Frutas y Verduras El Puerto','frutas-verduras-el-puerto',
  'Mercado · Frutas','market','/images/beef-tomatoes.jpg',
  'Cl. 3 # 6-15, Pueblo Nuevo', ST_SetSRID(ST_MakePoint(-77.04800, 3.87300),4326),'3161110012',
  'pending_review','a0000000-0000-4000-8000-000000000001');

-- ------------------------------------------------------------
-- 6. CATÁLOGO DE "ASADERO EL PUERTO" — el menú del mockup
-- ------------------------------------------------------------
INSERT INTO public.product_categories (id, business_id, name, sort_order) VALUES
 ('ca000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Recomendados',0),
 ('ca000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Criolla',1),
 ('ca000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','Bebidas',2),
 ('ca000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','Postres',3);

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
  'Cocadas del puerto','Paquete x6, hechas el mismo día.',12000,NULL,'/images/steak-rustic.jpg',0);

-- Opciones de la Picada Pacífico (tamaño requerido + extras)
INSERT INTO public.product_extras
 (product_id, group_name, name, price_delta, is_required, max_select, sort_order)
VALUES
 ('40000000-0000-4000-8000-000000000001','Tamaño','Para 2 personas',0,true,1,0),
 ('40000000-0000-4000-8000-000000000001','Tamaño','Para 4 personas',32000,true,1,1),
 ('40000000-0000-4000-8000-000000000001','Extras','Porción extra de patacón',6000,false,4,0),
 ('40000000-0000-4000-8000-000000000001','Extras','Salsa de ajo',2000,false,4,1),
 ('40000000-0000-4000-8000-000000000001','Extras','Papa criolla adicional',5000,false,4,2),
 ('40000000-0000-4000-8000-000000000001','Extras','Chorizo extra',7000,false,4,3);

-- Un par de productos para los otros negocios, para que no se vean vacíos
INSERT INTO public.products (business_id, name, description, price, image_url) VALUES
 ('b0000000-0000-4000-8000-000000000002','Combo Doble Bahía','Hamburguesa doble, papas y gaseosa.',29900,'/images/burger.jpg'),
 ('b0000000-0000-4000-8000-000000000002','Alitas BBQ x8','Con salsa de la casa y limón.',24500,'/images/fried-steak.jpg'),
 ('b0000000-0000-4000-8000-000000000003','Encocado de jaiba','Con arroz de coco y patacón.',34500,'/images/food-fork.jpg'),
 ('b0000000-0000-4000-8000-000000000003','Sancocho de pescado','Con hierbas de azotea.',28000,'/images/beef-tomatoes.jpg'),
 ('b0000000-0000-4000-8000-000000000004','Costillas a la parrilla','Media costilla con yuca.',38000,'/images/lamb-chops.jpg'),
 ('b0000000-0000-4000-8000-000000000005','Ceviche mixto','Camarón, pescado y pulpo.',32000,'/images/beef-tomatoes.jpg'),
 ('b0000000-0000-4000-8000-000000000006','Picada El Jorge','Para compartir entre 2.',27000,'/images/fried-steak.jpg');

-- ------------------------------------------------------------
-- 7. REPARTIDORES
-- ------------------------------------------------------------
SELECT pg_temp.demo_user('40000000-0000-4000-8000-0000000000f1','yeison@turafood.com','courier','Yeison Mosquera','3162220001');
SELECT pg_temp.demo_user('40000000-0000-4000-8000-0000000000f2','carlos@turafood.com','courier','Carlos Mina','3162220002');
SELECT pg_temp.demo_user('40000000-0000-4000-8000-0000000000f3','luis@turafood.com','courier','Luis Fernando Angulo','3162220003');

INSERT INTO public.courier_profiles
 (id, status, approval_status, vehicle_type, plate, current_location, total_deliveries, zone_id)
VALUES
 ('40000000-0000-4000-8000-0000000000f1','online','active','motorcycle','WQR-18C',
  ST_SetSRID(ST_MakePoint(-77.04010, 3.87755),4326), 486,'a0000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-0000000000f2','offline','pending_review','motorcycle','KJT-92A',
  NULL, 0,'a0000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-0000000000f3','offline','pending_review','bicycle',NULL,
  NULL, 0,'a0000000-0000-4000-8000-000000000002');

UPDATE public.profiles SET rating = 4.9 WHERE id = '40000000-0000-4000-8000-0000000000f1';

-- ------------------------------------------------------------
-- 8. CUPONES DEL MOCKUP
-- ------------------------------------------------------------
INSERT INTO public.coupons (code, description, discount_type, discount_value, max_discount, min_order) VALUES
 ('TURA20','20% de descuento en tu pedido','percent',20,20000,20000),
 ('ENVIOGRATIS','Envío gratis en tu próximo pedido','free_delivery',0,NULL,15000),
 ('BIENVENIDO','$10.000 de descuento la primera vez','fixed',10000,NULL,25000);

-- ------------------------------------------------------------
-- 9. PLANES DE SUSCRIPCIÓN
-- ------------------------------------------------------------
-- Precios definidos por el negocio (agosto 2026):
--   Tura Plus (cliente):  $9.990 los primeros 3 meses → $19.990
--   Biz Pro (negocio):    $9.990 los primeros 3 meses → $59.990
-- Rider Pro todavía no tiene precio acordado; queda inactivo.
INSERT INTO public.subscription_plans
 (code, name, actor_type, price_intro, price_regular, intro_months, features, is_active) VALUES
 ('PLUS','Tura Plus','customer', 9990, 19990, 3,
  '["Envíos gratis ilimitados","Precios exclusivos","Soporte prioritario"]'::jsonb, true),
 ('BUSINESS_PRO','Tura Biz Pro','business', 9990, 59990, 3,
  '["Sin comisión por pedido","Destacado en el inicio","Reportes avanzados","Promociones ilimitadas"]'::jsonb, true),
 ('RIDER_PRO','Tura Rider Pro','courier', 0, 0, 3,
  '["Pedidos prioritarios","Soporte VIP","Retiros diarios"]'::jsonb, false);

-- ------------------------------------------------------------
-- 10. UN PEDIDO EN VIVO — para ver el kanban y el tracking
-- ------------------------------------------------------------
DO $$
DECLARE
    v_order_id UUID;
BEGIN
    INSERT INTO public.orders (
        customer_id, business_id, courier_id, mode, status,
        delivery_address, delivery_detail, delivery_location,
        subtotal, delivery_fee, service_fee, tip, discount, total,
        payment_method, payment_status, accepted_at
    ) VALUES (
        'c0000000-0000-4000-8000-000000000001',
        'b0000000-0000-4000-8000-000000000001',
        '40000000-0000-4000-8000-0000000000f1',
        'delivery', 'delivering',
        'Cra. 3 # 4-58, Centro', 'Torre B, apto 402',
        ST_SetSRID(ST_MakePoint(-77.05412, 3.87008),4326),
        102700, 0, 5135, 2500, 0, 110335,
        'nequi', 'paid', now() - interval '18 minutes'
    ) RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (order_id, product_id, name, unit_price, quantity, subtotal, notes) VALUES
     (v_order_id,'40000000-0000-4000-8000-000000000001','Picada Pacífico para 2',48900,1,48900,'Sin cebolla'),
     (v_order_id,'40000000-0000-4000-8000-000000000004','Arroz atollado valluno',26900,2,53800,NULL);
END $$;

-- Pedidos nuevos esperando aceptación (kanban del negocio)
DO $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.orders (
        customer_id, business_id, mode, status,
        delivery_address, delivery_location,
        subtotal, delivery_fee, service_fee, total, payment_method, payment_status
    ) VALUES (
        'c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
        'delivery','pending','Cl. 5 # 8-20, El Jorge',
        ST_SetSRID(ST_MakePoint(-77.04010, 3.87755),4326),
        38500, 0, 1925, 40425,'cash','pending'
    ) RETURNING id INTO v_id;

    INSERT INTO public.order_items (order_id, product_id, name, unit_price, quantity, subtotal, notes) VALUES
     (v_id,'40000000-0000-4000-8000-000000000002','Churrasco 350 g',41000,1,41000,
      'Sin cebolla y extra salsa de ajo por favor.');

    INSERT INTO public.orders (
        customer_id, business_id, mode, status,
        subtotal, delivery_fee, service_fee, total, payment_method, payment_status
    ) VALUES (
        'c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
        'pickup','pending', 36500, 0, 1825, 38325,'card','paid'
    ) RETURNING id INTO v_id;

    INSERT INTO public.order_items (order_id, product_id, name, unit_price, quantity, subtotal) VALUES
     (v_id,'40000000-0000-4000-8000-000000000003','Costilla BBQ',36500,1,36500);
END $$;
