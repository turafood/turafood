#!/usr/bin/env node
/**
 * TURAFOOD — RECORRIDO COMPLETO CON LAS CUENTAS DE PRUEBA
 *
 * cliente guarda dirección → hace un pedido → el negocio lo acepta y lo prepara →
 * su repartidor de flota lo ve, lo toma, lo recoge y lo entrega con el código.
 * Comprueba también que un repartidor de OTRO negocio no puede ver ni tomar ese pedido.
 *
 *   node turafood-supabase/scripts/flujo-demo.mjs
 *
 * Usa las cuentas de `.cuentas-demo.json` (las crea crear-cuentas-demo.mjs).
 * ATENCIÓN: deja un pedido de prueba entregado en el negocio demo.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const cuentas = JSON.parse(readFileSync(path.join(aqui, '..', '.cuentas-demo.json'), 'utf8'));
function envLocal(n) {
  try { return readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))?.[1].trim(); } catch { return undefined; }
}
const URL_ = process.env.SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL');
const ANON = process.env.SUPABASE_ANON_KEY || envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY');

let fallos = 0;
const paso = (nombre, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`${ok ? '  OK ' : ' FALLA'}  ${nombre}${detalle ? `  — ${detalle}` : ''}`);
};

async function api(ruta, { metodo = 'GET', token, cuerpo, headers = {} } = {}) {
  const r = await fetch(`${URL_}${ruta}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, data };
}
const entrar = async (c) => (await api('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: c.email, password: c.password } })).data?.access_token;
const rpc = (nombre, token, cuerpo = {}) => api(`/rest/v1/rpc/${nombre}`, { metodo: 'POST', token, cuerpo });
const uno = (r) => (Array.isArray(r.data) ? r.data[0] : r.data);

console.log('\nRecorrido completo con las cuentas de prueba\n');
const tCli = await entrar(cuentas.cliente);
const tNeg = await entrar(cuentas.negocio);
const tRep = await entrar(cuentas.repartidor);
paso('las tres cuentas inician sesión', Boolean(tCli && tNeg && tRep));
if (!(tCli && tNeg && tRep)) process.exit(1);

// Un repartidor de OTRO negocio (sesión anónima desechable, aprobado por nadie)
const ajeno = (await api('/auth/v1/signup', { metodo: 'POST', cuerpo: { data: { role: 'courier' } } })).data;

// 1. Cliente: dirección dentro de Buenaventura
const dir = await rpc('guardar_direccion', tCli, { p_label: 'Casa', p_address: 'Calle 5 # 3-20, Centro, Buenaventura', p_lat: 3.881, p_lng: -77.03 });
const dirId = uno(dir)?.id ?? (typeof dir.data === 'string' ? dir.data : null);
paso('el cliente guarda su dirección', dir.status < 300 && Boolean(dirId), dir.data?.message ?? '');

// 2. Cliente: pedido de 2 productos
const prods = await api(`/rest/v1/products?select=id,name,price&business_id=eq.${cuentas.negocio.id}&is_available=eq.true&order=sort_order&limit=2`, { token: tCli });
const pedido = await rpc('place_order', tCli, {
  p_business_id: cuentas.negocio.id,
  p_items: (prods.data ?? []).map((p) => ({ product_id: p.id, quantity: 1, extra_ids: [], notes: '' })),
  p_mode: 'delivery', p_address_id: dirId, p_tip: 0, p_coupon_code: null, p_instructions: 'Prueba automática', p_payment_method: 'cash',
});
const orden = uno(pedido);
paso('el cliente hace el pedido', pedido.status < 300 && Boolean(orden?.id), pedido.data?.message ?? `#${orden?.order_number}, total ${orden?.total}`);
if (!orden?.id) process.exit(1);

// 3. Nadie ajeno lo ve todavía; el repartidor de flota tampoco (no está aceptado)
const antes = await api(`/rest/v1/orders?select=id&id=eq.${orden.id}`, { token: tRep });
paso('el repartidor no ve un pedido que el negocio aún no aceptó', (antes.data ?? []).length === 0);

// 4. El negocio lo acepta y lo prepara
for (const estado of ['accepted', 'preparing']) {
  const r = await api(`/rest/v1/orders?id=eq.${orden.id}`, { metodo: 'PATCH', token: tNeg, cuerpo: { status: estado }, headers: { Prefer: 'return=representation' } });
  paso(`el negocio marca "${estado}"`, r.status < 300 && r.data?.[0]?.status === estado, r.data?.message ?? '');
}

// 5. Repartidor de flota (en línea) vs. repartidor ajeno
await api(`/rest/v1/courier_profiles?id=eq.${cuentas.repartidor.id}`, { metodo: 'PATCH', token: tRep, cuerpo: { status: 'online' } });
const visto = await api(`/rest/v1/orders?select=id&id=eq.${orden.id}`, { token: tRep });
paso('el repartidor de la flota ve el pedido', (visto.data ?? []).length === 1);
const vistoAjeno = await api(`/rest/v1/orders?select=id&id=eq.${orden.id}`, { token: ajeno.access_token });
paso('un repartidor ajeno NO lo ve', (vistoAjeno.data ?? []).length === 0);
const tomaAjena = await rpc('accept_order', ajeno.access_token, { p_order_id: orden.id });
paso('un repartidor ajeno NO puede tomarlo', tomaAjena.status >= 400, tomaAjena.data?.message ?? '');

// 6. El repartidor de la flota lo toma y lo entrega
const toma = await rpc('accept_order', tRep, { p_order_id: orden.id });
paso('el repartidor de la flota lo toma', toma.status < 300 && uno(toma)?.courier_id === cuentas.repartidor.id, toma.data?.message ?? '');
for (const estado of ['picked_up', 'delivering']) {
  const r = await rpc('courier_advance_order', tRep, { p_order_id: orden.id, p_status: estado });
  paso(`el repartidor marca "${estado}"`, r.status < 300 && uno(r)?.status === estado, r.data?.message ?? '');
}
const codigoMalo = await rpc('complete_delivery', tRep, { p_order_id: orden.id, p_code: '0000' });
paso('un código de entrega incorrecto se rechaza', codigoMalo.status >= 400, codigoMalo.data?.message ?? '');
const codigo = String(orden.order_number ?? '').replace(/\D/g, '').slice(-4);
const fin = await rpc('complete_delivery', tRep, { p_order_id: orden.id, p_code: codigo });
paso('el pedido se entrega con el código del cliente', fin.status < 300 && uno(fin)?.status === 'delivered', fin.data?.message ?? '');

// 7. Lo que ve el cliente al final
const vistaCli = await api(`/rest/v1/orders?select=status,courier_id,delivered_at&id=eq.${orden.id}`, { token: tCli });
paso('el cliente ve su pedido entregado', vistaCli.data?.[0]?.status === 'delivered' && Boolean(vistaCli.data?.[0]?.delivered_at));

// Deja al repartidor desconectado como estaba
await api(`/rest/v1/courier_profiles?id=eq.${cuentas.repartidor.id}`, { metodo: 'PATCH', token: tRep, cuerpo: { status: 'offline' } });

console.log(fallos === 0 ? '\nTODO BIEN: el recorrido completo funciona.\n' : `\nHAY ${fallos} PASO(S) QUE FALLARON.\n`);
process.exit(fallos === 0 ? 0 : 1);
