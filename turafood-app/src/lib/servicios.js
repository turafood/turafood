'use client';

/**
 * SERVICIOS DE CRECIMIENTO
 *
 * Ficha de Google, campañas de Google Ads y agente de voz. Ninguno se
 * conecta solo: la app recoge en un asistente todo lo que el equipo de
 * TuraFood necesita para montarlo, y lo deja en una bandeja.
 *
 * Eso está dicho en la pantalla a propósito. Un botón que parece
 * publicar en Google y no publica nada es la forma más rápida de
 * perder la confianza de un negocio.
 */

import { createClient } from '@/utils/supabase/client';
import { isLive } from './negocio';

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const SERVICE_STATUS = {
  draft: { label: 'Borrador', bg: 'var(--surface2)', color: 'var(--muted)', icon: 'edit_note' },
  submitted: { label: 'Enviado', bg: '#FFF7E6', color: '#A8730B', icon: 'schedule' },
  in_progress: { label: 'En montaje', bg: '#EAF1FF', color: '#2E6BFF', icon: 'construction' },
  active: { label: 'Activo', bg: '#E6F6EE', color: '#0B7A48', icon: 'verified' },
  rejected: { label: 'Rechazado', bg: '#FFF1EC', color: '#E2360F', icon: 'error' },
  cancelled: { label: 'Cancelado', bg: 'var(--surface2)', color: 'var(--muted)', icon: 'block' },
};

/** Caja local para poder revisar las pantallas sin base de datos */
const LOCAL = {};

export async function getServiceRequests(businessId) {
  if (!isLive()) {
    await delay();
    return Object.values(LOCAL);
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('business_id', businessId);

  if (error) return [];
  return data ?? [];
}

export async function getServiceRequest(businessId, kind) {
  if (!isLive()) {
    await delay();
    return LOCAL[kind] ?? null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .eq('business_id', businessId)
    .eq('kind', kind)
    .maybeSingle();

  if (error) return null;
  return data;
}

/** Guarda a medias: estos formularios son largos y nadie los llena de una */
export async function saveServiceDraft(kind, payload) {
  if (!isLive()) {
    await delay(300);
    LOCAL[kind] = { ...(LOCAL[kind] ?? { kind, status: 'draft' }), payload };
    return LOCAL[kind];
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('save_service_draft', {
    p_kind: kind,
    p_payload: payload,
  });
  if (error) throw new Error(`No se pudo guardar: ${error.message}`);
  return Array.isArray(data) ? data[0] : data;
}

export async function submitServiceRequest(kind, payload) {
  if (!isLive()) {
    await delay(500);
    LOCAL[kind] = { kind, status: 'submitted', payload, submitted_at: new Date().toISOString() };
    return LOCAL[kind];
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('submit_service_request', {
    p_kind: kind,
    p_payload: payload,
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data[0] : data;
}
