'use client';

/**
 * TURAFOOD ADMIN — CAPA DE ACCESO A DATOS
 *
 * Misma regla que en la app cliente: si hay credenciales de Supabase
 * lee de la base de datos; si no, usa los datos locales de abajo.
 * Los componentes nunca hablan con Supabase directamente.
 */

import { createClient } from '@/utils/supabase/client';

export function isLive() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

/** Etiquetas y colores por vertical — tomados del mockup del admin */
export const VERTICAL_PILL = {
  restaurant: { label: 'Restaurante', bg: '#FDF0EA', fg: '#A8412A' },
  market: { label: 'Mercado', bg: '#DCF2EA', fg: '#0E7A52' },
  pharmacy: { label: 'Farmacia', bg: '#EBF2FE', fg: '#1961E6' },
  liquor: { label: 'Licores', bg: '#F8F3EA', fg: '#A36814' },
  store: { label: 'Tienda', bg: 'var(--surface2)', fg: 'var(--muted)' },
  turbo: { label: 'Turbo', bg: '#FFF0ED', fg: 'var(--primary)' },
};

export const STATUS_PILL = {
  pending_review: { label: 'En revisión', bg: '#FFF7E6', fg: '#A8730B' },
  active: { label: 'Aprobado', bg: '#E6F6EE', fg: '#0B7A48' },
  rejected: { label: 'Rechazado', bg: '#FFF0ED', fg: 'var(--primary)' },
  suspended: { label: 'Suspendido', bg: 'var(--surface2)', fg: 'var(--muted)' },
  closed: { label: 'Cerrado', bg: 'var(--surface2)', fg: 'var(--muted)' },
};

// ============================================================
// NEGOCIOS
// ============================================================

/**
 * Lista de negocios. `status` filtra por estado; sin filtro trae todos.
 * El admin es el único rol que ve los que están en revisión.
 */
export async function getBusinesses({ status } = {}) {
  if (!isLive()) {
    await delay();
    return status ? LOCAL_BUSINESSES.filter((b) => b.status === status) : LOCAL_BUSINESSES;
  }

  const supabase = createClient();
  let query = supabase
    .from('business_profiles')
    .select('*, owner:profiles(id, full_name, phone, email)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los negocios: ${error.message}`);
  return data ?? [];
}

/**
 * Aprueba o rechaza un negocio.
 * En modo real llama al RPC `review_business`, que verifica en la base
 * de datos que quien llama sea admin — no basta con ocultar el botón.
 */
export async function reviewBusiness(businessId, approve, reason = null) {
  if (!isLive()) {
    await delay(300);
    const business = LOCAL_BUSINESSES.find((b) => b.id === businessId);
    if (!business) throw new Error('Negocio no encontrado');
    business.status = approve ? 'active' : 'rejected';
    business.rejection_reason = approve ? null : reason;
    business.reviewed_at = new Date().toISOString();
    return business;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('review_business', {
    p_business_id: businessId,
    p_approve: approve,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// REPARTIDORES
// ============================================================

export async function getCouriers({ approvalStatus } = {}) {
  if (!isLive()) {
    await delay();
    return approvalStatus
      ? LOCAL_COURIERS.filter((c) => c.approval_status === approvalStatus)
      : LOCAL_COURIERS;
  }

  const supabase = createClient();
  let query = supabase
    .from('courier_profiles')
    .select('*, profile:profiles(id, full_name, phone, email, rating)')
    .order('created_at', { ascending: false });

  if (approvalStatus) query = query.eq('approval_status', approvalStatus);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los repartidores: ${error.message}`);
  return (data ?? []).map((c) => ({
    ...c,
    full_name: c.profile?.full_name,
    phone: c.profile?.phone,
    rating: c.profile?.rating,
  }));
}

export async function reviewCourier(courierId, approve, reason = null) {
  if (!isLive()) {
    await delay(300);
    const courier = LOCAL_COURIERS.find((c) => c.id === courierId);
    if (!courier) throw new Error('Repartidor no encontrado');
    courier.approval_status = approve ? 'active' : 'rejected';
    courier.rejection_reason = approve ? null : reason;
    courier.reviewed_at = new Date().toISOString();
    return courier;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('review_courier', {
    p_courier_id: courierId,
    p_approve: approve,
    p_reason: reason,
  });

  if (error) throw new Error(error.message);
  return data;
}

// ============================================================
// MÉTRICAS DEL PANEL
// ============================================================

export async function getOverview() {
  if (!isLive()) {
    await delay();
    return {
      pendingApprovals:
        LOCAL_BUSINESSES.filter((b) => b.status === 'pending_review').length +
        LOCAL_COURIERS.filter((c) => c.approval_status === 'pending_review').length,
      activeBusinesses: LOCAL_BUSINESSES.filter((b) => b.status === 'active').length,
      onlineCouriers: LOCAL_COURIERS.filter((c) => c.status === 'online').length,
      weekRevenue: 1200000,
      liveOrders: 3,
    };
  }

  const supabase = createClient();
  const [pendingBiz, pendingCour, activeBiz, onlineCour, orders] = await Promise.all([
    supabase.from('business_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase.from('courier_profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending_review'),
    supabase.from('business_profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('courier_profiles').select('id', { count: 'exact', head: true }).eq('status', 'online'),
    supabase
      .from('orders')
      .select('platform_revenue')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .eq('payment_status', 'paid'),
  ]);

  return {
    pendingApprovals: (pendingBiz.count ?? 0) + (pendingCour.count ?? 0),
    activeBusinesses: activeBiz.count ?? 0,
    onlineCouriers: onlineCour.count ?? 0,
    weekRevenue: (orders.data ?? []).reduce((sum, o) => sum + Number(o.platform_revenue ?? 0), 0),
    liveOrders: 0,
  };
}

// ============================================================
// DATOS LOCALES (espejo de seed.sql)
// ============================================================

const LOCAL_BUSINESSES = [
  {
    id: 'b0000000-0000-4000-8000-000000000010',
    name: 'Droguería La Rebaja', slug: 'drogueria-la-rebaja',
    category: 'Farmacia · Medicamentos', vertical: 'pharmacy',
    cover_url: '/images/steak-rustic.jpg',
    address: 'Cl. 8 # 52-14, Centro', phone: '3161110010',
    status: 'pending_review', rating: 5.0, reviews_count: 0, total_orders: 0,
    commission_rate: 0.10, nit: '901.223.114-2',
    owner: { full_name: 'Andrea Solís', phone: '3161110010', email: 'rebaja@turafood.com' },
    zone: 'Centro',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000011',
    name: 'Sabor Pacífico', slug: 'sabor-pacifico',
    category: 'Comida de mar · Criolla', vertical: 'restaurant',
    cover_url: '/images/food-fork.jpg',
    address: 'Cra. 4 # 9-30, Bellavista', phone: '3161110011',
    status: 'pending_review', rating: 5.0, reviews_count: 0, total_orders: 0,
    commission_rate: 0.10, nit: '901.884.031-7',
    owner: { full_name: 'Nelson Grueso', phone: '3161110011', email: 'sabor@turafood.com' },
    zone: 'Isla Cascajal',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000012',
    name: 'Frutas y Verduras El Puerto', slug: 'frutas-verduras-el-puerto',
    category: 'Mercado · Frutas', vertical: 'market',
    cover_url: '/images/beef-tomatoes.jpg',
    address: 'Cl. 3 # 6-15, Pueblo Nuevo', phone: '3161110012',
    status: 'pending_review', rating: 5.0, reviews_count: 0, total_orders: 0,
    commission_rate: 0.10, nit: '900.512.778-4',
    owner: { full_name: 'Yamile Bonilla', phone: '3161110012', email: 'frutas@turafood.com' },
    zone: 'Centro',
    created_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    name: 'Asadero El Puerto', slug: 'asadero-el-puerto',
    category: 'Asados · Picadas · Criolla', vertical: 'restaurant',
    cover_url: '/images/steak-ribeye.jpg',
    address: 'Cra. 3 # 4-58, Centro', phone: '3161110001',
    status: 'active', rating: 4.8, reviews_count: 1240, total_orders: 1240,
    commission_rate: 0.10, nit: '901.114.552-1',
    owner: { full_name: 'Jhon Castillo', phone: '3161110001', email: 'puerto@turafood.com' },
    zone: 'Centro',
    created_at: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    name: 'Burger House Bahía', slug: 'burger-house-bahia',
    category: 'Hamburguesas · Alitas', vertical: 'restaurant',
    cover_url: '/images/burger.jpg',
    address: 'Cl. 2 # 3-21, Centro', phone: '3161110002',
    status: 'active', rating: 4.6, reviews_count: 860, total_orders: 860,
    commission_rate: 0.10, nit: '901.775.320-9',
    owner: { full_name: 'Laura Riascos', phone: '3161110002', email: 'bahia@turafood.com' },
    zone: 'Centro',
    created_at: new Date(Date.now() - 70 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000003',
    name: 'Marisquería El Faro', slug: 'marisqueria-el-faro',
    category: 'Mariscos · Encocados', vertical: 'restaurant',
    cover_url: '/images/food-fork.jpg',
    address: 'Cra. 1 # 7-12, La Playita', phone: '3161110003',
    status: 'active', rating: 4.9, reviews_count: 2105, total_orders: 2105,
    commission_rate: 0.10, nit: '900.331.907-3',
    owner: { full_name: 'Diego Angulo', phone: '3161110003', email: 'faro@turafood.com' },
    zone: 'Isla Cascajal',
    created_at: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'b0000000-0000-4000-8000-000000000004',
    name: 'Parrilla Punta del Este', slug: 'parrilla-punta-del-este',
    category: 'Parrilla · Costillas', vertical: 'restaurant',
    cover_url: '/images/lamb-chops.jpg',
    address: 'Cl. 8 # 52-14, Punta del Este', phone: '3161110004',
    status: 'active', rating: 4.7, reviews_count: 540, total_orders: 540,
    commission_rate: 0.10, nit: '901.008.442-6',
    owner: { full_name: 'Marta Valencia', phone: '3161110004', email: 'punta@turafood.com' },
    zone: 'Continente',
    created_at: new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString(),
  },
];

const LOCAL_COURIERS = [
  {
    id: '40000000-0000-4000-8000-0000000000f2',
    full_name: 'Carlos Mina', phone: '3162220002',
    vehicle_type: 'motorcycle', plate: 'KJT-92A',
    status: 'offline', approval_status: 'pending_review',
    total_deliveries: 0, rating: 5.0, zone: 'Centro',
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: '40000000-0000-4000-8000-0000000000f3',
    full_name: 'Luis Fernando Angulo', phone: '3162220003',
    vehicle_type: 'bicycle', plate: null,
    status: 'offline', approval_status: 'pending_review',
    total_deliveries: 0, rating: 5.0, zone: 'Isla Cascajal',
    created_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
  {
    id: '40000000-0000-4000-8000-0000000000f1',
    full_name: 'Yeison Mosquera', phone: '3162220001',
    vehicle_type: 'motorcycle', plate: 'WQR-18C',
    status: 'online', approval_status: 'active',
    total_deliveries: 486, rating: 4.9, zone: 'Centro',
    created_at: new Date(Date.now() - 200 * 24 * 3600 * 1000).toISOString(),
  },
];

/** Documentos exigidos por vertical — alimenta el panel de verificación */
export const REQUIRED_DOCS = {
  business: [
    { key: 'rut', label: 'RUT actualizado', meta: 'PDF · DIAN' },
    { key: 'camara', label: 'Cámara de Comercio', meta: 'PDF · no mayor a 90 días' },
    { key: 'cedula', label: 'Cédula del representante', meta: 'Imagen · ambas caras' },
    { key: 'sanidad', label: 'Concepto sanitario', meta: 'PDF · Secretaría de Salud' },
  ],
  courier: [
    { key: 'cedula', label: 'Cédula', meta: 'Imagen · ambas caras' },
    { key: 'licencia', label: 'Licencia de conducción', meta: 'Imagen · vigente' },
    { key: 'soat', label: 'SOAT', meta: 'PDF · vigente' },
    { key: 'tecnomecanica', label: 'Tecnomecánica', meta: 'PDF · vigente' },
  ],
};
