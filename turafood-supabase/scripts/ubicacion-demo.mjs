#!/usr/bin/env node
// Prueba de fijar_ubicacion_negocio con las cuentas demo:
// dentro de Buenaventura sí; en Cali, sin sesión o siendo cliente, no.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const c = JSON.parse(readFileSync(path.join(aqui, '..', '.cuentas-demo.json'), 'utf8'));
const env = (n) => readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))[1].trim();
const URL_ = process.env.SUPABASE_URL || env('NEXT_PUBLIC_SUPABASE_URL');
const ANON = process.env.SUPABASE_ANON_KEY || env('NEXT_PUBLIC_SUPABASE_ANON_KEY');

const post = async (ruta, cuerpo, token = ANON) => {
  const r = await fetch(`${URL_}${ruta}`, { method: 'POST', headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { status: r.status, data: await r.json().catch(() => null) };
};
const entrar = async (cuenta) => (await post('/auth/v1/token?grant_type=password', { email: cuenta.email, password: cuenta.password })).data.access_token;

const tNegocio = await entrar(c.negocio);
const tCliente = await entrar(c.cliente);
const dentro = await post('/rest/v1/rpc/fijar_ubicacion_negocio', { p_lat: 3.8801, p_lng: -77.0312, p_address: 'Calle 2 # 3-10, Centro, Buenaventura', p_neighborhood: 'Centro' }, tNegocio);
const cali = await post('/rest/v1/rpc/fijar_ubicacion_negocio', { p_lat: 3.4516, p_lng: -76.532 }, tNegocio);
const sinSesion = await post('/rest/v1/rpc/fijar_ubicacion_negocio', { p_lat: 3.88, p_lng: -77.03 });
const comoCliente = await post('/rest/v1/rpc/fijar_ubicacion_negocio', { p_lat: 3.88, p_lng: -77.03 }, tCliente);

const ok = [dentro.status < 300, cali.status >= 400, sinSesion.status >= 400, comoCliente.status >= 400];
console.log(`Negocio en Buenaventura: ${ok[0] ? 'ACEPTA' : 'RECHAZA (MAL): ' + dentro.data?.message}`);
console.log(`Negocio en Cali:         ${ok[1] ? 'RECHAZA — ' + cali.data?.message : 'ACEPTA (MAL)'}`);
console.log(`Sin sesión:              ${ok[2] ? 'RECHAZA' : 'ACEPTA (MAL)'}`);
console.log(`Un cliente:              ${ok[3] ? 'RECHAZA — ' + comoCliente.data?.message : 'ACEPTA (MAL)'}`);
process.exit(ok.every(Boolean) ? 0 : 1);
