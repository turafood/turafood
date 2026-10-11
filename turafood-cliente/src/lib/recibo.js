'use client';

/**
 * RECIBO POR CORREO
 *
 * Al entregarse el pedido le llega un recibo por correo (lo manda la
 * función send-order-email de Supabase). Quien tiene cuenta con correo lo
 * recibe sin hacer nada; quien pidió como invitado puede dejar el suyo
 * aquí. El correo se valida y se guarda en el servidor.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

/** { email, sent_at } del recibo de un pedido, o null si no dejó correo */
export async function getRecibo(orderId) {
  if (!isConfigured() || !orderId) return null;
  const { data } = await createClient()
    .from('order_receipts')
    .select('email, sent_at')
    .eq('order_id', orderId)
    .maybeSingle();
  return data ?? null;
}

/** Deja el correo del recibo. Devuelve { ok, email, enviado_ahora } o { ok:false, mensaje } */
export async function pedirRecibo(orderId, email) {
  const { data, error } = await createClient().rpc('pedir_recibo_por_correo', {
    p_order_id: orderId,
    p_email: email,
  });
  if (error) throw new Error(error.message);
  return data;
}
