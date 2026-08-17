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

/** Preguntas que se resuelven solas: bajan la mitad de las solicitudes */
export const FAQ = [
  {
    id: 'payout',
    q: '¿Cuándo me consignan?',
    a: 'Todos los viernes, con el corte del domingo anterior. En Liquidaciones ves el periodo en curso y cuánto va acumulado. Si el viernes es festivo, la consignación sale el siguiente día hábil.',
  },
  {
    id: 'commission',
    q: '¿Por qué me descontaron comisión?',
    a: 'Es el 10% por pedido entregado (15% en farmacia y licorera). Se descuenta solo del valor de los productos, no del envío ni de la propina. Con Biz Pro pasa a 0% y solo pagas la mensualidad.',
  },
  {
    id: 'limit',
    q: 'Me dice que llegué al límite de 20 pedidos',
    a: 'Es el tope mientras tu cuenta esté sin verificar. Sube tus documentos en Verificación y el límite se levanta cuando aprobemos. Mientras tanto se reinicia cada día a medianoche.',
  },
  {
    id: 'courier',
    q: 'Un pedido lleva mucho sin repartidor',
    a: 'Márcalo como listo apenas salga de cocina: los repartidores solo ven los pedidos listos. Si pasan más de 15 minutos sin que nadie lo tome, escríbenos y lo asignamos a mano.',
  },
  {
    id: 'photos',
    q: 'No puedo subir la foto de un producto',
    a: 'El límite es 5 MB por foto, en JPG, PNG o WebP. Si tu foto pesa más, ábrela en la galería del celular y compártela por WhatsApp contigo mismo: baja de peso sola y la puedes subir.',
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const { data: { user } } = await supabase.auth.getUser();
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
