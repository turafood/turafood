/**
 * GROWTH PARTNER — LOS TRES CAMINOS
 *
 * LA ESTRATEGIA DE PRECIO, EXPLICADA
 *
 * Tres opciones, y la del año está armada para ganar:
 *
 *   Gratis        $0
 *   3 meses       $590.000  →  $196.667 al mes
 *   Un año        $890.000  →  $74.167 al mes
 *
 * El número que hace todo el trabajo no es el descuento en
 * porcentaje: es lo que pasa si alguien renueva el trimestral cuatro
 * veces. Son $2.360.000 contra $890.000. Un millón cuatrocientos
 * setenta mil pesos de diferencia por la misma tecnología.
 *
 * Por eso la comparativa se muestra en plata y en barras, no en un
 * "-62%". Un porcentaje se lee y se olvida; "te ahorras $1.470.000"
 * se queda.
 *
 * El trimestral no está ahí para venderse. Está para que el anual
 * tenga contra qué medirse — sin él, $890.000 es solo un número
 * grande. Con él, es el más barato de los dos.
 *
 * NOTA: qué trae exactamente cada plan lo define el equipo. Lo de
 * abajo es la estructura; las listas se cambian sin tocar la
 * pantalla.
 */

export const PRECIOS = {
  trimestral: { total: 590000, meses: 3 },
  anual:      { total: 890000, meses: 12 },
};

/** Lo que costaría un año pagando trimestre a trimestre */
export const ANUAL_POR_TRIMESTRES = PRECIOS.trimestral.total * 4;   // 2.360.000
export const AHORRO_ANUAL = ANUAL_POR_TRIMESTRES - PRECIOS.anual.total; // 1.470.000

export const mensual = (p) => Math.round(p.total / p.meses);

export const PLANES = [
  {
    id: 'gratis',
    nombre: 'La app, gratis',
    gancho: 'Para siempre, sin letra chica',
    precio: 0,
    precioTexto: 'Gratis',
    detalle: 'No pedimos tarjeta ni te cobramos comisión por pedido.',
    cta: 'Ya lo tienes',
    incluye: [
      { texto: 'Tu tienda en turafood.com', si: true },
      { texto: 'Menú, fotos y promociones', si: true },
      { texto: 'Tablero de comandas en vivo', si: true },
      { texto: 'Cobras como quieras — Nequi, efectivo, WhatsApp', si: true },
      { texto: 'Repartidores del puerto', si: true },
      { texto: 'Reportes de ventas', si: true },
      { texto: 'Agente de voz que contesta por ti', si: false },
      { texto: 'Campañas en Google y Meta', si: false },
      { texto: 'Sitio web propio', si: false },
      { texto: 'Aparecer de primero en la app', si: false },
    ],
  },

  {
    id: 'trimestral',
    nombre: 'Growth · 3 meses',
    gancho: 'Para probar el paquete completo',
    precio: PRECIOS.trimestral.total,
    precioTexto: '$590.000',
    porMes: mensual(PRECIOS.trimestral),
    detalle: 'Un pago por los tres meses. Se renueva si tú quieres.',
    cta: 'Empezar con 3 meses',
    incluye: [
      { texto: 'Todo lo de la app gratis', si: true, fuerte: true },
      { texto: 'Agente de voz IA que contesta y toma pedidos', si: true },
      { texto: 'Agendamiento y reservas en línea', si: true },
      { texto: 'Recordatorios automáticos a tus clientes', si: true },
      { texto: 'Correos de fidelización (MailerLite)', si: true },
      { texto: 'Sitio web propio, si lo necesitas', si: true },
      { texto: 'Campañas en Google Ads y Meta', si: true },
      { texto: 'Prioridad en la app', si: true },
    ],
  },

  {
    id: 'anual',
    nombre: 'Growth · un año',
    gancho: 'Lo mismo, por menos de la mitad',
    precio: PRECIOS.anual.total,
    precioTexto: '$890.000',
    porMes: mensual(PRECIOS.anual),
    detalle: 'Un solo pago por los doce meses.',
    cta: 'Quiero el año completo',
    destacado: true,
    sello: 'EL QUE ELIGE TODO EL MUNDO',
    incluye: [
      { texto: 'Todo lo de los 3 meses', si: true, fuerte: true },
      { texto: 'Doce meses en vez de tres', si: true },
      { texto: 'Presupuesto de campañas sostenido todo el año', si: true },
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
  'Los planes Growth son un alquiler de tecnología, no una venta: las herramientas siguen siendo nuestras y las usas mientras el plan esté vigente.',
  'El presupuesto que se invierte en Google y Meta va aparte y lo defines tú. Nosotros montamos, medimos y optimizamos las campañas.',
  'La prioridad en la app aplica sobre los espacios que tenemos destinados para eso, y se reparte entre los negocios del plan.',
  'La app de TuraFood sigue siendo gratis con o sin plan. Nunca vamos a cobrarte comisión por pedido por no tener Growth.',
];
