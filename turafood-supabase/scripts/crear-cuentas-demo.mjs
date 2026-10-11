#!/usr/bin/env node
/**
 * TURAFOOD — CUENTAS DE PRUEBA PARA PROBAR DE PUNTA A PUNTA
 *
 * Crea (o reinicia) tres cuentas con la misma forma que tendrían las reales:
 *   · un NEGOCIO,
 *   · su REPARTIDOR, que entra a la flota del negocio con el código,
 *   · un CLIENTE recién registrado, sin ningún dato (sin nombre, celular ni direcciones).
 *
 * Las contraseñas se generan al azar en cada corrida y se guardan SOLO en
 * `turafood-supabase/.cuentas-demo.txt` (git lo ignora). Nunca se imprimen.
 *
 * Necesita la clave de servicio en SUPABASE_SERVICE_ROLE_KEY (no se guarda):
 *   fase1  → crea usuarios y registra el negocio
 *            (después se corre sembrar-negocio-demo.sql: activa el negocio y le arma el menú)
 *   fase2  → el repartidor se une a la flota con el código; escribe el archivo de cuentas
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..', '..');
const estado = path.join(aqui, '..', '.cuentas-demo.json');
const txt = path.join(aqui, '..', '.cuentas-demo.txt');

function envLocal(n) {
  try { return readFileSync(path.join(raiz, 'turafood-app', '.env.local'), 'utf8').match(new RegExp(`^${n}=(.*)$`, 'm'))?.[1].trim(); }
  catch { return undefined; }
}
const URL_ = process.env.SUPABASE_URL || envLocal('NEXT_PUBLIC_SUPABASE_URL');
const ANON = process.env.SUPABASE_ANON_KEY || envLocal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.error('Falta SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY'); process.exit(2); }

const fase = process.argv[2];
const NOMBRE_NEGOCIO = 'Demo Sabor Porteño';
const CUENTAS = {
  negocio:    { email: 'demo.negocio@turafood.com',    role: 'business' },
  repartidor: { email: 'demo.repartidor@turafood.com', role: 'courier', full_name: 'Repartidor Demo' },
  cliente:    { email: 'demo.cliente@turafood.com',    role: 'customer' },   // sin nombre ni celular a propósito
};

async function api(ruta, { metodo = 'GET', token, cuerpo, headers = {} } = {}) {
  const r = await fetch(`${URL_}${ruta}`, {
    method: metodo,
    headers: { apikey: token === SERVICE ? SERVICE : ANON, Authorization: `Bearer ${token ?? ANON}`, ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, data };
}

const clave = () => randomBytes(12).toString('base64url');

async function asegurarUsuario(c) {
  const password = clave();
  const meta = { role: c.role, ...(c.full_name ? { full_name: c.full_name } : {}) };
  const crear = await api('/auth/v1/admin/users', { metodo: 'POST', token: SERVICE, cuerpo: { email: c.email, password, email_confirm: true, user_metadata: meta } });
  if (crear.status < 300 && crear.data?.id) return { id: crear.data.id, password };

  // Ya existía: se busca y se le cambia la contraseña
  const lista = await api('/auth/v1/admin/users?per_page=1000', { token: SERVICE });
  const u = lista.data?.users?.find((x) => x.email === c.email);
  if (!u) throw new Error(`No se pudo crear ni encontrar ${c.email}: ${JSON.stringify(crear.data)}`);
  const act = await api(`/auth/v1/admin/users/${u.id}`, { metodo: 'PUT', token: SERVICE, cuerpo: { password, email_confirm: true } });
  if (act.status >= 300) throw new Error(`No se pudo reiniciar la contraseña de ${c.email}`);
  return { id: u.id, password };
}

async function entrar(c, password) {
  const r = await api('/auth/v1/token?grant_type=password', { metodo: 'POST', cuerpo: { email: c.email, password } });
  if (!r.data?.access_token) throw new Error(`No se pudo iniciar sesión como ${c.email}`);
  return r.data.access_token;
}

if (fase === 'fase1') {
  const cuentas = {};
  for (const [k, c] of Object.entries(CUENTAS)) cuentas[k] = { ...c, ...(await asegurarUsuario(c)) };

  // El negocio se registra como lo haría su dueño en la app
  const tokenNegocio = await entrar(cuentas.negocio, cuentas.negocio.password);
  const reg = await api('/rest/v1/rpc/register_business', { metodo: 'POST', token: tokenNegocio, cuerpo: { p_name: NOMBRE_NEGOCIO, p_phone: null } });
  if (reg.status >= 300) throw new Error('register_business falló: ' + JSON.stringify(reg.data));

  writeFileSync(estado, JSON.stringify(cuentas, null, 2));
  console.log('fase1 OK: usuarios creados y negocio registrado (pendiente de activar).');
} else if (fase === 'fase2') {
  if (!existsSync(estado)) throw new Error('Corre primero la fase1');
  const cuentas = JSON.parse(readFileSync(estado, 'utf8'));

  // 1. El negocio saca su código de flota
  const tokenNegocio = await entrar(cuentas.negocio, cuentas.negocio.password);
  const cod = await api('/rest/v1/rpc/flota_codigo', { metodo: 'POST', token: tokenNegocio, cuerpo: {} });
  if (typeof cod.data !== 'string') throw new Error('flota_codigo falló: ' + JSON.stringify(cod.data));

  // 2. El repartidor crea su ficha (nace pendiente) y se une con el código
  const tokenRep = await entrar(cuentas.repartidor, cuentas.repartidor.password);
  const ficha = await api('/rest/v1/courier_profiles', { metodo: 'POST', token: tokenRep, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, cuerpo: { id: cuentas.repartidor.id, status: 'offline', vehicle_type: 'motorcycle' } });
  if (ficha.status >= 300) throw new Error('No se pudo crear la ficha del repartidor: ' + JSON.stringify(ficha.data));
  const unir = await api('/rest/v1/rpc/unirse_a_flota', { metodo: 'POST', token: tokenRep, cuerpo: { p_codigo: cod.data } });
  if (!unir.data?.ok) throw new Error('unirse_a_flota falló: ' + JSON.stringify(unir.data));

  // 3. Comprobaciones: cada cosa quedó como debe
  const flota = await api('/rest/v1/rpc/flota_mis_repartidores', { metodo: 'POST', token: tokenNegocio, cuerpo: {} });
  const enFlota = Array.isArray(flota.data) && flota.data.some((r) => r.id === cuentas.repartidor.id);
  const tokenCli = await entrar(cuentas.cliente, cuentas.cliente.password);
  const perfil = await api(`/rest/v1/profiles?select=role,full_name,phone&id=eq.${cuentas.cliente.id}`, { token: tokenCli });
  const dirs = await api('/rest/v1/addresses?select=id&limit=1', { token: tokenCli });
  const vacio = perfil.data?.[0]?.role === 'customer' && !perfil.data?.[0]?.full_name && !perfil.data?.[0]?.phone && (dirs.data ?? []).length === 0;
  const visible = await api(`/rest/v1/business_profiles?select=name,status&id=eq.${cuentas.negocio.id}`);
  const menu = await api(`/rest/v1/products?select=id&business_id=eq.${cuentas.negocio.id}`);

  const ok = enFlota && vacio;
  console.log(`repartidor en la flota del negocio: ${enFlota ? 'SI' : 'NO'}`);
  console.log(`cliente sin datos (sin nombre, celular ni direcciones): ${vacio ? 'SI' : 'NO'}`);
  console.log(`negocio visible para clientes: ${visible.data?.[0]?.status === 'active' ? 'SI' : 'NO (status=' + (visible.data?.[0]?.status ?? '?') + ')'}, productos: ${(menu.data ?? []).length}`);
  if (!ok) process.exit(1);

  writeFileSync(txt, [
    'CUENTAS DE PRUEBA DE TURAFOOD (no subir a git; se reinician al volver a correr el script)',
    '',
    `NEGOCIO     https://app.turafood.com/auth   correo: ${cuentas.negocio.email}      contraseña: ${cuentas.negocio.password}`,
    `            nombre: ${NOMBRE_NEGOCIO}   código de flota: ${cod.data}`,
    `REPARTIDOR  https://app.turafood.com/auth   correo: ${cuentas.repartidor.email}   contraseña: ${cuentas.repartidor.password}`,
    `            ya está en la flota de ${NOMBRE_NEGOCIO}`,
    `CLIENTE     https://turafood.com/auth       correo: ${cuentas.cliente.email}      contraseña: ${cuentas.cliente.password}`,
    '            recién registrado: sin nombre, sin celular y sin direcciones',
    '',
  ].join('\n'));
  console.log(`Credenciales guardadas en ${path.relative(raiz, txt)}`);
} else {
  console.error('Uso: node crear-cuentas-demo.mjs fase1|fase2');
  process.exit(2);
}
