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
import { useRail, useTheme, useLang } from '@/lib/prefs';
import { makeT } from '@/lib/i18n';
import { BizContext } from './BizContext';
import TuraIA from './TuraIA';
import { useDialogOpen } from '@/lib/useDialogOpen';
import ProgresoCuenta from '../components/ProgresoCuenta';
import Recorrido from '../components/Recorrido';
import { PASOS_NEGOCIO } from '../components/recorridos';

/** Títulos de cada sección — PAGES del mockup, línea 1126 */
const PAGES = {
  '/negocio': ['Resumen de hoy', null],
  '/negocio/pedidos': ['Pedidos en vivo', 'Se actualiza automáticamente'],
  '/negocio/historial': ['Historial de pedidos', 'Todos los pedidos de esta sucursal'],
  '/negocio/catalogo': ['Menú y productos', 'Precios, disponibilidad y fotos'],
  '/negocio/promociones': ['Promociones y cupones', 'Lo que ven tus clientes en la app'],
  '/negocio/horarios': ['Horarios y disponibilidad', 'Cuándo puede pedirte un cliente'],
  '/negocio/sucursales': ['Sucursales', 'Tus puntos en Buenaventura'],
  '/negocio/reportes': ['Reportes de ventas', 'Los últimos 7 días'],
  '/negocio/liquidaciones': ['Pagos y liquidaciones', 'Consignaciones semanales, todos los viernes'],
  '/negocio/resenas': ['Reseñas de clientes', 'Lo que opinan de tu comida y tu servicio'],
  '/negocio/equipo': ['Equipo y cuenta', 'Roles, verificación y plan'],
  '/negocio/verificacion': ['Verificación de tu negocio', 'Lo que necesitamos para aprobarte'],
  '/negocio/suite': ['Tura Business Suite', 'Todo lo que hace crecer tu negocio, en un solo lugar'],
  '/negocio/crecimiento': ['Servicios y planes', 'Lo que montamos por ti y cuanto cuesta'],
  '/negocio/redes': ['Redes Sociales AI', 'Tus cuentas, tus posts y tu bandeja'],
  '/negocio/redes/crear': ['Crear publicación', 'Míralo antes de publicarlo'],
  '/negocio/redes/inbox': ['Bandeja de marketing', 'Todos tus mensajes en un solo lugar'],
  '/negocio/soporte': ['Soporte', 'Estamos del otro lado'],
  '/negocio/crecimiento/google': ['Google Ads AI', 'Tu ficha, tus campañas y YouTube en un solo lugar'],
  '/negocio/crecimiento/google-negocio': ['Ficha de Google', 'Para que te encuentren en Maps y en el buscador'],
  '/negocio/crecimiento/google-ads': ['Campañas en Google', 'Aparece de primero cuando busquen lo que vendes'],
  '/negocio/crecimiento/agente-voz': ['Agente de voz', 'Una línea que contesta y toma pedidos sola'],
};

/** Grupos del menú lateral — navGroups del mockup, línea 1464 */
const NAV_GROUPS = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Resumen', icon: 'space_dashboard', href: '/negocio' },
      { label: 'Pedidos en vivo', icon: 'notifications_active', href: '/negocio/pedidos', badge: 'new' },
      { label: 'Historial', icon: 'history', href: '/negocio/historial' },
    ],
  },
  {
    label: 'CATÁLOGO',
    items: [
      { label: 'Menú y productos', icon: 'restaurant_menu', href: '/negocio/catalogo' },
      { label: 'Promociones', icon: 'local_activity', href: '/negocio/promociones' },
    ],
  },
  {
    label: 'CLIENTES',
    items: [{ label: 'Reseñas', icon: 'reviews', href: '/negocio/resenas', badge: 'reviews' }],
  },
  {
    label: 'OPERACIÓN',
    items: [
      { label: 'Horarios', icon: 'schedule', href: '/negocio/horarios' },
      { label: 'Sucursales', icon: 'store', href: '/negocio/sucursales' },
    ],
  },
  {
    label: 'FINANZAS',
    items: [
      { label: 'Reportes', icon: 'insights', href: '/negocio/reportes' },
      { label: 'Liquidaciones', icon: 'account_balance_wallet', href: '/negocio/liquidaciones' },
    ],
  },
  {
    label: 'TURA BUSINESS SUITE',
    items: [
      { label: 'Resumen de la suite', icon: 'auto_awesome', href: '/negocio/suite' },
      { label: 'Redes Sociales AI', icon: 'share', href: '/negocio/redes' },
      { label: 'Google Ads AI', icon: 'travel_explore', href: '/negocio/crecimiento/google' },
      { label: 'Servicios y planes', icon: 'rocket_launch', href: '/negocio/crecimiento' },
    ],
  },
  {
    label: 'CUENTA',
    items: [
      { label: 'Verificación', icon: 'verified_user', href: '/negocio/verificacion', badge: 'onboarding' },
      { label: 'Soporte', icon: 'support_agent', href: '/negocio/soporte' },
      { label: 'Equipo y ajustes', icon: 'settings', href: '/negocio/equipo' },
    ],
  },
];

/** Menú inferior de celular — bottomNav del mockup, línea 1427 */
const BOTTOM_NAV = [
  { label: 'Resumen', icon: 'space_dashboard', href: '/negocio' },
  { label: 'Pedidos', icon: 'notifications_active', href: '/negocio/pedidos', badge: 'new' },
  { label: 'Menú', icon: 'restaurant_menu', href: '/negocio/catalogo' },
  { label: 'Promos', icon: 'local_activity', href: '/negocio/promociones' },
  { label: 'Pagos', icon: 'account_balance_wallet', href: '/negocio/liquidaciones' },
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
  };

  return (
    <BizContext.Provider value={ctx}>
      <div style={S.root}>
        {/* Velo del cajón lateral en celular */}
        {drawer && <div onClick={() => setDrawer(false)} style={S.scrim} />}

        {/* ---------------- Barra lateral ---------------- */}
        <nav
          style={S.side}
          data-tour="nav"
          className={`biz-side${drawer ? ' is-open' : ''}${rail.collapsed ? ' is-rail' : ''}`}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 18px' }}>
            <div style={S.logo}>t</div>
            <div className="rail-hide" style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-.01em' }}>
                TuraFood
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.08em' }}>
                NEGOCIOS
              </div>
            </div>
          </div>

          <Link href="/negocio/sucursales" style={S.branch}>
            <span
              style={{
                ...S.branchImg,
                backgroundImage: business?.cover_url ? `url('${business.cover_url}')` : 'none',
                background: business?.cover_url ? undefined : 'var(--faint)',
              }}
            />
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
              <div key={g.label} style={{ marginBottom: 16 }}>
                <div className="rail-hide" style={S.groupLabel}>{t(g.label)}</div>
                {g.items.map((i) => {
                  const on = path === i.href;
                  const badge = badgeValue(i.badge);
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
                      {badge > 0 && <span style={S.navBadge}>{badge}</span>}
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

            <button
              onClick={toggleOpen}
              style={{
                ...S.openBtn,
                background: business?.is_open ? '#E6F6EE' : 'var(--surface2)',
                color: business?.is_open ? '#0B7A48' : 'var(--muted)',
              }}
            >
              <span className="open-label" style={{ fontSize: 12.5, fontWeight: 800 }}>
                {business?.is_open ? t('Tienda abierta') : t('Tienda cerrada')}
              </span>
              <span style={{ ...S.switchTrack, background: business?.is_open ? 'var(--green)' : 'var(--faint)' }}>
                <span style={{ ...S.switchKnob, transform: business?.is_open ? 'translateX(16px)' : 'none' }} />
              </span>
            </button>

            {/* Idioma: la bandera dice a qué idioma se cambia */}
            <button onClick={toggleLang} style={S.iconBtn} aria-label={t('Cambiar idioma')} title={t('Cambiar idioma')}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>{lang === 'es' ? '🇺🇸' : '🇨🇴'}</span>
              <span style={S.langTag}>{lang === 'es' ? 'EN' : 'ES'}</span>
            </button>

            <button
              onClick={toggleTheme}
              style={S.iconBtn}
              aria-label={theme === 'dark' ? t('Cambiar a tema claro') : t('Cambiar a tema oscuro')}
              title={theme === 'dark' ? t('Cambiar a tema claro') : t('Cambiar a tema oscuro')}
            >
              <span className="ms" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <Link href="/negocio/pedidos" style={S.iconBtn} aria-label="Pedidos nuevos">
              <span className="ms" style={{ fontSize: 20 }}>notifications</span>
              {newCount > 0 && <span style={S.dot} />}
            </Link>

            <Link href="/negocio/catalogo" style={S.newProduct} className="desktop-only">
              <span className="ms" style={{ fontSize: 18 }}>add</span>
              {t('Nuevo producto')}
            </Link>
          </header>

          <main className="sc biz-main" data-tour="contenido" style={S.main}>
            {/* Lo que le falta para quedar activo, en todas las
                pantallas. Quien entró a probar no va a ir solo a
                buscar la verificación: si no está delante, la cuenta
                se queda a medias para siempre. */}
            {path !== '/negocio/verificacion' && (
              <ProgresoCuenta
                titulo="Termina de activar tu negocio"
                verificado={business?.status === 'active' && !onboardingPending}
                pasos={pasosNegocio}
              />
            )}

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

        {toastMsg && (
          <div style={S.toast}>
            <span className="ms" style={{ fontSize: 20, color: 'var(--green)' }}>check_circle</span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{toastMsg}</span>
          </div>
        )}
      </div>
    </BizContext.Provider>
  );
}

const S = {
  root: {
    display: 'flex', minHeight: '100dvh', maxHeight: '100dvh',
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
    borderRadius: 999, background: 'linear-gradient(135deg,#2A2620,#17140F)', color: '#fff',
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
    display: 'flex', alignItems: 'center', gap: 11, background: '#17140F', color: '#fff',
    borderRadius: 15, padding: '14px 20px', boxShadow: '0 20px 50px rgba(0,0,0,.3)',
    zIndex: 90, animation: 'up .22s ease',
  },
};
