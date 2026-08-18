'use client';

/**
 * CAPA DE DATOS DEL REPARTIDOR
 *
 * Mismo interruptor que el resto: Supabase si hay credenciales, datos
 * del mockup si no.
 *
 * Lo importante de este módulo: ninguna función se autoasigna un pedido
 * ni marca una entrega escribiendo la tabla directo. Todo pasa por los
 * RPC `accept_order`, `courier_advance_order` y `complete_delivery`,
 * que validan en el servidor. Así dos repartidores no pueden quedarse
 * con el mismo pedido ni cerrar una entrega sin el código del cliente.
 */

import { createClient } from '@/utils/supabase/client';

export function isLive() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

/** Estados en los que un pedido está en manos del repartidor */
export const ACTIVE_STATUSES = ['courier_assigned', 'picked_up', 'delivering'];

/** Los tres pasos de una entrega — STEPS del mockup, línea 901 */
export const STEPS = [
  { tag: 'PASO 1 DE 3', title: 'Ve al negocio', btn: 'Llegué al negocio', icon: 'storefront', status: 'courier_assigned' },
  { tag: 'PASO 2 DE 3', title: 'Recoge el pedido', btn: 'Recogí el pedido', icon: 'shopping_bag', status: 'picked_up' },
  { tag: 'PASO 3 DE 3', title: 'Entrega al cliente', btn: 'Entregar pedido', icon: 'check_circle', status: 'delivering' },
];

export const stepIndex = (status) => Math.max(0, ACTIVE_STATUSES.indexOf(status));

/** Los 4 dígitos que el cliente lee de su número de pedido */
export const deliveryCode = (orderNumber) =>
  String(orderNumber ?? '').replace(/\D/g, '').slice(-4);

// ============================================================
// PERFIL
// ============================================================

export async function getMyCourier() {
  if (!isLive()) {
    await delay();
    return LOCAL_COURIER;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('courier_profiles')
    .select('*, profile:profiles!courier_profiles_id_fkey(full_name, phone, rating)')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar tu perfil: ${error.message}`);
  return data;
}

/** Conectarse o desconectarse */
export async function setCourierStatus(courierId, status) {
  if (!isLive()) {
    await delay(150);
    LOCAL_COURIER.status = status;
    return LOCAL_COURIER;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('courier_profiles')
    .update({ status })
    .eq('id', courierId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo cambiar tu estado: ${error.message}`);
  return data;
}

/**
 * Reporta dónde estás. Un trigger copia el punto a `courier_profiles`,
 * que es lo que el cliente ve moverse en su seguimiento.
 */
export async function pushLocation(courierId, { lat, lng, heading, speed }) {
  if (!isLive()) return null;

  const supabase = createClient();
  const { error } = await supabase.from('courier_locations').insert({
    courier_id: courierId,
    location: `SRID=4326;POINT(${lng} ${lat})`,
    heading: heading ?? null,
    speed: speed ?? null,
  });

  // Perder una posición no debe romper la pantalla
  if (error) return null;
  return true;
}

// ============================================================
// PEDIDOS DISPONIBLES
// ============================================================

/**
 * Bolsa de pedidos: los que ya aceptó el negocio, van a domicilio y
 * todavía no tiene repartidor. La política RLS solo los muestra si
 * estás aprobado y en línea.
 */
export async function getAvailableOrders() {
  if (!isLive()) {
    await delay();
    return LOCAL_OFFERS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), business:business_profiles(name, address, cover_url)')
    .is('courier_id', null)
    .eq('mode', 'delivery')
    .in('status', ['accepted', 'preparing', 'ready'])
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
  return data ?? [];
}

/** Toma un pedido. Si otro se adelantó, la base devuelve el error. */
export async function acceptOrder(orderId) {
  if (!isLive()) {
    await delay(250);
    const order = LOCAL_OFFERS.find((o) => o.id === orderId);
    if (order) {
      order.status = 'courier_assigned';
      LOCAL_ACTIVE.current = order;
    }
    return order;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('accept_order', { p_order_id: orderId });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/** Escucha pedidos nuevos en la bolsa */
export function subscribeToAvailable(onChange) {
  if (!isLive()) return () => {};

  const supabase = createClient();
    // Nombre único por suscripción: si dos montajes piden el mismo
  // nombre, Supabase devuelve el canal que ya está suscrito y
  // agregarle un callback revienta.
  const nombre = 'courier-pool' + '|' + Math.random().toString(36).slice(2);

  const channel = supabase
    .channel(nombre)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ============================================================
// ENTREGA EN CURSO
// ============================================================

export async function getActiveOrder(courierId) {
  if (!isLive()) {
    await delay();
    return LOCAL_ACTIVE.current;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, items:order_items(*), business:business_profiles(name, address, phone), customer:profiles!orders_customer_id_fkey(full_name, phone)')
    .eq('courier_id', courierId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar tu entrega: ${error.message}`);
  return data;
}

export async function advanceDelivery(orderId, status) {
  if (!isLive()) {
    await delay(200);
    if (LOCAL_ACTIVE.current) LOCAL_ACTIVE.current.status = status;
    return LOCAL_ACTIVE.current;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('courier_advance_order', {
    p_order_id: orderId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/** Cierra la entrega. El código lo valida el servidor, no la pantalla. */
export async function completeDelivery(orderId, code) {
  if (!isLive()) {
    await delay(250);
    const order = LOCAL_ACTIVE.current;
    if (!order) throw new Error('No tienes una entrega en curso');
    if (code !== deliveryCode(order.order_number)) throw new Error('Código incorrecto');
    order.status = 'delivered';
    LOCAL_ACTIVE.current = null;
    return order;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('complete_delivery', {
    p_order_id: orderId,
    p_code: code,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

// ============================================================
// HISTORIAL Y GANANCIAS
// ============================================================

export async function getDeliveries(courierId, limit = 60) {
  if (!isLive()) {
    await delay();
    return LOCAL_DELIVERIES;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, total, tip, courier_earnings, delivered_at, created_at, delivery_address, business:business_profiles(name, cover_url)')
    .eq('courier_id', courierId)
    .eq('status', 'delivered')
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`No se pudieron cargar tus entregas: ${error.message}`);
  return data ?? [];
}

/** Agrupa las entregas por día para la gráfica de ganancias */
export function earningsByDay(deliveries, days = 7) {
  const buckets = new Map();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { date: d, total: 0, count: 0, tips: 0 });
  }

  deliveries.forEach((o) => {
    const key = String(o.delivered_at ?? o.created_at).slice(0, 10);
    const b = buckets.get(key);
    if (!b) return;
    b.total += Number(o.courier_earnings ?? 0);
    b.tips += Number(o.tip ?? 0);
    b.count += 1;
  });

  return Array.from(buckets.values());
}

// ============================================================
// CHAT CON EL CLIENTE
// ============================================================

export async function getMessages(orderId) {
  if (!isLive()) {
    await delay();
    return LOCAL_MESSAGES;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at');

  if (error) throw new Error(`No se pudo abrir el chat: ${error.message}`);
  return data ?? [];
}

export async function sendMessage(orderId, body) {
  if (!isLive()) {
    await delay(150);
    const msg = { id: `m${Date.now()}`, order_id: orderId, sender_id: 'me', body, created_at: new Date().toISOString() };
    LOCAL_MESSAGES.push(msg);
    return msg;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: user.id, body })
    .select()
    .single();

  if (error) throw new Error(`No se pudo enviar el mensaje: ${error.message}`);
  return data;
}

export function subscribeToMessages(orderId, onNew) {
  if (!isLive()) return () => {};

  const supabase = createClient();
    // Nombre único por suscripción: si dos montajes piden el mismo
  // nombre, Supabase devuelve el canal que ya está suscrito y
  // agregarle un callback revienta.
  const nombre = `order-chat:${orderId}` + '|' + Math.random().toString(36).slice(2);

  const channel = supabase
    .channel(nombre)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      (payload) => onNew(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ============================================================
// DATOS LOCALES — del mockup del Repartidor
// ============================================================

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const LOCAL_COURIER = {
  id: 'local-courier',
  status: 'online',
  approval_status: 'active',
  vehicle_type: 'motorcycle',
  plate: 'WQR-18C',
  acceptance_rate: 92,
  total_deliveries: 1284,
  total_earnings: 84300,
  pro_plan: false,
  profile: { full_name: 'Yeison Mosquera', phone: '3137594713', rating: 4.9 },
};

/** Ofertas del mockup (OFFERS, línea 874) con la forma de `orders` */
const LOCAL_OFFERS = [
  {
    id: 'o1', order_number: 'TS-4821', status: 'ready', mode: 'delivery',
    payment_method: 'nequi', payment_status: 'paid',
    total: 78300, tip: 2500, courier_earnings: 9400,
    delivery_address: 'Cl. 8 # 52-14, Punta del Este', delivery_instructions: null,
    created_at: ago(2),
    business: { name: 'Asadero El Puerto', address: 'Cra. 3 # 4-58, Centro', cover_url: '/images/steak-ribeye.jpg' },
    customer: { full_name: 'Sharick Grajales', phone: '3160000001' },
    items: [
      { id: 'a1', name: 'Picada Pacífico para 2', quantity: 1 },
      { id: 'a2', name: 'Arroz atollado valluno', quantity: 2 },
      { id: 'a3', name: 'Limonada de coco 16 oz', quantity: 1 },
    ],
  },
  {
    id: 'o2', order_number: 'TS-4826', status: 'ready', mode: 'delivery',
    payment_method: 'cash', payment_status: 'pending',
    total: 41800, tip: 0, courier_earnings: 7200,
    delivery_address: 'Barrio El Jorge, Comuna 4',
    created_at: ago(4),
    business: { name: 'Burger House Bahía', address: 'Cl. 6 # 3-12, Comuna 4', cover_url: '/images/burger.jpg' },
    customer: { full_name: 'Andrés Riascos', phone: '3160000002' },
    items: [
      { id: 'b1', name: 'Hamburguesa americana', quantity: 2 },
      { id: 'b2', name: 'Papas grandes', quantity: 1 },
    ],
  },
  {
    id: 'o3', order_number: 'TS-4829', status: 'preparing', mode: 'delivery',
    payment_method: 'card', payment_status: 'paid',
    total: 112400, tip: 4000, courier_earnings: 12600,
    delivery_address: 'Ciudadela San Antonio',
    created_at: ago(6),
    business: { name: 'Marisquería El Faro', address: 'Cra. 4 # 8-30, Centro', cover_url: '/images/food-fork.jpg' },
    customer: { full_name: 'Marleny Cuero', phone: '3160000003' },
    items: [
      { id: 'c1', name: 'Encocado de jaiba', quantity: 1 },
      { id: 'c2', name: 'Ceviche mixto', quantity: 2 },
      { id: 'c3', name: 'Jugo de borojó', quantity: 2 },
    ],
  },
];

/** Caja mutable: guarda la entrega tomada en modo local */
const LOCAL_ACTIVE = { current: null };

/**
 * Entregas de los ultimos 60 dias.
 *
 * Sesenta y no seis porque la pantalla de ganancias compara dia,
 * semana y mes: con seis filas el "mes" salia igual que la "semana" y
 * parecia un error.
 *
 * La forma imita una jornada real: viernes y sabado mandan, el lunes
 * es el piso, y las propinas aparecen en una de cada tres entregas.
 * Sin Math.random, para que el servidor y el navegador pinten lo mismo.
 */
const DELIVERY_WEIGHT = [1.1, 0.6, 0.68, 0.75, 0.9, 1.45, 1.55];  // Dom -> Sab

const LOCAL_BUSINESSES_POOL = [
  ['Asadero El Puerto', '/images/steak-ribeye.jpg'],
  ['Marisqueria El Faro', '/images/food-fork.jpg'],
  ['Burger House Bahia', '/images/burger.jpg'],
  ['Supermercado La Bahia', '/images/fried-steak.jpg'],
  ['Drogueria La Salud', '/images/beef-tomatoes.jpg'],
  ['Picadas El Jorge', '/images/lamb-chops.jpg'],
];

const LOCAL_DELIVERIES = (() => {
  const rows = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let n = 4900;

  for (let back = 59; back >= 0; back -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - back);

    const count = Math.round(9 * DELIVERY_WEIGHT[day.getDay()]);

    for (let k = 0; k < count; k += 1) {
      // Reparte las entregas entre las 11 a.m. y las 10 p.m.
      const at = new Date(day);
      at.setHours(11 + Math.floor((k / count) * 11), (k * 13) % 60, 0, 0);

      const [name, cover] = LOCAL_BUSINESSES_POOL[(back + k) % LOCAL_BUSINESSES_POOL.length];
      const fee = 6800 + ((k * 977) % 8) * 900;
      // Propina en una de cada tres, y mas alta el fin de semana
      const tip = (back + k) % 3 === 0
        ? 1500 + ((k * 331) % 4) * 1000 + (day.getDay() >= 5 ? 1000 : 0)
        : 0;

      n -= 1;
      rows.push({
        id: 'd' + n,
        order_number: 'TS-' + n,
        total: 24000 + ((k * 1777) % 9) * 7000,
        tip,
        courier_earnings: fee + tip,
        delivered_at: at.toISOString(),
        business: { name, cover_url: cover },
      });
    }
  }

  return rows.reverse();
})();

const LOCAL_MESSAGES = [
  { id: 'm1', sender_id: 'me', body: '¡Hola! Ya recogí tu pedido en el Asadero El Puerto.', created_at: ago(4) },
  { id: 'm2', sender_id: 'me', body: 'Voy en camino, llego en unos 12 minutos.', created_at: ago(4) },
  { id: 'm3', sender_id: 'them', body: 'Perfecto, muchas gracias', created_at: ago(3) },
];
