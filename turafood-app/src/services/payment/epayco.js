'use client';

/**
 * PROVEEDOR: ePayco — Checkout Estándar
 *
 * Igual que en la app de cliente: el formulario de tarjeta lo dibuja
 * ePayco en su propio dominio. Esta app nunca ve el número de tarjeta
 * ni el CVV.
 *
 * Lo único que sale de aquí es la llave PÚBLICA y el monto. La llave
 * privada vive en los secrets de Supabase y solo la usa el webhook,
 * que es quien decide si un pago quedó aprobado. Esta pantalla no
 * puede activar una suscripción por su cuenta.
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

export function isPaymentAvailable() {
  return Boolean(
    process.env.NEXT_PUBLIC_EPAYCO_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

/**
 * Abre el checkout de una suscripción.
 *
 * `kind` es lo que el webhook lee en `x_extra2` para saber a quién
 * activarle el plan: BUSINESS_PRO para negocios, RIDER_PRO para
 * repartidores.
 */
export async function openSubscriptionCheckout({
  kind, subjectId, amount, name, description, returnPath,
}) {
  const publicKey = process.env.NEXT_PUBLIC_EPAYCO_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!publicKey) throw new Error('La pasarela de pago no está configurada.');
  if (!supabaseUrl) throw new Error('Falta la URL de Supabase para confirmar el pago.');

  const ePayco = await loadScript();

  const handler = ePayco.checkout.configure({
    key: publicKey,
    // Se controla por variable para no tocar código al salir a producción
    test: process.env.NEXT_PUBLIC_EPAYCO_TEST !== 'false',
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? window.location.origin;

  handler.open({
    name,
    description,
    invoice: `${kind}-${subjectId}-${Date.now()}`,
    currency: 'cop',
    amount: String(amount),
    tax: '0',
    tax_base: '0',
    country: 'co',
    lang: 'es',
    external: 'false',

    // Confirmación servidor a servidor: la única que activa el plan
    confirmation: `${supabaseUrl}/functions/v1/epayco-webhook`,
    // A dónde vuelve el usuario. Esta pantalla NO asume que se pagó.
    response: `${baseUrl}${returnPath}`,

    extra1: subjectId,
    extra2: kind,
  });
}
