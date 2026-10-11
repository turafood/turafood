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
import { esInvitado } from './sesion';

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
  const vincular = !forzarIngreso && await esInvitado();

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

/** ¿La sesión actual ya tiene un celular verificado? */
export async function tieneCelularVerificado() {
  if (!isConfigured()) return false;
  const { data: { session } } = await createClient().auth.getSession();
  const u = session?.user;
  return Boolean(u && !u.is_anonymous && u.phone && u.phone_confirmed_at);
}
