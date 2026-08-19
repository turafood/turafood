/**
 * GROWTH PARTNER — LOS TRES PLANES
 *
 * ALINEADO CON EL SITIO Y CON LOS DOCUMENTOS DEL NEGOCIO
 *
 * Antes esta pantalla tenía dos planes de pago: uno de 3 meses a
 * $590.000 y uno anual a $890.000. Eso no coincidía ni con
 * turafood.com ni con la especificación de membresías, y además tenía
 * un problema propio: los 3 meses salían a $196.667 mensuales, o sea
 * MÁS CAROS por mes que el anual. Se leía como un castigo por no
 * comprometerse, no como un escalón.
 *
 * La estructura correcta es la que ya estaba en el sitio y en los
 * documentos: tres planes, cada uno con precio mensual y anual, y el
 * ahorro del anual como el argumento principal.
 *
 *   Starter      Gratis, para siempre
 *   Tura Food    $89.000 /mes   ·  $489.000 /año   ($40.750 /mes)
 *   Tura Growth  $289.000 /mes  ·  $890.000 /año   ($74.167 /mes)
 *
 * POR QUÉ EL ANUAL GANA SOLO
 *
 * Doce meses de Tura Growth pagando mes a mes son $3.468.000. El año
 * completo cuesta $890.000. Son $2.578.000 de diferencia por
 * exactamente la misma tecnología — el 74% que anuncia el sitio.
 *
 * Ese número es el que hace todo el trabajo, y por eso la comparativa
 * lo muestra en plata y en barras, no en un porcentaje: "-74%" se lee
 * y se olvida; "te ahorras $2.578.000" se queda.
 */

export const PRECIOS = {
  turafood:   { mes: 89000,  anio: 489000 },
  growth:     { mes: 289000, anio: 890000 },
};

/** Lo que cuesta un año pagando mes a mes */
export const anualPorMeses = (p) => p.mes * 12;

/** Cuánto se ahorra tomando el año de una */
export const ahorro = (p) => anualPorMeses(p) - p.anio;

/** El anual, repartido en doce */
export const porMes = (p) => Math.round(p.anio / 12);

/** El descuento, en porcentaje entero */
export const descuento = (p) => Math.round((ahorro(p) / anualPorMeses(p)) * 100);

/**
 * El plan sobre el que se arma la comparativa. Es Growth porque es el
 * que tiene el salto más grande, y porque es el que queremos vender.
 */
export const PLAN_ANCLA = PRECIOS.growth;

export const PLANES = [
  {
    id: 'starter',
    nombre: 'Starter',
    gancho: 'La puerta de entrada',
    precioTexto: 'Gratis',
    detalle: 'Para siempre. No pedimos tarjeta ni cobramos comisión por pedido.',
    cta: 'Ya lo tienes',
    incluye: [
      { texto: 'Tu tienda en turafood.com', si: true },
      { texto: 'Menú digital hasta 20 productos', si: true },
      { texto: 'Tablero de comandas en vivo', si: true },
      { texto: 'Cobras como quieras — Nequi, efectivo, WhatsApp', si: true },
      { texto: 'Repartidores del puerto', si: true },
      { texto: 'Reportes de ventas', si: true },
      { texto: 'Sitio web con dominio propio', si: false },
      { texto: 'Agente de voz que contesta por ti', si: false },
      { texto: 'Campañas en Google y Meta', si: false },
      { texto: 'Aparecer de primero en la app', si: false },
    ],
  },

  {
    id: 'turafood',
    nombre: 'Tura Food',
    gancho: 'Tu restaurante digital',
    precio: PRECIOS.turafood,
    detalle: 'Tu presencia completa en internet, lista para vender.',
    cta: 'Elegir Tura Food',
    incluye: [
      { texto: 'Todo lo de Starter', si: true, fuerte: true },
      { texto: 'Sitio web profesional con dominio propio', si: true },
      { texto: 'Hosting premium y correo corporativo', si: true },
      { texto: 'Menú digital profesional, sin límite de productos', si: true },
      { texto: 'Tu ficha de Google, reclamada y verificada', si: true, ver: '/negocio/crecimiento/google-negocio' },
      { texto: 'Blog SEO para que te encuentren', si: true },
      { texto: 'Dashboard completo', si: true },
      { texto: 'Soporte con garantía de 30 días', si: true },
    ],
  },

  {
    id: 'growth',
    nombre: 'Tura Growth',
    gancho: 'El ecosistema completo',
    precio: PRECIOS.growth,
    detalle: 'IA, automatización y crecimiento. Todo incluido.',
    cta: 'Quiero Tura Growth',
    destacado: true,
    sello: 'EL QUE ELIGE TODO EL MUNDO',
    incluye: [
      { texto: 'Todo lo de Tura Food', si: true, fuerte: true },
      { texto: 'Agente de voz IA que contesta 24/7', si: true, ver: '/negocio/crecimiento/agente-voz' },
      { texto: 'Reservas y agendamiento en línea', si: true, ver: '/negocio/crecimiento/reservas' },
      { texto: 'WhatsApp Business automatizado', si: true },
      { texto: 'CRM, fidelización y cupones', si: true },
      { texto: 'Correos automáticos a tus clientes', si: true },
      { texto: 'Campañas en Google Ads y Meta', si: true, ver: '/negocio/crecimiento/google-ads' },
      { texto: 'Tu marca en los espacios destacados de la app', si: true },
      { texto: 'Acompañamiento del equipo, no solo la herramienta', si: true },
    ],
  },
];

/**
 * Lo que dice la letra chica. Va a la vista y no escondida: si la
 * persona se va a enterar después, mejor que se entere ahora.
 */
export const CONDICIONES = [
  'Los planes son un alquiler de tecnología, no una venta: las herramientas siguen siendo nuestras y las usas mientras el plan esté vigente.',
  'El presupuesto que se invierte en Google y Meta va aparte y lo defines tú. Nosotros montamos, medimos y optimizamos las campañas.',
  'El agente de voz incluye 300 minutos al mes de uso razonable. Si tu operación necesita más, lo hablamos y lo ajustamos.',
  'La prioridad en la app aplica sobre los espacios que tenemos destinados para eso, y se reparte entre los negocios del plan.',
  'La app de TuraFood sigue siendo gratis con o sin plan. Nunca vamos a cobrarte comisión por pedido por no tener un plan.',
];
