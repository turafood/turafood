#!/usr/bin/env node
/**
 * TURAFOOD — AUDITORÍA DE SEGURIDAD CONTRA SUPABASE REAL
 *
 * Se parece a lo que haría alguien malintencionado con la llave pública (anon):
 * intenta leer lo que no debe y escribir lo que no debe. Si algo de esto pasa,
 * es una falla de verdad. Úsala después de CUALQUIER cambio de políticas (RLS),
 * funciones o migraciones.
 *
 *   node turafood-supabase/scripts/auditoria-seguridad.mjs
 *
 * Variables (opcionales): SUPABASE_URL, SUPABASE_ANON_KEY. Si no, lee la URL y la
 * anon key de turafood-app/.env.local (la anon key es pública por diseño).
 *
 * Seguridad de la propia prueba: solo crea DOS sesiones anónimas desechables y
 * ataca SUS PROPIAS filas (una contra la otra). Nunca toca datos de personas
 * reales ni crea pedidos. Las sesiones anónimas de prueba las barre
 * limpiar-datos-de-prueba.sql.
 *
 * Termina con código 1 si alguna comprobación falla (sirve en CI).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
function envLocal(nombre) {
  try {
    const t = readFileSync(path.join(aqui, '..', '..', 'turafood-app', '.env.local'), 'utf8');
    return t.match(new RegExp(`^${nombre}=(.*)$`, 'm'))?.[1]?.trim();
  } catch { return undefined; }
}
const URL_ = process.env.SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL');
const KEY = process.env.SUPABASE_ANON_KEY || envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
if (!URL_ || !KEY) { console.error('Falta SUPABASE_URL / SUPABASE_ANON_KEY'); process.exit(2); }

/** Lo que un visitante SIN sesión puede leer a propósito (catálogo público) */
const PUBLICAS = new Set([
  'business_hours', 'business_profiles', 'product_categories', 'product_extras', 'products',
  'referral_config', 'restaurant_plans', 'conocimiento_docs', 'reviews',
]);

let fallos = 0, total = 0;
function chequear(nombre, ok, detalle = '') {
  total++;
  if (!ok) fallos++;
  console.log(`${ok ? '  OK ' : ' FALLA'}  ${nombre}${detalle ? `  — ${detalle}` : ''}`);
}

async function http(ruta, { metodo = 'GET', token = KEY, cuerpo, prefer } = {}) {
  const r = await fetch(`${URL_}${ruta}`, {
    method: metodo,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${token}`,
      ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, data };
}
const filas = (r) => (Array.isArray(r.data) ? r.data.length : 0);
const bloqueado = (r) => r.status >= 400 || filas(r) === 0;

async function sesionAnonima() {
  const r = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: {} });
  if (!r.data?.access_token) throw new Error('No se pudo abrir sesión anónima: ' + JSON.stringify(r.data));
  return { token: r.data.access_token, id: r.data.user.id };
}

console.log(`\nAuditoría de seguridad — ${URL_}\n`);

// ---------------------------------------------------------------- 1. barrido de tablas
console.log('1) Visitante SIN sesión: ¿qué tablas y vistas devuelven filas?');
// PostgREST ya no lista el esquema a visitantes, así que la lista va aquí.
// MANTENLA al día: al crear una tabla o vista nueva en public, agrégala (y si debe ser
// pública a propósito, también a PUBLICAS). Para regenerarla:
//   select string_agg(quote_literal(relname), ', ' order by relname) from pg_class
//    where relnamespace='public'::regnamespace and relkind in ('r','v','m')
//      and relname not in ('spatial_ref_sys','geography_columns','geometry_columns');
const objetos = [
  'addresses', 'ai_agent_calls', 'business_documents', 'business_hours', 'business_profiles', 'business_team_members',
  'conocimiento_docs', 'coupons', 'courier_locations', 'courier_profiles', 'delivery_zones', 'favorites', 'internal_config',
  'marketing_contacts', 'marketing_events', 'marketing_queue', 'messages', 'negocios_recien_llegados', 'notifications',
  'order_items', 'order_offers', 'orders', 'payment_events', 'payment_methods', 'payments', 'payout_requests',
  'product_categories', 'product_events', 'product_extras', 'product_performance', 'products', 'profiles',
  'push_subscriptions', 'referral_config', 'referrals', 'repartidores_recien_llegados', 'restaurant_plans',
  'restaurant_subscriptions', 'reviews', 'service_requests', 'social_accounts', 'social_messages', 'social_posts',
  'social_threads', 'subscription_plans', 'subscriptions', 'support_messages', 'support_tickets', 'wallet_transactions',
  'wallets',
];
for (const t of objetos) {
  const r = await http(`/rest/v1/${t}?select=*&limit=1`);
  const expone = filas(r) > 0;
  if (PUBLICAS.has(t)) continue;               // públicas a propósito
  chequear(`"${t}" no devuelve filas sin sesión`, !expone);
}

// ---------------------------------------------------------------- 2. ataques anónimos
console.log('\n2) Visitante SIN sesión intenta escribir');
const sinPerfil = await http('/rest/v1/profiles?id=eq.00000000-0000-0000-0000-000000000000', { metodo: 'PATCH', cuerpo: { role: 'admin' }, prefer: 'return=representation' });
chequear('no puede modificar perfiles', bloqueado(sinPerfil), `HTTP ${sinPerfil.status}`);
const sinPedido = await http('/rest/v1/orders?id=eq.00000000-0000-0000-0000-000000000000', { metodo: 'PATCH', cuerpo: { status: 'cancelled' }, prefer: 'return=representation' });
chequear('no puede modificar pedidos', bloqueado(sinPedido), `HTTP ${sinPedido.status}`);
const sinResena = await http('/rest/v1/reviews', { metodo: 'POST', cuerpo: { business_id: '00000000-0000-0000-0000-000000000000', customer_id: '00000000-0000-0000-0000-000000000000', business_rating: 1 } });
chequear('no puede publicar reseñas', sinResena.status >= 400, `HTTP ${sinResena.status}`);
// 401/403 = sin permiso; 404 = PostgREST ni siquiera la ve (también es "bloqueado")
const bloqueadaRpc = (r) => [400, 401, 403, 404].includes(r.status);
for (const f of ['find_nearby_couriers', 'enqueue_marketing_event', 'admin_overview']) {
  const r = await http(`/rest/v1/rpc/${f}`, { metodo: 'POST', cuerpo: {} });
  chequear(`no puede llamar ${f}()`, bloqueadaRpc(r), `HTTP ${r.status}`);
}

// ---------------------------------------------------------------- 3. dos sesiones anónimas
console.log('\n3) Cliente invitado (sesión anónima) contra otro cliente');
const A = await sesionAnonima();
const B = await sesionAnonima();
const hA = { token: A.token };

const ascenso = await http(`/rest/v1/profiles?id=eq.${A.id}`, { metodo: 'PATCH', ...hA, cuerpo: { role: 'admin' }, prefer: 'return=representation' });
chequear('NO puede ascenderse a admin (profiles.role)', bloqueado(ascenso), `HTTP ${ascenso.status}`);
const rolFinal = await http(`/rest/v1/profiles?select=role&id=eq.${A.id}`, hA);
chequear('su rol sigue siendo customer', rolFinal.data?.[0]?.role === 'customer', `rol=${rolFinal.data?.[0]?.role}`);

const plus = await http(`/rest/v1/profiles?id=eq.${A.id}`, { metodo: 'PATCH', ...hA, cuerpo: { tura_plus: true, rating: 5 }, prefer: 'return=representation' });
chequear('NO puede darse tura_plus ni rating', bloqueado(plus), `HTTP ${plus.status}`);

const propio = await http(`/rest/v1/profiles?id=eq.${A.id}`, { metodo: 'PATCH', ...hA, cuerpo: { full_name: 'Prueba A' }, prefer: 'return=representation' });
chequear('SÍ puede cambiar su propio nombre', filas(propio) === 1, `HTTP ${propio.status}`);

await http(`/rest/v1/profiles?id=eq.${B.id}`, { metodo: 'PATCH', ...hA, cuerpo: { full_name: 'HACKEADO' }, prefer: 'return=representation' });
const deB = await http(`/rest/v1/profiles?select=full_name&id=eq.${B.id}`, { token: B.token });
chequear('NO puede cambiar el perfil de otro cliente', deB.data?.[0]?.full_name !== 'HACKEADO', `nombre de B = ${deB.data?.[0]?.full_name ?? '(vacío)'}`);

const perfiles = await http(`/rest/v1/profiles?select=id&id=neq.${A.id}&limit=5`, hA);
chequear('NO puede leer perfiles ajenos', filas(perfiles) === 0, `${filas(perfiles)} filas`);
const pedidos = await http('/rest/v1/orders?select=id&limit=5', hA);
chequear('NO puede leer pedidos ajenos', filas(pedidos) === 0, `${filas(pedidos)} filas`);
const chats = await http('/rest/v1/messages?select=id&limit=5', hA);
chequear('NO puede leer chats ajenos', filas(chats) === 0, `${filas(chats)} filas`);
const cola = await http('/rest/v1/marketing_queue?select=id&limit=1', hA);
chequear('NO puede leer marketing_queue', bloqueado(cola), `HTTP ${cola.status}`);
const directo = await http('/rest/v1/orders', { metodo: 'POST', ...hA, cuerpo: { customer_id: A.id, business_id: '00000000-0000-0000-0000-000000000000', status: 'pending' } });
chequear('NO puede crear pedidos escribiendo en la tabla', directo.status >= 400, `HTTP ${directo.status}`);
const resenaFalsa = await http('/rest/v1/reviews', { metodo: 'POST', ...hA, cuerpo: { business_id: '00000000-0000-0000-0000-000000000000', customer_id: A.id, business_rating: 1 } });
chequear('NO puede publicar reseñas sin un pedido suyo', resenaFalsa.status >= 400, `HTTP ${resenaFalsa.status}`);
for (const f of ['find_nearby_couriers', 'enqueue_marketing_event', 'admin_overview', 'settle_payout']) {
  const r = await http(`/rest/v1/rpc/${f}`, { metodo: 'POST', ...hA, cuerpo: {} });
  chequear(`NO puede llamar ${f}()`, r.status === 401 || r.status === 403 || r.status === 400 || r.status === 404, `HTTP ${r.status}`);
}

// ---------------------------------------------------------------- 4. dirección y cobertura
console.log('\n4) Direcciones y cobertura (las valida el servidor, no solo la pantalla)');
const cali = await http('/rest/v1/rpc/guardar_direccion', { metodo: 'POST', ...hA, cuerpo: { p_label: 'Casa', p_address: 'Calle 5 # 38-10', p_lat: 3.4516, p_lng: -76.532 } });
chequear('rechaza una dirección en Cali', cali.status >= 400, cali.data?.message ?? `HTTP ${cali.status}`);
const sinPunto = await http('/rest/v1/rpc/guardar_direccion', { metodo: 'POST', ...hA, cuerpo: { p_label: 'Casa', p_address: 'Carrera 3 # 4-58' } });
chequear('rechaza una dirección sin ubicación', sinPunto.status >= 400, sinPunto.data?.message ?? `HTTP ${sinPunto.status}`);

// ---------------------------------------------------------------- 5. catálogo sigue público
console.log('\n5) Lo público sigue público');
const neg = await http('/rest/v1/business_profiles?select=id&status=eq.active&limit=2');
chequear('un visitante ve el catálogo de negocios', filas(neg) > 0, `${filas(neg)} negocios`);
const prod = await http('/rest/v1/products?select=id&limit=2');
chequear('un visitante ve los productos', filas(prod) > 0, `${filas(prod)} productos`);

console.log(`\n${fallos === 0 ? 'TODO BIEN' : 'HAY FALLAS'}: ${total - fallos}/${total} comprobaciones pasaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
