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
  'conocimiento_docs', 'coupons', 'courier_locations', 'courier_profiles', 'delivery_zones', 'favorites', 'flota_codigos',
  'flota_intentos', 'internal_config',
  'marketing_contacts', 'marketing_events', 'marketing_queue', 'messages', 'negocios_recien_llegados', 'notifications', 'order_receipts',
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

// ---------------------------------------------------------------- 4b. registro y flota propia
console.log('\n4b) Registro con rol falso y repartidores');
// Los metadatos del registro los escribe quien se registra: `role: admin` no debe dar admin
const falsoAdmin = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'admin' } } });
const rolFalso = falsoAdmin.data?.access_token
  ? await http(`/rest/v1/profiles?select=role&id=eq.${falsoAdmin.data.user.id}`, { token: falsoAdmin.data.access_token })
  : null;
chequear('registrarse con role=admin NO da rol admin', rolFalso?.data?.[0]?.role === 'customer', `rol=${rolFalso?.data?.[0]?.role}`);
const falsoOps = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'ops' } } });
const rolOps = falsoOps.data?.access_token
  ? await http(`/rest/v1/profiles?select=role&id=eq.${falsoOps.data.user.id}`, { token: falsoOps.data.access_token })
  : null;
chequear('registrarse con role=ops NO da rol ops', rolOps?.data?.[0]?.role === 'customer', `rol=${rolOps?.data?.[0]?.role}`);

// Un repartidor nuevo que intenta crearse ya aprobado
const rep = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'courier' } } });
const hR = { token: rep.data?.access_token };
await http('/rest/v1/courier_profiles', { metodo: 'POST', ...hR, cuerpo: { id: rep.data?.user?.id, status: 'online', approval_status: 'active', total_earnings: 999999 }, prefer: 'return=minimal' });
const miFicha = await http(`/rest/v1/courier_profiles?select=approval_status,total_earnings,business_id&id=eq.${rep.data?.user?.id}`, hR);
chequear('un repartidor NO puede crearse ya aprobado', miFicha.data?.[0]?.approval_status === 'pending_review' && Number(miFicha.data?.[0]?.total_earnings) === 0, `approval=${miFicha.data?.[0]?.approval_status}`);
const alNegocio = await http(`/rest/v1/courier_profiles?id=eq.${rep.data?.user?.id}`, { metodo: 'PATCH', ...hR, cuerpo: { business_id: '00000000-0000-4000-8000-000000000002', approval_status: 'active' }, prefer: 'return=representation' });
const trasPatch = await http(`/rest/v1/courier_profiles?select=approval_status,business_id&id=eq.${rep.data?.user?.id}`, hR);
chequear('un repartidor NO puede asignarse un negocio ni aprobarse', trasPatch.data?.[0]?.approval_status === 'pending_review' && !trasPatch.data?.[0]?.business_id, `HTTP ${alNegocio.status}`);
const ventana = await http('/rest/v1/orders?select=id&limit=5', hR);
chequear('un repartidor pendiente NO ve pedidos de nadie', filas(ventana) === 0, `${filas(ventana)} filas`);
const cod = await http('/rest/v1/rpc/flota_codigo', { metodo: 'POST', ...hR, cuerpo: {} });
chequear('un repartidor NO puede pedir el código de una flota', cod.status >= 400, cod.data?.message ?? `HTTP ${cod.status}`);
const malo = await http('/rest/v1/rpc/unirse_a_flota', { metodo: 'POST', ...hR, cuerpo: { p_codigo: 'AAAAAA' } });
chequear('un código inventado no sirve', malo.data?.ok === false, JSON.stringify(malo.data));
for (const f of ['flota_codigo', 'flota_nuevo_codigo', 'flota_mis_repartidores', 'unirse_a_flota', 'fijar_ubicacion_negocio', 'pedir_recibo_por_correo']) {
  const r = await http(`/rest/v1/rpc/${f}`, { metodo: 'POST', cuerpo: { p_codigo: 'AAAAAA' } });
  chequear(`un visitante sin sesión NO puede llamar ${f}()`, bloqueadaRpc(r), `HTTP ${r.status}`);
}

// Un negocio nuevo que intenta crearse ya aprobado, con calificación y sin comisión
const neg2 = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'business' } } });
const hN = { token: neg2.data?.access_token };
await http('/rest/v1/business_profiles', { metodo: 'POST', ...hN, prefer: 'return=minimal', cuerpo: {
  id: neg2.data?.user?.id, name: 'Auditoria (borrar)', slug: `auditoria-${Date.now()}`, address: 'x',
  status: 'active', commission_rate: 0, rating: 5, reviews_count: 999, total_orders: 999, pro_plan: true,
} });
const miNegocio = await http(`/rest/v1/business_profiles?select=status,commission_rate,rating,reviews_count,pro_plan&id=eq.${neg2.data?.user?.id}`, hN);
const n0 = miNegocio.data?.[0];
chequear('un negocio NO puede crearse ya aprobado ni con calificación o comisión a su gusto',
  n0 && n0.status !== 'active' && Number(n0.reviews_count) === 0 && n0.pro_plan === false && Number(n0.commission_rate) > 0,
  n0 ? `status=${n0.status} comisión=${n0.commission_rate} reseñas=${n0.reviews_count} pro=${n0.pro_plan}` : 'no se creó');

// Nadie pide que el recibo de un pedido AJENO llegue a su correo
const reciboAjeno = await http('/rest/v1/rpc/pedir_recibo_por_correo', { metodo: 'POST', ...hA, cuerpo: { p_order_id: '00000000-0000-4000-8000-000000000000', p_email: 'auditoria@example.com' } });
chequear('NO puede pedir el recibo de un pedido que no es suyo', reciboAjeno.status >= 400, reciboAjeno.data?.message ?? `HTTP ${reciboAjeno.status}`);
const recibosAjenos = await http('/rest/v1/order_receipts?select=email&limit=5', hA);
chequear('NO puede leer los correos de recibos ajenos', filas(recibosAjenos) === 0, `${filas(recibosAjenos)} filas`);

// No hay buscador de celulares registrados (se retiró telefono_tiene_cuenta: todo pedido verifica por SMS)
const buscador = await http('/rest/v1/rpc/telefono_tiene_cuenta', { metodo: 'POST', ...hA, cuerpo: { p_phone: '+573000000000' } });
chequear('NO existe una consulta de "¿este celular tiene cuenta?"', buscador.status >= 400, `HTTP ${buscador.status}`);

// La billetera propia no se infla desde el navegador
const bil = await http(`/rest/v1/wallets?user_id=eq.${A.id}`, { metodo: 'PATCH', ...hA, cuerpo: { credits: 999999, available_withdraw: 999999, cash_owed: 0 }, prefer: 'return=representation' });
const bilDespues = await http(`/rest/v1/wallets?select=credits,available_withdraw&user_id=eq.${A.id}`, hA);
chequear('NO puede regalarse TuraCréditos ni saldo retirable', !(Number(bilDespues.data?.[0]?.credits) >= 999999) && !(Number(bilDespues.data?.[0]?.available_withdraw) >= 999999), `credits=${bilDespues.data?.[0]?.credits} retirable=${bilDespues.data?.[0]?.available_withdraw} (HTTP ${bil.status})`);

// ...y el registro normal sigue funcionando (nace pendiente, como corresponde)
const neg3 = await http('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'business' } } });
const reg = await http('/rest/v1/rpc/register_business', { metodo: 'POST', token: neg3.data?.access_token, cuerpo: { p_name: 'Auditoria registro (borrar)', p_phone: null } });
const filaReg = Array.isArray(reg.data) ? reg.data[0] : reg.data;
chequear('un negocio SÍ puede registrarse con register_business() (nace pendiente)', reg.status < 300 && filaReg?.status === 'pending_review', `HTTP ${reg.status}, status=${filaReg?.status}`);

// ---------------------------------------------------------------- 5. catálogo sigue público
console.log('\n5) Lo público sigue público');
const neg = await http('/rest/v1/business_profiles?select=id&status=eq.active&limit=2');
chequear('un visitante ve el catálogo de negocios', filas(neg) > 0, `${filas(neg)} negocios`);
const prod = await http('/rest/v1/products?select=id&limit=2');
chequear('un visitante ve los productos', filas(prod) > 0, `${filas(prod)} productos`);

console.log(`\n${fallos === 0 ? 'TODO BIEN' : 'HAY FALLAS'}: ${total - fallos}/${total} comprobaciones pasaron.\n`);
process.exit(fallos === 0 ? 0 : 1);
