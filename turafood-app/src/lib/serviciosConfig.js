'use client';

/**
 * DEFINICIÓN DE LOS ASISTENTES DE SERVICIOS
 *
 * Cada servicio dice qué preguntar y en qué orden. Las preguntas están
 * escogidas para que el equipo de TuraFood pueda montar el servicio sin
 * tener que volver a llamar al negocio: cada campo existe porque hace
 * falta para el trabajo real, no para llenar pantalla.
 */

export const GMB = {
  kind: 'gmb',
  title: 'Ficha de Google',
  short: 'Ficha de Google',
  icon: 'travel_explore',
  accent: '#2E6BFF',
  tint: '#EAF1FF',
  blurb: 'Aparece en Google Maps y en las búsquedas de tu zona.',
  intro: {
    body: 'Cuando alguien busca "restaurantes cerca de mí" en Buenaventura, aparecen las fichas de Google. Si no tienes una, no estás en esa lista. La armamos con tus datos, tus fotos y tus horarios.',
    bullets: [
      'Sales en Google Maps con tu dirección y tu teléfono',
      'Las reseñas de Google suman a tu reputación',
      'La gente puede llamarte o pedir cómo llegar desde el buscador',
      'Publicamos fotos y horarios reales, no genéricos',
    ],
    cta: 'Empezar mi ficha',
    eta: '3 a 5 días hábiles',
  },
  defaults: { categories: [] },
  steps: [
    {
      id: 'negocio', short: 'Negocio', title: '¿Cómo se llama y a qué se dedica?',
      sub: 'Google muestra este nombre tal cual. Usa el mismo del letrero de tu local.',
      fields: [
        { key: 'name', label: 'Nombre en Google', type: 'text', required: true, placeholder: 'Asadero El Puerto', hint: 'Sin agregar palabras de más: Google penaliza nombres inflados como "Asadero El Puerto - El mejor de Buenaventura".' },
        {
          key: 'primary_category', label: 'Categoría principal', type: 'chips', required: true,
          options: [
            { value: 'restaurant', label: 'Restaurante', icon: 'restaurant' },
            { value: 'fast_food', label: 'Comida rápida', icon: 'lunch_dining' },
            { value: 'seafood', label: 'Mariscos', icon: 'set_meal' },
            { value: 'bakery', label: 'Panadería', icon: 'bakery_dining' },
            { value: 'pharmacy', label: 'Farmacia', icon: 'local_pharmacy' },
            { value: 'grocery', label: 'Minimercado', icon: 'local_grocery_store' },
            { value: 'liquor', label: 'Licorera', icon: 'liquor' },
          ],
          hint: 'Es la que más pesa para aparecer en las búsquedas.',
        },
        {
          key: 'categories', label: 'Categorías adicionales', type: 'multi', required: false,
          options: [
            { value: 'delivery', label: 'Domicilios' },
            { value: 'takeaway', label: 'Para llevar' },
            { value: 'dine_in', label: 'Comer en el local' },
            { value: 'catering', label: 'Catering y eventos' },
            { value: 'breakfast', label: 'Desayunos' },
            { value: 'wifi', label: 'Wi-Fi gratis' },
          ],
        },
        { key: 'description', label: 'Descripción del negocio', type: 'textarea', required: true, rows: 4, placeholder: 'Asadero con 12 años en el Centro de Buenaventura. Picadas, carnes a la parrilla y comida del Pacífico. Atendemos a domicilio y en el local.', hint: 'Hasta 750 caracteres. Cuenta qué vendes y qué te hace distinto, sin promesas ni superlativos.' },
      ],
    },
    {
      id: 'contacto', short: 'Contacto', title: 'Cómo te encuentran y te contactan',
      sub: 'Estos datos tienen que coincidir con los de tu local. Google los verifica.',
      fields: [
        { key: 'address', label: 'Dirección exacta', type: 'text', required: true, placeholder: 'Cra. 3 # 4-58, Centro, Buenaventura' },
        { key: 'landmark', label: 'Punto de referencia', type: 'text', required: false, placeholder: 'Frente al parque, al lado de la droguería' },
        { key: 'phone', label: 'Teléfono público', type: 'tel', required: true, placeholder: '+57 320 000 0000', hint: 'El que quieres que suene cuando alguien llame desde Google.' },
        { key: 'website', label: 'Sitio web', type: 'text', required: false, placeholder: 'Si no tienes, ponemos tu página de TuraFood' },
        {
          key: 'service_area', label: '¿Atiendes solo en el local o también a domicilio?',
          type: 'chips', required: true,
          options: [
            { value: 'local', label: 'Solo en el local' },
            { value: 'both', label: 'Local y domicilio' },
            { value: 'delivery_only', label: 'Solo domicilio' },
          ],
        },
      ],
    },
    {
      id: 'verificacion', short: 'Verificación', title: 'Para que Google te dé el control',
      sub: 'Google manda un código para confirmar que el negocio es tuyo. Necesitamos saber a dónde llega y quién lo recibe.',
      fields: [
        { key: 'owner_name', label: 'Nombre de quien recibe el código', type: 'text', required: true, placeholder: 'Como aparece en la cédula' },
        { key: 'owner_email', label: 'Correo de Google del dueño', type: 'text', required: true, placeholder: 'tucorreo@gmail.com', hint: 'La ficha queda a nombre de esta cuenta. Si no tienes, creamos una contigo.' },
        {
          key: 'existing', label: '¿Ya existe una ficha de tu negocio en Google?',
          type: 'chips', required: true,
          options: [
            { value: 'no', label: 'No existe' },
            { value: 'yes_mine', label: 'Sí, y la manejo yo' },
            { value: 'yes_other', label: 'Sí, pero no tengo acceso' },
            { value: 'unknown', label: 'No sé' },
          ],
          hint: 'Si ya existe, la reclamamos en vez de crear una nueva: dos fichas del mismo negocio se pelean entre sí.',
        },
        { key: 'notes', label: 'Algo más que debamos saber', type: 'textarea', required: false, rows: 3, placeholder: 'Cambiamos de dirección el año pasado, la ficha vieja tiene la anterior.' },
      ],
    },
  ],
};

export const GOOGLE_ADS = {
  kind: 'google_ads',
  title: 'Campañas en Google',
  short: 'Google Ads',
  icon: 'campaign',
  accent: '#0B8E54',
  tint: '#E6F6EE',
  blurb: 'Aparece de primero cuando alguien busca lo que vendes.',
  intro: {
    body: 'Le pagas a Google para salir arriba de los resultados cuando alguien en Buenaventura busca lo que tú vendes. Nosotros armamos la campaña, escribimos los anuncios y la vigilamos; tú pones el presupuesto y decides cuándo parar.',
    bullets: [
      'Solo se muestra a gente de Buenaventura y alrededores',
      'Pagas por clic, no por aparecer',
      'Te decimos cada semana cuánto se gastó y qué entró',
      'Puedes pausarla cuando quieras, sin permanencia',
    ],
    cta: 'Armar mi campaña',
    eta: '5 a 7 días hábiles',
  },
  defaults: { objective: 'orders', formats: [] },
  steps: [
    {
      id: 'objetivo', short: 'Objetivo', title: '¿Qué quieres que pase?',
      sub: 'De esto depende cómo se arma todo lo demás.',
      fields: [
        {
          key: 'objective', label: 'Objetivo de la campaña', type: 'chips', required: true,
          options: [
            { value: 'orders', label: 'Más pedidos a domicilio', icon: 'two_wheeler' },
            { value: 'visits', label: 'Más gente en el local', icon: 'storefront' },
            { value: 'calls', label: 'Más llamadas', icon: 'call' },
            { value: 'awareness', label: 'Que me conozcan', icon: 'visibility' },
          ],
        },
        {
          key: 'formats', label: '¿Dónde quieres aparecer?', type: 'multi', required: true,
          options: [
            { value: 'search', label: 'Búsqueda de Google', icon: 'search' },
            { value: 'maps', label: 'Google Maps', icon: 'map' },
            { value: 'youtube', label: 'Video en YouTube', icon: 'smart_display' },
            { value: 'display', label: 'Banners en páginas', icon: 'ad_units' },
          ],
          hint: 'Búsqueda es lo que mejor funciona para pedidos. El video sirve para que te conozcan, pero rinde menos en ventas directas.',
        },
        { key: 'star_products', label: '¿Qué quieres promocionar?', type: 'textarea', required: true, rows: 3, placeholder: 'La picada para 2, las costillas BBQ y el arroz atollado.', hint: 'Los platos que más margen te dejan o los que quieres mover.' },
      ],
    },
    {
      id: 'presupuesto', short: 'Presupuesto', title: '¿Cuánto quieres invertir?',
      sub: 'Google cobra por clic. Con poco presupuesto se puede empezar y subir después si funciona.',
      fields: [
        {
          key: 'monthly_budget', label: 'Presupuesto mensual', type: 'chips', required: true,
          options: [
            { value: '200k', label: '$200.000' },
            { value: '400k', label: '$400.000' },
            { value: '800k', label: '$800.000' },
            { value: '1.5m', label: '$1.500.000' },
            { value: 'other', label: 'Otro monto' },
          ],
          hint: 'En Buenaventura, con $400.000 al mes se ve movimiento real en búsquedas de comida.',
        },
        { key: 'budget_note', label: 'Si elegiste "otro monto", ¿cuánto?', type: 'text', required: false, placeholder: '$600.000 al mes' },
        {
          key: 'schedule', label: '¿En qué horario quieres que se muestre?', type: 'chips', required: true,
          options: [
            { value: 'always', label: 'Todo el día' },
            { value: 'meals', label: 'Horas de comida' },
            { value: 'nights', label: 'Noches y fines de semana' },
            { value: 'open_hours', label: 'Solo cuando estoy abierto' },
          ],
          hint: 'Mostrar anuncios con el local cerrado gasta plata sin traer pedidos.',
        },
      ],
    },
    {
      id: 'mensaje', short: 'Mensaje', title: 'Qué va a decir tu anuncio',
      sub: 'Escríbelo como se lo dirías a un cliente. Nosotros lo ajustamos al formato de Google.',
      fields: [
        { key: 'promise', label: '¿Por qué deberían elegirte a ti?', type: 'textarea', required: true, rows: 3, placeholder: 'Somos el único asadero del Centro que entrega en menos de 30 minutos y la picada alcanza para tres.' },
        { key: 'offer', label: '¿Tienes una promoción para el anuncio?', type: 'text', required: false, placeholder: 'Envío gratis en pedidos desde $50.000' },
        { key: 'avoid', label: '¿Algo que NO quieras que digamos?', type: 'text', required: false, placeholder: 'No mencionar precios exactos' },
        {
          key: 'has_video', label: '¿Tienes video para YouTube?', type: 'chips', required: true,
          options: [
            { value: 'yes', label: 'Sí, ya tengo' },
            { value: 'no', label: 'No, pero quiero' },
            { value: 'skip', label: 'No me interesa video' },
          ],
        },
      ],
    },
  ],
};

export const VOICE_AGENT = {
  kind: 'voice_agent',
  title: 'Agente de voz',
  short: 'Agente de voz',
  icon: 'support_agent',
  accent: '#6B2FD6',
  tint: '#F3ECFF',
  blurb: 'Una línea que contesta sola, toma pedidos y avisa a la cocina.',
  intro: {
    body: 'Te damos una línea telefónica atendida por un agente de voz. Contesta siempre, toma el pedido hablando normal, lo deja en tu tablero de comandas y puede llamar al cliente para confirmar. Tú defines cómo suena y qué puede hacer.',
    bullets: [
      'Contesta al primer timbre, aunque estés en hora pico',
      'El pedido entra directo a tu tablero de comandas',
      'Llama o escribe al cliente para confirmar y avisar demoras',
      'Nunca deja una llamada sin atender ni pierde un pedido',
    ],
    cta: 'Configurar mi agente',
    eta: '7 a 10 días hábiles',
  },
  defaults: { tasks: [], voice: 'calida' },
  steps: [
    {
      id: 'voz', short: 'Voz', title: '¿Cómo quieres que suene?',
      sub: 'Escucha las opciones y elige la que se parezca a como atiende tu gente.',
      fields: [
        {
          key: 'voice', label: 'Voz del agente', type: 'voice', required: true,
          options: [
            { value: 'calida', label: 'Cálida', avatar: '🌴', tint: '#FFF1EC', description: 'Cercana y tranquila, como quien atiende en el barrio.', rate: 0.95, pitch: 1.05 },
            { value: 'agil', label: 'Ágil', avatar: '⚡', tint: '#FFF7E6', description: 'Rápida y directa, ideal para hora pico.', rate: 1.15, pitch: 1 },
            { value: 'formal', label: 'Formal', avatar: '🎩', tint: '#EAF1FF', description: 'Seria y clara, para negocios más institucionales.', rate: 1, pitch: 0.92 },
            { value: 'joven', label: 'Juvenil', avatar: '🎧', tint: '#F3ECFF', description: 'Fresca y alegre, buena para comida rápida.', rate: 1.08, pitch: 1.15 },
          ],
        },
        { key: 'agent_name', label: '¿Cómo se presenta?', type: 'text', required: true, placeholder: 'Hola, soy Tura, del Asadero El Puerto', hint: 'Es la primera frase de cada llamada.' },
        {
          key: 'tone', label: 'Trato al cliente', type: 'chips', required: true,
          options: [
            { value: 'tu', label: 'De tú' },
            { value: 'usted', label: 'De usted' },
          ],
        },
      ],
    },
    {
      id: 'tareas', short: 'Tareas', title: '¿Qué quieres que haga?',
      sub: 'Empieza con poco y vamos sumando. Es más fácil corregir un agente que hace tres cosas bien que uno que hace diez a medias.',
      fields: [
        {
          key: 'tasks', label: 'Tareas del agente', type: 'multi', required: true,
          options: [
            { value: 'take_orders', label: 'Tomar pedidos por teléfono', icon: 'receipt_long' },
            { value: 'confirm', label: 'Llamar al cliente para confirmar', icon: 'call' },
            { value: 'delay', label: 'Avisar cuando el pedido se demora', icon: 'schedule' },
            { value: 'menu', label: 'Responder qué hay en el menú y precios', icon: 'restaurant_menu' },
            { value: 'hours', label: 'Decir horarios y dirección', icon: 'storefront' },
            { value: 'reservations', label: 'Tomar reservas de mesa', icon: 'event_seat' },
          ],
        },
        {
          key: 'handoff', label: '¿Qué hace si no sabe responder?', type: 'chips', required: true,
          options: [
            { value: 'transfer', label: 'Pasar la llamada a mi celular' },
            { value: 'callback', label: 'Tomar el dato y que yo devuelva' },
            { value: 'whatsapp', label: 'Mandarme un WhatsApp' },
          ],
          hint: 'Un agente que se queda callado cuando no entiende pierde el pedido.',
        },
        { key: 'never_say', label: '¿Qué NO debe hacer nunca?', type: 'textarea', required: false, rows: 3, placeholder: 'No prometer tiempos de entrega menores a 30 minutos. No dar descuentos.' },
      ],
    },
    {
      id: 'linea', short: 'Línea', title: 'La línea y los horarios',
      sub: 'Te damos un número nuevo, o usamos el que ya tienes publicado.',
      fields: [
        {
          key: 'line_type', label: '¿Qué número quieres usar?', type: 'chips', required: true,
          options: [
            { value: 'new', label: 'Uno nuevo que me den' },
            { value: 'existing', label: 'El que ya tengo publicado' },
            { value: 'overflow', label: 'Que conteste solo si no alcanzo' },
          ],
        },
        { key: 'current_line', label: 'Tu número actual', type: 'tel', required: false, placeholder: '+57 320 000 0000', hint: 'Solo si quieres que el agente conteste en él o cuando tú no alcances.' },
        {
          key: 'coverage', label: '¿En qué horario contesta?', type: 'chips', required: true,
          options: [
            { value: 'always', label: '24 horas' },
            { value: 'open_hours', label: 'Mi horario de atención' },
            { value: 'peak', label: 'Solo en hora pico' },
            { value: 'after_hours', label: 'Solo cuando está cerrado' },
          ],
        },
        { key: 'volume', label: '¿Cuántas llamadas recibes al día?', type: 'text', required: true, placeholder: 'Unas 40, casi todas entre 7 y 9 de la noche', hint: 'Nos dice qué capacidad montar.' },
      ],
    },
  ],
};

export const SERVICES = [GMB, GOOGLE_ADS, VOICE_AGENT];

/** Servicios que todavía no tienen asistente y se piden por contacto */
export const EXTRA_SERVICES = [
  {
    id: 'website',
    title: 'Sitio web propio',
    icon: 'language',
    accent: '#E2360F',
    tint: '#FFF1EC',
    blurb: 'Tu carta, tu marca y tu dominio, con los pedidos entrando a TuraFood.',
  },
  {
    id: 'custom_app',
    title: 'App a la medida',
    icon: 'phone_iphone',
    accent: '#A8730B',
    tint: '#FFF7E6',
    blurb: 'Una app con tu nombre para tus clientes frecuentes.',
  },
  {
    id: 'ai_custom',
    title: 'Agente de IA a la medida',
    icon: 'smart_toy',
    accent: '#2E6BFF',
    tint: '#EAF1FF',
    blurb: 'Automatiza inventario, respuestas de redes o lo que necesites.',
  },
];
