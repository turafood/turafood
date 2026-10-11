'use client';

/**
 * CUENTA POR CÓDIGO (Twilio Verify vía Supabase Auth)
 *
 * Quien pide sin registrarse tiene una sesión anónima de Supabase. Cuando
 * quiere guardar su historial o entrar desde otro celular, verifica su número:
 *
 *   · Es una sesión anónima  → `vincular`: el celular pasa a ser de ESA misma
 *     cuenta (updateUser + código). El historial, las direcciones y los pedidos
 *     que hizo sin registrarse se quedan con él.
 *   · No hay sesión, o ya es una cuenta real → `ingresar`: entra a la cuenta de
 *     ese número (signInWithOtp + código).
 *
 * El código llega por WhatsApp o por SMS (lo configura Twilio Verify en el panel
 * de Supabase: Authentication → Providers → Phone). Si WhatsApp falla, se
 * reintenta por SMS.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';
import { normalizarCelularCO, codigoValido } from './direcciones.mjs';

/** Canal por defecto: `NEXT_PUBLIC_OTP_CHANNEL=sms` para forzar SMS */
export const CANAL_POR_DEFECTO = process.env.NEXT_PUBLIC_OTP_CHANNEL === 'sms' ? 'sms' : 'whatsapp';

/** Mensajes del servidor → español claro (los técnicos no le sirven a nadie en pantalla) */
function mensaje(error) {
  const m = String(error?.message ?? error ?? '');
  if (/rate limit|too many|over_sms_send_rate_limit|after \d+ seconds|security purposes/i.test(m)) {
    return 'Pediste muchos códigos seguidos. Espera un minuto antes de pedir otro.';
  }
  if (/already (been )?registered|already exists|phone_exists|already in use/i.test(m)) return 'EXISTE';
  if (/expired|invalid|incorrect|token has expired or is invalid/i.test(m)) {
    return 'Ese código no es válido o ya venció. Pide uno nuevo.';
  }
  if (/signups? not allowed|phone.*disabled|provider.*not enabled|unsupported phone/i.test(m)) {
    return 'El ingreso con celular no está disponible por ahora. Inténtalo más tarde.';
  }
  if (/fetch|network|failed to fetch/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
  return 'No pudimos enviar el código. Revisa el número e inténtalo de nuevo.';
}

/**
 * Envía el código.
 * @returns {{ tel: string, modo: 'vincular'|'ingresar', canal: 'whatsapp'|'sms' }}
 * @throws Error con un mensaje listo para mostrar. Si el número ya pertenece a
 *         otra cuenta mientras había una sesión anónima, el mensaje es 'EXISTE'
 *         y quien llama decide si ofrecer `enviarCodigo(..., { forzarIngreso: true })`.
 */
export async function enviarCodigo(celular, { canal = CANAL_POR_DEFECTO, forzarIngreso = false } = {}) {
  const tel = normalizarCelularCO(celular);
  if (!tel) throw new Error('Escribe tu celular con 10 dígitos, por ejemplo 300 123 4567.');
  if (!isConfigured()) throw new Error('Esta función no está disponible en modo demostración.');

  const supabase = createClient();
  // Con sesión (invitado o cuenta sin celular) el número pasa a ser de ESA misma cuenta;
  // sin sesión, o para entrar a una cuenta que ya existe, se usa el ingreso por código.
  const { data: { session } } = await supabase.auth.getSession();
  const vincular = !forzarIngreso && Boolean(session?.user);

  const mandar = async (c) => (vincular
    // `channel` no está en los tipos de updateUser pero GoTrue lo acepta en el cuerpo
    ? supabase.auth.updateUser({ phone: tel, channel: c })
    : supabase.auth.signInWithOtp({ phone: tel, options: { channel: c } }));

  let usado = canal;
  let { error } = await mandar(canal);
  if (error && canal === 'whatsapp' && mensaje(error) !== 'EXISTE') {
    usado = 'sms';
    ({ error } = await mandar('sms'));
  }
  if (error) throw new Error(mensaje(error));

  return { tel, modo: vincular ? 'vincular' : 'ingresar', canal: usado };
}

/** Confirma el código de 6 dígitos. Devuelve el usuario. */
export async function confirmarCodigo({ tel, codigo, modo }) {
  if (!codigoValido(codigo)) throw new Error('El código tiene 6 dígitos.');
  const { data, error } = await createClient().auth.verifyOtp({
    phone: tel,
    token: String(codigo).trim(),
    type: modo === 'vincular' ? 'phone_change' : 'sms',
  });
  if (error) throw new Error(mensaje(error));
  return data?.user ?? null;
}

/**
 * ¿Hay que verificar el celular antes de hacer el pedido?
 *
 * Sí, siempre que la sesión no tenga ya un celular verificado. Se pide al final,
 * cuando la persona pulsa "Pedir" (ya eligió todo), y solo una vez por dispositivo:
 * después la sesión queda verificada. Con eso cada pedido tiene un número real al
 * que el negocio y el repartidor pueden escribir, y se frenan los pedidos falsos.
 */
export async function necesitaVerificar() {
  if (!isConfigured()) return false;                 // demostración sin base: no hay a quién verificar
  return !(await tieneCelularVerificado());
}

/** ¿La sesión actual ya tiene un celular verificado? */
export async function tieneCelularVerificado() {
  if (!isConfigured()) return false;
  const { data: { session } } = await createClient().auth.getSession();
  const u = session?.user;
  return Boolean(u && !u.is_anonymous && u.phone && u.phone_confirmed_at);
}

// ============================================================
// CONTRASEÑA (opcional): el celular + contraseña entra sin esperar el SMS.
// Como en Uber, Rappi o DiDi: lo normal es el código, la contraseña es un atajo.
// ============================================================

export const MIN_CONTRASENA = 8;

/** null si está bien; si no, el motivo en español */
export function validarContrasena(p) {
  const t = String(p ?? '');
  if (t.length < MIN_CONTRASENA) return `Usa al menos ${MIN_CONTRASENA} caracteres.`;
  if (/^(.)\1+$/.test(t) || /^(0123456789|1234567890|12345678|87654321)$/.test(t)) return 'Es muy fácil de adivinar. Mezcla letras y números.';
  return null;
}

/** Entra con celular + contraseña. El error es el mismo se equivoque lo que se equivoque (no revela qué números tienen cuenta). */
export async function entrarConContrasena(celular, password) {
  const tel = normalizarCelularCO(celular);
  if (!tel) throw new Error('Escribe tu celular con 10 dígitos, por ejemplo 300 123 4567.');
  if (!isConfigured()) throw new Error('Esta función no está disponible en modo demostración.');
  const { data, error } = await createClient().auth.signInWithPassword({ phone: tel, password });
  if (error) {
    if (/rate limit|too many/i.test(error.message)) throw new Error('Demasiados intentos. Espera un momento o entra con un código por SMS.');
    throw new Error('El celular o la contraseña no coinciden. Si no la recuerdas, entra con un código por SMS.');
  }
  return data.user;
}

/** Crea o cambia la contraseña de la cuenta (la sesión ya tiene el celular verificado) */
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
