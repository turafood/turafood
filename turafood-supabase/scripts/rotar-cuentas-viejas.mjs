#!/usr/bin/env node
/**
 * TURAFOOD — Rota la contraseña de las cuentas de prueba antiguas @turafood.com
 * (su contraseña estuvo en el repositorio público). Excluye las demo.* nuevas.
 * Las nuevas contraseñas se guardan SOLO en turafood-supabase/.cuentas-demo-viejas.txt (git lo ignora).
 * Necesita SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const env = (n) => readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))[1].trim();
const URL_ = env('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE) { console.error('Falta SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }
const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

const lista = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: h })).json();
const viejas = (lista.users ?? []).filter((u) => /@turafood\.com$/i.test(u.email ?? '') && !/^demo\./i.test(u.email));
const lineas = ['CUENTAS ANTIGUAS DE PRUEBA — contraseñas nuevas (no subir a git)', ''];
let ok = 0;
for (const u of viejas) {
  const clave = randomBytes(12).toString('base64url');
  const r = await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: 'PUT', headers: h, body: JSON.stringify({ password: clave }) });
  if (r.ok) { ok++; lineas.push(`${u.email}   ${clave}`); }
  console.log(`${r.ok ? '  OK ' : ' FALLA'}  ${u.email}`);
}
writeFileSync(path.join(aqui, '..', '.cuentas-demo-viejas.txt'), lineas.join('\n') + '\n');
console.log(`\n${ok} de ${viejas.length} contraseñas rotadas.`);
process.exit(ok === viejas.length ? 0 : 1);
