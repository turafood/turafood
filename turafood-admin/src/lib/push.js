'use client';

/**
 * TURAFOOD — NOTIFICACIONES PUSH (lado navegador)
 *
 * Flujo:
 *   1. El usuario toca "Activar avisos"  → `activarPush(app)`
 *   2. El navegador pide permiso y crea una suscripción con la clave VAPID
 *   3. Se guarda en `push_subscriptions` (RPC register_push_subscription)
 *   4. Cuando la base inserta una fila en `notifications`, la Edge Function
 *      `send-push` manda el aviso aunque la app esté cerrada.
 *
 * Notas:
 *   · Pedir permiso al abrir la app hace que la gente diga "No" por
 *     reflejo, y un "No" casi no se puede deshacer. Por eso el permiso se
 *     pide solo cuando el usuario toca el botón.
 *   · iPhone: Apple solo permite push si la app está instalada en la
 *     pantalla de inicio (iOS 16.4+). Ahí `pushSupported()` da false
 *     hasta instalarla, y `esIOSNoInstalada()` sirve para explicarlo.
 *
 * Este archivo es idéntico en turafood-cliente, turafood-app y turafood-admin.
 */

import { createClient } from '@/utils/supabase/client';

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function base64UrlAUint8(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** ¿Este navegador puede recibir push (y la app está configurada para ello)? */
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    Boolean(VAPID_PUBLIC) &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** 'granted' | 'denied' | 'default' | 'unsupported' */
export function pushPermission() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/** iPhone/iPad con la app aún sin instalar: ahí Apple no deja usar push */
export function esIOSNoInstalada() {
  if (typeof window === 'undefined') return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  return ios && !instalada;
}

async function registroDelSW() {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  return reg;
}

async function guardarSuscripcion(sub, app) {
  const j = sub.toJSON();
  const supabase = createClient();
  const { error } = await supabase.rpc('register_push_subscription', {
    p_endpoint: j.endpoint,
    p_p256dh: j.keys?.p256dh,
    p_auth: j.keys?.auth,
    p_app: app,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw new Error(error.message);
}

/**
 * Pide permiso, suscribe este dispositivo y lo guarda.
 * Devuelve { ok: true } o { ok: false, motivo }.
 * motivo: 'no-soportado' | 'denegado' | 'cerrado' | 'sin-sesion' | 'error'
 */
export async function activarPush(app) {
  if (!pushSupported()) return { ok: false, motivo: 'no-soportado' };

  try {
    const permiso = await Notification.requestPermission();
    if (permiso === 'denied') return { ok: false, motivo: 'denegado' };
    if (permiso !== 'granted') return { ok: false, motivo: 'cerrado' };

    const reg = await registroDelSW();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8(VAPID_PUBLIC),
      });
    }
    await guardarSuscripcion(sub, app);
    return { ok: true };
  } catch (e) {
    if (/sesi[oó]n/i.test(e?.message || '')) return { ok: false, motivo: 'sin-sesion' };
    console.warn('No se pudo activar el push:', e);
    return { ok: false, motivo: 'error' };
  }
}

/**
 * Si el usuario ya dio permiso, vuelve a registrar la suscripción con la
 * sesión actual. Cubre dos casos: otro usuario entró en el mismo navegador
 * (la suscripción pasa a ser suya) y el navegador cambió el endpoint.
 * No pide nada ni muestra nada. Es seguro llamarlo al abrir la app.
 */
export async function renovarPush(app) {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = await registroDelSW();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlAUint8(VAPID_PUBLIC),
      });
    }
    await guardarSuscripcion(sub, app);
  } catch {
    /* sin sesión todavía o sin red: se intenta la próxima vez */
  }
}

/** Apaga los avisos de este dispositivo */
export async function desactivarPush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await createClient().rpc('unregister_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch (e) {
    console.warn('No se pudo desactivar el push:', e);
  }
}

/** ¿Este dispositivo tiene una suscripción activa? */
export async function pushActivo() {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    return Boolean(await reg?.pushManager.getSubscription());
  } catch {
    return false;
  }
}
