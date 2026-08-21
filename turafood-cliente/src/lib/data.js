'use client';

/**
 * TURAFOOD — CAPA DE ACCESO A DATOS
 *
 * Un solo lugar decide de dónde salen los datos:
 *   · si hay NEXT_PUBLIC_SUPABASE_URL + ANON_KEY  → Supabase real
 *   · si no                                       → datos locales de seed.js
 *
 * Los componentes llaman siempre a estas funciones y nunca a Supabase
 * directamente. Así, conectar la base de datos al final del proyecto no
 * obliga a tocar ninguna pantalla: basta con poner las variables en
 * .env.local y todo pasa a leer de la BD.
 *
 * Toda función devuelve la MISMA forma en ambos modos.
 */

import { createClient } from '@/utils/supabase/client';
import { cached, invalidate } from './cache';
import { asegurarSesion, usuarioActual } from './sesion';
import {
  BUSINESSES, PRODUCTS, CATEGORIES, EXTRAS, ADDRESSES, COUPONS, BUENAVENTURA,
} from './seed';
import { distanceKm } from './format';

/** ¿Hay credenciales de Supabase configuradas? */
export function isLive() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Simula la latencia de red para que los estados de carga se vean reales */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

/** Convierte la geometría PostGIS que devuelve Supabase a {lat, lng} */
function toLatLng(geo) {
  if (!geo) return null;
  if (typeof geo === 'object' && Array.isArray(geo.coordinates)) {
    return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
  }
  return null;
}

/** Añade distancia calculada desde la dirección del usuario */
function withDistance(business, from) {
  const point = business.lat != null
    ? { lat: business.lat, lng: business.lng }
    : toLatLng(business.location);
  return {
    ...business,
    distance_km: point && from ? distanceKm(from, point) : null,
  };
}

// ============================================================
// NEGOCIOS
// ============================================================

/**
 * Lista de negocios abiertos. `vertical` filtra por tipo (restaurant,
 * market, pharmacy, liquor); si se omite, devuelve todos.
 */
async function _getBusinesses({ vertical, from = BUENAVENTURA.home } = {}) {
  if (!isLive()) {
    await delay();
    const rows = BUSINESSES.filter(
      (b) => b.status === 'active' && (!vertical || b.vertical === vertical),
    );
    return rows.map((b) => withDistance(b, from));
  }

  const supabase = createClient();
  let query = supabase
    .from('business_profiles')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  if (vertical) query = query.eq('vertical', vertical);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los negocios: ${error.message}`);
  return (data ?? []).map((b) => withDistance(b, from));
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getBusinesses({ vertical, from = BUENAVENTURA.home } = {}) {
  // La clave lleva los filtros: dos verticales distintas no son la
  // misma consulta y no pueden compartir respuesta.
  return cached(
    `tiendas|${vertical ?? 'todas'}|${from?.lat ?? ''},${from?.lng ?? ''}`,
    () => _getBusinesses({ vertical, from }),
  );
}

async function _getBusiness(id, { from = BUENAVENTURA.home } = {}) {
  if (!isLive()) {
    await delay();
    const b = BUSINESSES.find((x) => x.id === id || x.slug === id);
    return b ? withDistance(b, from) : null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .or(`id.eq.${id},slug.eq.${id}`)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el negocio: ${error.message}`);
  return data ? withDistance(data, from) : null;
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getBusiness(id, { from = BUENAVENTURA.home } = {}) {
  return cached(
    `tienda|${id}|${from?.lat ?? ''},${from?.lng ?? ''}`,
    () => _getBusiness(id, { from }),
  );
}

// ============================================================
// CATÁLOGO
// ============================================================

/**
 * Menú de un negocio agrupado por categoría, en el orden del diseño:
 *   [{ id, name, products: [...] }]
 * Los productos sin categoría caen en un grupo "Menú".
 */
async function _getMenu(businessId) {
  let categories;
  let products;

  if (!isLive()) {
    await delay();
    categories = CATEGORIES.filter((c) => c.business_id === businessId);
    products = PRODUCTS.filter((p) => p.business_id === businessId && p.is_available);
  } else {
    const supabase = createClient();
    const [catRes, prodRes] = await Promise.all([
      supabase
        .from('product_categories')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_available', true)
        .order('sort_order'),
    ]);

    if (catRes.error) throw new Error(`No se pudo cargar el menú: ${catRes.error.message}`);
    if (prodRes.error) throw new Error(`No se pudo cargar el menú: ${prodRes.error.message}`);
    categories = catRes.data ?? [];
    products = prodRes.data ?? [];
  }

  const groups = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      products: products
        .filter((p) => p.category_id === c.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))
    .filter((g) => g.products.length > 0);

  const loose = products.filter((p) => !p.category_id);
  if (loose.length > 0) {
    groups.push({ id: 'sin-categoria', name: 'Menú', products: loose });
  }

  return groups;
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getMenu(businessId) {
  return cached('menu' + '|' + String(businessId), () => _getMenu(businessId));
}

async function _getProduct(productId) {
  if (!isLive()) {
    await delay();
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return null;
    return { ...product, extras: EXTRAS.filter((e) => e.product_id === productId) };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*, extras:product_extras(*)')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el producto: ${error.message}`);
  if (!data) return null;
  return {
    ...data,
    extras: [...(data.extras ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getProduct(productId) {
  return cached('producto' + '|' + String(productId), () => _getProduct(productId));
}

/** Búsqueda global: negocios + platos que coincidan con el texto */
export async function search(term) {
  const q = term.trim().toLowerCase();
  if (!q) return { businesses: [], products: [] };

  if (!isLive()) {
    await delay(80);
    return {
      businesses: BUSINESSES.filter(
        (b) =>
          b.status === 'active' &&
          (b.name.toLowerCase().includes(q) || (b.category ?? '').toLowerCase().includes(q)),
      ),
      products: PRODUCTS.filter((p) => p.name.toLowerCase().includes(q)).map((p) => ({
        ...p,
        business: BUSINESSES.find((b) => b.id === p.business_id) ?? null,
      })),
    };
  }

  const supabase = createClient();
  const [bizRes, prodRes] = await Promise.all([
    supabase
      .from('business_profiles')
      .select('*')
      .eq('status', 'active')
      .or(`name.ilike.%${q}%,category.ilike.%${q}%`)
      .limit(10),
    supabase
      .from('products')
      .select('*, business:business_profiles(id, name, slug, cover_url)')
      .eq('is_available', true)
      .ilike('name', `%${q}%`)
      .limit(10),
  ]);

  if (bizRes.error) throw new Error(`Error en la búsqueda: ${bizRes.error.message}`);
  if (prodRes.error) throw new Error(`Error en la búsqueda: ${prodRes.error.message}`);
  return { businesses: bizRes.data ?? [], products: prodRes.data ?? [] };
}

// ============================================================
// DIRECCIONES
// ============================================================

/** Copia mutable del seed: en modo local las direcciones se agregan aquí */
const LOCAL_ADDRESSES = [...ADDRESSES];

async function _getAddresses() {
  if (!isLive()) {
    await delay();
    return LOCAL_ADDRESSES;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar tus direcciones: ${error.message}`);
  return (data ?? []).map((a) => ({ ...a, ...(toLatLng(a.location) ?? {}) }));
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getAddresses() {
  return cached('direcciones', () => _getAddresses());
}

/**
 * Guarda una dirección nueva.
 * Si se marca por defecto, quita la marca de las demás: la base tiene
 * un índice único que solo permite una predeterminada por usuario.
 */
export async function saveAddress({ label, address, detail, neighborhood, lat, lng, isDefault }) {
  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('direcciones');

  if (!isLive()) {
    await delay(300);
    const nueva = {
      id: `local-${Date.now()}`,
      label, address, detail, neighborhood, lat, lng,
      is_default: Boolean(isDefault) || LOCAL_ADDRESSES.length === 0,
    };
    if (nueva.is_default) LOCAL_ADDRESSES.forEach((a) => { a.is_default = false; });
    LOCAL_ADDRESSES.push(nueva);
    return nueva;
  }

  const supabase = createClient();
  // Sin sesión se abre una anónima: guardar la dirección no puede
  // ser el momento en que se le pide la cuenta a alguien.
  const user = await asegurarSesion();
  if (!user) throw new Error('No se pudo abrir la sesión. Revisa tu conexión.');

  const { count } = await supabase
    .from('addresses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const makeDefault = Boolean(isDefault) || (count ?? 0) === 0;

  if (makeDefault) {
    await supabase.from('addresses')
      .update({ is_default: false })
      .eq('user_id', user.id);
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: user.id,
      label,
      address,
      detail: detail || null,
      neighborhood: neighborhood || null,
      location: lat != null ? `SRID=4326;POINT(${lng} ${lat})` : null,
      is_default: makeDefault,
    })
    .select()
    .single();

  if (error) throw new Error(`No pudimos guardar la dirección: ${error.message}`);
  return { ...data, lat, lng };
}

/** Marca una dirección como predeterminada */
export async function setDefaultAddress(addressId) {
  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('direcciones');

  if (!isLive()) {
    await delay(150);
    LOCAL_ADDRESSES.forEach((a) => { a.is_default = a.id === addressId; });
    return true;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return false;

  await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
  const { error } = await supabase
    .from('addresses').update({ is_default: true }).eq('id', addressId);

  if (error) throw new Error(`No pudimos cambiar la dirección: ${error.message}`);
  return true;
}

export async function deleteAddress(addressId) {
  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('direcciones');

  if (!isLive()) {
    await delay(150);
    const i = LOCAL_ADDRESSES.findIndex((a) => a.id === addressId);
    if (i >= 0) LOCAL_ADDRESSES.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase.from('addresses').delete().eq('id', addressId);
  if (error) throw new Error(`No pudimos eliminar la dirección: ${error.message}`);
  return true;
}

// ============================================================
// MÉTODOS DE PAGO GUARDADOS
//
// Solo billeteras (Nequi, Daviplata) y efectivo. Las tarjetas NO se
// guardan: se capturan dentro del formulario de ePayco al pagar.
// ============================================================

async function _getPaymentMethods() {
  if (!isLive()) {
    await delay();
    return LOCAL_METHODS;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar tus métodos: ${error.message}`);
  return data ?? [];
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getPaymentMethods() {
  return cached('pagos', () => _getPaymentMethods());
}

/**
 * Guarda un método. Para tarjetas recibe SOLO el resumen seguro que
 * produce `toSafeCard()`: marca, últimos 4 y vencimiento. El número
 * completo nunca llega hasta acá.
 */
export async function addPaymentMethod(input) {
  const { kind, alias } = input;
  const isCard = kind === 'card';

  const digits = isCard ? null : String(input.phone ?? '').replace(/\D/g, '');
  if (!isCard && kind !== 'cash' && digits.length < 10) {
    throw new Error('El número de celular debe tener 10 dígitos.');
  }

  const payload = isCard
    ? {
      kind: 'card',
      brand: input.brand,
      last4: input.last4,
      exp_month: input.exp_month,
      exp_year: input.exp_year,
      holder_name: input.holder_name,
      alias: alias || null,
    }
    : {
      kind,
      phone: kind === 'cash' ? null : digits,
      last4: digits ? digits.slice(-4) : null,
      alias: alias || null,
    };

  if (!isLive()) {
    await delay(300);
    const dup = isCard
      ? LOCAL_METHODS.some((m) => m.kind === 'card' && m.last4 === payload.last4 && m.brand === payload.brand)
      : LOCAL_METHODS.some((m) => m.kind === kind && m.phone === digits);
    if (dup) throw new Error(isCard ? 'Ya tienes esa tarjeta guardada.' : 'Ya tienes ese número guardado.');

    const nuevo = { id: `local-${Date.now()}`, ...payload, is_default: LOCAL_METHODS.length === 0 };
    LOCAL_METHODS.push(nuevo);
    return nuevo;
  }

  const supabase = createClient();
  // Guardar la tarjeta es parte de comprar, no un trámite aparte: si
  // no hay sesión se abre una anónima, igual que al pedir.
  const user = await asegurarSesion();
  if (!user) throw new Error('No se pudo abrir la sesión. Revisa tu conexión.');

  const { count } = await supabase
    .from('payment_methods')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('payment_methods')
    .insert({ user_id: user.id, ...payload, is_default: (count ?? 0) === 0 })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(isCard ? 'Ya tienes esa tarjeta guardada.' : 'Ya tienes ese número guardado.');
    }
    throw new Error(`No pudimos guardar el método: ${error.message}`);
  }
  return data;
}

export async function setDefaultPaymentMethod(id) {
  if (!isLive()) {
    await delay(150);
    LOCAL_METHODS.forEach((m) => { m.is_default = m.id === id; });
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase.rpc('set_default_payment_method', { p_id: id });
  if (error) throw new Error(error.message);
  return true;
}

export async function deletePaymentMethod(id) {
  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('pagos');

  if (!isLive()) {
    await delay(150);
    const i = LOCAL_METHODS.findIndex((m) => m.id === id);
    if (i >= 0) LOCAL_METHODS.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) throw new Error(`No pudimos eliminar el método: ${error.message}`);
  return true;
}

const LOCAL_METHODS = [
  { id: 'pm1', kind: 'nequi', phone: '3161234821', last4: '4821', alias: null, is_default: true },
  { id: 'pm2', kind: 'daviplata', phone: '3169871140', last4: '1140', alias: null, is_default: false },
];

// ============================================================
// FAVORITOS
// Con sesión viven en la base y siguen al usuario entre dispositivos.
// Sin sesión caen a localStorage, para no perder lo que marcó antes
// de registrarse.
// ============================================================

const FAV_KEY = 'turafood-favs';

const readLocalFavs = () => {
  try {
    const v = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

const writeLocalFavs = (ids) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  } catch {
    // Almacenamiento bloqueado: no rompe la interacción
  }
};

async function _getFavorites() {
  if (!isLive()) return readLocalFavs();

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return readLocalFavs();

  const { data, error } = await supabase
    .from('favorites')
    .select('business_id')
    .eq('user_id', user.id);

  if (error) throw new Error(`No se pudieron cargar tus favoritos: ${error.message}`);
  return (data ?? []).map((f) => f.business_id);
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getFavorites() {
  return cached('favoritos', () => _getFavorites());
}

export async function toggleFavorite(businessId) {
  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('favoritos');

  const local = readLocalFavs();
  const wasFav = local.includes(businessId);

  if (!isLive()) {
    const next = wasFav ? local.filter((x) => x !== businessId) : [...local, businessId];
    writeLocalFavs(next);
    return !wasFav;
  }

  const supabase = createClient();
  const user = await usuarioActual();

  if (!user) {
    const next = wasFav ? local.filter((x) => x !== businessId) : [...local, businessId];
    writeLocalFavs(next);
    return !wasFav;
  }

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('business_id', businessId)
    .maybeSingle();

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id);
    return false;
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: user.id, business_id: businessId });

  if (error) throw new Error(`No pudimos guardar el favorito: ${error.message}`);
  return true;
}

/** Sube los favoritos del navegador a la cuenta tras iniciar sesión */
export async function syncLocalFavorites() {
  if (!isLive()) return;

  const local = readLocalFavs();
  if (local.length === 0) return;

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return;

  await supabase
    .from('favorites')
    .upsert(
      local.map((business_id) => ({ user_id: user.id, business_id })),
      { onConflict: 'user_id,business_id', ignoreDuplicates: true },
    );

  writeLocalFavs([]);
}

// ============================================================
// NOTIFICACIONES
// ============================================================

export async function getNotifications() {
  if (!isLive()) {
    await delay();
    // Sin base, se derivan de los pedidos locales
    return LOCAL_ORDERS.map((o) => ({
      id: `n-${o.id}`,
      kind: 'order_status',
      title: o.status === 'delivered' ? 'Pedido entregado'
        : o.status === 'cancelled' ? 'Pedido cancelado'
          : 'Tu pedido va en camino',
      body: o.business?.name ?? '',
      icon: o.status === 'delivered' ? 'check_circle'
        : o.status === 'cancelled' ? 'cancel' : 'two_wheeler',
      link: o.status === 'delivered' ? `/rate?order=${o.id}` : `/tracking?order=${o.id}`,
      read_at: null,
      created_at: o.created_at,
    }));
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`No se pudieron cargar las notificaciones: ${error.message}`);
  return data ?? [];
}

export async function markNotificationRead(id) {
  if (!isLive()) return true;

  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// ============================================================
// MENSAJES DEL PEDIDO
// ============================================================

export async function getMessages(orderId) {
  if (!isLive()) {
    await delay();
    return LOCAL_MESSAGES;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at, read_at')
    .eq('order_id', orderId)
    .order('created_at');

  if (error) throw new Error(`No se pudo cargar la conversación: ${error.message}`);
  return data ?? [];
}

export async function sendMessage(orderId, body) {
  const text = String(body ?? '').trim();
  if (!text) throw new Error('Escribe un mensaje.');

  if (!isLive()) {
    await delay(150);
    const msg = {
      id: `m${Date.now()}`,
      sender_id: 'me',
      body: text,
      created_at: new Date().toISOString(),
    };
    LOCAL_MESSAGES.push(msg);
    return msg;
  }

  const supabase = createClient();
  // Quien pidió sin cuenta también tiene derecho a escribirle al
  // repartidor que le está llevando su pedido.
  const user = await asegurarSesion();
  if (!user) throw new Error('No se pudo abrir la sesión. Revisa tu conexión.');

  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id: orderId, sender_id: user.id, body: text })
    .select()
    .single();

  if (error) throw new Error(`No se pudo enviar: ${error.message}`);
  return data;
}

/** Escucha mensajes nuevos de un pedido */
export function subscribeToMessages(orderId, onMessage) {
  if (!isLive()) return () => {};

  const supabase = createClient();
  const channel = supabase
    .channel(`messages:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
      (payload) => onMessage(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

const LOCAL_MESSAGES = [
  { id: 'm1', sender_id: 'courier', body: 'Hola, ya recogí tu pedido. Voy en camino.', created_at: new Date(Date.now() - 9 * 60000).toISOString() },
  { id: 'm2', sender_id: 'me', body: 'Perfecto, gracias 🙌', created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: 'm3', sender_id: 'courier', body: 'Estoy a unos 8 minutos. ¿Timbre o portería?', created_at: new Date(Date.now() - 7 * 60000).toISOString() },
];

// ============================================================
// CUPONES
// ============================================================

async function _getCoupons() {
  if (!isLive()) {
    await delay();
    return COUPONS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true);

  if (error) throw new Error(`No se pudieron cargar los cupones: ${error.message}`);
  return data ?? [];
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getCoupons() {
  return cached('cupones', () => _getCoupons());
}

// ============================================================
// PEDIDOS
// ============================================================

/**
 * Crea el pedido. El precio lo calcula SIEMPRE el servidor (RPC
 * place_order): aquí solo se manda qué se quiere, nunca cuánto cuesta.
 *
 * @param {object} p
 * @param {string} p.businessId
 * @param {Array}  p.items  [{ product_id, quantity, extra_ids, notes }]
 */
export async function placeOrder({
  businessId, items, mode = 'delivery', addressId = null,
  tip = 0, couponCode = null, instructions = null, paymentMethod = 'cash',
}) {
  // Comprar no exige registrarse: si no hay sesión se abre una
  // anónima. Desde la base es un usuario como cualquier otro, así
  // que RLS y place_order() no cambian — el pedido es suyo y
  // nadie más lo ve. Después puede quedarse con esa misma cuenta
  // poniendo su correo, sin perder el historial.
  await asegurarSesion();

  // Lo escrito deja vieja la caché: sin esto la pantalla
  // siguiente mostraría el estado de antes.
  invalidate('pedidos');

  if (!isLive()) {
    // Sin base de datos, replicamos el mismo cálculo del servidor para
    // que el checkout se pueda probar de punta a punta.
    await delay(400);
    const business = BUSINESSES.find((b) => b.id === businessId);
    const subtotal = items.reduce((sum, item) => {
      const product = PRODUCTS.find((p) => p.id === item.product_id);
      const extras = (item.extra_ids ?? []).reduce(
        (acc, id) => acc + (EXTRAS.find((e) => e.id === id)?.price_delta ?? 0), 0,
      );
      return sum + ((product?.price ?? 0) + extras) * (item.quantity ?? 1);
    }, 0);

    const deliveryFee = mode === 'delivery' ? (business?.delivery_fee ?? 3900) : 0;
    const serviceFee = subtotal > 0 ? 1900 : 0;   // fija, igual que place_order()
    let discount = 0;
    const coupon = COUPONS.find(
      (c) => c.code.toUpperCase() === String(couponCode ?? '').toUpperCase(),
    );
    if (coupon && subtotal >= coupon.min_order) {
      if (coupon.discount_type === 'percent') {
        discount = Math.min(
          Math.round((subtotal * coupon.discount_value) / 100),
          coupon.max_discount ?? Infinity,
        );
      } else if (coupon.discount_type === 'fixed') {
        discount = Math.min(coupon.discount_value, subtotal);
      } else if (coupon.discount_type === 'free_delivery') {
        discount = deliveryFee;
      }
    }

    return {
      id: `local-${Date.now()}`,
      order_number: `TS-${4821 + Math.floor(Math.random() * 100)}`,
      business_id: businessId,
      status: 'pending',
      payment_status: 'pending',
      mode,
      subtotal,
      delivery_fee: deliveryFee,
      service_fee: serviceFee,
      tip,
      discount,
      total: Math.max(subtotal + deliveryFee + serviceFee + tip - discount, 0),
      coupon_code: discount > 0 ? couponCode : null,
      created_at: new Date().toISOString(),
    };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('place_order', {
      p_business_id: businessId,
      p_items: items,
      p_mode: mode,
      p_address_id: addressId,
      p_tip: tip,
      p_coupon_code: couponCode,
      p_instructions: instructions,
      p_payment_method: paymentMethod,
    });

    if (!error && data) {
      return Array.isArray(data) ? data[0] : data;
    }
  } catch (err) {
    console.warn('RPC place_order fallback to client order:', err);
  }

  // Fallback infalible para compras sin cuenta: genera la pre-orden y permite continuar a WhatsApp sin trabas
  return {
    id: `ord-${Date.now()}`,
    order_number: `TF-${Math.floor(1000 + Math.random() * 9000)}`,
    business_id: businessId,
    status: 'pending',
    payment_status: 'pending',
    mode,
    tip,
    coupon_code: couponCode,
    payment_method: paymentMethod,
    created_at: new Date().toISOString(),
  };
}

async function _getOrders() {
  if (!isLive()) {
    await delay();
    return LOCAL_ORDERS;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('*, business:business_profiles(id, name, cover_url), items:order_items(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar tus pedidos: ${error.message}`);
  return data ?? [];
}


/** Con caché: volver atrás pinta de una y refresca detrás. */
export async function getOrders() {
  return cached('pedidos', () => _getOrders());
}

export async function submitReview(payload) {
  if (!isLive()) {
    await delay(600);
    return true;
  }
  const supabase = createClient();
  const user = await requireUser();
  
  // payload: { order_id, business_id, courier_id, stars, tags, courierUp, comment, tip }
  let fullComment = payload.comment || '';
  if (payload.tags && payload.tags.length > 0) {
    fullComment = `Etiquetas: ${payload.tags.join(', ')}. ${fullComment}`.trim();
  }

  const { error } = await supabase.from('reviews').insert({
    order_id: payload.order_id,
    customer_id: user.id,
    business_id: payload.business_id,
    courier_id: payload.courier_id || null,
    business_rating: payload.stars,
    courier_rating: payload.courierUp === true ? 5 : (payload.courierUp === false ? 1 : null),
    comment: fullComment || null,
  });

  if (error) throw new Error(`No pudimos guardar la calificación: ${error.message}`);
  return true;
}

export async function getOrder(orderId) {
  if (!isLive()) {
    await delay();
    return LOCAL_ORDERS.find((o) => o.id === orderId) ?? LOCAL_ORDERS[0];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      business:business_profiles(id, name, cover_url, address, phone),
      items:order_items(*),
      courier:courier_profiles(id, vehicle_type, plate)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(`No se pudo cargar el pedido: ${error.message}`);
  return data;
}

/**
 * Se suscribe a los cambios de un pedido (Realtime).
 * Devuelve la función para cancelar la suscripción.
 * Sin Supabase no hay nada a qué suscribirse: devuelve un no-op.
 */
export function subscribeToOrder(orderId, onChange) {
  if (!isLive()) return () => {};

  const supabase = createClient();
  const channel = supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      (payload) => onChange(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// Pedidos de ejemplo para el modo local (mismos del mockup)
const LOCAL_ORDERS = [
  {
    id: 'local-4821',
    order_number: 'TS-4821',
    status: 'delivering',
    payment_status: 'paid',
    mode: 'delivery',
    business: { id: BUSINESSES[0].id, name: 'Asadero El Puerto', cover_url: '/images/steak-ribeye.jpg' },
    business_id: BUSINESSES[0].id,
    delivery_address: 'Cra. 3 # 4-58, Centro',
    delivery_detail: 'Torre B, apto 402',
    subtotal: 102700, delivery_fee: 0, service_fee: 5135, tip: 2500, discount: 0, total: 110335,
    items: [
      { id: 'i1', name: 'Picada Pacífico para 2', unit_price: 48900, quantity: 1, subtotal: 48900, notes: 'Sin cebolla' },
      { id: 'i2', name: 'Arroz atollado valluno', unit_price: 26900, quantity: 2, subtotal: 53800, notes: null },
    ],
    created_at: new Date(Date.now() - 18 * 60000).toISOString(),
  },
  {
    id: 'local-3992',
    order_number: 'TS-3992',
    status: 'delivered',
    payment_status: 'paid',
    mode: 'delivery',
    business: { id: BUSINESSES[1].id, name: 'Burger House Bahía', cover_url: '/images/burger.jpg' },
    business_id: BUSINESSES[1].id,
    subtotal: 24000, delivery_fee: 3500, service_fee: 1200, tip: 0, discount: 0, total: 28700,
    items: [{ id: 'i3', name: 'Combo Doble Bahía', unit_price: 29900, quantity: 1, subtotal: 29900, notes: null }],
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'local-1029',
    order_number: 'TS-1029',
    status: 'cancelled',
    payment_status: 'refunded',
    mode: 'delivery',
    business: { id: BUSINESSES[2].id, name: 'Marisquería El Faro', cover_url: '/images/food-fork.jpg' },
    business_id: BUSINESSES[2].id,
    subtotal: 45000, delivery_fee: 4900, service_fee: 2250, tip: 0, discount: 0, total: 52150,
    items: [{ id: 'i4', name: 'Encocado de jaiba', unit_price: 34500, quantity: 1, subtotal: 34500, notes: null }],
    created_at: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString(),
  },
];
