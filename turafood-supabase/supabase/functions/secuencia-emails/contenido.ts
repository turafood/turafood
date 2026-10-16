// ============================================================
// TURAFOOD — Contenido de la secuencia de correos (día 0 a día 3)
//
// Quien verifica su correo recibe, en orden:
//   paso 0 (al instante)  Bienvenida: la cuenta quedó lista
//   paso 1 (+1 día)       Un consejo para sacarle partido
//   paso 2 (+2 días)      Seguridad y ayuda (cómo entrar, a quién escribir)
//   paso 3 (+3 días)      Cierre: cuéntanos cómo te fue
//
// Reglas de copy:
//   · Nada de cifras, reseñas ni promesas que el producto no cumpla hoy.
//   · turafood.com NUNCA pide contraseña: la cuenta entra con un código al correo.
//   · Un solo llamado a la acción principal por correo.
//   · Cada correo dice en qué día de la secuencia va («Día 2 de 4») para que
//     el progreso se sienta y el cierre tenga sentido.
// ============================================================

import { T, esc, envoltura, encabezado, parrafo, boton, pasos, aviso, aire, banner, progreso } from '../_shared/correo-base.ts';

export type Rol = 'customer' | 'business';

export interface Contexto {
  nombre?: string | null;
  email: string;
  bajaUrl: string;
}

interface Correo { asunto: string; html: string; texto: string }

const SITIO = T.sitio;
const APP = 'https://app.turafood.com';
const TOTAL_DIAS = 4;

const saludo = (n?: string | null) => (n && n.trim() ? `Hola, ${esc(n.trim().split(/\s+/)[0])}` : 'Hola');

interface Datos {
  asunto: string;
  preheader: string;
  banner: string;
  dia: number;
  titulo: string;
  subtitulo: string;
  lista?: { icono: string; titulo: string; texto: string }[];
  cuerpo?: string;
  cta?: { texto: string; url: string };
  nota?: { icono: string; html: string };
  textoPlano: string;
}

function armar(ctx: Contexto, d: Datos): Correo {
  const filas =
    banner(d.banner, d.titulo) +
    progreso(d.dia, TOTAL_DIAS) +
    encabezado('', d.titulo, d.subtitulo) +
    (d.cuerpo ? parrafo(d.cuerpo) : '') +
    (d.lista ? pasos(d.lista) : '') +
    (d.cta ? boton(d.cta.texto, d.cta.url) : '') +
    (d.nota ? aviso(d.nota.icono, d.nota.html) : '') +
    aire;
  return {
    asunto: d.asunto,
    html: envoltura({ titulo: d.asunto, preheader: d.preheader, filas, bajaUrl: ctx.bajaUrl, destinatario: ctx.email }),
    texto: `${d.titulo}\n\n${d.textoPlano}\n\n${d.cta ? `${d.cta.texto}: ${d.cta.url}\n\n` : ''}¿Dudas? WhatsApp: https://wa.me/${T.soporteWa}\nDejar de recibir estos consejos: ${ctx.bajaUrl}\nTuraFood · Buenaventura, Colombia`,
  };
}

// ---------------------------------------------------------------- CLIENTES
function cliente(paso: number, ctx: Contexto): Correo | null {
  const banner = T.bannerCliente;
  switch (paso) {
    case 0:
      return armar(ctx, {
        asunto: '¡Listo! Tu cuenta de TuraFood está verificada',
        preheader: 'Ya puedes pedir en dos toques y seguir tu domicilio en vivo.',
        banner, dia: 0,
        titulo: `${saludo(ctx.nombre)}, tu cuenta está lista`,
        subtitulo: 'Tu correo quedó verificado. Desde ahora tu historial y tus direcciones te acompañan en cualquier celular.',
        lista: [
          { icono: '🍽️', titulo: 'Elige dónde pedir', texto: 'Negocios abiertos ahora en Buenaventura, con su carta y sus fotos.' },
          { icono: '🛵', titulo: 'Sigue tu domicilio en vivo', texto: 'Ves en el mapa dónde va tu repartidor y cuánto falta.' },
          { icono: '🧾', titulo: 'Recibo en tu correo', texto: 'Al entregarte, te llega el detalle de lo que pediste.' },
        ],
        cta: { texto: 'Ver negocios abiertos', url: SITIO },
        textoPlano: 'Verificaste tu correo y tu cuenta ya está lista. Elige dónde pedir, sigue tu domicilio en vivo y recibe tu recibo por correo.',
      });
    case 1:
      return armar(ctx, {
        asunto: 'Pide en dos toques: 3 trucos de TuraFood',
        preheader: 'Guarda tu dirección, activa los avisos y repite tu pedido en segundos.',
        banner, dia: 1,
        titulo: 'Pide más rápido',
        subtitulo: 'Tres detalles que hacen tus próximos pedidos mucho más cómodos.',
        lista: [
          { icono: '📍', titulo: 'Guarda tu dirección', texto: 'Márcala una vez en el mapa y queda lista para el próximo pedido.' },
          { icono: '🔔', titulo: 'Activa los avisos', texto: 'Te decimos cuando el negocio acepta tu pedido y cuando sale tu repartidor.' },
          { icono: '🕘', titulo: 'Tu historial, a la mano', texto: 'Vuelve al mismo negocio en un toque desde tu actividad.' },
        ],
        cta: { texto: 'Abrir TuraFood', url: SITIO },
        textoPlano: 'Guarda tu dirección, activa los avisos y revisa tu actividad para volver a tus negocios favoritos.',
      });
    case 2:
      return armar(ctx, {
        asunto: 'Entrar a tu cuenta, sin complicaciones',
        preheader: 'Cómo entrar desde cualquier celular y a quién escribir si algo sale mal.',
        banner, dia: 2,
        titulo: 'Tu cuenta, siempre contigo',
        subtitulo: 'Entras con un código que llega a tu correo en segundos. Sin contraseñas que recordar.',
        lista: [
          { icono: '✉️', titulo: 'Un código, sin contraseña', texto: 'Escribes tu correo y te llega un código de 6 dígitos. Vence en 10 minutos.' },
          { icono: '📱', titulo: 'Desde cualquier celular', texto: 'Tu historial y tus direcciones van contigo a donde entres.' },
          { icono: '💬', titulo: 'Ayuda por WhatsApp', texto: 'Si algo sale mal con un pedido, escríbenos y lo resolvemos.' },
        ],
        cta: { texto: 'Ir a mi cuenta', url: `${SITIO}/account` },
        nota: { icono: '🔒', html: '<strong style="color:' + T.tinta + ';">Nunca te pediremos tu código.</strong> Si alguien te lo pide haciéndose pasar por TuraFood, no lo compartas.' },
        textoPlano: 'Entras con un código que llega a tu correo. Nunca te pediremos tu código. Si algo sale mal con un pedido, escríbenos por WhatsApp.',
      });
    case 3:
      return armar(ctx, {
        asunto: '¿Cómo te fue con tu primer pedido?',
        preheader: 'Cuéntanos qué te gustó y qué mejorarías. Te leemos de verdad.',
        banner, dia: 3,
        titulo: 'Cuéntanos cómo te fue',
        subtitulo: 'TuraFood se construye con lo que nos dicen quienes piden. Tu opinión nos ayuda más de lo que crees.',
        cuerpo: 'Si ya hiciste un pedido, califícalo desde su seguimiento. Y si algo no salió bien, escríbenos por WhatsApp: te responde una persona.',
        cta: { texto: 'Escribirnos por WhatsApp', url: `https://wa.me/${T.soporteWa}?text=${encodeURIComponent('Hola TuraFood, quiero darles una opinión')}` },
        nota: { icono: '❤️', html: 'Gracias por pedir en tu puerto. <strong style="color:' + T.tinta + ';">Cada pedido ayuda a un negocio de Buenaventura.</strong>' },
        textoPlano: 'Califica tu pedido desde su seguimiento y, si algo no salió bien, escríbenos por WhatsApp.',
      });
  }
  return null;
}

// ---------------------------------------------------------------- NEGOCIOS
function negocio(paso: number, ctx: Contexto): Correo | null {
  const banner = T.bannerNegocio;
  switch (paso) {
    case 0:
      return armar(ctx, {
        asunto: 'Bienvenido a TuraFood: tu negocio ya tiene cuenta',
        preheader: 'Cuatro pasos para empezar a recibir pedidos.',
        banner, dia: 0,
        titulo: `${saludo(ctx.nombre)}, bienvenido`,
        subtitulo: 'Tu correo quedó verificado. Tu negocio ya existe en TuraFood: estos son los cuatro pasos para empezar a vender.',
        lista: [
          { icono: '🍔', titulo: '1 · Carga tu menú', texto: 'Productos con foto y precio. Es lo primero que ve tu cliente.' },
          { icono: '📍', titulo: '2 · Fija tu ubicación', texto: 'Para que tus clientes y tus repartidores lleguen sin perderse.' },
          { icono: '🛵', titulo: '3 · Suma a tus repartidores', texto: 'Comparte tu código de flota y reparten solo tus pedidos.' },
          { icono: '✅', titulo: '4 · Revisión y apertura', texto: 'Revisamos tus datos y, al aprobarlo, tu negocio aparece a los clientes.' },
        ],
        cta: { texto: 'Abrir mi panel', url: `${APP}/negocio` },
        textoPlano: 'Carga tu menú, fija tu ubicación, suma a tus repartidores y espera la revisión para abrir tu negocio.',
      });
    case 1:
      return armar(ctx, {
        asunto: 'Un menú con fotos vende más',
        preheader: 'Cómo dejar tu carta lista en 10 minutos.',
        banner, dia: 1,
        titulo: 'Tu carta, lista en 10 minutos',
        subtitulo: 'Tu cliente decide con los ojos. Estos consejos hacen que tu menú se vea profesional.',
        lista: [
          { icono: '📷', titulo: 'Foto cenital con luz natural', texto: 'Cerca de una ventana, sin flash y con el plato limpio.' },
          { icono: '🏷️', titulo: 'Nombres claros y precio final', texto: 'Lo que ve el cliente es lo que paga: sin sorpresas.' },
          { icono: '🗂️', titulo: 'Categorías cortas', texto: 'Platos fuertes, bebidas, adicionales. Menos es más.' },
        ],
        cta: { texto: 'Cargar mi menú', url: `${APP}/negocio/catalogo` },
        textoPlano: 'Usa fotos con luz natural, nombres claros, precio final y pocas categorías.',
      });
    case 2:
      return armar(ctx, {
        asunto: 'Tus repartidores, tus reglas',
        preheader: 'Comparte tu código de flota y reparten solo tus pedidos.',
        banner, dia: 2,
        titulo: 'Pon a tu gente a repartir',
        subtitulo: 'En TuraFood cada negocio tiene sus propios repartidores. Tú avalas a tu equipo.',
        lista: [
          { icono: '🔢', titulo: 'Tu código de flota', texto: 'Lo encuentras en Repartidores. Compártelo por WhatsApp con un toque.' },
          { icono: '🔒', titulo: 'Solo tus pedidos', texto: 'Tu repartidor ve y toma únicamente los pedidos de tu negocio.' },
          { icono: '👋', titulo: 'Quitar es fácil', texto: 'Si alguien deja de trabajar contigo, lo sacas de tu flota en un toque.' },
        ],
        cta: { texto: 'Invitar repartidores', url: `${APP}/negocio/repartidores` },
        textoPlano: 'Comparte tu código de flota desde Repartidores. Tu repartidor solo ve los pedidos de tu negocio.',
      });
    case 3:
      return armar(ctx, {
        asunto: 'Último paso: fija tu ubicación y abre tu negocio',
        preheader: 'Para que te encuentren y te lleguen pedidos.',
        banner, dia: 3,
        titulo: 'Casi listo para vender',
        subtitulo: 'Dos detalles y tu negocio queda completo para recibir pedidos.',
        lista: [
          { icono: '📍', titulo: 'Ubicación en el mapa', texto: 'Tus clientes ven tu local en el seguimiento de su pedido.' },
          { icono: '💳', titulo: 'Tus datos de cobro', texto: 'Para que tus ventas lleguen a donde debes recibirlas.' },
        ],
        cta: { texto: 'Completar mi negocio', url: `${APP}/negocio/sucursales` },
        nota: { icono: '💬', html: 'Si necesitas una mano, escríbenos por WhatsApp. <strong style="color:' + T.tinta + ';">Te acompañamos en tu primer pedido.</strong>' },
        textoPlano: 'Fija tu ubicación y completa tus datos de cobro para abrir tu negocio.',
      });
  }
  return null;
}

export function construirPaso(paso: number, rol: Rol, ctx: Contexto): Correo | null {
  return rol === 'business' ? negocio(paso, ctx) : cliente(paso, ctx);
}
