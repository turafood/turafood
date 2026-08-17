/**
 * CONTRATO GENÉRICO DE PAGOS
 *
 * El resto de la app habla en estos términos, no en los de ePayco.
 * Para agregar Wompi o Stripe basta con crear otro archivo que
 * implemente `PaymentProvider` y registrarlo en `index.js`.
 */

/** Estados internos de TuraFood. Los de ePayco se traducen al entrar. */
export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
};

/** Etiquetas para pantalla, en español */
export const PAYMENT_STATUS_LABEL = {
  pending: 'Pendiente',
  processing: 'Verificando pago',
  paid: 'Pago aprobado',
  failed: 'Pago rechazado',
  cancelled: 'Pago cancelado',
  refunded: 'Reembolsado',
};

/**
 * Interfaz que debe cumplir todo proveedor.
 *
 * @typedef {object} PaymentProvider
 * @property {string} id
 * @property {() => boolean} isConfigured
 * @property {(payment: Payment, order: object, opts: object) => Promise<void>} openCheckout
 */

/**
 * @typedef {object} Payment
 * @property {string} id
 * @property {string} order_id
 * @property {string} provider
 * @property {number} amount
 * @property {string} currency
 * @property {string} status
 * @property {string} reference
 */

/** Métodos que soporta el esquema (`orders.payment_method`) */
export const PAYMENT_METHODS = [
  { id: 'nequi', label: 'Nequi', icon: 'account_balance_wallet', online: true },
  { id: 'daviplata', label: 'Daviplata', icon: 'account_balance', online: true },
  { id: 'card', label: 'Tarjeta débito o crédito', icon: 'credit_card', online: true },
  { id: 'cash', label: 'Efectivo al recibir', icon: 'payments', online: false },
];

export const isOnlineMethod = (id) =>
  PAYMENT_METHODS.find((m) => m.id === id)?.online ?? false;
