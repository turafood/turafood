'use client';

/**
 * LA FLOTA PROPIA DEL NEGOCIO
 *
 * Cada negocio pone sus propios repartidores. El negocio comparte un
 * código (o un enlace); el repartidor lo escribe al registrarse y queda
 * ligado a ese negocio: solo ve y toma sus pedidos.
 *
 * Todo pasa por funciones de la base (flota_*), que comprueban que quien
 * llama sea el dueño. Antes esta pantalla listaba a TODOS los repartidores
 * de la plataforma con un código inventado ("TURA-xxxx").
 */

import { createClient } from '@/utils/supabase/client';
import { isLive } from './negocio';

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

const VEHICULOS = { motorcycle: 'Moto', bicycle: 'Bicicleta', car: 'Carro' };

/** Enlace que se le manda al repartidor */
export const enlaceDeFlota = (codigo) => `https://app.turafood.com/unirse?c=${encodeURIComponent(codigo)}`;

/** Mensaje listo para WhatsApp */
export function linkWhatsAppFlota(codigo, negocio) {
  const texto = `Hola, te invito a repartir para ${negocio || 'mi negocio'} en TuraFood. Entra aquí y pon el código ${codigo}: ${enlaceDeFlota(codigo)}`;
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export async function getCodigoFlota() {
  if (!isLive()) { await delay(); return 'DEMO23'; }
  const { data, error } = await createClient().rpc('flota_codigo');
  if (error) throw new Error(error.message);
  return data;
}

export async function nuevoCodigoFlota() {
  if (!isLive()) { await delay(); return 'DEMO45'; }
  const { data, error } = await createClient().rpc('flota_nuevo_codigo');
  if (error) throw new Error(error.message);
  return data;
}

/** Repartidores de este negocio */
export async function getFlota() {
  if (!isLive()) { await delay(); return []; }

  const { data, error } = await createClient().rpc('flota_mis_repartidores');
  if (error) throw new Error(error.message);

  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre?.trim() || 'Repartidor sin nombre',
    telefono: c.telefono ?? '',
    vehiculo: VEHICULOS[c.vehiculo] ?? 'Moto',
    placa: c.placa ?? '',
    estado: c.en_curso ? 'en_ruta' : c.estado === 'online' ? 'disponible' : 'desconectado',
    entregas: c.entregas ?? 0,
    desde: c.desde,
  }));
}

export async function quitarDeFlota(courierId) {
  if (!isLive()) { await delay(); return; }
  const { error } = await createClient().rpc('flota_quitar', { p_courier: courierId });
  if (error) throw new Error(error.message);
}

/** ¿Solo repartidores propios pueden tomar los pedidos de este negocio? */
export async function getSoloFlotaPropia(negocioId) {
  if (!isLive() || !negocioId) return false;
  const { data } = await createClient()
    .from('business_profiles')
    .select('solo_flota_propia')
    .eq('id', negocioId)
    .maybeSingle();
  return Boolean(data?.solo_flota_propia);
}

export async function setSoloFlotaPropia(valor) {
  if (!isLive()) { await delay(); return; }
  const { error } = await createClient().rpc('flota_configurar', { p_solo_propia: Boolean(valor) });
  if (error) throw new Error(error.message);
}

/** Se actualiza cuando un repartidor se une, se conecta o termina una entrega */
export function subscribeToFlota(onChange) {
  if (!isLive()) return () => {};

  const supabase = createClient();
  const nombre = 'negocio-flota|' + Math.random().toString(36).slice(2);

  const channel = supabase
    .channel(nombre)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'courier_profiles' }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
