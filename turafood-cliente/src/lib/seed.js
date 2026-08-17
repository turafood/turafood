/**
 * TURAFOOD — Datos locales de desarrollo
 *
 * Espejo exacto de `turafood-supabase/supabase/seed.sql`, con la misma
 * forma que devuelve Supabase (mismos nombres de columna, mismos ids).
 * Sirve para que las pantallas se vean y funcionen antes de conectar
 * la base de datos; al conectarla, `data.js` deja de usar este archivo
 * y nada más cambia.
 *
 * Los valores (nombres, precios, ratings, tiempos) vienen del mockup
 * "TuraFood - Cliente.dc.html" — no inventar datos nuevos aquí.
 */

export const BUENAVENTURA = {
  store: { lat: 3.88425, lng: -77.02905 },
  home: { lat: 3.87008, lng: -77.05412 },
  courier: { lat: 3.87755, lng: -77.04010 },
  // Ruta real usada por el tracking del mockup
  route: [
    [3.88425, -77.02905],
    [3.88190, -77.03340],
    [3.87960, -77.03680],
    [3.87755, -77.04010],
    [3.87480, -77.04520],
    [3.87190, -77.05010],
    [3.87008, -77.05412],
  ],
};

export const BUSINESSES = [
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    name: 'Asadero El Puerto',
    slug: 'asadero-el-puerto',
    category: 'Asados · Picadas · Criolla',
    vertical: 'restaurant',
    cover_url: '/images/steak-ribeye.jpg',
    address: 'Cra. 3 # 4-58, Centro',
    lat: 3.88425, lng: -77.02905,
    phone: '3161110001',
    status: 'active',
    is_open: true,
    rating: 4.8,
    reviews_count: 1240,
    prep_time_min: 28,
    delivery_fee: 0,
    min_order: 0,
    badge: 'Turbo',
    offer_label: '2x1 en picadas',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    name: 'Burger House Bahía',
    slug: 'burger-house-bahia',
    category: 'Hamburguesas · Alitas',
    vertical: 'restaurant',
    cover_url: '/images/burger.jpg',
    address: 'Cl. 2 # 3-21, Centro',
    lat: 3.88190, lng: -77.03340,
    phone: '3161110002',
    status: 'active',
    is_open: true,
    rating: 4.6,
    reviews_count: 860,
    prep_time_min: 22,
    delivery_fee: 3500,
    min_order: 0,
    badge: 'Turbo',
    offer_label: 'Hasta 40% off',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000003',
    name: 'Marisquería El Faro',
    slug: 'marisqueria-el-faro',
    category: 'Mariscos · Encocados',
    vertical: 'restaurant',
    cover_url: '/images/food-fork.jpg',
    address: 'Cra. 1 # 7-12, La Playita',
    lat: 3.87960, lng: -77.03680,
    phone: '3161110003',
    status: 'active',
    is_open: true,
    rating: 4.9,
    reviews_count: 2105,
    prep_time_min: 35,
    delivery_fee: 4900,
    min_order: 0,
    badge: 'Top',
    offer_label: 'Envío gratis hoy',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000004',
    name: 'Parrilla Punta del Este',
    slug: 'parrilla-punta-del-este',
    category: 'Parrilla · Costillas',
    vertical: 'restaurant',
    cover_url: '/images/lamb-chops.jpg',
    address: 'Cl. 8 # 52-14, Punta del Este',
    lat: 3.87480, lng: -77.04520,
    phone: '3161110004',
    status: 'active',
    is_open: true,
    rating: 4.7,
    reviews_count: 540,
    prep_time_min: 30,
    delivery_fee: 3900,
    min_order: 0,
    badge: 'Nuevo',
    offer_label: '15% off',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000005',
    name: 'Cevichería Doña Rosa',
    slug: 'cevicheria-dona-rosa',
    category: 'Ceviches · Cocteles',
    vertical: 'restaurant',
    cover_url: '/images/beef-tomatoes.jpg',
    address: 'Cra. 5 # 2-40, Pueblo Nuevo',
    lat: 3.87190, lng: -77.05010,
    phone: '3161110005',
    status: 'active',
    is_open: true,
    rating: 4.5,
    reviews_count: 320,
    prep_time_min: 25,
    delivery_fee: 2900,
    min_order: 0,
    badge: 'Turbo',
    offer_label: null,
  },
  {
    id: 'b0000000-0000-4000-8000-000000000006',
    name: 'Picadas El Jorge',
    slug: 'picadas-el-jorge',
    category: 'Picadas · Fritos',
    vertical: 'restaurant',
    cover_url: '/images/fried-steak.jpg',
    address: 'Cl. 6 # 4-09, El Jorge',
    lat: 3.87755, lng: -77.04010,
    phone: '3161110006',
    status: 'active',
    is_open: true,
    rating: 4.4,
    reviews_count: 210,
    prep_time_min: 20,
    delivery_fee: 0,
    min_order: 0,
    badge: 'Turbo',
    offer_label: '1 oferta',
  },
];

const PUERTO = BUSINESSES[0].id;

export const CATEGORIES = [
  { id: 'ca000000-0000-4000-8000-000000000001', business_id: PUERTO, name: 'Recomendados', sort_order: 0 },
  { id: 'ca000000-0000-4000-8000-000000000002', business_id: PUERTO, name: 'Criolla', sort_order: 1 },
  { id: 'ca000000-0000-4000-8000-000000000003', business_id: PUERTO, name: 'Bebidas', sort_order: 2 },
  { id: 'ca000000-0000-4000-8000-000000000004', business_id: PUERTO, name: 'Postres', sort_order: 3 },
];

export const PRODUCTS = [
  {
    id: '40000000-0000-4000-8000-000000000001', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000001',
    name: 'Picada Pacífico para 2',
    description: 'Chorizo, chicharrón, carne asada, papa criolla y patacón.',
    price: 48900, compare_price: 62000, image_url: '/images/steak-ribeye.jpg',
    is_available: true, sort_order: 0,
  },
  {
    id: '40000000-0000-4000-8000-000000000002', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000001',
    name: 'Churrasco 350 g',
    description: 'Con papas a la francesa, ensalada y salsa de la casa.',
    price: 41000, compare_price: null, image_url: '/images/steak-rustic.jpg',
    is_available: true, sort_order: 1,
  },
  {
    id: '40000000-0000-4000-8000-000000000003', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000001',
    name: 'Costilla BBQ',
    description: 'Media costilla en salsa BBQ con yuca frita.',
    price: 36500, compare_price: 44000, image_url: '/images/lamb-chops.jpg',
    is_available: true, sort_order: 2,
  },
  {
    id: '40000000-0000-4000-8000-000000000004', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000002',
    name: 'Arroz atollado valluno',
    description: 'Cerdo, pollo, longaniza y papa criolla.',
    price: 26900, compare_price: null, image_url: '/images/fried-steak.jpg',
    is_available: true, sort_order: 0,
  },
  {
    id: '40000000-0000-4000-8000-000000000005', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000002',
    name: 'Encocado de jaiba',
    description: 'Preparado con leche de coco y arroz blanco.',
    price: 34500, compare_price: null, image_url: '/images/food-fork.jpg',
    is_available: true, sort_order: 1,
  },
  {
    id: '40000000-0000-4000-8000-000000000006', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000003',
    name: 'Limonada de coco 16 oz',
    description: 'Jarra personal, bien fría.',
    price: 9500, compare_price: null, image_url: '/images/beef-tomatoes.jpg',
    is_available: true, sort_order: 0,
  },
  {
    id: '40000000-0000-4000-8000-000000000007', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000003',
    name: 'Jugo de borojó',
    description: 'En agua o leche.',
    price: 8500, compare_price: null, image_url: '/images/beef-tomatoes.jpg',
    is_available: true, sort_order: 1,
  },
  {
    id: '40000000-0000-4000-8000-000000000008', business_id: PUERTO,
    category_id: 'ca000000-0000-4000-8000-000000000004',
    name: 'Cocadas del puerto',
    description: 'Paquete x6, hechas el mismo día.',
    price: 12000, compare_price: null, image_url: '/images/steak-rustic.jpg',
    is_available: true, sort_order: 0,
  },

  // Catálogo mínimo del resto de negocios
  { id: '40000000-0000-4000-8000-000000000011', business_id: BUSINESSES[1].id, category_id: null, name: 'Combo Doble Bahía', description: 'Hamburguesa doble, papas y gaseosa.', price: 29900, compare_price: null, image_url: '/images/burger.jpg', is_available: true, sort_order: 0 },
  { id: '40000000-0000-4000-8000-000000000012', business_id: BUSINESSES[1].id, category_id: null, name: 'Alitas BBQ x8', description: 'Con salsa de la casa y limón.', price: 24500, compare_price: null, image_url: '/images/fried-steak.jpg', is_available: true, sort_order: 1 },
  { id: '40000000-0000-4000-8000-000000000013', business_id: BUSINESSES[2].id, category_id: null, name: 'Encocado de jaiba', description: 'Con arroz de coco y patacón.', price: 34500, compare_price: null, image_url: '/images/food-fork.jpg', is_available: true, sort_order: 0 },
  { id: '40000000-0000-4000-8000-000000000014', business_id: BUSINESSES[2].id, category_id: null, name: 'Sancocho de pescado', description: 'Con hierbas de azotea.', price: 28000, compare_price: null, image_url: '/images/beef-tomatoes.jpg', is_available: true, sort_order: 1 },
  { id: '40000000-0000-4000-8000-000000000015', business_id: BUSINESSES[3].id, category_id: null, name: 'Costillas a la parrilla', description: 'Media costilla con yuca.', price: 38000, compare_price: null, image_url: '/images/lamb-chops.jpg', is_available: true, sort_order: 0 },
  { id: '40000000-0000-4000-8000-000000000016', business_id: BUSINESSES[4].id, category_id: null, name: 'Ceviche mixto', description: 'Camarón, pescado y pulpo.', price: 32000, compare_price: null, image_url: '/images/beef-tomatoes.jpg', is_available: true, sort_order: 0 },
  { id: '40000000-0000-4000-8000-000000000017', business_id: BUSINESSES[5].id, category_id: null, name: 'Picada El Jorge', description: 'Para compartir entre 2.', price: 27000, compare_price: null, image_url: '/images/fried-steak.jpg', is_available: true, sort_order: 0 },
];

/**
 * Opciones de producto — valores exactos de la pantalla de producto
 * del mockup: tamaño obligatorio (Personal incluido) y hasta 3
 * acompañamientos.
 */
export const EXTRAS = [
  { id: 'e0000000-0000-4000-8000-000000000001', product_id: PRODUCTS[0].id, group_name: 'Tamaño', name: 'Personal', price_delta: 0, is_required: true, max_select: 1, sort_order: 0 },
  { id: 'e0000000-0000-4000-8000-000000000002', product_id: PRODUCTS[0].id, group_name: 'Tamaño', name: 'Para 2', price_delta: 12000, is_required: true, max_select: 1, sort_order: 1 },
  { id: 'e0000000-0000-4000-8000-000000000003', product_id: PRODUCTS[0].id, group_name: 'Tamaño', name: 'Familiar (para 4)', price_delta: 26000, is_required: true, max_select: 1, sort_order: 2 },
  { id: 'e0000000-0000-4000-8000-000000000004', product_id: PRODUCTS[0].id, group_name: 'Extras', name: 'Patacón extra', price_delta: 4500, is_required: false, max_select: 3, sort_order: 0 },
  { id: 'e0000000-0000-4000-8000-000000000005', product_id: PRODUCTS[0].id, group_name: 'Extras', name: 'Papa criolla', price_delta: 5000, is_required: false, max_select: 3, sort_order: 1 },
  { id: 'e0000000-0000-4000-8000-000000000006', product_id: PRODUCTS[0].id, group_name: 'Extras', name: 'Ensalada de la casa', price_delta: 6500, is_required: false, max_select: 3, sort_order: 2 },
  { id: 'e0000000-0000-4000-8000-000000000007', product_id: PRODUCTS[0].id, group_name: 'Extras', name: 'Ají casero', price_delta: 1500, is_required: false, max_select: 3, sort_order: 3 },
];

/**
 * Tarifas fijas que muestra el diseño en carrito y checkout:
 * Envío $3.900 y Tarifa de servicio $1.900 (no es un porcentaje).
 */
export const FEES = {
  delivery: 3900,
  service: 1900,
};

export const ADDRESSES = [
  {
    id: 'ad000000-0000-4000-8000-000000000001',
    label: 'Casa',
    address: 'Cra. 3 # 4-58, Centro',
    detail: 'Torre B, apto 402',
    neighborhood: 'Centro',
    lat: 3.87008, lng: -77.05412,
    is_default: true,
  },
  {
    id: 'ad000000-0000-4000-8000-000000000002',
    label: 'Trabajo',
    address: 'Cl. 8 # 52-14, Punta del Este',
    detail: 'Oficina 201',
    neighborhood: 'Punta del Este',
    lat: 3.88425, lng: -77.02905,
    is_default: false,
  },
];

export const COUPONS = [
  { code: 'TURA20', description: '20% de descuento en tu pedido', discount_type: 'percent', discount_value: 20, max_discount: 20000, min_order: 20000, is_active: true },
  { code: 'ENVIOGRATIS', description: 'Envío gratis en tu próximo pedido', discount_type: 'free_delivery', discount_value: 0, max_discount: null, min_order: 15000, is_active: true },
  { code: 'BIENVENIDO', description: '$10.000 de descuento la primera vez', discount_type: 'fixed', discount_value: 10000, max_discount: null, min_order: 25000, is_active: true },
];

/**
 * Verticales del inicio en ESCRITORIO — el mockup usa emoji, no imagen,
 * y estos colores exactos (`isDeskHome`, línea 2351 del .dc.html).
 */
export const DESK_VERTICALS = [
  { id: 'restaurant', label: 'Restaurantes', hint: 'Comida lista, caliente', emoji: '🍔', bg: '#FFF1EC', fg: '#B32A0D', go: 'rest' },
  { id: 'market', label: 'Mercado', hint: 'Frutas, verduras, granos', emoji: '🛒', bg: '#E7F6EE', fg: '#0B6E44', go: 'market' },
  { id: 'pharmacy', label: 'Farmacia', hint: 'Medicamentos y cuidado', emoji: '💊', bg: '#EAF1FF', fg: '#1E4FBF', go: 'rest' },
  { id: 'liquor', label: 'Licores', hint: 'Cerveza, ron, mezcladores', emoji: '🍾', bg: '#F5EFE3', fg: '#7A5A16', go: 'rest' },
];

/**
 * Tira horizontal de verticales en MÓVIL. Son seis y no coinciden con
 * las de escritorio: el mockup lista Farmacia, Turbo, Tiendas, Licores,
 * SOAT y Viajes (línea 2223 del .dc.html).
 */
// Restaurantes y Mercado NO van aquí: ya tienen sus dos tarjetas
// grandes arriba. Repetirlos le quitaba espacio a las verticales que
// solo se pueden alcanzar desde esta tira.
export const STRIP_VERTICALS = [
  { id: 'pharmacy', label: 'Farmacia', img: '/images/ic-farmacia.png' },
  { id: 'liquor', label: 'Licores', img: '/images/ic-licores.png' },
  // TurApp: la app de transporte (tipo Uber). Vive en su propio
  // dominio, así que esta tarjeta sale de la app en vez de navegar.
  { id: 'turapp', label: 'TurApp', img: '/images/ic-viajes.png', badge: 'NUEVO', external: 'https://turapp.co' },
  { id: 'turbo', label: 'Turbo', img: '/images/ic-turbo.png' },
  { id: 'store', label: 'Tiendas', img: '/images/ic-tiendas.png' },
  { id: 'soat', label: 'SOAT', img: '/images/ic-soat.png' },
];

/**
 * Playas y destinos que sirve la vertical de lanchas.
 * Se usará en la pantalla de reserva (selección de destino → lancha →
 * pago → ticket), que está pendiente de construir.
 */
export const BEACHES = [
  { id: 'juanchaco', name: 'Juanchaco', eta_min: 45, from_price: 65000 },
  { id: 'ladrilleros', name: 'Ladrilleros', eta_min: 50, from_price: 70000 },
  { id: 'la-barra', name: 'La Barra', eta_min: 60, from_price: 80000 },
  { id: 'pianguita', name: 'Pianguita', eta_min: 25, from_price: 35000 },
  { id: 'la-bocana', name: 'La Bocana', eta_min: 20, from_price: 30000 },
  { id: 'san-cipriano', name: 'San Cipriano', eta_min: 75, from_price: 90000 },
];

/** Banners del inicio — copy y gradientes literales del mockup */
export const HOME_BANNERS = [
  { tag: 'SOLO HOY', title: 'Envío gratis en tu primer pedido', code: 'TURA15', bg: 'linear-gradient(135deg,#FF7A3D,#E2360F)', codeFg: '#E2360F' },
  { tag: 'MERCADO', title: '20% off en frutas y verduras', code: 'MERCA20', bg: 'linear-gradient(135deg,#2ECB84,#0B8E54)', codeFg: '#0B7A48' },
  { tag: 'TURA PLUS', title: 'Envíos ilimitados por $16.900', code: 'VER PLAN', bg: 'linear-gradient(135deg,#3A332A,#17140F)', codeFg: '#17140F' },
];

/** "Promos irresistibles" — los tres del mockup, con sus precios exactos */
export const HOME_PROMOS = [
  { id: '40000000-0000-4000-8000-000000000001', price: 48900, was: 62000, off: '-21%', name: 'Picada Pacífico para 2', eta: '28 min', store: 'El Puerto', image_url: '/images/steak-ribeye.jpg' },
  { id: '40000000-0000-4000-8000-000000000011', price: 19900, was: 31000, off: '-36%', name: 'Combo hamburguesa doble', eta: '22 min', store: 'Bahía', image_url: '/images/burger.jpg' },
  { id: '40000000-0000-4000-8000-000000000013', price: 34500, was: 42000, off: '-18%', name: 'Encocado de jaiba', eta: '35 min', store: 'El Faro', image_url: '/images/food-fork.jpg' },
];

/**
 * TURA IA — copy por pantalla.
 * Sale literal del mockup (`AI_HELLO`, `AI_CTX` y `AI_CHIPS`, línea
 * ~1900 del .dc.html). La gracia es que la IA sabe dónde está el
 * usuario: el saludo y las sugerencias cambian según la pantalla.
 */
export const AI_CONTEXT = {
  home: {
    ctx: 'Sabe qué pediste antes y qué hay abierto',
    hello: 'Hola. Hoy hay 12 sitios abiertos cerca de ti y tienes un cupón sin usar. ¿Te ayudo a decidir qué pedir?',
    chips: [
      { icon: 'savings', label: '¿Qué pido con $30.000?' },
      { icon: 'bolt', label: 'Lo más rápido' },
      { icon: 'replay', label: 'Repetir mi último pedido' },
    ],
  },
  list: {
    ctx: 'Filtra por antojo, precio y tiempo',
    hello: 'Estás viendo sitios cerca. Dime tu antojo o tu presupuesto y te dejo solo lo que vale la pena.',
    chips: [
      { icon: 'bolt', label: 'Lo más rápido' },
      { icon: 'savings', label: 'Algo barato y bueno' },
      { icon: 'eco', label: 'Opciones sin carne' },
    ],
  },
  store: {
    ctx: 'Conoce este menú',
    hello: 'Este es de los sitios mejor calificados de tu zona. Puedo contarte qué piden más o armar algo para dos.',
    chips: [
      { icon: 'trending_up', label: '¿Qué es lo que más piden?' },
      { icon: 'group', label: 'Arma algo para dos' },
    ],
  },
  product: {
    ctx: 'Te ayuda a armar el plato',
    hello: '¿Te ayudo con los acompañamientos? Puedo decirte cuáles combinan mejor.',
    chips: [
      { icon: 'restaurant', label: '¿Con qué combina?' },
      { icon: 'group', label: '¿Alcanza para dos?' },
    ],
  },
  cart: {
    ctx: 'Revisa tu canasta y busca ahorros',
    hello: 'Revisé tu canasta. Con el cupón TURA20 podrías ahorrar. ¿Lo aplico?',
    chips: [
      { icon: 'sell', label: '¿Hay un cupón mejor?' },
      { icon: 'receipt_long', label: '¿Cuánto es el total con envío?' },
    ],
  },
  checkout: {
    ctx: 'Verifica pago, dirección y cupones',
    hello: 'Todo listo para confirmar. Verifiqué tu dirección y el pago. Si quieres, busco un cupón mejor antes de pagar.',
    chips: [
      { icon: 'sell', label: 'Buscar cupón' },
      { icon: 'schedule', label: '¿Cuándo llega?' },
    ],
  },
  tracking: {
    ctx: 'Sigue tu pedido en vivo',
    hello: 'Tu pedido va en camino con Yeison. Puedo avisarte cuando esté a menos de 5 minutos.',
    chips: [
      { icon: 'near_me', label: '¿Dónde va mi pedido?' },
      { icon: 'notifications', label: 'Avísame cuando esté cerca' },
    ],
  },
  offers: {
    ctx: 'Ordena las promos por ahorro real',
    hello: 'Hay promociones que sirven con lo que sueles pedir. Te las ordeno por lo que más te ahorra.',
    chips: [{ icon: 'savings', label: '¿Cuál promoción me ahorra más?' }],
  },
  favorites: {
    ctx: 'Sabe cuáles están abiertos',
    hello: 'Tienes 3 favoritos. Dos están abiertos ahora mismo. ¿Repetimos alguno?',
    chips: [{ icon: 'storefront', label: '¿Cuáles de mis favoritos están abiertos?' }],
  },
  account: {
    ctx: 'Resuelve temas de tu cuenta',
    hello: 'Puedo ayudarte con tu cuenta: direcciones, métodos de pago, facturas o tu plan Tura Plus.',
    chips: [{ icon: 'workspace_premium', label: '¿Me sirve Tura Plus?' }],
  },
  orders: {
    ctx: 'Repite pedidos y gestiona facturas',
    hello: 'Aquí está tu historial. Puedo repetir un pedido, pedir factura o reportar un problema.',
    chips: [{ icon: 'replay', label: 'Repetir mi último pedido' }],
  },
};

/** Orden y filtros de la pantalla de listado */
export const SORTS = [
  { id: 'recommended', label: 'Recomendado', hint: 'Nuestra mezcla de cercanía y calificación', icon: 'auto_awesome' },
  { id: 'fastest', label: 'Más rápido', hint: 'Menor tiempo de entrega estimado', icon: 'bolt' },
  { id: 'rating', label: 'Mejor calificado', hint: 'De 5 a 1 estrella', icon: 'star' },
  { id: 'cheapest', label: 'Envío más barato', hint: 'Empezando por los envíos gratis', icon: 'payments' },
  { id: 'closest', label: 'Más cerca', hint: 'Por distancia desde tu dirección', icon: 'near_me' },
];

export const FILTERS = [
  { id: 'free_ship', label: 'Envío gratis', hint: 'Sin costo de domicilio', icon: 'local_shipping' },
  { id: 'turbo', label: 'Turbo', hint: 'Entrega en menos de 30 minutos', icon: 'bolt' },
  { id: 'rating45', label: '4,5+', hint: 'Solo sitios muy bien calificados', icon: 'star' },
  { id: 'promo', label: 'Con promo', hint: 'Tienen alguna oferta activa', icon: 'sell' },
];
