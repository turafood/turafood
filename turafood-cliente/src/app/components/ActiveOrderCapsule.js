'use client';

/**
 * CÁPSULA FLOTANTE DE PEDIDO ACTIVO
 * 
 * Mantiene visible el estado del pedido en curso y permite al usuario regresar
 * al mapa GPS y a su comanda en cualquier momento, incluso tras salir a WhatsApp
 * o navegar por otras secciones de la tienda.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import { createClient, isConfigured } from '@/utils/supabase/client';

const ACTIVE_STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'delivering'];

const STATUS_DESCRIPTIONS = {
  pending: { label: 'Pedido enviado', sub: 'Esperando confirmación', color: '#FF9800', icon: 'hourglass_top' },
  accepted: { label: 'Pedido aceptado', sub: 'Entró a la fila de cocina', color: '#2E6BFF', icon: 'restaurant' },
  preparing: { label: 'En preparación', sub: 'Cocinando tus platos', color: '#A8730B', icon: 'skillet' },
  ready: { label: 'Platos listos', sub: 'Esperando al repartidor', color: '#10B981', icon: 'takeout_dining' },
  courier_assigned: { label: 'Repartidor asignado', sub: 'Va al restaurante', color: '#2E6BFF', icon: 'two_wheeler' },
  picked_up: { label: 'En camino', sub: 'Yeison va en ruta hacia ti', color: '#FF441F', icon: 'two_wheeler' },
  delivering: { label: 'Cerca de tu casa', sub: 'Llegando a tu dirección', color: '#FF441F', icon: 'near_me' },
};

export default function ActiveOrderCapsule() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeOrder, setActiveOrder] = useState(null);
  const [minimized, setMinimized] = useState(false);

  // Cargar orden activa desde localStorage
  const checkActiveOrder = () => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('turafood_active_order') || localStorage.getItem('turafood_last_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && ACTIVE_STATUSES.includes(parsed.status)) {
          setActiveOrder(parsed);
          return;
        }
      }
      setActiveOrder(null);
    } catch {
      setActiveOrder(null);
    }
  };

  useEffect(() => {
    checkActiveOrder();

    const handleUpdate = (e) => {
      if (e?.detail) {
        if (ACTIVE_STATUSES.includes(e.detail.status)) {
          setActiveOrder(e.detail);
        } else {
          setActiveOrder(null);
        }
      } else {
        checkActiveOrder();
      }
    };

    window.addEventListener('turafood:order-status', handleUpdate);
    window.addEventListener('turafood:active-order', handleUpdate);
    window.addEventListener('storage', checkActiveOrder);
    window.addEventListener('focus', checkActiveOrder);

    return () => {
      window.removeEventListener('turafood:order-status', handleUpdate);
      window.removeEventListener('turafood:active-order', handleUpdate);
      window.removeEventListener('storage', checkActiveOrder);
      window.removeEventListener('focus', checkActiveOrder);
    };
  }, []);

  // Suscripción Realtime si hay usuario
  useEffect(() => {
    if (!isConfigured() || !activeOrder?.id) return undefined;
    const supabase = createClient();
    const channel = supabase
      .channel(`active-capsule:${activeOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrder.id}`,
        },
        (payload) => {
          const updated = payload.new;
          if (updated) {
            setActiveOrder((prev) => ({ ...prev, ...updated }));
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('turafood_active_order', JSON.stringify({ ...activeOrder, ...updated }));
                localStorage.setItem('turafood_last_order', JSON.stringify({ ...activeOrder, ...updated }));
              } catch {}
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // Si estamos en /tracking o /chat, no mostrar la cápsula para no solapar
  if (!activeOrder || pathname.startsWith('/tracking') || pathname.startsWith('/chat')) {
    return null;
  }

  const st = STATUS_DESCRIPTIONS[activeOrder.status] || STATUS_DESCRIPTIONS.pending;
  const orderNum = activeOrder.order_number || `TS-${String(activeOrder.id || '').slice(0, 5)}`;
  const storeName = activeOrder.business?.name || 'Restaurante';

  const handleGoToTracking = () => {
    router.push(`/tracking?order=${activeOrder.id || 'current'}`);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        style={S.minimizedBtn}
        aria-label="Expandir estado de pedido activo"
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, animation: 'pulse 1.6s infinite' }} />
        <span className="ms ms-fill" style={{ fontSize: 18, color: '#fff' }}>{st.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Pedido #{orderNum}</span>
      </button>
    );
  }

  return (
    <div style={S.capsuleContainer}>
      <div style={S.capsuleCard}>
        
        {/* Lado izquierdo: Ícono con pulso animado */}
        <div style={{ ...S.iconBox, background: `${st.color}1E` }}>
          <span style={{ ...S.pulseRing, borderColor: st.color }} />
          <span className="ms ms-fill" style={{ fontSize: 22, color: st.color }}>
            {st.icon}
          </span>
        </div>

        {/* Centro: Info del pedido */}
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={handleGoToTracking}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: st.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {st.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>• #{orderNum}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
            {storeName} · {cop(activeOrder.total)}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
            {st.sub}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleGoToTracking}
            style={S.trackBtn}
            title="Ver pedido y mapa GPS en tiempo real"
          >
            <span className="ms ms-fill" style={{ fontSize: 16 }}>near_me</span>
            <span>Ver GPS</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setMinimized(true);
            }}
            style={S.closeBtn}
            title="Minimizar cápsula"
          >
            <span className="ms" style={{ fontSize: 18 }}>expand_more</span>
          </button>
        </div>

      </div>
    </div>
  );
}

const S = {
  capsuleContainer: {
    position: 'fixed',
    bottom: 84,
    left: 14,
    right: 14,
    maxWidth: 540,
    margin: '0 auto',
    zIndex: 90,
    animation: 'slideUp .3s cubic-bezier(.32,.72,0,1) both',
  },
  capsuleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 20,
    padding: '10px 14px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
    backdropFilter: 'blur(12px)',
  },
  iconBox: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pulseRing: {
    position: 'absolute',
    inset: -3,
    borderRadius: 16,
    border: '1.5px solid transparent',
    animation: 'pulseGlow 2s infinite',
    pointerEvents: 'none',
  },
  trackBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 12,
    fontSize: 12.5,
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255, 68, 31, 0.3)',
    flexShrink: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    border: 'none',
    background: 'var(--surface2)',
    color: 'var(--muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  minimizedBtn: {
    position: 'fixed',
    bottom: 84,
    right: 16,
    zIndex: 90,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'linear-gradient(135deg, #1E1B18 0%, #2D2721 100%)',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '8px 14px',
    borderRadius: 999,
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    cursor: 'pointer',
    animation: 'banner .3s ease both',
  },
};
