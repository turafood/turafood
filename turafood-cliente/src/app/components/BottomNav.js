'use client';

/**
 * BARRA INFERIOR
 *
 * Vive en el shell, así que no se remonta al navegar: la pestaña activa
 * cambia sin que la barra parpadee.
 *
 * "Buscar" no navega: abre el buscador encima de la pantalla actual,
 * para no perder dónde estaba el usuario.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/lib/useHydrated';
import { useSearchOverlay } from './SearchOverlay';

const ITEMS = [
  { id: 'home', label: 'Inicio', icon: 'home', href: '/home' },
  { id: 'offers', label: 'Ofertas', icon: 'local_activity', href: '/offers' },
  { id: 'search', label: 'Buscar', icon: 'search', action: 'search' },
  { id: 'favorites', label: 'Favoritos', icon: 'favorite', href: '/favorites' },
  { id: 'account', label: 'Cuenta', icon: 'person', href: '/account' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const openSearch = useSearchOverlay((s) => s.openSearch);
  const searchOpen = useSearchOverlay((s) => s.open);
  const rawCount = useCartStore((s) => s.getTotalItems());
  const hydrated = useHydrated();
  // El contador sale de localStorage: no lo pintamos antes de hidratar
  const cartCount = hydrated ? rawCount : 0;

  return (
    <nav style={S.bar}>
      {ITEMS.map((item) => {
        const active = item.action === 'search'
          ? searchOpen
          : pathname.startsWith(item.href);

        const badge = item.id === 'account' && cartCount > 0 ? cartCount : null;

        const content = (
          <>
            <span
              className={`ms ${active ? 'ms-fill' : ''}`}
              style={{ fontSize: 24 }}
            >
              {item.icon}
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, marginTop: 2 }}>
              {item.label}
            </span>
            {badge && <span style={S.badge}>{badge}</span>}
          </>
        );

        const style = {
          ...S.item,
          color: active ? 'var(--primary)' : 'var(--muted)',
          background: active ? '#FFF0ED' : 'transparent',
        };

        if (item.action === 'search') {
          return (
            <button key={item.id} onClick={openSearch} style={style} aria-label="Buscar">
              {content}
            </button>
          );
        }

        return (
          <Link key={item.id} href={item.href} prefetch style={style}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

const S = {
  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
    background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(20px)',
    borderTop: '1px solid var(--border)', padding: '8px 12px 22px',
  },
  item: {
    position: 'relative', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    width: 64, height: 52, borderRadius: 16, textDecoration: 'none',
    transition: 'background .18s ease, color .18s ease',
  },
  badge: {
    position: 'absolute', top: 4, right: 12,
    background: 'var(--primary)', color: '#fff',
    fontSize: 9, fontWeight: 800, width: 16, height: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', border: '2px solid #fff',
  },
};
