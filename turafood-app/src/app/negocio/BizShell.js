'use client';

/**
 * ARMAZÓN DEL PANEL DE NEGOCIOS
 * Conversión de `isApp` (línea 156) del mockup de Negocios: barra
 * lateral, barra superior con el interruptor de tienda abierta, menú
 * inferior en celular, botón de Tura IA y avisos.
 *
 * Vive en el layout, así que no se vuelve a montar al cambiar de
 * sección: navegar se siente instantáneo, no como recargar la página.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import {
  getMyBusiness, getLiveOrders, getReviews, setStoreOpen, subscribeToOrders, columnOf,
} from '@/lib/negocio';
import { useRail, useTheme, useLang, TEMA_INFO } from '@/lib/prefs';
import { makeT } from '@/lib/i18n';
import { BizContext } from './BizContext';
import TuraIA from './TuraIA';
import { useDialogOpen } from '@/lib/useDialogOpen';
import ProgresoCuenta from '../components/ProgresoCuenta';
import Recorrido from '../components/Recorrido';
import { PASOS_NEGOCIO } from '../components/recorridos';
import LocalMini from '../components/LocalMini';

/** Títulos de cada sección — PAGES del mockup */
const PAGES = {
  '/negocio': ['Panel General', 'Métricas y resumen operativo de hoy'],
  '/negocio/pedidos': ['Pedidos en Vivo', 'Se actualiza automáticamente en tiempo real'],
  '/negocio/catalogo': ['Menú + Productos', 'Precios, disponibilidad, stock y fotos'],
  '/negocio/kit': ['Kit Turafood · Ultra Suite', 'Voz IA 24/7 + SMS + WhatsApp + Email + Google My Business'],
  '/negocio/agente-ia': ['Agente IA Recepcionista', 'Centro de mando AI - Recepción de pedidos y reservas'],
  '/negocio/redes/inbox': ['SMS + WhatsApp + Email', 'Bandeja omnicanal de marketing y fidelización'],
  '/negocio/email-mkt': ['Email Marketing', 'Campañas y automatizaciones de correo'],
  '/negocio/suite': ['Tura Business Suite', 'Todo lo que hace crecer tu negocio, en un solo lugar'],
  '/negocio/crecimiento/google-negocio': ['Negocios Locales', 'Para que te encuentren en Maps y en el buscador'],
  '/negocio/repartidores': ['Radar en Vivo', 'Sincronización de tu flota con la app'],
  '/negocio/turbo': ['Tura Turbo ⚡', 'Entregas ultra-rápidas en menos de 15 minutos con promesa garantizada'],
  '/negocio/repartidores/ajustes': ['Motor de Despacho', 'Reglas de auto-asignación y rastreo'],
  '/negocio/repartidores/liquidacion': ['Finanzas y Pagos', 'Métricas y pagos a tus domiciliarios'],
  '/negocio/pagos': ['Métodos de Pago', 'Los medios que aceptas y que ven tus clientes'],
  '/negocio/horarios': ['Horarios', 'Cuándo puede pedirte un cliente'],
  '/negocio/promociones': ['Promociones', 'Lo que ven tus clientes en la app'],
  '/negocio/resenas': ['Reseñas', 'Lo que opinan de tu comida y tu servicio'],
  '/negocio/sucursales': ['Sucursales', 'Tus puntos en Buenaventura'],
  '/negocio/historial': ['Historial de Pedidos', 'Todos los pedidos de esta sucursal'],
  '/negocio/reportes': ['Reportes', 'Los últimos 7 días y análisis financiero'],
  '/negocio/afiliados': ['Afiliados & Wallet', 'Invita a otros negocios y gana comisiones recurrentes y créditos'],
  '/negocio/verificacion': ['Verificación', 'Lo que necesitamos para aprobarte'],
  '/negocio/soporte': ['Soporte', 'Estamos del otro lado'],
  '/negocio/conocimiento': ['Documentación Tfood', 'Base de conocimiento, tutoriales y guías'],
  '/negocio/roles': ['Roles y Permisos', 'Control de acceso para cocina, caja, administración y domiciliarios'],
  '/negocio/seguridad': ['Seguridad y Clave', 'Cambio de contraseña, sesiones activas y autenticación segura'],
  '/negocio/equipo': ['Equipo y Ajustes', 'Roles, verificación y plan'],
  '/negocio/crecimiento': ['Growth Partner', 'La app es gratis. Esto es lo que puedes alquilar para crecer'],
  '/negocio/redes': ['Redes Sociales AI', 'Tus cuentas, tus posts y tu bandeja'],
  '/negocio/redes/crear': ['Crear Publicación', 'Míralo antes de publicarlo'],
  '/negocio/crecimiento/google': ['Google Ads AI', 'Tu ficha, tus campañas y YouTube en un solo lugar'],
  '/negocio/crecimiento/google-ads': ['Campañas en Google', 'Aparece de primero cuando busquen lo que vendes'],
  '/negocio/crecimiento/agente-voz': ['Agente de Voz', 'Una línea que contesta y toma pedidos sola'],
};

/** Grupos del menú lateral */
const NAV_GROUPS = [
  {
    label: 'OPERACIONES',
    items: [
      { label: 'Panel general', icon: 'space_dashboard', href: '/negocio' },
      { label: 'Pedidos en vivo', icon: 'receipt_long', href: '/negocio/pedidos', badge: 'new' },
      { label: 'Menú + Productos', icon: 'restaurant_menu', href: '/negocio/catalogo' },
    ],
  },
  {
    label: 'TURA GROWTH AI',
    items: [
      { label: 'Kit Turafood', icon: 'auto_awesome', href: '/negocio/kit', badge: '⚡ ULTRA' },
      { label: 'Email Marketing', icon: 'mark_email_unread', href: '/negocio/email-mkt' },
      { label: 'Negocios Locales', icon: 'storefront', href: '/negocio/crecimiento/google-negocio' },
    ],
  },
  {
    label: 'REPARTIDOR IA',
    items: [
      { label: 'Radar en Vivo', icon: 'radar', href: '/negocio/repartidores' },
      { label: 'Tura Turbo', icon: 'bolt', href: '/negocio/turbo', badge: '15 min' },
      { label: 'Motor de Despacho', icon: 'route', href: '/negocio/repartidores/ajustes' },
      { label: 'Finanzas y Pagos', icon: 'account_balance_wallet', href: '/negocio/repartidores/liquidacion' },
    ],
  },
  {
    label: 'MI NEGOCIO',
    items: [
      { label: 'Métodos de Pago', icon: 'payments', href: '/negocio/pagos' },
      { label: 'Horarios', icon: 'schedule', href: '/negocio/horarios' },
      { label: 'Promociones', icon: 'local_activity', href: '/negocio/promociones' },
      { label: 'Reseñas', icon: 'reviews', href: '/negocio/resenas', badge: '4.9 ★' },
      { label: 'Sucursales', icon: 'store', href: '/negocio/sucursales' },
    ],
  },
  {
    label: 'FINANZAS PRO',
    items: [
      { label: 'Historial de pedidos', icon: 'history', href: '/negocio/historial' },
      { label: 'Reportes', icon: 'insights', href: '/negocio/reportes' },
      { label: 'Afiliados & Wallet', icon: 'card_giftcard', href: '/negocio/afiliados', badge: '10%' },
    ],
  },
  {
    label: 'SEGURIDAD Y EQUIPO',
    items: [
      { label: 'Roles y permisos', icon: 'shield_person', href: '/negocio/roles', badge: 'PRO' },
      { label: 'Seguridad y clave', icon: 'lock_reset', href: '/negocio/seguridad' },
      { label: 'Verificación', icon: 'verified_user', href: '/negocio/verificacion', badge: 'onboarding' },
      { label: 'Soporte', icon: 'support_agent', href: '/negocio/soporte' },
      { label: 'Documentación Tfood', icon: 'menu_book', href: '/negocio/conocimiento' },
    ],
  },
];

/** Menú inferior de celular — bottomNav del mockup, línea 1427 */
const BOTTOM_NAV = [
  { label: 'Resumen', icon: 'space_dashboard', href: '/negocio' },
  { label: 'Pedidos', icon: 'notifications_active', href: '/negocio/pedidos', badge: 'new' },
  { label: 'Menú', icon: 'restaurant_menu', href: '/negocio/catalogo' },
  { label: 'Promos', icon: 'local_activity', href: '/negocio/promociones' },
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function BizShell({ children }) {
  const router = useRouter();
  const path = usePathname();

  const [business, setBusiness] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [hasTurnedOffDemo, setHasTurnedOffDemo] = useState(true);
  const [showDemoPopup, setShowDemoPopup] = useState(false);

  // Modal: Equipo Turafood (Agendar llamada 1-a-1 & soporte)
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [teamTopic, setTeamTopic] = useState('ventas');
  const [teamDay, setTeamDay] = useState('hoy');
  const [teamHour, setTeamHour] = useState('02:30 PM');
  const [teamPhone, setTeamPhone] = useState('');
  const [teamScheduled, setTeamScheduled] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isOff = localStorage.getItem('tura_demo_off') === '1';
      if (isOff) {
        setDemoMode(false);
      } else {
        setHasTurnedOffDemo(false);
      }
    }
  }, []);

  const handleToggleDemo = () => {
    if (demoMode) {
      setShowDemoPopup(true);
    } else {
      setDemoMode(true);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('tura_demo_off');
      }
    }
  };

  const confirmExitDemo = () => {
    setDemoMode(false);
    setHasTurnedOffDemo(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tura_demo_off', '1');
    }
    setShowDemoPopup(false);
    toast('¡Bienvenido a Producción!');
  };

  const [drawer, setDrawer] = useState(false);
  const rail = useRail();
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const t = makeT(lang);
  const [aiOpen, setAiOpen] = useState(false);

  // Ver src/lib/useDialogOpen.js: el botón flotante y la barra inferior
  // se pintaban encima de las hojas porque comparten nivel de apilado.
  const sheetOpen = useDialogOpen();

  /**
   * Los pasos salen de los datos, no de una lista que alguien marca a
   * mano: así no puede quedar diciendo que falta algo que ya está.
   */
  const pasosNegocio = [
    {
      id: 'nombre', icono: 'storefront',
      titulo: 'Ponle el nombre a tu negocio',
      detalle: 'Es el que van a ver tus clientes en la app',
      href: '/negocio/equipo',
      cta: 'Ponerlo',
      hecho: Boolean(business?.name) && business.name !== 'Mi negocio',
    },
    {
      id: 'direccion', icono: 'location_on',
      titulo: 'Dinos dónde quedas',
      detalle: 'Sin dirección no podemos calcular el domicilio',
      href: '/negocio/sucursales',
      cta: 'Agregar',
      hecho: Boolean(business?.address),
    },
    {
      id: 'menu', icono: 'restaurant_menu',
      titulo: 'Deja tu menú a tu gusto',
      detalle: 'Te cargamos uno de ejemplo: cámbialo por el tuyo',
      href: '/negocio/catalogo',
      cta: 'Editarlo',
      hecho: Boolean(business?.menu_listo),
    },
    {
      id: 'horarios', icono: 'schedule',
      titulo: 'Marca tus horarios',
      detalle: 'Para que nadie pida cuando estás cerrado',
      href: '/negocio/horarios',
      cta: 'Marcarlos',
      hecho: Boolean(business?.horarios_listos),
    },
    {
      id: 'documentos', icono: 'verified_user',
      titulo: 'Sube tus documentos',
      detalle: 'Con esto se quita el tope de 20 pedidos al día',
      href: '/negocio/verificacion',
      cta: 'Subirlos',
      hecho: business?.status === 'active' && !onboardingPending,
    },
  ];
  const [aiTips, setAiTips] = useState(0);
  const [toastMsg, setToastMsg] = useState('');

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setToastMsg(''), 2200);
  }, []);

  // Carga inicial
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const biz = await getMyBusiness();
        if (!alive) return;
        setBusiness(biz);
        if (!biz) return;

        const [live, reviews] = await Promise.all([
          getLiveOrders(biz.id),
          getReviews(biz.id).catch(() => []),
        ]);
        if (!alive) return;
        setOrders(live);
        setPendingReviews(reviews.filter((r) => !r.business_reply).length);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const reloadOrders = useCallback(async () => {
    if (!business) return;
    try {
      setOrders(await getLiveOrders(business.id));
    } catch (err) {
      setError(err.message);
    }
  }, [business]);

  /** Vuelve a leer la ficha: lo usa la verificación al guardar un bloque */
  const refreshBusiness = useCallback(async () => {
    try {
      const fresh = await getMyBusiness();
      if (fresh) setBusiness(fresh);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  // Pedidos en vivo: entran solos, sin recargar
  useEffect(() => {
    if (!business) return undefined;
    return subscribeToOrders(business.id, reloadOrders);
  }, [business, reloadOrders]);

  // Cerrar el cajón al navegar en celular
  useEffect(() => { setDrawer(false); }, [path]);

  const newCount = useMemo(
    () => orders.filter((o) => columnOf(o.status).key === 'nuevo').length,
    [orders],
  );

  /**
   * Al negocio nuevo le falta mandar su registro a revisión. Se marca
   * con un punto en el menú hasta que lo haga.
   */
  const onboardingPending = Boolean(business) && !business.submitted_at && business.status !== 'active';

  const badgeValue = (kind) => {
    if (kind === 'new') return newCount;
    if (kind === 'reviews') return pendingReviews;
    if (kind === 'onboarding') return onboardingPending ? 1 : 0;
    return 0;
  };

  const toggleOpen = async () => {
    if (!business) return;
    const next = !business.is_open;
    setBusiness((b) => ({ ...b, is_open: next }));   // respuesta inmediata
    try {
      await setStoreOpen(business.id, next);
      toast(next ? 'Tienda abierta' : 'Tienda cerrada · dejarás de recibir pedidos');
    } catch (err) {
      setBusiness((b) => ({ ...b, is_open: !next })); // se revierte si falla
      setError(err.message);
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  const [title, sub] = PAGES[path] ?? ['', ''];
  const pageSub = path === '/negocio'
    ? `${new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })} · ${business?.name ?? ''}`
    : sub;

  const ctx = {
    business, loading, error, orders, newCount, pendingReviews,
    setPendingReviews, reloadOrders, refreshBusiness, toast,
    demoMode, setDemoMode,
  };

  return (
    <BizContext.Provider value={ctx}>
      <div className="pro-scale-layout" style={S.root}>
        {/* Velo del cajón lateral en celular */}
        {drawer && <div onClick={() => setDrawer(false)} style={S.scrim} />}

        {/* ---------------- Barra lateral ---------------- */}
        <nav
          style={S.side}
          data-tour="nav"
          className={`biz-side${drawer ? ' is-open' : ''}${rail.collapsed ? ' is-rail' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '20px 18px 18px' }}>
            <div style={S.logo}>t</div>
            <div className="rail-hide" style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 15.5, letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text)' }}>
                Tura Food <span className="tf-serif" style={{ color: 'var(--primary)', fontStyle: 'italic', fontWeight: 700 }}>AI</span>
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Todo tu negocio en una APP
              </div>
            </div>
          </div>

          <Link href="/negocio/sucursales" style={S.branch}>
            {/* Con foto, manda la foto. Sin foto, un localito con el
                color de su nicho — antes acá había un cuadrado gris
                plano, que es lo que se ve cuando algo está a medias. */}
            {business?.cover_url ? (
              <span
                style={{
                  ...S.branchImg,
                  backgroundImage: `url('${business.cover_url}')`,
                }}
              />
            ) : (
              <LocalMini nicho={business?.nicho} size={38} radius={11} />
            )}
            <span className="rail-hide" style={{ flex: 1, minWidth: 0 }}>
              <span className="tr1" style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
                {business?.name ?? 'Tu negocio'}
              </span>
              <span className="tr1" style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
                {business?.address ?? 'Buenaventura'}
              </span>
            </span>
            <span className="ms rail-hide" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>unfold_more</span>
          </Link>

          <div style={{ flex: 1, padding: '0 10px 14px', overflowY: 'auto' }}>
            {NAV_GROUPS.map((g) => (
              // La clave sale del primer enlace y no del título: el
              // último grupo no tiene título, y `key={undefined}` hace
              // que React pierda el rastro de la lista al re-pintar.
              <div
                key={g.items[0].href}
                style={{
                  marginBottom: 16,
                  // El grupo sin título es el pie del menú. Una línea
                  // fina lo separa de lo de arriba sin subirle
                  // jerarquía como haría un rótulo.
                  ...(g.label ? null : {
                    marginTop: 6,
                    paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                  }),
                }}
              >
                {g.label && (
                  <div className="rail-hide" style={S.groupLabel}>{t(g.label)}</div>
                )}
                {g.items.map((i) => {
                  const on = path === i.href;
                  
                  const rawBadge = i.badge;
                  let badgeDisplay = null;
                  let badgeStyle = S.navBadge;

                  if (rawBadge === 'new') {
                    if (newCount > 0) badgeDisplay = newCount;
                  } else if (rawBadge === 'reviews') {
                    if (pendingReviews > 0) badgeDisplay = pendingReviews;
                  } else if (rawBadge === 'onboarding') {
                    if (onboardingPending) badgeDisplay = '1';
                  } else if (rawBadge) {
                    badgeDisplay = rawBadge;
                    if (rawBadge === '⚡ ULTRA' || rawBadge === 'NUEVO') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 7px', borderRadius: 99,
                        background: 'linear-gradient(135deg, #FF7A4D, #E2360F)', color: '#fff',
                        fontSize: 9.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(255,68,31,0.4)', letterSpacing: '.03em'
                      };
                    } else if (rawBadge === '15 min') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 7px', borderRadius: 99,
                        background: 'linear-gradient(135deg, #FF7A4D, #E2360F)', color: '#fff',
                        fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(255,68,31,0.35)', letterSpacing: '.02em'
                      };
                    } else if (rawBadge === '10%') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 7px', borderRadius: 99,
                        background: 'rgba(232,199,102,0.18)', color: 'var(--gold)', border: '1px solid rgba(232,199,102,0.35)',
                        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      };
                    } else if (rawBadge === '24/7') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 7px', borderRadius: 99,
                        background: 'rgba(16,185,129,0.15)', color: '#10B981',
                        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      };
                    } else if (rawBadge === 'PRO') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 6px', borderRadius: 6,
                        background: 'linear-gradient(135deg, #2A2620, #17140F)', color: '#D99A15', border: '1px solid rgba(217, 154, 21, 0.3)',
                        fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.05em'
                      };
                    } else if (rawBadge === '4.9 ★') {
                      badgeStyle = {
                        flex: 'none', height: 19, padding: '0 7px', borderRadius: 99,
                        background: 'rgba(251,191,36,0.15)', color: '#D97706',
                        fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      };
                    }
                  }

                  if (i.disabled) {
                    return (
                      <div
                        key={i.href}
                        style={{ ...S.navItem, opacity: 0.45, cursor: 'not-allowed', pointerEvents: 'none' }}
                        title="Próximamente"
                      >
                        <span className="ms" style={{ fontSize: 20, flex: 'none', color: 'var(--faint)' }}>
                          {i.icon}
                        </span>
                        <span className="rail-hide" style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--muted)' }}>{t(i.label)}</span>
                        <span className="rail-hide" style={{ fontSize: 9, fontWeight: 800, background: 'var(--surface2)', padding: '3px 6px', borderRadius: 6, color: 'var(--muted)', letterSpacing: '.05em' }}>
                          PRÓX.
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      style={{ ...S.navItem, ...(on ? S.navOn : S.navOff) }}
                      title={t(i.label)}
                    >
                      <span
                        className={`ms${on ? ' ms-fill' : ''}`}
                        style={{ fontSize: 20, flex: 'none', color: on ? 'var(--primary)' : 'var(--faint)' }}
                      >
                        {i.icon}
                      </span>
                      <span className="rail-hide" style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{t(i.label)}</span>
                      {badgeDisplay && <span className="rail-hide" style={badgeStyle}>{badgeDisplay}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px' }}>
              <div style={S.userAvatar}>{initials(business?.name)}</div>
              <div className="rail-hide" style={{ flex: 1, minWidth: 0 }}>
                <div className="tr1" style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {business?.name ?? '—'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{t('Administrador')}</div>
              </div>
              <button onClick={signOut} style={S.logout} aria-label={t('Cerrar sesión')}>
                <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* ---------------- Contenido ---------------- */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <header style={S.topbar}>
            {/* Celular: abre el cajón. Escritorio: recoge la barra a iconos. */}
            <button onClick={() => setDrawer(true)} style={S.menuBtn} className="mobile-only" aria-label={t('Abrir menú')}>
              <span className="ms" style={{ fontSize: 24 }}>menu</span>
            </button>
            <button
              onClick={rail.toggle}
              style={S.menuBtn}
              className="desktop-only"
              aria-label={rail.collapsed ? t('Expandir menú') : t('Recoger menú')}
              aria-pressed={rail.collapsed}
              title={rail.collapsed ? t('Expandir menú') : t('Recoger menú')}
            >
              <span className="ms" style={{ fontSize: 24 }}>
                {rail.collapsed ? 'menu_open' : 'menu'}
              </span>
            </button>

            <div style={{ minWidth: 0 }}>
              <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em' }}>
                {t(title)}
              </div>
              {pageSub && (
                <div className="tr1" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                  {t(pageSub)}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            <div data-tour="modo-demo" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', borderRadius: 14 }}>
            {/* Modo Demo solid pill toggle */}
            <button
              onClick={handleToggleDemo}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, height: 38,
                padding: '0 5px 0 14px', borderRadius: 999,
                background: demoMode ? '#FF5B2E' : 'var(--surface2)',
                border: demoMode ? 'none' : '1px solid var(--border)',
                color: demoMode ? '#FFFFFF' : 'var(--muted)',
                cursor: 'pointer', flex: 'none',
                boxShadow: demoMode ? '0 3px 12px rgba(255, 91, 46, 0.35)' : 'none',
                transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              title={t('Alterna entre datos de prueba y tus datos reales')}
            >
              <span className="demo-label" style={{ fontSize: 12.5, fontWeight: 800, color: demoMode ? '#fff' : 'var(--muted)' }}>
                {demoMode ? t('Modo Demo') : t('Modo Real')}
              </span>
              <span style={{
                width: 32, height: 20, borderRadius: 99, padding: 2, display: 'flex', flex: 'none',
                background: demoMode ? 'rgba(255,255,255,0.35)' : 'var(--faint)',
              }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transform: demoMode ? 'translateX(12px)' : 'translateX(0)',
                  transition: 'transform .18s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </span>
            </button>

            {/* Tienda abierta / cerrada */}
            <button
              onClick={toggleOpen}
              style={{
                ...S.openBtn,
                background: business?.is_open ? 'rgba(16,185,129,0.16)' : 'var(--surface2)',
                border: business?.is_open ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border)',
                color: business?.is_open ? 'var(--green)' : 'var(--muted)',
                boxShadow: business?.is_open ? '0 2px 10px rgba(16,185,129,0.15)' : 'none',
              }}
            >
              <span className="open-label" style={{ fontSize: 12.5, fontWeight: 800 }}>
                {business?.is_open ? t('Tienda abierta') : t('Tienda cerrada')}
              </span>
              <span style={{ ...S.switchTrack, background: business?.is_open ? 'var(--green)' : 'var(--faint)' }}>
                <span style={{ ...S.switchKnob, transform: business?.is_open ? 'translateX(16px)' : 'none' }} />
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Idioma: la bandera dice a qué idioma se cambia */}
            <button onClick={toggleLang} style={S.iconBtn} aria-label={t('Cambiar idioma')} title={t('Cambiar idioma')}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{lang === 'es' ? '🇺🇸' : '🇨🇴'}</span>
              <span style={S.langTag}>{lang === 'es' ? 'EN' : 'ES'}</span>
            </button>

            <button
              onClick={toggleTheme}
              style={S.iconBtn}
              aria-label={`Tema: ${TEMA_INFO[theme]?.nombre ?? 'Claro'}. Tocar para cambiar`}
              title={`Tema: ${TEMA_INFO[theme]?.nombre ?? 'Claro'} — toca para cambiar`}
            >
              <span className="ms" style={{ fontSize: 20 }}>
                {TEMA_INFO[theme]?.icono ?? 'light_mode'}
              </span>
            </button>

            <Link href="/negocio/pedidos" style={S.iconBtn} aria-label="Pedidos nuevos">
              <span className="ms" style={{ fontSize: 20 }}>notifications</span>
              {newCount > 0 && <span style={S.dot} />}
            </Link>

            {/* Botón Equipo Turafood en Negro Mate (Siempre Visible) */}
            <button
              onClick={() => { setShowTeamPanel(true); setTeamScheduled(false); }}
              style={S.teamBtn}
              aria-label="Equipo Turafood - Agendar llamada"
              title="Habla con el equipo de Turafood"
            >
              <span className="ms ms-fill" style={{ fontSize: 17, color: 'var(--amber)' }}>support_agent</span>
              <span>Equipo Turafood</span>
            </button>
          </div>
          </header>

          <main className="sc biz-main" style={S.main}>
            {/* ProgresoCuenta fue movido directamente a /negocio/page.js */}

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 18 }}>error</span>
                <span>{error}</span>
              </div>
            )}
            {children}
          </main>
        </div>

        {/* Botón y panel de Tura IA */}
        {!aiOpen && !sheetOpen && (
          <button data-tour="ia" onClick={() => setAiOpen(true)} style={S.aiFab}>
            <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>Tura IA</span>
            {aiTips > 0 && <span style={S.aiBadge}>{aiTips}</span>}
          </button>
        )}
        <Recorrido id="negocio" pasos={PASOS_NEGOCIO} />

        <TuraIA
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          pendingReviews={pendingReviews}
          onTipCount={setAiTips}
        />

        {/* Menú inferior de celular — se quita mientras haya una hoja abierta */}
        {!sheetOpen && (
        <nav style={S.bottomNav} className="mobile-only">
          {BOTTOM_NAV.map((b) => {
            const on = path === b.href;
            const badge = badgeValue(b.badge);
            return (
              <Link key={b.href} href={b.href} style={S.bottomItem}>
                <span style={{ ...S.bottomPill, background: on ? '#FDE7E0' : 'transparent' }}>
                  <span
                    className={`ms${on ? ' ms-fill' : ''}`}
                    style={{ fontSize: 22, color: on ? 'var(--primary)' : 'var(--muted)' }}
                  >
                    {b.icon}
                  </span>
                  {badge > 0 && <span style={S.bottomBadge}>{badge}</span>}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: on ? 'var(--primary)' : 'var(--muted)' }}>
                  {b.label}
                </span>
              </Link>
            );
          })}
        </nav>
        )}

        {/* Modal PRO Minimalista y Persuasivo con SVG */}
        {showDemoPopup && (
          <div
            onClick={() => setShowDemoPopup(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20, animation: 'tfFadeIn .18s ease both',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 360,
                background: '#141210',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 26, padding: '26px 22px',
                boxShadow: '0 24px 70px rgba(0,0,0,0.65)',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Header Icon SVG + Close */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(255,91,46,0.18) 0%, rgba(255,143,0,0.12) 100%)',
                  border: '1px solid rgba(255,91,46,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(255,91,46,0.25)',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5B2E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                    <path d="M8.5 2h7" />
                    <path d="M7 16h10" />
                  </svg>
                </div>
                <button
                  onClick={() => setShowDemoPopup(false)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)', border: 'none',
                    color: '#8A8278', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s ease',
                  }}
                  aria-label="Cerrar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Copy persuasivo y breve */}
              <h2 style={{
                margin: '0 0 8px', fontFamily: 'var(--font-bricolage)',
                fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em',
              }}>
                ¿Listo para vender en vivo? 🚀
              </h2>
              <p style={{
                margin: '0 0 22px', fontSize: 13.5, color: '#9E978E',
                lineHeight: 1.5, fontWeight: 400,
              }}>
                Pasa a <strong>Modo Real</strong> para recibir clientes, comandas y pedidos reales de Buenaventura.
              </p>

              {/* Botones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={confirmExitDemo}
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    background: 'linear-gradient(135deg, #11B26A 0%, #0E9358 100%)',
                    color: '#FFFFFF', border: 'none', fontWeight: 800, fontSize: 14,
                    cursor: 'pointer', boxShadow: '0 6px 20px rgba(17, 178, 106, 0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'transform .15s ease, box-shadow .15s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                    <path d="M2 7h20" />
                  </svg>
                  Activar Ventas Reales
                </button>

                <button
                  onClick={() => setShowDemoPopup(false)}
                  style={{
                    width: '100%', height: 42, borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)', color: '#D4CDC3',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    transition: 'background .15s ease',
                  }}
                >
                  Seguir en Modo Demo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Equipo Turafood · Agendar Llamada & Soporte */}
        {showTeamPanel && (
          <div
            onClick={() => setShowTeamPanel(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 120,
              background: 'rgba(10, 8, 6, 0.75)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 540,
                background: 'var(--surface)',
                borderRadius: 24,
                border: '1px solid var(--border)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column',
                maxHeight: '90vh',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px 28px 18px',
                borderBottom: '1px solid var(--border)',
                background: 'linear-gradient(135deg, rgba(232,199,102,0.08) 0%, transparent 100%)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <span style={{
                      background: 'rgba(232, 199, 102, 0.15)', color: '#D4AF37',
                      fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em',
                      padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase',
                      border: '1px solid rgba(232, 199, 102, 0.3)',
                    }}>
                      ⚡ EQUIPO LOCAL · BUENAVENTURA
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 21, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
                    Equipo Turafood
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>
                    Agenda una llamada 1-a-1 con nuestro equipo para escalar tus ventas o resolver dudas.
                  </p>
                </div>

                <button
                  onClick={() => setShowTeamPanel(false)}
                  style={{
                    width: 32, height: 32, borderRadius: 10,
                    border: '1px solid var(--border)', background: 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--muted)', flex: 'none',
                  }}
                  aria-label="Cerrar modal"
                >
                  <span className="ms" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Body */}
              <div className="sc" style={{ padding: '24px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {teamScheduled ? (
                  <div style={{
                    padding: 28, borderRadius: 20, textAlign: 'center',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      background: 'var(--green)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                    }}>
                      <span className="ms" style={{ fontSize: 32 }}>check</span>
                    </div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                      ¡Llamada Agendada con Éxito!
                    </h3>
                    <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                      Un especialista del Equipo Turafood te llamará puntualmente ({teamDay === 'hoy' ? 'Hoy' : teamDay === 'manana' ? 'Mañana' : 'En 2 días'} a las {teamHour}). Te enviamos confirmación a tu WhatsApp.
                    </p>
                    <button
                      onClick={() => setShowTeamPanel(false)}
                      style={{
                        padding: '10px 24px', borderRadius: 14,
                        background: 'var(--text)', color: 'var(--bg)',
                        border: 'none', fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                      }}
                    >
                      Entendido
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Especialista Asignado */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 18px', borderRadius: 18,
                      background: 'var(--surface2)', border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #FF5B2E, #E2360F)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 800, flex: 'none',
                      }}>
                        SM
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>Sebastián M.</span>
                          <span style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 700, color: 'var(--green)',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                            En línea ahora
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          Growth Lead &amp; Asesor Gastronómico · Buenaventura
                        </div>
                      </div>
                    </div>

                    {/* Selector de Tema */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                        ¿En qué te podemos ayudar?
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { id: 'ventas', label: '📈 Escalar ventas y promos' },
                          { id: 'menu', label: '📸 Optimizar fotos y menú' },
                          { id: 'tecnico', label: '⚙️ Configuración y pagos' },
                          { id: 'domis', label: '🛵 Repartidores y Turbo' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTeamTopic(t.id)}
                            style={{
                              padding: '10px 12px', borderRadius: 14,
                              border: teamTopic === t.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              background: teamTopic === t.id ? 'var(--primary-tint)' : 'var(--surface2)',
                              color: teamTopic === t.id ? 'var(--primary)' : 'var(--text)',
                              fontSize: 12.5, fontWeight: 700, textAlign: 'left',
                              cursor: 'pointer', transition: 'all .15s ease',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selector de Fecha y Hora */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                        Selecciona el horario
                      </label>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {[
                          { id: 'hoy', label: 'Hoy' },
                          { id: 'manana', label: 'Mañana' },
                          { id: 'pasado', label: 'En 2 días' },
                        ].map((d) => (
                          <button
                            key={d.id}
                            onClick={() => setTeamDay(d.id)}
                            style={{
                              flex: 1, padding: '8px 10px', borderRadius: 12,
                              border: teamDay === d.id ? '1.5px solid var(--text)' : '1px solid var(--border)',
                              background: teamDay === d.id ? 'var(--text)' : 'var(--surface2)',
                              color: teamDay === d.id ? 'var(--bg)' : 'var(--muted)',
                              fontSize: 12, fontWeight: 800, cursor: 'pointer',
                            }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        {['10:00 AM', '02:30 PM', '04:30 PM', '06:00 PM'].map((h) => (
                          <button
                            key={h}
                            onClick={() => setTeamHour(h)}
                            style={{
                              padding: '8px 6px', borderRadius: 10,
                              border: teamHour === h ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                              background: teamHour === h ? 'var(--primary-tint)' : 'var(--surface2)',
                              color: teamHour === h ? 'var(--primary)' : 'var(--text)',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                            }}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Teléfono de contacto */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
                        Tu número de WhatsApp / Llamada
                      </label>
                      <input
                        type="tel"
                        value={teamPhone || (business?.phone || '')}
                        onChange={(e) => setTeamPhone(e.target.value)}
                        placeholder="+57 318 000 0000"
                        style={{
                          width: '100%', height: 44, borderRadius: 14,
                          border: '1px solid var(--border)', background: 'var(--surface2)',
                          padding: '0 16px', fontSize: 14, fontWeight: 600,
                          color: 'var(--text)', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Botón de Agendar */}
                    <button
                      onClick={() => {
                        setTeamScheduled(true);
                        toast('¡Cita agendada con el Equipo Turafood!');
                      }}
                      style={{
                        width: '100%', height: 48, borderRadius: 16,
                        background: 'linear-gradient(135deg, #1C1917 0%, #12100E 100%)',
                        color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      }}
                    >
                      <span className="ms ms-fill" style={{ fontSize: 18, color: 'var(--amber)' }}>calendar_today</span>
                      Agendar Asesoría 1-a-1
                    </button>

                    {/* Separador */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>O contacto instantáneo</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    {/* Botones de Contacto Directo */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <a
                        href="https://wa.me/573161110001?text=Hola%20Equipo%20Turafood,%20necesito%20ayuda%20con%20mi%20negocio"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          height: 44, borderRadius: 14, background: '#E7F6EE', color: '#0B6E44',
                          border: '1px solid rgba(11, 110, 68, 0.2)', fontSize: 13, fontWeight: 700,
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                      >
                        <span className="ms ms-fill" style={{ fontSize: 18 }}>chat</span>
                        WhatsApp
                      </a>
                      <a
                        href="tel:+573161110001"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                          height: 44, borderRadius: 14, background: 'var(--surface2)', color: 'var(--text)',
                          border: '1px solid var(--border)', fontSize: 13, fontWeight: 700,
                          textDecoration: 'none', cursor: 'pointer',
                        }}
                      >
                        <span className="ms" style={{ fontSize: 18 }}>call</span>
                        Llamar ahora
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notificación flotante */}
        {toastMsg && (
          <div style={S.toast} role="status">
            <span className="ms" style={{ fontSize: 20, color: 'var(--green)' }}>check_circle</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toastMsg}</span>
          </div>
        )}
      </div>
    </BizContext.Provider>
  );
}

const S = {
  demoBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 40,
    padding: '0 6px 0 10px', borderRadius: 13, border: '1px solid var(--border)',
    flex: 'none', cursor: 'pointer', transition: 'all .2s ease',
  },
  switchTrackMini: {
    width: 32, height: 18, borderRadius: 99, padding: 2, display: 'flex', flex: 'none',
  },
  switchKnobMini: {
    width: 14, height: 14, borderRadius: '50%', background: '#fff',
    transition: 'transform .18s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  root: {
    display: 'flex', width: '100%',
    overflow: 'hidden', background: 'var(--bg)', position: 'relative',
  },
  scrim: {
    position: 'fixed', inset: 0, zIndex: 38,
    background: 'rgba(20,16,10,.4)', backdropFilter: 'blur(2px)',
  },
  side: {
    // El ancho vive en globals.css: en línea gana siempre y el modo
    // recogido no podría cambiarlo.
    flex: 'none', background: 'var(--surface)', color: 'var(--text)',
    borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
  },
  logo: {
    width: 34, height: 34, borderRadius: 11, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
  },
  branch: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '0 12px 14px', padding: 11,
    borderRadius: 16, background: 'var(--surface2)', textAlign: 'left',
    color: 'var(--text)', textDecoration: 'none',
  },
  branchImg: {
    width: 32, height: 32, borderRadius: 9, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  groupLabel: {
    fontSize: 10, fontWeight: 800, color: 'var(--faint)',
    letterSpacing: '.1em', padding: '0 10px 8px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%', height: 42,
    padding: '0 12px', borderRadius: 999, textAlign: 'left', marginBottom: 2,
    textDecoration: 'none',
  },
  navOn: { background: '#FDF0EA', color: 'var(--primary)' },
  navOff: { color: 'var(--muted)' },
  navBadge: {
    flex: 'none', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99,
    background: 'var(--primary)', color: '#fff', fontSize: 10.5, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  userAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)',
    color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11.5, fontWeight: 800, flex: 'none',
  },
  logout: {
    width: 28, height: 28, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  topbar: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12, minHeight: 68,
    padding: '10px 26px', background: 'var(--surface)',
    borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
  },
  menuBtn: {
    width: 42, height: 42, borderRadius: '50%',
    alignItems: 'center', justifyContent: 'center', flex: 'none', marginLeft: -9,
  },
  langTag: {
    fontSize: 8.5, fontWeight: 800, letterSpacing: '.04em',
    color: 'var(--muted)', marginTop: 1,
  },
  openBtn: {
    display: 'flex', alignItems: 'center', gap: 9, height: 40,
    padding: '0 6px 0 14px', borderRadius: 13, border: '1px solid var(--border)', flex: 'none',
  },
  switchTrack: {
    width: 38, height: 22, borderRadius: 99, padding: 2, display: 'flex', flex: 'none',
  },
  switchKnob: {
    width: 18, height: 18, borderRadius: '50%', background: '#fff',
    transition: 'transform .18s ease',
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)',
    background: 'var(--surface)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
    flex: 'none', color: 'var(--text)', textDecoration: 'none',
  },
  dot: {
    position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%',
    background: 'var(--primary)', border: '1.5px solid var(--surface)',
  },
  teamBtn: {
    display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 16px', borderRadius: 999,
    background: 'linear-gradient(135deg, #1C1917 0%, #12100E 100%)', color: '#fff', fontSize: 13, fontWeight: 700,
    border: '1px solid rgba(255, 255, 255, 0.16)', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.22)',
    cursor: 'pointer', transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)', whiteSpace: 'nowrap', flex: 'none',
  },
  newProduct: {
    alignItems: 'center', gap: 7, height: 40, padding: '0 15px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700,
    boxShadow: '0 1px 3px rgba(20,16,10,.18)', flex: 'none', textDecoration: 'none',
  },
  main: { flex: 1, overflowY: 'auto', minHeight: 0 },
  quotaBanner: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 14,
    borderRadius: 16, background: '#FFF7E6', border: '1px solid #F0DCA8',
    textDecoration: 'none',
  },
  quotaIcon: {
    width: 40, height: 40, borderRadius: 12, flex: 'none', background: '#FBEFD0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  aiFab: {
    position: 'fixed', right: 18, bottom: 118, zIndex: 60,
    display: 'flex', alignItems: 'center', gap: 9, height: 50, padding: '0 20px 0 16px',
    borderRadius: 999, background: 'linear-gradient(135deg,#2A2620,var(--ink))', color: '#fff',
    boxShadow: '0 14px 34px rgba(20,16,10,.34)',
  },
  aiBadge: {
    minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--primary)',
    fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bottomNav: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 36,
    alignItems: 'center', gap: 2, background: 'rgba(255,255,255,.92)',
    backdropFilter: 'blur(22px) saturate(180%)', borderTop: '1px solid var(--border)',
    padding: '8px 8px 24px', boxShadow: '0 -6px 22px rgba(20,16,10,.07)',
  },
  bottomItem: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '7px 2px', borderRadius: 16, position: 'relative', textDecoration: 'none',
  },
  bottomPill: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 30, borderRadius: 999, position: 'relative',
  },
  bottomBadge: {
    position: 'absolute', top: -3, right: 6, minWidth: 17, height: 17, padding: '0 5px',
    borderRadius: 99, background: 'var(--primary)', color: '#fff', fontSize: 10,
    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid var(--surface)',
  },
  toast: {
    position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', alignItems: 'center', gap: 11, background: 'var(--ink)', color: '#fff',
    borderRadius: 15, padding: '14px 20px', boxShadow: '0 20px 50px rgba(0,0,0,.3)',
    zIndex: 90, animation: 'up .22s ease',
  },
};
