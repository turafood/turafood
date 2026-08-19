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

/**
 * CÓMO CIERRA EL MENSAJE, SEGÚN CÓMO VA A PAGAR
 *
 * Es la línea más importante: le dice al dueño qué tiene que hacer
 * cuando termine de leer. Sin ella la comanda es solo información y
 * queda en el aire.
 *
 * Va en primera persona porque el mensaje lo manda el CLIENTE desde su
 * propio WhatsApp. Un "PEDIDO NUEVO — TuraFood" en mayúsculas se lee
 * como un robot metido en una conversación entre dos personas; "apenas
 * me confirmes te transfiero" se lee como lo que realmente es.
 */
const CIERRE = {
  nequi: (n) =>
    `💳 Apenas me confirmes, te hago la transferencia a Nequi${n ? ` (${n})` : ''}.`,
  daviplata: (n) =>
    `💳 Apenas me confirmes, te hago la transferencia a Daviplata${n ? ` (${n})` : ''}.`,
  cash: () =>
    '💵 Te pago en *efectivo* cuando me llegue. Confírmame si te sirve.',
  card: () =>
    '💳 Te pago con *tarjeta* al recibir. Confírmame si llevas el datáfono.',
  whatsapp: () =>
    '💬 Confírmame el pedido y cuadramos por acá cómo te pago.',
};

/**
 * Arma el mensaje que el cliente le manda al negocio.
 *
 * @param {object} pedido  el pedido que devolvió `place_order`
 * @param {array}  items   [{ name, qty, unitPrice, opts, notes }]
 * @param {object} extra   { negocio, cliente, telefono, numeroPago }
 */
export function comandaWhatsapp(pedido, items, extra = {}) {
  const { negocio, cliente, telefono, numeroPago } = extra;
  const L = [];

  // Saluda por el nombre. "Hola Licores la 15" arranca una
  // conversación; un encabezado en mayúsculas arranca un trámite.
  L.push(negocio ? `Hola *${negocio}* 👋` : 'Hola 👋');
  L.push('');
  L.push('Te acabo de hacer un pedido por TuraFood.');
  L.push('');
  L.push(`🧾 Pedido *${pedido.order_number}*`);
  L.push('');

  // ---- Qué pidió ----
  L.push('📋 *Lo que pedí*');
  for (const it of items) {
    const cant = it.qty ?? it.quantity ?? 1;
    const precio = (it.unitPrice ?? it.unit_price ?? 0) * cant;
    L.push(`• ${cant} x ${it.name} - ${pesos(precio)}`);

    // Agregados y notas debajo y con sangría, para que se lean como
    // parte del plato y no como otro plato.
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

  // ---- A dónde va ----
  if (pedido.mode === 'delivery') {
    L.push('📍 *Me lo llevas a*');
    L.push(pedido.delivery_address || '(sin dirección)');
    if (pedido.delivery_detail) L.push(pedido.delivery_detail);
  } else {
    L.push('🏪 *Yo lo recojo en el local*');
  }

  if (pedido.delivery_instructions) {
    L.push(`❗ ${pedido.delivery_instructions}`);
  }
  L.push('');

  // ---- Qué tiene que hacer el dueño ----
  const cierre = CIERRE[pedido.payment_method];
  if (cierre) {
    L.push(cierre(numeroPago));
    L.push('');
  }

  // ---- Quién ----
  if (cliente || telefono) {
    L.push('👤 *Soy*');
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
