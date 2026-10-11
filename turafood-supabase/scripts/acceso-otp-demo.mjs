#!/usr/bin/env node
/**
 * TURAFOOD — Prueba de entrar con código SMS y crear contraseña, con TU celular real.
 *
 *   node acceso-otp-demo.mjs 3001234567            → te envía un SMS con el código
 *   node acceso-otp-demo.mjs 3001234567 123456    → verifica, crea una contraseña y prueba celular + contraseña
 *
 * La contraseña se genera al azar y se guarda en .cuentas-demo.json (git la ignora).
 * Puedes cambiarla después desde Cuenta → Contraseña.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , cel, codigo] = process.argv;
if (!/^3\d{9}$/.test(cel ?? '')) { console.error('Uso: node acceso-otp-demo.mjs 3001234567 [codigo]'); process.exit(2); }
const tel = `+57${cel}`;

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const estado = path.join(aqui, '..', '.cuentas-demo.json');
const env = (n) => readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))[1].trim();
const URL_ = env('NEXT_PUBLIC_SUPABASE_URL'), ANON = env('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const llamar = async (ruta, metodo, cuerpo, token = ANON) => {
  const r = await fetch(`${URL_}${ruta}`, { method: metodo, headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
  return { status: r.status, data: await r.json().catch(() => null) };
};

if (!codigo) {
  const r = await llamar('/auth/v1/otp', 'POST', { phone: tel, channel: 'sms' });
  console.log(r.status < 300 ? `SMS enviado a ${tel}` : `No se pudo enviar: HTTP ${r.status} ${JSON.stringify(r.data)}`);
  process.exit(r.status < 300 ? 0 : 1);
}

const v = await llamar('/auth/v1/verify', 'POST', { type: 'sms', phone: tel, token: codigo });
if (!v.data?.access_token) { console.error('Código no válido o vencido:', v.data?.msg ?? v.data?.error_description ?? v.status); process.exit(1); }
console.log('  OK  entró con el código SMS (celular verificado:', Boolean(v.data.user?.phone_confirmed_at) + ')');

const clave = randomBytes(10).toString('base64url');
const u = await fetch(`${URL_}/auth/v1/user`, { method: 'PUT', headers: { apikey: ANON, Authorization: `Bearer ${v.data.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: clave, data: { tiene_contrasena: true } }) });
console.log(u.ok ? '  OK  creó la contraseña (updateUser)' : ` FALLA  no se pudo crear la contraseña: HTTP ${u.status}`);
if (!u.ok) process.exit(1);

const p = await llamar('/auth/v1/token?grant_type=password', 'POST', { phone: tel, password: clave });
const ok = p.status === 200 && p.data?.user?.id === v.data.user.id;
console.log(ok ? '  OK  celular + contraseña entra a la MISMA cuenta' : ` FALLA  celular + contraseña: HTTP ${p.status}`);

const meta = p.data?.user?.user_metadata?.tiene_contrasena === true;
console.log(meta ? '  OK  la cuenta queda marcada con contraseña (la pantalla dirá "Cambiar")' : ' FALLA  falta la marca tiene_contrasena');

const cuentas = existsSync(estado) ? JSON.parse(readFileSync(estado, 'utf8')) : {};
cuentas.usuario_real = { celular: tel, password: clave };
writeFileSync(estado, JSON.stringify(cuentas, null, 2));
process.exit(ok && meta ? 0 : 1);
