'use client';

/**
 * TEXTOS DE LA INTERFAZ
 *
 * Cubre el armazón del panel: menú, títulos de sección y controles de
 * la barra superior. El contenido de cada pantalla sigue en español y
 * se irá pasando de a poco; mientras tanto `t()` devuelve el español
 * cuando falta la traducción, para que nunca aparezca una clave suelta.
 *
 * La app es de Buenaventura, así que el idioma por defecto es español;
 * el inglés está para quien llega de afuera.
 */

const DICT = {
  es: {},   // el español vive en el propio texto de las claves

  en: {
    // Menú
    'Resumen': 'Overview',
    'Pedidos en vivo': 'Live orders',
    'Historial': 'History',
    'Menú y productos': 'Menu & products',
    'Promociones': 'Promotions',
    'Reseñas': 'Reviews',
    'Horarios': 'Hours',
    'Sucursales': 'Locations',
    'Reportes': 'Reports',
    'Liquidaciones': 'Payouts',
    'Verificación': 'Verification',
    'Equipo y ajustes': 'Team & settings',
    'Cómo te pagan': 'How you get paid',
    'Mi plata': 'My money',
    'Menú y productos': 'Menu & products',
    'Growth Partner': 'Growth Partner',
    'Tura Business Suite': 'Tura Business Suite',
    'Redes Sociales AI': 'Social Media AI',
    'Google Ads AI': 'Google Ads AI',
    'Historial de pedidos': 'Order history',

    // Grupos del menú. Los de arriba quedaron de la agrupación
    // anterior; se dejan porque traducir de más no rompe nada y
    // ahorra un error si alguna pantalla vieja todavía los usa.
    'PRINCIPAL': 'MAIN',
    'CATÁLOGO': 'CATALOG',
    'CLIENTES': 'CUSTOMERS',
    'OPERACIÓN': 'OPERATIONS',
    'FINANZAS': 'FINANCE',
    'CUENTA': 'ACCOUNT',
    'DÍA A DÍA': 'EVERY DAY',
    'MI NEGOCIO': 'MY BUSINESS',
    'LA PLATA': 'MONEY',
    'CRECER': 'GROW',

    // Barra superior
    'Tienda abierta': 'Store open',
    'Tienda cerrada': 'Store closed',
    'Nuevo producto': 'New product',
    'Administrador': 'Administrator',
    'Cerrar sesión': 'Sign out',
    'Abrir menú': 'Open menu',
    'Recoger menú': 'Collapse menu',
    'Expandir menú': 'Expand menu',
    'Cambiar a tema oscuro': 'Switch to dark theme',
    'Cambiar a tema claro': 'Switch to light theme',
    'Cambiar idioma': 'Change language',

    // Títulos de sección
    'Resumen de hoy': "Today's overview",
    'Historial de pedidos': 'Order history',
    'Promociones y cupones': 'Promotions & coupons',
    'Horarios y disponibilidad': 'Hours & availability',
    'Reportes de ventas': 'Sales reports',
    'Pagos y liquidaciones': 'Payments & payouts',
    'Reseñas de clientes': 'Customer reviews',
    'Equipo y cuenta': 'Team & account',
    'Verificación de tu negocio': 'Business verification',

    'Se actualiza automáticamente': 'Updates automatically',
    'Todos los pedidos de esta sucursal': 'All orders from this location',
    'Precios, disponibilidad y fotos': 'Prices, availability and photos',
    'Lo que ven tus clientes en la app': 'What your customers see in the app',
    'Cuándo puede pedirte un cliente': 'When customers can order from you',
    'Tus puntos en Buenaventura': 'Your locations in Buenaventura',
    'Los últimos 7 días': 'Last 7 days',
    'Consignaciones semanales, todos los viernes': 'Weekly payouts, every Friday',
    'Lo que opinan de tu comida y tu servicio': 'What people think of your food and service',
    'Roles, verificación y plan': 'Roles, verification and plan',
    'Lo que necesitamos para aprobarte': 'What we need to approve you',
  },
};

/** Traduce si hay traducción; si no, deja el español */
export function translate(lang, text) {
  if (lang === 'es') return text;
  return DICT[lang]?.[text] ?? text;
}

/** Devuelve un traductor ya atado al idioma */
export const makeT = (lang) => (text) => translate(lang, text);
