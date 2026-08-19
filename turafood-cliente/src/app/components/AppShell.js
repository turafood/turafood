'use client';

/**
 * SHELL PERSISTENTE
 *
 * Antes cada pantalla renderizaba su propio DeviceContainer. En el App
 * Router eso significa que al navegar React desmonta el marco entero y
 * lo vuelve a montar: se pierde el scroll, el reloj arranca de cero y
 * se ve un parpadeo — la sensación de "recargó la página".
 *
 * Aquí el chasis, la barra de estado, la navegación inferior, el
 * carrito flotante y el buscador viven UNA sola vez, en el layout raíz.
 * Al cambiar de ruta solo se reemplaza el contenido interno.
 */

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/lib/useHydrated';
import BottomNav from './BottomNav';
import FloatingCart from './FloatingCart';
import SearchOverlay from './SearchOverlay';
import LiveOrders from './LiveOrders';
import AiOverlay, { useAi } from './AiOverlay';
import RehidratarCarrito from './RehidratarCarrito';

/** Rutas a pantalla completa: sin barra inferior */
const NO_NAV = ['/auth', '/', '/checkout', '/cart', '/product', '/tracking', '/chat', '/rate'];

/** Rutas con fondo oscuro (el onboarding y el login) */
const DARK = ['/auth', '/'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [clock, setClock] = useState('');

  const isDark = DARK.includes(pathname);
  const showNav = !NO_NAV.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  useEffect(() => {
    const tick = () => setClock(
      new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: false }),
    );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="device-wrapper">
      <RehidratarCarrito />
      <div className="tablet-device" style={{ background: isDark ? '#0C0B0A' : 'var(--bg)' }}>

        <div className="device-island" aria-hidden="true">
          <span className="device-island-lens" />
        </div>

        <div className="device-statusbar" style={{ color: isDark ? '#fff' : 'var(--text)' }}>
          <span style={{ width: 82 }}>{clock}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: 82, justifyContent: 'flex-end' }}>
            <span className="ms ms-fill" style={{ fontSize: 16 }}>signal_cellular_alt</span>
            <span className="ms ms-fill" style={{ fontSize: 16 }}>wifi</span>
            <span className="ms ms-fill" style={{ fontSize: 18 }}>battery_full</span>
          </div>
        </div>

        {/* Solo esto cambia al navegar */}
        <div key={pathname} className="route-fade" style={S.route}>
          {children}
        </div>

        {/* Botón flotante de Tura IA: disponible en toda la app,
            no solo en el inicio. Se esconde donde ya hay barra de acción. */}
        {showNav && <AiFab />}

        <LiveOrders />
        <SearchOverlay />
        <AiOverlay />
        <FloatingCart />
        {showNav && <BottomNav />}

        <div className="device-homebar" aria-hidden="true">
          <span style={{ background: isDark ? 'rgba(255,255,255,.85)' : 'rgba(23,20,15,.28)' }} />
        </div>
      </div>
    </div>
  );
}

/** Píldora flotante que abre Tura IA */
function AiFab() {
  const openAi = useAi((s) => s.openAi);
  const cartCount = useCartStore((s) => s.getTotalItems());
  const hydrated = useHydrated();

  // La posición depende del carrito, que vive en localStorage: hasta
  // hidratar usamos la de "sin carrito" para que coincida con el SSR.
  const bottom = hydrated && cartCount > 0 ? 152 : 92;

  return (
    <button
      onClick={openAi}
      style={{ ...S.aiFab, bottom }}
      aria-label="Abrir Tura IA"
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span className="ms ms-fill" style={{ fontSize: 18, color: 'var(--amber)' }}>auto_awesome</span>
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>Tura IA</span>
      </span>
    </button>
  );
}

const S = {
  aiFab: {
    position: 'absolute', right: 16, zIndex: 80,
    height: 42, padding: '0 16px', borderRadius: 999,
    background: 'linear-gradient(135deg,#2A2620,#17140F)', color: '#fff',
    boxShadow: '0 8px 24px rgba(20,16,10,.32)',
    transition: 'bottom .2s ease',
  },
  route: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    position: 'relative',
  },
};
