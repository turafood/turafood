/**
 * LA COMANDA QUE LE LLEGA AL NEGOCIO POR WHATSAPP
 *
 * Muchos restaurantes del puerto no tienen pasarela, pero todos tienen
 * WhatsApp. Este módulo arma el mensaje que el cliente le manda al
 * dueño cuando cierra el pedido por ahí.
 *
 * No es "avísale que pidió". Es una comanda: el dueño tiene que poder
 * leerla y ponerse a cocinar sin abrir nada más, y tener a mano el
 * número del pedido para buscarlo en su panel.
 *
 * DECISIONES QUE PARECEN DETALLE Y NO LO SON
 *
 *   · Emojis, sí, pero de los viejos. WhatsApp los pinta con la fuente
 *     del celular, y los que no estén en esa fuente salen como un
 *     cuadrito ▯ en Androids baratos — que es justo el teléfono de
 *     medio Buenaventura.
 *
 *     Todos los de acá abajo son de Unicode 6.0, o sea 2010. Se
 *     verificó uno por uno: la primera versión llevaba 🛵 y 🗒️, que
 *     son de 2014 y en un celular viejo no se ven.
 *
 *   · Nada de tablas ni columnas alineadas con espacios. WhatsApp usa
 *     ancho variable: lo que acá se ve derecho, en el celular sale
 *     torcido. Una cosa por línea.
 *
 *   · Negrita con *asteriscos*, que es lo que WhatsApp entiende. Se
 *     usa poco: si todo está en negrita, nada resalta.
 *
 *   · El número del pedido va de primero y solo en su línea. Es lo
 *     que el dueño va a copiar para buscarlo en su panel.
 *
 *   · Los precios en pesos completos, sin decimales. Nadie cobra $32
 *     con centavos acá.
 */

/** $32.900 — punto para los miles, como se escribe en Colombia */
const pesos = (n) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

/** Cómo se llama cada forma de pago cuando el dueño la lee */
const COMO_PAGA = {
  cash: 'Efectivo al recibir',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  card: 'Tarjeta',
  whatsapp: 'Por acordar por aquí',
};

/**
 * Arma el texto de la comanda.
 *
 * @param {object} pedido  el pedido que devolvió `place_order`
 * @param {array}  items   [{ name, qty, unitPrice, opts, notes }]
 * @param {object} extra   { negocio, cliente, telefono }
 */
export function comandaWhatsapp(pedido, items, extra = {}) {
  const { negocio, cliente, telefono } = extra;
  const L = [];

  L.push('🔔 *PEDIDO NUEVO - TuraFood*');
  L.push('');
  L.push(`*${pedido.order_number}*`);
  if (negocio) L.push(`Para: ${negocio}`);
  L.push('');

  // ---- Qué pidió ----
  L.push('📋 *Lo que pidió*');
  for (const it of items) {
    const cant = it.qty ?? it.quantity ?? 1;
    const precio = (it.unitPrice ?? it.unit_price ?? 0) * cant;
    L.push(`• ${cant} x ${it.name} - ${pesos(precio)}`);

    // Los agregados y las notas van debajo y con sangría, para que se
    // lean como parte del plato y no como otro plato.
    if (it.opts) L.push(`   ${it.opts}`);
    if (it.notes) L.push(`   📝 ${it.notes}`);
  }
  L.push('');

  // ---- La plata ----
  L.push('💰 *Cuentas*');
  L.push(`Productos: ${pesos(pedido.subtotal)}`);
  if (Number(pedido.delivery_fee) > 0) L.push(`Domicilio: ${pesos(pedido.delivery_fee)}`);
  if (Number(pedido.service_fee) > 0) L.push(`Servicio: ${pesos(pedido.service_fee)}`);
  if (Number(pedido.tip) > 0) L.push(`Propina: ${pesos(pedido.tip)}`);
  if (Number(pedido.discount) > 0) L.push(`Descuento: -${pesos(pedido.discount)}`);
  L.push(`*TOTAL: ${pesos(pedido.total)}*`);
  L.push('');

  // ---- Cómo paga ----
  L.push(`💳 *Pago:* ${COMO_PAGA[pedido.payment_method] ?? pedido.payment_method}`);
  L.push('');

  // ---- A dónde va ----
  if (pedido.mode === 'delivery') {
    L.push('📍 *Entregar en*');
    L.push(pedido.delivery_address || '(sin dirección)');
    if (pedido.delivery_detail) L.push(pedido.delivery_detail);
  } else {
    L.push('🏪 *Lo recoge en el local*');
  }

  if (pedido.delivery_instructions) {
    L.push(`❗ ${pedido.delivery_instructions}`);
  }
  L.push('');

  // ---- Quién ----
  if (cliente || telefono) {
    L.push('👤 *Cliente*');
    if (cliente) L.push(cliente);
    if (telefono) L.push(telefono);
    L.push('');
  }

  L.push('_Enviado desde turafood.com_');

  return L.join('\n');
}

/**
 * El link que abre WhatsApp con la comanda ya escrita.
 *
 * `wa.me` y no `api.whatsapp.com` porque es el único que abre la app
 * nativa en Android y iOS sin pasar por el navegador. En escritorio
 * cae en WhatsApp Web, que es lo que se quiere.
 *
 * El número va solo con dígitos e indicativo. Si viene sin indicativo
 * se le pone el de Colombia: nadie en Buenaventura escribe el 57.
 */
export function linkWhatsapp(telefono, texto) {
  let num = String(telefono || '').replace(/\D/g, '');
  if (!num) return null;

  // 3001234567 -> 573001234567
  if (num.length === 10 && num.startsWith('3')) num = '57' + num;

  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}
