'use client';

/**
 * NOTIFICACIONES EN VIVO
 *
 * Escucha por Realtime los cambios de estado de los pedidos del usuario
 * y muestra un aviso deslizante arriba, sin importar en qué pantalla
 * esté. Es lo que hace que el flujo se sienta sincronizado: el cliente
 * ve "el restaurante aceptó tu pedido" en el momento en que el negocio
 * lo acepta desde su kanban.
 *
 * Sin Supabase configurado no hay nada a qué suscribirse y el
 * componente no hace nada.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';

/** Mensaje por estado. Solo avisamos de los que le importan al cliente. */
const MESSAGES = {
  pending: { icon: 'hourglass_top', tone: '#FF441F', title: 'Pedido enviado en vivo', body: 'Pendiente de confirmación por el restaurante' },
  accepted: { icon: 'restaurant', tone: '#2E6BFF', title: 'Pedido aceptado', body: 'El negocio ya está preparando tu pedido' },
  preparing: { icon: 'skillet', tone: '#A8730B', title: 'En preparación', body: 'Tu comida se está preparando' },
  ready: { icon: 'takeout_dining', tone: '#11B26A', title: 'Pedido listo', body: 'Buscando repartidor' },
  courier_assigned: { icon: 'two_wheeler', tone: '#2E6BFF', title: 'Repartidor asignado', body: 'Va camino al negocio' },
  picked_up: { icon: 'two_wheeler', tone: '#FF441F', title: 'Pedido recogido', body: 'Tu pedido va en camino' },
  delivering: { icon: 'near_me', tone: '#FF441F', title: 'Va en camino', body: 'Está cerca de tu dirección' },
  delivered: { icon: 'check_circle', tone: '#11B26A', title: 'Pedido entregado', body: '¿Nos cuentas cómo te fue?' },
  cancelled: { icon: 'cancel', tone: '#8C857B', title: 'Pedido cancelado', body: 'Revisa los detalles' },
};

export default function LiveOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const [toast, setToast] = useState(null);

  // Escuchar eventos locales de creación de pedido
  useEffect(() => {
    let timer;
    const handleOrderEvent = (e) => {
      const order = e.detail;
      if (!order) return;
      const statusKey = order.status || 'pending';
      const msg = MESSAGES[statusKey] || MESSAGES.pending;
      setToast({ ...msg, orderId: order.id, orderNumber: order.order_number });
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 6500);
    };

    window.addEventListener('turafood:order-status', handleOrderEvent);
    return () => {
      window.removeEventListener('turafood:order-status', handleOrderEvent);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isConfigured()) return undefined;

    const supabase = createClient();
    let channel;
    let timer;
    let cancelado = false;
    const nombre = `mis-pedidos:${Math.random().toString(36).slice(2)}`;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelado) return;

      channel = supabase
        .channel(nombre)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_id=eq.${user.id}`,
          },
          (payload) => {
            const next = payload.new;
            const prev = payload.old;
            if (next.status === prev.status) return;

            const msg = MESSAGES[next.status];
            if (!msg) return;

            setToast({ ...msg, orderId: next.id, orderNumber: next.order_number });
            clearTimeout(timer);
            timer = setTimeout(() => setToast(null), 6000);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelado = true;
      clearTimeout(timer);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Si no hay toast o ya estamos en la página de tracking, no mostramos el banner flotante
  if (!toast || pathname?.startsWith('/tracking')) return null;

  const openOrder = () => {
    const href = toast.title === 'Pedido entregado'
      ? `/rate?order=${toast.orderId}`
      : `/tracking?order=${toast.orderId}`;
    setToast(null);
    router.push(href);
  };

  return (
    <button onClick={openOrder} style={S.toast}>
      <span style={{ ...S.icon, background: `${toast.tone}1F` }}>
        <span className="ms" style={{ fontSize: 21, color: toast.tone }}>{toast.icon}</span>
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>{toast.title}</span>
        <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
          #{toast.orderNumber} · {toast.body}
        </span>
      </span>
      <span className="ms" style={{ fontSize: 19, color: 'var(--faint)' }}>chevron_right</span>
    </button>
  );
}

const S = {
  toast: {
    position: 'fixed', top: 16, left: 16, right: 16, zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: 11,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: '10px 14px',
    boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
    animation: 'banner .3s cubic-bezier(.32,.72,0,1) both',
    maxWidth: 440, margin: '0 auto', cursor: 'pointer',
  },
  icon: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
