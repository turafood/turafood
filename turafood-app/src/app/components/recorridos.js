/**
 * QUÉ SE SEÑALA Y QUÉ SE DICE
 *
 * Los pasos van aquí y no dentro del armazón para que cambiar el
 * texto no obligue a tocar la navegación.
 *
 * Reglas que me impuse al escribirlos:
 *
 *   · Pocos. Seis pasos es lo máximo que alguien aguanta antes de
 *     empezar a darle "siguiente" sin leer.
 *
 *   · Cada uno responde "¿para qué me sirve esto?", no "¿qué es
 *     esto?". "Menú y productos" ya se lee en la pantalla; lo que no
 *     se ve es que las fotos suben desde el celular.
 *
 *   · Sin signos de admiración ni promesas. Quien está probando una
 *     app para su negocio no necesita ánimo, necesita saber dónde
 *     queda cada cosa.
 *
 * Si un `selector` no existe en pantalla, el paso se salta solo. Por
 * eso los del escritorio y los del celular pueden convivir.
 */

export const PASOS_NEGOCIO = [
  {
    titulo: 'Este es tu panel',
    texto:
      'Estás dentro sin haber dado un dato. Te dejamos un menú y unas comandas de ejemplo para que veas cómo se ve tu negocio trabajando — puedes borrarlos cuando quieras.',
  },
  {
    selector: '[data-tour="nav"]',
    titulo: 'Todo vive acá',
    texto:
      'Los pedidos que entran, tu carta, las promociones, lo que te vamos a consignar. Lo que más vas a usar está de primero.',
  },
  {
    selector: '[data-tour="contenido"]',
    titulo: 'El tablero de comandas',
    texto:
      'Cada pedido pasa por cuatro columnas: entra, se cocina, queda listo, sale. Se mueve con un toque y el cliente lo ve al instante en su app.',
  },
  {
    selector: '[data-tour="progreso"]',
    titulo: 'Lo que te falta',
    texto:
      'Mientras no subas tus documentos puedes recibir 20 pedidos al día. Esta barra te dice qué sigue; si estorba, se pliega.',
  },
  {
    selector: '[data-tour="ia"]',
    titulo: 'Tura IA',
    texto:
      'Te avisa qué conviene hacer hoy: qué plato subir de precio, qué reseña contestar, cuándo abrir más temprano.',
  },
];

export const PASOS_REPARTIDOR = [
  {
    titulo: 'Bienvenido',
    texto:
      'Entraste sin registrarte. Puedes mirar todo y entender cómo funciona antes de subir un solo papel.',
  },
  {
    selector: '[data-tour="progreso"]',
    titulo: 'Para empezar a rodar',
    texto:
      'Tres pasos: tus datos, tu vehículo y tus documentos. Hasta que no estén, no te van a llegar pedidos.',
  },
  {
    selector: '[data-tour="nav"], [data-tour="nav-movil"]',
    titulo: 'Tus cuatro pantallas',
    texto:
      'Inicio para recibir pedidos, Ganancias para retirar tu plata, Entregas para tu historial y Cuenta para tus papeles.',
  },
  {
    titulo: 'Cómo llega un pedido',
    texto:
      'Aparece con el pago, la distancia y a dónde va. Tienes 20 segundos para tomarlo — si se vence no cuenta como rechazo.',
  },
];
