'use client';

/**
 * CHAT CON EL CLIENTE
 * Conversión de `isChat` (línea 518) del mockup del Repartidor.
 *
 * Los mensajes viven en `messages` y solo los ven quienes están en el
 * pedido (política RLS `can_access_order`). Llegan por Realtime, así
 * que no hay que recargar.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { getMessages, sendMessage, subscribeToMessages } from '@/lib/repartidor';
import { useRider } from '../RiderContext';

const QUICK = [
  'Ya voy llegando',
  'Estoy en la portería',
  '¿Me confirmas el apartamento?',
  'Salgo del negocio ahora',
];

const time = (iso) => new Date(iso)
  .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  .replace('a. m.', 'a.m.').replace('p. m.', 'p.m.');

export default function ChatPage() {
  const router = useRouter();
  const { active, loading } = useRider();

  const [me, setMe] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    let alive = true;
    createClient().auth.getUser().then(({ data }) => {
      if (alive) setMe(data?.user?.id ?? 'me');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loading && !active) router.replace('/repartidor');
  }, [loading, active, router]);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    getMessages(active.id)
      .then((rows) => { if (alive) setMsgs(rows); })
      .catch((err) => { if (alive) setError(err.message); });

    const off = subscribeToMessages(active.id, (m) => {
      setMsgs((list) => (list.some((x) => x.id === m.id) ? list : [...list, m]));
    });
    return () => { alive = false; off(); };
  }, [active]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  if (!active) {
    return <div style={S.loading}>{loading ? 'Cargando…' : 'No tienes ninguna entrega en curso.'}</div>;
  }

  const push = async (text) => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    // Se pinta enseguida; si falla se quita
    const temp = { id: `temp-${Date.now()}`, sender_id: me, body, created_at: new Date().toISOString() };
    setMsgs((list) => [...list, temp]);
    setDraft('');
    try {
      const saved = await sendMessage(active.id, body);
      setMsgs((list) => list.map((m) => (m.id === temp.id ? saved : m)));
    } catch (err) {
      setMsgs((list) => list.filter((m) => m.id !== temp.id));
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header style={S.header}>
        <button onClick={() => router.push('/repartidor/activo')} style={S.back} aria-label="Volver">
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={S.avatar}>
            <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>person</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tr1" style={{ fontWeight: 700, fontSize: 15 }}>
            {active.customer?.full_name ?? 'Cliente'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, marginTop: 1 }}>
            Cliente · #{active.order_number}
          </div>
        </div>
        <a href={`tel:${active.customer?.phone ?? ''}`} style={S.call} aria-label="Llamar">
          <span className="ms" style={{ fontSize: 20 }}>call</span>
        </a>
      </header>

      <div ref={scroller} className="sc" style={S.scroll}>
        <div style={S.notice}>Los mensajes se borran 24 h después de la entrega</div>

        {msgs.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
              <div style={mine ? S.bubbleMe : S.bubbleThem}>{m.body}</div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--faint)', margin: '4px 6px 0' }}>
                {time(m.created_at)}
              </span>
            </div>
          );
        })}

        {msgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 13, color: 'var(--muted)' }}>
            Todavía no hay mensajes. Avísale que ya vas en camino.
          </div>
        )}
      </div>

      <div style={S.footer}>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>
            {error}
          </div>
        )}
        <div className="hs" style={{ display: 'flex', gap: 7, margin: '0 -16px 10px', padding: '0 16px' }}>
          {QUICK.map((q) => (
            <button key={q} onClick={() => push(q)} style={S.quick}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') push(draft); }}
            placeholder="Escribe un mensaje"
            style={S.input}
          />
          <button
            onClick={() => push(draft)}
            aria-label="Enviar"
            style={{
              ...S.send,
              ...(draft.trim()
                ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 6px 16px rgba(255,68,31,.32)' }
                : { background: 'var(--surface2)', color: 'var(--faint)' }),
            }}
          >
            <span className="ms" style={{ fontSize: 21 }}>send</span>
          </button>
        </div>
      </div>
    </>
  );
}

const S = {
  loading: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, fontSize: 13.5, color: 'var(--muted)', textAlign: 'center',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 11,
    padding: '18px 16px 13px', borderBottom: '1px solid var(--border)',
  },
  back: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  avatar: {
    width: 42, height: 42, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  call: {
    width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 'none', color: 'var(--text)',
  },
  scroll: {
    flex: 1, overflowY: 'auto', padding: '16px 16px 10px', minHeight: 0,
    display: 'flex', flexDirection: 'column', gap: 9,
  },
  notice: {
    alignSelf: 'center', fontSize: 11, fontWeight: 700, color: 'var(--faint)',
    background: 'var(--surface2)', padding: '6px 13px', borderRadius: 999, marginBottom: 4,
  },
  bubbleMe: {
    maxWidth: '80%', padding: '10px 14px', fontSize: 14, lineHeight: 1.45,
    background: 'var(--primary)', color: '#fff', borderRadius: '18px 18px 5px 18px',
  },
  bubbleThem: {
    maxWidth: '80%', padding: '10px 14px', fontSize: 14, lineHeight: 1.45,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '18px 18px 18px 5px',
  },
  footer: {
    flex: 'none', borderTop: '1px solid var(--border)', background: 'var(--surface)',
    padding: '11px 16px 18px',
  },
  quick: {
    flex: 'none', height: 34, padding: '0 14px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  input: {
    flex: 1, height: 46, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 16, outline: 'none', minWidth: 0,
  },
  send: {
    width: 46, height: 46, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
