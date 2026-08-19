/**
 * 02 — MEMBRESÍAS Y FORMAS DE COBRO
 *
 * Los precios salen de los mismos números que usa la app
 * (`turafood-app/src/app/negocio/crecimiento/planes.js`). Si allá
 * cambia un precio, este documento hay que regenerarlo — por eso los
 * derivados se calculan acá y no se escriben a mano.
 */

const { Document, Packer, Paragraph, PageBreak } = require('docx');
const fs = require('fs');
const E = require('./estilo');

/* Los mismos de la app */
const P = {
  turafood: { mes: 89000, anio: 489000 },
  growth:   { mes: 289000, anio: 890000 },
};

const cop = (n) => '$' + n.toLocaleString('es-CO');
const porMes = (p) => Math.round(p.anio / 12);
const ahorro = (p) => p.mes * 12 - p.anio;
const desc = (p) => Math.round((ahorro(p) / (p.mes * 12)) * 100);

const hijos = [
  ...E.portada(
    'MEMBRESÍAS Y FORMAS DE COBRO · 2026',
    'Cómo cobra TuraFood',
    'Tres planes, y por qué la app siempre es gratis.',
  ),

  E.destacado(
    'La regla que no cambia',
    'TuraFood nunca cobra comisión por pedido. Ni al negocio, ni al repartidor, ni al cliente. Lo que se vende es del negocio y llega directo a su cuenta. Los planes son para crecer, no para vender.',
  ),

  E.titulo('1. Los tres planes'),

  E.tabla(
    ['', 'Starter', 'Tura Food', 'Tura Growth'],
    [
      ['Precio mensual', 'Gratis', cop(P.turafood.mes), cop(P.growth.mes)],
      ['Precio anual', 'Gratis', cop(P.turafood.anio), { t: cop(P.growth.anio), resaltar: true }],
      ['Equivale al mes', '—', cop(porMes(P.turafood)) + ' /mes', { t: cop(porMes(P.growth)) + ' /mes', resaltar: true }],
      ['Ahorro del anual', '—', desc(P.turafood) + '%', { t: desc(P.growth) + '%', resaltar: true }],
      ['Para quién', 'El que arranca', 'El que ya vende', 'El que quiere crecer'],
    ],
    [1.4, 1, 1.1, 1.2],
  ),

  E.subtitulo('Qué trae cada uno'),

  E.tabla(
    ['Incluye', 'Starter', 'Tura Food', 'Tura Growth'],
    [
      ['Tienda en turafood.com', 'Sí', 'Sí', 'Sí'],
      ['Menú digital', 'Hasta 20 productos', 'Sin límite', 'Sin límite + QR'],
      ['Tablero de comandas', 'Sí', 'Sí', 'Sí'],
      ['Repartidores del puerto', 'Sí', 'Sí', 'Sí'],
      ['Cobra como quiera', 'Sí', 'Sí', 'Sí'],
      ['Reportes y métricas', 'Sí', 'Sí', 'Sí + por producto'],
      ['Sitio web con dominio propio', '—', 'Sí', 'Sí'],
      ['Hosting y correo corporativo', '—', 'Sí', 'Sí'],
      ['Ficha de Google verificada', '—', 'Sí', 'Sí'],
      ['Blog SEO', '—', 'Sí', 'Sí'],
      ['Agente de voz IA 24/7', '—', '—', '300 min /mes'],
      ['Reservas y agendamiento', '—', '—', 'Sí'],
      ['WhatsApp Business automatizado', '—', '—', 'Sí'],
      ['CRM, fidelización y cupones', '—', '—', 'Sí'],
      ['Correos automáticos', '—', '—', 'Sí'],
      ['Campañas en Google Ads y Meta', '—', '—', 'Sí'],
      ['Espacios destacados en la app', '—', '—', 'Sí'],
      ['Acompañamiento del equipo', '—', 'Soporte', 'Dedicado'],
    ],
    [2.4, 1, 1.1, 1.3],
  ),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('2. Por qué el anual gana solo'),
  E.p('El argumento no es el descuento en porcentaje: es lo que pasa cuando alguien paga mes a mes durante un año.'),

  E.tabla(
    ['Tura Growth', 'Cuánto paga', 'En un año'],
    [
      ['Mes a mes', cop(P.growth.mes) + ' cada mes', cop(P.growth.mes * 12)],
      [{ t: 'El año de una', resaltar: true }, { t: '1 solo pago', resaltar: true }, { t: cop(P.growth.anio), resaltar: true }],
      ['Diferencia', '', cop(ahorro(P.growth))],
    ],
    [1.4, 1.6, 1.2],
  ),

  E.pMixto([
    ['Son ', 0],
    [cop(ahorro(P.growth)), 1],
    [' por exactamente la misma tecnología. Por eso en la app y en el sitio ese número se muestra en pesos y no como "−', 0],
    [desc(P.growth) + '%', 1],
    ['": un porcentaje se lee y se olvida; una cifra que la persona puede imaginar en su bolsillo se queda.', 0],
  ]),

  E.titulo('3. Cómo paga cada quien'),

  E.subtitulo('El cliente que pide'),
  E.p('Le paga al negocio, no a TuraFood. El negocio decide qué medios acepta y el checkout solo le muestra esos.'),
  E.tabla(
    ['Medio', 'Cómo funciona', 'Quién recibe'],
    [
      ['Efectivo', 'Paga al recibir el pedido', 'El negocio'],
      ['Nequi', 'Transfiere al número que el negocio configuró', 'El negocio'],
      ['Daviplata', 'Transfiere al número que el negocio configuró', 'El negocio'],
      ['Tarjeta al recibir', 'Datáfono en la puerta, si el negocio lo manda', 'El negocio'],
      ['Por WhatsApp', 'El pedido queda hecho y el pago se acuerda por chat', 'El negocio'],
    ],
    [1.2, 2.4, 1],
  ),
  E.p('La regla la hace cumplir el servidor, no la pantalla: si alguien arma la llamada a mano con un medio que el negocio no habilitó, el pedido se rechaza.', { after: 160 }),

  E.subtitulo('El repartidor'),
  E.p('Gana el domicilio completo más la propina. TuraFood no retiene nada de eso.'),
  E.tabla(
    ['Concepto', 'Cuánto'],
    [
      ['Domicilio', 'El que cobre el negocio (por defecto $3.900)'],
      ['Propina', 'Toda, la que ponga el cliente'],
      ['Retención de TuraFood', '$0'],
    ],
    [1.4, 2.6],
  ),

  E.subtitulo('El negocio'),
  E.p('Recibe el 100% de lo que vende, directo. Solo paga si toma un plan de crecimiento, y ese cobro va por ePayco — el único punto donde TuraFood cobra algo.'),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('4. Condiciones de los planes'),
  E.vineta('Los planes son un alquiler de tecnología, no una venta. Las herramientas siguen siendo de TuraFood y se usan mientras el plan esté vigente.'),
  E.vineta('El presupuesto que se invierte en Google y Meta va aparte y lo define el negocio. TuraFood monta, mide y optimiza las campañas.'),
  E.vineta('El agente de voz incluye 300 minutos al mes de uso razonable. Si la operación necesita más, se conversa y se ajusta.'),
  E.vineta('Los espacios destacados de la app se reparten entre los negocios del plan; no son exclusivos de uno solo.'),
  E.vineta('La app sigue siendo gratis con o sin plan. Nunca se va a cobrar comisión por pedido por no tener plan.'),
  E.vineta('El plan anual se paga de una. Si se cancela antes, se devuelve la parte no usada descontando los servicios ya entregados (dominio, sitio, configuraciones).'),

  E.titulo('5. Cómo se levanta el tope'),
  E.p('Un negocio sin verificar puede vender, con un tope de 20 pedidos al día. Para quitarlo:'),
  E.vineta('Agenda una videollamada de 30 minutos con el equipo desde su panel.'),
  E.vineta('En la llamada se conoce el negocio y se resuelven dudas.'),
  E.vineta('El equipo decide ahí mismo si levanta el tope.'),
  E.p('No se piden RUT, cámara de comercio ni concepto sanitario. Si el negocio los tiene, puede cargarlos, pero no son requisito para operar.'),

  E.destacado(
    'Respuesta en menos de 24 horas',
    'Desde que agenda la llamada, el negocio ve un contador en su panel. Si llega a cero sin respuesta, la pantalla lo admite y le ofrece escribirle al equipo directamente.',
  ),

  E.regla(),
  E.p('Los precios de este documento son los mismos que muestra la app y el sitio. Última revisión: agosto de 2026.', { size: 17, color: E.C.suave, cursiva: true }),
];

const doc = new Document({
  numbering: E.NUMERACION,
  sections: [{
    properties: { page: E.PAGINA },
    footers: E.PIE('Membresías'),
    children: hijos,
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync('02-Membresias-y-Cobro-TuraFood-2026.docx', b);
  console.log('  ✓ 02-Membresias-y-Cobro-TuraFood-2026.docx');
});
