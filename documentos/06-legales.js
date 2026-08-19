/**
 * 06 y 07 — TÉRMINOS Y PRIVACIDAD
 *
 * Los dos que van en el pie de página de turafood.com.
 *
 * Están escritos para que se entiendan. Un término y condiciones que
 * nadie lee no protege a nadie: si la persona no sabe qué aceptó, el
 * documento sirve para el abogado y para nadie más.
 *
 * AVISO: esto es un borrador de trabajo, no asesoría legal. Antes de
 * publicarlo hay que pasarlo por un abogado colombiano — sobre todo
 * lo de habeas data (Ley 1581 de 2012) y lo de comercio electrónico
 * (Ley 1480 de 2011, el Estatuto del Consumidor).
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

const AVISO_LEGAL = E.destacado(
  'Antes de publicarlo',
  'Este es un borrador de trabajo, no asesoría legal. Antes de subirlo al sitio tiene que revisarlo un abogado en Colombia, en particular lo relacionado con la Ley 1581 de 2012 (habeas data) y la Ley 1480 de 2011 (Estatuto del Consumidor).',
);

/* ============================================================
   06 — TÉRMINOS Y CONDICIONES
   ============================================================ */
const terminos = [
  ...E.portada(
    'TÉRMINOS Y CONDICIONES',
    'Términos de uso',
    'Última actualización: agosto de 2026.',
  ),

  AVISO_LEGAL,

  E.titulo('1. Quiénes somos y qué hacemos'),
  E.p('TuraFood AI es una plataforma que conecta negocios de Buenaventura con clientes y repartidores de la ciudad. Operamos turafood.com, app.turafood.com y dash.turafood.com.'),
  E.pMixto([
    ['Somos un intermediario tecnológico: ', 0],
    ['no preparamos los alimentos, no los vendemos y no cobramos por ellos', 1],
    ['. Quien vende es el negocio; quien entrega es el repartidor. TuraFood pone la herramienta que los conecta.', 0],
  ]),

  E.titulo('2. Usar la plataforma sin cuenta'),
  E.p('Puedes pedir sin registrarte. Cuando lo haces, el sistema te crea una sesión anónima para poder guardar tu pedido y tu dirección — es un identificador técnico, no un perfil con tus datos.'),
  E.p('Si más adelante decides registrarte, esa misma cuenta pasa a ser tuya con todo lo que hiciste antes.'),
  E.p('Para pedir debes ser mayor de edad. Los productos con restricción legal —licores, medicamentos de control— solo se entregan a mayores de 18 años con documento a la vista.'),

  E.titulo('3. Los pedidos'),
  E.vineta('Los precios, la disponibilidad y las fotos las pone cada negocio. TuraFood no los fija ni los verifica uno por uno.'),
  E.vineta('El pedido queda en firme cuando el negocio lo acepta. Antes de eso lo puedes cancelar sin costo.'),
  E.vineta('Los tiempos de entrega son estimados, no una promesa contractual. Dependen del negocio, del tráfico y del clima del puerto.'),
  E.vineta('Si el negocio no puede cumplir un pedido ya aceptado, debe cancelarlo y avisarte.'),

  E.titulo('4. Los pagos'),
  E.pMixto([
    ['TuraFood ', 0],
    ['no procesa el dinero de tus compras', 1],
    ['. Le pagas directamente al negocio por el medio que él haya habilitado: efectivo al recibir, transferencia a su Nequi o Daviplata, tarjeta con datáfono, o acordándolo por WhatsApp.', 0],
  ]),
  E.p('Sobre cada pedido se cobra una tarifa de servicio que aparece desglosada antes de confirmar. Esa tarifa es lo único que va para TuraFood.'),
  E.p('El domicilio y la propina son del repartidor. TuraFood no retiene nada de ellos.'),
  E.p('Los planes de crecimiento que un negocio tome se cobran aparte, a través de nuestra pasarela de pagos, y se rigen por sus propias condiciones.'),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('5. Devoluciones y reclamos'),
  E.p('Si tu pedido llega incompleto, en mal estado o distinto a lo que pediste, repórtalo desde la app dentro de las 24 horas siguientes.'),
  E.p('Como el pago va directo al negocio, la devolución la hace el negocio. TuraFood media en el reclamo y, si el negocio no responde, puede suspenderlo de la plataforma.'),
  E.p('Esto no limita tus derechos como consumidor bajo la Ley 1480 de 2011.'),

  E.titulo('6. Obligaciones del negocio'),
  E.vineta('Cumplir las normas sanitarias, tributarias y de funcionamiento que le correspondan. TuraFood no verifica el cumplimiento normativo de cada negocio.'),
  E.vineta('Que lo que publica —precios, fotos, descripciones— corresponda a lo que entrega.'),
  E.vineta('Atender los pedidos que acepta dentro de un tiempo razonable.'),
  E.vineta('No vender productos de venta prohibida ni entregarlos a quien no cumpla la edad.'),

  E.titulo('7. Obligaciones del repartidor'),
  E.vineta('Contar con los documentos que su vehículo exija por ley, cuando aplique.'),
  E.vineta('Entregar el pedido en las condiciones en que lo recibió.'),
  E.vineta('Pedir el código de entrega y no cerrar la entrega sin él.'),
  E.vineta('Tratar con respeto a clientes y a negocios.'),

  E.titulo('8. Suspensión de cuentas'),
  E.p('Podemos suspender una cuenta que incumpla estos términos, que reporte información falsa, que manipule métricas o pedidos, o que ponga en riesgo a otro usuario.'),
  E.p('Antes de suspender contactamos a la persona, salvo que la gravedad exija actuar de inmediato.'),

  E.titulo('9. Límite de responsabilidad'),
  E.p('TuraFood responde por el funcionamiento de la plataforma. No responde por la calidad, la inocuidad ni la legalidad de los productos que vende cada negocio, ni por hechos ocurridos por fuera de la plataforma.'),
  E.p('Nada de lo anterior excluye la responsabilidad que la ley colombiana nos imponga de forma imperativa.'),

  E.titulo('10. Cambios'),
  E.p('Podemos modificar estos términos. Cuando el cambio sea relevante lo avisamos dentro de la app con al menos 15 días de anticipación. Seguir usando la plataforma después de esa fecha significa que los aceptas.'),

  E.titulo('11. Ley y jurisdicción'),
  E.p('Estos términos se rigen por la ley colombiana. Cualquier controversia se somete a los jueces de Buenaventura, Valle del Cauca.'),

  E.regla(),
  E.p('Contacto: hola@turafood.com · WhatsApp +57 313 759 4713 · Buenaventura, Valle del Cauca, Colombia.', { size: 18, color: E.C.suave }),
];

/* ============================================================
   07 — POLÍTICA DE PRIVACIDAD
   ============================================================ */
const privacidad = [
  ...E.portada(
    'POLÍTICA DE PRIVACIDAD',
    'Tus datos',
    'Qué guardamos, para qué, y cómo lo controlas.',
  ),

  AVISO_LEGAL,

  E.destacado(
    'En una frase',
    'Guardamos lo mínimo para que tu pedido llegue. No vendemos tus datos, no los cedemos a terceros para publicidad, y puedes pedir que los borremos cuando quieras.',
  ),

  E.titulo('1. Quién responde por tus datos'),
  E.p('TuraFood AI, con domicilio en Buenaventura, Valle del Cauca, es el responsable del tratamiento de tus datos personales conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013.'),

  E.titulo('2. Qué guardamos'),

  E.tabla(
    ['Dato', 'Para qué', 'Cuándo lo pedimos'],
    [
      ['Dirección de entrega', 'Para que el repartidor llegue', 'Al pedir a domicilio'],
      ['Teléfono', 'Para que el negocio o el repartidor te contacten', 'Opcional'],
      ['Correo', 'Para guardar tu historial y recuperar tu cuenta', 'Solo si te registras'],
      ['Historial de pedidos', 'Para que veas lo que pediste y puedas repetirlo', 'Automático'],
      ['Ubicación', 'Para mostrarte negocios cerca', 'Solo si la autorizas'],
    ],
    [1.4, 2, 1.4],
  ),

  E.subtitulo('Lo que NO guardamos'),
  E.vineta('Datos de tu tarjeta. No procesamos tus pagos: le pagas directo al negocio.'),
  E.vineta('Tu cédula, salvo que decidas cargarla como negocio o repartidor.'),
  E.vineta('El contenido de tus conversaciones fuera de la app.'),

  E.titulo('3. Las métricas de productos'),
  E.p('Para que cada negocio sepa cómo le va a sus platos, contamos cuántas personas vieron un producto, cuántas lo echaron al carrito y cuántas lo compraron.'),
  E.pMixto([
    ['Ese conteo es ', 0],
    ['anónimo', 1],
    [': guardamos una huella técnica del navegador que sirve para no contar diez veces a la misma persona, y nada más. No se guarda quién eres, ni tu cuenta, ni tu IP, y el negocio ve números, nunca nombres.', 0],
  ]),

  E.titulo('4. Con quién compartimos'),
  E.tabla(
    ['Con quién', 'Qué recibe', 'Por qué'],
    [
      ['El negocio al que pediste', 'Tu pedido, tu dirección y tu teléfono si lo diste', 'Para prepararlo y entregártelo'],
      ['El repartidor asignado', 'La dirección y el teléfono, mientras dura la entrega', 'Para llegar donde estás'],
      ['Supabase (infraestructura)', 'Los datos, almacenados y cifrados', 'Es donde vive la plataforma'],
      ['ePayco', 'Solo datos de negocios que compran un plan', 'Para cobrar la membresía'],
    ],
    [1.5, 2, 1.5],
  ),
  E.p('No vendemos tus datos ni los cedemos a terceros con fines publicitarios.'),

  new Paragraph({ children: [new PageBreak()] }),

  E.titulo('5. Cuánto tiempo los guardamos'),
  E.vineta('Tus pedidos: cinco años, por obligaciones contables y tributarias.'),
  E.vineta('Tu cuenta y direcciones: mientras la tengas activa.'),
  E.vineta('Las métricas anónimas de producto: dos años.'),
  E.vineta('Si pides que borremos tu cuenta, la borramos en 30 días, salvo lo que la ley nos obligue a conservar.'),

  E.titulo('6. Tus derechos'),
  E.p('Puedes, en cualquier momento:'),
  E.vineta('Saber qué datos tuyos tenemos.'),
  E.vineta('Corregirlos si están mal.'),
  E.vineta('Pedir que los borremos.'),
  E.vineta('Revocar la autorización que nos diste.'),
  E.vineta('Presentar una queja ante la Superintendencia de Industria y Comercio.'),
  E.p('Para cualquiera de esas cosas escribe a datos@turafood.com o por WhatsApp al +57 313 759 4713. Respondemos en máximo 15 días hábiles.'),

  E.titulo('7. Seguridad'),
  E.vineta('Todo viaja cifrado (HTTPS) y se guarda cifrado.'),
  E.vineta('Cada quien ve solo lo suyo: las reglas están en la base de datos, no solo en la pantalla.'),
  E.vineta('Los documentos que cargues quedan en un espacio privado, sin dirección pública.'),
  E.p('Si llegara a ocurrir un incidente que ponga en riesgo tus datos, te avisamos y le reportamos a la autoridad dentro de los plazos de ley.'),

  E.titulo('8. Menores de edad'),
  E.p('La plataforma es para mayores de 18 años. No recopilamos datos de menores a sabiendas; si detectamos una cuenta de un menor, la cerramos y borramos sus datos.'),

  E.titulo('9. Cambios'),
  E.p('Si cambiamos esta política de forma relevante, te avisamos dentro de la app con al menos 15 días de anticipación.'),

  E.regla(),
  E.p('Contacto de datos: datos@turafood.com · Buenaventura, Valle del Cauca, Colombia.', { size: 18, color: E.C.suave }),
];

Promise.all([
  armar('Términos y Condiciones', '06-Terminos-y-Condiciones-TuraFood-2026.docx', terminos),
  armar('Política de Privacidad', '07-Politica-de-Privacidad-TuraFood-2026.docx', privacidad),
]);
