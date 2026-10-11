-- ====================================================================
-- TURAFOOD — Activa el negocio de prueba y le arma un menú mínimo.
--
-- Lo corre crear-cuentas-demo (fase 1 → este SQL → fase 2). Es idempotente.
-- No inventa teléfonos ni números de pago: el dueño pone los suyos en
-- Ajustes cuando quiera recibir comandas por WhatsApp.
-- ====================================================================
BEGIN;

-- Los campos protegidos de un negocio solo los mueven el admin o las
-- funciones de la base; esta marca vale solo dentro de esta transacción.
SELECT set_config('turafood.sella_negocio', 'on', true);

DO $$
DECLARE
    v_id  UUID;
    v_cat UUID;
BEGIN
    SELECT id INTO v_id FROM auth.users WHERE email = 'demo.negocio@turafood.com';
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Falta el usuario demo.negocio@turafood.com: corre primero la fase 1';
    END IF;

    UPDATE public.business_profiles
       SET status            = 'active',
           reviewed_at       = COALESCE(reviewed_at, now()),
           submitted_at      = COALESCE(submitted_at, now()),
           category          = 'Restaurante',
           vertical          = 'restaurant',
           description       = 'Negocio de prueba de TuraFood: comida del Pacífico para probar pedidos, repartidores y seguimiento.',
           address           = 'Calle 2 # 3-10, Centro, Buenaventura',
           neighborhood      = 'Centro',
           location          = ST_SetSRID(ST_MakePoint(-77.0312, 3.8801), 4326),
           is_open           = true,
           delivery_fee      = 3900,
           min_order         = 15000,
           prep_time_min     = 20,
           accepts_pickup    = true,
           payment_methods   = ARRAY['cash'],   -- 'whatsapp' exige un número del negocio; no se inventa
           solo_flota_propia = true
     WHERE id = v_id;

    IF NOT EXISTS (SELECT 1 FROM public.products WHERE business_id = v_id) THEN
        INSERT INTO public.product_categories (business_id, name, sort_order, is_active)
        VALUES (v_id, 'Platos fuertes', 0, true)
        RETURNING id INTO v_cat;

        INSERT INTO public.products (business_id, category_id, name, description, price, image_url, images, is_available, sort_order) VALUES
            (v_id, v_cat, 'Picada del Pacífico para 2', 'Chorizo, chicharrón, carne asada, papa criolla y patacón.', 48900, '/images/steak-ribeye.jpg', ARRAY['/images/steak-ribeye.jpg'], true, 0),
            (v_id, v_cat, 'Churrasco 350 g', 'Con papas a la francesa, ensalada y salsa de la casa.', 41000, '/images/steak-rustic.jpg', ARRAY['/images/steak-rustic.jpg'], true, 1),
            (v_id, v_cat, 'Hamburguesa de la casa', 'Carne artesanal, queso, tocineta y papas.', 22000, '/images/burger.jpg', ARRAY['/images/burger.jpg'], true, 2),
            (v_id, v_cat, 'Gaseosa 400 ml', NULL, 4000, NULL, NULL, true, 3);
    END IF;
END $$;

COMMIT;
