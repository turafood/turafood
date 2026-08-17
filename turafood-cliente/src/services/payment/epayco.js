'use client';

/**
 * PROVEEDOR: ePayco
 *
 * Implementa el Checkout Estándar de ePayco (checkout.js), que es
 * client-side por diseño según su documentación. La app nunca ve datos
 * de tarjeta: el formulario lo renderiza ePayco en su propio dominio.
 *
 * Lo único que viaja desde aquí es:
 *   · la llave PÚBLICA (la privada vive en los secrets de Supabase);
 *   · el monto, que ya calculó el servidor y quedó en `payments.amount`;
 *   · los identificadores para que el webhook sepa qué actualizar.
 *
 * El resultado del pago NO se decide aquí. Lo decide el webhook.
 */

const CHECKOUT_SRC = 'https://checkout.epayco.co/checkout.js';

let loading = null;

function loadScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Solo disponible en el navegador'));
  }
  if (window.ePayco) return Promise.resolve(window.ePayco);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(window.ePayco);
    script.onerror = () => {
      loading = null;
      reject(new Error('No pudimos cargar la pasarela de pago. Revisa tu conexión.'));
    };
    document.head.appendChild(script);
  });

  return loading;
}

export const epaycoProvider = {
  id: 'epayco',

  isConfigured() {
    return Boolean(
      process.env.NEXT_PUBLIC_EPAYCO_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
  },

  /**
   * Abre el checkout para un intento de pago ya creado en la base.
   *
   * @param {object} payment  Registro de `payments` (trae el monto real)
   * @param {object} order    Pedido asociado
   * @param {object} opts     { businessName }
   */
  async openCheckout(payment, order, opts = {}) {
    const publicKey = process.env.NEXT_PUBLIC_EPAYCO_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!publicKey) {
      throw new Error('La pasarela de pago no está configurada.');
    }
    if (!supabaseUrl) {
      throw new Error('Falta la URL de Supabase para confirmar el pago.');
    }

    const ePayco = await loadScript();

    const handler = ePayco.checkout.configure({
      key: publicKey,
      // Se controla por variable para no tocar código al salir a producción
      test: process.env.NEXT_PUBLIC_EPAYCO_TEST !== 'false',
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      ?? (typeof window !== 'undefined' ? window.location.origin : '');

    handler.open({
      name: 'Pedido TuraFood',
      description: opts.businessName
        ? `Pedido en ${opts.businessName}`
        : `Pedido ${order.order_number}`,
      invoice: payment.reference,
      currency: (payment.currency ?? 'COP').toLowerCase(),

      // El monto sale de `payments.amount`, que puso el servidor.
      // El webhook lo revalida contra `orders.total` antes de aprobar.
      amount: String(payment.amount),
      tax: '0',
      tax_base: '0',
      country: 'co',
      lang: 'es',
      external: 'false',

      // Confirmación servidor a servidor: la única que decide
      confirmation: `${supabaseUrl}/functions/v1/epayco-webhook`,
      // A dónde vuelve el usuario. Esta pantalla NO asume que se pagó.
      response: `${baseUrl}/payment/result?order=${order.id}&payment=${payment.id}`,

      extra1: order.id,
      extra2: 'ORDER',
      extra3: payment.id,
    });
  },
};
