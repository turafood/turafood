-- ============================================================
-- TURAFOOD — Menú de Asadero El Puerto
--
-- `seed-usuarios-prueba.sql` crea la cuenta negocio@turafood.co con su
-- ficha, pero sin catálogo. `seed-catalogos.sql` lo excluye a propósito
-- porque asumía que el seed de desarrollo ya le había puesto el menú
-- del mockup — y ese seed solo corre con `supabase db reset`.
--
-- Resultado: justo la cuenta con la que se prueba el panel de negocio
-- quedaba con el menú vacío. Esto lo llena.
--
-- Busca por slug y no por id: `seed-usuarios-prueba.sql` le asigna el
-- id del usuario de auth, que es aleatorio.
--
-- Se puede volver a correr sin duplicar.
-- ============================================================

DO $$
DECLARE
    v_biz UUID;
    v_rec UUID; v_cri UUID; v_beb UUID; v_pos UUID;
    v_picada UUID;
BEGIN
    SELECT id INTO v_biz FROM public.business_profiles WHERE slug = 'asadero-el-puerto';
    IF v_biz IS NULL THEN
        RAISE EXCEPTION 'No existe el negocio asadero-el-puerto. Corre primero seed-usuarios-prueba.sql';
    END IF;

    DELETE FROM public.product_extras
     WHERE product_id IN (SELECT id FROM public.products WHERE business_id = v_biz);
    DELETE FROM public.products WHERE business_id = v_biz;
    DELETE FROM public.product_categories WHERE business_id = v_biz;

    INSERT INTO public.product_categories (business_id, name, sort_order)
    VALUES (v_biz, 'Recomendados', 0) RETURNING id INTO v_rec;
    INSERT INTO public.product_categories (business_id, name, sort_order)
    VALUES (v_biz, 'Criolla', 1) RETURNING id INTO v_cri;
    INSERT INTO public.product_categories (business_id, name, sort_order)
    VALUES (v_biz, 'Bebidas', 2) RETURNING id INTO v_beb;
    INSERT INTO public.product_categories (business_id, name, sort_order)
    VALUES (v_biz, 'Postres', 3) RETURNING id INTO v_pos;

    INSERT INTO public.products (business_id, category_id, name, description, price, compare_price, image_url, sort_order)
    VALUES (v_biz, v_rec, 'Picada Pacifico para 2',
            'Chorizo, chicharron, carne asada, papa criolla y patacon.',
            48900, 62000, '/images/steak-ribeye.jpg', 0)
    RETURNING id INTO v_picada;

    INSERT INTO public.products (business_id, category_id, name, description, price, compare_price, image_url, sort_order) VALUES
     (v_biz, v_rec, 'Churrasco 350 g', 'Con papas a la francesa, ensalada y salsa de la casa.', 41000, NULL, '/images/steak-rustic.jpg', 1),
     (v_biz, v_rec, 'Costilla BBQ', 'Media costilla en salsa BBQ con yuca frita.', 36500, 44000, '/images/lamb-chops.jpg', 2),
     (v_biz, v_cri, 'Arroz atollado valluno', 'Cerdo, pollo, longaniza y papa criolla.', 26900, NULL, '/images/fried-steak.jpg', 0),
     (v_biz, v_cri, 'Encocado de jaiba', 'Preparado con leche de coco y arroz blanco.', 34500, NULL, '/images/food-fork.jpg', 1),
     (v_biz, v_beb, 'Limonada de coco 16 oz', 'Jarra personal, bien fria.', 9500, NULL, '/images/beef-tomatoes.jpg', 0),
     (v_biz, v_beb, 'Jugo de borojo', 'En agua o en leche.', 8500, NULL, '/images/beef-tomatoes.jpg', 1),
     (v_biz, v_pos, 'Cocadas del puerto', 'Paquete x6, hechas el mismo dia.', 12000, NULL, '/images/steak-rustic.jpg', 0);

    INSERT INTO public.product_extras (product_id, group_name, name, price_delta, is_required, max_select, sort_order) VALUES
     (v_picada, 'Tamano', 'Para 2 personas', 0, true, 1, 0),
     (v_picada, 'Tamano', 'Para 4 personas', 32000, true, 1, 1),
     (v_picada, 'Extras', 'Porcion extra de patacon', 6000, false, 4, 0),
     (v_picada, 'Extras', 'Salsa de ajo', 2000, false, 4, 1),
     (v_picada, 'Extras', 'Papa criolla adicional', 5000, false, 4, 2),
     (v_picada, 'Extras', 'Chorizo extra', 7000, false, 4, 3);
END $$;

SELECT b.name, count(DISTINCT c.id) AS categorias, count(p.id) AS productos
  FROM public.business_profiles b
  LEFT JOIN public.product_categories c ON c.business_id = b.id
  LEFT JOIN public.products p ON p.business_id = b.id
 WHERE b.status = 'active'
 GROUP BY b.name ORDER BY b.name;
