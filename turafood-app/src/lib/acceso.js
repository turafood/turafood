'use client';

/**
 * CUENTA POR CÓDIGO (Supabase Auth)
 *
 * Quien pide sin registrarse tiene una sesión anónima de Supabase. Al pulsar
 * "Pedir" verifica un dato de contacto con un código de 6 dígitos:
 *
 *   · CORREO (hoy, por defecto): el código llega al instante por Resend, desde
 *     pedidos@turafood.com, con un correo de marca.
 *   · SMS (cuando Twilio quede verificado): `NEXT_PUBLIC_OTP_METODO=sms`.
 *
 * Y se resuelve de dos maneras:
 *   · Hay sesión (invitado)  → `vincular`: el correo/celular pasa a ser de ESA
 *     misma cuenta (updateUser + código). El historial, las direcciones y los
 *     pedidos que hizo sin registrarse se quedan con él.
 *   · No hay sesión, o el dato ya pertenece a otra cuenta → `ingresar`: entra a
 *     esa cuenta (signInWithOtp + código).
 *
 * La verificación es REAL: la decide Supabase al validar el código. No hay
 * códigos fijos ni marcas en el navegador que la simulen.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';
import { normalizarCelularCO, codigoValido } from './direcciones.mjs';

/** Cómo se verifica hoy: 'correo' (por defecto) o 'sms' */
export const METODO_POR_DEFECTO = process.env.NEXT_PUBLIC_OTP_METODO === 'sms' ? 'sms' : 'correo';

/** Compatibilidad con pantallas que todavía importan este nombre */
export const CANAL_POR_DEFECTO = 'sms';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const esCorreo = (x) => String(x ?? '').includes('@');
export const correoValido = (c) => REGEX_CORREO.test(String(c ?? '').trim()) && String(c).trim().length <= 254;
export const normalizarCorreo = (c) => (correoValido(c) ? String(c).trim().toLowerCase() : null);

/** Mensajes del servidor → español claro (los técnicos no le sirven a nadie en pantalla) */
function mensaje(error) {
  const m = String(error?.message ?? error ?? '');
  if (/rate limit|too many|over_(sms|email)_send_rate_limit|after \d+ seconds|security purposes/i.test(m)) {
    return 'Pediste muchos códigos seguidos. Espera un minuto antes de pedir otro.';
  }
  if (/already (been )?registered|already exists|phone_exists|email_exists|already in use/i.test(m)) return 'EXISTE';
  if (/expired|invalid|incorrect|token has expired or is invalid/i.test(m)) {
    return 'Ese código no es válido o ya venció. Pide uno nuevo.';
  }
  if (/signups? not allowed|phone.*disabled|provider.*not enabled|unsupported phone/i.test(m)) {
    return 'Esta forma de entrar no está disponible por ahora. Inténtalo más tarde.';
  }
  if (/fetch|network|failed to fetch/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  if (/error sending|smtp|sending (confirmation|magic|email)/i.test(m)) {
    return 'No pudimos enviar el código en este momento. Inténtalo de nuevo en un minuto.';
  }
  return 'No pudimos enviar el código. Revisa el dato e inténtalo de nuevo.';
}

/**
 * Envía el código al correo o al celular (según lo que reciba).
 * @param {string} contacto  un correo (nombre@correo.com) o un celular colombiano
 * @returns {{ contacto: string, tel: string, modo: 'vincular'|'ingresar', metodo: 'correo'|'sms' }}
 * @throws Error con mensaje listo para mostrar. 'EXISTE' = ese dato ya es de otra cuenta
 *         (quien llama puede reintentar con `{ forzarIngreso: true }` para entrar a ella).
 */
export async function enviarCodigo(contacto, { forzarIngreso = false } = {}) {
  const porCorreo = esCorreo(contacto);
  const id = porCorreo ? normalizarCorreo(contacto) : normalizarCelularCO(contacto);
  if (!id) {
    throw new Error(porCorreo
      ? 'Escribe un correo válido, por ejemplo nombre@correo.com.'
      : 'Escribe tu celular con 10 dígitos, por ejemplo 300 123 4567.');
  }
  if (!isConfigured()) throw new Error('Esta función no está disponible en modo demostración.');

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const vincular = !forzarIngreso && Boolean(session?.user);

  let error;
  if (vincular) {
    // `channel` no está en los tipos de updateUser pero GoTrue lo acepta en el cuerpo
    ({ error } = await supabase.auth.updateUser(porCorreo ? { email: id } : { phone: id, channel: 'sms' }));
  } else {
    ({ error } = await supabase.auth.signInWithOtp(porCorreo
      ? { email: id, options: { shouldCreateUser: true } }
      : { phone: id, options: { channel: 'sms' } }));
  }
  if (error) throw new Error(mensaje(error));

  return { contacto: id, tel: id, modo: vincular ? 'vincular' : 'ingresar', metodo: porCorreo ? 'correo' : 'sms' };
}

/** Confirma el código de 6 dígitos. Devuelve el usuario. */
export async function confirmarCodigo({ contacto, tel, codigo, modo }) {
  const id = contacto ?? tel;
  const token = String(codigo ?? '').trim();
  if (!codigoValido(token)) throw new Error('El código tiene 6 dígitos.');

  const porCorreo = esCorreo(id);
  const { data, error } = await createClient().auth.verifyOtp(porCorreo
    ? { email: id, token, type: modo === 'vincular' ? 'email_change' : 'email' }
    : { phone: id, token, type: modo === 'vincular' ? 'phone_change' : 'sms' });
  if (error) throw new Error(mensaje(error));

  // Solo para precargar el campo la próxima vez; NO es una prueba de verificación
  try { localStorage.setItem(porCorreo ? 'turafood_customer_email' : 'turafood_customer_phone', id); } catch { /* sin almacenamiento */ }
  return data?.user ?? null;
}

/** ¿La sesión actual ya verificó un correo o un celular? (lo decide el token de Supabase, no el navegador) */
export async function tieneVerificacion() {
  if (!isConfigured()) return false;
  const { data: { session } } = await createClient().auth.getSession();
  const u = session?.user;
  return Boolean(u && !u.is_anonymous && (u.email_confirmed_at || u.phone_confirmed_at));
}

/** Nombre anterior, por compatibilidad con las pantallas que lo importan */
export const tieneCelularVerificado = tieneVerificacion;

/**
 * ¿Hay que verificar antes de hacer el pedido?
 * Sí, siempre que la sesión no esté verificada. Se pide al final (al pulsar "Pedir"),
 * cuando la persona ya eligió todo, y solo una vez por dispositivo.
 */
export async function necesitaVerificar() {
  if (!isConfigured()) return false;      // demostración sin base: no hay a quién verificar
  return !(await tieneVerificacion());
}

/** Correo de la cuenta (si ya verificó uno) para precargar campos */
export async function correoDeLaCuenta() {
  if (!isConfigured()) return '';
  const { data: { session } } = await createClient().auth.getSession();
  return session?.user?.email ?? '';
}

// ============================================================
// CONTRASEÑA (opcional): el atajo para entrar sin esperar el código.
// Como en Uber, Rappi o DiDi: lo normal es el código, la contraseña es un extra.
// ============================================================

export const MIN_CONTRASENA = 8;

/** null si está bien; si no, el motivo en español */
export function validarContrasena(p) {
  const t = String(p ?? '');
  if (t.length < MIN_CONTRASENA) return `Usa al menos ${MIN_CONTRASENA} caracteres.`;
  if (/^(.)\1+$/.test(t) || /^(0123456789|1234567890|12345678|87654321)$/.test(t)) return 'Es muy fácil de adivinar. Mezcla letras y números.';
  return null;
}

/** Entra con correo o celular + contraseña. El error es el mismo se equivoque lo que se equivoque (no revela qué cuentas existen). */
export async function entrarConContrasena(contacto, password) {
  const porCorreo = esCorreo(contacto);
  const id = porCorreo ? normalizarCorreo(contacto) : normalizarCelularCO(contacto);
  if (!id) throw new Error(porCorreo ? 'Escribe un correo válido.' : 'Escribe tu celular con 10 dígitos, por ejemplo 300 123 4567.');
  if (!isConfigured()) throw new Error('Esta función no está disponible en modo demostración.');
  const { data, error } = await createClient().auth.signInWithPassword(porCorreo ? { email: id, password } : { phone: id, password });
  if (error) {
    if (/rate limit|too many/i.test(error.message)) throw new Error('Demasiados intentos. Espera un momento o entra con un código.');
    throw new Error('Los datos no coinciden. Si no recuerdas tu contraseña, entra con un código.');
  }
  return data.user;
}

/** Crea o cambia la contraseña de la cuenta (la sesión ya está verificada) */
export async function guardarContrasena(password) {
  const motivo = validarContrasena(password);
  if (motivo) throw new Error(motivo);
  const { error } = await createClient().auth.updateUser({ password, data: { tiene_contrasena: true } });
  if (error) {
    if (/different from the old|same password/i.test(error.message)) throw new Error('Elige una contraseña distinta a la que ya tienes.');
    if (/weak|easy to guess|pwned/i.test(error.message)) throw new Error('Es muy fácil de adivinar. Mezcla letras y números.');
    if (/session|reauth|jwt/i.test(error.message)) throw new Error('Por seguridad, entra de nuevo con un código y vuelve a intentarlo.');
    throw new Error('No pudimos guardar la contraseña. Inténtalo de nuevo.');
  }
  return true;
}

/** ¿La cuenta ya tiene contraseña? (se marca al crearla; Supabase no lo expone) */
export async function tieneContrasena() {
  if (!isConfigured()) return false;
  const { data: { session } } = await createClient().auth.getSession();
  return Boolean(session?.user?.user_metadata?.tiene_contrasena);
}

export async function cerrarSesion() {
  if (!isConfigured()) return;
  await createClient().auth.signOut();
}
