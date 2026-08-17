'use client';

/**
 * SUITE DE REDES SOCIALES
 *
 * El negocio arma la publicación, ve cómo va a quedar en cada red y la
 * manda. El equipo de TuraFood la publica con las cuentas conectadas.
 *
 * Como en el resto del módulo de crecimiento, la pantalla lo dice: la
 * herramienta es de ellos, el trabajo lo hace el equipo. Nada aquí
 * guarda tokens de las redes.
 */

import { createClient } from '@/utils/supabase/client';
import { isLive } from './negocio';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

/** Las redes, con su identidad visual */
export const PLATFORMS = {
  facebook: { label: 'Facebook', color: '#1877F2', tint: '#EAF1FF', icon: 'thumb_up', limit: 63206 },
  instagram: { label: 'Instagram', color: '#C13584', tint: '#FDECF5', icon: 'photo_camera', limit: 2200 },
  x: { label: 'X', color: '#17140F', tint: '#F0EEE9', icon: 'tag', limit: 280 },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', tint: '#E8F1FA', icon: 'work', limit: 3000 },
  tiktok: { label: 'TikTok', color: '#17140F', tint: '#F0EEE9', icon: 'music_note', limit: 2200 },
  youtube: { label: 'YouTube', color: '#FF0000', tint: '#FFECEC', icon: 'smart_display', limit: 5000 },
  youtube_shorts: { label: 'YouTube Shorts', color: '#FF0000', tint: '#FFECEC', icon: 'movie', limit: 5000 },
  whatsapp: { label: 'WhatsApp', color: '#25D366', tint: '#E6F6EE', icon: 'chat', limit: 4096 },
};

/** Orden en que se muestran */
export const PLATFORM_ORDER = [
  'facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'youtube', 'youtube_shorts',
];

export const ACCOUNT_STATUS = {
  requested: { label: 'Por conectar', bg: '#FFF7E6', color: '#A8730B', icon: 'schedule' },
  connected: { label: 'Conectada', bg: '#E6F6EE', color: '#0B7A48', icon: 'check_circle' },
  error: { label: 'Con problema', bg: '#FFF1EC', color: '#E2360F', icon: 'error' },
  disabled: { label: 'Desactivada', bg: 'var(--surface2)', color: 'var(--muted)', icon: 'block' },
};

export const POST_STATUS = {
  draft: { label: 'Borrador', bg: 'var(--surface2)', color: 'var(--muted)', icon: 'edit_note' },
  scheduled: { label: 'Programada', bg: '#EAF1FF', color: '#2E6BFF', icon: 'schedule' },
  queued: { label: 'En cola', bg: '#FFF7E6', color: '#A8730B', icon: 'hourglass_top' },
  published: { label: 'Publicada', bg: '#E6F6EE', color: '#0B7A48', icon: 'check_circle' },
  failed: { label: 'Falló', bg: '#FFF1EC', color: '#E2360F', icon: 'error' },
};

export const TONES = [
  { value: 'cercano', label: 'Cercano', hint: 'Como le hablas a un cliente de siempre' },
  { value: 'antojador', label: 'Antojador', hint: 'Que dé hambre con solo leerlo' },
  { value: 'promocional', label: 'Promocional', hint: 'Directo a la oferta' },
  { value: 'informativo', label: 'Informativo', hint: 'Datos claros, sin adornos' },
];

// ============================================================
// CUENTAS
// ============================================================

export async function getAccounts(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_ACCOUNTS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_accounts')
    .select('*')
    .eq('business_id', businessId);

  if (error) return [];
  return data ?? [];
}

/**
 * Pide conectar una red. No conecta nada: deja la solicitud para que el
 * equipo la enlace con las credenciales del negocio.
 */
export async function requestAccount(businessId, platform, handle) {
  if (!isLive()) {
    await delay(400);
    const row = {
      id: `a-${platform}`, platform, status: 'requested',
      account_handle: handle, business_id: businessId,
    };
    const i = LOCAL_ACCOUNTS.findIndex((a) => a.platform === platform);
    if (i >= 0) LOCAL_ACCOUNTS[i] = row; else LOCAL_ACCOUNTS.push(row);
    return row;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_accounts')
    .upsert(
      { business_id: businessId, platform, account_handle: handle },
      { onConflict: 'business_id,platform' },
    )
    .select()
    .single();

  if (error) throw new Error(`No se pudo registrar la cuenta: ${error.message}`);
  return data;
}

export async function removeAccount(businessId, platform) {
  if (!isLive()) {
    await delay(200);
    const i = LOCAL_ACCOUNTS.findIndex((a) => a.platform === platform);
    if (i >= 0) LOCAL_ACCOUNTS.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  await supabase.from('social_accounts').delete()
    .eq('business_id', businessId).eq('platform', platform);
  return true;
}

// ============================================================
// PUBLICACIONES
// ============================================================

export async function getPosts(businessId, limit = 40) {
  if (!isLive()) {
    await delay();
    return LOCAL_POSTS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_posts')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export async function savePost(businessId, post) {
  if (!isLive()) {
    await delay(400);
    const row = { ...post, id: post.id ?? `p-${Date.now()}`, business_id: businessId };
    const i = LOCAL_POSTS.findIndex((p) => p.id === row.id);
    if (i >= 0) LOCAL_POSTS[i] = row; else LOCAL_POSTS.unshift(row);
    return row;
  }

  const supabase = createClient();
  const payload = {
    business_id: businessId,
    platforms: post.platforms ?? [],
    kind: post.kind ?? 'post',
    content: post.content ?? null,
    images: post.images ?? [],
    link_url: post.link_url || null,
    tone: post.tone ?? null,
    status: post.status ?? 'draft',
    scheduled_at: post.scheduled_at || null,
  };

  const query = post.id
    ? supabase.from('social_posts').update(payload).eq('id', post.id)
    : supabase.from('social_posts').insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw new Error(`No se pudo guardar la publicación: ${error.message}`);
  return data;
}

export async function deletePost(postId) {
  if (!isLive()) {
    await delay(200);
    const i = LOCAL_POSTS.findIndex((p) => p.id === postId);
    if (i >= 0) LOCAL_POSTS.splice(i, 1);
    return true;
  }

  const supabase = createClient();
  const { error } = await supabase.from('social_posts').delete().eq('id', postId);
  if (error) throw new Error(`No se pudo eliminar: ${error.message}`);
  return true;
}

/**
 * Mejora el texto de la publicación.
 *
 * Por ahora son reglas, no un modelo: agrega una llamada a la acción,
 * emojis con medida y etiquetas locales. Cuando exista el servicio de
 * IA solo cambia esta función; la pantalla no se entera.
 */
export function enhanceText(text, { tone = 'cercano', businessName = '', platform = 'facebook' } = {}) {
  const base = String(text ?? '').trim();
  if (!base) return base;

  const cta = {
    cercano: 'Te esperamos 👇',
    antojador: '¿Se te antojó? Pídelo ya 👇',
    promocional: 'Aprovecha hoy 👇',
    informativo: 'Más información en nuestro perfil.',
  }[tone] ?? 'Pídelo por TuraFood 👇';

  const tags = platform === 'x'
    ? '#Buenaventura'
    : `#Buenaventura #TuraFood${businessName ? ` #${businessName.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/g, '')}` : ''}`;

  // En X el espacio es el recurso escaso: no se infla el texto
  if (platform === 'x') {
    const short = base.length > 200 ? `${base.slice(0, 197)}…` : base;
    return `${short}\n\n${tags}`;
  }

  return `${base}\n\n${cta}\n${tags}`;
}

// ============================================================
// BANDEJA
// ============================================================

export async function getThreads(businessId) {
  if (!isLive()) {
    await delay();
    return LOCAL_THREADS;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_threads')
    .select('*')
    .eq('business_id', businessId)
    .eq('archived', false)
    .order('last_message_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}

export async function getMessages(threadId) {
  if (!isLive()) {
    await delay(150);
    return LOCAL_MESSAGES[threadId] ?? [];
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at');

  if (error) return [];
  return data ?? [];
}

/** La respuesta queda pendiente hasta que el equipo la entrega */
export async function replyToThread(threadId, body) {
  if (!isLive()) {
    await delay(300);
    const msg = {
      id: `m-${Date.now()}`, thread_id: threadId, direction: 'out',
      body, delivery: 'pending', created_at: new Date().toISOString(),
    };
    LOCAL_MESSAGES[threadId] = [...(LOCAL_MESSAGES[threadId] ?? []), msg];
    return msg;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('social_messages')
    .insert({ thread_id: threadId, direction: 'out', body })
    .select()
    .single();

  if (error) throw new Error(`No se pudo enviar: ${error.message}`);

  await supabase.from('social_threads')
    .update({ last_message_at: new Date().toISOString(), unread_count: 0 })
    .eq('id', threadId);

  return data;
}

// ============================================================
// DATOS LOCALES
// ============================================================

const ago = (min) => new Date(Date.now() - min * 60000).toISOString();

const LOCAL_ACCOUNTS = [
  { id: 'a1', platform: 'facebook', account_name: 'Asadero El Puerto', account_handle: '@asaderoelpuerto', status: 'connected', connected_at: ago(4000) },
  { id: 'a2', platform: 'instagram', account_name: 'Asadero El Puerto', account_handle: '@asaderoelpuerto', status: 'connected', connected_at: ago(4000) },
  { id: 'a3', platform: 'whatsapp', account_name: 'Línea del negocio', account_handle: '+57 313 759 4713', status: 'connected', connected_at: ago(2000) },
  { id: 'a4', platform: 'tiktok', account_handle: '@asaderoelpuerto', status: 'requested' },
];

const LOCAL_POSTS = [
  {
    id: 'p1', platforms: ['facebook', 'instagram'], kind: 'post', status: 'published',
    content: '🔥 Picada Pacífico para 2, recién salida de la parrilla.\n\nChorizo, chicharrón, carne asada, papa criolla y patacón. Alcanza para tres, en serio.\n\n¿Se te antojó? Pídelo ya 👇\n#Buenaventura #TuraFood',
    images: ['/images/steak-ribeye.jpg'],
    published_at: ago(180), likes: 87, comments: 14, shares: 6, views: 1240,
  },
  {
    id: 'p2', platforms: ['instagram'], kind: 'story', status: 'published',
    content: 'Hoy hasta las 11 p.m. 🌙 Domicilios en todo el Centro.',
    images: ['/images/burger-hero.jpg'],
    published_at: ago(1440), likes: 42, comments: 3, shares: 1, views: 890,
  },
  {
    id: 'p3', platforms: ['facebook'], kind: 'post', status: 'scheduled',
    content: 'Martes de 2x1 en limonada de coco 🥥 Solo hoy con tu pedido.',
    images: [], scheduled_at: ago(-600),
  },
];

const LOCAL_THREADS = [
  { id: 't1', platform: 'whatsapp', contact_name: 'Sharick Grajales', contact_handle: '+57 316 000 0001', unread_count: 2, last_message_at: ago(6) },
  { id: 't2', platform: 'instagram', contact_name: 'andres.riascos', contact_handle: '@andres.riascos', unread_count: 1, last_message_at: ago(48) },
  { id: 't3', platform: 'facebook', contact_name: 'Marleny Cuero', contact_handle: 'Marleny Cuero', unread_count: 0, last_message_at: ago(190) },
  { id: 't4', platform: 'whatsapp', contact_name: 'Deivid Mosquera', contact_handle: '+57 316 000 0004', unread_count: 0, last_message_at: ago(1300) },
];

const LOCAL_MESSAGES = {
  t1: [
    { id: 'm1', direction: 'in', body: 'Buenas, ¿están abiertos hoy?', created_at: ago(20) },
    { id: 'm2', direction: 'out', body: '¡Hola! Sí, hasta las 11 de la noche. ¿Te ayudo con el pedido?', delivery: 'sent', created_at: ago(18) },
    { id: 'm3', direction: 'in', body: 'Quiero la picada para 2', created_at: ago(8) },
    { id: 'm4', direction: 'in', body: '¿Cuánto se demora al Centro?', created_at: ago(6) },
  ],
  t2: [
    { id: 'm5', direction: 'in', body: '¿Hacen domicilio a Punta del Este?', created_at: ago(50) },
    { id: 'm6', direction: 'in', body: 'Vi la foto de la costilla, se ve buenísima 🔥', created_at: ago(48) },
  ],
  t3: [
    { id: 'm7', direction: 'in', body: '¿Tienen para eventos de 30 personas?', created_at: ago(200) },
    { id: 'm8', direction: 'out', body: 'Claro que sí. Te paso la carta de eventos por interno.', delivery: 'sent', created_at: ago(190) },
  ],
  t4: [
    { id: 'm9', direction: 'in', body: 'Gracias, todo llegó caliente 👏', created_at: ago(1300) },
  ],
};
