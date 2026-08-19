/**
 * LAS SEIS PREGUNTAS DEL ARRANQUE
 *
 * Reglas que me impuse al escribirlas:
 *
 *   · NINGUNA pide datos personales. Ni nombre, ni correo, ni
 *     teléfono. Pedir eso en el primer minuto es exactamente el muro
 *     que quitamos al dejar entrar sin cuenta. Todas preguntan por el
 *     negocio, nunca por la persona.
 *
 *   · Todas se contestan de un toque. Cero teclado: en un celular,
 *     escribir es la diferencia entre contestar y cerrar la pestaña.
 *
 *   · Cada una sirve para algo concreto. Si una respuesta no cambia
 *     nada de lo que ve después, sobra — y se cae. Las dos últimas no
 *     configuran nada técnico, pero le dicen al equipo a quién llamar
 *     hoy, que también es algo.
 *
 *   · Las opciones están en el idioma del puerto, no en el de una
 *     consultora. "Que me encuentren" antes que "visibilidad".
 *
 * Seis es el techo. En la séptima la gente empieza a darle a lo que
 * sea con tal de terminar, y ahí los datos dejan de servir.
 */

export const PREGUNTAS_NEGOCIO = [
  {
    id: 'nicho',
    titulo: '¿Qué vendes?',
    bajada: 'Con esto te armamos el menú de ejemplo y el panel a tu medida.',
    columnas: 2,
    opciones: [
      { id: 'comidas_rapidas', label: 'Comidas rápidas', emoji: '🍟' },
      { id: 'hamburgueseria',  label: 'Hamburguesas',    emoji: '🍔' },
      { id: 'pizzeria',        label: 'Pizzería',         emoji: '🍕' },
      { id: 'comida_mar',      label: 'Comida de mar',    emoji: '🦐' },
      { id: 'asadero',         label: 'Asadero / pollo',  emoji: '🍗' },
      { id: 'cafeteria',       label: 'Café o repostería', emoji: '☕' },
      { id: 'mercado',         label: 'Mercado o fruver', emoji: '🥬' },
      { id: 'farmacia',        label: 'Droguería',        emoji: '💊' },
      { id: 'licores',         label: 'Licores',          emoji: '🍾' },
      { id: 'sexshop',         label: 'Sexshop',          emoji: '🎁' },
      { id: 'tienda',          label: 'Otra tienda',      emoji: '🏬' },
    ],
  },

  {
    id: 'volumen',
    titulo: '¿Cuántos pedidos manejas al día?',
    bajada: 'Más o menos. Es para saber qué tan grande armarte el tablero.',
    opciones: [
      { id: '0-10',   label: 'Menos de 10',  detalle: 'Voy arrancando', emoji: '🌱' },
      { id: '10-30',  label: 'Entre 10 y 30', detalle: 'Ya tengo movimiento', emoji: '📈' },
      { id: '30-100', label: 'Entre 30 y 100', detalle: 'Día full', emoji: '🔥' },
      { id: 'mas100', label: 'Más de 100',   detalle: 'Esto no para', emoji: '🚀' },
    ],
  },

  {
    id: 'canal',
    titulo: '¿Por dónde te piden hoy?',
    bajada: 'Puedes marcar varias.',
    multiple: true,
    opciones: [
      { id: 'whatsapp',  label: 'WhatsApp',            emoji: '💬' },
      { id: 'llamada',   label: 'Me llaman',           emoji: '📞' },
      { id: 'otra_app',  label: 'Otra app de domicilios', emoji: '📱' },
      { id: 'local',     label: 'Solo en el local',    emoji: '🏪' },
      { id: 'redes',     label: 'Instagram o Facebook', emoji: '📸' },
    ],
  },

  {
    id: 'reparto',
    titulo: '¿Quién lleva los pedidos?',
    bajada: 'Si no tienes, te conectamos con repartidores del puerto.',
    opciones: [
      { id: 'propios',  label: 'Tengo mis domiciliarios', detalle: 'Solo necesito organizarlos', emoji: '🛵' },
      { id: 'ninguno',  label: 'No tengo',                detalle: 'Quiero que ustedes lleven',  emoji: '🤝' },
      { id: 'mixto',    label: 'Tengo, pero no alcanzan', detalle: 'A veces necesito refuerzo',  emoji: '⚡' },
      { id: 'recogen',  label: 'Me lo recogen',           detalle: 'No mando domicilios',        emoji: '🏃' },
    ],
  },

  {
    id: 'dolor',
    titulo: '¿Qué es lo que más te cuesta hoy?',
    bajada: 'Lo ponemos de primero en tu panel.',
    opciones: [
      { id: 'clientes',  label: 'Que me conozcan más',     detalle: 'Necesito más gente pidiendo', emoji: '👀' },
      { id: 'orden',     label: 'Organizar los pedidos',   detalle: 'Se me enredan las comandas',  emoji: '🗂️' },
      { id: 'cobrar',    label: 'Cobrar y cuadrar caja',   detalle: 'No sé bien cuánto entra',     emoji: '💵' },
      { id: 'entregas',  label: 'Que lleguen a tiempo',    detalle: 'Los domicilios se demoran',   emoji: '⏱️' },
      { id: 'todo',      label: 'Todo un poco',            detalle: 'Vengo a ver qué me sirve',    emoji: '🧭' },
    ],
  },

  {
    id: 'cuando',
    titulo: '¿Cuándo quieres empezar a vender?',
    bajada: 'Sin compromiso. Es para saber si te ayudamos ya o te damos tiempo.',
    opciones: [
      { id: 'ya',       label: 'Ya mismo',        detalle: 'Quiero recibir pedidos hoy',   emoji: '⚡' },
      { id: 'semana',   label: 'Esta semana',     detalle: 'Estoy alistando todo',          emoji: '📅' },
      { id: 'mirando',  label: 'Estoy mirando',   detalle: 'Primero quiero entender bien',  emoji: '🔍' },
    ],
  },
];

/**
 * Las del repartidor. Menos, porque su alta es más simple: lo que
 * define su panel es en qué se mueve y cuándo puede.
 */
export const PREGUNTAS_REPARTIDOR = [
  {
    id: 'vehiculo',
    titulo: '¿En qué te mueves?',
    bajada: 'Define qué pedidos te vamos a ofrecer.',
    opciones: [
      { id: 'moto',      label: 'Moto',      detalle: 'Lo más rápido en el puerto', emoji: '🛵' },
      { id: 'bicicleta', label: 'Bicicleta', detalle: 'Ideal para el centro',        emoji: '🚲' },
      { id: 'carro',     label: 'Carro',     detalle: 'Pedidos grandes y mercados',  emoji: '🚗' },
      { id: 'pie',       label: 'A pie',     detalle: 'Entregas cerquita',           emoji: '🚶' },
    ],
  },
  {
    id: 'horario',
    titulo: '¿Cuándo puedes trabajar?',
    bajada: 'Puedes marcar varias. Lo cambias cuando quieras.',
    multiple: true,
    opciones: [
      { id: 'manana', label: 'Mañanas',     detalle: '6 a. m. – 12 m.', emoji: '🌅' },
      { id: 'tarde',  label: 'Tardes',      detalle: '12 m. – 6 p. m.', emoji: '☀️' },
      { id: 'noche',  label: 'Noches',      detalle: '6 p. m. – 12 a. m.', emoji: '🌙' },
      { id: 'finde',  label: 'Fines de semana', detalle: 'Sábados y domingos', emoji: '🎉' },
    ],
  },
  {
    id: 'dedicacion',
    titulo: '¿Cuánto tiempo le vas a meter?',
    opciones: [
      { id: 'completo', label: 'Todo el día',   detalle: 'Es mi trabajo principal', emoji: '💪' },
      { id: 'parcial',  label: 'Medio tiempo',  detalle: 'Unas horas al día',       emoji: '⏳' },
      { id: 'ratos',    label: 'Cuando pueda',  detalle: 'Para un extra',           emoji: '🎯' },
    ],
  },
  {
    id: 'experiencia',
    titulo: '¿Ya has repartido antes?',
    opciones: [
      { id: 'si_apps',  label: 'Sí, en otras apps', detalle: 'Ya sé cómo es',      emoji: '⭐' },
      { id: 'si_local', label: 'Sí, para un negocio', detalle: 'Pero no en app',   emoji: '📦' },
      { id: 'no',       label: 'Es mi primera vez',  detalle: 'Te enseñamos',      emoji: '🌱' },
    ],
  },
];
