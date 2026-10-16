/**
 * TURAFOOD PARTNERS — LOS TRES PLANES
 *
 * Definidos por el dueño del producto:
 *
 *   Gratis       $0                     punto de partida
 *   Self Hosted  $189.000 /mes  ·  $589.000 /año    (el destacado)
 *   Enterprise   a la medida
 *
 * El año completo de Self Hosted cuesta $589.000 frente a $2.268.000 pagando mes a
 * mes: se ahorra el 74 %. Los números salen de aquí, no se escriben a mano en la
 * pantalla, para que el precio y el ahorro nunca se contradigan.
 */

export const PRECIOS = {
  selfhosted: { mes: 189000, anio: 589000 },
};

/** Lo que cuesta un año pagando mes a mes */
export const anualPorMeses = (p) => p.mes * 12;

/** Cuánto se ahorra tomando el año de una */
export const ahorro = (p) => anualPorMeses(p) - p.anio;

/** El anual, repartido en doce */
export const porMes = (p) => Math.round(p.anio / 12);

/** El descuento, en porcentaje entero */
export const descuento = (p) => Math.round((ahorro(p) / anualPorMeses(p)) * 100);

/** Plan sobre el que se arma la comparativa */
export const PLAN_ANCLA = PRECIOS.selfhosted;

/** Dónde se agenda la llamada con un especialista (plan Enterprise) */
export const URL_AGENDA = 'https://cal.com/sophieaimkt/growthpartner';

/** WhatsApp comercial de TuraFood */
export const WHATSAPP_VENTAS = '573137594713';

export const PLANES = [
  {
    id: 'gratis',
    nombre: 'Gratis',
    gancho: 'El punto de partida',
    paraQuien: 'Negocios que dan sus primeros pasos en lo digital y quieren probar sin costo.',
    precioTexto: '$0',
    detalle: 'Sin costo de suscripción.',
    cta: 'Empezar gratis',
    incluye: [
      'Presencia en el marketplace local de TuraFood',
      'Menú digital con fotos, precios y modificadores básicos',
      'Recepción de pedidos en tu panel y por WhatsApp',
      'Control de horarios y disponibilidad de platos',
      'Enlace para compartir en redes (turafood.com/tu-negocio)',
      'Soporte estándar',
    ],
  },
  {
    id: 'selfhosted',
    nombre: 'Self Hosted',
    gancho: 'Tu ecosistema digital independiente',
    paraQuien: 'Restaurantes que quieren su propia marca, independencia total y cero intermediarios.',
    precio: PRECIOS.selfhosted,
    detalle: 'Tu propia web en tu propio dominio.',
    cta: 'Elegir Self Hosted',
    destacado: true,
    sello: 'El más popular',
    incluye: [
      'Tu propia web en tu dominio (www.tunegocio.com o pedidos.tunegocio.com)',
      'Cero comisiones por venta: el 100 % es tuyo',
      'Identidad visual propia: tu logo, tus colores y tu portada',
      'Pasarela de pagos en línea (PSE, Nequi, Daviplata, tarjetas) y contra entrega',
      'Menú inteligente con control de stock en tiempo real y combos',
      'Alertas sonoras en vivo para la cocina',
      'Promociones: cupones, combos del día y envíos especiales',
      'Estadísticas de ventas, platos más pedidos y base de tus propios clientes',
      'Asesoría para configurar y poner en marcha tu dominio',
    ],
  },
  {
    id: 'enterprise',
    nombre: 'Enterprise',
    gancho: 'A la medida: cadenas y franquicias',
    paraQuien: 'Marcas con varias sedes o alto volumen que necesitan integraciones y logística propias.',
    precioTexto: 'A la medida',
    detalle: 'Según lo que necesite tu operación.',
    cta: 'Hablar con un especialista',
    incluye: [
      'Multi-sucursal con gestión centralizada',
      'App móvil con tu propia marca (iOS y Android)',
      'Integración con tu POS o ERP por API',
      'Consultor de cuenta dedicado y soporte prioritario',
      'Estrategia de pauta y trade marketing local',
      'Acuerdos de flota de domiciliarios para horas pico',
    ],
  },
];

/**
 * Lo que dice la letra chica. Va a la vista y no escondida.
 */
export const CONDICIONES = [
  'Los planes de pago son un alquiler de tecnología y servicios: los usas mientras el plan esté vigente.',
  'La pasarela de pagos en línea la opera un proveedor externo y puede tener su propia tarifa por transacción; esa tarifa no es una comisión de TuraFood.',
  'El dominio propio (la compra anual del nombre) se paga aparte; nosotros te asesoramos en la configuración.',
  'Las herramientas marcadas como «Próximamente» están en construcción y se activan por etapas.',
  'Enterprise se cotiza según el alcance: sedes, integraciones, app propia y logística.',
];
