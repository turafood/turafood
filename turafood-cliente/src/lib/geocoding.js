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

/** Lista de Barrios y Puntos Clave de Buenaventura para autocompletado instantáneo */
export const BUENAVENTURA_BARRIOS = [
  { name: 'Centro', detail: 'Comuna 1 · Zona Comercial y Bancaria', lat: 3.88425, lng: -77.02905 },
  { name: 'Pueblo Nuevo', detail: 'Comuna 1 · Muelle y Galería', lat: 3.88600, lng: -77.02700 },
  { name: 'La Independencia', detail: 'Comuna 10 · Vía Principal', lat: 3.87008, lng: -77.05412 },
  { name: 'El Jorge', detail: 'Comuna 4 · Av. Simón Bolívar', lat: 3.87755, lng: -77.04010 },
  { name: 'Bellavista', detail: 'Comuna 7 · Zona Residencial', lat: 3.87200, lng: -77.04800 },
  { name: 'Juan XXIII', detail: 'Comuna 6 · Zona Residencial', lat: 3.87450, lng: -77.04350 },
  { name: 'San Luis', detail: 'Comuna 7 · Carrera 54', lat: 3.86850, lng: -77.05800 },
  { name: 'Punta del Este', detail: 'Comuna 5 · Vía Alterna', lat: 3.87480, lng: -77.04520 },
  { name: 'La Playita', detail: 'Comuna 1 · Vía al Muelle', lat: 3.87960, lng: -77.03680 },
  { name: 'Nayita', detail: 'Comuna 1 · Frente al Malecón', lat: 3.88200, lng: -77.03400 },
  { name: 'Alberto Lleras Camargo', detail: 'Comuna 3 · Zona Portuaria', lat: 3.87800, lng: -77.03800 },
  { name: 'Matías Mulumba', detail: 'Comuna 12 · Vía al Aeropuerto', lat: 3.86200, lng: -77.06500 },
  { name: 'Transformación', detail: 'Comuna 11 · Zona Continental', lat: 3.86500, lng: -77.06000 },
  { name: 'El Galeón', detail: 'Comuna 4 · Los Laureles', lat: 3.87600, lng: -77.04200 },
  { name: 'Muelle Turístico', detail: 'Malecón Bahía de la Cruz', lat: 3.88700, lng: -77.02600 },
  { name: 'Avenida Simón Bolívar', detail: 'Arteria Principal del Puerto', lat: 3.87500, lng: -77.04500 },
];

/**
 * Busca direcciones. Devuelve coincidencias instantáneas locales de
 * Buenaventura combinadas con Photon/OpenStreetMap.
 */
export async function searchAddress(query, signal) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  // 1. Coincidencias locales inmediatas en barrios de Buenaventura
  const localMatches = BUENAVENTURA_BARRIOS
    .filter(b => b.name.toLowerCase().includes(q) || b.detail.toLowerCase().includes(q))
    .map(b => ({
      id: `local-${b.name}`,
      label: query.includes('#') || query.includes('Cra') || query.includes('Cl') ? query : `Barrio ${b.name}`,
      detail: b.detail,
      lat: b.lat,
      lng: b.lng,
      inCoverage: true,
    }));

  try {
    const url = new URL(PHOTON);
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', '15');
    url.searchParams.set('bbox', `${BOUNDS.minLng},${BOUNDS.minLat},${BOUNDS.maxLng},${BOUNDS.maxLat}`);
    url.searchParams.set('lat', String(BUENAVENTURA_CENTER.lat));
    url.searchParams.set('lon', String(BUENAVENTURA_CENTER.lng));

    const res = await fetch(url, { signal });
    if (!res.ok) return localMatches;

    const data = await res.json();
    const remote = (data.features ?? [])
      .map(formatFeature)
      .filter((f) => f.inCoverage && f.lat != null);

    // Unir locales con remotos sin duplicar
    const combined = [...localMatches, ...remote];
    const unique = [];
    const seen = new Set();

    for (const item of combined) {
      const key = `${item.label.toLowerCase()}-${item.detail.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique.slice(0, 8);
  } catch {
    return localMatches;
  }
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
