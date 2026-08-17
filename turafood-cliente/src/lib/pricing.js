/**
 * COTIZACIÓN PARA MOSTRAR EN PANTALLA
 *
 * Replica el cálculo de `place_order()` (ver 20260816000000_schema.sql)
 * para que el usuario vea el total antes de confirmar.
 *
 * IMPORTANTE: esto es solo para pintar. El total que se cobra lo calcula
 * el servidor releyendo los precios de la base de datos. Si algún día
 * cambia la fórmula, hay que cambiarla en los dos lados — y el servidor
 * manda.
 */

/**
 * Tarifa de servicio FIJA. El diseño la muestra siempre en $1.900,
 * sin importar el subtotal (ver carrito y checkout del mockup):
 * subtotal $161.100 → tarifa de servicio $1.900.
 */
const SERVICE_FEE = 1900;

/**
 * @param {object} p
 * @param {number} p.subtotal        Suma de líneas (precio unitario × cantidad)
 * @param {number} p.deliveryFee     Envío del negocio
 * @param {string} p.mode            'delivery' | 'pickup'
 * @param {number} p.tip             Propina
 * @param {object|null} p.coupon     Cupón validado, si hay
 * @param {boolean} p.isPlus         Si el cliente tiene Tura Plus (envío gratis)
 */
export function quote({
  subtotal, deliveryFee = 0, mode = 'delivery', tip = 0, coupon = null, isPlus = false,
}) {
  const delivery = mode === 'delivery' ? (isPlus ? 0 : Number(deliveryFee) || 0) : 0;
  const service = subtotal > 0 ? SERVICE_FEE : 0;

  let discount = 0;
  if (coupon && subtotal >= (coupon.min_order ?? 0)) {
    if (coupon.discount_type === 'percent') {
      discount = Math.min(
        Math.round((subtotal * coupon.discount_value) / 100),
        coupon.max_discount ?? Infinity,
      );
    } else if (coupon.discount_type === 'fixed') {
      discount = Math.min(coupon.discount_value, subtotal);
    } else if (coupon.discount_type === 'free_delivery') {
      discount = delivery;
    }
  }

  const total = Math.max(subtotal + delivery + service + Number(tip || 0) - discount, 0);

  return { subtotal, delivery, service, tip: Number(tip || 0), discount, total };
}

/** Valida un cupón contra la lista disponible y devuelve el motivo si no aplica */
export function validateCoupon(code, coupons, subtotal) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return { coupon: null, message: null, ok: false };

  const found = coupons.find((c) => c.code.toUpperCase() === clean);
  if (!found) {
    return { coupon: null, ok: false, message: 'Ese código no existe o ya venció' };
  }
  if (!found.is_active) {
    return { coupon: null, ok: false, message: 'Ese cupón ya no está activo' };
  }
  if (subtotal < (found.min_order ?? 0)) {
    return {
      coupon: null,
      ok: false,
      message: `Necesitas un pedido mínimo de $${Number(found.min_order).toLocaleString('es-CO')}`,
    };
  }
  return { coupon: found, ok: true, message: found.description };
}
