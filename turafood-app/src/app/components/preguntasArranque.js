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
      { id: 'comidas_rapidas', label: 'Comidas rápidas' },
      { id: 'hamburgueseria',  label: 'Hamburguesas' },
      { id: 'pizzeria',        label: 'Pizzería' },
      { id: 'comida_mar',      label: 'Comida de mar' },
      { id: 'asadero',         label: 'Asadero / pollo' },
      { id: 'cafeteria',       label: 'Café o repostería' },
      { id: 'mercado',         label: 'Mercado o fruver' },
      { id: 'farmacia',        label: 'Droguería' },
      { id: 'licores',         label: 'Licores' },
      { id: 'sexshop',         label: 'Sexshop' },
      { id: 'tienda',          label: 'Otra tienda' },
    ],
  },

  {
    id: 'volumen',
    titulo: '¿Cuántos pedidos manejas al día?',
    bajada: 'Más o menos. Es para saber qué tan grande armarte el tablero.',
    opciones: [
      { id: '0-10',   label: 'Menos de 10',  detalle: 'Voy arrancando', ms: 'eco', tono: 'bueno' },
      { id: '10-30',  label: 'Entre 10 y 30', detalle: 'Ya tengo movimiento', ms: 'trending_up', tono: 'bueno' },
      { id: '30-100', label: 'Entre 30 y 100', detalle: 'Día full', ms: 'local_fire_department', tono: 'ojo' },
      { id: 'mas100', label: 'Más de 100',   detalle: 'Esto no para', ms: 'rocket_launch', tono: 'ojo' },
    ],
  },

  {
    id: 'canal',
    titulo: '¿Por dónde te piden hoy?',
    bajada: 'Puedes marcar varias.',
    multiple: true,
    opciones: [
      { id: 'whatsapp',  label: 'WhatsApp',            ms: 'forum', tono: 'bueno' },
      { id: 'llamada',   label: 'Me llaman',           ms: 'call', tono: 'neutro' },
      { id: 'otra_app',  label: 'Otra app de domicilios', ms: 'smartphone', tono: 'frio' },
      { id: 'local',     label: 'Solo en el local',    ms: 'storefront', tono: 'neutro' },
      { id: 'redes',     label: 'Instagram o Facebook', ms: 'photo_camera', tono: 'frio' },
    ],
  },

  {
    id: 'reparto',
    titulo: '¿Quién lleva los pedidos?',
    bajada: 'Si no tienes, te conectamos con repartidores del puerto.',
    opciones: [
      { id: 'propios',  label: 'Tengo mis domiciliarios', detalle: 'Solo necesito organizarlos', ms: 'two_wheeler', tono: 'bueno' },
      { id: 'ninguno',  label: 'No tengo',                detalle: 'Quiero que ustedes lleven',  ms: 'handshake', tono: 'frio' },
      { id: 'mixto',    label: 'Tengo, pero no alcanzan', detalle: 'A veces necesito refuerzo',  ms: 'bolt', tono: 'ojo' },
      { id: 'recogen',  label: 'Me lo recogen',           detalle: 'No mando domicilios',        ms: 'directions_run', tono: 'neutro' },
    ],
  },

  {
    id: 'dolor',
    titulo: '¿Qué es lo que más te cuesta hoy?',
    bajada: 'Lo ponemos de primero en tu panel.',
    opciones: [
      { id: 'clientes',  label: 'Que me conozcan más',     detalle: 'Necesito más gente pidiendo', ms: 'visibility', tono: 'frio' },
      { id: 'orden',     label: 'Organizar los pedidos',   detalle: 'Se me enredan las comandas',  ms: 'view_kanban', tono: 'neutro' },
      { id: 'cobrar',    label: 'Cobrar y cuadrar caja',   detalle: 'No sé bien cuánto entra',     ms: 'payments', tono: 'bueno' },
      { id: 'entregas',  label: 'Que lleguen a tiempo',    detalle: 'Los domicilios se demoran',   ms: 'timer', tono: 'ojo' },
      { id: 'todo',      label: 'Todo un poco',            detalle: 'Vengo a ver qué me sirve',    ms: 'explore', tono: 'neutro' },
    ],
  },

  {
    id: 'cuando',
    titulo: '¿Cuándo quieres empezar a vender?',
    bajada: 'Sin compromiso. Es para saber si te ayudamos ya o te damos tiempo.',
    opciones: [
      { id: 'ya',       label: 'Ya mismo',        detalle: 'Quiero recibir pedidos hoy',   ms: 'bolt', tono: 'ojo' },
      { id: 'semana',   label: 'Esta semana',     detalle: 'Estoy alistando todo',          ms: 'event', tono: 'frio' },
      { id: 'mirando',  label: 'Estoy mirando',   detalle: 'Primero quiero entender bien',  ms: 'search', tono: 'neutro' },
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
      { id: 'moto',      label: 'Moto',      detalle: 'Lo más rápido en el puerto', ms: 'two_wheeler', tono: 'bueno' },
      { id: 'bicicleta', label: 'Bicicleta', detalle: 'Ideal para el centro',        ms: 'pedal_bike', tono: 'frio' },
      { id: 'carro',     label: 'Carro',     detalle: 'Pedidos grandes y mercados',  ms: 'directions_car', tono: 'neutro' },
      { id: 'pie',       label: 'A pie',     detalle: 'Entregas cerquita',           ms: 'directions_walk', tono: 'neutro' },
    ],
  },
  {
    id: 'horario',
    titulo: '¿Cuándo puedes trabajar?',
    bajada: 'Puedes marcar varias. Lo cambias cuando quieras.',
    multiple: true,
    opciones: [
      { id: 'manana', label: 'Mañanas',     detalle: '6 a. m. – 12 m.', ms: 'wb_twilight', tono: 'ojo' },
      { id: 'tarde',  label: 'Tardes',      detalle: '12 m. – 6 p. m.', ms: 'light_mode', tono: 'ojo' },
      { id: 'noche',  label: 'Noches',      detalle: '6 p. m. – 12 a. m.', ms: 'dark_mode', tono: 'frio' },
      { id: 'finde',  label: 'Fines de semana', detalle: 'Sábados y domingos', ms: 'celebration', tono: 'bueno' },
    ],
  },
  {
    id: 'dedicacion',
    titulo: '¿Cuánto tiempo le vas a meter?',
    opciones: [
      { id: 'completo', label: 'Todo el día',   detalle: 'Es mi trabajo principal', ms: 'schedule', tono: 'bueno' },
      { id: 'parcial',  label: 'Medio tiempo',  detalle: 'Unas horas al día',       ms: 'hourglass_top', tono: 'neutro' },
      { id: 'ratos',    label: 'Cuando pueda',  detalle: 'Para un extra',           ms: 'my_location', tono: 'frio' },
    ],
  },
  {
    id: 'experiencia',
    titulo: '¿Ya has repartido antes?',
    opciones: [
      { id: 'si_apps',  label: 'Sí, en otras apps', detalle: 'Ya sé cómo es',      ms: 'star', tono: 'ojo' },
      { id: 'si_local', label: 'Sí, para un negocio', detalle: 'Pero no en app',   ms: 'inventory_2', tono: 'neutro' },
      { id: 'no',       label: 'Es mi primera vez',  detalle: 'Te enseñamos',      ms: 'eco', tono: 'bueno' },
    ],
  },
];
