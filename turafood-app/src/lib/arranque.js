'use client';

/**
 * GUARDAR LAS RESPUESTAS DEL ARRANQUE
 *
 * Las del negocio van por RPC y no por UPDATE directo: además de
 * guardar, el servidor traduce el nicho a vertical, y del vertical
 * sale la comisión. Si eso quedara en el navegador, cualquiera se
 * pondría la del 10% siendo droguería (que paga 15%).
 *
 * Las del repartidor sí van directo a su ficha, porque ninguna toca
 * plata: en qué se mueve, cuándo puede y si ya repartió antes.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

/** Lo que contestó el repartidor, a las columnas que ya existen */
const VEHICULO = {
  moto: 'motorcycle',
  bicicleta: 'bicycle',
  carro: 'car',
  pie: 'walk',
};

export async function guardarArranque(rol, respuestas) {
  if (!isConfigured()) return null;

  const supabase = createClient();

  if (rol === 'business') {
    const { data, error } = await supabase.rpc('guardar_onboarding', {
      p_respuestas: respuestas,
    });
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data[0] : data;
  }

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) throw new Error('No hay sesión');

  const { data, error } = await supabase
    .from('courier_profiles')
    .update({
      // `vehicle_type` la lee el panel para decidir qué pedidos
      // ofrecerle, así que se traduce a los valores que ya usa la
      // base — no a los ids de las preguntas.
      vehicle_type: VEHICULO[respuestas.vehiculo] ?? null,
      onboarding: respuestas,
      onboarding_at: new Date().toISOString(),
    })
    .eq('id', uid)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
