'use client';

/**
 * GEOCODIFICACIÓN
 *
 * Photon (photon.komoot.io): buscador sobre datos de OpenStreetMap, gratis,
 * sin llave y pensado para autocompletar. Todo se sesga hacia Buenaventura
 * para que "Cra 3" no devuelva una calle de Bogotá.
 *
 * Lo de "escribir una dirección":
 *   · Quien escribe a mano usa abreviaturas ("cra 3 # 4-58"); Photon no las
 *     entiende. Se normalizan primero (ver direcciones.mjs).
 *   · NUNCA se inventan coordenadas. Antes, "Usar dirección escrita"
 *     guardaba el centro de la ciudad para cualquier texto, y el repartidor
 *     recibía un punto equivocado. Ahora, si no hay coincidencia exacta, se
 *     devuelve el barrio como punto APROXIMADO y la pantalla le pide a la
 *     persona que ajuste el pin en el mapa.
 */

import {
  CENTRO, BOUNDS, enCobertura, parseDireccionCO, direccionCompleta,
} from './direcciones.mjs';

export { enCobertura as isInCoverage };
export const BUENAVENTURA_CENTER = CENTRO;

/** Encuadre del mapa dentro del puerto */
export const MAP_BOUNDS = [
  [BOUNDS.minLat, BOUNDS.minLng],
  [BOUNDS.maxLat, BOUNDS.maxLng],
];

const PHOTON = 'https://photon.komoot.io/api/';
const REVERSE = 'https://photon.komoot.io/reverse';
const BBOX = `${BOUNDS.minLng},${BOUNDS.minLat},${BOUNDS.maxLng},${BOUNDS.maxLat}`;

/** Barrios y puntos clave: sugerencias instantáneas y respaldo de puntos aproximados */
export const BUENAVENTURA_BARRIOS = [
  { name: 'Centro', detail: 'Comuna 1 · Zona comercial y bancaria', lat: 3.88425, lng: -77.02905 },
  { name: 'Pueblo Nuevo', detail: 'Comuna 1 · Muelle y Galería', lat: 3.88600, lng: -77.02700 },
  { name: 'La Independencia', detail: 'Comuna 10 · Vía principal', lat: 3.87008, lng: -77.05412 },
  { name: 'El Jorge', detail: 'Comuna 4 · Av. Simón Bolívar', lat: 3.87755, lng: -77.04010 },
  { name: 'Bellavista', detail: 'Comuna 7 · Zona residencial', lat: 3.87200, lng: -77.04800 },
  { name: 'Juan XXIII', detail: 'Comuna 6 · Zona residencial', lat: 3.87450, lng: -77.04350 },
  { name: 'San Luis', detail: 'Comuna 7 · Carrera 54', lat: 3.86850, lng: -77.05800 },
  { name: 'Punta del Este', detail: 'Comuna 5 · Vía alterna', lat: 3.87480, lng: -77.04520 },
  { name: 'La Playita', detail: 'Comuna 1 · Vía al muelle', lat: 3.87960, lng: -77.03680 },
  { name: 'Nayita', detail: 'Comuna 1 · Frente al malecón', lat: 3.88200, lng: -77.03400 },
  { name: 'Alberto Lleras Camargo', detail: 'Comuna 3 · Zona portuaria', lat: 3.87800, lng: -77.03800 },
  { name: 'Matías Mulumba', detail: 'Comuna 12 · Vía al aeropuerto', lat: 3.86200, lng: -77.06500 },
  { name: 'Transformación', detail: 'Comuna 11 · Zona continental', lat: 3.86500, lng: -77.06000 },
  { name: 'El Galeón', detail: 'Comuna 4 · Los Laureles', lat: 3.87600, lng: -77.04200 },
  { name: 'Muelle Turístico', detail: 'Malecón Bahía de la Cruz', lat: 3.88700, lng: -77.02600 },
  { name: 'Avenida Simón Bolívar', detail: 'Arteria principal del puerto', lat: 3.87500, lng: -77.04500 },
];

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Barrio de la lista cuyo nombre aparece en el texto (para un punto aproximado) */
export function barrioEnTexto(texto) {
  const t = sinTildes(texto);
  return BUENAVENTURA_BARRIOS.find((b) => t.includes(sinTildes(b.name))) ?? null;
}

/**
 * Photon → sugerencia con título (calle y número) y subtítulo (barrio).
 * `exacta` = Photon conoce el número de puerta; si no, la persona debería
 * confirmar el punto en el mapa.
 */
function formatFeature(feature, numeroEscrito = '') {
  const p = feature.properties ?? {};
  const [lng, lat] = feature.geometry?.coordinates ?? [];
  if (!enCobertura(lat, lng)) return null;

  const calle = p.street || p.name || '';
  if (!calle) return null;
  const numero = p.housenumber || numeroEscrito;
  const titulo = numero ? `${calle} #${numero}` : calle;
  const lugar = p.street && p.name && p.name !== p.street ? `${p.name} · ` : '';

  const barrio = (p.suburb || p.locality || p.district || '').replace(/^Localidad /i, '');
  const area = [barrio, p.city || 'Buenaventura'].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');

  return {
    id: `${lat.toFixed(5)},${lng.toFixed(5)},${titulo}`,
    label: `${lugar}${titulo}`,
    detail: area,
    neighborhood: barrio || null,
    lat,
    lng,
    exacta: Boolean(p.housenumber),
    inCoverage: true,
  };
}

function sugerenciasLocales(q) {
  const t = sinTildes(q);
  if (t.length < 2) return [];
  return BUENAVENTURA_BARRIOS
    .filter((b) => sinTildes(b.name).includes(t) || sinTildes(b.detail).includes(t))
    .slice(0, 3)
    .map((b) => ({
      id: `barrio-${b.name}`,
      label: b.name,
      detail: `Barrio · ${b.detail}`,
      neighborhood: b.name,
      lat: b.lat,
      lng: b.lng,
      exacta: false,
      barrio: true,
      inCoverage: true,
    }));
}

const cache = new Map();

/** Sugerencias mientras se escribe: Photon (calles reales) + barrios conocidos */
export async function searchAddress(query, signal) {
  const texto = String(query ?? '').trim();
  if (texto.length < 2) return [];

  const { calle, numero } = parseDireccionCO(texto);
  const base = (calle || texto).trim();
  const locales = sugerenciasLocales(texto);
  if (base.length < 3) return locales;

  const clave = `${base}|${numero}`.toLowerCase();
  if (cache.has(clave)) return mezclar(cache.get(clave), locales);

  try {
    const url = new URL(PHOTON);
    url.searchParams.set('q', `${base} Buenaventura`);
    url.searchParams.set('limit', '10');
    url.searchParams.set('bbox', BBOX);
    url.searchParams.set('lat', String(CENTRO.lat));
    url.searchParams.set('lon', String(CENTRO.lng));
    url.searchParams.set('location_bias_scale', '0.6');
    // Sin `lang`: Photon solo acepta default/de/en/fr y con "es" responde 400.

    const res = await fetch(url, { signal });
    if (!res.ok) return locales;
    const data = await res.json();

    const vistos = new Set();
    const remotos = [];
    for (const f of data.features ?? []) {
      const s = formatFeature(f, numero);
      if (s && !vistos.has(s.label)) { vistos.add(s.label); remotos.push(s); }
    }
    cache.set(clave, remotos);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return mezclar(remotos, locales);
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    return locales;
  }
}

function mezclar(remotos, locales) {
  const vistos = new Set();
  const out = [];
  // Los barrios exactos primero solo si coinciden por nombre; si no, después de las calles
  for (const s of [...remotos.slice(0, 5), ...locales, ...remotos.slice(5)]) {
    const k = sinTildes(s.label);
    if (!vistos.has(k)) { vistos.add(k); out.push(s); }
  }
  return out.slice(0, 6);
}

/** Dirección aproximada de un punto (cuando se mueve el pin) */
export async function reverseGeocode(lat, lng, signal) {
  const url = new URL(REVERSE);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    // La coordenada es la del pin, no la del objeto más cercano
    return formatFeature({ ...f, geometry: { coordinates: [lng, lat] } });
  } catch {
    return null;
  }
}

/**
 * Ubica una dirección ESCRITA a mano (sin haber elegido una sugerencia).
 * Devuelve el mejor punto y si es exacto o aproximado, o null si no hay
 * dónde ponerlo (en cuyo caso la persona debe mover el pin).
 */
export async function puntoDeTexto(texto, signal) {
  const q = String(texto ?? '').trim();
  if (q.length < 3) return null;

  const sugerencias = await searchAddress(q, signal).catch(() => []);
  const calle = sugerencias.find((s) => !s.barrio);
  if (calle) return { ...calle, aproximado: !calle.exacta };

  const barrio = sugerencias.find((s) => s.barrio) ?? (() => {
    const b = barrioEnTexto(q);
    return b ? { lat: b.lat, lng: b.lng, neighborhood: b.name, detail: b.detail } : null;
  })();
  if (barrio) return { ...barrio, label: q, aproximado: true };

  return null;
}

export { direccionCompleta, parseDireccionCO };
