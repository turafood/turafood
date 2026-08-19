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
import Compromiso24h from '../../components/Compromiso24h';

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
    // Reducimos las opciones visuales para que sea "fácil esa parte"
    const simpleCats = CATEGORIES.filter(c => ['orders', 'payouts', 'catalog', 'technical', 'other'].includes(c.value));

    return (
      <div style={{ maxWidth: 700 }}>
        <button onClick={() => setView('home')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a soporte
        </button>

        <form onSubmit={create} style={S.glassCard}>
          <h1 style={S.title}>Cuéntanos qué pasó</h1>
          <p style={S.sub}>
            Entre más concreto, más rápido lo resolvemos.
          </p>

          <div style={{ margin: '16px 0 24px' }}>
            <Compromiso24h />
          </div>

          <div>
            <span style={S.label}>¿De qué se trata?</span>
            <div style={S.catGrid}>
              {simpleCats.map((c) => {
                const on = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: c.value }))}
                    style={{
                      ...S.catCard,
                      borderColor: on ? c.color : 'rgba(0,0,0,0.06)',
                      background: on ? c.tint : 'var(--surface)',
                      boxShadow: on ? `0 4px 12px ${c.color}22` : '0 2px 4px rgba(0,0,0,0.02)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 20, color: on ? c.color : 'var(--muted)' }}>
                      {c.icon}
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'left', lineHeight: 1.3, color: on ? c.color : 'var(--text)' }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 24 }}>
            <span style={S.label}>Asunto</span>
            <input
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ej. Problema con la liquidación"
              maxLength={140}
              style={S.input}
            />
          </label>

          <label style={{ display: 'block', marginTop: 20 }}>
            <span style={S.label}>Cuéntanos con detalle</span>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Qué pasó, cuándo, y qué esperabas..."
              rows={4}
              style={{ ...S.input, height: 'auto', padding: '16px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>

          {error && <Alert text={error} />}

          <button type="submit" disabled={busy} className="md3-btn" style={S.primary}>
            {busy ? 'Enviando...' : 'Abrir solicitud'}
            <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
          </button>
        </form>
      </div>
    );
  }

  // ---------- Inicio ----------
  return (
    <div style={{ maxWidth: 900 }}>
      {/* Encabezado PRO Glassmorphism */}
      <section style={S.heroGlass}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={S.kickerPill}><span className="ms" style={{ fontSize: 14 }}>support_agent</span> Soporte TuraFood</span>
          </div>
          <h1 style={S.heroTitle}>Aquí no te dejamos solo.</h1>
          <p style={S.heroText}>
            Escríbenos y te contestará una persona, no un robot. Resoluciones rápidas y directas.
          </p>

          <div style={S.channels}>
            <button onClick={() => setView('new')} className="md3-btn" style={S.heroBtn}>
              Abrir una solicitud
              <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
            </button>
            <a
              href={`https://wa.me/${WHATSAPP}?text=Hola,%20soy%20${encodeURIComponent(business?.name ?? 'un negocio')}%20y%20necesito%20ayuda`}
              target="_blank"
              rel="noopener noreferrer"
              style={S.heroGhost}
            >
              <span className="ms" style={{ fontSize: 19, color: 'var(--green)' }}>whatsapp</span>
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {error && <Alert text={error} />}

      {/* Mis solicitudes con Semáforo */}
      {tickets.length > 0 && (
        <section style={{ ...S.panel, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={S.panelTitle}>Tus solicitudes</h2>
              <p style={S.panelSub}>Historial de casos</p>
            </div>
            <button onClick={() => setView('new')} style={S.newBtn}>
              <span className="ms" style={{ fontSize: 18 }}>add</span>
              Nueva
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            {tickets.map((t) => {
              const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
              const cat = CATEGORIES.find((c) => c.value === t.category) ?? CATEGORIES[6];
              
              // Lógica de semáforo visual
              const isOpen = ['open', 'in_progress', 'waiting'].includes(t.status);
              const progressPct = t.status === 'open' ? 33 : t.status === 'in_progress' ? 66 : t.status === 'waiting' ? 66 : 100;
              const barColor = isOpen ? 'var(--primary)' : 'var(--green)';

              return (
                <button
                  key={t.id}
                  onClick={() => { setActive(t); setView('thread'); }}
                  style={S.ticket}
                >
                  <span style={{ ...S.catIcon, background: cat.tint, width: 46, height: 46 }}>
                    <span className="ms" style={{ fontSize: 22, color: cat.color }}>{cat.icon}</span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.01em' }}>
                      {t.subject}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={S.reference}>#{t.reference}</span>
                      <span style={{ ...S.statusPill, background: st.bg, color: st.color }}>
                        <span className="ms" style={{ fontSize: 12 }}>{st.icon}</span>
                        {st.label}
                      </span>
                      <span suppressHydrationWarning style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                        {relativeTime(t.last_message_at)}
                      </span>
                    </span>
                    {/* Semáforo visual */}
                    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                      </div>
                    </div>
                  </span>

                  {t.unread_for_user > 0 && <span style={S.unread}>{t.unread_for_user}</span>}
                  <span className="ms" style={{ fontSize: 24, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Lo que se resuelve solo */}
      <section style={{ ...S.panel, marginTop: 24 }}>
        <h2 style={S.panelTitle}>Respuestas rápidas</h2>
        <p style={S.panelSub}>Quizá lo tuyo está aquí.</p>

        <div style={S.faqList}>
          {FAQ.map((f) => {
            const on = openFaq === f.id;
            return (
              <div key={f.id} style={{ ...S.faqItem, background: on ? 'var(--bg)' : 'transparent' }}>
                <button onClick={() => setOpenFaq(on ? null : f.id)} style={S.faqBtn} aria-expanded={on}>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 700 }}>{f.q}</span>
                  <span
                    className="ms"
                    style={{
                      fontSize: 22, color: on ? 'var(--primary)' : 'var(--faint)', flex: 'none',
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
      </section>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 4, marginTop: 24 }}>
          <span className="sk" style={{ display: 'block', height: 76, borderRadius: 16 }} />
          <span className="sk" style={{ display: 'block', height: 76, borderRadius: 16 }} />
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
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 20,
    fontSize: 13.5, fontWeight: 800, color: 'var(--muted)',
    padding: '8px 16px', borderRadius: 12, background: 'var(--surface)',
    border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  heroGlass: {
    position: 'relative', borderRadius: 28, padding: 32,
    background: 'linear-gradient(145deg, var(--surface) 0%, rgba(255,255,255,0.7) 100%)',
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,1)',
    overflow: 'hidden', backdropFilter: 'blur(10px)',
  },
  kickerPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', borderRadius: 99, background: 'var(--bg)',
    fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', color: 'var(--text)',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  heroTitle: {
    margin: '12px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 32, lineHeight: 1.1, letterSpacing: '-.03em', color: 'var(--text)',
  },
  heroText: {
    margin: '12px 0 0', fontSize: 15, lineHeight: 1.5,
    color: 'var(--muted)', maxWidth: 480, fontWeight: 500,
  },
  channels: { display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 24px',
    borderRadius: 16, background: 'var(--text)', color: '#fff',
    fontSize: 15, fontWeight: 800, boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 22px',
    borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)', background: 'var(--surface)',
    color: 'var(--text)', fontSize: 14.5, fontWeight: 800, textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
  },
  panel: {
    background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: 28, padding: 28, boxShadow: '0 2px 14px rgba(0,0,0,0.02)',
  },
  glassCard: {
    background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: 28, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  glass: {
    background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: 24, padding: 24, boxShadow: '0 2px 14px rgba(0,0,0,0.02)',
  },
  panelTitle: { margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.01em' },
  panelSub: { margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', fontWeight: 500 },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 26, letterSpacing: '-.02em',
  },
  sub: { margin: '10px 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 },
  threadTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 22, letterSpacing: '-.02em', lineHeight: 1.25,
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 18px',
    borderRadius: 14, border: '1px solid rgba(0,0,0,0.06)', background: 'var(--bg)',
    fontSize: 13.5, fontWeight: 800, flex: 'none', color: 'var(--text)',
  },
  ticket: {
    display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%', padding: 20,
    borderRadius: 20, background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.05)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.01)', transition: 'transform 0.2s, box-shadow 0.2s',
  },
  catIcon: {
    width: 48, height: 48, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reference: {
    fontSize: 11, fontWeight: 800, letterSpacing: '.04em', padding: '4px 8px',
    borderRadius: 8, background: 'var(--bg)', color: 'var(--muted)', border: '1px solid rgba(0,0,0,0.04)',
  },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
  },
  unread: {
    minWidth: 24, height: 24, padding: '0 8px', borderRadius: 99, flex: 'none',
    background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  catGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12,
  },
  catCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: '16px 14px',
    borderRadius: 18, border: '1px solid', minWidth: 0, transition: 'all 0.2s',
  },
  label: { display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12 },
  input: {
    width: '100%', height: 52, borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 15.5, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
    transition: 'border-color 0.2s',
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 54, borderRadius: 16, background: 'var(--text)',
    color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 24,
    boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
  },
  reassure: {
    margin: '16px 0 0', fontSize: 12.5, color: 'var(--muted)',
    lineHeight: 1.5, textAlign: 'center',
  },
  thread: {
    display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24,
    paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.04)',
    maxHeight: 450, overflowY: 'auto',
  },
  teamTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6,
    fontSize: 11, fontWeight: 800, color: 'var(--text)', letterSpacing: '.02em',
  },
  bubbleTeam: {
    maxWidth: '86%', padding: '15px 18px', fontSize: 14.5, lineHeight: 1.55,
    background: 'var(--bg)', border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: '6px 20px 20px 20px', color: 'var(--text)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  bubbleUser: {
    maxWidth: '86%', padding: '15px 18px', fontSize: 14.5, lineHeight: 1.55,
    background: 'var(--text)', color: '#fff', borderRadius: '20px 20px 6px 20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  },
  bubbleTime: {
    fontSize: 11, fontWeight: 700, color: 'var(--faint)', margin: '6px 6px 0',
  },
  replyInput: {
    flex: 1, minHeight: 52, borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)',
    background: 'var(--bg)', padding: '15px 18px', fontSize: 15.5, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5, color: 'var(--text)',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
  },
  send: {
    width: 52, height: 52, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closeBtn: {
    width: '100%', height: 46, borderRadius: 14, marginTop: 16,
    fontSize: 13, fontWeight: 800, color: 'var(--muted)', background: 'var(--bg)',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  closedNote: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 24,
    padding: 16, borderRadius: 16, background: 'var(--bg)', border: '1px solid rgba(0,0,0,0.04)',
  },
  faqList: {
    marginTop: 20, border: '1px solid rgba(0,0,0,0.04)', borderRadius: 20, overflow: 'hidden',
  },
  faqItem: { borderBottom: '1px solid rgba(0,0,0,0.04)' },
  faqBtn: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 20px',
  },
  faqAnswer: {
    color: 'var(--primary)', fontWeight: 800, fontSize: 12.5, padding: 0,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
