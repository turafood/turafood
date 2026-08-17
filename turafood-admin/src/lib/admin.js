/**
 * CAPA DE DATOS DE LA CONSOLA
 *
 * Mismo trato que en la app de negocios: si hay credenciales de
 * Supabase se consulta la base de verdad; si no, se devuelven los
 * datos de la maqueta. Así se puede revisar cada pantalla sin tener
 * que sembrar la base primero, y sin que ninguna pantalla tenga que
 * saber en cuál de los dos modos está.
 *
 * Todo lo que MODIFICA algo pasa por una función de la base
 * (`admin_*`), nunca por un UPDATE suelto: aprobar un negocio también
 * tiene que dejar quién lo aprobó, y eso no se le confía al navegador.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

const isLive = () => isConfigured();

/** Un respiro para que el esqueleto de carga se alcance a ver */
const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

/* ================================================================
   RESUMEN
   ================================================================ */

export async function getOverview() {
  if (!isLive()) {
    await delay();
    return LOCAL_OVERVIEW;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw new Error(`No se pudo cargar el resumen: ${error.message}`);
  return data;
}

/** Venta y comisión de los últimos N días, para la barra doble del tablero */
export async function getGmvSeries(days = 7) {
  if (!isLive()) {
    await delay();
    return LOCAL_GMV;
  }

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('subtotal, business_commission, created_at, status')
    .eq('status', 'delivered')
    .gte('created_at', from.toISOString());

  if (error) throw new Error(`No se pudo cargar el GMV: ${error.message}`);

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { date: d, gross: 0, fee: 0 });
  }

  (data ?? []).forEach((o) => {
    const b = buckets.get(String(o.created_at).slice(0, 10));
    if (!b) return;
    b.gross += Number(o.subtotal ?? 0);
    b.fee += Number(o.business_commission ?? 0);
  });

  return Array.from(buckets.values());
}

/* ================================================================
   NEGOCIOS
   ================================================================ */

export async function getBusinesses({ status } = {}) {
  if (!isLive()) {
    await delay();
    return status ? LOCAL_BUSINESSES.filter((b) => b.status === status) : LOCAL_BUSINESSES;
  }

  const supabase = createClient();
  let query = supabase
    .from('business_profiles')
    .select(`
      id, name, slug, vertical, category, address, phone, logo_url,
      status, rejection_reason, rating, reviews_count, total_orders,
      commission_rate, is_open, created_at, reviewed_at
    `)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los negocios: ${error.message}`);
  return data ?? [];
}

/** Documentos que el negocio subió, para la pantalla de aprobación */
export async function getBusinessDocuments(businessId) {
  if (!isLive()) {
    await delay(160);
    return LOCAL_DOCS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('business_documents')
    .select('id, kind, file_name, file_path, status, created_at')
    .eq('business_id', businessId)
    .order('created_at');

  if (error) throw new Error(`No se pudieron cargar los documentos: ${error.message}`);
  return data ?? [];
}

export async function reviewBusiness(businessId, approve, reason = null) {
  if (!isLive()) {
    await delay(400);
    return { id: businessId, status: approve ? 'active' : 'rejected' };
  }

  const { data, error } = await createClient().rpc('admin_review_business', {
    p_business_id: businessId,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function setBusinessStatus(businessId, status, reason = null) {
  if (!isLive()) {
    await delay(400);
    return { id: businessId, status };
  }

  const { data, error } = await createClient().rpc('admin_set_business_status', {
    p_business_id: businessId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ================================================================
   REPARTIDORES
   ================================================================ */

export async function getCouriers() {
  if (!isLive()) {
    await delay();
    return LOCAL_COURIERS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('courier_profiles')
    .select(`
      id, status, approval_status, rejection_reason, vehicle_type, plate,
      acceptance_rate, total_deliveries, total_earnings, created_at,
      profiles ( full_name, phone, email, avatar_url, rating )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`No se pudieron cargar los repartidores: ${error.message}`);

  // Aplanamos el join para que las pantallas no tengan que saber que
  // el nombre vive en otra tabla.
  return (data ?? []).map((c) => ({
    ...c,
    full_name: c.profiles?.full_name ?? 'Sin nombre',
    phone: c.profiles?.phone ?? null,
    email: c.profiles?.email ?? null,
    rating: c.profiles?.rating ?? null,
  }));
}

export async function reviewCourier(courierId, approve, reason = null) {
  if (!isLive()) {
    await delay(400);
    return { id: courierId, approval_status: approve ? 'active' : 'rejected' };
  }

  const { data, error } = await createClient().rpc('admin_review_courier', {
    p_courier_id: courierId,
    p_approve: approve,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ================================================================
   OPERACIÓN EN VIVO
   ================================================================ */

export async function getLiveOrders() {
  if (!isLive()) {
    await delay();
    return LOCAL_LIVE_ORDERS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total, created_at, mode,
      business_profiles ( name ),
      profiles!orders_customer_id_fkey ( full_name )
    `)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw new Error(`No se pudieron cargar los pedidos: ${error.message}`);

  return (data ?? []).map((o) => ({
    ...o,
    business_name: o.business_profiles?.name ?? '—',
    customer_name: o.profiles?.full_name ?? '—',
  }));
}

/** Repartidores conectados, con su última posición conocida */
export async function getFleet() {
  if (!isLive()) {
    await delay();
    return LOCAL_FLEET;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('courier_profiles')
    .select(`
      id, status, vehicle_type, plate,
      profiles ( full_name, rating )
    `)
    .eq('approval_status', 'active')
    .in('status', ['online', 'busy'])
    .limit(60);

  if (error) throw new Error(`No se pudo cargar la flota: ${error.message}`);

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.profiles?.full_name ?? 'Sin nombre',
    rating: c.profiles?.rating ?? null,
    vehicle: c.vehicle_type,
    plate: c.plate,
    state: c.status === 'busy' ? 'en_ruta' : 'libre',
  }));
}

/* ================================================================
   SERVICIOS (Growth Partner)
   ================================================================ */

export async function getServiceRequests() {
  if (!isLive()) {
    await delay();
    return LOCAL_SERVICES;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select(`
      id, kind, status, payload, team_notes, reject_reason,
      submitted_at, created_at, updated_at,
      business_profiles ( name, vertical )
    `)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (error) throw new Error(`No se pudieron cargar las solicitudes: ${error.message}`);

  return (data ?? []).map((r) => ({
    ...r,
    business_name: r.business_profiles?.name ?? '—',
  }));
}

export async function setServiceStatus(requestId, status, notes = null) {
  if (!isLive()) {
    await delay(400);
    return { id: requestId, status };
  }

  const { data, error } = await createClient().rpc('admin_set_service_status', {
    p_request_id: requestId,
    p_status: status,
    p_notes: notes,
  });
  if (error) throw new Error(error.message);
  return data;
}

/* ================================================================
   SOPORTE
   ================================================================ */

export async function getTickets() {
  if (!isLive()) {
    await delay();
    return LOCAL_TICKETS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, category, priority, status, created_at, updated_at, user_id')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) throw new Error(`No se pudieron cargar los tickets: ${error.message}`);
  return data ?? [];
}

/* ================================================================
   USUARIOS
   ================================================================ */

export async function getUsers() {
  if (!isLive()) {
    await delay();
    return LOCAL_USERS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email, phone, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(`No se pudieron cargar los usuarios: ${error.message}`);
  return data ?? [];
}

/* ================================================================
   MARKETING (cola de MailerLite)
   ================================================================ */

export async function getMarketingQueue() {
  if (!isLive()) {
    await delay();
    return LOCAL_MARKETING;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  // La tabla puede no existir todavía si la migración no se aplicó:
  // no rompemos la pantalla por eso.
  if (error) return [];
  return data ?? [];
}

/* ================================================================
   FINANZAS
   ================================================================ */

export async function getPayoutCut() {
  if (!isLive()) {
    await delay();
    return LOCAL_PAYOUT_CUT;
  }

  const supabase = createClient();
  const from = new Date();
  from.setDate(from.getDate() - 7);

  const { data, error } = await supabase
    .from('orders')
    .select('business_id, subtotal, business_commission, business_profiles ( name, logo_url )')
    .eq('status', 'delivered')
    .gte('created_at', from.toISOString());

  if (error) throw new Error(`No se pudo calcular el corte: ${error.message}`);

  const byBusiness = new Map();
  (data ?? []).forEach((o) => {
    const key = o.business_id;
    const entry = byBusiness.get(key) ?? {
      id: key,
      name: o.business_profiles?.name ?? '—',
      logo_url: o.business_profiles?.logo_url ?? null,
      orders: 0, gross: 0, fee: 0,
    };
    entry.orders += 1;
    entry.gross += Number(o.subtotal ?? 0);
    entry.fee += Number(o.business_commission ?? 0);
    byBusiness.set(key, entry);
  });

  return Array.from(byBusiness.values())
    .map((b) => ({ ...b, net: b.gross - b.fee, state: 'lista' }))
    .sort((a, b) => b.gross - a.gross);
}

/* ================================================================
   ETIQUETAS COMPARTIDAS
   ================================================================ */

export const BUSINESS_STATUS = {
  pending_review: { label: 'EN REVISIÓN', bg: '#FFF7E6', color: '#A8730B' },
  active:         { label: 'ACTIVO',      bg: '#E6F6EE', color: '#0B8E54' },
  rejected:       { label: 'RECHAZADO',   bg: '#FFF0ED', color: '#C0341A' },
  suspended:      { label: 'SUSPENDIDO',  bg: '#F0EEE9', color: '#8C857B' },
  closed:         { label: 'CERRADO',     bg: '#F0EEE9', color: '#8C857B' },
};

export const COURIER_STATUS = {
  pending_review: { label: 'EN REVISIÓN', bg: '#FFF7E6', color: '#A8730B' },
  active:         { label: 'ACTIVO',      bg: '#E6F6EE', color: '#0B8E54' },
  rejected:       { label: 'RECHAZADO',   bg: '#FFF0ED', color: '#C0341A' },
  suspended:      { label: 'SUSPENDIDO',  bg: '#FFF0ED', color: '#C0341A' },
};

export const SERVICE_STATUS = {
  draft:       { label: 'BORRADOR',   bg: '#F0EEE9', color: '#8C857B' },
  submitted:   { label: 'POR REVISAR', bg: '#FFF7E6', color: '#A8730B' },
  in_progress: { label: 'MONTANDO',   bg: '#EAF1FF', color: '#2E6BFF' },
  active:      { label: 'ACTIVO',     bg: '#E6F6EE', color: '#0B8E54' },
  rejected:    { label: 'RECHAZADO',  bg: '#FFF0ED', color: '#C0341A' },
  cancelled:   { label: 'CANCELADO',  bg: '#F0EEE9', color: '#8C857B' },
};

export const SERVICE_KIND = {
  gmb: 'Ficha de Google',
  google_ads: 'Campañas en Google',
  voice_agent: 'Agente de voz',
  booking: 'Reservas',
  website: 'Sitio web',
  custom_app: 'App a la medida',
  other: 'Otro servicio',
};

export const VERTICAL = {
  restaurant: { label: 'Restaurante', bg: '#FFF0ED', color: '#C0341A' },
  market:     { label: 'Minimercado', bg: '#E6F6EE', color: '#0B8E54' },
  pharmacy:   { label: 'Farmacia',    bg: '#EAF1FF', color: '#2E6BFF' },
  liquor:     { label: 'Licorera',    bg: '#F3ECFF', color: '#6B2FD6' },
  store:      { label: 'Tienda',      bg: '#FFF7E6', color: '#A8730B' },
};

export const DOC_KIND = {
  rut: 'RUT',
  chamber: 'Cámara de comercio',
  id_card: 'Cédula del representante',
  health: 'Concepto sanitario',
  bank: 'Certificación bancaria',
  license: 'Licencia de conducción',
  soat: 'SOAT',
  tech: 'Tecnomecánica',
};

/** Estados de pedido en palabras que se entienden de un vistazo */
export const ORDER_STATUS = {
  pending:          { label: 'Sin confirmar',   color: '#A8730B' },
  accepted:         { label: 'Aceptado',        color: '#2E6BFF' },
  preparing:        { label: 'En cocina',       color: '#2E6BFF' },
  ready:            { label: 'Listo',           color: '#6B2FD6' },
  courier_assigned: { label: 'Repartidor en camino', color: '#6B2FD6' },
  picked_up:        { label: 'En ruta',         color: '#0B8E54' },
  delivered:        { label: 'Entregado',       color: '#0B8E54' },
  cancelled:        { label: 'Cancelado',       color: '#C0341A' },
};

/* ================================================================
   DATOS DE LA MAQUETA
   Las cifras son las del mockup, para poder comparar pantalla contra
   diseño sin tener que sembrar la base.
   ================================================================ */

const LOCAL_OVERVIEW = {
  negocios:     { pendientes: 9, activos: 142, suspendidos: 3 },
  repartidores: { pendientes: 2, activos: 58, en_linea: 34 },
  pedidos:      { hoy: 386, en_curso: 47, entregados_hoy: 339 },
  plata:        { bruto_hoy: 7943700, comision_hoy: 1430000, bruto_mes: 112400000, comision_mes: 19600000 },
  servicios:    { por_revisar: 4, montando: 3, activos: 11 },
  soporte:      { abiertos: 5, esperando: 2 },
  marketing:    { pendientes: 3, fallidos: 0, enviados: 128 },
};

const LOCAL_GMV = [
  ['Jue', 4000000], ['Vie', 5400000], ['Sáb', 4900000], ['Dom', 7000000],
  ['Lun', 6000000], ['Mar', 5300000], ['Mié', 4100000],
].map(([label, gross], i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return { date: d, label, gross, fee: Math.round(gross * 0.174) };
});

const LOCAL_BUSINESSES = [
  {
    id: 'b1', name: 'Asadero El Puerto', vertical: 'restaurant', address: 'Cra. 3 # 4-58, Centro',
    status: 'active', rating: 4.8, total_orders: 211, commission_rate: 0.18, is_open: true,
    phone: '+57 320 445 1189', created_at: '2026-05-12T10:00:00Z', gmv_month: 3200000, branches: 3,
  },
  {
    id: 'b2', name: 'Marisquería El Faro', vertical: 'restaurant', address: 'Centro',
    status: 'active', rating: 4.9, total_orders: 184, commission_rate: 0.18, is_open: true,
    phone: '+57 315 220 4471', created_at: '2026-05-20T10:00:00Z', gmv_month: 2900000,
  },
  {
    id: 'b3', name: 'Burger House Bahía', vertical: 'restaurant', address: 'Comuna 4',
    status: 'active', rating: 4.6, total_orders: 167, commission_rate: 0.20, is_open: true,
    phone: '+57 318 990 2210', created_at: '2026-06-01T10:00:00Z', gmv_month: 2100000,
  },
  {
    id: 'b4', name: 'Supermercado La Bahía', vertical: 'market', address: 'Centro',
    status: 'active', rating: 4.5, total_orders: 143, commission_rate: 0.12, is_open: true,
    phone: '+57 317 553 8890', created_at: '2026-06-08T10:00:00Z', gmv_month: 1800000,
  },
  {
    id: 'b5', name: 'Droguería La Salud', vertical: 'pharmacy', address: 'Cl. 6 # 3-12, Centro',
    status: 'pending_review', rating: null, total_orders: 0, commission_rate: 0.14, is_open: false,
    phone: '+57 320 445 1189', created_at: hoursAgo(2), representative: 'Luz Mery Riascos',
    nit: '901.882.114-2', email: 'luzmery@lasalud.co', bank: 'Bancolombia Ahorros *** 8812',
    docs_ok: 4, docs_total: 4, risk: 'bajo',
  },
  {
    id: 'b6', name: 'Minimercado Nuevo Amanecer', vertical: 'market', address: 'Barrio Nuevo Amanecer, Comuna 12',
    status: 'pending_review', rating: null, total_orders: 0, commission_rate: 0.12, is_open: false,
    phone: '+57 314 782 3390', created_at: hoursAgo(6), representative: 'Jhon Castillo',
    nit: '1.111.784.229-1', email: 'jhon@amanecer.co', bank: 'Nequi *** 3390',
    docs_ok: 3, docs_total: 4, risk: 'medio',
  },
  {
    id: 'b7', name: 'Licorera El Puerto Azul', vertical: 'liquor', address: 'Cra. 4 # 8-30, Centro',
    status: 'pending_review', rating: null, total_orders: 0, commission_rate: 0.16, is_open: false,
    phone: '+57 313 445 7712', created_at: hoursAgo(28), representative: 'Deiner Riascos',
    nit: '901.554.201-7', email: 'contacto@puertoazul.co', bank: 'Bancolombia Ahorros *** 1120',
    docs_ok: 4, docs_total: 4, risk: 'bajo',
  },
  {
    id: 'b8', name: 'Picadas El Jorge', vertical: 'restaurant', address: 'Comuna 4',
    status: 'suspended', rating: 3.9, total_orders: 12, commission_rate: 0.18, is_open: false,
    phone: '+57 316 220 1145', created_at: '2026-04-02T10:00:00Z', gmv_month: 200000,
    rejection_reason: 'Rechazos reiterados de pedidos ya aceptados.',
  },
];

const LOCAL_DOCS = [
  { id: 'd1', kind: 'rut', file_name: 'RUT', status: 'approved', size: 'PDF · 420 KB' },
  { id: 'd2', kind: 'chamber', file_name: 'Cámara de comercio', status: 'approved', size: 'PDF · 1,2 MB · emitido hace 34 días' },
  { id: 'd3', kind: 'id_card', file_name: 'Cédula representante', status: 'approved', size: 'JPG · 780 KB' },
  { id: 'd4', kind: 'health', file_name: 'Concepto sanitario', status: 'approved', size: 'PDF · 610 KB' },
];

const LOCAL_COURIERS = [
  { id: 'c1', full_name: 'Yeison Mosquera', doc: 'CC 1.111.234.556', zone: 'Centro · El Piloto', vehicle_type: 'moto', plate: 'WQR-18C', total_deliveries: 1284, rating: 4.9, acceptance_rate: 0.96, approval_status: 'active', status: 'online' },
  { id: 'c2', full_name: 'Karen Juárez', doc: 'CC 1.006.882.101', zone: 'Juan XXIII', vehicle_type: 'moto', plate: 'TKS-92B', total_deliveries: 842, rating: 4.8, acceptance_rate: 0.91, approval_status: 'active', status: 'online' },
  { id: 'c3', full_name: 'Brayan Cuero', doc: 'CC 1.110.774.220', zone: 'El Jorge', vehicle_type: 'bici', plate: null, total_deliveries: 318, rating: 4.7, acceptance_rate: 0.88, approval_status: 'active', status: 'offline' },
  { id: 'c4', full_name: 'Sofía Angulo', doc: 'CC 1.344.902.318', zone: 'Centro', vehicle_type: 'moto', plate: null, total_deliveries: 0, rating: null, acceptance_rate: null, approval_status: 'pending_review', status: 'offline', docs: { cedula: true, licencia: true, soat: true, tecnomecanica: true }, missing: 1 },
  { id: 'c5', full_name: 'Deiner Riascos', doc: 'CC 1.007.551.904', zone: 'La Playita', vehicle_type: 'moto', plate: null, total_deliveries: 0, rating: null, acceptance_rate: null, approval_status: 'pending_review', status: 'offline', docs: { cedula: true, licencia: true, soat: true, tecnomecanica: true }, missing: 3 },
  { id: 'c6', full_name: 'Nelson Vidal', doc: 'CC 16.482.310', zone: 'Zona Portuaria', vehicle_type: 'carro', plate: 'HJK-220', total_deliveries: 611, rating: 4.2, acceptance_rate: 0.64, approval_status: 'suspended', status: 'offline' },
];

const LOCAL_FLEET = [
  { id: 'f1', name: 'Yeison Mosquera', vehicle: 'moto', plate: 'WQR-18C', rating: 4.9, state: 'en_ruta' },
  { id: 'f2', name: 'Luis Alfonso Payán', vehicle: 'moto', plate: 'TKS-92B', rating: 4.8, state: 'en_ruta' },
  { id: 'f3', name: 'Jhon Edward Bonilla', vehicle: 'moto', plate: 'PLM-44A', rating: 4.6, state: 'retrasado' },
  { id: 'f4', name: 'Kevin Valencia', vehicle: 'bici', plate: null, rating: 4.7, state: 'libre' },
  { id: 'f5', name: 'Maicol Arboleda', vehicle: 'moto', plate: 'RTS-71D', rating: 4.9, state: 'libre' },
];

const LOCAL_LIVE_ORDERS = [
  { id: 'o1', order_number: '#4821', business_name: 'Asadero El Puerto', customer_name: 'Sharick Grajales', total: 78300, status: 'picked_up', created_at: minutesAgo(12) },
  { id: 'o2', order_number: '#4820', business_name: 'Marisquería El Faro', customer_name: 'Andrés Riascos', total: 112400, status: 'preparing', created_at: minutesAgo(16) },
  { id: 'o3', order_number: '#4818', business_name: 'Burger House Bahía', customer_name: 'Marleny Cuero', total: 41800, status: 'courier_assigned', created_at: minutesAgo(21) },
  { id: 'o4', order_number: '#4815', business_name: 'Supermercado La Bahía', customer_name: 'Delvid Mosquera', total: 146200, status: 'ready', created_at: minutesAgo(27) },
  { id: 'o5', order_number: '#4811', business_name: 'Picadas El Jorge', customer_name: 'Yurany Valencia', total: 22900, status: 'accepted', created_at: minutesAgo(33) },
  { id: 'o6', order_number: '#4808', business_name: 'Asadero El Puerto', customer_name: 'Carlos Angulo', total: 58400, status: 'pending', created_at: minutesAgo(38) },
];

const LOCAL_SERVICES = [
  { id: 's1', kind: 'gmb', status: 'submitted', business_name: 'Droguería La Salud', payload: { plan: 'managed' }, submitted_at: hoursAgo(3) },
  { id: 's2', kind: 'google_ads', status: 'in_progress', business_name: 'Asadero El Puerto', payload: { plan: 'crecimiento' }, submitted_at: hoursAgo(26) },
  { id: 's3', kind: 'voice_agent', status: 'active', business_name: 'Marisquería El Faro', payload: { plan: 'pedidos' }, submitted_at: hoursAgo(96) },
  { id: 's4', kind: 'booking', status: 'submitted', business_name: 'Burger House Bahía', payload: { plan: 'reservas' }, submitted_at: hoursAgo(9) },
  { id: 's5', kind: 'website', status: 'submitted', business_name: 'Minimercado Nuevo Amanecer', payload: {}, submitted_at: hoursAgo(48) },
];

const LOCAL_TICKETS = [
  { id: 't1', ref: '#TS-4788', subject: 'Producto faltante en el pedido', body: 'El cliente dice que no recibió el encocado de jaiba. El negocio afirma que sí lo despachó.', who: 'Marleny Cuero', priority: 'alta', status: 'open', action: 'Resolver', created_at: minutesAgo(22) },
  { id: 't2', ref: '#TS-4771', subject: 'Cobro duplicado con Nequi', body: 'Se registraron dos débitos de $41.800 por el mismo pedido.', who: 'Andrés Riascos', priority: 'alta', status: 'open', action: 'Reembolsar', created_at: hoursAgo(1) },
  { id: 't3', ref: '#TS-4762', subject: 'Repartidor no encontró la dirección', body: 'Pedido devuelto al negocio. Cliente pide reenvío sin costo.', who: 'Yurany Valencia', priority: 'media', status: 'open', action: 'Reasignar', created_at: hoursAgo(2) },
  { id: 't4', ref: '#TS-4755', subject: 'Negocio pide cambiar cuenta bancaria', body: 'Solicita pasar de Nequi a Bancolombia antes del corte del viernes.', who: 'Jhon Castillo · Asadero El Puerto', priority: 'media', status: 'open', action: 'Verificar', created_at: hoursAgo(4) },
  { id: 't5', ref: '#TS-4750', subject: 'Cliente reporta trato inadecuado', body: 'Reporte contra el repartidor Jhon Edward Bonilla. Requiere revisión de super admin.', who: 'Delvid Mosquera', priority: 'alta', status: 'open', action: 'Escalar', created_at: hoursAgo(20) },
];

const LOCAL_USERS = [
  { id: 'u1', full_name: 'Sharick Grajales', email: 'sharick@turafood.co', role: 'admin', orders: null, last: 'Ahora' },
  { id: 'u2', full_name: 'Katherine Ospina', email: 'katherine@turafood.co', role: 'ops', orders: null, last: 'Hace 8 min' },
  { id: 'u3', full_name: 'Jhon Castillo', email: 'jhon@elpuerto.co', role: 'business', orders: null, last: 'Hace 12 min' },
  { id: 'u4', full_name: 'Luz Mery Riascos', email: 'luzmery@lasalud.co', role: 'business', orders: null, last: 'Hace 2 h' },
  { id: 'u5', full_name: 'Yeison Mosquera', email: 'yeison@turafood.co', role: 'courier', orders: 1284, last: 'Ahora' },
  { id: 'u6', full_name: 'Andrés Riascos', email: 'andres.r@gmail.com', role: 'customer', orders: 42, last: 'Hace 26 min' },
  { id: 'u7', full_name: 'Marleny Cuero', email: 'marleny.c@gmail.com', role: 'customer', orders: 8, last: 'Ayer' },
];

const LOCAL_MARKETING = [
  { id: 1, kind: 'plan_activated', group_name: 'TuraFood · Agente de voz · Activo', status: 'sent', email: 'contacto@elfaro.co', full_name: 'Marisquería El Faro', attempts: 1, created_at: hoursAgo(3), sent_at: hoursAgo(3) },
  { id: 2, kind: 'plan_requested', group_name: 'TuraFood · Ficha de Google · Solicitado', status: 'pending', email: 'luzmery@lasalud.co', full_name: 'Droguería La Salud', attempts: 0, created_at: hoursAgo(2) },
  { id: 3, kind: 'business_registered', group_name: 'TuraFood · Negocios · Nuevos', status: 'pending', email: 'jhon@amanecer.co', full_name: 'Minimercado Nuevo Amanecer', attempts: 0, created_at: hoursAgo(6) },
  { id: 4, kind: 'business_approved', group_name: 'TuraFood · Negocios · Aprobados', status: 'sent', email: 'contacto@burgerhouse.co', full_name: 'Burger House Bahía', attempts: 1, created_at: hoursAgo(30), sent_at: hoursAgo(30) },
];

const LOCAL_PAYOUT_CUT = [
  { id: 'b1', name: 'Asadero El Puerto', orders: 211, gross: 3200000, fee: 571500, net: 2603500, state: 'lista' },
  { id: 'b2', name: 'Marisquería El Faro', orders: 184, gross: 2900000, fee: 515520, net: 2348480, state: 'lista' },
  { id: 'b3', name: 'Burger House Bahía', orders: 167, gross: 2100000, fee: 417600, net: 1670400, state: 'lista' },
  { id: 'b4', name: 'Supermercado La Bahía', orders: 143, gross: 1800000, fee: 217200, net: 1592800, state: 'revisar' },
  { id: 'b9', name: 'Parrilla Punta del Este', orders: 98, gross: 1200000, fee: 223200, net: 1016800, state: 'lista' },
  { id: 'b8', name: 'Picadas El Jorge', orders: 12, gross: 200000, fee: 37800, net: 172200, state: 'retenida' },
];

/** Zonas y comisiones: hoy son constantes; cuando existan en la base
 *  se leen de `delivery_zones`. Los valores son los del mockup. */
export const ZONES = [
  { id: 'z1', name: 'Zona 1 · Centro', areas: 'Centro, Pueblo Nuevo, Muro Yusti', base: 2900, perKm: 700, min: 15000, color: '#FF441F' },
  { id: 'z2', name: 'Zona 2 · Comunas 4–7', areas: 'El Jorge, Juan XXIII, Bellavista', base: 3900, perKm: 800, min: 20000, color: '#2E6BFF' },
  { id: 'z3', name: 'Zona 3 · Punta del Este', areas: 'Punta del Este, Ciudadela San Antonio', base: 4900, perKm: 900, min: 25000, color: '#11B26A' },
  { id: 'z4', name: 'Zona 4 · Rural', areas: 'Córdoba, Zacarías, Llano Bajo', base: 8900, perKm: 1400, min: 40000, color: '#8C857B' },
];

export const COMMISSIONS = [
  { vertical: 'restaurant', label: 'Restaurantes', rate: 18, icon: 'restaurant' },
  { vertical: 'market', label: 'Mercado', rate: 12, icon: 'shopping_basket' },
  { vertical: 'pharmacy', label: 'Farmacia', rate: 14, icon: 'medication' },
  { vertical: 'liquor', label: 'Licores', rate: 16, icon: 'liquor' },
  { vertical: 'store', label: 'Tiendas y express', rate: 22, icon: 'storefront' },
];

export const PLATFORM_RULES = [
  {
    id: 'auto_approve', on: true,
    label: 'Aprobación automática de negocios',
    note: 'La tienda se publica con un límite de 20 pedidos diarios hasta la revisión manual.',
  },
  {
    id: 'own_fleet', on: true,
    label: 'Permitir flota propia del negocio',
    note: 'El negocio puede entregar con sus repartidores y pagar menos comisión.',
  },
  {
    id: 'surge', on: false,
    label: 'Cobrar tarifa dinámica en lluvia',
    note: 'Recargo automático de hasta $2.000 en horas de alta demanda.',
  },
  {
    id: 'health_doc', on: true,
    label: 'Exigir concepto sanitario a restaurantes',
    note: 'Bloquea la publicación si el documento no está aprobado.',
  },
];

export const AUDIT_LOG = [
  { who: 'Sharick Grajales', what: 'Aprobó la cuenta de Supermercado La Bahía', when: 'Hace 40 min' },
  { who: 'Sharick Grajales', what: 'Cambió la comisión de Mandados de 20% a 22%', when: 'Hace 3 h' },
  { who: 'Katherine Ospina', what: 'Suspendió Picadas El Jorge por rechazos reiterados', when: 'Hace 5 h' },
  { who: 'Katherine Ospina', what: 'Reembolsó $34.500 al cliente del pedido #TS-4744', when: 'Ayer' },
  { who: 'Sharick Grajales', what: 'Activó la zona rural con tarifa de $8.900', when: '02 ago' },
];

function hoursAgo(h) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function minutesAgo(m) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - m);
  return d.toISOString();
}

/** "Hace 2 h" — el tiempo exacto no le sirve a nadie en una lista */
export function ago(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'Ayer';
  return `Hace ${d} días`;
}

/** $7,9M — para que un número grande quepa en una tarjeta */
export function millions(v) {
  const n = Number(v ?? 0);
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1).replace('.', ',')}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${n}`;
}
