'use client';

/**
 * ARMAZÓN DE LA CONSOLA
 *
 * Barra lateral fija con los cuatro grupos del mockup, barra superior
 * con el título de la sección y el buscador global.
 *
 * Es persistente: vive por encima de las páginas, así que cambiar de
 * sección no vuelve a montar el menú ni pierde el estado del buscador.
 * El conteo de pendientes se carga una vez aquí y lo comparten las
 * insignias del menú: pedirlo en cada pantalla serían cuatro consultas
 * para el mismo número.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { getOverview } from '@/lib/admin';

/** Título y bajada de cada ruta. En un solo sitio para que la barra
 *  superior no dependa de que cada página se acuerde de ponerlo. */
const PAGES = {
  '/':              ['Resumen de la plataforma', 'Cómo va TuraFood hoy en Buenaventura'],
  '/operacion':     ['Operación en vivo', 'Pedidos, flota y alertas en tiempo real'],
  '/aprobaciones':  ['Aprobación de cuentas', 'Solicitudes de negocios nuevos'],
  '/negocios':      ['Negocios', 'Catálogo de tiendas, comisiones y estado'],
  '/repartidores':  ['Repartidores', 'Verificación, desempeño y estado de la flota'],
  '/usuarios':      ['Usuarios y roles', 'Clientes, negocios, repartidores y staff'],
  '/soporte':       ['Soporte y disputas', 'Tickets abiertos y auditoría'],
  '/servicios':     ['Servicios y planes', 'Solicitudes de Growth Partner'],
  '/marketing':     ['Marketing', 'Cola de correos y automatizaciones'],
  '/zonas':         ['Zonas y tarifas', 'Cobertura, comisiones y reglas'],
  '/finanzas':      ['Finanzas', 'Comisiones, liquidaciones y facturación'],
};

const NAV = [
  {
    label: 'PLATAFORMA',
    items: [
      { label: 'Resumen', icon: 'space_dashboard', href: '/' },
      { label: 'Operación en vivo', icon: 'sensors', href: '/operacion' },
    ],
  },
  {
    label: 'NEGOCIOS',
    items: [
      { label: 'Aprobaciones', icon: 'how_to_reg', href: '/aprobaciones', badge: 'negocios' },
      { label: 'Negocios', icon: 'store', href: '/negocios' },
    ],
  },
  {
    label: 'PERSONAS',
    items: [
      { label: 'Repartidores', icon: 'two_wheeler', href: '/repartidores', badge: 'repartidores' },
      { label: 'Usuarios y roles', icon: 'group', href: '/usuarios' },
      { label: 'Soporte y disputas', icon: 'support_agent', href: '/soporte', badge: 'soporte' },
    ],
  },
  {
    label: 'CRECIMIENTO',
    items: [
      { label: 'Servicios y planes', icon: 'rocket_launch', href: '/servicios', badge: 'servicios' },
      { label: 'Marketing', icon: 'mark_email_read', href: '/marketing' },
    ],
  },
  {
    label: 'CONFIGURACIÓN',
    items: [
      { label: 'Zonas y tarifas', icon: 'map', href: '/zonas' },
      { label: 'Finanzas', icon: 'account_balance', href: '/finanzas' },
    ],
  },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [overview, setOverview] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [me, setMe] = useState(null);

  const [title, subtitle] = PAGES[pathname] ?? ['TuraFood', 'Consola de administración'];

  useEffect(() => {
    getOverview().then(setOverview).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isConfigured()) {
      setMe({ full_name: 'Modo local', email: 'sin conexión a Supabase' });
      return;
    }
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles').select('full_name, email').eq('id', user.id).maybeSingle();
      setMe(data ?? { full_name: user.email, email: user.email });
    })();
  }, []);

  // Al cambiar de sección se cierra el cajón: en móvil quedaba abierto
  // encima de la pantalla nueva.
  useEffect(() => { setDrawer(false); }, [pathname]);

  const badges = {
    negocios:     overview?.negocios?.pendientes ?? 0,
    repartidores: overview?.repartidores?.pendientes ?? 0,
    soporte:      overview?.soporte?.abiertos ?? 0,
    servicios:    overview?.servicios?.por_revisar ?? 0,
  };

  const signOut = async () => {
    if (isConfigured()) await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  const initials = (me?.full_name ?? 'TF')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div style={S.page}>
      {drawer && <div onClick={() => setDrawer(false)} style={S.scrim} />}

      <aside className={`adm-side${drawer ? ' is-open' : ''}`}>
        <div style={S.brand}>
          <span style={S.logo}>t</span>
          <span style={{ minWidth: 0 }}>
            <span style={S.brandName}>TuraFood</span>
            <span style={S.brandKicker}>CONSOLA ADMIN</span>
          </span>
        </div>

        <div style={S.roleChip}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--primary)', flex: 'none' }}>shield_person</span>
          <span style={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: '#A8412A', letterSpacing: '.03em' }}>
            SUPER ADMIN
          </span>
        </div>

        <nav style={{ flex: 1, padding: '0 10px 14px', overflowY: 'auto' }}>
          {NAV.map((group) => (
            <div key={group.label} style={{ marginBottom: 16 }}>
              <div style={S.groupLabel}>{group.label}</div>
              {group.items.map((item) => {
                const on = pathname === item.href;
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="adm-nav"
                    style={on ? S.navOn : S.navOff}
                  >
                    <span
                      className="ms"
                      style={{
                        fontSize: 20, flex: 'none',
                        color: on ? 'var(--primary)' : 'var(--faint)',
                        fontVariationSettings: on ? "'FILL' 1" : undefined,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
                    {count > 0 && <span style={S.badge}>{count}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <button onClick={signOut} style={S.meRow}>
            <span style={S.avatar}>{initials}</span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={S.meName}>{me?.full_name ?? 'Cargando…'}</span>
              <span style={S.meSub}>Cerrar sesión</span>
            </span>
            <span className="ms" style={{ fontSize: 17, color: 'var(--muted)', flex: 'none' }}>logout</span>
          </button>
        </div>
      </aside>

      <div style={S.col}>
        <header style={S.bar}>
          <button onClick={() => setDrawer(true)} className="adm-burger" aria-label="Abrir menú">
            <span className="ms" style={{ fontSize: 24 }}>menu</span>
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={S.title}>{title}</div>
            <div style={S.subtitle}>{subtitle}</div>
          </div>

          <div style={{ flex: 1 }} />

          <div className="adm-pulse" style={S.live}>
            <span style={S.dot} />
            Plataforma operando
          </div>

          <div className="adm-search" style={S.search}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--muted)', flex: 'none' }}>search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar negocio, usuario o pedido"
              style={S.searchInput}
            />
            {query && (
              <button onClick={() => setQuery('')} style={S.clear} aria-label="Limpiar">
                <span className="ms" style={{ fontSize: 14, color: 'var(--muted)' }}>close</span>
              </button>
            )}
          </div>

          <button style={S.bell} aria-label="Notificaciones">
            <span className="ms" style={{ fontSize: 20 }}>notifications</span>
            <span style={S.bellDot} />
          </button>
        </header>

        <main className="sc adm-main">{children}</main>
      </div>
    </div>
  );
}

const S = {
  // `relative` para que el cajón lateral, que es `absolute`, tenga
  // este armazón como referencia y quede recortado por su overflow.
  page: {
    display: 'flex', height: '100dvh', overflow: 'hidden',
    background: 'var(--bg)', position: 'relative',
  },
  scrim: {
    position: 'absolute', inset: 0, zIndex: 38,
    background: 'rgba(20,16,10,.4)', backdropFilter: 'blur(2px)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 16px' },
  logo: {
    width: 34, height: 34, borderRadius: 11, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 700,
    fontSize: 15.5, letterSpacing: '-.01em',
  },
  brandKicker: {
    display: 'block', fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.08em',
  },
  roleChip: {
    display: 'flex', alignItems: 'center', gap: 9, margin: '0 12px 14px',
    padding: '11px 12px', borderRadius: 14, background: '#FDF0EA',
  },
  groupLabel: {
    fontSize: 10, fontWeight: 800, color: 'var(--faint)',
    letterSpacing: '.1em', padding: '0 10px 8px',
  },
  navOn: { background: '#FFF1EC', color: 'var(--primary)' },
  navOff: { color: 'var(--text)' },
  badge: {
    flex: 'none', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99,
    background: 'var(--primary)', color: '#fff', fontSize: 10.5, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  meRow: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
    padding: '9px 6px', borderRadius: 10,
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)',
    color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11.5, fontWeight: 800, flex: 'none',
  },
  meName: {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meSub: { display: 'block', fontSize: 10.5, color: 'var(--muted)' },

  col: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  bar: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 16, minHeight: 68,
    padding: '0 26px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
  },
  title: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  subtitle: {
    fontSize: 12, color: 'var(--muted)', marginTop: 1,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  live: {
    display: 'flex', alignItems: 'center', gap: 9, height: 40, padding: '0 14px',
    borderRadius: 12, background: '#E6F6EE', color: '#0B7A48',
    fontSize: 12.5, fontWeight: 800, flex: 'none',
  },
  dot: { width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, height: 40,
    background: 'var(--bg)', borderRadius: 12, padding: '0 13px',
  },
  searchInput: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 13,
  },
  clear: {
    width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  bell: {
    width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative', flex: 'none',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%',
    background: 'var(--primary)', border: '1.5px solid var(--surface)',
  },
};
