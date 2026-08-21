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

/** Rutas del flujo que se centran en desktop como un popup enfocado */
const FOCUSED_FLOW = ['/auth'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [clock, setClock] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [onlineAlert, setOnlineAlert] = useState(false);

  const isDark = DARK.includes(pathname);
  const showNav = !NO_NAV.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));
  const isFocused = FOCUSED_FLOW.some((p) => (p === '/' ? pathname === '/' : pathname.startsWith(p)));

  useEffect(() => {
    const tick = () => setClock(
      new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: false }),
    );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Detector de conexión offline / online para Buenaventura
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setOnlineAlert(true);
      setTimeout(() => setOnlineAlert(false), 3500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    if (!navigator.onLine) setIsOffline(true);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="device-wrapper">
      <RehidratarCarrito />
      
      {/* Banner de Estado de Conexión Offline / Online */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #E2360F 0%, #B91C1C 100%)',
          color: '#fff', padding: '9px 16px', fontSize: 12.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}>
          <span className="ms" style={{ fontSize: 18 }}>wifi_off</span>
          <span>Sin conexión a internet · Modo sin conexión activo en Buenaventura</span>
        </div>
      )}

      {onlineAlert && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: '#fff', padding: '9px 16px', fontSize: 12.5, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}>
          <span className="ms" style={{ fontSize: 18 }}>wifi</span>
          <span>¡Conexión a internet restablecida!</span>
        </div>
      )}

      <div className="tablet-device" style={{ background: isDark ? '#0C0B0A' : 'var(--bg)' }}>

        {/* El layout principal de pantalla */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Contenido principal (móvil ocupa 100%, desktop centrado o con sidebar) */}
          <div style={{
            flex: 1, position: 'relative', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            alignItems: isFocused ? 'center' : 'stretch',
            justifyContent: isFocused ? 'center' : 'stretch',
            padding: isFocused ? '20px 0' : 0,
            background: isFocused ? 'radial-gradient(ellipse at center, rgba(255,91,46,0.03) 0%, var(--bg) 70%)' : 'transparent',
          }}>
            {/* Solo esto cambia al navegar */}
            <div
              key={pathname}
              className={`route-fade ${isFocused ? 'focused-flow-card' : ''}`}
              style={{
                ...S.route,
                ...(isFocused ? S.focusedCard : {}),
              }}
            >
              {children}
            </div>
            
            {/* Botón flotante de Tura IA */}
            {showNav && <AiFab />}

            <LiveOrders />
            <SearchOverlay />
            <AiOverlay />
            <FloatingCart />
            {showNav && <BottomNav />}
          </div>
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
  focusedCard: {
    width: '100%',
    maxWidth: 480,
    minHeight: 'calc(100vh - 48px)',
    maxHeight: '92vh',
    borderRadius: 28,
    border: '1px solid var(--border)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.08)',
    background: 'var(--surface)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
};
