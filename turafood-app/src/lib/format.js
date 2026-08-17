/**
 * Formateadores compartidos.
 * `cop` replica exactamente el helper del mockup:
 *   const cop = (n) => '$' + n.toLocaleString('es-CO');
 * para que los precios se vean idénticos al diseño ($48.900).
 */

export const cop = (n) => '$' + Number(n || 0).toLocaleString('es-CO');

/** "Envío gratis" o "$3.500", como en las tarjetas del diseño */
export const feeLabel = (fee) => (Number(fee) === 0 ? 'Envío gratis' : cop(fee));

/** "28 min" */
export const etaLabel = (min) => `${min} min`;

/** "1,2 km" — coma decimal, como en Colombia */
export const kmLabel = (km) => `${Number(km).toFixed(1).replace('.', ',')} km`;

/** Distancia haversine en km entre dos puntos */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "Hoy, 7:35 - 7:55 p.m." — ventana de entrega */
export function deliveryWindow(prepMin = 25, spread = 20) {
  const from = new Date(Date.now() + prepMin * 60000);
  const to = new Date(from.getTime() + spread * 60000);
  const fmt = (d) =>
    d
      .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace('a. m.', 'a.m.')
      .replace('p. m.', 'p.m.');
  return `${fmt(from)} - ${fmt(to)}`;
}

/** "Hace 2 horas", "Ayer", "12 Ago" */
export function relativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `Hace ${hrs} ${hrs === 1 ? 'hora' : 'horas'}`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Ayer';
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

/** Etiquetas en español para cada estado del pedido */
export const ORDER_STATUS = {
  pending: { label: 'Pendiente', color: 'var(--amber)', bg: '#FFF7E6' },
  accepted: { label: 'Aceptado', color: 'var(--blue)', bg: '#EBF2FE' },
  preparing: { label: 'En preparación', color: 'var(--amber)', bg: '#FFF7E6' },
  ready: { label: 'Listo', color: 'var(--green)', bg: '#E6F6EE' },
  courier_assigned: { label: 'Repartidor asignado', color: 'var(--blue)', bg: '#EBF2FE' },
  picked_up: { label: 'Recogido', color: 'var(--blue)', bg: '#EBF2FE' },
  delivering: { label: 'En camino', color: 'var(--primary)', bg: '#FFF0ED' },
  delivered: { label: 'Entregado', color: 'var(--green)', bg: '#E6F6EE' },
  cancelled: { label: 'Cancelado', color: 'var(--muted)', bg: '#F5F5F5' },
  refunded: { label: 'Reembolsado', color: 'var(--muted)', bg: '#F5F5F5' },
};
