'use client';

/**
 * BANDEJA DE MARKETING
 *
 * Todo lo que llega por WhatsApp, Instagram y Facebook en una sola
 * lista. El negocio no tiene que andar saltando entre apps para
 * contestar, que es donde se pierden los clientes.
 *
 * Lo que se escribe queda pendiente hasta que el equipo lo entrega por
 * la red que corresponde. La burbuja lo muestra: mejor un reloj
 * honesto que un visto azul que no existe.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  PLATFORMS, getThreads, getMessages, replyToThread,
} from '@/lib/redes';
import { relativeTime } from '@/lib/format';
import { useBiz } from '../../BizContext';

const QUICK = [
  'Sí, estamos abiertos ahora mismo',
  'Te paso la carta por aquí',
  'Sí hacemos domicilio a esa zona',
  'Dame un momento y te confirmo',
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const time = (iso) => new Date(iso)
  .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  .replace('a. m.', 'a.m.').replace('p. m.', 'p.m.');

export default function InboxPage() {
  const { business } = useBiz();

  const [threads, setThreads] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    getThreads(business.id)
      .then((rows) => {
        if (!alive) return;
        setThreads(rows);
        if (rows.length) setActive(rows[0]);
      })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business]);

  useEffect(() => {
    if (!active) return;
    getMessages(active.id).then(setMessages).catch(() => setMessages([]));
  }, [active]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const channels = useMemo(
    () => Array.from(new Set(threads.map((t) => t.platform))),
    [threads],
  );

  const shown = threads.filter((t) => {
    const byChannel = filter === 'all' || t.platform === filter;
    const q = query.trim().toLowerCase();
    const byText = !q
      || String(t.contact_name ?? '').toLowerCase().includes(q)
      || String(t.contact_handle ?? '').toLowerCase().includes(q);
    return byChannel && byText;
  });

  const send = async (text) => {
    const body = (text ?? draft).trim();
    if (!body || !active || sending) return;

    setSending(true);
    const temp = {
      id: `temp-${Date.now()}`, direction: 'out', body,
      delivery: 'pending', created_at: new Date().toISOString(),
    };
    setMessages((l) => [...l, temp]);
    setDraft('');
    try {
      const saved = await replyToThread(active.id, body);
      setMessages((l) => l.map((m) => (m.id === temp.id ? saved : m)));
      setThreads((l) => l.map((t) => (t.id === active.id ? { ...t, unread_count: 0 } : t)));
    } catch (err) {
      setMessages((l) => l.filter((m) => m.id !== temp.id));
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <Link href="/negocio/redes" style={S.back}>
        <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
        Volver a redes
      </Link>

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="inbox">
        {/* Lista */}
        <aside style={S.list}>
          <div style={S.listHead}>
            <div style={S.search}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar contacto"
                style={S.searchInput}
              />
            </div>

            <div className="hs" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button
                onClick={() => setFilter('all')}
                style={{ ...S.filter, ...(filter === 'all' ? S.filterOn : S.filterOff) }}
              >
                Todos
              </button>
              {channels.map((c) => {
                const meta = PLATFORMS[c];
                const on = filter === c;
                return (
                  <button
                    key={c}
                    onClick={() => setFilter(c)}
                    style={{
                      ...S.filter,
                      ...(on
                        ? { background: meta.color, color: '#fff', border: `1px solid ${meta.color}` }
                        : S.filterOff),
                    }}
                  >
                    <span className="ms" style={{ fontSize: 15 }}>{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sc" style={S.listScroll}>
            {shown.map((t) => {
              const meta = PLATFORMS[t.platform] ?? PLATFORMS.whatsapp;
              const on = active?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t)}
                  style={{ ...S.thread, background: on ? 'var(--bg)' : 'transparent' }}
                >
                  <span style={{ position: 'relative', flex: 'none' }}>
                    <span style={S.threadAvatar}>{initials(t.contact_name)}</span>
                    <span style={{ ...S.threadChannel, background: meta.color }}>
                      <span className="ms" style={{ fontSize: 11, color: '#fff' }}>{meta.icon}</span>
                    </span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: t.unread_count ? 800 : 700 }}>
                      {t.contact_name || t.contact_handle}
                    </span>
                    <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      {t.contact_handle}
                    </span>
                  </span>

                  <span style={{ flex: 'none', textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--faint)', fontWeight: 700 }}>
                      {relativeTime(t.last_message_at)}
                    </span>
                    {t.unread_count > 0 && (
                      <span style={S.unread}>{t.unread_count}</span>
                    )}
                  </span>
                </button>
              );
            })}

            {!loading && shown.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
                {threads.length ? 'Sin conversaciones que coincidan' : 'Todavía no hay mensajes'}
              </div>
            )}
          </div>
        </aside>

        {/* Conversación */}
        <section style={S.chat}>
          {active ? (
            <>
              <header style={S.chatHead}>
                <span style={{ position: 'relative', flex: 'none' }}>
                  <span style={S.threadAvatar}>{initials(active.contact_name)}</span>
                  <span style={{ ...S.threadChannel, background: PLATFORMS[active.platform]?.color }}>
                    <span className="ms" style={{ fontSize: 11, color: '#fff' }}>
                      {PLATFORMS[active.platform]?.icon}
                    </span>
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="tr1" style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>
                    {active.contact_name || active.contact_handle}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                    {PLATFORMS[active.platform]?.label} · {active.contact_handle}
                  </span>
                </span>
              </header>

              <div ref={scroller} className="sc" style={S.messages}>
                {messages.map((m) => {
                  const mine = m.direction === 'out';
                  return (
                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={mine ? S.bubbleOut : S.bubbleIn}>{m.body}</div>
                      <span style={S.bubbleMeta}>
                        {time(m.created_at)}
                        {mine && (
                          <>
                            {' · '}
                            <span className="ms" style={{ fontSize: 13, verticalAlign: 'middle' }}>
                              {m.delivery === 'sent' ? 'done_all' : 'schedule'}
                            </span>
                            {m.delivery === 'sent' ? ' entregado' : ' en cola'}
                          </>
                        )}
                      </span>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', fontSize: 12.5, color: 'var(--muted)' }}>
                    Sin mensajes en esta conversación.
                  </div>
                )}
              </div>

              <footer style={S.composer}>
                <div className="hs" style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
                  {QUICK.map((q) => (
                    <button key={q} onClick={() => send(q)} style={S.quick}>{q}</button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
                    placeholder="Escribe tu respuesta"
                    style={S.input}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!draft.trim() || sending}
                    aria-label="Enviar"
                    style={{
                      ...S.send,
                      background: draft.trim() ? 'var(--primary)' : 'var(--surface2)',
                      color: draft.trim() ? '#fff' : 'var(--faint)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 20 }}>send</span>
                  </button>
                </div>

                <p style={S.note}>
                  Tu respuesta queda en cola y la entregamos por {PLATFORMS[active.platform]?.label}.
                  Cuando conectemos la cuenta sale al instante.
                </p>
              </footer>
            </>
          ) : (
            <div style={S.noThread}>
              <span className="ms" style={{ fontSize: 34, color: 'var(--faint)' }}>forum</span>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>Elige una conversación</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', textDecoration: 'none',
  },
  list: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', minWidth: 0,
  },
  listHead: { flex: 'none', padding: 14, borderBottom: '1px solid var(--border)' },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, height: 42,
    background: 'var(--bg)', borderRadius: 12, padding: '0 12px',
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 16, minWidth: 0,
  },
  filter: {
    display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px',
    borderRadius: 999, fontSize: 12, fontWeight: 700, flex: 'none', whiteSpace: 'nowrap',
  },
  filterOn: { background: 'var(--text)', color: '#fff', border: '1px solid var(--text)' },
  filterOff: { background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' },
  listScroll: { flex: 1, overflowY: 'auto', minHeight: 0, padding: 8 },
  thread: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: 11, borderRadius: 14, marginBottom: 2,
  },
  threadAvatar: {
    width: 42, height: 42, borderRadius: '50%', background: 'var(--surface2)',
    color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 800,
  },
  threadChannel: {
    position: 'absolute', right: -2, bottom: -2, width: 19, height: 19,
    borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', border: '2px solid var(--surface)',
  },
  unread: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 19, height: 19, padding: '0 6px', borderRadius: 99, marginTop: 4,
    background: 'var(--primary)', color: '#fff', fontSize: 10.5, fontWeight: 800,
  },
  chat: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', minWidth: 0,
  },
  chatHead: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
    padding: 16, borderBottom: '1px solid var(--border)',
  },
  messages: {
    flex: 1, overflowY: 'auto', minHeight: 0, padding: 18,
    display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg)',
  },
  bubbleIn: {
    maxWidth: '78%', padding: '11px 14px', fontSize: 13.5, lineHeight: 1.5,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px 16px 16px 5px',
  },
  bubbleOut: {
    maxWidth: '78%', padding: '11px 14px', fontSize: 13.5, lineHeight: 1.5,
    background: 'var(--primary)', color: '#fff', borderRadius: '16px 16px 5px 16px',
  },
  bubbleMeta: {
    fontSize: 10.5, fontWeight: 700, color: 'var(--faint)', margin: '4px 6px 0',
  },
  composer: {
    flex: 'none', padding: '12px 16px 16px', borderTop: '1px solid var(--border)',
  },
  quick: {
    flex: 'none', height: 32, padding: '0 12px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  input: {
    flex: 1, height: 46, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 16, outline: 'none', minWidth: 0,
  },
  send: {
    width: 46, height: 46, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: {
    margin: '10px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5,
  },
  noThread: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 40, textAlign: 'center',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
