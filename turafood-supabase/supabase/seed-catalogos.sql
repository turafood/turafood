-- ============================================================
-- TURAFOOD — Catálogos completos de los negocios de demostración
--
-- El seed principal deja a Asadero El Puerto con su menú del mockup y
-- a los otros cinco con uno o dos productos sueltos. Con eso la app
-- del cliente se ve vacía apenas se entra a cualquier otra tienda, y
-- no se puede probar nada que dependa de tener catálogo: buscar,
-- filtrar por categoría, el carrito con varios productos.
--
-- Esto los llena: categorías, productos con precio tachado donde hay
-- promoción, y opciones donde tiene sentido pedirlas.
--
-- Cómo correrlo:
--   Panel de Supabase → SQL Editor → pegar y ejecutar.
--   O:  cd turafood-supabase && supabase db execute --file supabase/seed-catalogos.sql
--
-- Se puede volver a correr: borra el catálogo anterior de esos cinco
-- negocios antes de insertar, así no se duplican los productos.
-- Asadero El Puerto NO se toca — ese menú es el del mockup y es la
-- referencia visual.
-- ============================================================

BEGIN;

-- Los cinco que vamos a llenar. Asadero El Puerto (…0001) queda fuera.
CREATE TEMP TABLE _negocios (id UUID) ON COMMIT DROP;
INSERT INTO _negocios VALUES
    ('b0000000-0000-4000-8000-000000000002'),  -- Burger House Bahía
    ('b0000000-0000-4000-8000-000000000003'),  -- Marisquería El Faro
    ('b0000000-0000-4000-8000-000000000004'),  -- Parrilla Punta del Este
    ('b0000000-0000-4000-8000-000000000005'),  -- Cevichería Doña Rosa
    ('b0000000-0000-4000-8000-000000000006');  -- Picadas El Jorge

-- Limpieza previa. El orden importa: las opciones cuelgan de los
-- productos y los productos de las categorías.
DELETE FROM public.product_extras
 WHERE product_id IN (
     SELECT p.id FROM public.products p
      WHERE p.business_id IN (SELECT id FROM _negocios));

DELETE FROM public.products
 WHERE business_id IN (SELECT id FROM _negocios);

DELETE FROM public.product_categories
 WHERE business_id IN (SELECT id FROM _negocios);

-- ------------------------------------------------------------
-- Categorías
--
-- Cada negocio con las suyas y en el orden en que las pondría el
-- dueño: primero lo que más se vende, las bebidas y el postre al
-- final. El orden de la carta es una decisión comercial, no alfabética.
-- ------------------------------------------------------------
INSERT INTO public.product_categories (id, business_id, name, sort_order) VALUES
 -- Burger House Bahía
 ('cb000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','Hamburguesas',0),
 ('cb000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Alitas y fritos',1),
 ('cb000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','Combos',2),
 ('cb000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002','Bebidas',3),

 -- Marisquería El Faro
 ('cc000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','Encocados',0),
 ('cc000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000003','Sopas y sancochos',1),
 ('cc000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','Pescados',2),
 ('cc000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000003','Bebidas del Pacífico',3),

 -- Parrilla Punta del Este
 ('cd000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004','A la parrilla',0),
 ('cd000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000004','Para compartir',1),
 ('cd000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004','Acompañamientos',2),
 ('cd000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','Bebidas',3),

 -- Cevichería Doña Rosa
 ('ce000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','Ceviches',0),
 ('ce000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000005','Cocteles de mar',1),
 ('ce000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000005','Empanadas y fritos',2),
 ('ce000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000005','Bebidas',3),

 -- Picadas El Jorge
 ('cf000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006','Picadas',0),
 ('cf000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000006','Fritos',1),
 ('cf000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000006','Salchipapas',2),
 ('cf000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000006','Bebidas',3);

-- ------------------------------------------------------------
-- Productos
--
-- `compare_price` es el precio antes del descuento: cuando está, la
-- app lo muestra tachado. Solo se pone en unos pocos por negocio —
-- una carta donde todo está en oferta no convence a nadie.
-- ------------------------------------------------------------
INSERT INTO public.products
 (id, business_id, category_id, name, description, price, compare_price, image_url, sort_order)
VALUES
 -- ---------- Burger House Bahía ----------
 ('41000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000001',
  'Doble Bahía','Doble carne de res, doble queso, tocineta y salsa de la casa.',32900,39900,'/images/burger.jpg',0),
 ('41000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000001',
  'Hamburguesa criolla','Carne de res, queso costeño, patacón y hogao.',26900,NULL,'/images/burger-hero.jpg',1),
 ('41000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000001',
  'Pollo crispy','Pechuga apanada, lechuga, tomate y salsa ranch.',24900,NULL,'/images/fried-steak.jpg',2),
 ('41000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000002',
  'Alitas BBQ x8','Con salsa de la casa y limón.',24500,29000,'/images/fried-steak.jpg',0),
 ('41000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000002',
  'Dedos de queso x6','Con salsa de piña picante.',16900,NULL,'/images/steak-rustic.jpg',1),
 ('41000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000003',
  'Combo Doble Bahía','Hamburguesa doble, papas grandes y gaseosa.',39900,47000,'/images/burger.jpg',0),
 ('41000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000003',
  'Combo para dos','Dos hamburguesas, alitas x8, papas y dos gaseosas.',72900,89000,'/images/burger-hero.jpg',1),
 ('41000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000004',
  'Gaseosa 400 ml','Bien fría.',4500,NULL,'/images/beef-tomatoes.jpg',0),
 ('41000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000002','cb000000-0000-4000-8000-000000000004',
  'Limonada natural','Jarra personal.',7500,NULL,'/images/beef-tomatoes.jpg',1),

 -- ---------- Marisquería El Faro ----------
 ('42000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000001',
  'Encocado de jaiba','En leche de coco, con arroz de coco y patacón.',34500,NULL,'/images/food-fork.jpg',0),
 ('42000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000001',
  'Encocado de camarón','Camarón tití en leche de coco, con arroz blanco.',38900,45000,'/images/food-fork.jpg',1),
 ('42000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000001',
  'Encocado mixto','Camarón, jaiba y pescado en el mismo plato.',44900,NULL,'/images/steak-fork.jpg',2),
 ('42000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000002',
  'Sancocho de pescado','Con hierbas de azotea, yuca y plátano.',28000,NULL,'/images/beef-tomatoes.jpg',0),
 ('42000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000002',
  'Sopa de cangrejo','Espesa, con leche de coco.',31000,NULL,'/images/beef-tomatoes.jpg',1),
 ('42000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000003',
  'Pargo rojo frito','Entero, con arroz, patacón y ensalada.',48900,56000,'/images/steak-fork.jpg',0),
 ('42000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000003',
  'Filete de tilapia','A la plancha o apanado, con arroz de coco.',33900,NULL,'/images/fried-steak.jpg',1),
 ('42000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000004',
  'Jugo de borojó','En agua o en leche.',8500,NULL,'/images/beef-tomatoes.jpg',0),
 ('42000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000003','cc000000-0000-4000-8000-000000000004',
  'Jugo de chontaduro','Con miel, como se toma acá.',9000,NULL,'/images/beef-tomatoes.jpg',1),

 -- ---------- Parrilla Punta del Este ----------
 ('43000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000001',
  'Costillas a la parrilla','Media costilla de cerdo en salsa BBQ, con yuca.',38000,44000,'/images/lamb-chops.jpg',0),
 ('43000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000001',
  'Churrasco 400 g','Lomo fino con chimichurri, papas y ensalada.',46900,NULL,'/images/steak-ribeye.jpg',1),
 ('43000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000001',
  'Punta de anca','Término al gusto, con papa criolla.',52000,NULL,'/images/steak-rustic.jpg',2),
 ('43000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000002',
  'Parrillada Punta del Este','Res, cerdo, pollo, chorizo y morcilla. Para 4.',129000,155000,'/images/lamb-chops.jpg',0),
 ('43000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000002',
  'Picada de la casa','Para 2, con todos los fritos.',52900,NULL,'/images/fried-steak.jpg',1),
 ('43000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000003',
  'Papa criolla','Porción grande.',9000,NULL,'/images/steak-rustic.jpg',0),
 ('43000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000003',
  'Yuca frita','Con suero costeño.',8500,NULL,'/images/fried-steak.jpg',1),
 ('43000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000004','cd000000-0000-4000-8000-000000000004',
  'Cerveza nacional','Bien fría.',6000,NULL,'/images/beef-tomatoes.jpg',0),

 -- ---------- Cevichería Doña Rosa ----------
 ('44000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000001',
  'Ceviche mixto','Camarón, pescado y pulpo en leche de tigre.',32000,NULL,'/images/beef-tomatoes.jpg',0),
 ('44000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000001',
  'Ceviche de camarón','Camarón tití, cebolla morada y limón.',28900,34000,'/images/food-fork.jpg',1),
 ('44000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000001',
  'Ceviche de pescado','Corvina fresca del día.',26900,NULL,'/images/steak-fork.jpg',2),
 ('44000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000002',
  'Coctel de camarón','Con salsa rosada de la casa.',24500,NULL,'/images/food-fork.jpg',0),
 ('44000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000002',
  'Coctel de piangua','El del Pacífico, con limón y cilantro.',27900,NULL,'/images/beef-tomatoes.jpg',1),
 ('44000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000003',
  'Empanadas de camarón x4','Recién hechas, con ají.',14900,18000,'/images/fried-steak.jpg',0),
 ('44000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000003',
  'Patacón con queso','Con suero y hogao.',11900,NULL,'/images/fried-steak.jpg',1),
 ('44000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000005','ce000000-0000-4000-8000-000000000004',
  'Limonada de coco','Jarra personal.',9500,NULL,'/images/beef-tomatoes.jpg',0),

 -- ---------- Picadas El Jorge ----------
 ('45000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000001',
  'Picada El Jorge','Para 2: chorizo, chicharrón, carne, papa y patacón.',27000,NULL,'/images/fried-steak.jpg',0),
 ('45000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000001',
  'Picada familiar','Para 4, con todo.',49900,58000,'/images/steak-rustic.jpg',1),
 ('45000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000002',
  'Chicharrón carnudo','Porción grande, con limón.',18900,NULL,'/images/fried-steak.jpg',0),
 ('45000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000002',
  'Chorizo santarrosano x2','Con arepa y ají.',15900,NULL,'/images/steak-rustic.jpg',1),
 ('45000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000003',
  'Salchipapa sencilla','Papa a la francesa, salchicha y salsas.',13900,NULL,'/images/fried-steak.jpg',0),
 ('45000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000003',
  'Salchipapa especial','Con carne desmechada, queso y maíz tierno.',21900,26000,'/images/steak-rustic.jpg',1),
 ('45000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000003',
  'Salchipapa suiza','Con salchicha ranchera, tocineta y queso fundido.',24900,NULL,'/images/fried-steak.jpg',2),
 ('45000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000006','cf000000-0000-4000-8000-000000000004',
  'Gaseosa 1,5 L','Para compartir.',7900,NULL,'/images/beef-tomatoes.jpg',0);

-- ------------------------------------------------------------
-- Opciones
--
-- Solo donde el negocio de verdad las pediría. Ponerle "tamaño" a una
-- gaseosa de lata es fricción sin motivo, y una carta llena de
-- preguntas hace que la gente abandone el pedido.
-- ------------------------------------------------------------
INSERT INTO public.product_extras
 (product_id, group_name, name, price_delta, is_required, max_select, sort_order)
VALUES
 -- Doble Bahía: punto de la carne y adicionales
 ('41000000-0000-4000-8000-000000000001','Término','Tres cuartos',0,true,1,0),
 ('41000000-0000-4000-8000-000000000001','Término','Bien asada',0,true,1,1),
 ('41000000-0000-4000-8000-000000000001','Adicionales','Tocineta extra',4500,false,4,0),
 ('41000000-0000-4000-8000-000000000001','Adicionales','Queso extra',3000,false,4,1),
 ('41000000-0000-4000-8000-000000000001','Adicionales','Huevo frito',3500,false,4,2),
 ('41000000-0000-4000-8000-000000000001','Adicionales','Papas grandes',7000,false,4,3),

 -- Combo para dos: la bebida se elige
 ('41000000-0000-4000-8000-000000000007','Bebidas','Dos gaseosas',0,true,1,0),
 ('41000000-0000-4000-8000-000000000007','Bebidas','Dos limonadas',4000,true,1,1),

 -- Encocado de camarón: arroz y picante
 ('42000000-0000-4000-8000-000000000002','Arroz','Arroz de coco',0,true,1,0),
 ('42000000-0000-4000-8000-000000000002','Arroz','Arroz blanco',0,true,1,1),
 ('42000000-0000-4000-8000-000000000002','Extras','Patacón adicional',5000,false,3,0),
 ('42000000-0000-4000-8000-000000000002','Extras','Ají del Pacífico',2000,false,3,1),

 -- Pargo rojo: cómo lo quiere
 ('42000000-0000-4000-8000-000000000006','Preparación','Frito entero',0,true,1,0),
 ('42000000-0000-4000-8000-000000000006','Preparación','Sudado en coco',4000,true,1,1),

 -- Churrasco: término obligatorio
 ('43000000-0000-4000-8000-000000000002','Término','Tres cuartos',0,true,1,0),
 ('43000000-0000-4000-8000-000000000002','Término','Al punto',0,true,1,1),
 ('43000000-0000-4000-8000-000000000002','Término','Bien asado',0,true,1,2),
 ('43000000-0000-4000-8000-000000000002','Acompañamiento','Papa criolla',0,false,2,0),
 ('43000000-0000-4000-8000-000000000002','Acompañamiento','Yuca frita',0,false,2,1),

 -- Parrillada: para cuántos
 ('43000000-0000-4000-8000-000000000004','Tamaño','Para 4 personas',0,true,1,0),
 ('43000000-0000-4000-8000-000000000004','Tamaño','Para 6 personas',48000,true,1,1),

 -- Ceviche mixto: qué tan picante
 ('44000000-0000-4000-8000-000000000001','Picante','Sin picante',0,true,1,0),
 ('44000000-0000-4000-8000-000000000001','Picante','Medio',0,true,1,1),
 ('44000000-0000-4000-8000-000000000001','Picante','Bien picante',0,true,1,2),
 ('44000000-0000-4000-8000-000000000001','Extras','Patacones adicionales',5000,false,2,0),

 -- Picada familiar: para cuántos
 ('45000000-0000-4000-8000-000000000002','Tamaño','Para 4 personas',0,true,1,0),
 ('45000000-0000-4000-8000-000000000002','Tamaño','Para 6 personas',24000,true,1,1),

 -- Salchipapa especial: salsas
 ('45000000-0000-4000-8000-000000000006','Salsas','Rosada',0,false,4,0),
 ('45000000-0000-4000-8000-000000000006','Salsas','Ajo',0,false,4,1),
 ('45000000-0000-4000-8000-000000000006','Salsas','Piña picante',0,false,4,2),
 ('45000000-0000-4000-8000-000000000006','Salsas','Sin salsas',0,false,4,3);

COMMIT;

-- Comprobación: cuántos productos quedó con cada negocio
SELECT b.name AS negocio,
       count(DISTINCT c.id) AS categorias,
       count(p.id)          AS productos
  FROM public.business_profiles b
  LEFT JOIN public.product_categories c ON c.business_id = b.id
  LEFT JOIN public.products p           ON p.business_id = b.id
 WHERE b.status = 'active'
 GROUP BY b.name
 ORDER BY b.name;
