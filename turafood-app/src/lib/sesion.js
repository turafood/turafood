'use client';

/**
 * ENTRAR A PROBAR, SIN REGISTRARSE
 *
 * Pedirle papeles a un negocio antes de dejarlo ver el panel es
 * pedirle fe. Nadie reúne el RUT y la cámara de comercio para mirar
 * una app que todavía no sabe si le sirve.
 *
 * Con la sesión anónima de Supabase se le da un `auth.uid()` real sin
 * pedirle nada. Desde la base es un usuario como cualquier otro: RLS
 * y las funciones no cambian una línea, su catálogo es suyo y nadie
 * más lo ve.
 *
 * Puede trabajar de verdad —cargar su menú, recibir pedidos, cobrar—
 * con el tope de 20 pedidos diarios que ya impone la base a quien no
 * está verificado. Cuando quiera quitarse el tope, sube los papeles.
 * Y si no los tiene, sigue usando la plataforma con el tope: no todo
 * el mundo en Buenaventura tiene RUT, y eso no lo hace menos negocio.
 *
 * Al final pone su correo y la MISMA cuenta pasa a ser suya, con todo
 * lo que hizo mientras probaba.
 *
 * Requiere "Anonymous Sign-Ins" activo en el panel de Supabase.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';

let enCurso = null;

/**
 * Abre una sesión anónima con el rol que corresponda.
 *
 * El rol va en los metadatos porque `handle_new_user()` los lee para
 * crear el perfil: sin eso entraría como cliente y el proxy lo
 * mandaría a /sin-acceso.
 */
export async function probarComo(rol) {
  if (!isConfigured()) return null;
  if (!['business', 'courier'].includes(rol)) return null;

  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  if (enCurso) return enCurso;

  enCurso = (async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { role: rol } },
      });
      if (error) throw error;

      const nuevo = data.user;
      if (!nuevo) return null;

      // La ficha que le corresponde. Sin ella el panel entra pero se
      // ve vacío, y parece roto en vez de nuevo.
      if (rol === 'business') {
        await supabase.rpc('register_business', {
          p_name: 'Mi negocio',
          p_phone: null,
        });
      } else {
        await supabase.from('courier_profiles').insert({
          id: nuevo.id,
          status: 'offline',
          approval_status: 'pending_review',
          vehicle_type: 'motorcycle',
        });
      }

      return nuevo;
    } catch {
      return null;
    } finally {
      enCurso = null;
    }
  })();

  return enCurso;
}

/** ¿Está probando, sin haber dado sus datos todavía? */
export async function esInvitado() {
  if (!isConfigured()) return false;
  const { data: { user } } = await createClient().auth.getUser();
  return Boolean(user?.is_anonymous);
}

/**
 * Se queda con la cuenta.
 *
 * Es la misma fila de `auth.users`: el menú que cargó, los pedidos que
 * despachó y su historial siguen siendo suyos.
 */
export async function quedarseConLaCuenta(email, password) {
  const { error } = await createClient().auth.updateUser({ email, password });
  if (error) throw new Error(error.message);
  return true;
}
