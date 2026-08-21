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
    arte: 'tienda',
    titulo: 'Bienvenido a tu Suite',
    texto:
      'Tu panel todo-en-uno para Buenaventura. Te preparamos órdenes y catálogo de prueba en Modo Demo para que experimentes.',
  },
  {
    selector: '[data-tour="nav"]',
    arte: 'menu',
    titulo: 'El control en tus manos',
    texto:
      'Pedidos, menú, finanzas y reportes. Todo organizado a un clic para que gestiones tu negocio sin perder un solo segundo.',
  },
  {
    selector: '[data-tour="kpis"]',
    arte: 'comandas',
    titulo: 'Métricas en tiempo real',
    texto:
      'Ingresos en vivo, ticket promedio y pedidos marchando. Visualiza el pulso de tus ventas al instante.',
  },
  {
    selector: '[data-tour="modo-demo"]',
    arte: 'progreso',
    titulo: 'Modo Demo y Apertura',
    texto:
      'Alterna entre el simulador de prueba y tus ventas reales con un toque, y activa tu local cuando abras cocina.',
  },
  {
    selector: '[data-tour="ia"]',
    arte: 'ia',
    titulo: 'IA que trabaja para ti',
    texto:
      'Tu asistente inteligente. Recibe sugerencias clave para ajustar precios, impulsar platos y llevar tus ventas al siguiente nivel.',
  },
];

export const PASOS_REPARTIDOR = [
  {
    arte: 'ruta',
    titulo: 'Listo para arrancar',
    texto:
      'Estás dentro. Explora la app y descubre cómo funciona todo libremente antes de subir tu primer documento.',
  },
  {
    selector: '[data-tour="progreso"]',
    arte: 'progreso',
    titulo: 'Activa tus ganancias',
    texto:
      'Tus datos, tu vehículo y tus documentos. Completa estos 3 pasos rápidos y empieza a recibir pedidos de inmediato.',
  },
  {
    selector: '[data-tour="nav"], [data-tour="nav-movil"]',
    arte: 'menu',
    titulo: 'Todo lo que necesitas',
    texto:
      'Inicio para pedidos, Ganancias para retirar tu dinero y Cuenta para tus datos. Diseñado para ser ultra rápido.',
  },
  {
    arte: 'panel',
    titulo: 'Pedidos al instante',
    texto:
      'Mira cuánto ganas, la distancia y el destino. Tienes 20 segundos para aceptar, sin penalidad alguna si lo dejas pasar.',
  },
];
