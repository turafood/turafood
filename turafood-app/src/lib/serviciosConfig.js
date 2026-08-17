'use client';

/**
 * GROWTH PARTNER — DEFINICIÓN DE LOS SERVICIOS
 *
 * Dos familias:
 *   · Google Growth AI — Perfil de Negocio y campañas
 *   · Tura AI — agente de voz y reservas
 *
 * Las preguntas de cada asistente salen de lo que Google y el proveedor
 * de telefonía piden de verdad para montar el servicio. Si un campo no
 * sirve para el trabajo real, sobra.
 *
 * El plan aparece AL FINAL, nunca al principio. Primero la persona arma
 * lo suyo y ve qué va a recibir; recién ahí se habla de plata. Es la
 * misma lógica de Google Ads: configuras la campaña y el presupuesto es
 * el último paso.
 */

export const GMB = {
  kind: 'gmb',
  family: 'google',
  title: 'Perfil de Negocio de Google',
  short: 'Perfil de Google',
  icon: 'travel_explore',
  accent: '#2E6BFF',
  tint: '#EAF1FF',
  blurb: 'Aparece en Google Maps y en las búsquedas de tu zona.',
  intro: {
    body: 'Cuando alguien busca "restaurantes cerca de mí" en Buenaventura, salen las fichas de Google. Aparecer arriba no es suerte: Google premia las fichas completas y activas. La reclamamos, la llenamos entera y la mantenemos moviéndose.',
    bullets: [
      'Ficha reclamada y verificada a tu nombre',
      'Menú con fotos de tus platos dentro de Google',
      'Botones de pedir a domicilio y para llevar',
      'Publicaciones semanales, que es lo que Google premia',
      'Respondemos las opiniones de Google por ti',
      'Reporte de en qué puesto sales y por cuáles búsquedas',
    ],
    cta: 'Reclamar mi ficha',
    eta: '3 a 5 días hábiles',
  },
  defaults: { categories: [], attributes: [], ordering: [], content: [] },
  steps: [
    {
      id: 'negocio', short: 'Negocio', title: 'Reclama tu negocio',
      sub: 'El nombre y la categoría son lo que más pesa para salir en las búsquedas de tu zona.',
      fields: [
        { key: 'name', label: 'Nombre en Google', type: 'text', required: true, placeholder: 'Asadero El Puerto', hint: 'Igual al del letrero. Google penaliza nombres inflados como "el mejor de Buenaventura".' },
        {
          key: 'primary_category', label: 'Categoría principal', type: 'chips', required: true,
          options: [
            { value: 'restaurant', label: 'Restaurante', icon: 'restaurant' },
            { value: 'fast_food', label: 'Comida rápida', icon: 'lunch_dining' },
            { value: 'seafood', label: 'Mariscos', icon: 'set_meal' },
            { value: 'bakery', label: 'Panadería', icon: 'bakery_dining' },
            { value: 'coffee', label: 'Cafetería', icon: 'coffee' },
            { value: 'pharmacy', label: 'Farmacia', icon: 'local_pharmacy' },
            { value: 'grocery', label: 'Minimercado', icon: 'local_grocery_store' },
            { value: 'liquor', label: 'Licorera', icon: 'liquor' },
          ],
          hint: 'Solo una. Es la que decide en qué búsquedas compites.',
        },
        {
          key: 'categories', label: 'Categorías secundarias', type: 'multi', required: false,
          options: [
            { value: 'delivery', label: 'Servicio a domicilio' },
            { value: 'takeaway', label: 'Comida para llevar' },
            { value: 'dine_in', label: 'Restaurante para comer' },
            { value: 'catering', label: 'Servicio de catering' },
            { value: 'breakfast', label: 'Desayunos' },
            { value: 'events', label: 'Salón de eventos' },
          ],
          hint: 'Suman búsquedas, pero no diluyas: tres bien elegidas rinden más que ocho.',
        },
        { key: 'description', label: 'Descripción del negocio', type: 'textarea', required: true, rows: 4, placeholder: 'Asadero con 12 años en el Centro de Buenaventura. Picadas, carnes a la parrilla y comida del Pacífico. Domicilios en toda la isla.', hint: 'Hasta 750 caracteres. Google no la usa para posicionar, pero es lo primero que lee un cliente.' },
        { key: 'opened_year', label: 'Desde qué año abriste', type: 'text', required: false, placeholder: '2014', hint: 'Google lo muestra y da confianza a quien no te conoce.' },
      ],
    },
    {
      id: 'esencial', short: 'Información', title: 'Destaca la información esencial',
      sub: 'Horarios, contacto y formas de comprar. Es lo que más consulta la gente antes de decidir.',
      fields: [
        { key: 'address', label: 'Dirección exacta', type: 'text', required: true, placeholder: 'Cra. 3 # 4-58, Centro, Buenaventura' },
        { key: 'landmark', label: 'Punto de referencia', type: 'text', required: false, placeholder: 'Frente al parque, al lado de la droguería' },
        { key: 'phone', label: 'Teléfono público', type: 'tel', required: true, placeholder: '+57 320 000 0000', hint: 'El que suena cuando alguien toca "Llamar" desde Google.' },
        {
          key: 'ordering', label: 'Formas de comprar', type: 'multi', required: true,
          options: [
            { value: 'dine_in', label: 'Consumo en el lugar', icon: 'restaurant' },
            { value: 'takeout', label: 'Para llevar', icon: 'takeout_dining' },
            { value: 'delivery', label: 'Entrega a domicilio', icon: 'two_wheeler' },
            { value: 'curbside', label: 'Retiro en la puerta', icon: 'directions_car' },
          ],
          hint: 'Google las muestra como palomitas verdes en la ficha. Es de lo primero que la gente mira.',
        },
        {
          key: 'attributes', label: 'Atributos del local', type: 'multi', required: false,
          options: [
            { value: 'wifi', label: 'Wi-Fi gratis' },
            { value: 'parking', label: 'Parqueadero' },
            { value: 'accessible', label: 'Acceso para silla de ruedas' },
            { value: 'family', label: 'Apto para niños' },
            { value: 'groups', label: 'Recibe grupos' },
            { value: 'cards', label: 'Recibe tarjeta' },
            { value: 'outdoor', label: 'Mesas al aire libre' },
            { value: 'air', label: 'Aire acondicionado' },
          ],
        },
        {
          key: 'keywords', label: 'Por qué búsquedas quieres aparecer', type: 'textarea', required: true, rows: 3,
          placeholder: 'asadero buenaventura, picadas a domicilio, carne asada centro, comida del pacífico',
          hint: 'Con esto trabajamos categorías y publicaciones para posicionarte.',
        },
      ],
    },
    {
      id: 'contenido', short: 'Contenido', title: 'Muestra lo mejor de tu negocio',
      sub: 'Menú, fotos y reservas. Las fichas con menú y fotos reciben muchas más visitas que las que solo tienen dirección.',
      fields: [
        {
          key: 'content', label: 'Qué quieres que publiquemos en tu ficha', type: 'multi', required: true,
          options: [
            { value: 'menu', label: 'Menú completo con precios', icon: 'restaurant_menu' },
            { value: 'dishes', label: 'Fotos de tus platos estrella', icon: 'photo_camera' },
            { value: 'place', label: 'Fotos del local y el equipo', icon: 'storefront' },
            { value: 'posts', label: 'Publicaciones de novedades', icon: 'campaign' },
            { value: 'offers', label: 'Ofertas y promociones', icon: 'local_activity' },
            { value: 'booking', label: 'Reserva con Google', icon: 'event_available' },
          ],
          hint: 'El menú lo tomamos de tu catálogo de TuraFood: no tienes que escribirlo otra vez.',
        },
        { key: 'star_dishes', label: 'Cuáles son tus platos estrella', type: 'textarea', required: true, rows: 3, placeholder: 'Picada Pacífico para 2, costilla BBQ, encocado de jaiba', hint: 'Esos van de primeros en la ficha, con foto.' },
        {
          key: 'order_link', label: 'A dónde mandamos a quien quiera pedir', type: 'chips', required: true,
          options: [
            { value: 'turafood', label: 'Mi página de TuraFood' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'phone', label: 'Llamada' },
            { value: 'own', label: 'Mi propio sitio' },
          ],
          hint: 'Google pone el botón "Pedir a domicilio" apuntando ahí.',
        },
      ],
    },
    {
      id: 'verificacion', short: 'Verificación', title: 'Para que Google te dé el control',
      sub: 'Google manda un código para confirmar que el negocio es tuyo. Sin eso nadie puede administrar la ficha.',
      fields: [
        { key: 'owner_name', label: 'Nombre de quien recibe el código', type: 'text', required: true, placeholder: 'Como aparece en la cédula' },
        { key: 'owner_email', label: 'Correo de Google del dueño', type: 'text', required: true, placeholder: 'tucorreo@gmail.com', hint: 'La ficha queda a nombre de esta cuenta, no de la nuestra. Si algún día te vas, te la llevas.' },
        {
          key: 'existing', label: 'Ya existe una ficha de tu negocio en Google', type: 'chips', required: true,
          options: [
            { value: 'no', label: 'No existe' },
            { value: 'yes_mine', label: 'Sí, y la manejo yo' },
            { value: 'yes_other', label: 'Sí, pero no tengo acceso' },
            { value: 'unknown', label: 'No sé' },
          ],
          hint: 'Si ya existe la reclamamos en vez de crear otra: dos fichas del mismo negocio se pelean y ninguna sube.',
        },
      ],
    },
  ],
  plans: [
    {
      id: 'setup', name: 'Montaje', price: 149000, period: 'pago único',
      summary: 'Ficha reclamada, verificada y completa. De ahí en adelante la manejas tú.',
      includes: ['Reclamo y verificación', 'Categorías y atributos completos', 'Menú y fotos cargadas', 'Capacitación de 30 minutos'],
    },
    {
      id: 'managed', name: 'Ficha gestionada', price: 89000, period: 'al mes', recommended: true,
      summary: 'Montaje incluido y la mantenemos activa: Google premia las fichas que se mueven.',
      includes: ['Todo lo del montaje', '4 publicaciones al mes', 'Respuesta a las opiniones', 'Menú sincronizado con TuraFood', 'Reporte de posiciones mensual'],
    },
  ],
};

export const GOOGLE_ADS = {
  kind: 'google_ads',
  family: 'google',
  title: 'Google Ads',
  short: 'Campañas',
  icon: 'campaign',
  accent: '#0B8E54',
  tint: '#E6F6EE',
  blurb: 'Sé encontrado justo cuando buscan lo que vendes.',
  intro: {
    body: 'Google Ads te pone arriba de los resultados cuando alguien en Buenaventura busca lo que tú vendes. Nosotros armamos las campañas, escribimos los anuncios y las vigilamos; tú pones el presupuesto y decides cuándo parar.',
    bullets: [
      'Búsqueda, Maps, Display, Video y Máximo rendimiento',
      'Solo se muestra a gente de Buenaventura y alrededores',
      'Pagas por clic, no por aparecer',
      'Reporte de cuánto se gastó y qué entró',
      'Sin permanencia: la pausas cuando quieras',
    ],
    cta: 'Armar mis campañas',
    eta: '5 a 7 días hábiles',
  },
  defaults: { objective: 'orders', formats: [], schedule: 'open_hours' },
  steps: [
    {
      id: 'objetivo', short: 'Objetivo', title: '¿Qué quieres que pase?',
      sub: 'De esto depende cómo se arma todo lo demás: el tipo de campaña, la puja y el anuncio.',
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
          key: 'formats', label: 'Tipos de campaña', type: 'multi', required: true,
          options: [
            { value: 'search', label: 'Búsqueda', icon: 'search' },
            { value: 'maps', label: 'Maps y locales', icon: 'map' },
            { value: 'pmax', label: 'Máximo rendimiento', icon: 'auto_awesome' },
            { value: 'display', label: 'Display', icon: 'ad_units' },
            { value: 'video', label: 'Video en YouTube', icon: 'smart_display' },
            { value: 'shopping', label: 'Shopping', icon: 'shopping_bag' },
          ],
          hint: 'Búsqueda es lo que mejor rinde para pedidos. Máximo rendimiento aprende solo, pero necesita más presupuesto para arrancar.',
        },
        { key: 'star_products', label: '¿Qué quieres promocionar?', type: 'textarea', required: true, rows: 3, placeholder: 'La picada para 2, las costillas BBQ y el arroz atollado.', hint: 'Los platos que más margen te dejan o los que quieres mover.' },
        { key: 'competitors', label: '¿Con quién compites?', type: 'text', required: false, placeholder: 'Los asaderos del Centro y las hamburgueserías del Malecón', hint: 'Sirve para no pujar donde ya perdimos y buscar el hueco.' },
      ],
    },
    {
      id: 'publico', short: 'Público', title: '¿A quién le quieres hablar?',
      sub: 'Mostrar el anuncio a todo el mundo es la forma más rápida de gastar el presupuesto sin vender.',
      fields: [
        {
          key: 'radius', label: '¿Hasta dónde entregas?', type: 'chips', required: true,
          options: [
            { value: '3', label: 'Centro, 3 km' },
            { value: '6', label: 'Isla completa, 6 km' },
            { value: '12', label: 'Isla y continente, 12 km' },
            { value: 'city', label: 'Todo Buenaventura' },
          ],
          hint: 'No pujamos fuera de donde llegas: un clic de alguien a quien no le entregas es plata botada.',
        },
        {
          key: 'schedule', label: '¿En qué horario se muestra?', type: 'chips', required: true,
          options: [
            { value: 'always', label: 'Todo el día' },
            { value: 'meals', label: 'Horas de comida' },
            { value: 'nights', label: 'Noches y fines de semana' },
            { value: 'open_hours', label: 'Solo cuando estoy abierto' },
          ],
          hint: 'Mostrar anuncios con el local cerrado gasta plata sin traer pedidos.',
        },
        { key: 'audience', label: '¿Cómo es tu cliente típico?', type: 'textarea', required: false, rows: 3, placeholder: 'Familias que piden los domingos y oficinistas del Centro entre semana al mediodía.' },
      ],
    },
    {
      id: 'mensaje', short: 'Anuncio', title: 'Qué va a decir tu anuncio',
      sub: 'Escríbelo como se lo dirías a un cliente. Nosotros lo ajustamos a los títulos y descripciones de Google.',
      fields: [
        { key: 'promise', label: '¿Por qué deberían elegirte a ti?', type: 'textarea', required: true, rows: 3, placeholder: 'Somos el único asadero del Centro que entrega en menos de 30 minutos y la picada alcanza para tres.' },
        { key: 'offer', label: '¿Tienes una promoción para el anuncio?', type: 'text', required: false, placeholder: 'Envío gratis en pedidos desde $50.000' },
        { key: 'avoid', label: '¿Algo que NO quieras que digamos?', type: 'text', required: false, placeholder: 'No mencionar precios exactos' },
        {
          key: 'landing', label: '¿A dónde llega quien haga clic?', type: 'chips', required: true,
          options: [
            { value: 'turafood', label: 'Mi página de TuraFood' },
            { value: 'gmb', label: 'Mi ficha de Google' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'call', label: 'Llamada directa' },
          ],
          hint: 'Si llega a un lugar donde no puede pedir de una, el clic se pierde.',
        },
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
  planNote: 'Esto es lo que cobramos por armarlas y vigilarlas. Lo que inviertes en Google se paga aparte y directo a Google, con tu propia tarjeta: la cuenta queda a tu nombre y ves cada peso.',
  plans: [
    {
      id: 'arranque', name: 'Arranque', price: 190000, period: 'al mes',
      summary: 'Una campaña de búsqueda bien armada, revisada cada semana.',
      includes: ['1 campaña de búsqueda', 'Hasta 15 palabras clave', 'Revisión semanal', 'Reporte mensual'],
      suggested: 'Recomendado con $300.000 – $500.000 de inversión',
    },
    {
      id: 'crecimiento', name: 'Crecimiento', price: 340000, period: 'al mes', recommended: true,
      summary: 'Búsqueda y Maps, con pruebas de anuncios para bajar el costo por pedido.',
      includes: ['Hasta 3 campañas', 'Búsqueda + Maps', 'Pruebas A/B de anuncios', 'Reporte cada 15 días'],
      suggested: 'Recomendado con $600.000 – $1.500.000 de inversión',
    },
    {
      id: 'full', name: 'Máximo rendimiento', price: 590000, period: 'al mes',
      summary: 'Toda la suite: búsqueda, Maps, Display, video y remarketing.',
      includes: ['Campañas sin límite', 'Máximo rendimiento y video', 'Remarketing a quien ya te visitó', 'Reporte semanal y llamada mensual'],
      suggested: 'Recomendado desde $1.500.000 de inversión',
    },
  ],
};

export const VOICE_AGENT = {
  kind: 'voice_agent',
  family: 'tura',
  title: 'Agente de voz IA',
  short: 'Agente de voz',
  icon: 'support_agent',
  accent: '#6B2FD6',
  tint: '#F3ECFF',
  blurb: 'Una línea que contesta sola, toma pedidos y avisa a la cocina.',
  intro: {
    body: 'Te damos una línea atendida por un agente de voz. Contesta siempre, toma el pedido hablando normal, lo deja en tu tablero de comandas y llama al cliente para confirmar. Tú defines cómo suena y qué puede hacer.',
    bullets: [
      'Contesta al primer timbre, aunque estés en hora pico',
      'El pedido entra directo a tu tablero de comandas',
      'Llama o escribe para confirmar y avisar demoras',
      'Ninguna llamada perdida es un pedido perdido',
    ],
    cta: 'Configurar mi agente',
    eta: '7 a 10 días hábiles',
  },
  defaults: { tasks: [], voice: 'calida', reminders: [] },
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
          options: [{ value: 'tu', label: 'De tú' }, { value: 'usted', label: 'De usted' }],
        },
      ],
    },
    {
      id: 'tareas', short: 'Tareas', title: '¿Qué quieres que haga?',
      sub: 'Empieza con poco. Es más fácil corregir un agente que hace tres cosas bien que uno que hace diez a medias.',
      fields: [
        {
          key: 'tasks', label: 'Tareas del agente', type: 'multi', required: true,
          options: [
            { value: 'take_orders', label: 'Tomar pedidos por teléfono', icon: 'receipt_long' },
            { value: 'confirm', label: 'Llamar para confirmar el pedido', icon: 'call' },
            { value: 'delay', label: 'Avisar cuando se demora', icon: 'schedule' },
            { value: 'menu', label: 'Responder menú y precios', icon: 'restaurant_menu' },
            { value: 'hours', label: 'Decir horarios y dirección', icon: 'storefront' },
            { value: 'kitchen', label: 'Cantar comandas a la cocina', icon: 'soup_kitchen' },
          ],
        },
        {
          key: 'reminders', label: 'Recordatorios automáticos', type: 'multi', required: false,
          options: [
            { value: 'order_ready', label: 'Tu pedido está listo', icon: 'notifications_active' },
            { value: 'courier_out', label: 'El repartidor salió', icon: 'two_wheeler' },
            { value: 'win_back', label: 'Hace rato no pides', icon: 'redeem' },
            { value: 'promo', label: 'Aviso de promoción nueva', icon: 'local_activity' },
          ],
          hint: 'Salen por WhatsApp o por llamada, según lo que elijas después con nosotros.',
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
        { key: 'never_say', label: '¿Qué NO debe hacer nunca?', type: 'textarea', required: false, rows: 3, placeholder: 'No prometer entregas en menos de 30 minutos. No dar descuentos.' },
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
        { key: 'current_line', label: 'Tu número actual', type: 'tel', required: false, placeholder: '+57 320 000 0000' },
        {
          key: 'coverage', label: '¿En qué horario contesta?', type: 'chips', required: true,
          options: [
            { value: 'always', label: '24 horas' },
            { value: 'open_hours', label: 'Mi horario de atención' },
            { value: 'peak', label: 'Solo en hora pico' },
            { value: 'after_hours', label: 'Solo cuando está cerrado' },
          ],
        },
        { key: 'volume', label: '¿Cuántas llamadas recibes al día?', type: 'text', required: true, placeholder: 'Unas 40, casi todas entre 7 y 9 de la noche', hint: 'Nos dice qué capacidad montar y en qué plan cabes.' },
      ],
    },
  ],
  planNote: 'Los minutos de llamada van incluidos hasta el tope de cada plan. Si te pasas, te avisamos antes de cobrar nada extra.',
  plans: [
    {
      id: 'linea', name: 'Línea básica', price: 149000, period: 'al mes',
      summary: 'Contesta, informa y toma el dato. Ideal para no perder llamadas.',
      includes: ['300 minutos al mes', 'Menú, horarios y dirección', 'Toma de datos y devolución', '1 voz y 1 idioma'],
    },
    {
      id: 'pedidos', name: 'Toma pedidos', price: 290000, period: 'al mes', recommended: true,
      summary: 'Además toma el pedido completo y lo deja en tu tablero de comandas.',
      includes: ['800 minutos al mes', 'Pedido directo al tablero', 'Llamada de confirmación', 'Recordatorios por WhatsApp'],
    },
    {
      id: 'operacion', name: 'Operación completa', price: 490000, period: 'al mes',
      summary: 'El agente también canta comandas y maneja los recordatorios de tu día.',
      includes: ['2.000 minutos al mes', 'Comandas por voz a cocina', 'Todos los recordatorios', 'Ajustes ilimitados del guion'],
    },
  ],
};

export const BOOKING = {
  kind: 'booking',
  family: 'tura',
  title: 'Reservas con recordatorio',
  short: 'Reservas',
  icon: 'event_available',
  accent: '#E2360F',
  tint: '#FFF1EC',
  blurb: 'Que reserven solos y no se te caiga la mesa.',
  intro: {
    body: 'Un enlace donde tus clientes reservan mesa sin llamarte, y un recordatorio automático antes de la hora. La mesa que no avisa que no viene es plata perdida: el recordatorio es lo que la recupera.',
    bullets: [
      'Reservan desde tu ficha de Google, WhatsApp o TuraFood',
      'Recordatorio automático horas antes',
      'Confirman o cancelan con un toque',
      'Ves la ocupación del día de un vistazo',
    ],
    cta: 'Configurar mis reservas',
    eta: '4 a 6 días hábiles',
  },
  defaults: { channels: [], reminders: [] },
  steps: [
    {
      id: 'capacidad', short: 'Capacidad', title: '¿Cuánta gente puedes recibir?',
      sub: 'Con esto armamos los cupos para que no te sobrevendas.',
      fields: [
        { key: 'tables', label: '¿Cuántas mesas tienes?', type: 'text', required: true, placeholder: '12 mesas' },
        { key: 'capacity', label: '¿Cuántas personas caben en total?', type: 'text', required: true, placeholder: '48 personas' },
        {
          key: 'turn_time', label: '¿Cuánto dura una mesa en promedio?', type: 'chips', required: true,
          options: [
            { value: '45', label: '45 minutos' },
            { value: '60', label: '1 hora' },
            { value: '90', label: '1 hora y media' },
            { value: '120', label: '2 horas' },
          ],
          hint: 'Define cada cuánto se libera un cupo.',
        },
        { key: 'peak', label: '¿Cuáles son tus horas llenas?', type: 'text', required: true, placeholder: 'Viernes y sábados de 7 a 10 de la noche' },
      ],
    },
    {
      id: 'reglas', short: 'Reglas', title: 'Tus reglas de reserva',
      sub: 'Lo que el sistema va a hacer cumplir sin que tengas que discutirlo.',
      fields: [
        {
          key: 'notice', label: '¿Con cuánta anticipación se reserva?', type: 'chips', required: true,
          options: [
            { value: '1h', label: 'Mínimo 1 hora antes' },
            { value: '3h', label: 'Mínimo 3 horas antes' },
            { value: '1d', label: 'Un día antes' },
          ],
        },
        {
          key: 'channels', label: '¿Por dónde quieres recibir reservas?', type: 'multi', required: true,
          options: [
            { value: 'google', label: 'Reserva con Google', icon: 'travel_explore' },
            { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
            { value: 'turafood', label: 'Tu página de TuraFood', icon: 'storefront' },
            { value: 'instagram', label: 'Instagram', icon: 'photo_camera' },
          ],
          hint: 'Con la ficha de Google activa, la gente reserva desde el buscador sin entrar a ningún lado.',
        },
        {
          key: 'reminders', label: '¿Cuándo recordamos la reserva?', type: 'multi', required: true,
          options: [
            { value: '24h', label: 'Un día antes' },
            { value: '3h', label: '3 horas antes' },
            { value: '1h', label: '1 hora antes' },
          ],
          hint: 'Dos recordatorios bajan las mesas perdidas más que uno solo.',
        },
        {
          key: 'deposit', label: '¿Pides algo para separar?', type: 'chips', required: true,
          options: [
            { value: 'none', label: 'No, solo el dato' },
            { value: 'card', label: 'Tarjeta como garantía' },
            { value: 'deposit', label: 'Abono por adelantado' },
          ],
        },
      ],
    },
  ],
  plans: [
    {
      id: 'reservas', name: 'Reservas', price: 89000, period: 'al mes',
      summary: 'Enlace de reservas, cupos automáticos y recordatorios.',
      includes: ['Reservas sin límite', 'Recordatorio por WhatsApp', 'Panel de ocupación del día', 'Confirmar o cancelar con un toque'],
    },
    {
      id: 'reservas_voz', name: 'Reservas + voz', price: 219000, period: 'al mes', recommended: true,
      summary: 'Además el agente de voz toma reservas por teléfono.',
      includes: ['Todo lo anterior', 'Reservas por llamada', 'Recordatorio por llamada', 'Lista de espera automática'],
    },
  ],
};

export const SERVICES = [GMB, GOOGLE_ADS, VOICE_AGENT, BOOKING];

/** Las dos familias del módulo */
export const FAMILIES = {
  google: {
    id: 'google',
    name: 'Google Growth AI',
    tagline: 'Que Google te encuentre y te recomiende',
    accent: '#2E6BFF',
    tint: '#EAF1FF',
    icon: 'travel_explore',
  },
  tura: {
    id: 'tura',
    name: 'Tura AI',
    tagline: 'Que nada se te caiga cuando no alcanzas',
    accent: '#6B2FD6',
    tint: '#F3ECFF',
    icon: 'smart_toy',
  },
};

/** Los formatos de campaña, para la sección de Google */
export const AD_FORMATS = [
  { id: 'search', label: 'Campañas de Búsqueda', icon: 'search', body: 'Sales de primero cuando alguien escribe "asadero cerca de mí". Es lo que más rinde para pedidos: la persona ya está buscando comprar.' },
  { id: 'maps', label: 'Campañas locales y Maps', icon: 'map', body: 'Tu negocio destacado dentro de Google Maps cuando alguien mira restaurantes de la zona. Sirve para llenar el local, no solo para domicilios.' },
  { id: 'pmax', label: 'Máximo rendimiento', icon: 'auto_awesome', body: 'Google reparte tu presupuesto solo entre Búsqueda, Maps, YouTube y Gmail buscando el mejor resultado. Aprende con el tiempo, así que necesita algo de rodaje.' },
  { id: 'display', label: 'Campañas de Display', icon: 'ad_units', body: 'Banners en páginas y apps. Sirve para que te conozcan y para volver a aparecerle a quien ya te visitó.' },
  { id: 'video', label: 'Campañas de Video', icon: 'smart_display', body: 'Anuncios en YouTube. Es lo mejor para mostrar cómo se ve tu comida, aunque vende menos directo que la búsqueda.' },
];

/** El pack: todo junto, más barato que la suma */
export const BUNDLE = {
  id: 'growth_pack',
  name: 'Growth Partner completo',
  price: 690000,
  period: 'al mes',
  saving: 'Ahorras cerca de $250.000 al mes frente a contratarlos por separado',
  includes: [
    'Perfil de Google gestionado',
    'Google Ads plan Crecimiento',
    'Agente de voz que toma pedidos',
    'Reservas con recordatorios',
    'Una llamada de estrategia al mes',
  ],
};

/** Servicios sin asistente todavía: se piden hablando */
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

export const SLUG = {
  gmb: 'google-negocio',
  google_ads: 'google-ads',
  voice_agent: 'agente-voz',
  booking: 'reservas',
};
