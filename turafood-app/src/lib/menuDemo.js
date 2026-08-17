'use client';

/**
 * MENÚS DE ARRANQUE POR VERTICAL
 *
 * Un catálogo vacío es la razón más común por la que un negocio nuevo
 * abandona: entra, ve una tabla en blanco y no sabe por dónde empezar.
 * Con un menú de ejemplo cargado ya tiene algo que editar, que es
 * mucho más fácil que crear desde cero.
 *
 * Los precios son de referencia de Buenaventura y el negocio los
 * cambia. Las fotos son las que hay en la app; donde no hay foto real
 * se deja `null` y la miniatura muestra el icono 3D de la vertical, que
 * se ve intencional en vez de roto.
 */

import { createClient } from '@/utils/supabase/client';
import { isLive } from './negocio';

const IMG = {
  burger: '/images/burger.jpg',
  burgerHero: '/images/burger-hero.jpg',
  steak: '/images/steak-ribeye.jpg',
  steakRustic: '/images/steak-rustic.jpg',
  fried: '/images/fried-steak.jpg',
  fork: '/images/food-fork.jpg',
  lamb: '/images/lamb-chops.jpg',
  tomatoes: '/images/beef-tomatoes.jpg',
};

export const STARTER_MENUS = {
  restaurant: {
    label: 'Restaurante y comidas rápidas',
    categories: [
      {
        name: 'Hamburguesas',
        products: [
          { name: 'Hamburguesa clásica', description: 'Carne de res, queso, lechuga, tomate y salsa de la casa', price: 16000, image_url: IMG.burger },
          { name: 'Hamburguesa doble carne', description: 'Doble carne, doble queso y tocineta', price: 24000, compare_price: 28000, image_url: IMG.burgerHero },
          { name: 'Hamburguesa de pollo', description: 'Pechuga apanada, lechuga y salsa de piña', price: 17500, image_url: null },
        ],
      },
      {
        name: 'Salchipapas y picadas',
        products: [
          { name: 'Salchipapa personal', description: 'Papa a la francesa, salchicha y salsas', price: 12000, image_url: null },
          { name: 'Salchipapa especial', description: 'Papa, salchicha, carne desmechada, queso y maíz', price: 19000, image_url: IMG.fried },
          { name: 'Picada para 2', description: 'Chorizo, chicharrón, carne asada, papa criolla y patacón', price: 45000, compare_price: 52000, image_url: IMG.steak },
        ],
      },
      {
        name: 'Pizzas',
        products: [
          { name: 'Pizza personal de pepperoni', description: 'Masa delgada, salsa napolitana y pepperoni', price: 18000, image_url: null },
          { name: 'Pizza mediana hawaiana', description: 'Jamón, piña y doble queso mozzarella', price: 34000, image_url: null },
        ],
      },
      {
        name: 'Bebidas',
        products: [
          { name: 'Limonada de coco 16 oz', description: 'Jarra personal, bien fría', price: 9500, image_url: IMG.tomatoes },
          { name: 'Gaseosa personal', description: '400 ml, sabor a elección', price: 4500, image_url: null },
          { name: 'Jugo natural en agua', description: 'Mora, maracuyá o lulo', price: 7000, image_url: null },
        ],
      },
    ],
  },

  market: {
    label: 'Minimercado',
    categories: [
      {
        name: 'Canasta básica',
        products: [
          { name: 'Arroz 500 g', description: 'Grano largo', price: 3200, image_url: null },
          { name: 'Aceite girasol 1 L', description: 'Botella familiar', price: 12500, image_url: null },
          { name: 'Panela redonda', description: 'Media libra', price: 3000, image_url: null },
          { name: 'Huevos AA x 12', description: 'Cubeta de docena', price: 12000, image_url: null },
        ],
      },
      {
        name: 'Frutas y verduras',
        products: [
          { name: 'Plátano verde', description: 'Por unidad', price: 1500, image_url: null },
          { name: 'Tomate chonto libra', description: 'Fresco del día', price: 4000, image_url: IMG.tomatoes },
          { name: 'Papa pastusa libra', description: 'Seleccionada', price: 2800, image_url: null },
        ],
      },
      {
        name: 'Lácteos y bebidas',
        products: [
          { name: 'Leche entera 1 L', description: 'Larga vida', price: 4800, image_url: null },
          { name: 'Gaseosa 1.5 L', description: 'Familiar', price: 7500, image_url: null },
        ],
      },
    ],
  },

  pharmacy: {
    label: 'Farmacia',
    categories: [
      {
        name: 'Dolor y fiebre',
        products: [
          { name: 'Acetaminofén 500 mg x 10', description: 'Tabletas, venta libre', price: 3500, image_url: null },
          { name: 'Ibuprofeno 400 mg x 10', description: 'Tabletas, venta libre', price: 4500, image_url: null },
        ],
      },
      {
        name: 'Cuidado y primeros auxilios',
        products: [
          { name: 'Alcohol antiséptico 350 ml', description: 'Uso externo', price: 6500, image_url: null },
          { name: 'Suero oral', description: 'Sobre de rehidratación', price: 3800, image_url: null },
          { name: 'Curas adhesivas x 10', description: 'Surtidas', price: 4200, image_url: null },
        ],
      },
      {
        name: 'Cuidado personal',
        products: [
          { name: 'Tapabocas x 10', description: 'Tres capas', price: 5000, image_url: null },
          { name: 'Gel antibacterial 250 ml', description: 'Con glicerina', price: 8000, image_url: null },
        ],
      },
    ],
  },

  liquor: {
    label: 'Licorera',
    categories: [
      {
        name: 'Cervezas',
        products: [
          { name: 'Cerveza nacional lata', description: '330 ml, bien fría', price: 3500, image_url: null },
          { name: 'Six pack cerveza', description: '6 latas de 330 ml', price: 19000, image_url: null },
        ],
      },
      {
        name: 'Licores',
        products: [
          { name: 'Aguardiente media', description: '375 ml', price: 32000, image_url: null },
          { name: 'Ron media', description: '375 ml, añejo', price: 38000, image_url: null },
          { name: 'Whisky 750 ml', description: 'Etiqueta estándar', price: 95000, image_url: null },
        ],
      },
      {
        name: 'Acompañantes',
        products: [
          { name: 'Bolsa de hielo', description: '2 kg', price: 5000, image_url: null },
          { name: 'Gaseosa 1.5 L', description: 'Para mezclar', price: 7500, image_url: null },
        ],
      },
    ],
  },

  store: {
    label: 'Tienda de barrio',
    categories: [
      {
        name: 'Mecato',
        products: [
          { name: 'Papas fritas familiar', description: 'Bolsa grande', price: 6500, image_url: null },
          { name: 'Galletas surtidas', description: 'Paquete x 6', price: 4500, image_url: null },
          { name: 'Chocolatina', description: 'Barra individual', price: 2500, image_url: null },
        ],
      },
      {
        name: 'Bebidas',
        products: [
          { name: 'Agua 600 ml', description: 'Sin gas', price: 2500, image_url: null },
          { name: 'Bebida energizante', description: 'Lata 250 ml', price: 6000, image_url: null },
        ],
      },
      {
        name: 'Aseo',
        products: [
          { name: 'Jabón en barra', description: 'Para ropa', price: 3500, image_url: null },
          { name: 'Papel higiénico x 4', description: 'Doble hoja', price: 9500, image_url: null },
        ],
      },
    ],
  },
};

/** Cuántos productos trae el menú de una vertical */
export function starterSize(vertical) {
  const menu = STARTER_MENUS[vertical] ?? STARTER_MENUS.restaurant;
  return menu.categories.reduce((a, c) => a + c.products.length, 0);
}

/**
 * Carga el menú de ejemplo: crea las categorías y sus productos.
 *
 * No borra nada de lo que ya exista. Si el negocio ya empezó a armar
 * su carta, esto suma; nunca reemplaza.
 */
export async function loadStarterMenu(businessId, vertical) {
  const menu = STARTER_MENUS[vertical] ?? STARTER_MENUS.restaurant;

  if (!isLive()) {
    await new Promise((r) => setTimeout(r, 600));
    return menu.categories.flatMap((c, ci) => c.products.map((p, pi) => ({
      id: `demo-${ci}-${pi}`,
      ...p,
      is_available: true,
      sold: 0,
      category: { name: c.name },
    })));
  }

  const supabase = createClient();
  const created = [];

  for (let ci = 0; ci < menu.categories.length; ci += 1) {
    const cat = menu.categories[ci];

    const { data: category, error: catError } = await supabase
      .from('product_categories')
      .insert({ business_id: businessId, name: cat.name, sort_order: ci })
      .select()
      .single();
    if (catError) throw new Error(`No se pudo crear la categoría ${cat.name}: ${catError.message}`);

    const rows = cat.products.map((p, pi) => ({
      business_id: businessId,
      category_id: category.id,
      name: p.name,
      description: p.description,
      price: p.price,
      compare_price: p.compare_price ?? null,
      image_url: p.image_url,
      is_available: true,
      sort_order: pi,
    }));

    const { data: products, error: prodError } = await supabase
      .from('products')
      .insert(rows)
      .select();
    if (prodError) throw new Error(`No se pudieron crear los productos: ${prodError.message}`);

    created.push(...(products ?? []));
  }

  return created;
}
