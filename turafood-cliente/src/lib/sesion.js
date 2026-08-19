'use client';

/**
 * SESIÓN INVISIBLE PARA COMPRAR SIN CUENTA
 *
 * La app deja mirar todo sin registrarse, pero en algún momento hay
 * que guardar algo a nombre de alguien: la dirección, el pedido, el
 * pago. Hasta ahora eso obligaba a crear cuenta justo cuando la
 * persona ya tenía el carrito lleno — el peor momento posible para
 * pedirle datos.
 *
 * Con la sesión anónima de Supabase se le da un `auth.uid()` real sin
 * pedirle nada. Desde la base es un usuario como cualquier otro, así
 * que las políticas RLS y `place_order()` funcionan sin tocarles una
 * línea: su pedido es suyo y nadie más lo ve.
 *
 * Después, cuando quiera guardar su historial, pone su correo y la
 * MISMA cuenta pasa a ser suya. No se pierde nada de lo que hizo
 * mientras estaba sin registrar.
 *
 * Requiere activar "Anonymous Sign-Ins" en el panel de Supabase
 * (Authentication → Sign In / Providers). Si está apagado, esto
 * devuelve null y quien llama decide si mandar al registro.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

/** Evita abrir dos sesiones si dos cosas la piden a la vez */
let enCurso = null;

/**
 * Quién es, sin preguntarle al servidor.
 *
 * `getUser()` sale a la red cada vez para revalidar el token. Ocho
 * pantallas lo llamaban solo para saber por qué id filtrar, y en un
 * celular acá eso son ocho viajes de ida y vuelta antes de pintar
 * nada.
 *
 * `getSession()` lee el token que ya está guardado (y lo renueva solo
 * si venció). Alcanza, porque el id nunca se usa para decidir qué
 * puede ver alguien: eso lo decide RLS contra el token que viaja en
 * la consulta. Si el navegador mintiera sobre quién es, la base
 * devuelve vacío igual.
 *
 * Para decisiones de verdad —cobrar, cambiar la clave— se sigue
 * usando `getUser()`.
 */
export async function usuarioActual() {
  if (!isConfigured()) return null;
  const { data: { session } } = await createClient().auth.getSession();
  return session?.user ?? null;
}

/**
 * Devuelve el usuario actual. Si no hay sesión, abre una anónima.
 *
 * `silencioso` a propósito: quien compra no tiene por qué enterarse
 * de que por dentro se le creó una cuenta.
 */
export async function asegurarSesion() {
  if (!isConfigured()) return null;

  const supabase = createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  if (enCurso) return enCurso;

  enCurso = (async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      return data.user ?? null;
    } catch {
      // Anónimo apagado en el proyecto, o sin red. No es fatal: quien
      // llama se encarga de mandar al registro si de verdad lo necesita.
      return null;
    } finally {
      enCurso = null;
    }
  })();

  return enCurso;
}

/** ¿La sesión actual es una de estas, sin datos de nadie? */
export async function esInvitado() {
  if (!isConfigured()) return false;
  const { data: { session } } = await createClient().auth.getSession();
  return Boolean(session?.user?.is_anonymous);
}

/**
 * Convierte la sesión anónima en una cuenta de verdad.
 *
 * Es la misma fila de `auth.users`: el historial, las direcciones y
 * los pedidos que hizo como invitado se quedan con él.
 */
export async function quedarseConLaCuenta(email, password) {
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({ email, password });
  if (error) throw new Error(error.message);

  return true;
}
