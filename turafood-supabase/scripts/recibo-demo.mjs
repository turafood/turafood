#!/usr/bin/env node
/**
 * TURAFOOD — Prueba del recibo por correo con el pedido entregado de las cuentas demo.
 *
 *   node turafood-supabase/scripts/recibo-demo.mjs tu@correo.com
 *
 * El cliente demo pide el recibo de su último pedido entregado a ESE correo
 * (usa un correo tuyo: se manda un correo de verdad). Después espera y
 * muestra si quedó marcado como enviado.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const correo = process.argv[2];
if (!correo) { console.error('Uso: node recibo-demo.mjs tu@correo.com'); process.exit(2); }

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const c = JSON.parse(readFileSync(path.join(aqui, '..', '.cuentas-demo.json'), 'utf8'));
const env = (n) => readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))[1].trim();
const URL_ = process.env.SUPABASE_URL || env('NEXT_PUBLIC_SUPABASE_URL');
const ANON = process.env.SUPABASE_ANON_KEY || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

async function api(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const r = await fetch(`${URL_}${ruta}`, {
    method: metodo,
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  return { status: r.status, data: await r.json().catch(() => null) };
}

const t = (await api('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: c.cliente.email, password: c.cliente.password } })).data.access_token;
const pedidos = await api('/rest/v1/orders?select=id,order_number,status&status=eq.delivered&order=delivered_at.desc&limit=1', { token: t });
const pedido = pedidos.data?.[0];
if (!pedido) { console.error('El cliente demo no tiene pedidos entregados: corre antes flujo-demo.mjs'); process.exit(1); }
console.log(`Pedido ${pedido.order_number}`);

const r = await api('/rest/v1/rpc/pedir_recibo_por_correo', { metodo: 'POST', token: t, cuerpo: { p_order_id: pedido.id, p_email: correo } });
console.log('Respuesta:', JSON.stringify(r.data));

for (let i = 0; i < 8; i++) {
  await new Promise((res) => setTimeout(res, 2500));
  const estado = await api(`/rest/v1/order_receipts?select=email,sent_at&order_id=eq.${pedido.id}`, { token: t });
  const fila = estado.data?.[0];
  if (fila?.sent_at) { console.log(`ENVIADO a ${fila.email} (${fila.sent_at})`); process.exit(0); }
}
console.log('Todavía no figura como enviado (revisa los registros de la función).');
process.exit(1);
