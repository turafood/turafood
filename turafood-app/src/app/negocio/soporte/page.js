'use client';

/**
 * SOPORTE
 *
 * Primero lo que se resuelve solo, después el canal directo. No es por
 * ahorrarnos trabajo: quien tiene la respuesta en 10 segundos no
 * necesita esperar una respuesta en 2 horas.
 *
 * Cada solicitud es una conversación con número y estado visible. Saber
 * en qué va tranquiliza más que una promesa de "te respondemos pronto".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES, TICKET_STATUS, FAQ,
  getTickets, getTicketMessages, openTicket, replyTicket, closeTicket,
} from '@/lib/soporte';
import { relativeTime } from '@/lib/format';
import { useBiz } from '../BizContext';

const WHATSAPP = '573137594713';

const time = (iso) => new Date(iso)
  .toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
  .replace('a. m.', 'a.m.').replace('p. m.', 'p.m.');

export default function SoportePage() {
  const { business, toast } = useBiz();

  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('home');    // home | new | thread
  const [openFaq, setOpenFaq] = useState(null);

  const [form, setForm] = useState({ subject: '', category: 'orders', body: '' });
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scroller = useRef(null);

  useEffect(() => {
    let alive = true;
    getTickets()
      .then((rows) => { if (alive) setTickets(rows); })
      .catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    getTicketMessages(active.id).then(setMessages).catch(() => setMessages([]));
  }, [active]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const openTickets = useMemo(
    () => tickets.filter((t) => !['resolved', 'closed'].includes(t.status)),
    [tickets],
  );

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.subject.trim().length < 3) { setError('Escribe un asunto corto que resuma el caso.'); return; }
    if (form.body.trim().length < 10) { setError('Cuéntanos un poco más para poder ayudarte de una.'); return; }

    setBusy(true);
    try {
      const row = await openTicket(form);
      setTickets((l) => [row, ...l]);
      setActive(row);
      setView('thread');
      setForm({ subject: '', category: 'orders', body: '' });
      toast('Solicitud abierta · te respondemos pronto');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || !active || busy) return;

    setBusy(true);
    const temp = { id: `temp-${Date.now()}`, author_role: 'user', body, created_at: new Date().toISOString() };
    setMessages((l) => [...l, temp]);
    setDraft('');
    try {
      const saved = await replyTicket(active.id, body);
      setMessages((l) => l.map((m) => (m.id === temp.id ? saved : m)));
    } catch (err) {
      setMessages((l) => l.filter((m) => m.id !== temp.id));
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    try {
      await closeTicket(active.id);
      setTickets((l) => l.map((t) => (t.id === active.id ? { ...t, status: 'closed' } : t)));
      setActive((a) => ({ ...a, status: 'closed' }));
      toast('Solicitud cerrada');
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------- Conversación ----------
  if (view === 'thread' && active) {
    const st = TICKET_STATUS[active.status] ?? TICKET_STATUS.open;
    const cat = CATEGORIES.find((c) => c.value === active.category) ?? CATEGORIES[6];
    const closed = ['closed', 'resolved'].includes(active.status);

    return (
      <div style={{ maxWidth: 780 }}>
        <button onClick={() => setView('home')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a soporte
        </button>

        <section style={S.glass}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ ...S.catIcon, background: cat.tint }}>
              <span className="ms" style={{ fontSize: 22, color: cat.color }}>{cat.icon}</span>
            </span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={S.threadTitle}>{active.subject}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
                <span style={S.reference}>{active.reference}</span>
                <span style={{ ...S.statusPill, background: st.bg, color: st.color }}>
                  <span className="ms" style={{ fontSize: 14 }}>{st.icon}</span>
                  {st.label}
                </span>
                <span suppressHydrationWarning style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 700 }}>
                  Abierta {relativeTime(active.created_at).toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <div ref={scroller} className="sc" style={S.thread}>
            {messages.map((m) => {
              const team = m.author_role === 'team';
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: team ? 'flex-start' : 'flex-end' }}>
                  {team && (
                    <span style={S.teamTag}>
                      <span className="ms" style={{ fontSize: 13 }}>support_agent</span>
                      Equipo TuraFood
                    </span>
                  )}
                  <div style={team ? S.bubbleTeam : S.bubbleUser}>{m.body}</div>
                  <span suppressHydrationWarning style={S.bubbleTime}>{time(m.created_at)}</span>
                </div>
              );
            })}
          </div>

          {closed ? (
            <div style={S.closedNote}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>lock</span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                Esta solicitud está cerrada. Si vuelve a pasar, abre una nueva y
                menciona el número {active.reference}: así vemos el historial completo.
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, marginTop: 16 }}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escribe tu respuesta"
                  rows={2}
                  style={S.replyInput}
                />
                <button
                  onClick={send}
                  disabled={!draft.trim() || busy}
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
              <button onClick={close} style={S.closeBtn}>Ya se resolvió, cerrar solicitud</button>
            </>
          )}

          {error && <Alert text={error} />}
        </section>
      </div>
    );
  }

  // ---------- Nueva solicitud ----------
  if (view === 'new') {
    return (
      <div style={{ maxWidth: 700 }}>
        <button onClick={() => setView('home')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a soporte
        </button>

        <form onSubmit={create} style={S.glass}>
          <h1 style={S.title}>Cuéntanos qué pasó</h1>
          <p style={S.sub}>
            Entre más concreto, más rápido lo resolvemos. Si es sobre un pedido,
            escribe el número: con eso vamos directo al caso.
          </p>

          <div style={{ marginTop: 22 }}>
            <span style={S.label}>¿De qué se trata?</span>
            <div style={S.catGrid}>
              {CATEGORIES.map((c) => {
                const on = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                    style={{
                      ...S.catCard,
                      borderColor: on ? c.color : 'var(--border)',
                      background: on ? c.tint : 'var(--surface)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 20, color: on ? c.color : 'var(--muted)' }}>
                      {c.icon}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'left', lineHeight: 1.3 }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 20 }}>
            <span style={S.label}>Asunto</span>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ej. No me llegó la liquidación del viernes"
              maxLength={140}
              style={S.input}
            />
          </label>

          <label style={{ display: 'block', marginTop: 16 }}>
            <span style={S.label}>Cuéntanos con detalle</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Qué pasó, cuándo, y qué esperabas que pasara. Si tienes el número del pedido o de la liquidación, inclúyelo."
              rows={6}
              style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>

          {error && <Alert text={error} />}

          <button type="submit" disabled={busy} className="md3-btn" style={S.primary}>
            {busy ? 'Abriendo…' : 'Abrir solicitud'}
            <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
          </button>

          <p style={S.reassure}>
            Te llega el número al instante y puedes seguirla desde aquí. Contestamos
            entre 8:00 a.m. y 10:00 p.m., todos los días.
          </p>
        </form>
      </div>
    );
  }

  // ---------- Inicio ----------
  return (
    <div style={{ maxWidth: 900 }}>
      {/* Encabezado */}
      <section style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: 'relative' }}>
          <span style={S.kicker}>SOPORTE TURAFOOD</span>
          <h1 style={S.heroTitle}>Aquí no te dejamos solo.</h1>
          <p style={S.heroText}>
            Somos un equipo de Buenaventura atendiendo negocios de Buenaventura.
            Escríbenos y te contestamos una persona, no un robot.
          </p>

          <div style={S.channels}>
            <button onClick={() => setView('new')} className="md3-btn" style={S.heroBtn}>
              <span className="ms" style={{ fontSize: 19 }}>add_comment</span>
              Abrir una solicitud
            </button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=Hola,%20soy%20${encodeURIComponent(business?.name ?? 'un negocio')}%20y%20necesito%20ayuda`}
              target="_blank"
              rel="noopener noreferrer"
              style={S.heroGhost}
            >
              <span className="ms" style={{ fontSize: 19 }}>chat</span>
              WhatsApp directo
            </a>
          </div>

          <div style={S.hours}>
            <span className="ms" style={{ fontSize: 16, color: '#7BE0AE' }}>schedule</span>
            Atendemos todos los días de 8:00 a.m. a 10:00 p.m.
          </div>
        </div>
      </section>

      {error && <Alert text={error} />}

      {/* Mis solicitudes */}
      {tickets.length > 0 && (
        <section style={{ ...S.panel, marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={S.panelTitle}>Tus solicitudes</h2>
              <p style={S.panelSub}>
                {openTickets.length
                  ? `${openTickets.length} ${openTickets.length === 1 ? 'abierta' : 'abiertas'}`
                  : 'Todas resueltas'}
              </p>
            </div>
            <button onClick={() => setView('new')} style={S.newBtn}>
              <span className="ms" style={{ fontSize: 18 }}>add</span>
              Nueva
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
            {tickets.map((t) => {
              const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
              const cat = CATEGORIES.find((c) => c.value === t.category) ?? CATEGORIES[6];
              return (
                <button
                  key={t.id}
                  onClick={() => { setActive(t); setView('thread'); }}
                  style={S.ticket}
                >
                  <span style={{ ...S.catIcon, background: cat.tint, width: 42, height: 42 }}>
                    <span className="ms" style={{ fontSize: 20, color: cat.color }}>{cat.icon}</span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
                      {t.subject}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                      <span style={S.reference}>{t.reference}</span>
                      <span style={{ ...S.statusPill, background: st.bg, color: st.color }}>{st.label}</span>
                      <span suppressHydrationWarning style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 700 }}>
                        {relativeTime(t.last_message_at)}
                      </span>
                    </span>
                  </span>

                  {t.unread_for_user > 0 && <span style={S.unread}>{t.unread_for_user}</span>}
                  <span className="ms" style={{ fontSize: 20, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Lo que se resuelve solo */}
      <section style={{ ...S.panel, marginTop: 18 }}>
        <h2 style={S.panelTitle}>Respuestas rápidas</h2>
        <p style={S.panelSub}>Lo que más nos preguntan. Quizá lo tuyo está aquí.</p>

        <div style={S.faqList}>
          {FAQ.map((f) => {
            const on = openFaq === f.id;
            return (
              <div key={f.id} style={{ ...S.faqItem, background: on ? 'var(--bg)' : 'transparent' }}>
                <button onClick={() => setOpenFaq(on ? null : f.id)} style={S.faqBtn} aria-expanded={on}>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>{f.q}</span>
                  <span
                    className="ms"
                    style={{
                      fontSize: 22, color: 'var(--faint)', flex: 'none',
                      transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease',
                    }}
                  >
                    expand_more
                  </span>
                </button>
                {on && <div style={S.faqAnswer}>{f.a}</div>}
              </div>
            );
          })}
        </div>

        <div style={S.faqFoot}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>lightbulb</span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            ¿No está lo tuyo?{' '}
            <button onClick={() => setView('new')} style={S.inlineLink}>Abre una solicitud</button>
            {' '}y lo vemos contigo.
          </span>
        </div>
      </section>

      {loading && (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
          Cargando tus solicitudes…
        </div>
      )}
    </div>
  );
}

function Alert({ text }) {
  return (
    <div style={S.error}>
      <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
      <span>{text}</span>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)',
  },
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 28,
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 66%)', color: '#fff',
    boxShadow: '0 16px 40px rgba(20,16,10,.2)',
  },
  heroGlow: {
    position: 'absolute', right: -60, top: -70, width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(17,178,106,.26),rgba(17,178,106,0) 70%)',
  },
  kicker: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' },
  heroTitle: {
    margin: '10px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 28, lineHeight: 1.12, letterSpacing: '-.03em',
  },
  heroText: {
    margin: '10px 0 0', fontSize: 14, lineHeight: 1.6,
    color: 'rgba(255,255,255,.7)', maxWidth: 520,
  },
  channels: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px',
    borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 14.5, fontWeight: 700, boxShadow: '0 10px 26px rgba(255,68,31,.34)',
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px',
    borderRadius: 999, border: '1px solid rgba(255,255,255,.22)',
    color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
  },
  hours: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 18,
    fontSize: 12.5, color: 'rgba(255,255,255,.62)', fontWeight: 600,
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)',
  },
  /** Superficie translúcida: la usan las vistas de detalle */
  glass: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 22, padding: 24, boxShadow: 'var(--shadow)',
  },
  panelTitle: { margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 },
  panelSub: { margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.02em',
  },
  sub: { margin: '8px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 },
  threadTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, letterSpacing: '-.02em', lineHeight: 1.25,
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700,
    flex: 'none',
  },
  ticket: {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: 14,
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)',
  },
  catIcon: {
    width: 48, height: 48, borderRadius: 15, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reference: {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', padding: '3px 7px',
    borderRadius: 6, background: 'var(--surface2)', color: 'var(--muted)',
  },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 7,
  },
  unread: {
    minWidth: 22, height: 22, padding: '0 6px', borderRadius: 99, flex: 'none',
    background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  catGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10,
  },
  catCard: {
    display: 'flex', alignItems: 'center', gap: 10, padding: 13,
    borderRadius: 14, border: '1.5px solid', minWidth: 0,
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 9 },
  input: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)',
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 50, borderRadius: 15, background: 'var(--primary)',
    color: '#fff', fontSize: 14.5, fontWeight: 700, marginTop: 20,
    boxShadow: '0 10px 24px rgba(255,68,31,.28)',
  },
  reassure: {
    margin: '14px 0 0', fontSize: 11.5, color: 'var(--muted)',
    lineHeight: 1.55, textAlign: 'center',
  },
  thread: {
    display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20,
    paddingTop: 18, borderTop: '1px solid var(--border)',
    maxHeight: 420, overflowY: 'auto',
  },
  teamTag: {
    display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 5,
    fontSize: 10.5, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.03em',
  },
  bubbleTeam: {
    maxWidth: '86%', padding: '13px 15px', fontSize: 13.5, lineHeight: 1.55,
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: '4px 16px 16px 16px',
  },
  bubbleUser: {
    maxWidth: '86%', padding: '13px 15px', fontSize: 13.5, lineHeight: 1.55,
    background: 'var(--primary)', color: '#fff', borderRadius: '16px 16px 4px 16px',
  },
  bubbleTime: {
    fontSize: 10.5, fontWeight: 700, color: 'var(--faint)', margin: '5px 4px 0',
  },
  replyInput: {
    flex: 1, minHeight: 48, borderRadius: 15, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '13px 15px', fontSize: 16, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, color: 'var(--text)',
  },
  send: {
    width: 48, height: 48, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: '100%', height: 42, borderRadius: 13, marginTop: 12,
    fontSize: 12.5, fontWeight: 700, color: 'var(--muted)',
  },
  closedNote: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18,
    padding: 14, borderRadius: 14, background: 'var(--bg)',
  },
  faqList: {
    marginTop: 16, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden',
  },
  faqItem: { borderBottom: '1px solid var(--border)' },
  faqBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 16px',
  },
  faqAnswer: {
    padding: '0 16px 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6,
  },
  faqFoot: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16,
    padding: 14, borderRadius: 14, background: 'var(--bg)',
  },
  inlineLink: {
    color: 'var(--primary)', fontWeight: 800, fontSize: 12.5, padding: 0,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
