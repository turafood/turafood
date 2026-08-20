import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIES, TICKET_STATUS, FAQ,
  getTickets, getTicketMessages, openTicket, replyTicket, closeTicket,
} from '@/lib/soporte';
import { relativeTime } from '@/lib/format';
import { useBiz } from '../BizContext';
import Compromiso24h from '../../components/Compromiso24h';
import HeaderHero from '../../components/HeaderHero';

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
  
  // Efecto "vivo"
  const [liveDot, setLiveDot] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setLiveDot(v => !v), 2000);
    return () => clearInterval(timer);
  }, []);

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
  }, [messages, view]);

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

  // ---------- Conversación (Chat UI PRO) ----------
  if (view === 'thread' && active) {
    const st = TICKET_STATUS[active.status] ?? TICKET_STATUS.open;
    const cat = CATEGORIES.find((c) => c.value === active.category) ?? CATEGORIES[6];
    const closed = ['closed', 'resolved'].includes(active.status);

    return (
      <div style={{ maxWidth: 1000 }}>
        <style>{`
          .glass-panel {
            background: rgba(20,20,20,0.65);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 28px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
            padding: 30px;
          }
          .chat-container {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 24px;
            align-items: start;
          }
          @media (max-width: 800px) {
            .chat-container { grid-template-columns: 1fr; }
          }
          ::-webkit-scrollbar { width: 8px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 8px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setView('home')} style={S.back}>
            <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
            Volver a soporte
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(255,255,255,0.05)' }}>
             <div className="pulse-active" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Chat en vivo</span>
          </div>
        </div>

        <div className="chat-container">
          <section className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '70vh', minHeight: 500 }}>
            {/* Cabecera del Chat */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
               <span style={{ ...S.catIcon, background: `color-mix(in srgb, ${cat.color} 20%, transparent)` }}>
                <span className="ms" style={{ fontSize: 24, color: cat.color }}>{cat.icon}</span>
              </span>
              <div>
                 <h1 style={{ ...S.threadTitle, color: '#fff' }}>{active.subject}</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                   <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Soporte con el equipo de TuraFood</span>
                 </div>
              </div>
            </div>

            {/* Mensajes */}
            <div ref={scroller} className="sc" style={{ ...S.thread, flex: 1, borderTop: 'none', padding: '24px', margin: 0 }}>
              {messages.map((m) => {
                const team = m.author_role === 'team';
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: team ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
                    {team && (
                      <span style={{ ...S.teamTag, color: 'rgba(255,255,255,0.7)' }}>
                        <span className="ms" style={{ fontSize: 14 }}>support_agent</span>
                        Equipo TuraFood
                      </span>
                    )}
                    <div style={team ? S.bubbleTeam : S.bubbleUser}>{m.body}</div>
                    <span suppressHydrationWarning style={{ ...S.bubbleTime, color: 'rgba(255,255,255,0.3)' }}>{time(m.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* Input / Note */}
            <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {closed ? (
                <div style={S.closedNote}>
                  <span className="ms" style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', flex: 'none' }}>lock_clock</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    Esta solicitud está cerrada. Si vuelve a pasar, abre una nueva y menciona el número <b>{active.reference}</b>.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={1}
                    style={{ ...S.replyInput, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim() || busy}
                    aria-label="Enviar"
                    style={{
                      ...S.send,
                      background: draft.trim() ? '#F2D399' : 'rgba(255,255,255,0.05)',
                      color: draft.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 22 }}>send</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar de Detalles (Derecha) */}
          <section className="glass-panel" style={{ padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '.05em', marginBottom: 16 }}>DETALLES DEL TICKET</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>ID Ticket</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginTop: 4 }}>#{active.reference}</div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Categoría</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="ms" style={{ fontSize: 16, color: cat.color }}>{cat.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{cat.label}</span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Estado</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: `color-mix(in srgb, ${st.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)`, padding: '6px 12px', borderRadius: 12 }}>
                  <span className="ms pulse-active" style={{ fontSize: 14, color: st.color }}>{st.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{st.label}</span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Fecha de Creación</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 4 }}>
                   {new Date(active.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {!closed && (
              <button onClick={close} style={S.closeBtn}>Marcar como resuelto</button>
            )}

            {error && <Alert text={error} />}
          </section>
        </div>
      </div>
    );
  }

  // ---------- Nueva solicitud ----------
  if (view === 'new') {
    const simpleCats = CATEGORIES.filter(c => ['orders', 'payouts', 'catalog', 'technical', 'other'].includes(c.value));

    return (
      <div style={{ maxWidth: 740 }}>
        <style>{`
          .glass-panel {
            background: rgba(20,20,20,0.65);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 28px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
            padding: 36px;
          }
          .input-pro:focus {
            border-color: #D99A15 !important;
            box-shadow: 0 0 0 3px rgba(217,154,21,0.2) !important;
          }
        `}</style>
        <button onClick={() => setView('home')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a soporte
        </button>

        <form onSubmit={create} className="glass-panel">
          <h1 style={{ ...S.title, color: '#fff' }}>Cuéntanos qué pasó</h1>
          <p style={{ ...S.sub, color: 'rgba(255,255,255,0.6)' }}>
            Entre más concreto, más rápido lo resolvemos.
          </p>

          <div style={{ margin: '24px 0 32px' }}>
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
                      borderColor: on ? c.color : 'rgba(255,255,255,0.06)',
                      background: on ? `color-mix(in srgb, ${c.color} 15%, transparent)` : 'rgba(255,255,255,0.03)',
                      boxShadow: on ? `0 4px 16px ${c.color}22` : 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 24, color: on ? c.color : 'rgba(255,255,255,0.3)' }}>
                      {c.icon}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'left', lineHeight: 1.3, color: on ? c.color : 'rgba(255,255,255,0.8)' }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 32 }}>
            <span style={S.label}>Asunto</span>
            <input
              className="input-pro"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ej. Problema con la liquidación"
              maxLength={140}
              style={{ ...S.input, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 24 }}>
            <span style={S.label}>Cuéntanos con detalle</span>
            <textarea
              className="input-pro"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Qué pasó, cuándo, y qué esperabas..."
              rows={4}
              style={{ ...S.input, background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', height: 'auto', padding: '18px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>

          {error && <Alert text={error} />}

          <button type="submit" disabled={busy} style={S.primary}>
            {busy ? 'Enviando al equipo...' : 'Abrir solicitud de soporte'}
            <span className="ms pulse-active" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </form>
      </div>
    );
  }

  // ---------- Inicio ----------
  return (
    <div style={{ maxWidth: 1000 }}>
       <style>{`
        .glass-panel {
          background: rgba(20,20,20,0.65);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 28px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 30px;
        }
        @keyframes pulse-dot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-active { animation: pulse-dot 2s infinite; }
        .ticket-hover:hover {
           background: rgba(255,255,255,0.05) !important;
           transform: translateY(-2px);
        }
      `}</style>
      
      <HeaderHero
        title="Aquí no te dejamos solo."
        subtitle="Escríbenos y te contestará una persona, no un robot. Resoluciones rápidas y directas."
        images={[
          'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      <div style={S.channels}>
        <button onClick={() => setView('new')} style={{ ...S.heroBtn, background: 'linear-gradient(120deg, #D99A15, #F2D399)', color: '#000' }}>
          <span className="ms pulse-active" style={{ fontSize: 22 }}>support_agent</span>
          Abrir un Ticket de Chat
        </button>
        <a
          href={`https://wa.me/${WHATSAPP}?text=Hola,%20soy%20${encodeURIComponent(business?.name ?? 'un negocio')}%20y%20necesito%20ayuda`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...S.heroGhost, background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)' }}
        >
          <span className="ms pulse-active" style={{ fontSize: 20 }}>whatsapp</span>
          WhatsApp Directo
        </a>
      </div>

      {error && <Alert text={error} />}

      {/* Mis solicitudes con Semáforo */}
      {tickets.length > 0 && (
        <section className="glass-panel" style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ ...S.panelTitle, color: '#fff' }}>Tus solicitudes de chat</h2>
              <p style={{ ...S.panelSub, color: 'rgba(255,255,255,0.5)' }}>Historial interactivo de casos</p>
            </div>
            <button onClick={() => setView('new')} style={{ ...S.newBtn, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="ms" style={{ fontSize: 20 }}>add</span>
              Nuevo
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
            {tickets.map((t) => {
              const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
              const cat = CATEGORIES.find((c) => c.value === t.category) ?? CATEGORIES[6];
              
              const isOpen = ['open', 'in_progress', 'waiting'].includes(t.status);
              const progressPct = t.status === 'open' ? 33 : t.status === 'in_progress' ? 66 : t.status === 'waiting' ? 66 : 100;
              const barColor = isOpen ? '#D99A15' : '#7BE8B0';

              return (
                <button
                  key={t.id}
                  onClick={() => { setActive(t); setView('thread'); }}
                  className="ticket-hover"
                  style={{ ...S.ticket, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  <span style={{ ...S.catIcon, background: `color-mix(in srgb, ${cat.color} 20%, transparent)`, width: 52, height: 52 }}>
                    <span className="ms" style={{ fontSize: 26, color: cat.color }}>{cat.icon}</span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>
                      {t.subject}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                      <span style={{ ...S.reference, background: 'rgba(0,0,0,0.3)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>#{t.reference}</span>
                      <span style={{ ...S.statusPill, background: `color-mix(in srgb, ${st.color} 20%, transparent)`, color: st.color, border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)` }}>
                        <span className="ms" style={{ fontSize: 14 }}>{st.icon}</span>
                        {st.label}
                      </span>
                      <span suppressHydrationWarning style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                        {relativeTime(t.last_message_at)}
                      </span>
                    </span>
                    {/* Semáforo visual */}
                    <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${progressPct}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                      </div>
                    </div>
                  </span>

                  {t.unread_for_user > 0 && <span style={{ ...S.unread, background: '#D99A15', color: '#000' }}>{t.unread_for_user}</span>}
                  <span className="ms" style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)', flex: 'none' }}>chevron_right</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Lo que se resuelve solo */}
      <section className="glass-panel" style={{ marginTop: 32 }}>
        <h2 style={{ ...S.panelTitle, color: '#fff' }}>Respuestas rápidas</h2>
        <p style={{ ...S.panelSub, color: 'rgba(255,255,255,0.5)' }}>Quizá lo tuyo está aquí.</p>

        <div style={{ ...S.faqList, border: '1px solid rgba(255,255,255,0.06)' }}>
          {FAQ.map((f) => {
            const on = openFaq === f.id;
            return (
              <div key={f.id} style={{ ...S.faqItem, background: on ? 'rgba(255,255,255,0.03)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setOpenFaq(on ? null : f.id)} style={S.faqBtn} aria-expanded={on}>
                  <span style={{ flex: 1, textAlign: 'left', fontSize: 14.5, fontWeight: 700, color: on ? '#F2D399' : 'rgba(255,255,255,0.8)' }}>{f.q}</span>
                  <span
                    className="ms pulse-active"
                    style={{
                      fontSize: 24, color: on ? '#F2D399' : 'rgba(255,255,255,0.3)', flex: 'none',
                      transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease',
                    }}
                  >
                    expand_more
                  </span>
                </button>
                {on && <div style={{ ...S.faqAnswer, color: 'rgba(255,255,255,0.6)', padding: '0 20px 20px 20px' }}>{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 4, marginTop: 24 }}>
          <span className="sk" style={{ display: 'block', height: 100, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />
          <span className="sk" style={{ display: 'block', height: 100, borderRadius: 20, background: 'rgba(255,255,255,0.05)' }} />
        </div>
      )}
    </div>
  );
}

function Alert({ text }) {
  return (
    <div style={S.error}>
      <span className="ms" style={{ fontSize: 20, flex: 'none' }}>error</span>
      <span>{text}</span>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, 
    fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.6)',
    padding: '10px 18px', borderRadius: 14, background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer'
  },
  channels: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 28 },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 28px',
    borderRadius: 18, fontSize: 15.5, fontWeight: 800, boxShadow: '0 12px 30px rgba(217,154,21,0.3)', cursor: 'pointer', border: 'none'
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 26px',
    borderRadius: 18, fontSize: 15, fontWeight: 800, textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer'
  },
  panelTitle: { margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' },
  panelSub: { margin: '6px 0 0', fontSize: 14, fontWeight: 600 },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 30, letterSpacing: '-.02em',
  },
  sub: { margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, fontWeight: 500 },
  threadTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 22, letterSpacing: '-.02em', lineHeight: 1.25,
  },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: 6, height: 46, padding: '0 20px',
    borderRadius: 16, fontSize: 14.5, fontWeight: 800, flex: 'none', cursor: 'pointer'
  },
  ticket: {
    display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%', padding: 24,
    borderRadius: 22, 
  },
  catIcon: {
    width: 48, height: 48, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reference: {
    fontSize: 12, fontWeight: 800, letterSpacing: '.04em', padding: '6px 10px',
    borderRadius: 10,
  },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12, fontWeight: 800, padding: '6px 10px', borderRadius: 10,
  },
  unread: {
    minWidth: 28, height: 28, padding: '0 10px', borderRadius: 99, flex: 'none',
    fontSize: 13, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  catGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14,
  },
  catCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, padding: '18px 16px',
    borderRadius: 20, minWidth: 0, transition: 'all 0.2s', cursor: 'pointer',
  },
  label: { display: 'block', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 60, borderRadius: 18, background: 'linear-gradient(120deg, #D99A15, #F2D399)',
    color: '#000', fontSize: 16, fontWeight: 800, marginTop: 32,
    boxShadow: '0 12px 30px rgba(217,154,21,0.3)', cursor: 'pointer', border: 'none'
  },
  thread: {
    display: 'flex', flexDirection: 'column', gap: 20, marginTop: 0,
  },
  teamTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8,
    fontSize: 12, fontWeight: 800, letterSpacing: '.02em',
  },
  bubbleTeam: {
    maxWidth: '85%', padding: '16px 20px', fontSize: 15, lineHeight: 1.55,
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px 24px 24px 24px', color: '#fff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
  },
  bubbleUser: {
    maxWidth: '85%', padding: '16px 20px', fontSize: 15, lineHeight: 1.55,
    background: '#D99A15', color: '#000', borderRadius: '24px 24px 8px 24px',
    boxShadow: '0 8px 24px rgba(217,154,21,0.2)', fontWeight: 600
  },
  bubbleTime: {
    fontSize: 11.5, fontWeight: 700, margin: '8px 8px 0',
  },
  replyInput: {
    flex: 1, minHeight: 60, borderRadius: 18,
    padding: '18px 20px', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
  },
  send: {
    width: 60, height: 60, borderRadius: 18, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: '0.3s'
  },
  closeBtn: {
    width: '100%', height: 52, borderRadius: 16, marginTop: 24,
    fontSize: 14, fontWeight: 800, color: '#FFB0A0', background: 'rgba(255,68,31,0.1)',
    border: '1px solid rgba(255,68,31,0.2)', cursor: 'pointer', transition: '0.3s'
  },
  closedNote: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 18, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
  },
  faqList: {
    marginTop: 24, borderRadius: 22, overflow: 'hidden',
  },
  faqItem: { },
  faqBtn: {
    display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '20px 24px', cursor: 'pointer', border: 'none', background: 'transparent'
  },
  faqAnswer: {
    fontWeight: 500, fontSize: 14, lineHeight: 1.6
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, padding: '16px 18px',
    borderRadius: 16, background: 'rgba(255,68,31,0.15)', color: '#FFB0A0',
    fontSize: 14, fontWeight: 700, lineHeight: 1.45, border: '1px solid rgba(255,68,31,0.3)'
  },
};
