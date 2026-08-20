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
    titulo: '¿Qué tipo de negocio tienes?',
    bajada: 'Adaptaremos las herramientas a tu medida.',
    columnas: 1,
    opciones: [
      { id: 'comidas',  label: 'Comidas y Restaurantes', detalle: 'Platos listos, dark kitchens y antojos', ms: 'restaurant' },
      { id: 'mercado',  label: 'Supermercados y Tiendas',detalle: 'Víveres, abarrotes y compras del día', ms: 'storefront' },
      { id: 'express',  label: 'Entregas Express',       detalle: 'Licores, farmacia o pedidos rápidos', ms: 'bolt' },
    ],
  },
  {
    id: 'dolor',
    titulo: '¿Cuál es tu mayor reto ahora?',
    bajada: 'Nos enfocaremos en resolver esto primero.',
    opciones: [
      { id: 'ventas',    label: 'Multiplicar mis ventas',    detalle: 'Quiero atraer más clientes todos los días', ms: 'trending_up', tono: 'bueno' },
      { id: 'entregas',  label: 'Mejorar los domicilios',    detalle: 'Entregas rápidas y sin dolores de cabeza', ms: 'local_shipping', tono: 'ojo' },
      { id: 'control',   label: 'Automatizar mi negocio',    detalle: 'Digitalizar menú, pedidos y cuadrar caja', ms: 'query_stats', tono: 'frio' },
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
      { id: 'moto',      label: 'Moto',                 detalle: 'Lo más rápido. Más pedidos, más plata.', ms: 'two_wheeler', tono: 'bueno' },
      { id: 'bici_pie',  label: 'Bicicleta o a pie',    detalle: 'Ideal para el centro y distancias cortas.', ms: 'pedal_bike', tono: 'frio' },
      { id: 'carro',     label: 'Carro',                detalle: 'Para pedidos grandes y mercados pesados.',  ms: 'directions_car', tono: 'neutro' },
    ],
  },
  {
    id: 'horario',
    titulo: '¿Cuándo prefieres hacer plata?',
    bajada: 'Puedes marcar varias. Lo cambias cuando quieras.',
    multiple: true,
    opciones: [
      { id: 'dia',    label: 'De día',           detalle: 'Mañanas y tardes de almuerzos', ms: 'light_mode', tono: 'ojo' },
      { id: 'noche',  label: 'De noche',         detalle: 'El boom de cenas y antojos', ms: 'dark_mode', tono: 'frio' },
      { id: 'finde',  label: 'Fines de semana',  detalle: 'Sábados y domingos a tope', ms: 'celebration', tono: 'bueno' },
    ],
  },
  {
    id: 'experiencia',
    titulo: '¿Ya has repartido con apps?',
    bajada: 'Para saber cómo ayudarte a arrancar.',
    opciones: [
      { id: 'si_apps',  label: 'Sí, ya sé la movida',  detalle: 'Quiero empezar a facturar de una',      ms: 'star', tono: 'ojo' },
      { id: 'no',       label: 'Es mi primera vez',    detalle: 'Tranquilo, nosotros te enseñamos',      ms: 'eco', tono: 'bueno' },
    ],
  },
];
