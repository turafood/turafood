/**
 * 03, 04 y 05 — LOS TRES MANUALES
 *
 * Uno por actor: negocio, repartidor y cliente. Están escritos para
 * que los lea la persona, no el equipo — sin jerga y con el "qué
 * hago yo" antes que el "cómo funciona el sistema".
 */

const { Document, Packer, Paragraph, PageBreak } = require('docx');
const fs = require('fs');
const E = require('./estilo');

const armar = (nombre, archivo, hijos) => {
  const doc = new Document({
    numbering: E.NUMERACION,
    sections: [{
      properties: { page: E.PAGINA },
      footers: E.PIE(nombre),
      children: hijos,
    }],
  });
  return Packer.toBuffer(doc).then((b) => {
    fs.writeFileSync(archivo, b);
    console.log('  ✓ ' + archivo);
  });
};

/* ============================================================
   03 — MANUAL DEL NEGOCIO
   ============================================================ */
const negocio = [
  ...E.portada(
    'MANUAL DEL NEGOCIO · 2026',
    'Tu negocio en TuraFood',
    'Todo lo que necesitas saber para vender desde el primer día.',
  ),

  E.destacado(
    'Lo primero: no te cobramos por vender',
    'No hay comisión por pedido. Lo que vendas es tuyo y te llega directo, por el medio que tú decidas. No tienes que esperar a que te consignemos: nosotros no tocamos esa plata.',
  ),

  E.titulo('1. Entrar'),
  E.p('Vas a app.turafood.com y tocas "Tengo un negocio". No te pedimos correo, ni contraseña, ni papeles: en dos segundos estás adentro.'),
  E.p('Te hacemos seis preguntas cortas —qué vendes, cuántos pedidos manejas, por dónde te piden hoy— y con eso te armamos el panel a tu medida. Todas se contestan de un toque y ninguna pide datos tuyos. Si no quieres contestarlas, tocas "Saltar" y entras igual.'),
  E.p('Te dejamos un menú de ejemplo de tu nicho y cuatro comandas de prueba, para que veas cómo se ve tu negocio trabajando. Las puedes borrar cuando quieras.'),

  E.titulo('2. Tu menú'),
  E.p('En Menú y productos armas tu carta: categorías, productos, fotos y precios.'),
  E.vineta('Cada producto lleva su foto, su descripción y su precio.'),
  E.vineta('Puedes agotar un plato con un toque, sin borrarlo.'),
  E.vineta('Los agregados y las opciones se configuran por producto.'),
  E.p('Tocando "vendidos" en la fila de un producto se abre su ficha de métricas: cuánta gente lo vio, cuántos lo echaron al carrito, cuántos llegaron a pagar y cuántos lo compraron. Ahí mismo te decimos qué conviene hacer con él.'),

  E.titulo('3. Cómo te pagan'),
  E.p('En "Cómo te pagan" prendes solo los medios que de verdad puedes recibir. Lo que apagues no le aparece a tus clientes — no sale en gris, no sale.'),

  E.tabla(
    ['Medio', 'Qué necesitas'],
    [
      ['Efectivo', 'Nada. Te pagan al recibir.'],
      ['WhatsApp', 'Tu número. Te llega la comanda completa y cierras el pago por chat.'],
      ['Nequi', 'Tu número de Nequi. El cliente lo ve y te transfiere.'],
      ['Daviplata', 'Tu número de Daviplata.'],
      ['Tarjeta al recibir', 'Que mandes datáfono con el domicilio.'],
    ],
    [1.3, 2.7],
  ),
  E.p('Si prendes WhatsApp, cada pedido te llega como un mensaje del cliente con todo el detalle: el número del pedido, qué pidió, las cuentas desglosadas, la dirección y cómo te va a pagar.', { after: 160 }),

  E.titulo('4. Los pedidos'),
  E.p('El tablero tiene cuatro columnas y cada pedido pasa por ellas:'),
  E.tabla(
    ['Columna', 'Qué significa'],
    [
      ['Nuevos', 'Acaba de entrar. Lo aceptas o lo rechazas.'],
      ['En preparación', 'Estás cocinando.'],
      ['Listos', 'Ya está para salir.'],
      ['En camino', 'Un repartidor lo tomó y va en ruta.'],
    ],
    [1.2, 2.8],
  ),
  E.p('El cliente ve cada cambio al instante en su app. Si no tienes domiciliarios, un repartidor del puerto lo toma solo; si tienes los tuyos, igual puedes usarlos.'),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('5. Verificarte'),
  E.p('Mientras no te verifiques puedes vender con un tope de 20 pedidos al día. Para quitarlo:'),
  E.vineta('En Verificación nos dejas tus datos básicos y los de tu negocio. Nada de RUT ni cámara de comercio.'),
  E.vineta('Agendas una videollamada de 30 minutos con el equipo, desde la misma pantalla.'),
  E.vineta('En esa llamada nos conocemos, resolvemos tus dudas y decidimos ahí mismo si te levantamos el tope.'),
  E.p('Desde que agendas corre un reloj: nos comprometemos a responderte en menos de 24 horas y lo puedes ver contando en tu panel.'),

  E.titulo('6. Si quieres crecer más rápido'),
  E.p('En Growth Partner están los planes. Son opcionales: la app va a seguir siendo gratis los tomes o no.'),
  E.vineta('Tura Food te monta tu sitio web propio, con dominio, correo y tu ficha de Google.'),
  E.vineta('Tura Growth suma agente de voz que contesta la línea, reservas, CRM, correos automáticos y campañas en Google y Meta.'),
  E.p('El plan anual cuesta bastante menos que pagar mes a mes: la pantalla te muestra la cuenta exacta.'),

  E.titulo('7. Cosas que ayudan'),
  E.vineta('Escribe direcciones claras en tu ficha: menos llamadas del repartidor y pedidos más rápidos.'),
  E.vineta('Sube fotos reales de tus platos. Es lo que más mueve la aguja en las métricas.'),
  E.vineta('Marca tus horarios de verdad. Un negocio abierto que no contesta pierde al cliente para siempre.'),
  E.vineta('Contesta las reseñas. Se ven en tu tienda y pesan.'),
];

/* ============================================================
   04 — MANUAL DEL REPARTIDOR
   ============================================================ */
const repartidor = [
  ...E.portada(
    'MANUAL DEL REPARTIDOR · 2026',
    'Repartir con TuraFood',
    'Cómo trabajar, cuánto ganas y cómo se te paga.',
  ),

  E.destacado(
    'Lo que ganas es tuyo',
    'Te quedas con el domicilio completo y con toda la propina. TuraFood no te retiene nada de eso.',
  ),

  E.titulo('1. Entrar'),
  E.p('Vas a app.turafood.com y tocas "Quiero repartir". Entras sin registrarte y sin subir un solo papel.'),
  E.p('Te hacemos cuatro preguntas: en qué te mueves, cuándo puedes trabajar, cuánto tiempo le vas a meter y si ya has repartido antes. Con eso sabemos qué pedidos ofrecerte.'),
  E.p('Puedes repartir en moto, en bicicleta, en carro o a pie. Las entregas del centro se hacen caminando y también cuentan.'),

  E.titulo('2. Cómo ganas'),
  E.tabla(
    ['Concepto', 'Cuánto'],
    [
      ['Domicilio', 'El que cobre el negocio (por defecto $3.900)'],
      ['Propina', 'Toda, la que ponga el cliente'],
      ['Descuento de TuraFood', 'Ninguno'],
    ],
    [1.4, 2.6],
  ),
  E.p('En un pedido con $3.900 de domicilio y $3.000 de propina, te ganas $6.900. Eso se te suma a tu historial apenas confirmas la entrega.'),

  E.titulo('3. El ciclo de una entrega'),
  E.vineta('Te aparece el pedido con lo que paga, de dónde a dónde va y la distancia. Tienes 20 segundos para tomarlo — si se vence no cuenta como rechazo.'),
  E.vineta('Vas al negocio y lo recoges. Marcas "Recogido" en la app.'),
  E.vineta('Lo llevas a la dirección del cliente.'),
  E.vineta('Al entregar, el cliente te dice un código de cuatro dígitos. Lo escribes y la entrega queda cerrada.'),
  E.p('El código es la protección de los dos: confirma que llegó a la persona correcta y deja constancia de que hiciste tu trabajo.'),

  E.titulo('4. Tu cuenta'),
  E.p('Mientras no te verifiques puedes mirar todo por dentro y entender cómo funciona, pero no te van a llegar pedidos.'),
  E.p('Para quedar habilitado agendas una videollamada corta con el equipo desde tu pantalla de Cuenta. No te pedimos cédula, licencia ni SOAT como requisito: si los tienes al día los puedes cargar y te ahorras preguntas, pero no son obligatorios.'),

  E.titulo('5. Tus niveles'),
  E.p('A medida que entregas subes de nivel. El nivel se ve en tu barra lateral y define a qué pedidos accedes primero.'),

  E.titulo('6. Cosas que ayudan'),
  E.vineta('Ponte en línea solo cuando de verdad vas a trabajar. Un repartidor en línea que no acepta hace esperar al cliente.'),
  E.vineta('Si vas a demorarte, avísale al cliente por el chat de la app.'),
  E.vineta('Cuida el pedido: lo que llega frío o volteado se devuelve, y eso lo paga alguien.'),
  E.vineta('Marca "Recogido" cuando de verdad lo tengas. El cliente ve ese estado.'),
];

/* ============================================================
   05 — GUÍA DEL CLIENTE
   ============================================================ */
const cliente = [
  ...E.portada(
    'GUÍA DEL CLIENTE · 2026',
    'Pedir en TuraFood',
    'Todo el puerto en una app, sin crear cuenta.',
  ),

  E.destacado(
    'No necesitas registrarte',
    'Puedes hacer un pedido completo —elegir, poner tu dirección, pagar y seguirlo— sin dar tu correo ni crear una contraseña. Si después quieres guardar tu historial, pones tu correo y todo lo que hiciste se queda contigo.',
  ),

  E.titulo('1. Pedir'),
  E.vineta('Entras a turafood.com y ves los negocios abiertos cerca.'),
  E.vineta('Eliges lo que quieres y lo echas a la canasta.'),
  E.vineta('Decides si te lo llevan o lo recoges.'),
  E.vineta('Pones tu dirección — solo si es a domicilio.'),
  E.vineta('Eliges cómo pagas, entre los medios que ese negocio acepta.'),
  E.vineta('Confirmas y sigues tu pedido en vivo.'),

  E.titulo('2. Cómo pagas'),
  E.p('Cada negocio decide qué medios acepta, así que vas a ver solo los que ese negocio de verdad puede recibir.'),
  E.tabla(
    ['Medio', 'Cómo es'],
    [
      ['Efectivo', 'Pagas cuando te llega. Ten el monto listo.'],
      ['Nequi o Daviplata', 'Te mostramos el número del negocio para que le transfieras. Guarda el comprobante.'],
      ['Tarjeta al recibir', 'Si el negocio manda datáfono.'],
      ['Por WhatsApp', 'Tu pedido queda hecho y cuadras el pago por chat con el negocio.'],
    ],
    [1.4, 2.6],
  ),
  E.p('Le pagas al negocio, no a TuraFood. Nosotros no quedamos en el medio de esa plata.'),

  E.titulo('3. Qué te cobramos'),
  E.tabla(
    ['Concepto', 'Cuánto', 'Para quién'],
    [
      ['Lo que pediste', 'El precio del negocio', 'El negocio'],
      ['Domicilio', 'Lo que cobre el negocio', 'El repartidor'],
      ['Tarifa de servicio', '$1.900', 'TuraFood'],
      ['Propina', 'La que tú quieras', 'El repartidor'],
    ],
    [1.6, 1.4, 1.2],
  ),
  E.p('La tarifa de servicio es lo único que va para TuraFood, y es lo que mantiene la app funcionando sin cobrarle comisión a los negocios del puerto.'),

  E.titulo('4. Seguir tu pedido'),
  E.p('Desde que confirmas ves en qué va: si lo están preparando, si ya está listo y cuando un repartidor lo toma. Puedes escribirle por el chat de la app.'),
  E.p('Al recibirlo, el repartidor te va a pedir un código de cuatro dígitos que aparece en tu pantalla. Ese código confirma que el pedido llegó a la persona correcta.'),

  E.titulo('5. Si algo sale mal'),
  E.vineta('Si el pedido llega incompleto o en mal estado, repórtalo desde el pedido en Mis pedidos.'),
  E.vineta('Si el negocio no confirma, puedes cancelar sin costo mientras no lo hayan aceptado.'),
  E.vineta('Para cualquier otra cosa está Ayuda, dentro de la app.'),
];

Promise.all([
  armar('Manual del Negocio', '03-Manual-del-Negocio-TuraFood-2026.docx', negocio),
  armar('Manual del Repartidor', '04-Manual-del-Repartidor-TuraFood-2026.docx', repartidor),
  armar('Guía del Cliente', '05-Guia-del-Cliente-TuraFood-2026.docx', cliente),
]);
