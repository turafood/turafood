/**
 * LA COMANDA ULTRA PRO PARA WHATSAPP
 * 
 * Formato profesional para restaurantes y comercios de Buenaventura:
 * - Emojis universales 100% compatibles con WhatsApp Web, Android e iOS.
 * - Jerarquía visual con separadores, negritas (*texto*) y cursivas (_texto_).
 * - Desglose claro de productos, opciones, cuentas, dirección de entrega y pago.
 */

/** $32.900 — formato de moneda colombiana */
const pesos = (n) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const CIERRE_METODO = {
  nequi: (n) => [
    '💳 *MÉTODO DE PAGO:*',
    '🟣 *Nequi* (Transferencia)',
    n ? `📱 *Número Nequi negocio:* ${n}` : '',
    '👉 _Quedo atento a tu confirmación para hacerte la transferencia de inmediato._',
  ].filter(Boolean).join('\n'),

  daviplata: (n) => [
    '💳 *MÉTODO DE PAGO:*',
    '🔴 *Daviplata* (Transferencia)',
    n ? `📱 *Número Daviplata negocio:* ${n}` : '',
    '👉 _Quedo atento a tu confirmación para transferirte por Daviplata de inmediato._',
  ].filter(Boolean).join('\n'),

  cash: () => [
    '💳 *MÉTODO DE PAGO:*',
    '💵 *Efectivo contraentrega*',
    '👉 _Quedo a la espera de tu confirmación. Pagaré en efectivo con el valor exacto al recibir._',
  ].join('\n'),

  card: () => [
    '💳 *MÉTODO DE PAGO:*',
    '💳 *Datáfono / Tarjeta al recibir*',
    '👉 _Quedo atento a tu confirmación. Por favor enviar datáfono con el domiciliario._',
  ].join('\n'),

  whatsapp: () => [
    '💳 *MÉTODO DE PAGO:*',
    '💬 *Acordar pago por WhatsApp*',
    '👉 _Quedo atento a tu confirmación para coordinar el pago directamente por aquí._',
  ].join('\n'),
};

/**
 * Genera la comanda estructurada para WhatsApp.
 * Formato corto, preciso, persuasivo y amigable para WhatsApp.
 * 
 * @param {object} pedido  Datos del pedido (order_number, total, subtotal, etc.)
 * @param {array}  items   Lista de productos [{ name, qty, unitPrice, opts, notes }]
 * @param {object} extra   { negocio, cliente, telefono, numeroPago }
 */
export function comandaWhatsapp(pedido, items = [], extra = {}) {
  const { negocio, cliente, telefono, numeroPago } = extra;
  const L = [];

  const nombreLocal = negocio || 'Equipo Turafood';
  const orderNum = pedido.order_number || (typeof pedido.id === 'string' && pedido.id.startsWith('local-') ? pedido.id.replace('local-', 'TS-') : 'TS-8189');
  const orderTrackingId = pedido.id || pedido.order_number || 'current';

  // 1. Saludo cálido y persuasivo
  L.push(`¡Hola, *${nombreLocal}*! 👋✨`);
  L.push('Quisiera confirmar mi pedido realizado desde *TuraFood* 🚀:');
  L.push('');

  // 2. Encabezado del pedido
  L.push(`🧾 *Pedido #${orderNum}*`);

  // 3. Detalle exacto de lo que pidió
  const itemsList = Array.isArray(items) && items.length > 0 ? items : (
    Array.isArray(pedido.items) && pedido.items.length > 0 ? pedido.items : [
      { name: 'Combo Especial Tura Food', qty: 1, unitPrice: pedido.total || 25000 }
    ]
  );

  for (const it of itemsList) {
    const cant = it.qty ?? it.quantity ?? 1;
    const unitPrice = it.unitPrice ?? it.unit_price ?? it.basePrice ?? it.price ?? 0;
    const precio = unitPrice * cant;
    const priceStr = precio > 0 ? ` — _${pesos(precio)}_` : '';
    L.push(`• *${cant}x* ${it.name}${priceStr}`);

    if (it.opts) {
      L.push(`   ↳ _${it.opts}_`);
    }
    if (it.notes) {
      L.push(`   ↳ 📝 _Nota: "${it.notes}"_`);
    }
  }
  L.push('');

  // 4. Modalidad y Destino
  if (pedido.mode === 'pickup') {
    L.push('🏪 *Modalidad:* _Recoger en el restaurante (Sin costo de envío)_');
  } else {
    L.push(`📍 *Entrega:* _${pedido.delivery_address || 'Buenaventura'}_`);
    if (pedido.delivery_instructions) {
      L.push(`   ↳ 🔔 _Indicación: ${pedido.delivery_instructions}_`);
    }
  }

  // 5. Método de Pago y Total
  const pagoTexto = pedido.payment_method === 'nequi'
    ? (numeroPago ? `Nequi (${numeroPago})` : 'Nequi Directo (Transferencia)')
    : 'Efectivo contra entrega (al recibir)';

  L.push(`💳 *Pago:* _${pagoTexto}_`);
  L.push(`💰 *Total a pagar: ${pesos(pedido.total)}*`);
  L.push('');

  // 6. Seguimiento en vivo
  L.push(`🗺️ *Seguimiento GPS:* https://turafood.com/tracking?order=${orderTrackingId}`);
  L.push('');

  // 7. Cierre amigable y agradecimiento local <3
  L.push('Quedo súper atento a su confirmación para iniciar la preparación. ¡Muchas gracias por apoyar los negocios locales! ❤️');

  return L.join('\n');
}

/**
 * Genera el enlace de WhatsApp compatible con Web, Android e iOS.
 * 
 * @param {string} telefono  Número de teléfono del comercio
 * @param {string} texto     Mensaje formateado
 */
export function linkWhatsapp(telefono, texto) {
  let num = String(telefono || '').replace(/\D/g, '');
  if (!num) return null;

  // Si tiene 10 dígitos (Colombia: 3XXXXXXXXX), anteponer 57
  if (num.length === 10 && num.startsWith('3')) {
    num = '57' + num;
  }

  // URL universal compatible
  return `https://api.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(texto)}`;
}

