'use client';

/**
 * UTILIDADES DE TARJETA
 *
 * Todo lo que hay aquí trabaja en memoria y se descarta al guardar.
 * De la tarjeta solo sobreviven marca, últimos 4 y vencimiento.
 *
 * El número completo y el CVV NUNCA salen del formulario: no se envían
 * a la base, no se escriben en localStorage, no se registran en logs.
 */

/** Marcas por prefijo (BIN). Suficiente para lo que se usa en Colombia. */
const BRANDS = [
  { id: 'visa', label: 'Visa', re: /^4/, len: [16], cvv: 3 },
  { id: 'mastercard', label: 'Mastercard', re: /^(5[1-5]|2[2-7])/, len: [16], cvv: 3 },
  { id: 'amex', label: 'American Express', re: /^3[47]/, len: [15], cvv: 4 },
  { id: 'diners', label: 'Diners Club', re: /^3(0[0-5]|[68])/, len: [14, 16], cvv: 3 },
];

export function detectBrand(number) {
  const digits = onlyDigits(number);
  const found = BRANDS.find((b) => b.re.test(digits));
  return found ?? { id: 'other', label: 'Tarjeta', len: [16], cvv: 3 };
}

export const onlyDigits = (v) => String(v ?? '').replace(/\D/g, '');

/** Agrupa para mostrar: 4111 1111 1111 1111 (Amex va 4-6-5) */
export function formatCardNumber(value) {
  const d = onlyDigits(value);
  const brand = detectBrand(d);
  const max = Math.max(...brand.len);
  const cut = d.slice(0, max);

  if (brand.id === 'amex') {
    return [cut.slice(0, 4), cut.slice(4, 10), cut.slice(10, 15)].filter(Boolean).join(' ');
  }
  return (cut.match(/.{1,4}/g) ?? []).join(' ');
}

export function formatExpiry(value) {
  const d = onlyDigits(value).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

/**
 * Algoritmo de Luhn: detecta números mal digitados antes de intentar
 * cobrar. Es la misma validación que hace cualquier pasarela.
 */
export function isValidLuhn(number) {
  const d = onlyDigits(number);
  if (d.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let n = Number(d[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isValidExpiry(value) {
  const d = onlyDigits(value);
  if (d.length !== 4) return false;

  const month = Number(d.slice(0, 2));
  const year = 2000 + Number(d.slice(2));
  if (month < 1 || month > 12) return false;

  // Vence al final de su mes
  const end = new Date(year, month, 1);
  return end > new Date();
}

/** Valida todo el formulario y explica qué falta, en español */
export function validateCard({ number, holder, expiry, cvv }) {
  const brand = detectBrand(number);
  const digits = onlyDigits(number);

  if (!brand.len.includes(digits.length)) {
    return { ok: false, field: 'number', message: `Un número de ${brand.label} tiene ${brand.len.join(' o ')} dígitos.` };
  }
  if (!isValidLuhn(digits)) {
    return { ok: false, field: 'number', message: 'Revisa el número: parece que hay un dígito mal.' };
  }
  if (holder.trim().length < 5 || !holder.trim().includes(' ')) {
    return { ok: false, field: 'holder', message: 'Escribe el nombre completo como aparece en la tarjeta.' };
  }
  if (!isValidExpiry(expiry)) {
    return { ok: false, field: 'expiry', message: 'La fecha de vencimiento no es válida o ya pasó.' };
  }
  if (onlyDigits(cvv).length !== brand.cvv) {
    return { ok: false, field: 'cvv', message: `El código de seguridad de ${brand.label} tiene ${brand.cvv} dígitos.` };
  }
  return { ok: true, brand };
}

/**
 * Extrae SOLO lo que se puede guardar. Todo lo demás queda fuera:
 * esta función es la frontera entre lo que se digita y lo que persiste.
 */
export function toSafeCard({ number, holder, expiry }) {
  const digits = onlyDigits(number);
  const exp = onlyDigits(expiry);

  return {
    kind: 'card',
    brand: detectBrand(digits).id,
    last4: digits.slice(-4),
    exp_month: Number(exp.slice(0, 2)),
    exp_year: 2000 + Number(exp.slice(2)),
    holder_name: holder.trim().toUpperCase(),
  };
}

/** Colores de marca para la tarjeta visual */
export const BRAND_STYLE = {
  visa: { bg: 'linear-gradient(135deg,#1A1F71,#2A3FA8)', label: 'VISA' },
  mastercard: { bg: 'linear-gradient(135deg,#232323,#3A3A3A)', label: 'Mastercard' },
  amex: { bg: 'linear-gradient(135deg,#016FD0,#0A4C8C)', label: 'AMEX' },
  diners: { bg: 'linear-gradient(135deg,#0079BE,#005A8C)', label: 'Diners' },
  other: { bg: 'linear-gradient(135deg,#2A2620,#17140F)', label: 'Tarjeta' },
};
