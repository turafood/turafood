/**
 * TURAFOOD — DATOS DE CONTACTO DEL EQUIPO
 *
 * Un solo lugar. Antes el cliente usaba +57 302 688 6449 como "soporte de
 * TuraFood", pero ese número es el de Tura Muebles (otro negocio). Peor: se
 * usaba como respaldo cuando un restaurante no tenía WhatsApp ni Nequi, o sea
 * que a veces las comandas (y el número de pago) caían en otro negocio.
 *
 * Reglas:
 *   · SOPORTE_* es SOLO para hablar con el equipo de TuraFood.
 *   · Nunca se usa un número del equipo como si fuera de un restaurante: si
 *     el negocio no tiene teléfono, no se manda comanda y se le pide al
 *     cliente que consulte con el negocio.
 */
export const SOPORTE_WA = '573137594713';
export const SOPORTE_TEL = '+573137594713';
export const linkSoporte = (texto = '') =>
  `https://wa.me/${SOPORTE_WA}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
