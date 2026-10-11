#!/usr/bin/env node
/**
 * TURAFOOD — Prueba de "celular + contraseña" con la cuenta demo del cliente (sin enviar SMS).
 *
 * Le pone a demo.cliente un celular ya confirmado (+57 300 000 0001: NO recibe ningún mensaje,
 * solo se usa para entrar con contraseña) y una contraseña al azar, y comprueba:
 *   · celular + contraseña correcta  → entra,
 *   · celular + contraseña errónea    → no entra (y el error no dice qué falló),
 *   · la cuenta conserva su historial.
 * Necesita SUPABASE_SERVICE_ROLE_KEY. La contraseña nueva se guarda en .cuentas-demo.json (git la ignora).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const estado = path.join(aqui, '..', '.cuentas-demo.json');
const cuentas = JSON.parse(readFileSync(estado, 'utf8'));
const env = (n) => readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))[1].trim();
const URL_ = env('NEXT_PUBLIC_SUPABASE_URL'), ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const TEL = '573000000001';
const clave = randomBytes(10).toString('base64url');

let fallos = 0;
const paso = (n, ok, d = '') => { if (!ok) fallos++; console.log(`${ok ? '  OK ' : ' FALLA'}  ${n}${d ? `  — ${d}` : ''}`); };
const llamar = async (ruta, metodo, cuerpo, apikey = ANON, bearer = apikey) => {
  const r = await fetch(`${URL_}${ruta}`, { method: metodo, headers: { apikey, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
};

const set = await llamar(`/auth/v1/admin/users/${cuentas.cliente.id}`, 'PUT', { phone: TEL, phone_confirm: true, password: clave }, SERVICE);
paso('la cuenta demo recibe celular confirmado y contraseña', set.status < 300, set.data?.msg ?? set.data?.message ?? '');

const bien = await llamar('/auth/v1/token?grant_type=password', 'POST', { phone: `+${TEL}`, password: clave });
paso('celular + contraseña correcta → entra', bien.status === 200 && Boolean(bien.data?.access_token), `HTTP ${bien.status}`);
paso('es la misma cuenta (conserva su historial)', bien.data?.user?.id === cuentas.cliente.id);

const mal = await llamar('/auth/v1/token?grant_type=password', 'POST', { phone: `+${TEL}`, password: clave + 'x' });
paso('contraseña errónea → no entra', mal.status >= 400, `HTTP ${mal.status}`);
const otro = await llamar('/auth/v1/token?grant_type=password', 'POST', { phone: '+573000000099', password: clave });
paso('un celular sin cuenta da el MISMO error que una contraseña mala', otro.status === mal.status && otro.data?.error_code === mal.data?.error_code, `${otro.data?.error_code} vs ${mal.data?.error_code}`);

const pedidos = await llamar('/rest/v1/orders?select=id&limit=1', 'GET', null, ANON, bien.data?.access_token);
paso('con esa sesión se ve el historial de pedidos', Array.isArray(pedidos.data) && pedidos.data.length > 0, `${pedidos.data?.length ?? 0} pedido(s)`);

if (fallos === 0) {
  cuentas.cliente.password = clave;
  cuentas.cliente.celular = `+${TEL}`;
  writeFileSync(estado, JSON.stringify(cuentas, null, 2));
}
console.log(fallos === 0 ? '\nTODO BIEN: celular + contraseña funciona.\n' : `\n${fallos} PASO(S) FALLARON.\n`);
process.exit(fallos === 0 ? 0 : 1);
