'use client';

/**
 * GEOCODIFICACIÓN REFORZADA PARA BUENAVENTURA
 *
 * Motor híbrido multicapa:
 *   1. Catálogo Local Oficial de Buenaventura: Más de 60 barrios, 12 comunas y 35+ hitos clave.
 *   2. Resolver Inteligente de Nomenclaturas y Direcciones Sueltas de Buenaventura.
 *   3. Photon OSM (photon.komoot.io) con encuadre estricto en el puerto.
 *   4. Fallback de respaldo con OpenStreetMap Nominatim.
 *   5. Geocodificación inversa enriquecida con detección automática de Comuna y Barrio.
 *   6. Detección GPS satelital de alta precisión en 1 toque.
 */

import {
  CENTRO, BOUNDS, enCobertura, parseDireccionCO, direccionCompleta,
} from './direcciones.mjs';

import {
  BUENAVENTURA_COMUNAS,
  BUENAVENTURA_BARRIOS,
  BUENAVENTURA_HITOS,
  BUENAVENTURA_VIAS,
  buscarEnBuenaventura,
  resolverDireccionBuenaventura,
  barrioPorCoordenadas,
  sinTildes,
} from './buenaventura-geo';

export {
  enCobertura as isInCoverage,
  BUENAVENTURA_COMUNAS,
  BUENAVENTURA_BARRIOS,
  BUENAVENTURA_HITOS,
  BUENAVENTURA_VIAS,
  buscarEnBuenaventura,
  resolverDireccionBuenaventura,
  barrioPorCoordenadas,
};

export const BUENAVENTURA_CENTER = CENTRO;

/** Encuadre del mapa dentro del puerto */
export const MAP_BOUNDS = [
  [BOUNDS.minLat, BOUNDS.minLng],
  [BOUNDS.maxLat, BOUNDS.maxLng],
];

const PHOTON = 'https://photon.komoot.io/api/';
const REVERSE = 'https://photon.komoot.io/reverse';
const BBOX = `${BOUNDS.minLng},${BOUNDS.minLat},${BOUNDS.maxLng},${BOUNDS.maxLat}`;

/** Barrio de la lista cuyo nombre aparece en el texto */
export function barrioEnTexto(texto) {
  const t = sinTildes(texto);
  return (
    BUENAVENTURA_BARRIOS.find(
      (b) => t.includes(sinTildes(b.name)) || b.aliases?.some((a) => t.includes(sinTildes(a)))
    ) ?? null
  );
}

/**
 * Formatea un resultado de Photon/Nominatim
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

  // Determinar barrio mediante las propiedades de OSM o el polígono local más cercano
  const barrioOsm = (p.suburb || p.locality || p.district || '').replace(/^Localidad /i, '');
  const barrioLocal = barrioPorCoordenadas(lat, lng)?.name;
  const barrioFinal = barrioOsm || barrioLocal || null;

  const area = [barrioFinal, 'Buenaventura'].filter(Boolean).join(', ');

  return {
    id: `${lat.toFixed(5)},${lng.toFixed(5)},${titulo}`,
    label: `${lugar}${titulo}`,
    detail: area,
    neighborhood: barrioFinal,
    lat,
    lng,
    exacta: Boolean(p.housenumber),
    inCoverage: true,
  };
}

const cache = new Map();

/**
 * Búsqueda con respaldo de Nominatim si Photon no tiene resultados
 */
async function buscarNominatim(q, signal) {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', `${q}, Buenaventura, Colombia`);
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('viewbox', `${BOUNDS.minLng},${BOUNDS.maxLat},${BOUNDS.maxLng},${BOUNDS.minLat}`);
    url.searchParams.set('bounded', '1');
    url.searchParams.set('countrycodes', 'co');
    url.searchParams.set('limit', '5');

    const res = await fetch(url, { signal, headers: { 'Accept-Language': 'es' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? [])
      .map((f) => formatFeature(f))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Búsqueda Unificada de Alta Precisión:
 * 1. Base Local de Buenaventura (Hitos, Comunas, Barrios).
 * 2. Resolver inteligente de direcciones compuestas.
 * 3. Photon OSM con sesgo de Buenaventura.
 * 4. Respaldo Nominatim OSM.
 */
export async function searchAddress(query, signal) {
  const texto = String(query ?? '').trim();
  if (texto.length < 2) return [];

  // 1. Resultados locales instantáneos de Buenaventura (< 5ms)
  const locales = buscarEnBuenaventura(texto);

  // 2. Resolver sintético si contiene calle y barrio o nomenclatura
  const sintetico = resolverDireccionBuenaventura(texto);
  const sintetizados = sintetico ? [sintetico] : [];

  const { calle, numero } = parseDireccionCO(texto);
  const base = (calle || texto).trim();

  // Si no hay consulta suficiente para la red, devolver locales y sintéticos
  if (base.length < 3) {
    return mezclar(sintetizados, locales, []);
  }

  const clave = `${base}|${numero}`.toLowerCase();
  if (cache.has(clave)) {
    return mezclar(sintetizados, locales, cache.get(clave));
  }

  let remotos = [];

  // 3. Consulta a Photon
  try {
    const url = new URL(PHOTON);
    url.searchParams.set('q', `${base} Buenaventura`);
    url.searchParams.set('limit', '8');
    url.searchParams.set('bbox', BBOX);
    url.searchParams.set('lat', String(CENTRO.lat));
    url.searchParams.set('lon', String(CENTRO.lng));
    url.searchParams.set('location_bias_scale', '0.6');

    const res = await fetch(url, { signal });
    if (res.ok) {
      const data = await res.json();
      const vistos = new Set();
      for (const f of data.features ?? []) {
        const s = formatFeature(f, numero);
        if (s && !vistos.has(s.label)) {
          vistos.add(s.label);
          remotos.push(s);
        }
      }
    }
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
  }

  // 4. Si Photon devolvió menos de 2 resultados, consultar Nominatim
  if (remotos.length < 2) {
    try {
      const nomResults = await buscarNominatim(base, signal);
      remotos = [...remotos, ...nomResults];
    } catch {}
  }

  cache.set(clave, remotos);
  if (cache.size > 80) cache.delete(cache.keys().next().value);

  return mezclar(sintetizados, locales, remotos);
}

function mezclar(sintetizados, locales, remotos) {
  const vistos = new Set();
  const out = [];

  // Orden de prioridad:
  // 1. Sintéticos exactos con número y barrio
  // 2. Hitos y sitios populares de Buenaventura
  // 3. Resultados de calles OSM
  // 4. Barrios generales
  const todos = [...sintetizados, ...locales, ...remotos];

  for (const s of todos) {
    const k = sinTildes(s.label);
    if (!vistos.has(k)) {
      vistos.add(k);
      out.push(s);
    }
  }

  return out.slice(0, 7);
}

/**
 * Geocodificación Inversa Enriquecida:
 * Obtiene la calle con Photon y la enriquece con el Barrio y Comuna exactos
 * de la base de datos de Buenaventura.
 */
export async function reverseGeocode(lat, lng, signal) {
  const url = new URL(REVERSE);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));

  const barrioCercano = barrioPorCoordenadas(lat, lng);

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      return fallbackReverse(lat, lng, barrioCercano);
    }
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) {
      return fallbackReverse(lat, lng, barrioCercano);
    }

    const geo = formatFeature({ ...f, geometry: { coordinates: [lng, lat] } });
    if (!geo) {
      return fallbackReverse(lat, lng, barrioCercano);
    }

    // Enriquecer con el barrio oficial más cercano si viene vacío
    if (!geo.neighborhood && barrioCercano) {
      geo.neighborhood = barrioCercano.name;
      geo.detail = `Barrio ${barrioCercano.name} · Buenaventura`;
    }

    return geo;
  } catch {
    return fallbackReverse(lat, lng, barrioCercano);
  }
}

function fallbackReverse(lat, lng, barrio) {
  if (!enCobertura(lat, lng)) return null;
  return {
    id: `rev-${lat.toFixed(5)},${lng.toFixed(5)}`,
    label: `Cerca de ${barrio.name}`,
    detail: `Barrio ${barrio.name} · Comuna ${barrio.comuna}`,
    neighborhood: barrio.name,
    lat,
    lng,
    exacta: false,
    inCoverage: true,
  };
}

/**
 * Ubica una dirección ESCRITA a mano con máxima tolerancia y exactitud:
 * 1. Intenta resolverla con el motor local (barrio, hito o calle).
 * 2. Si no, busca sugerencias en la red.
 * 3. Si no hay coincidencia exacta de calle, centra el pin en el barrio mencionado.
 * 4. Como último recurso, ubica en el centro de Buenaventura para que el usuario mueva el pin.
 */
export async function puntoDeTexto(texto, signal) {
  const q = String(texto ?? '').trim();
  if (q.length < 3) return null;

  // 1. Resolver con motor local de Buenaventura
  const resLocal = resolverDireccionBuenaventura(q);
  if (resLocal) {
    return { ...resLocal, aproximado: !resLocal.exacta };
  }

  // 2. Buscar sugerencias de calles
  const sugerencias = await searchAddress(q, signal).catch(() => []);
  const calle = sugerencias.find((s) => !s.barrio);
  if (calle) {
    return { ...calle, aproximado: !calle.exacta };
  }

  // 3. Barrio reconocido en el texto
  const barrio = sugerencias.find((s) => s.barrio) ?? (() => {
    const b = barrioEnTexto(q);
    return b ? { lat: b.lat, lng: b.lng, neighborhood: b.name, detail: b.detail } : null;
  })();

  if (barrio) {
    return { ...barrio, label: q, aproximado: true };
  }

  // 4. Último recurso: devolver el centro de cobertura con aproximación
  return {
    lat: CENTRO.lat,
    lng: CENTRO.lng,
    label: q,
    detail: 'Buenaventura (Mueve el pin a tu puerta)',
    neighborhood: 'Centro',
    aproximado: true,
    exacta: false,
  };
}

/** Encuentra el barrio más cercano de Buenaventura a unas coordenadas */
export function barrioMasCercano(lat, lng) {
  return barrioPorCoordenadas(lat, lng);
}

/**
 * Detección Ultra-PRO de ubicación con GPS satelital en 1 toque.
 * Obtiene coordenadas de alta precisión, geocodifica y asocia el barrio real.
 */
export async function detectarUbicacionGPS() {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocalización no soportada en tu navegador');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const enZona = enCobertura(lat, lng);
        const cercano = barrioPorCoordenadas(lat, lng);

        let geo = null;
        try {
          geo = await reverseGeocode(lat, lng);
        } catch {}

        if (geo && geo.label) {
          resolve({
            ...geo,
            lat,
            lng,
            enZona,
            exacta: true,
            neighborhood: geo.neighborhood || cercano.name,
          });
          return;
        }

        resolve({
          id: `gps-${lat.toFixed(5)}-${lng.toFixed(5)}`,
          label: `Mi Ubicación · ${cercano.name}`,
          detail: `Barrio ${cercano.name} · Comuna ${cercano.comuna}`,
          neighborhood: cercano.name,
          lat,
          lng,
          enZona,
          exacta: true,
        });
      },
      (err) => {
        let msg = 'No pudimos acceder al GPS.';
        if (err.code === 1) msg = 'Permiso de ubicación denegado. Actívalo en tu navegador.';
        else if (err.code === 2) msg = 'Ubicación satelital no disponible en este momento.';
        else if (err.code === 3) msg = 'Tiempo de espera agotado buscando señal GPS.';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

export { direccionCompleta, parseDireccionCO };
