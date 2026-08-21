'use client';

import { createClient } from '@/utils/supabase/client';
import { cached, invalidate } from './cache';
import { isLive } from './negocio';

const delay = (ms = 140) => new Promise((r) => setTimeout(r, ms));

export async function getCouriersForBusiness() {
  if (!isLive()) {
    await delay();
    return INITIAL_MOCK_DATA;
  }
  
  const supabase = createClient();
  // As this platform has independent couriers, the business can see couriers in their zone.
  // For this view, we'll fetch all active couriers for now.
  const { data, error } = await supabase
    .from('courier_profiles')
    .select('*, profile:profiles!courier_profiles_id_fkey(full_name, phone)')
    .eq('approval_status', 'active');
    
  if (error) return [];
  
  return data.map(c => ({
    id: c.id,
    name: c.profile?.full_name ?? 'Repartidor',
    phone: c.profile?.phone ?? '',
    vehicle: c.vehicle_type === 'motorcycle' ? 'Moto' : 'Bicicleta',
    status: c.status === 'online' ? 'disponible' : (c.status === 'busy' ? 'en_ruta' : 'desconectado'),
    ordersToday: c.total_deliveries, // Mocking today's orders with total for now
    synced: c.status !== 'offline',
    accessCode: 'TURA-' + c.id.substring(0,4)
  }));
}

export async function getPendingCouriers() {
  if (!isLive()) {
    await delay();
    return MOCK_APPROVALS;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('courier_profiles')
    .select('*, profile:profiles!courier_profiles_id_fkey(full_name)')
    .eq('approval_status', 'pending_review');
    
  if (error) return [];
  
  return data.map(c => ({
    id: c.id,
    name: c.profile?.full_name ?? 'Candidato',
    doc: c.plate ?? 'Sin placa',
    vehicle: c.vehicle_type === 'motorcycle' ? 'Moto' : 'Bicicleta',
    status: 'pendiente',
    docs: { cc: true, license: true, soat: false, tecno: false }
  }));
}

const INITIAL_MOCK_DATA = [
  { id: 1, name: 'Carlos Mendoza', phone: '+57 320 123 4567', vehicle: 'Moto', status: 'en_ruta', ordersToday: 12, battery: 85, synced: true, accessCode: 'TURA-4921' },
  { id: 2, name: 'Andrés Felipe Gómez', phone: '+57 310 987 6543', vehicle: 'Bicicleta', status: 'disponible', ordersToday: 4, battery: 92, synced: true, accessCode: 'TURA-8842' },
  { id: 3, name: 'Luis Fernando Ruiz', phone: '+57 315 555 4444', vehicle: 'Moto', status: 'desconectado', ordersToday: 0, battery: 0, synced: false, accessCode: 'TURA-1092' }
];

const MOCK_APPROVALS = [
  { id: 101, name: 'Sofía Angulo', doc: 'CC 1.144.902.318', vehicle: 'Moto - Centro', status: 'pendiente', docs: { cc: true, license: true, soat: false, tecno: false } },
  { id: 102, name: 'Deiner Riascos', doc: 'CC 1.007.551.904', vehicle: 'Moto - La Playita', status: 'pendiente', docs: { cc: true, license: false, soat: false, tecno: false } },
];

export function subscribeToCouriers(onChange) {
  if (!isLive()) return () => {};

  const supabase = createClient();
  const nombre = 'negocio-couriers|' + Math.random().toString(36).slice(2);

  const channel = supabase
    .channel(nombre)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'courier_profiles' },
      onChange
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}