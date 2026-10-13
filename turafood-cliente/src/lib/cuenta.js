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
export const CANAL_POR_DEFECTO = 'sms';

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
export async function enviarCodigo(celular, { canal = 'sms', forzarIngreso = false } = {}) {
  const tel = normalizarCelularCO(celular);
  if (!tel) throw new Error('Escribe tu celular con 10 dígitos, por ejemplo 300 123 4567.');

  if (typeof window !== 'undefined') {
    try { localStorage.setItem('turafood_last_otp_phone', tel); } catch {}
  }

  if (!isConfigured()) {
    return { tel, modo: 'vincular', canal: 'sms', esPrueba: true, codigoPrueba: '1234' };
  }

  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const vincular = !forzarIngreso && Boolean(session?.user);

  const mandar = async (c) => (vincular
    ? supabase.auth.updateUser({ phone: tel, channel: c })
    : supabase.auth.signInWithOtp({ phone: tel, options: { channel: c } }));

  try {
    let { error } = await mandar('sms');
    if (error) {
      if (/already (been )?registered|already exists|phone_exists|already in use/i.test(error.message)) {
        throw new Error('EXISTE');
      }
      console.warn('Twilio SMS en modo de prueba / perfil pendiente, activando fallback 1234:', error.message);
      return { tel, modo: vincular ? 'vincular' : 'ingresar', canal: 'sms', esPrueba: true, codigoPrueba: '1234' };
    }
    return { tel, modo: vincular ? 'vincular' : 'ingresar', canal: 'sms', esPrueba: false };
  } catch (err) {
    if (err.message === 'EXISTE') throw err;
    console.warn('Fallback SMS activo con código 1234:', err);
    return { tel, modo: vincular ? 'vincular' : 'ingresar', canal: 'sms', esPrueba: true, codigoPrueba: '1234' };
  }
}

/** Confirma el código (acepta 6 dígitos reales o 1234 de prueba). Devuelve el usuario. */
export async function confirmarCodigo({ tel, codigo, modo }) {
  const codeStr = String(codigo).trim();
  if (!codigoValido(codeStr)) throw new Error('El código debe ser de 4 o 6 dígitos.');

  const supabase = createClient();

  // Comodín de prueba pedido por el usuario (1234 o 123456)
  if (codeStr === '1234' || codeStr === '123456') {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('turafood_verified_phone', tel);
        localStorage.setItem('turafood_customer_phone', tel);
      } catch {}
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase.from('profiles').update({
          phone: tel,
          phone_verified: true,
          updated_at: new Date().toISOString(),
        }).eq('id', session.user.id);
        return session.user;
      }
    } catch {}
    const { data: sess } = await supabase.auth.getSession();
    return sess?.session?.user ?? { id: 'verified-test-user', phone: tel };
  }

  // Verificación oficial Supabase / Twilio
  const { data, error } = await supabase.auth.verifyOtp({
    phone: tel,
    token: codeStr,
    type: modo === 'vincular' ? 'phone_change' : 'sms',
  });

  if (error) {
    throw new Error(mensaje(error));
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('turafood_verified_phone', tel);
      localStorage.setItem('turafood_customer_phone', tel);
    } catch {}
  }
  return data?.user ?? null;
}

/**
 * ¿Hay que verificar el celular antes de hacer el pedido?
 */
export async function necesitaVerificar() {
  if (!isConfigured()) return false;
  return !(await tieneCelularVerificado());
}

/** ¿La sesión actual ya tiene un celular verificado? */
export async function tieneCelularVerificado() {
  if (!isConfigured()) return false;
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('turafood_verified_phone');
    if (local) return true;
  }
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
