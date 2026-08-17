'use client';

/**
 * SERVICIO DE PAGOS
 *
 *   UI → PaymentService → Supabase (RPC / Edge Function) → Proveedor
 *
 * Los componentes de React llaman solo a este módulo. No saben qué
 * pasarela hay detrás, ni calculan montos, ni deciden estados.
 *
 * Reglas que hace cumplir:
 *   · el monto lo pone el servidor (`create_payment` lo lee del pedido);
 *   · el estado definitivo lo fija el webhook, nunca esta capa;
 *   · reintentar no duplica pedidos: se crea otro intento sobre el mismo.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';
import { epaycoProvider } from './epayco';
import { PaymentStatus, isOnlineMethod } from './types';

/** Proveedores disponibles. Agregar Wompi o Stripe es sumar una línea. */
const PROVIDERS = {
  epayco: epaycoProvider,
};

const DEFAULT_PROVIDER = 'epayco';

export function getProvider(id = DEFAULT_PROVIDER) {
  const provider = PROVIDERS[id];
  if (!provider) throw new Error(`Proveedor de pago desconocido: ${id}`);
  return provider;
}

export function isPaymentAvailable(id = DEFAULT_PROVIDER) {
  return isConfigured() && getProvider(id).isConfigured();
}

/**
 * Crea el intento de pago en la base de datos.
 * Devuelve el registro de `payments` con el monto REAL del pedido.
 */
export async function createPayment(orderId, method = 'card', provider = DEFAULT_PROVIDER) {
  if (!isConfigured()) {
    throw new Error('La base de datos todavía no está conectada en este entorno.');
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_payment', {
    p_order_id: orderId,
    p_payment_method: method,
    p_provider: provider,
  });

  // Los mensajes del RPC ya vienen en español y son para el usuario
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

/**
 * Flujo completo de cobro de un pedido.
 *
 * Efectivo no pasa por pasarela: se registra el pago como pendiente y
 * se cobra al entregar.
 */
export async function payForOrder(order, { method = 'card', businessName } = {}) {
  if (!isOnlineMethod(method)) {
    return { redirectTo: `/tracking?order=${order.id}`, payment: null };
  }

  if (!isPaymentAvailable()) {
    throw new Error(
      'El pago en línea todavía no está habilitado. Puedes elegir efectivo al recibir.',
    );
  }

  const payment = await createPayment(order.id, method);
  await getProvider(payment.provider ?? DEFAULT_PROVIDER)
    .openCheckout(payment, order, { businessName });

  return { redirectTo: null, payment };
}

/** Estado actual de un pago. La pantalla de resultado consulta esto. */
export async function getPayment(paymentId) {
  if (!isConfigured()) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('payments')
    .select('id, order_id, status, amount, currency, payment_method, failure_reason, paid_at, created_at')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Último intento de pago de un pedido */
export async function getLatestPayment(orderId) {
  if (!isConfigured()) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('payments')
    .select('id, order_id, status, amount, failure_reason, paid_at, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Escucha el cambio de estado del pago por Realtime.
 * Así el usuario ve "aprobado" en cuanto llega el webhook, sin recargar.
 */
export function subscribeToPayment(paymentId, onChange) {
  if (!isConfigured()) return () => {};

  const supabase = createClient();
  const channel = supabase
    .channel(`payment:${paymentId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'payments', filter: `id=eq.${paymentId}` },
      (payload) => onChange(payload.new),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/** Reintenta el pago de un pedido sin crear otro pedido */
export async function retryPayment(order, { method = 'card', businessName } = {}) {
  return payForOrder(order, { method, businessName });
}

export { PaymentStatus };
export * from './types';
