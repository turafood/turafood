/**
 * TURAFOOD — LÓGICA PURA DE DIRECCIONES Y TELÉFONOS
 *
 * Sin React, sin red, sin navegador: así se prueba con `npm test`.
 * Las reglas de aquí también viven en la base de datos (`en_cobertura()`
 * en la migración 20260825000000): si cambias la caja de cobertura,
 * cámbiala en los dos lados.
 */

/** Centro de Buenaventura */
export const CENTRO = { lat: 3.8801, lng: -77.0312 };

/** Casco urbano de Buenaventura y alrededores. TuraFood no sirve fuera. */
export const BOUNDS = { minLat: 3.78, maxLat: 3.98, minLng: -77.18, maxLng: -76.92 };

/** ¿El punto cae dentro de la zona de entrega? */
export function enCobertura(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat
    && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

/**
 * "cra 5 # 12-34", "Kr 3 no. 4-5", "cl 2 #8" → { calle: "Carrera 5", numero: "12-34" }
 *
 * Quien escribe a mano usa abreviaturas; los buscadores de mapas no las
 * entienden ("Cra" no encuentra "Carrera"). Se expanden antes de buscar.
 */
export function parseDireccionCO(raw) {
  let s = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const num = s.match(/(?:#|n[°o]\.?|numero|número)\s*([0-9a-z]+\s*[-–]\s*[0-9a-z]+|[0-9a-z]+)\s*$/i)
    || s.match(/\s(\d+\s*[-–]\s*\d+)\s*$/);
  let numero = '';
  if (num) {
    numero = num[1].replace(/\s*[-–]\s*/, '-');
    s = s.slice(0, num.index).trim();
  }
  s = s
    .replace(/^(cra|cr|kr|kra|carr|carrera)\b\.?/i, 'Carrera')
    .replace(/^(cl|cll|cale|calle)\b\.?/i, 'Calle')
    .replace(/^(av|avda|avenida)\b\.?/i, 'Avenida')
    .replace(/^(dg|diag|diagonal)\b\.?/i, 'Diagonal')
    .replace(/^(tv|trans|transversal)\b\.?/i, 'Transversal');
  return { calle: s, numero };
}

/** Texto de dirección con su número: "Carrera 5 #12-34" */
export function direccionCompleta({ calle, numero }) {
  return numero ? `${calle} #${numero}` : calle;
}

/**
 * Celular colombiano → formato internacional (+57…) o null si no es válido.
 * Acepta "300 123 4567", "3001234567", "+57 300 123 4567", "57300…".
 */
export function normalizarCelularCO(raw) {
  let d = String(raw ?? '').replace(/[^\d+]/g, '');
  d = d.replace(/^\+/, '');
  if (d.startsWith('57') && d.length === 12) d = d.slice(2);
  if (d.length !== 10 || !d.startsWith('3')) return null;
  return `+57${d}`;
}

/** "+573001234567" → "300 123 4567" para mostrarlo */
export function mostrarCelular(e164) {
  const d = String(e164 ?? '').replace(/^\+57/, '');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : String(e164 ?? '');
}

/** ¿Es un código de verificación válido (6 dígitos)? */
export function codigoValido(raw) {
  return /^\d{6}$/.test(String(raw ?? '').trim());
}
