'use client';

/**
 * SOPORTE
 *
 * Cada solicitud es una conversación con seguimiento, no un correo que
 * se pierde. El negocio ve en qué va la suya; el equipo la trabaja
 * desde el Super Admin.
 */

import { createClient } from '@/utils/supabase/client';
import { isLive } from './negocio';
import { usuarioActual } from './sesion';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const CATEGORIES = [
  { value: 'orders', label: 'Pedidos y comandas', icon: 'receipt_long', tint: '#FFF1EC', color: '#E2360F' },
  { value: 'payouts', label: 'Pagos y liquidaciones', icon: 'account_balance_wallet', tint: '#E6F6EE', color: '#0B8E54' },
  { value: 'catalog', label: 'Menú y productos', icon: 'restaurant_menu', tint: '#FFF7E6', color: '#A8730B' },
  { value: 'account', label: 'Cuenta y verificación', icon: 'verified_user', tint: '#EAF1FF', color: '#2E6BFF' },
  { value: 'growth', label: 'Servicios de crecimiento', icon: 'rocket_launch', tint: '#F3ECFF', color: '#6B2FD6' },
  { value: 'technical', label: 'Algo no funciona', icon: 'bug_report', tint: '#FFF1EC', color: '#E2360F' },
  { value: 'other', label: 'Otra cosa', icon: 'help', tint: 'var(--surface2)', color: 'var(--muted)' },
];

export const TICKET_STATUS = {
  open: { label: 'Abierta', bg: '#EAF1FF', color: '#2E6BFF', icon: 'mark_email_unread' },
  in_progress: { label: 'En proceso', bg: '#FFF7E6', color: '#A8730B', icon: 'sync' },
  waiting: { label: 'Esperando tu respuesta', bg: '#FFF1EC', color: '#E2360F', icon: 'reply' },
  resolved: { label: 'Resuelta', bg: '#E6F6EE', color: '#0B7A48', icon: 'check_circle' },
  closed: { label: 'Cerrada', bg: 'var(--surface2)', color: 'var(--muted)', icon: 'lock' },
};

/** Preguntas Frecuentes — Modelo Real TuraFood (0% Comisiones, Pago Directo, IA & Turbo) */
export const FAQ = [
  {
    id: 'commission',
    q: '¿TuraFood cobra comisiones por cada pedido que vendo?',
    a: 'No. Cero comisiones (0%). A diferencia de otras plataformas tradicionales, TuraFood no te descuenta el 20% o 30% de tus platos. El 100% de la venta de tu comida va directamente a ti.',
  },
  {
    id: 'payouts',
    q: '¿Cómo y cuándo recibo el dinero de mis clientes?',
    a: 'Directo e inmediato a tu cuenta. El cliente te transfiere directamente a tu Nequi, Daviplata, cuenta bancaria o paga en efectivo al recibir el pedido. TuraFood nunca retiene tu dinero ni te hace esperar semanas para pagarte.',
  },
  {
    id: 'turbo',
    q: '¿Cómo funciona la modalidad Tura Turbo ⚡ (15 Minutos)?',
    a: 'Tura Turbo es nuestro sistema de despacho ultra-rápido. Puedes activar la insignia Turbo en tus platos más ágiles de preparar; el algoritmo de Repartidor IA asigna al domiciliario más cercano con un cronómetro de entrega garantizada en menos de 15 minutos.',
  },
  {
    id: 'kit_growth',
    q: '¿Qué incluye el Kit Turafood Ultra Growth AI?',
    a: 'Incluye la suite completa de crecimiento: Agente de Voz IA 24/7 que contesta la línea telefónica y toma pedidos de forma autónoma, automatizaciones de WhatsApp + SMS + Email para recuperar carritos, y la ficha de Google My Business optimizada en el Top #1 de Google Maps.',
  },
  {
    id: 'limit',
    q: '¿Por qué mi cuenta nueva tiene un tope de 20 pedidos diarios?',
    a: 'Es una medida de seguridad temporal para nuevas cuentas. Solo debes ingresar a la sección "Verificación" y completar tu registro para levantar todos los topes y recibir pedidos ilimitados.',
  },
  {
    id: 'couriers',
    q: '¿Puedo usar mis propios domiciliarios o la red de TuraFood?',
    a: 'Ambas opciones. Puedes vincular a tus domiciliarios de confianza en "Repartidor IA" para que reciban las órdenes en su app, o apoyarte en la flota aliada de TuraFood cuando tengas alta demanda.',
  },
];

// ============================================================
// LECTURA
// ============================================================

export async function getTickets() {
  if (!isLive()) {
    await delay();
    return LOCAL_TICKETS;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  if (!user) return [];

  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getTicketMessages(ticketId) {
  if (!isLive()) {
    await delay(150);
    return LOCAL_MESSAGES[ticketId] ?? [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at');

  if (error) return [];
  return data ?? [];
}

// ============================================================
// ESCRITURA
// ============================================================

/** Abre la solicitud con su primer mensaje, en una sola transacción */
export async function openTicket({ subject, category, body }) {
  if (!isLive()) {
    await delay(500);
    const row = {
      id: `t-${Date.now()}`,
      reference: `TS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      subject, category, status: 'open', unread_for_user: 0,
      created_at: new Date().toISOString(), last_message_at: new Date().toISOString(),
    };
    LOCAL_TICKETS.unshift(row);
    LOCAL_MESSAGES[row.id] = [{
      id: `m-${Date.now()}`, author_role: 'user', body,
      created_at: new Date().toISOString(),
    }];
    return row;
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('open_support_ticket', {
    p_subject: subject,
    p_category: category,
    p_body: body,
  });

  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}

export async function replyTicket(ticketId, body) {
  if (!isLive()) {
    await delay(300);
    const msg = {
      id: `m-${Date.now()}`, author_role: 'user', body,
      created_at: new Date().toISOString(),
    };
    LOCAL_MESSAGES[ticketId] = [...(LOCAL_MESSAGES[ticketId] ?? []), msg];
    return msg;
  }

  const supabase = createClient();
  const user = await usuarioActual();
  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: ticketId, author_id: user.id, author_role: 'user', body })
    .select()
    .single();

  if (error) throw new Error(`No se pudo enviar: ${error.message}`);
  return data;
}

export async function closeTicket(ticketId) {
  if (!isLive()) {
    await delay(200);
    const t = LOCAL_TICKETS.find((x) => x.id === ticketId);
    if (t) t.status = 'closed';
    return t;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed' })
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw new Error(`No se pudo cerrar: ${error.message}`);
  return data;
}

// ============================================================
// DATOS LOCALES
// ============================================================

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const LOCAL_TICKETS = [
  {
    id: 's1', reference: 'TS-4K9P2M', subject: 'No me llegó la liquidación del viernes',
    category: 'payouts', status: 'in_progress', unread_for_user: 1,
    created_at: ago(300), last_message_at: ago(45),
  },
  {
    id: 's2', reference: 'TS-8H3Q1L', subject: 'Quiero cambiar mi cuenta bancaria',
    category: 'account', status: 'resolved', unread_for_user: 0,
    created_at: ago(4300), last_message_at: ago(4100),
  },
];

const LOCAL_MESSAGES = {
  s1: [
    { id: 'sm1', author_role: 'user', body: 'Buenas. El viernes no me llegó la consignación y en el panel dice que la semana está cerrada. ¿Me ayudan a revisar?', created_at: ago(300) },
    { id: 'sm2', author_role: 'team', body: 'Hola. Ya lo estamos revisando con el banco. La transferencia salió el viernes a las 4:12 p.m.; a veces el banco la refleja el lunes. Te confirmo hoy mismo.', created_at: ago(280) },
    { id: 'sm3', author_role: 'team', body: 'Confirmado: el banco la devolvió porque el número de cuenta tiene un dígito de más. Corrígelo en Verificación y la reenviamos hoy.', created_at: ago(45) },
  ],
  s2: [
    { id: 'sm4', author_role: 'user', body: 'Necesito cambiar la cuenta de Bancolombia a Nequi.', created_at: ago(4300) },
    { id: 'sm5', author_role: 'team', body: 'Listo. Lo puedes hacer tú desde Verificación → Cuenta bancaria. El cambio aplica desde la siguiente liquidación.', created_at: ago(4100) },
  ],
};
