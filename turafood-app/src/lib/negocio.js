'use client';

/**
 * CAPA DE DATOS DEL NEGOCIO
 *
 * Mismo patrón que en la app de cliente: si hay credenciales de Supabase
 * se consulta la base; si no, se devuelven los datos del mockup para
 * poder revisar las pantallas. El interruptor es `isLive()`.
 *
 * Nada de lo que hay aquí calcula dinero: los totales, la comisión y el
 * neto los sella la base al crear el pedido (place_order). Estas
 * funciones solo leen y cambian estados.
 */

import { createClient } from '@/utils/supabase/client';

export function isLive() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// KANBAN DE PEDIDOS EN VIVO
// ============================================================

/**
 * Las cuatro columnas del mockup (COLS, línea 1057) mapeadas a los
 * estados reales de `orders.status`.
 */
export const COLUMNS = [
  {
    key: 'nuevo',
    label: 'Nuevos',
    dot: 'var(--primary)',
    statuses: ['pending'],
    next: 'accepted',
    btnLabel: 'Aceptar pedido',
    canReject: true,
  },
  {
    key: 'preparando',
    label: 'En preparación',
    dot: 'var(--amber)',
    statuses: ['accepted', 'preparing'],
    next: 'ready',
    btnLabel: 'Marcar listo',
    canReject: false,
  },
  {
    key: 'listo',
    label: 'Listos',
    dot: 'var(--blue)',
    statuses: ['ready'],
    next: 'courier_assigned',
    btnLabel: 'Entregar a repartidor',
    canReject: false,
  },
  {
    key: 'despachado',
    label: 'En camino',
    dot: 'var(--green)',
    statuses: ['courier_assigned', 'picked_up', 'delivering'],
    next: null,
    btnLabel: 'Ver detalle',
    canReject: false,
  },
];

const LIVE_STATUSES = COLUMNS.flatMap((c) => c.statuses);

export function columnOf(status) {
  return COLUMNS.find((c) => c.statuses.includes(status)) ?? COLUMNS[0];
}

/** Negocio de la sesión actual */
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

/** Pedidos que están en el tablero */
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
    .in('status', LIVE_STATUSES)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);
  return data ?? [];
}

/**
 * Cambia el estado de un pedido. Las marcas de tiempo las pone la base;
 * aquí solo se manda el estado nuevo.
 */
export async function setOrderStatus(orderId, status, cancelReason = null) {
  if (!isLive()) {
    await delay(180);
    const order = LOCAL_ORDERS.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      if (cancelReason) order.cancel_reason = cancelReason;
    }
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

/** Pedidos nuevos y cambios en vivo. Devuelve cómo cancelar la escucha. */
export function subscribeToOrders(businessId, onChange) {
  if (!isLive() || !businessId) return () => {};

  const supabase = createClient();
  const channel = supabase
    .channel(`negocio-orders:${businessId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ============================================================
// TIENDA ABIERTA / CERRADA
// ============================================================

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

// ============================================================
// CATÁLOGO
// ============================================================

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

export async function getCategories(businessId) {
  if (!isLive()) {
    await delay();
    return Array.from(new Set(LOCAL_PRODUCTS.map((p) => p.category?.name)))
      .filter(Boolean)
      .map((name, i) => ({ id: `c${i}`, name }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('business_id', businessId)
    .order('sort_order');

  if (error) return [];
  return data ?? [];
}

/** Crea una categoría nueva desde el formulario de producto */
export async function createCategory(businessId, name) {
  if (!isLive()) {
    await delay(200);
    return { id: `c-${Date.now()}`, name };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_categories')
    .insert({ business_id: businessId, name })
    .select()
    .single();

  if (error) throw new Error(`No se pudo crear la categoría: ${error.message}`);
  return data;
}

export async function saveProduct(businessId, product) {
  if (!isLive()) {
    await delay(300);
    if (product.id) {
      const i = LOCAL_PRODUCTS.findIndex((p) => p.id === product.id);
      if (i >= 0) LOCAL_PRODUCTS[i] = { ...LOCAL_PRODUCTS[i], ...product };
      return LOCAL_PRODUCTS[i];
    }
    const row = { ...product, id: `p-${Date.now()}`, is_available: true, sold: 0 };
    LOCAL_PRODUCTS.unshift(row);
    return row;
  }

  const supabase = createClient();
  const payload = {
    business_id: businessId,
    name: product.name,
    description: product.description || null,
    price: Number(product.price) || 0,
    compare_price: product.compare_price ? Number(product.compare_price) : null,
    category_id: product.category_id || null,
    image_url: product.image_url || null,
    is_available: product.is_available ?? true,
  };

  const query = product.id
    ? supabase.from('products').update(payload).eq('id', product.id)
    : supabase.from('products').insert(payload);

  const { data, error } = await query.select('*, category:product_categories(name)').single();
  if (error) throw new Error(`No se pudo guardar el producto: ${error.message}`);
  return data;
}

export async function deleteProduct(productId) {
  if (!isLive()) {
    await delay(200);
    const i = LOCAL_PRODUCTS.findIndex((p) => p.id === productId);
    if (i >= 0) LOCAL_PRODUCTS.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`);
  return true;
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

// ============================================================
// HISTORIAL
// ============================================================

export async function getHistory(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_HISTORY;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:profiles!orders_customer_id_fkey(full_name)')
    .eq('business_id', businessId)
    .in('status', ['delivered', 'cancelled', 'refunded'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`No se pudo cargar el historial: ${error.message}`);
  return data ?? [];
}

// ============================================================
// RESEÑAS
// ============================================================

export async function getReviews(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_REVIEWS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*, order:orders(order_number), customer:profiles!reviews_customer_id_fkey(full_name, tura_plus)')
    .eq('business_id', businessId)
    .not('business_rating', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`No se pudieron cargar las reseñas: ${error.message}`);

  // La columna se llama `business_rating`; las pantallas hablan de `rating`.
  return (data ?? []).map((r) => ({
    ...r,
    rating: r.business_rating,
    order_number: r.order?.order_number ?? null,
  }));
}

/**
 * Publica la respuesta del negocio. Va por RPC porque la función
 * comprueba en el servidor que la reseña sea de este negocio y solo
 * deja tocar la respuesta, nunca la calificación del cliente.
 */
export async function replyToReview(reviewId, reply) {
  if (!isLive()) {
    await delay(200);
    const r = LOCAL_REVIEWS.find((x) => x.id === reviewId);
    if (r) {
      r.business_reply = reply;
      r.replied_at = new Date().toISOString();
    }
    return r;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('reply_to_review', {
    p_review_id: reviewId,
    p_reply: reply,
  });

  if (error) throw new Error(`No se pudo publicar la respuesta: ${error.message}`);
  return data;
}

// ============================================================
// HORARIOS
// ============================================================

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export async function getHours(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_HOURS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week');

  if (error) throw new Error(`No se pudieron cargar los horarios: ${error.message}`);
  return data ?? [];
}

export async function upsertHour(businessId, dayOfWeek, patch) {
  if (!isLive()) {
    await delay(150);
    const row = LOCAL_HOURS.find((h) => h.day_of_week === dayOfWeek);
    if (row) Object.assign(row, patch);
    return row;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_hours')
    .upsert(
      { business_id: businessId, day_of_week: dayOfWeek, opens_at: '11:00', closes_at: '21:30', ...patch },
      { onConflict: 'business_id,day_of_week' },
    )
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar el horario: ${error.message}`);
  return data;
}

// ============================================================
// REPORTES Y LIQUIDACIONES
// ============================================================

/**
 * Agrupa los pedidos entregados por día y calcula bruto, comisión y neto
 * con los valores que la base ya guardó en cada pedido.
 */
export function summarizeByDay(orders, days = 7) {
  const buckets = new Map();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), {
      date: d, orders: 0, gross: 0, fee: 0, net: 0,
    });
  }

  orders.forEach((o) => {
    if (o.status !== 'delivered') return;
    const key = String(o.created_at).slice(0, 10);
    const b = buckets.get(key);
    if (!b) return;
    const gross = Number(o.subtotal ?? 0);
    const fee = Number(o.business_commission ?? 0);
    b.orders += 1;
    b.gross += gross;
    b.fee += fee;
    b.net += gross - fee;
  });

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    avg: b.orders ? Math.round(b.gross / b.orders) : 0,
  }));
}

/** Todos los pedidos entregados de los últimos N días */
export async function getSalesWindow(businessId, days = 7) {
  if (!isLive()) {
    await delay();
    return LOCAL_SALES;
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, subtotal, total, business_commission, created_at')
    .eq('business_id', businessId)
    .gte('created_at', from.toISOString())
    .order('created_at');

  if (error) throw new Error(`No se pudieron cargar las ventas: ${error.message}`);
  return data ?? [];
}

export async function getPayouts(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_PAYOUTS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('payout_requests')
    .select('*')
    .eq('user_id', businessId)
    .order('created_at', { ascending: false })
    .limit(30);

  // La tabla puede no existir todavía en entornos viejos: no rompemos la vista.
  if (error) return [];
  return data ?? [];
}

// ============================================================
// VERIFICACIÓN DEL NEGOCIO
//
// Los requisitos que antes se pedían en el asistente de alta ahora se
// completan aquí adentro, y se pueden dejar a medias.
// ============================================================

/** Documentos obligatorios para que TuraFood apruebe el negocio */
export const REQUIRED_DOCS = ['rut', 'chamber', 'id_card'];

export const DOC_LABELS = {
  rut: { label: 'RUT', hint: 'Actualizado, del año en curso' },
  chamber: { label: 'Cámara de comercio', hint: 'Certificado de máximo 90 días' },
  id_card: { label: 'Cédula del representante', hint: 'Por ambas caras' },
  health: { label: 'Concepto sanitario', hint: 'Solo si manejas alimentos preparados' },
};

/** Guarda los campos del negocio que edita la propia tienda */
export async function updateBusiness(businessId, patch) {
  if (!isLive()) {
    await delay(200);
    Object.assign(LOCAL_BUSINESS, patch);
    return LOCAL_BUSINESS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_profiles')
    .update(patch)
    .eq('id', businessId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo guardar: ${error.message}`);
  return data;
}

export async function getDocuments(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_DOCS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_documents')
    .select('*')
    .eq('business_id', businessId);

  if (error) return [];
  return data ?? [];
}

/**
 * Sube un documento al bucket privado y lo registra.
 *
 * La ruta empieza por el id del negocio porque las políticas de Storage
 * exigen que la primera carpeta sea quien sube: así nadie puede escribir
 * en la carpeta de otro ni leerla.
 */
export async function uploadDocument(businessId, kind, file) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('El archivo pesa más de 8 MB. Comprímelo e inténtalo de nuevo.');
  }

  if (!isLive()) {
    await delay(400);
    const row = { id: `d-${kind}`, business_id: businessId, kind, file_name: file.name, status: 'uploaded' };
    const i = LOCAL_DOCS.findIndex((d) => d.kind === kind);
    if (i >= 0) LOCAL_DOCS[i] = row; else LOCAL_DOCS.push(row);
    return row;
  }

  const supabase = createClient();
  const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase();
  const path = `${businessId}/${kind}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('business-docs')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) throw new Error(`No se pudo subir el archivo: ${upErr.message}`);

  const { data, error } = await supabase
    .from('business_documents')
    .upsert(
      { business_id: businessId, kind, file_path: path, file_name: file.name, status: 'uploaded' },
      { onConflict: 'business_id,kind' },
    )
    .select()
    .single();

  if (error) throw new Error(`Se subió el archivo pero no se registró: ${error.message}`);
  return data;
}

export async function deleteDocument(businessId, kind, filePath) {
  if (!isLive()) {
    await delay(200);
    const i = LOCAL_DOCS.findIndex((d) => d.kind === kind);
    if (i >= 0) LOCAL_DOCS.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  if (filePath) await supabase.storage.from('business-docs').remove([filePath]);
  await supabase.from('business_documents').delete()
    .eq('business_id', businessId).eq('kind', kind);
  return true;
}

/**
 * Manda el registro a revisión. Quien decide si está completo es la
 * base: si falta algo devuelve el mensaje con lo que falta.
 */
export async function submitForReview() {
  if (!isLive()) {
    await delay(400);
    LOCAL_BUSINESS.submitted_at = new Date().toISOString();
    return LOCAL_BUSINESS;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('submit_business_for_review');
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Qué le falta al negocio, calculado igual que en la base.
 * Sirve para pintar la lista; la validación de verdad es del servidor.
 */
export function checklistOf(business, documents = []) {
  const has = (v) => Boolean(String(v ?? '').trim());
  const kinds = documents.map((d) => d.kind);

  return [
    {
      id: 'datos',
      label: 'Datos del negocio',
      hint: 'Nombre, tipo, NIT y celular',
      done: has(business?.name) && has(business?.nit) && has(business?.phone),
    },
    {
      id: 'direccion',
      label: 'Dirección',
      hint: 'Dónde queda tu punto de venta',
      done: has(business?.address),
    },
    {
      id: 'documentos',
      label: 'Documentos',
      hint: 'RUT, cámara de comercio y cédula',
      done: REQUIRED_DOCS.every((k) => kinds.includes(k)),
    },
    {
      id: 'banco',
      label: 'Cuenta bancaria',
      hint: 'Dónde te consignamos los viernes',
      done: has(business?.bank_name)
        && has(business?.bank_account_number)
        && has(business?.bank_account_holder),
    },
  ];
}

// ============================================================
// PROMOCIONES
// ============================================================

export async function getCoupons(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_COUPONS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar las promociones: ${error.message}`);
  return data ?? [];
}

export async function createCoupon(businessId, coupon) {
  if (!isLive()) {
    await delay(200);
    const row = { id: `c${Date.now()}`, business_id: businessId, uses_count: 0, is_active: true, ...coupon };
    LOCAL_COUPONS.unshift(row);
    return row;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('coupons')
    .insert({ ...coupon, business_id: businessId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Ya existe una promoción con ese código.');
    throw new Error(`No se pudo crear la promoción: ${error.message}`);
  }
  return data;
}

export async function setCouponActive(couponId, isActive) {
  if (!isLive()) {
    await delay(150);
    const c = LOCAL_COUPONS.find((x) => x.id === couponId);
    if (c) c.is_active = isActive;
    return c;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo actualizar la promoción: ${error.message}`);
  return data;
}

// ============================================================
// DATOS LOCALES — copiados del mockup de Negocios
// ============================================================

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const LOCAL_BUSINESS = {
  id: 'local-business',
  name: 'Asadero El Puerto',
  category: 'Asados · Picadas · Criolla',
  vertical: 'restaurant',
  cover_url: '/images/steak-ribeye.jpg',
  address: 'Cra. 3 # 4-58, Centro · Buenaventura',
  status: 'active',
  is_open: true,
  rating: 4.8,
  reviews_count: 1284,
  total_orders: 1240,
  prep_time_min: 28,
  commission_rate: 0.1,
  pro_plan: false,
  phone: '+57 320 000 0000',
};

const LOCAL_ORDERS = [
  {
    id: 'l1', order_number: 'TS-4821', status: 'pending', mode: 'delivery',
    payment_method: 'nequi', payment_status: 'paid',
    customer: { full_name: 'Sharick Grajales' },
    delivery_address: 'Centro', delivery_instructions: 'Sin cebolla en la picada, por favor.',
    subtotal: 74500, delivery_fee: 0, service_fee: 1900, tip: 1900, discount: 0, total: 78300,
    created_at: ago(1),
    items: [
      { id: 'i1', name: 'Picada Pacífico para 2', quantity: 1, unit_price: 48900, subtotal: 48900 },
      { id: 'i2', name: 'Arroz atollado valluno', quantity: 2, unit_price: 26900, subtotal: 53800 },
      { id: 'i3', name: 'Limonada de coco 16 oz', quantity: 1, unit_price: 9500, subtotal: 9500 },
    ],
  },
  {
    id: 'l2', order_number: 'TS-4822', status: 'pending', mode: 'pickup',
    payment_method: 'cash', payment_status: 'pending',
    customer: { full_name: 'Andrés Riascos' },
    delivery_address: 'El Jorge',
    subtotal: 39100, delivery_fee: 0, service_fee: 1900, tip: 0, discount: 0, total: 41000,
    created_at: ago(3),
    items: [{ id: 'i4', name: 'Churrasco 350 g', quantity: 1, unit_price: 41000, subtotal: 41000 }],
  },
  {
    id: 'l3', order_number: 'TS-4819', status: 'preparing', mode: 'delivery',
    payment_method: 'card', payment_status: 'paid',
    customer: { full_name: 'Marleny Cuero' },
    delivery_address: 'Juan XXIII', delivery_instructions: 'Timbre dañado, llamar al llegar.',
    subtotal: 106600, delivery_fee: 3900, service_fee: 1900, tip: 0, discount: 0, total: 112400,
    created_at: ago(9),
    items: [
      { id: 'i5', name: 'Costilla BBQ', quantity: 2, unit_price: 36500, subtotal: 73000 },
      { id: 'i6', name: 'Encocado de jaiba', quantity: 1, unit_price: 34500, subtotal: 34500 },
      { id: 'i7', name: 'Jugo de borojó', quantity: 2, unit_price: 8500, subtotal: 17000 },
    ],
  },
  {
    id: 'l4', order_number: 'TS-4818', status: 'preparing', mode: 'delivery',
    payment_method: 'card', payment_status: 'paid',
    customer: { full_name: 'Deivid Mosquera' },
    delivery_address: 'Bellavista',
    subtotal: 34600, delivery_fee: 0, service_fee: 1900, tip: 0, discount: 0, total: 36500,
    created_at: ago(12),
    items: [{ id: 'i8', name: 'Costilla BBQ', quantity: 1, unit_price: 36500, subtotal: 36500 }],
  },
  {
    id: 'l5', order_number: 'TS-4815', status: 'ready', mode: 'delivery',
    payment_method: 'nequi', payment_status: 'paid',
    customer: { full_name: 'Yurany Valencia' },
    delivery_address: 'Punta del Este',
    subtotal: 56500, delivery_fee: 0, service_fee: 1900, tip: 0, discount: 0, total: 58400,
    created_at: ago(18),
    items: [
      { id: 'i9', name: 'Picada Pacífico para 2', quantity: 1, unit_price: 48900, subtotal: 48900 },
      { id: 'i10', name: 'Cocadas del puerto x6', quantity: 1, unit_price: 12000, subtotal: 12000 },
    ],
  },
  {
    id: 'l6', order_number: 'TS-4810', status: 'delivering', mode: 'delivery',
    payment_method: 'cash', payment_status: 'pending',
    customer: { full_name: 'Carlos Angulo' },
    delivery_address: 'Centro',
    subtotal: 21000, delivery_fee: 0, service_fee: 1900, tip: 0, discount: 0, total: 22900,
    created_at: ago(26),
    items: [{ id: 'i11', name: 'Arroz atollado valluno', quantity: 1, unit_price: 26900, subtotal: 26900 }],
  },
];

const LOCAL_PRODUCTS = [
  { id: 'p1', name: 'Picada Pacífico para 2', description: 'Chorizo, chicharrón, carne asada, papa criolla y patacón', price: 48900, compare_price: 62000, image_url: '/images/steak-ribeye.jpg', is_available: true, sold: 142, category: { name: 'Recomendados' } },
  { id: 'p2', name: 'Churrasco 350 g', description: 'Con papas a la francesa, ensalada y salsa de la casa', price: 41000, compare_price: null, image_url: '/images/steak-rustic.jpg', is_available: true, sold: 96, category: { name: 'Recomendados' } },
  { id: 'p3', name: 'Costilla BBQ', description: 'Media costilla en salsa BBQ con yuca frita', price: 36500, compare_price: 44000, image_url: '/images/lamb-chops.jpg', is_available: true, sold: 88, category: { name: 'Recomendados' } },
  { id: 'p4', name: 'Arroz atollado valluno', description: 'Cerdo, pollo, longaniza y papa criolla', price: 26900, compare_price: null, image_url: '/images/fried-steak.jpg', is_available: true, sold: 210, category: { name: 'Criolla' } },
  { id: 'p5', name: 'Encocado de jaiba', description: 'Preparado con leche de coco y arroz blanco', price: 34500, compare_price: null, image_url: '/images/food-fork.jpg', is_available: false, sold: 64, category: { name: 'Criolla' } },
  { id: 'p6', name: 'Limonada de coco 16 oz', description: 'Jarra personal, bien fría', price: 9500, compare_price: null, image_url: '/images/beef-tomatoes.jpg', is_available: true, sold: 318, category: { name: 'Bebidas' } },
  { id: 'p7', name: 'Jugo de borojó', description: 'En agua o leche', price: 8500, compare_price: null, image_url: '/images/beef-tomatoes.jpg', is_available: true, sold: 74, category: { name: 'Bebidas' } },
  { id: 'p8', name: 'Cocadas del puerto x6', description: 'Hechas el mismo día', price: 12000, compare_price: null, image_url: '/images/steak-rustic.jpg', is_available: true, sold: 52, category: { name: 'Postres' } },
];

const LOCAL_HISTORY = [
  { id: 'h1', order_number: 'TS-4821', status: 'delivering', mode: 'delivery', payment_method: 'nequi', total: 78300, created_at: ago(60), customer: { full_name: 'Sharick Grajales' } },
  { id: 'h2', order_number: 'TS-4819', status: 'delivered', mode: 'delivery', payment_method: 'card', total: 112400, created_at: ago(84), customer: { full_name: 'Marleny Cuero' } },
  { id: 'h3', order_number: 'TS-4818', status: 'delivered', mode: 'delivery', payment_method: 'card', total: 36500, created_at: ago(101), customer: { full_name: 'Deivid Mosquera' } },
  { id: 'h4', order_number: 'TS-4815', status: 'delivered', mode: 'pickup', payment_method: 'cash', total: 58400, created_at: ago(136), customer: { full_name: 'Yurany Valencia' } },
  { id: 'h5', order_number: 'TS-4810', status: 'delivered', mode: 'delivery', payment_method: 'cash', total: 22900, created_at: ago(180), customer: { full_name: 'Carlos Angulo' } },
  { id: 'h6', order_number: 'TS-4803', status: 'cancelled', mode: 'delivery', payment_method: 'nequi', total: 41000, created_at: ago(1500), customer: { full_name: 'Andrés Riascos' } },
  { id: 'h7', order_number: 'TS-4796', status: 'delivered', mode: 'pickup', payment_method: 'daviplata', total: 26900, created_at: ago(1548), customer: { full_name: 'Luz Mery Riascos' } },
  { id: 'h8', order_number: 'TS-4788', status: 'refunded', mode: 'delivery', payment_method: 'card', total: 94200, created_at: ago(1582), customer: { full_name: 'Wilmer Angulo' } },
];

const LOCAL_REVIEWS = [
  {
    id: 'r1', rating: 5, comment: 'La picada llegó caliente y bien servida, alcanzó para tres. El repartidor esperó sin problema mientras bajé. Repito seguro.',
    tags: ['Comida caliente', 'Buena porción'], created_at: ago(120),
    business_reply: '¡Gracias Daniela! Nos alegra que la picada llegara como debe ser. Te esperamos pronto.',
    replied_at: ago(60), order_number: 'TS-4818',
    customer: { full_name: 'Daniela Rivas', tura_plus: true },
  },
  {
    id: 'r2', rating: 2, comment: 'Pedí el arroz atollado sin cebolla y venía con cebolla. La entrega sí fue rápida, pero la nota no la leyeron.',
    tags: ['Pedido incorrecto'], created_at: ago(300), business_reply: null, replied_at: null,
    order_number: 'TS-4809', customer: { full_name: 'Andrés Palacios', tura_plus: false },
  },
  {
    id: 'r3', rating: 4, comment: 'Muy buena la limonada de coco y el sancocho. Solo que el empaque de la sopa se derramó un poco en el camino.',
    tags: ['Empaque'], created_at: ago(1500), business_reply: null, replied_at: null,
    order_number: 'TS-4776', customer: { full_name: 'Luisa Camacho', tura_plus: false },
  },
  {
    id: 'r4', rating: 5, comment: 'El mejor asadero de Buenaventura, sin discusión. Llevábamos meses buscando algo así a domicilio.',
    tags: ['Sabor', 'Entrega rápida'], created_at: ago(1560),
    business_reply: 'Mil gracias Jhon, seguimos trabajando para mantener ese nivel.', replied_at: ago(1500),
    order_number: 'TS-4771', customer: { full_name: 'Jhon Mena', tura_plus: false },
  },
  {
    id: 'r5', rating: 3, comment: 'La comida bien, pero el pedido demoró 55 minutos cuando la app decía 30. Avisen si van a demorar.',
    tags: ['Demora'], created_at: ago(2880), business_reply: null, replied_at: null,
    order_number: 'TS-4740', customer: { full_name: 'Marcela Ortíz', tura_plus: false },
  },
];

/** Horario del mockup (línea 1170), en el formato de business_hours */
const LOCAL_HOURS = [
  { day_of_week: 0, is_open: false, opens_at: '11:00', closes_at: '21:00' },
  { day_of_week: 1, is_open: true, opens_at: '11:00', closes_at: '21:30' },
  { day_of_week: 2, is_open: true, opens_at: '11:00', closes_at: '21:30' },
  { day_of_week: 3, is_open: true, opens_at: '11:00', closes_at: '21:30' },
  { day_of_week: 4, is_open: true, opens_at: '11:00', closes_at: '22:00' },
  { day_of_week: 5, is_open: true, opens_at: '11:00', closes_at: '23:30' },
  { day_of_week: 6, is_open: true, opens_at: '12:00', closes_at: '23:30' },
];

/** Ventas de los últimos 7 días, con la comisión ya aplicada (10%) */
const LOCAL_SALES = [412000, 598000, 505000, 726000, 934000, 1180000, 827300].flatMap((gross, i) => {
  const d = new Date();
  d.setHours(13, 0, 0, 0);
  d.setDate(d.getDate() - (6 - i));
  const count = [19, 26, 22, 31, 34, 41, 38][i];
  const per = Math.round(gross / count);
  return Array.from({ length: count }, (_, k) => ({
    id: `s${i}-${k}`,
    status: 'delivered',
    subtotal: per,
    total: per,
    business_commission: Math.round(per * 0.1),
    created_at: d.toISOString(),
  }));
});

/** Documentos ya cargados, en modo local */
const LOCAL_DOCS = [
  { id: 'd1', kind: 'chamber', file_name: 'camara-comercio.pdf', status: 'approved' },
  { id: 'd2', kind: 'id_card', file_name: 'cedula.pdf', status: 'approved' },
];

/** Promociones del mockup (promoCards, línea 1589) en el formato de `coupons` */
const LOCAL_COUPONS = [
  {
    id: 'c1', code: 'PICADA2X1', description: 'Lunes a miércoles en Picada Pacífico para 2.',
    discount_type: 'percent', discount_value: 50, max_discount: null, min_order: 0,
    uses_limit: null, uses_count: 84, valid_until: '2026-08-31T23:59:00Z', is_active: true,
  },
  {
    id: 'c2', code: 'ENVIOGRATIS50', description: 'Envío gratis desde $50.000 en toda la tienda.',
    discount_type: 'free_delivery', discount_value: 0, max_discount: null, min_order: 50000,
    uses_limit: null, uses_count: 212, valid_until: '2026-09-15T23:59:00Z', is_active: true,
  },
  {
    id: 'c3', code: 'PUERTO20', description: 'Cupón para clientes nuevos, tope $15.000.',
    discount_type: 'percent', discount_value: 20, max_discount: 15000, min_order: 0,
    uses_limit: 500, uses_count: 0, valid_until: null, is_active: false,
  },
];

const LOCAL_PAYOUTS = [
  { id: 'y1', period: '28 jul – 3 ago', orders: 152, gross: 3175000, fee: 317500, net: 2857500, status: 'paid' },
  { id: 'y2', period: '21 – 27 jul', orders: 139, gross: 2864000, fee: 286400, net: 2577600, status: 'paid' },
  { id: 'y3', period: '14 – 20 jul', orders: 118, gross: 2410000, fee: 241000, net: 2169000, status: 'paid' },
  { id: 'y4', period: '4 – 10 ago', orders: 96, gross: 2210000, fee: 221000, net: 1989000, status: 'pending' },
  { id: 'y5', period: '7 – 13 jul', orders: 104, gross: 2088000, fee: 208800, net: 1879200, status: 'paid' },
];
