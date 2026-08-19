/**
 * 01 — PLAN DE NEGOCIO
 *
 * Escrito desde la app que existe, no desde una idea. Cada cifra y
 * cada mecánica que aparece acá está construida y verificada contra
 * la base de datos de producción.
 *
 * Es el documento que se le pasa a alguien de afuera —un socio, un
 * banco, un aliado— para que entienda qué es TuraFood en veinte
 * minutos.
 */

const { Document, Packer, Paragraph, PageBreak } = require('docx');
const fs = require('fs');
const E = require('./estilo');

const hijos = [
  ...E.portada(
    'PLAN DE NEGOCIO · 2026',
    'TuraFood AI',
    'Todo el puerto en una app. Buenaventura, Colombia.',
  ),

  E.destacado(
    'La tesis, en una frase',
    'En Buenaventura los restaurantes venden por WhatsApp y las apps grandes les cobran hasta el 30% por pedido. TuraFood les da la tecnología completa sin cobrarles un peso por vender, y se financia con servicios de crecimiento que el negocio toma solo si quiere.',
  ),

  E.titulo('1. El problema'),
  E.p('Buenaventura tiene cerca de 340.000 habitantes y un comercio que vive del día a día: asaderos, cevicherías, droguerías, licoreras, tiendas de barrio. La mayoría ya vende a domicilio, pero lo hace así:'),
  E.vineta('Reciben los pedidos por WhatsApp, escritos a mano en un cuaderno.'),
  E.vineta('No saben cuánto vendieron ayer sin sentarse a sumar.'),
  E.vineta('Cuando entran a una app de domicilios grande, les cobran entre el 20% y el 30% de cada pedido — sobre un plato de $16.000, eso son $4.800 que no vuelven.'),
  E.vineta('Y les piden RUT, cámara de comercio y concepto sanitario antes de dejarlos vender, cuando la mitad no tiene los papeles al día.'),
  E.p('El resultado es que quien más necesita vender más es justo a quien la tecnología deja por fuera.'),

  E.titulo('2. La respuesta'),
  E.p('TuraFood invierte el modelo: la plataforma es gratis y no toca la plata de las ventas.'),

  E.subtitulo('Lo que el negocio recibe sin pagar nada'),
  E.vineta('Su tienda en turafood.com, con menú, fotos y promociones.'),
  E.vineta('Un tablero de comandas en vivo, con las cuatro etapas del pedido.'),
  E.vineta('Repartidores del puerto conectados a su cocina.'),
  E.vineta('Reportes de ventas y métricas por producto.'),
  E.vineta('Cobra como pueda cobrar: efectivo, Nequi, Daviplata, tarjeta al recibir o cerrando por WhatsApp.'),

  E.destacado(
    'Cero comisión por pedido',
    'TuraFood no procesa la plata de las ventas. El cliente le paga directo al negocio, por el medio que el negocio haya habilitado. No hay corte, no hay retención y no hay que esperar al viernes para cobrar lo que se vendió el lunes.',
  ),

  E.subtitulo('De qué vive la empresa'),
  E.p('De los planes de crecimiento. El negocio que quiere ir más rápido alquila tecnología que por su cuenta no podría montar: sitio web, agente de voz que contesta la línea, reservas, CRM, campañas en Google y Meta.'),
  E.pMixto([
    ['La clave del modelo es que ', 0],
    ['nunca se cobra por vender', 1],
    ['. Se cobra por crecer, y solo a quien lo pide.', 0],
  ]),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('3. Los tres actores'),
  E.p('La plataforma son tres aplicaciones sobre una sola base de datos.'),

  E.tabla(
    ['Quién', 'Dónde entra', 'Qué hace'],
    [
      ['Cliente final', 'turafood.com', 'Pide sin crear cuenta. Elige domicilio o recoger, paga como el negocio acepte y sigue su pedido en vivo.'],
      ['Negocio', 'app.turafood.com', 'Recibe comandas, maneja su carta, define cómo le pagan y ve sus números.'],
      ['Repartidor', 'app.turafood.com', 'Ve los pedidos disponibles, los toma, los recoge y los entrega con código.'],
      ['Equipo TuraFood', 'dash.turafood.com', 'Aprueba negocios, ve la operación en vivo y acompaña a quien acaba de entrar.'],
    ],
    [1.1, 1.2, 3],
  ),

  E.p('Negocio y repartidor comparten dominio porque comparten momento: los dos están trabajando. La aplicación lee el rol de la sesión y manda a cada quien a su entorno.', { after: 200 }),

  E.titulo('4. Cómo se quita la fricción'),

  E.sub3('Comprar sin cuenta'),
  E.p('El cliente entra a turafood.com y puede completar un pedido de principio a fin sin registrarse. Por dentro se le abre una sesión anónima que le da identidad frente a la base de datos —su pedido es suyo y nadie más lo ve— sin pedirle un solo dato. Si después quiere guardar su historial, pone su correo y la misma cuenta pasa a ser suya.'),

  E.sub3('Entrar a probar sin papeles'),
  E.p('Un negocio toca "Tengo un negocio" y en dos segundos está adentro, con un menú de ejemplo de su nicho y comandas de prueba en el tablero. Contesta seis preguntas cortas —ninguna pide datos personales— y el panel se le arma a su medida.'),

  E.sub3('Verificación por videollamada'),
  E.p('No se piden documentos. La verificación es una videollamada de 30 minutos con el equipo, donde se conoce el negocio y se decide si se le levanta el tope de 20 pedidos diarios. Un humano decidiendo en media hora es mejor filtro que un PDF que nadie mira, y no deja por fuera a quien trabaja hace años sin los papeles al día.'),

  E.destacado(
    'Compromiso de 24 horas',
    'Desde que el negocio agenda su videollamada corre un reloj visible en su panel. Si llega a cero sin respuesta, la pantalla lo admite y le ofrece escribirle al equipo. Una promesa con contador es verificable; sin contador es lo mismo que dice todo el mundo.',
  ),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('5. Cómo se mueve la plata'),
  E.p('En un pedido a domicilio de $48.900 en productos:'),

  E.tabla(
    ['Concepto', 'Monto', 'Para quién'],
    [
      ['Productos', '$48.900', 'El negocio'],
      ['Domicilio', '$3.900', 'El repartidor'],
      ['Propina', 'La que ponga el cliente', 'El repartidor'],
      [{ t: 'Tarifa de servicio', resaltar: true }, { t: '$1.900', resaltar: true }, { t: 'TuraFood', resaltar: true }],
      ['Comisión por venta', '$0', '—'],
    ],
    [2, 1.4, 1.6],
  ),

  E.p('El cliente le transfiere al negocio directamente, al Nequi o Daviplata que el negocio configuró, o le paga en efectivo al recibir. TuraFood no queda en el medio de esa plata.', { after: 160 }),

  E.subtitulo('Lo que sí se cobra'),
  E.tabla(
    ['Plan', 'Mensual', 'Anual', 'Equivale a', 'Ahorro'],
    [
      ['Starter', 'Gratis', 'Gratis', '—', '—'],
      ['Tura Food', '$89.000', '$489.000', '$40.750 /mes', '54%'],
      [{ t: 'Tura Growth', resaltar: true }, { t: '$289.000', resaltar: true }, { t: '$890.000', resaltar: true }, { t: '$74.167 /mes', resaltar: true }, { t: '74%', resaltar: true }],
    ],
    [1.3, 1, 1, 1.2, 0.8],
  ),
  E.p('Doce meses de Tura Growth pagando mes a mes son $3.468.000. El año completo cuesta $890.000 — una diferencia de $2.578.000 por exactamente la misma tecnología. Ese número es el argumento de venta, y por eso se muestra en pesos y no en porcentaje.', { after: 200 }),

  E.titulo('6. Qué está construido hoy'),
  E.p('Todo lo que sigue existe, funciona y está verificado contra la base de datos de producción — no es plan, es lo que hay.'),

  E.tabla(
    ['Área', 'Estado'],
    [
      ['Pedido completo sin cuenta (dirección, pago, seguimiento)', 'Funcionando'],
      ['Tablero de comandas en vivo con cuatro etapas', 'Funcionando'],
      ['Ciclo de entrega: tomar, recoger, entregar con código', 'Funcionando'],
      ['Medios de pago por negocio, con la regla en el servidor', 'Funcionando'],
      ['Comanda por WhatsApp adaptada al medio de pago', 'Funcionando'],
      ['Onboarding de seis preguntas y panel a medida', 'Funcionando'],
      ['Consola del equipo con operación en vivo y aprobaciones', 'Funcionando'],
      ['Métricas por producto (vistas, carrito, checkout, compra)', 'Midiendo desde 08/2026'],
      ['Cobro de planes con ePayco', 'Pendiente de conectar'],
      ['Agente de voz, reservas y campañas', 'Se entregan como servicio'],
    ],
    [3, 1.2],
  ),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('7. Por qué esto puede ganar acá'),

  E.sub3('Nadie más está mirando a Buenaventura'),
  E.p('Las apps grandes operan en las capitales. El puerto es un mercado que conocen mal y atienden peor, con direcciones que sus mapas no tienen y una lógica de barrio que sus algoritmos no entienden.'),

  E.sub3('La comisión cero no es una promoción'),
  E.p('Es la estructura. Como no se procesa la plata de las ventas, no hay costo de pasarela que recuperar, y por eso se puede sostener. Un competidor que cobra comisión no puede igualarlo sin romper su propio modelo.'),

  E.sub3('El equipo también opera'),
  E.p('TuraFood no solo pone la tecnología: el equipo está posicionado como negocio dentro de la misma app. Se usa lo que se vende, y los problemas se descubren operando, no en una reunión.'),

  E.titulo('8. Lo que sigue'),
  E.vineta('Conectar el cobro de planes y abrir las membresías.'),
  E.vineta('Sumar los primeros cincuenta negocios del puerto con verificación por videollamada.'),
  E.vineta('Acumular tres meses de métricas de producto para poder mostrarle a cada negocio qué plato le conviene empujar.'),
  E.vineta('Con eso, abrir Tura Growth a los negocios que ya tengan volumen.'),

  E.regla(),
  E.p('Documento interno · TuraFood AI · 2026', { size: 17, color: E.C.suave, cursiva: true }),
];

const doc = new Document({
  numbering: E.NUMERACION,
  sections: [{
    properties: { page: E.PAGINA },
    footers: E.PIE('Plan de Negocio'),
    children: hijos,
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync('01-Plan-de-Negocio-TuraFood-2026.docx', b);
  console.log('  ✓ 01-Plan-de-Negocio-TuraFood-2026.docx');
});
