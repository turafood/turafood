'use client';

/**
 * RESULTADO DEL PAGO
 *
 * A esta pantalla llega el usuario cuando ePayco lo devuelve. Y aquí
 * está lo importante: **llegar acá no significa que se pagó**. ePayco
 * redirige igual si el pago fue rechazado, y el usuario puede abrir
 * esta URL a mano.
 *
 * Por eso la pantalla no asume nada: consulta el estado real en
 * Supabase, que solo el webhook puede cambiar, y se queda escuchando
 * por Realtime mientras la confirmación llega.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPayment, getLatestPayment, subscribeToPayment, retryPayment } from '@/services/payment';
import { getOrder } from '@/lib/data';
import { cop } from '@/lib/format';

/** Cómo se ve cada estado */
const VIEW = {
  paid: {
    icon: 'check_circle', color: 'var(--green)', bg: '#E6F6EE',
    title: 'Pago aprobado',
    body: 'Tu pedido ya le llegó al negocio.',
  },
  processing: {
    icon: 'hourglass_top', color: 'var(--amber)', bg: '#FFF7E6',
    title: 'Verificando tu pago',
    body: 'Estamos esperando la confirmación del proveedor de pagos. Esto suele tardar menos de un minuto.',
  },
  pending: {
    icon: 'hourglass_top', color: 'var(--amber)', bg: '#FFF7E6',
    title: 'Verificando tu pago',
    body: 'Estamos esperando la confirmación del proveedor de pagos.',
  },
  failed: {
    icon: 'cancel', color: 'var(--primary)', bg: '#FFF0ED',
    title: 'No pudimos procesar el pago',
    body: 'No se te cobró nada. Puedes intentarlo otra vez o cambiar de método.',
  },
  cancelled: {
    icon: 'cancel', color: 'var(--muted)', bg: 'var(--surface2)',
    title: 'Pago cancelado',
    body: 'Cancelaste el pago. Tu pedido sigue guardado.',
  },
  refunded: {
    icon: 'undo', color: 'var(--muted)', bg: 'var(--surface2)',
    title: 'Pago reembolsado',
    body: 'El dinero se devolvió a tu método de pago.',
  },
};

export default function PaymentResultWrapper() {
  return (
    <Suspense fallback={null}>
      <PaymentResult />
    </Suspense>
  );
}

function PaymentResult() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order');
  const paymentId = params.get('payment');

  const [payment, setPayment] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const p = paymentId ? await getPayment(paymentId) : await getLatestPayment(orderId);
      setPayment(p);
      return p;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [paymentId, orderId]);

  useEffect(() => {
    let alive = true;
    let unsubscribe = () => {};

    (async () => {
      try {
        const [p, o] = await Promise.all([
          paymentId ? getPayment(paymentId) : getLatestPayment(orderId),
          orderId ? getOrder(orderId) : null,
        ]);
        if (!alive) return;
        setPayment(p);
        setOrder(o);

        // Realtime para ver el cambio en cuanto llegue el webhook
        if (p?.id) {
          unsubscribe = subscribeToPayment(p.id, (next) => setPayment(next));
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; unsubscribe(); };
  }, [paymentId, orderId]);

  // Respaldo por si Realtime no llega: consulta cada 4s mientras esté pendiente
  useEffect(() => {
    const status = payment?.status;
    const waiting = !status || status === 'pending' || status === 'processing';

    if (!waiting) {
      clearInterval(pollRef.current);
      return undefined;
    }

    pollRef.current = setInterval(refresh, 4000);
    return () => clearInterval(pollRef.current);
  }, [payment?.status, refresh]);

  const handleRetry = async () => {
    if (!order) return;
    setRetrying(true);
    setError(null);
    try {
      const { redirectTo } = await retryPayment(order, {
        method: payment?.payment_method ?? 'card',
        businessName: order.business?.name,
      });
      if (redirectTo) router.push(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  };

  const status = payment?.status ?? 'pending';
  const view = VIEW[status] ?? VIEW.pending;
  const waiting = status === 'pending' || status === 'processing';
  const canRetry = status === 'failed' || status === 'cancelled';

  return (
    <>
      <div style={S.screen}>

        <div style={{ ...S.icon, background: view.bg }}>
          <span
            className="ms ms-fill"
            style={{
              fontSize: 44, color: view.color,
              animation: waiting ? 'pulse 2s infinite' : 'pop .3s ease both',
            }}
          >
            {view.icon}
          </span>
        </div>

        <h1 style={S.title}>{loading ? 'Consultando tu pago…' : view.title}</h1>
        <p style={S.body}>{loading ? 'Un momento.' : view.body}</p>

        {payment?.failure_reason && status === 'failed' && (
          <div style={S.reason}>
            <span className="ms" style={{ fontSize: 16 }}>info</span>
            {payment.failure_reason}
          </div>
        )}

        {/* Resumen */}
        {order && (
          <div style={S.card}>
            <Row label="Pedido" value={`#${order.order_number}`} />
            {order.business?.name && <Row label="Negocio" value={order.business.name} />}
            <Row label="Total" value={cop(order.total)} strong />
            {payment?.paid_at && (
              <Row
                label="Pagado"
                value={new Date(payment.paid_at).toLocaleString('es-CO', {
                  day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit',
                })}
              />
            )}
          </div>
        )}

        {waiting && !loading && (
          <div style={S.note}>
            <span className="ms" style={{ fontSize: 17, color: 'var(--muted)', flex: 'none' }}>shield</span>
            <span>
              No cierres esta pantalla. Si el pago se aprueba, lo verás aquí
              automáticamente. También puedes revisarlo luego en Mis pedidos.
            </span>
          </div>
        )}

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 17 }}>error</span>
            {error}
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26, width: '100%' }}>
          {status === 'paid' && (
            <button onClick={() => router.push(`/tracking?order=${orderId}`)} style={S.primaryBtn}>
              Seguir mi pedido
            </button>
          )}

          {canRetry && (
            <button onClick={handleRetry} disabled={retrying} style={S.primaryBtn}>
              {retrying ? 'Abriendo pasarela…' : 'Intentar pagar de nuevo'}
            </button>
          )}

          {waiting && (
            <button onClick={refresh} style={S.primaryBtn}>
              Actualizar estado
            </button>
          )}

          <button onClick={() => router.push('/account/orders')} style={S.ghostBtn}>
            Ver mis pedidos
          </button>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, strong }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 700, fontSize: strong ? 15 : 13.5 }}>{value}</span>
    </div>
  );
}

const S = {
  screen: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '32px 24px 40px', textAlign: 'center',
    background: 'var(--bg)', overflowY: 'auto', minHeight: 0,
  },
  icon: {
    width: 92, height: 92, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 25,
    letterSpacing: '-.02em', margin: '22px 0 0',
  },
  body: {
    fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5,
    marginTop: 8, maxWidth: 300,
  },
  reason: {
    display: 'flex', alignItems: 'center', gap: 7, marginTop: 12,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '10px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 700,
  },
  card: {
    width: '100%', maxWidth: 340, marginTop: 24,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 16,
    display: 'flex', flexDirection: 'column', gap: 11, textAlign: 'left',
  },
  note: {
    display: 'flex', gap: 9, marginTop: 18, maxWidth: 340,
    background: 'var(--surface2)', borderRadius: 14, padding: 13,
    fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, textAlign: 'left',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 16,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
  },
  primaryBtn: {
    width: '100%', maxWidth: 340, height: 54, borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)', marginInline: 'auto',
  },
  ghostBtn: {
    width: '100%', maxWidth: 340, height: 48, borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--surface)',
    fontWeight: 700, fontSize: 14, marginInline: 'auto',
  },
};
