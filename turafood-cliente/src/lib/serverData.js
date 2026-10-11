/**
 * TURAFOOD — DATOS PÚBLICOS PARA EL SERVIDOR
 *
 * Consultas que se hacen en el servidor antes de enviar el HTML, para que
 * la primera pantalla llegue con el contenido ya puesto en vez de un
 * esqueleto que el navegador llena después de descargar y ejecutar todo
 * el JavaScript.
 *
 * Solo datos públicos (negocios activos), con la clave anónima: las
 * mismas filas que ya puede leer cualquiera por RLS. Nada de sesión ni
 * cookies aquí, por eso el resultado se puede guardar en el borde de
 * Cloudflare unos segundos y servirlo a todos.
 *
 * Si algo falla devuelve `null` y la pantalla cae al flujo normal del
 * navegador (data.js), así que esto nunca puede dejar la página rota.
 */

import { distanceKm } from './format';
import { BUENAVENTURA } from './seed';

/** Cuánto vive la respuesta en la caché del borde de Cloudflare */
const EDGE_TTL = 30;

function toLatLng(geo) {
  if (geo && typeof geo === 'object' && Array.isArray(geo.coordinates)) {
    return { lat: geo.coordinates[1], lng: geo.coordinates[0] };
  }
  return null;
}

/** Mismo cálculo que `withDistance` de data.js (que es código de navegador). */
function conDistancia(negocio, desde) {
  const punto = negocio.lat != null
    ? { lat: negocio.lat, lng: negocio.lng }
    : toLatLng(negocio.location);
  return { ...negocio, distance_km: punto && desde ? distanceKm(desde, punto) : null };
}

/**
 * Negocios activos, ordenados por calificación, con la distancia desde
 * el punto por defecto (la misma que calcula el navegador al abrir).
 */
export async function negociosActivosServidor() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/business_profiles?select=*&status=eq.active&order=rating.desc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
        // Solo lo entiende Cloudflare Workers: guarda la respuesta en el borde.
        cf: { cacheTtl: EDGE_TTL, cacheEverything: true },
        signal: AbortSignal.timeout(4000),
      },
    );
    if (!res.ok) return null;
    const filas = await res.json();
    if (!Array.isArray(filas)) return null;
    return filas.map((b) => conDistancia(b, BUENAVENTURA.home));
  } catch {
    return null;
  }
}
