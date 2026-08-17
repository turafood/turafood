'use client';

/**
 * TURAFOOD NEGOCIOS — CAPA DE ACCESO A DATOS
 *
 * Igual que en las otras apps: Supabase si hay credenciales, datos
 * locales si no. Cuando hay Supabase, el kanban además se suscribe
 * a Realtime para que los pedidos entren solos, sin recargar.
 */

import { createClient } from '@/utils/supabase/client';

export function isLive() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

/**
 * Columnas del kanban. Agrupan los estados del pedido tal como los
 * muestra el mockup: Nuevos / En preparación / Listos y en camino.
 */
export const KANBAN_COLUMNS = [
  {
    id: 'new',
    label: 'Nuevos',
    dot: 'var(--blue)',
    statuses: ['pending'],
    action: { label: 'Aceptar pedido', next: 'accepted', style: 'primary' },
    canReject: true,
  },
  {
    id: 'preparing',
    label: 'En preparación',
    dot: 'var(--amber)',
    statuses: ['accepted', 'preparing'],
    action: { label: 'Marcar listo', next: 'ready', style: 'green' },
    canReject: false,
  },
  {
    id: 'ready',
    label: 'Listos y en camino',
    dot: 'var(--green)',
    statuses: ['ready', 'courier_assigned', 'picked_up', 'delivering'],
    action: { label: 'Marcar entregado', next: 'delivered', style: 'dark' },
    canReject: false,
  },
];

/** Pedidos vivos del negocio (los que van en el kanban) */
export async function getLiveOrders(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_ORDERS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), customer:profiles!orders_customer_id_fkey(full_name, phone)')
    .eq('business_id', businessId)
    .in('status', [
      'pending', 'accepted', 'preparing', 'ready',
      'courier_assigned', 'picked_up', 'delivering',
    ])
    .order('created_at', { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
  return data ?? [];
}

/** Cambia el estado de un pedido. El servidor sella la hora. */
export async function updateOrderStatus(orderId, status, cancelReason = null) {
  if (!isLive()) {
    await delay(200);
    const order = LOCAL_ORDERS.find((o) => o.id === orderId);
    if (!order) throw new Error('Pedido no encontrado');
    order.status = status;
    if (cancelReason) order.cancel_reason = cancelReason;
    return order;
  }

  const supabase = createClient();
  const patch = { status };
  if (cancelReason) patch.cancel_reason = cancelReason;

  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo actualizar el pedido: ${error.message}`);
  return data;
}

/**
 * Escucha pedidos nuevos y cambios en tiempo real.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeToOrders(businessId, onChange) {
  if (!isLive()) return () => {};

  const supabase = createClient();
  const channel = supabase
    .channel(`business-orders:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/** Perfil del negocio de la sesión actual */
export async function getMyBusiness() {
  if (!isLive()) {
    await delay();
    return LOCAL_BUSINESS;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar tu negocio: ${error.message}`);
  return data;
}

/** Abrir / cerrar la tienda */
export async function setStoreOpen(businessId, isOpen) {
  if (!isLive()) {
    await delay(150);
    LOCAL_BUSINESS.is_open = isOpen;
    return LOCAL_BUSINESS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_profiles')
    .update({ is_open: isOpen })
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo cambiar el estado: ${error.message}`);
  return data;
}

/** Catálogo del negocio */
export async function getCatalog(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_PRODUCTS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(name)')
    .eq('business_id', businessId)
    .order('sort_order');

  if (error) throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  return data ?? [];
}

export async function setProductAvailability(productId, isAvailable) {
  if (!isLive()) {
    await delay(150);
    const p = LOCAL_PRODUCTS.find((x) => x.id === productId);
    if (p) p.is_available = isAvailable;
    return p;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .update({ is_available: isAvailable })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo actualizar el producto: ${error.message}`);
  return data;
}

/** Historial de pedidos cerrados */
export async function getHistory(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_HISTORY;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('business_id', businessId)
    .in('status', ['delivered', 'cancelled', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`No se pudo cargar el historial: ${error.message}`);
  return data ?? [];
}

// ============================================================
// DATOS LOCALES (espejo de seed.sql)
// ============================================================

const LOCAL_BUSINESS = {
  id: 'b0000000-0000-4000-8000-000000000001',
  name: 'Asadero El Puerto',
  category: 'Asados · Picadas · Criolla',
  vertical: 'restaurant',
  cover_url: '/images/steak-ribeye.jpg',
  address: 'Cra. 3 # 4-58, Centro',
  status: 'active',
  is_open: true,
  rating: 4.8,
  reviews_count: 1240,
  total_orders: 1240,
  prep_time_min: 28,
  commission_rate: 0.10,
  pro_plan: false,
  owner_name: 'Jhon Castillo',
};

const LOCAL_ORDERS = [
  {
    id: 'local-1042',
    order_number: 'TS-1042',
    status: 'pending',
    mode: 'delivery',
    payment_method: 'cash',
    payment_status: 'pending',
    customer: { full_name: 'María Camila Ortíz', phone: '3161234567' },
    delivery_address: 'Cl. 5 # 8-20, El Jorge',
    delivery_instructions: null,
    subtotal: 40000, delivery_fee: 0, service_fee: 2000, tip: 500, discount: 0, total: 42500,
    items: [
      { id: 'a1', name: 'Combo Hamburguesa Sencilla', quantity: 2, unit_price: 14000, subtotal: 28000, notes: 'Sin cebolla y extra salsa de ajo por favor.' },
      { id: 'a2', name: 'Gaseosa Manzana Postobón 400ml', quantity: 1, unit_price: 4000, subtotal: 4000, notes: null },
    ],
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'local-1043',
    order_number: 'TS-1043',
    status: 'pending',
    mode: 'pickup',
    payment_method: 'card',
    payment_status: 'paid',
    customer: { full_name: 'Andrés López', phone: '3169876543' },
    delivery_address: null,
    subtotal: 35000, delivery_fee: 0, service_fee: 1750, tip: 0, discount: 0, total: 36750,
    items: [
      { id: 'a3', name: 'Pizza Pepperoni Mediana', quantity: 1, unit_price: 35000, subtotal: 35000, notes: null },
    ],
    created_at: new Date(Date.now() - 20000).toISOString(),
  },
  {
    id: 'local-1041',
    order_number: 'TS-1041',
    status: 'preparing',
    mode: 'delivery',
    payment_method: 'nequi',
    payment_status: 'paid',
    customer: { full_name: 'Juan David Pérez', phone: '3165550011' },
    delivery_address: 'Cra. 9 # 12-40, Pueblo Nuevo',
    subtotal: 64000, delivery_fee: 0, service_fee: 3200, tip: 800, discount: 0, total: 68000,
    items: [
      { id: 'a4', name: 'Arroz Paisa Especial', quantity: 1, unit_price: 38000, subtotal: 38000, notes: null },
      { id: 'a5', name: 'Limonada Natural', quantity: 2, unit_price: 13000, subtotal: 26000, notes: null },
    ],
    created_at: new Date(Date.now() - 14 * 60000).toISOString(),
  },
];

const LOCAL_PRODUCTS = [
  { id: '40000000-0000-4000-8000-000000000001', name: 'Picada Pacífico para 2', description: 'Chorizo, chicharrón, carne asada, papa criolla y patacón.', price: 48900, compare_price: 62000, image_url: '/images/steak-ribeye.jpg', is_available: true, category: { name: 'Recomendados' } },
  { id: '40000000-0000-4000-8000-000000000002', name: 'Churrasco 350 g', description: 'Con papas a la francesa, ensalada y salsa de la casa.', price: 41000, compare_price: null, image_url: '/images/steak-rustic.jpg', is_available: true, category: { name: 'Recomendados' } },
  { id: '40000000-0000-4000-8000-000000000003', name: 'Costilla BBQ', description: 'Media costilla en salsa BBQ con yuca frita.', price: 36500, compare_price: 44000, image_url: '/images/lamb-chops.jpg', is_available: true, category: { name: 'Recomendados' } },
  { id: '40000000-0000-4000-8000-000000000004', name: 'Arroz atollado valluno', description: 'Cerdo, pollo, longaniza y papa criolla.', price: 26900, compare_price: null, image_url: '/images/fried-steak.jpg', is_available: true, category: { name: 'Criolla' } },
  { id: '40000000-0000-4000-8000-000000000005', name: 'Encocado de jaiba', description: 'Preparado con leche de coco y arroz blanco.', price: 34500, compare_price: null, image_url: '/images/food-fork.jpg', is_available: false, category: { name: 'Criolla' } },
  { id: '40000000-0000-4000-8000-000000000006', name: 'Limonada de coco 16 oz', description: 'Jarra personal, bien fría.', price: 9500, compare_price: null, image_url: '/images/beef-tomatoes.jpg', is_available: true, category: { name: 'Bebidas' } },
  { id: '40000000-0000-4000-8000-000000000008', name: 'Cocadas del puerto', description: 'Paquete x6, hechas el mismo día.', price: 12000, compare_price: null, image_url: '/images/steak-rustic.jpg', is_available: true, category: { name: 'Postres' } },
];

const LOCAL_HISTORY = [
  { id: 'h1', order_number: 'TS-1038', status: 'delivered', mode: 'delivery', total: 54200, payment_method: 'nequi', created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), items: [{ id: 'x1', name: 'Picada Pacífico para 2', quantity: 1 }] },
  { id: 'h2', order_number: 'TS-1037', status: 'delivered', mode: 'pickup', total: 36500, payment_method: 'cash', created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), items: [{ id: 'x2', name: 'Costilla BBQ', quantity: 1 }] },
  { id: 'h3', order_number: 'TS-1036', status: 'cancelled', mode: 'delivery', total: 28900, payment_method: 'card', created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), items: [{ id: 'x3', name: 'Arroz atollado valluno', quantity: 1 }] },
  { id: 'h4', order_number: 'TS-1035', status: 'delivered', mode: 'delivery', total: 71300, payment_method: 'nequi', created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(), items: [{ id: 'x4', name: 'Churrasco 350 g', quantity: 1 }, { id: 'x5', name: 'Limonada de coco 16 oz', quantity: 2 }] },
];
