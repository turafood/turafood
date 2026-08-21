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
 * 
 * @param {object} pedido  Datos del pedido (order_number, total, subtotal, etc.)
 * @param {array}  items   Lista de productos [{ name, qty, unitPrice, opts, notes }]
 * @param {object} extra   { negocio, cliente, telefono, numeroPago }
 */
export function comandaWhatsapp(pedido, items = [], extra = {}) {
  const { negocio, cliente, telefono, numeroPago } = extra;
  const L = [];

  // Saludo cálido
  L.push(negocio ? `👋 ¡Hola, *${negocio}*!` : '👋 ¡Hola!');
  L.push('¡Acabo de hacer un pedido desde *turafood.com*! 🚀');
  L.push('Te paso el resumen detallado para que lo confirmes e inicies la preparación:');
  L.push('');
  L.push('═══════════════════════');
  L.push(`🧾 *PEDIDO #${pedido.order_number || 'NUEVO'}*`);
  L.push('═══════════════════════');
  L.push('');

  // Sección: Lo que pedí
  L.push('🍽️ *LO QUE PEDÍ:*');
  for (const it of items) {
    const cant = it.qty ?? it.quantity ?? 1;
    const precio = (it.unitPrice ?? it.unit_price ?? 0) * cant;
    L.push(`• *${cant}x* ${it.name} — _${pesos(precio)}_`);

    if (it.opts) {
      L.push(`   ↳ _Opciones: ${it.opts}_`);
    }
    if (it.notes) {
      L.push(`   ↳ 📝 _Nota: ${it.notes}_`);
    }
  }
  L.push('');

  // Sección: Cuentas
  L.push('💰 *RESUMEN DE CUENTAS:*');
  L.push(`• Subtotal: _${pesos(pedido.subtotal)}_`);
  if (Number(pedido.delivery_fee) > 0) {
    L.push(`• Domicilio: _${pesos(pedido.delivery_fee)}_`);
  } else if (pedido.mode === 'delivery') {
    L.push('• Domicilio: _¡GRATIS!_ ⚡');
  }
  if (Number(pedido.service_fee) > 0) {
    L.push(`• Tarifa de servicio: _${pesos(pedido.service_fee)}_`);
  }
  if (Number(pedido.tip) > 0) {
    L.push(`• Propina voluntaria: _${pesos(pedido.tip)}_`);
  }
  if (Number(pedido.discount) > 0) {
    L.push(`• Descuento: _-${pesos(pedido.discount)}_`);
  }
  L.push(`🔥 *TOTAL A PAGAR: ${pesos(pedido.total)}*`);
  L.push('');

  // Sección: Destino
  L.push('📍 *ENTREGA:*');
  if (pedido.mode === 'delivery') {
    L.push(`• *Dirección:* _${pedido.delivery_address || '(Sin especificar)'}_`);
    if (pedido.delivery_detail) {
      L.push(`• *Detalle / Apto:* _${pedido.delivery_detail}_`);
    }
    if (pedido.delivery_instructions) {
      L.push(`• ⚠️ *Indicaciones:* _${pedido.delivery_instructions}_`);
    }
    L.push('• *Modalidad:* _A domicilio 🛵_');
  } else {
    L.push('• *Modalidad:* _Recoger en el local 🏪_');
  }
  L.push('');

  // Sección: Método de pago
  const cierreFn = CIERRE_METODO[pedido.payment_method] || CIERRE_METODO.nequi;
  L.push(cierreFn(numeroPago));
  L.push('');

  // Sección: Datos del cliente
  L.push('👤 *DATOS DEL CLIENTE:*');
  L.push(`• *Nombre:* _${cliente || 'Cliente Tura Food'}_`);
  if (telefono) {
    L.push(`• *Teléfono:* _${telefono}_`);
  }
  L.push('');
  L.push('═══════════════════════');
  L.push('✨ _Generado automáticamente por Turafood.com_');

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
