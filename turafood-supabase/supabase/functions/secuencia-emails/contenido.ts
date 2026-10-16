// ============================================================
// TURAFOOD — Contenido de la secuencia de correos (día 0 a día 3)
//
// Quien verifica su correo recibe, en orden:
//   paso 0 (al instante)  Bienvenida: la cuenta quedó lista
//   paso 1 (+1 día)       Un consejo para sacarle partido
//   paso 2 (+2 días)      Otro consejo (seguridad / flota)
//   paso 3 (+3 días)      Cierre: cuéntanos cómo te fue
//
// Todo lo que dicen es verificable en el producto de hoy: nada de cifras,
// reseñas ni promesas inventadas. Hay una versión para clientes y otra para
// negocios. Estos son correos de bienvenida y uso de la cuenta, con enlace
// para dejar de recibirlos.
// ============================================================

import { T, esc, envoltura, encabezado, parrafo, boton, pasos, aviso, aire } from '../_shared/correo-base.ts';

export type Rol = 'customer' | 'business';

export interface Contexto {
  nombre?: string | null;
  email: string;
  bajaUrl: string;
}

interface Correo { asunto: string; html: string; texto: string }

const SITIO = T.sitio;
const APP = 'https://app.turafood.com';

const saludo = (n?: string | null) => (n && n.trim() ? `Hola, ${esc(n.trim().split(/\s+/)[0])}` : 'Hola');

function armar(ctx: Contexto, d: {
  asunto: string; preheader: string; icono: string; titulo: string; subtitulo: string;
  lista?: { icono: string; titulo: string; texto: string }[]; cuerpo?: string;
  cta?: { texto: string; url: string }; nota?: { icono: string; html: string }; texto: string;
}): Correo {
  const filas =
    encabezado(d.icono, d.titulo, d.subtitulo) +
    (d.cuerpo ? parrafo(d.cuerpo) : '') +
    (d.lista ? pasos(d.lista) : '') +
    (d.cta ? boton(d.cta.texto, d.cta.url) : '') +
    (d.nota ? aviso(d.nota.icono, d.nota.html) : '') +
    aire;
  return {
    asunto: d.asunto,
    html: envoltura({ titulo: d.asunto, preheader: d.preheader, filas, bajaUrl: ctx.bajaUrl, destinatario: ctx.email }),
    texto: `${d.titulo}\n\n${d.texto}\n\n${d.cta ? `${d.cta.texto}: ${d.cta.url}\n\n` : ''}¿Dudas? WhatsApp: https://wa.me/${T.soporteWa}\nDejar de recibir estos consejos: ${ctx.bajaUrl}\nTuraFood · Buenaventura, Colombia`,
  };
}

// ---------------------------------------------------------------- CLIENTES
function cliente(paso: number, ctx: Contexto): Correo | null {
  switch (paso) {
    case 0:
      return armar(ctx, {
        asunto: '¡Listo! Tu cuenta de TuraFood está verificada',
        preheader: 'Ya puedes pedir en dos toques y seguir tu domicilio en vivo.',
        icono: '🎉', titulo: `${saludo(ctx.nombre)}, tu cuenta está lista`,
        subtitulo: 'Verificaste tu correo. Desde ahora tu historial y tus direcciones te acompañan en cualquier celular.',
        lista: [
          { icono: '🍽️', titulo: 'Elige dónde pedir', texto: 'Restaurantes abiertos ahora en Buenaventura, con su carta y sus fotos.' },
          { icono: '🛵', titulo: 'Sigue tu domicilio en vivo', texto: 'Ves en el mapa dónde va tu repartidor y cuánto falta.' },
          { icono: '🧾', titulo: 'Recibo en tu correo', texto: 'Al entregarte, te llega el detalle de lo que pediste.' },
        ],
        cta: { texto: 'Ver restaurantes abiertos', url: SITIO },
        texto: 'Verificaste tu correo y tu cuenta de TuraFood ya está lista.\nElige dónde pedir, sigue tu domicilio en vivo y recibe tu recibo por correo.',
      });
    case 1:
      return armar(ctx, {
        asunto: 'Pide más rápido: 3 trucos de TuraFood',
        preheader: 'Guarda tu dirección, activa los avisos y repite tu pedido en segundos.',
        icono: '⚡', titulo: 'Pide en dos toques',
        subtitulo: 'Tres detalles que hacen tus próximos pedidos mucho más rápidos.',
        lista: [
          { icono: '📍', titulo: 'Guarda tu dirección', texto: 'Márcala una vez en el mapa y queda lista para la próxima.' },
          { icono: '🔔', titulo: 'Activa los avisos', texto: 'Te decimos cuando el negocio acepta tu pedido y cuando sale tu repartidor.' },
          { icono: '🕘', titulo: 'Tu historial, a la mano', texto: 'Revisa tus pedidos anteriores y vuelve al mismo negocio en un toque.' },
        ],
        cta: { texto: 'Abrir TuraFood', url: SITIO },
        texto: 'Guarda tu dirección, activa los avisos y consulta tu historial para volver a tus negocios favoritos.',
      });
    case 2:
      return armar(ctx, {
        asunto: 'Tu cuenta, a tu manera',
        preheader: 'Crea una contraseña si quieres y mira cómo cuidamos tus datos.',
        icono: '🔐', titulo: 'Entra como más te guste',
        subtitulo: 'Tu cuenta funciona con un código al correo. Si prefieres, también puedes crear una contraseña.',
        lista: [
          { icono: '🔑', titulo: 'Contraseña opcional', texto: 'En Cuenta → Contraseña. Con ella entras sin esperar el código.' },
          { icono: '📨', titulo: 'Solo lo importante', texto: 'Te escribimos por tu pedido y por tu cuenta; los consejos puedes pausarlos cuando quieras.' },
          { icono: '💬', titulo: 'Soporte por WhatsApp', texto: 'Si algo sale mal con un pedido, escríbenos y lo resolvemos.' },
        ],
        cta: { texto: 'Ir a mi cuenta', url: `${SITIO}/account` },
        texto: 'Puedes crear una contraseña desde Cuenta → Contraseña. Si algo sale mal con un pedido, escríbenos por WhatsApp.',
      });
    case 3:
      return armar(ctx, {
        asunto: '¿Cómo te va con TuraFood?',
        preheader: 'Cuéntanos qué te gustó y qué mejorarías. Te leemos de verdad.',
        icono: '💬', titulo: 'Cuéntanos cómo te fue',
        subtitulo: 'TuraFood se construye con lo que nos dicen quienes piden. Tu opinión nos ayuda más de lo que crees.',
        cuerpo: 'Si ya hiciste un pedido, califica tu experiencia desde el seguimiento. Y si algo no salió bien, escríbenos por WhatsApp: respondemos personas, no robots.',
        cta: { texto: 'Escribirnos por WhatsApp', url: `https://wa.me/${T.soporteWa}?text=${encodeURIComponent('Hola TuraFood, quiero darles una opinión')}` },
        nota: { icono: '❤️', html: 'Gracias por pedir en tu puerto. <strong style="color:' + T.tinta + ';">Cada pedido ayuda a un negocio de Buenaventura.</strong>' },
        texto: 'Califica tu experiencia desde el seguimiento y, si algo no salió bien, escríbenos por WhatsApp.',
      });
  }
  return null;
}

// ---------------------------------------------------------------- NEGOCIOS
function negocio(paso: number, ctx: Contexto): Correo | null {
  switch (paso) {
    case 0:
      return armar(ctx, {
        asunto: 'Tu negocio ya tiene cuenta en TuraFood',
        preheader: 'Cuatro pasos para empezar a recibir pedidos.',
        icono: '🏪', titulo: `${saludo(ctx.nombre)}, bienvenido`,
        subtitulo: 'Tu correo quedó verificado. Estos son los pasos para empezar a recibir pedidos.',
        lista: [
          { icono: '🍔', titulo: '1 · Carga tu menú', texto: 'Productos con foto y precio. Es lo primero que ve tu cliente.' },
          { icono: '📍', titulo: '2 · Fija tu ubicación', texto: 'Para que tus clientes y tus repartidores lleguen sin perderse.' },
          { icono: '🛵', titulo: '3 · Suma a tus repartidores', texto: 'Comparte tu código de flota y reparten solo tus pedidos.' },
          { icono: '✅', titulo: '4 · Verifica y abre', texto: 'Completa tu verificación y abre tu negocio al público.' },
        ],
        cta: { texto: 'Abrir mi panel', url: `${APP}/negocio` },
        texto: 'Carga tu menú, fija tu ubicación, suma a tus repartidores y abre tu negocio.',
      });
    case 1:
      return armar(ctx, {
        asunto: 'Un menú con fotos vende más',
        preheader: 'Cómo dejar tu carta lista en 10 minutos.',
        icono: '📸', titulo: 'Tu carta, lista en 10 minutos',
        subtitulo: 'Tu cliente decide con los ojos. Estos consejos hacen que tu menú se vea profesional.',
        lista: [
          { icono: '📷', titulo: 'Foto cenital con luz natural', texto: 'Cerca de una ventana, sin flash y con el plato limpio.' },
          { icono: '🏷️', titulo: 'Nombres claros y precio final', texto: 'Lo que ves es lo que cobras: sin sorpresas en el pedido.' },
          { icono: '🗂️', titulo: 'Categorías cortas', texto: 'Platos fuertes, bebidas, adicionales. Menos es más.' },
        ],
        cta: { texto: 'Cargar mi menú', url: `${APP}/negocio/catalogo` },
        texto: 'Usa fotos con luz natural, nombres claros, precio final y pocas categorías.',
      });
    case 2:
      return armar(ctx, {
        asunto: 'Tus repartidores, tus reglas',
        preheader: 'Comparte tu código de flota y reparten solo tus pedidos.',
        icono: '🛵', titulo: 'Pon a tu gente a repartir',
        subtitulo: 'En TuraFood cada negocio tiene sus propios repartidores. Sin papeleo: tú avalas a tu equipo.',
        lista: [
          { icono: '🔢', titulo: 'Tu código de flota', texto: 'Lo ves en Mis repartidores. Compártelo por WhatsApp con un toque.' },
          { icono: '🔒', titulo: 'Solo tus pedidos', texto: 'Tu repartidor ve y toma únicamente los pedidos de tu negocio.' },
          { icono: '👋', titulo: 'Quitar es fácil', texto: 'Si alguien deja de trabajar contigo, lo sacas de tu flota en un toque.' },
        ],
        cta: { texto: 'Invitar repartidores', url: `${APP}/negocio/repartidores` },
        texto: 'Comparte tu código de flota desde Mis repartidores. Tu repartidor solo ve los pedidos de tu negocio.',
      });
    case 3:
      return armar(ctx, {
        asunto: 'Último paso: fija tu ubicación y abre tu negocio',
        preheader: 'Para que te encuentren y te lleguen pedidos.',
        icono: '🚀', titulo: 'Casi listo para vender',
        subtitulo: 'Dos detalles y tu negocio queda completo.',
        lista: [
          { icono: '📍', titulo: 'Ubicación en el mapa', texto: 'Tus clientes ven tu local en el seguimiento de su pedido.' },
          { icono: '💳', titulo: 'Tus datos de cobro', texto: 'Para que tus ventas lleguen a donde debes recibirlas.' },
        ],
        cta: { texto: 'Completar mi negocio', url: `${APP}/negocio/sucursales` },
        nota: { icono: '💬', html: 'Si necesitas una mano, escríbenos por WhatsApp. <strong style="color:' + T.tinta + ';">Te acompañamos en tu primer pedido.</strong>' },
        texto: 'Fija tu ubicación y completa tus datos de cobro para abrir tu negocio.',
      });
  }
  return null;
}

export function construirPaso(paso: number, rol: Rol, ctx: Contexto): Correo | null {
  return rol === 'business' ? negocio(paso, ctx) : cliente(paso, ctx);
}
