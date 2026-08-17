'use client';

/**
 * GEOCODIFICACIÓN
 *
 * Usa Photon (photon.komoot.io), un buscador sobre datos de
 * OpenStreetMap: gratis, sin API key y pensado para autocompletado.
 * No requiere cuenta ni tarjeta, que es justo lo que necesitamos.
 *
 * Las búsquedas se sesgan hacia Buenaventura para que "Cra 3" no
 * devuelva una calle de Bogotá.
 */

/** Centro de Buenaventura y área que cubrimos */
export const BUENAVENTURA_CENTER = { lat: 3.8801, lng: -77.0312 };

/**
 * Área de operación: casco urbano de Buenaventura y alrededores
 * inmediatos. TuraFood no sirve fuera de aquí, así que la búsqueda
 * tampoco debe mostrar nada de afuera.
 */
export const BOUNDS = {
  minLat: 3.79, maxLat: 3.96,
  minLng: -77.16, maxLng: -76.94,
};

/** Para encuadrar el mapa dentro del puerto */
export const MAP_BOUNDS = [
  [BOUNDS.minLat, BOUNDS.minLng],
  [BOUNDS.maxLat, BOUNDS.maxLng],
];

const PHOTON = 'https://photon.komoot.io/api/';
const REVERSE = 'https://photon.komoot.io/reverse';

/** ¿El punto cae dentro del área que servimos? */
export function isInCoverage(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat
    && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

/** Arma una línea legible a partir de las propiedades de Photon */
function formatFeature(feature) {
  const p = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [];

  // "Carrera 3 #4-58" o el nombre del lugar
  const street = [p.street, p.housenumber].filter(Boolean).join(' #');
  const main = street || p.name || p.district || 'Dirección sin nombre';

  // Barrio o zona, para desambiguar
  const area = [p.district, p.city, p.county]
    .filter((v, i, arr) => v && arr.indexOf(v) === i && v !== main)
    .slice(0, 2)
    .join(', ');

  return {
    id: `${lat},${lng},${main}`,
    label: main,
    detail: area || p.state || '',
    lat,
    lng,
    inCoverage: isInCoverage(lat, lng),
  };
}

/**
 * Busca direcciones. Devuelve máximo 6 sugerencias, primero las que
 * caen dentro de Buenaventura.
 */
export async function searchAddress(query, signal) {
  const q = query.trim();
  if (q.length < 3) return [];

  const url = new URL(PHOTON);
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '25');
  // OJO: Photon NO acepta lang=es — responde 400. Solo admite
  // de/en/fr/it. Lo omitimos: los nombres de calles vienen de
  // OpenStreetMap en su idioma original, que aquí ya es español.

  // TuraFood opera SOLO en Buenaventura. El bbox limita la búsqueda al
  // puerto: sin esto, "Bellavista" traía resultados de Ecuador.
  url.searchParams.set(
    'bbox',
    `${BOUNDS.minLng},${BOUNDS.minLat},${BOUNDS.maxLng},${BOUNDS.maxLat}`,
  );
  url.searchParams.set('lat', String(BUENAVENTURA_CENTER.lat));
  url.searchParams.set('lon', String(BUENAVENTURA_CENTER.lng));

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('No pudimos buscar la dirección. Intenta de nuevo.');

  const data = await res.json();

  return (data.features ?? [])
    .map(formatFeature)
    // Descarte duro: si el bbox dejó pasar algo, aquí no entra
    .filter((f) => f.inCoverage && f.lat != null)
    // Sin duplicados por nombre + zona
    .filter((f, i, arr) => arr.findIndex((o) => o.label === f.label && o.detail === f.detail) === i)
    // Lo más cercano al centro del puerto primero
    .sort((a, b) => distanceTo(a) - distanceTo(b))
    .slice(0, 8);
}

/** Distancia aproximada al centro, para ordenar resultados */
function distanceTo(f) {
  const dLat = f.lat - BUENAVENTURA_CENTER.lat;
  const dLng = f.lng - BUENAVENTURA_CENTER.lng;
  return Math.hypot(dLat, dLng);
}

/** Dirección aproximada de un punto (cuando el usuario mueve el pin) */
export async function reverseGeocode(lat, lng, signal) {
  const url = new URL(REVERSE);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  // Sin `lang`: ver nota en searchAddress()

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    return feature ? formatFeature(feature) : null;
  } catch {
    // Si el reverse falla, el usuario igual puede escribir la dirección
    return null;
  }
}
