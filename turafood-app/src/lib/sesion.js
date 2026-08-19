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
export async function probarComo(rol, onPaso) {
  if (!isConfigured()) return null;
  if (!['business', 'courier'].includes(rol)) return null;

  // `onPaso` deja que la pantalla cuente lo que de verdad está
  // pasando. Los mensajes se disparan cuando el paso ocurre, no con un
  // temporizador: si algo tarda, se ve dónde tardó.
  const paso = (n) => { try { onPaso?.(n); } catch { /* la UI no rompe esto */ } };

  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (user) { paso('listo'); return user; }

  if (enCurso) return enCurso;

  enCurso = (async () => {
    try {
      paso('sesion');
      const { data, error } = await supabase.auth.signInAnonymously({
        options: { data: { role: rol } },
      });
      if (error) throw error;

      const nuevo = data.user;
      if (!nuevo) return null;

      // La ficha que le corresponde. Sin ella el panel entra pero se
      // ve vacío, y parece roto en vez de nuevo.
      paso('ficha');
      if (rol === 'business') {
        await supabase.rpc('register_business', {
          p_name: 'Mi negocio',
          p_phone: null,
        });

        // Un panel vacío no se puede evaluar: no hay nada que tocar,
        // nada que arrastrar, nada que se vea. Se carga el menú de
        // arranque del vertical para que desde el primer segundo haya
        // productos con foto y precio — suyos, editables y borrables.
        paso('menu');
        try {
          const { loadStarterMenu } = await import('./menuDemo');
          await loadStarterMenu(nuevo.id, 'restaurant');
        } catch (errMenu) {
          // Sin menú de ejemplo se entra igual: el panel lo ofrece
          // con un botón desde su propia pantalla. Pero que quede
          // dicho, porque sin menú tampoco hay comandas de ejemplo.
          console.warn('[turafood] no se cargó el menú de arranque:', errMenu?.message ?? errMenu);
        }

        // Y cuatro comandas, una por columna. Un tablero que dice
        // "Sin comandas" cuatro veces no enseña nada: no hay nada que
        // aceptar, nada que mover, nada que cronometrar. Son pedidos
        // de verdad en su cuenta, así que se manejan con los mismos
        // botones — y se borran solos cuando entre el primero real.
        paso('comandas');
        {
          // Un `catch {}` mudo acá escondió durante días que la
          // función fallaba: el tablero salía vacío y no había forma
          // de saber por qué. Sigue sin frenar la entrada, pero deja
          // rastro. `rpc` no lanza, devuelve `error`.
          const { error: errComandas } = await supabase.rpc('sembrar_pedidos_demo');
          if (errComandas) {
            console.warn('[turafood] no se sembraron comandas de ejemplo:', errComandas.message);
          }
        }
      } else {
        await supabase.from('courier_profiles').insert({
          id: nuevo.id,
          status: 'offline',
          approval_status: 'pending_review',
          vehicle_type: 'motorcycle',
        });
      }

      paso('listo');
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
  const { data: { session } } = await createClient().auth.getSession();
  const user = session?.user ?? null;
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

/**
 * Quién es, sin salir a la red.
 *
 * `getUser()` revalida el token contra el servidor en cada llamada.
 * Para saber por qué id filtrar no hace falta: eso lo decide RLS
 * contra el token que ya viaja en la consulta. Leer la sesión
 * guardada ahorra un viaje de ida y vuelta por pantalla.
 */
export async function usuarioActual() {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.user ?? null;
}
