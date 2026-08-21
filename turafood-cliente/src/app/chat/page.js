'use client';

/**
 * CHAT DEL PEDIDO
 *
 * Los mensajes viven en la tabla `messages`, atada al pedido. Solo
 * pueden leerlos y escribirlos quienes están involucrados: cliente,
 * negocio y repartidor asignado (lo aplica la política RLS, no esta
 * pantalla).
 *
 * Los mensajes nuevos llegan por Realtime, sin recargar.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { getMessages, sendMessage, subscribeToMessages, getOrder } from '@/lib/data';
import RouteSkeleton from '../components/RouteSkeleton';
import { useThemeStore } from '@/store/useThemeStore';

const QUICK_REPLIES = [
  'Ya voy saliendo',
  '¿Cuánto falta?',
  'Déjalo en portería',
  'Toca el timbre',
];

const hhmm = (iso) => new Date(iso).toLocaleTimeString('es-CO', {
  hour: 'numeric', minute: '2-digit', hour12: true,
});

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={5} height={64} />}>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order');

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [msgs, setMsgs] = useState([]);
  const [order, setOrder] = useState(null);
  const [me, setMe] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [rows, ord] = await Promise.all([
        getMessages(orderId),
        orderId ? getOrder(orderId) : null,
      ]);
      setMsgs(rows);
      setOrder(ord);

      if (isConfigured()) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setMe(user?.id ?? null);
      } else {
        setMe('me');
      }
    } catch (err) {
      setError(err.message);
    }
  }, [orderId]);

  useEffect(() => {
    load();
    if (!orderId) return undefined;

    const unsubscribe = subscribeToMessages(orderId, (msg) => {
      setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    });
    return unsubscribe;
  }, [orderId, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const send = async (value) => {
    const clean = (value ?? text).trim();
    if (!clean || sending) return;

    setSending(true);
    setError(null);
    try {
      const msg = await sendMessage(orderId, clean);
      // En modo local no hay Realtime: lo agregamos a mano
      setMsgs((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const courierName = order?.courier?.full_name ?? 'Yeison Mosquera (Repartidor Oficial)';
  const courierPlate = order?.courier?.plate ?? 'WQR-18C';

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: '100vh', padding: '12px 16px 24px' }}>
      
      {/* Contenedor Centrado para Desktop y Móvil */}
      <div style={{
        width: '100%', maxWidth: 720, margin: '0 auto', flex: 1,
        display: 'flex', flexDirection: 'column', background: 'var(--surface)',
        borderRadius: 28, border: '1px solid var(--border)', boxShadow: '0 12px 36px rgba(0,0,0,0.05)',
        overflow: 'hidden', minHeight: 0,
      }}>

        {/* Cabecera */}
        <div style={S.header}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver al seguimiento">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={S.avatar}>
              <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>person</span>
            </div>
            <span style={S.online} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tr1" style={{ fontWeight: 800, fontSize: 15 }}>{courierName}</div>
            <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginTop: 1 }}>
              En línea · Moto {courierPlate ? `Placa ${courierPlate}` : ''}
            </div>
          </div>
          
          <button
            onClick={toggleTheme}
            style={S.backBtn}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label="Cambiar tema"
          >
            <span className="ms" style={{ fontSize: 19, color: theme === 'dark' ? '#FFB800' : 'var(--text)' }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button
            onClick={() => window.open('tel:+573026886449', '_self')}
            style={S.callBtn}
            aria-label="Llamar al repartidor"
          >
            <span className="ms" style={{ fontSize: 20 }}>call</span>
          </button>
        </div>

        {/* Mensajes */}
        <div className="sc" style={S.thread}>
          {order && (
            <div style={S.orderCard}>
              <span style={{
                ...S.orderThumb,
                backgroundImage: `url('${order.business?.cover_url ?? '/images/steak-ribeye.jpg'}')`,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
                  PEDIDO #{order.order_number}
                </span>
                <span className="tr1" style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  {order.business?.name ?? ''}
                </span>
              </span>
              <button onClick={() => router.push(`/tracking?order=${order.id}`)} style={S.viewBtn}>
                Ver
              </button>
            </div>
          )}

          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 20px' }}>
              <span className="ms" style={{ fontSize: 28, color: 'var(--faint)' }}>chat_bubble</span>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
                Escríbele a tu repartidor si necesitas darle alguna indicación.
              </div>
            </div>
          )}

          {msgs.map((m) => {
            const mine = m.sender_id === me;
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <div style={{ ...S.bubble, ...(mine ? S.bubbleMine : S.bubbleTheirs) }}>
                  {m.body}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--faint)', margin: '4px 6px 0' }}>
                  {hhmm(m.created_at)}
                </span>
              </div>
            );
          })}

          <div ref={endRef} />
        </div>

        {/* Redactar */}
        <div style={S.composer}>
          {error && (
            <div style={S.error}>
              <span className="ms" style={{ fontSize: 16 }}>error</span>
              {error}
            </div>
          )}

          <div className="hs" style={{ display: 'flex', gap: 7, margin: '0 -16px 10px', padding: '0 16px' }}>
            {QUICK_REPLIES.map((q) => (
              <button key={q} onClick={() => send(q)} disabled={sending} style={S.quick}>{q}</button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 9 }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe un mensaje"
              aria-label="Mensaje"
              maxLength={1000}
              style={S.input}
            />
            <button type="submit" disabled={!text.trim() || sending} style={S.sendBtn} aria-label="Enviar mensaje">
              <span className="ms" style={{ fontSize: 20, color: '#fff' }}>send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const S = {
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 11,
    padding: '0 16px 13px', borderBottom: '1px solid var(--border)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  avatar: {
    width: 42, height: 42, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  online: {
    position: 'absolute', right: 0, bottom: 1, width: 11, height: 11,
    borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--bg)',
  },
  callBtn: {
    width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  thread: {
    flex: 1, overflowY: 'auto', padding: '16px 16px 10px',
    display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0,
  },
  orderCard: {
    display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 16,
    padding: '11px 13px', marginBottom: 4,
  },
  orderThumb: {
    width: 36, height: 36, borderRadius: 10, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
    backgroundColor: 'var(--surface2)',
  },
  viewBtn: {
    flex: 'none', height: 32, padding: '0 13px', borderRadius: 999,
    background: 'var(--surface2)', fontSize: 12, fontWeight: 700,
  },
  bubble: {
    maxWidth: '80%', padding: '10px 14px', fontSize: 14, lineHeight: 1.45,
  },
  bubbleMine: {
    background: 'var(--primary)', color: '#fff',
    borderRadius: '18px 18px 5px 18px',
  },
  bubbleTheirs: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '18px 18px 18px 5px',
  },
  composer: {
    flex: 'none', borderTop: '1px solid var(--border)',
    background: 'var(--surface)', padding: '11px 16px 18px',
  },
  quick: {
    flex: 'none', height: 34, padding: '0 14px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  input: {
    flex: 1, height: 46, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 14.5,
    outline: 'none', minWidth: 0,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: '50%', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '9px 12px', borderRadius: 11, fontSize: 12, fontWeight: 600,
  },
};
