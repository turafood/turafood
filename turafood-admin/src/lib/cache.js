'use client';

/**
 * CACHÉ EN MEMORIA ENTRE PANTALLAS
 *
 * Cada pantalla hacía su consulta al montar: se veía el esqueleto,
 * llegaban los datos, se pintaba. Al volver atrás, otra vez lo mismo —
 * aunque los datos fueran los de hace ocho segundos. Ese parpadeo es
 * lo que hace que una web se sienta web y no aplicación.
 *
 * Esto guarda la última respuesta de cada consulta. Al volver a una
 * pantalla se pinta de una con lo que había, y la consulta sigue en
 * segundo plano para refrescar si algo cambió. Es la diferencia entre
 * "cargando" y "ya está, y además se actualizó".
 *
 * Vive en memoria a propósito: se limpia sola al recargar la página.
 * Guardar esto en localStorage traería datos de la sesión anterior, y
 * un negocio que cambió de dueño vería el catálogo del anterior.
 */

const store = new Map();

/** Cuánto vale una respuesta antes de considerarla vieja */
const DEFAULT_TTL = 30000;

/**
 * Devuelve lo que haya en caché de inmediato (si sirve) y refresca
 * detrás. `onFresh` recibe los datos nuevos cuando lleguen.
 *
 * Si no hay nada guardado, espera la consulta como siempre.
 */
export async function cached(key, fetcher, { ttl = DEFAULT_TTL, onFresh } = {}) {
  const hit = store.get(key);
  const fresh = hit && Date.now() - hit.at < ttl;

  if (hit) {
    // Refresca detrás sin bloquear. Un fallo aquí no se propaga: la
    // pantalla ya tiene con qué pintarse y avisar de un error de red
    // sobre datos que se ven bien solo confunde.
    if (!fresh) {
      Promise.resolve()
        .then(fetcher)
        .then((data) => {
          store.set(key, { data, at: Date.now() });
          onFresh?.(data);
        })
        .catch(() => {});
    }
    return hit.data;
  }

  const data = await fetcher();
  store.set(key, { data, at: Date.now() });
  return data;
}

/**
 * Bota lo guardado después de escribir.
 *
 * Sin esto, aceptar un pedido y volver a la lista mostraría el pedido
 * todavía sin aceptar durante medio minuto. `invalidate('pedidos')`
 * bota todas las claves que empiecen así.
 */
export function invalidate(prefix) {
  if (!prefix) { store.clear(); return; }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
