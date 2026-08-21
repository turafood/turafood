'use client';

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

function CalEmbed() {
  useEffect(() => {
    (function (C, A, L) { 
      let p = function (a, ar) { a.q.push(ar); }; 
      let d = C.document; 
      C.Cal = C.Cal || function () { 
        let cal = C.Cal; let ar = arguments; 
        if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } 
        if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if(typeof namespace === "string"){cal.ns[namespace] = cal.ns[namespace] || api;p(cal.ns[namespace], ar);p(cal, ["initNamespace", namespace]);} else p(cal, ar); return;} p(cal, ar); 
      }; 
    })(window, "https://app.cal.com/embed/embed.js", "init");
    
    window.Cal("init", "reunion", {origin:"https://app.cal.com"});
    window.Cal.config = window.Cal.config || {};
    window.Cal.config.forwardQueryParams = true;

    window.Cal.ns.reunion("inline", {
      elementOrSelector:"#my-cal-inline-reunion",
      config: {"layout":"month_view","useSlotsViewOnSmallScreen":"true"},
      calLink: "turafood/reunion",
    });

    window.Cal.ns.reunion("ui", {"hideEventTypeDetails":false,"layout":"month_view"});
  }, []);

  return (
    <div style={{ width: '100%', height: 750, borderRadius: 24, overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ width: '100%', height: '100%', overflow: 'scroll' }} id="my-cal-inline-reunion"></div>
    </div>
  );
}

export default function SoportePage() {
  const { business, toast } = useBiz();

  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [view, setView] = useState('home');    // home | new | thread
  
  // Tab state: 'faq' | 'tickets' | 'cal'
  const [activeTab, setActiveTab] = useState('faq');
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
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: var(--shadowSm);
            padding: 30px;
            transition: all 0.3s;
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
          ::-webkit-scrollbar-thumb { background: rgba(100,100,100,0.2); border-radius: 8px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(100,100,100,0.4); }
        `}</style>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setView('home')} style={S.back}>
            <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
            Volver a soporte
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)' }}>
             <div className="pulse-active" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
             <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Chat en vivo</span>
          </div>
        </div>

        <div className="chat-container">
          <section className="glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '70vh', minHeight: 500 }}>
            {/* Cabecera del Chat */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
               <span style={{ ...S.catIcon, background: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}>
                <span className="ms" style={{ fontSize: 24, color: cat.color }}>{cat.icon}</span>
              </span>
              <div>
                 <h1 style={{ ...S.threadTitle, color: 'var(--text)' }}>{active.subject}</h1>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                   <span style={{ fontSize: 12, color: 'var(--muted)' }}>Soporte con el equipo de TuraFood</span>
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
                      <span style={{ ...S.teamTag, color: 'var(--muted)' }}>
                        <span className="ms" style={{ fontSize: 14 }}>support_agent</span>
                        Equipo TuraFood
                      </span>
                    )}
                    <div style={team ? S.bubbleTeam : S.bubbleUser}>{m.body}</div>
                    <span suppressHydrationWarning style={{ ...S.bubbleTime, color: 'var(--muted)' }}>{time(m.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* Input / Note */}
            <div style={{ padding: 24, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              {closed ? (
                <div style={S.closedNote}>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--muted)', flex: 'none' }}>lock_clock</span>
                  <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                    Esta solicitud está cerrada. Si vuelve a pasar, abre una nueva y menciona el número <b>{active.reference}</b>.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Envía un mensaje..."
                    rows={1}
                    style={{ ...S.replyInput, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim() || busy}
                    aria-label="Enviar"
                    style={{
                      ...S.send,
                      background: draft.trim() ? 'var(--primary)' : 'var(--surface2)',
                      color: draft.trim() ? '#fff' : 'var(--muted)',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <span className="ms" style={{ fontSize: 22 }}>arrow_upward</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar de Detalles (Derecha) */}
          <section className="glass-panel" style={{ padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: 16 }}>DETALLES DEL TICKET</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>ID Ticket</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>#{active.reference}</div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Categoría</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="ms" style={{ fontSize: 16, color: cat.color }}>{cat.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{cat.label}</span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Estado</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, background: `color-mix(in srgb, ${st.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)`, padding: '6px 12px', borderRadius: 12 }}>
                  <span className="ms pulse-active" style={{ fontSize: 14, color: st.color }}>{st.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: st.color }}>{st.label}</span>
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Fecha de Creación</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginTop: 4 }}>
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
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: var(--shadowSm);
            padding: 36px;
            transition: all 0.3s;
          }
          .input-pro:focus {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent) !important;
          }
        `}</style>
        <button onClick={() => setView('home')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a soporte
        </button>

        <form onSubmit={create} className="glass-panel" style={{ marginTop: 24 }}>
          <h1 style={{ ...S.title, color: 'var(--text)' }}>Cuéntanos qué pasó</h1>
          <p style={{ ...S.sub, color: 'var(--muted)' }}>
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
                      borderColor: on ? c.color : 'var(--border)',
                      background: on ? `color-mix(in srgb, ${c.color} 15%, transparent)` : 'var(--surface2)',
                      boxShadow: on ? `0 4px 16px ${c.color}22` : 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 24, color: on ? c.color : 'var(--muted)' }}>
                      {c.icon}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, textAlign: 'left', lineHeight: 1.3, color: on ? c.color : 'var(--text)' }}>
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
              style={{ ...S.input, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
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
              style={{ ...S.input, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', height: 'auto', padding: '18px', resize: 'vertical', lineHeight: 1.5 }}
            />
          </label>

          {error && <Alert text={error} />}

          <button type="submit" disabled={busy} style={S.primary}>
            {busy ? 'Enviando al equipo...' : 'Abrir solicitud de soporte'}
            <span className="ms" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </form>
      </div>
    );
  }

  // ---------- Inicio (Home con Tabs) ----------
  return (
    <div style={{ maxWidth: 1000 }}>
       <style>{`
        .glass-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: var(--shadowSm);
          padding: 30px;
          transition: all 0.3s;
        }
        @keyframes pulse-dot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-active { animation: pulse-dot 2s infinite; }
        .ticket-hover:hover {
           background: var(--surface2) !important;
           transform: translateY(-2px);
        }
        .tab-btn {
          padding: 12px 24px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.3s;
          border: 1px solid transparent;
        }
        .tab-active {
          background: var(--surface);
          color: var(--text);
          border-color: var(--border);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .tab-inactive {
          background: transparent;
          color: var(--muted);
        }
        .tab-inactive:hover {
          color: var(--text);
          background: var(--surface2);
        }
      `}</style>
      
      <HeaderHero
        title="Aquí no te dejamos solo."
        subtitle="Soporte real y directo. Encuentra respuestas al instante, chatea con nosotros o agenda una videollamada para revisar tu caso."
        images={[
          'https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', padding: 6, borderRadius: 100, width: 'fit-content', marginTop: 32, marginBottom: 24, border: '1px solid var(--border)' }}>
        <button className={`tab-btn ${activeTab === 'faq' ? 'tab-active' : 'tab-inactive'}`} onClick={() => setActiveTab('faq')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ms" style={{ fontSize: 18 }}>quiz</span> Preguntas Frecuentes</span>
        </button>
        <button className={`tab-btn ${activeTab === 'tickets' ? 'tab-active' : 'tab-inactive'}`} onClick={() => setActiveTab('tickets')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ms" style={{ fontSize: 18 }}>forum</span> 
            Tickets de Soporte
            {tickets.length > 0 && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{tickets.length}</span>}
          </span>
        </button>
        <button className={`tab-btn ${activeTab === 'cal' ? 'tab-active' : 'tab-inactive'}`} onClick={() => setActiveTab('cal')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ms" style={{ fontSize: 18 }}>videocam</span> Agendar Videollamada</span>
        </button>
      </div>

      {error && <Alert text={error} />}

      {/* Tab: Preguntas Frecuentes */}
      {activeTab === 'faq' && (
        <section className="glass-panel" style={{ animation: 'fade-in 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
            <div style={{ maxWidth: 640 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(16,185,129,0.15)', color: '#0B8E54', fontSize: 11, fontWeight: 800, marginBottom: 10 }}>
                <span>✓</span> MODELO 0% COMISIONES & PAGO DIRECTO AL RESTAURANTE
              </div>
              <h2 style={{ ...S.panelTitle, color: 'var(--text)' }}>Lo que más nos preguntan</h2>
              <p style={{ ...S.panelSub, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
                En TuraFood no cobramos comisiones ni retenemos tu dinero. Aquí tienes las soluciones claras sobre pagos inmediatos, Tura Turbo 15 min, el Kit Growth AI y soporte en Buenaventura.
              </p>
            </div>
            
            <a
              href={`https://wa.me/${WHATSAPP}?text=Hola,%20soy%20${encodeURIComponent(business?.name ?? 'un negocio')}%20y%20necesito%20soporte%20VIP`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...S.heroGhost, background: '#25D366', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(37,211,102,0.3)', fontWeight: 800 }}
            >
              <span className="ms" style={{ fontSize: 20 }}>chat</span>
              WhatsApp VIP en Vivo
            </a>
          </div>

          <div style={{ ...S.faqList, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
            {FAQ.map((f) => {
              const on = openFaq === f.id;
              return (
                <div key={f.id} style={{ ...S.faqItem, background: on ? 'var(--surface)' : 'transparent', borderBottom: '1px solid var(--border)' }}>
                  <button onClick={() => setOpenFaq(on ? null : f.id)} style={S.faqBtn} aria-expanded={on}>
                    <span style={{ flex: 1, textAlign: 'left', fontSize: 15, fontWeight: 700, color: on ? 'var(--primary)' : 'var(--text)' }}>{f.q}</span>
                    <span
                      className="ms"
                      style={{
                        fontSize: 24, color: on ? 'var(--primary)' : 'var(--muted)', flex: 'none',
                        transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease',
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                  {on && <div style={{ ...S.faqAnswer, color: 'var(--text)', opacity: 0.8, padding: '0 24px 24px 24px' }}>{f.a}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Tab: Tickets de Soporte */}
      {activeTab === 'tickets' && (
        <section className="glass-panel" style={{ animation: 'fade-in 0.3s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ ...S.panelTitle, color: 'var(--text)' }}>Tus tickets de soporte</h2>
              <p style={{ ...S.panelSub, color: 'var(--muted)' }}>Historial interactivo de casos y chats con el equipo.</p>
            </div>
            <button onClick={() => setView('new')} style={{ ...S.heroBtn, background: 'var(--primary)', color: '#fff' }}>
              <span className="ms" style={{ fontSize: 22 }}>support_agent</span>
              Abrir Nuevo Ticket
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 4, marginTop: 24 }}>
              <span className="sk" style={{ display: 'block', height: 100, borderRadius: 20, background: 'var(--surface2)' }} />
              <span className="sk" style={{ display: 'block', height: 100, borderRadius: 20, background: 'var(--surface2)' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface2)', borderRadius: 20, marginTop: 24, border: '1px dashed var(--border)' }}>
              <span className="ms" style={{ fontSize: 48, color: 'var(--muted)', opacity: 0.5 }}>forum</span>
              <h3 style={{ fontSize: 18, color: 'var(--text)', margin: '16px 0 8px' }}>No tienes tickets activos</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 400, margin: '0 auto' }}>Si tienes un problema que no pudiste resolver en las Preguntas Frecuentes, abre un ticket y lo miramos de una.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
              {tickets.map((t) => {
                const st = TICKET_STATUS[t.status] ?? TICKET_STATUS.open;
                const cat = CATEGORIES.find((c) => c.value === t.category) ?? CATEGORIES[6];
                
                const isOpen = ['open', 'in_progress', 'waiting'].includes(t.status);
                // Lógica tipo semáforo
                const progressPct = t.status === 'open' ? 33 : t.status === 'in_progress' ? 66 : t.status === 'waiting' ? 66 : 100;
                let barColor = 'var(--muted)';
                if (t.status === 'open') barColor = 'var(--primary)'; // Urgente / Rojo-Naranja
                else if (t.status === 'in_progress' || t.status === 'waiting') barColor = 'var(--amber)'; // Amarillo / En Proceso
                else if (t.status === 'resolved' || t.status === 'closed') barColor = 'var(--green)'; // Verde / Resuelto

                return (
                  <button
                    key={t.id}
                    onClick={() => { setActive(t); setView('thread'); }}
                    className="ticket-hover"
                    style={{ ...S.ticket, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                  >
                    {/* Barra lateral de semáforo (indicador rápido) */}
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: barColor }} />

                    <span style={{ ...S.catIcon, background: `color-mix(in srgb, ${cat.color} 15%, transparent)`, width: 52, height: 52, marginLeft: 10 }}>
                      <span className="ms" style={{ fontSize: 26, color: cat.color }}>{cat.icon}</span>
                    </span>

                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.01em' }}>
                        {t.subject}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                        <span style={{ ...S.reference, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>#{t.reference}</span>
                        <span style={{ ...S.statusPill, background: `color-mix(in srgb, ${st.color} 15%, transparent)`, color: st.color, border: `1px solid color-mix(in srgb, ${st.color} 30%, transparent)` }}>
                          <span className="ms" style={{ fontSize: 14 }}>{st.icon}</span>
                          {st.label}
                        </span>
                        <span suppressHydrationWarning style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                          {relativeTime(t.last_message_at)}
                        </span>
                      </span>
                    </span>

                    {t.unread_for_user > 0 && <span style={{ ...S.unread, background: 'var(--primary)', color: '#fff' }}>{t.unread_for_user}</span>}
                    <span className="ms" style={{ fontSize: 28, color: 'var(--muted)', flex: 'none' }}>chevron_right</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Tab: Videollamada */}
      {activeTab === 'cal' && (
        <section className="glass-panel" style={{ animation: 'fade-in 0.3s ease' }}>
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
             <div style={{ maxWidth: 600 }}>
                <h2 style={{ ...S.panelTitle, color: 'var(--text)' }}>Agendar una videollamada</h2>
                <p style={{ ...S.panelSub, color: 'var(--text)', opacity: 0.8, lineHeight: 1.5, marginTop: 10 }}>
                  A veces es mejor hablar las cosas frente a frente. Si tienes un problema técnico grave, necesitas una asesoría personalizada, o quieres revisar temas avanzados de tu cuenta, agenda 30 minutos con un experto del equipo. Es completamente gratis.
                </p>
             </div>
          </div>
          
          <CalEmbed />
        </section>
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
    fontSize: 14, fontWeight: 800, color: 'var(--text)',
    padding: '10px 18px', borderRadius: 14, background: 'var(--surface2)',
    border: '1px solid var(--border)', cursor: 'pointer'
  },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 24px',
    borderRadius: 100, fontSize: 14.5, fontWeight: 800, cursor: 'pointer', border: 'none',
    boxShadow: 'var(--shadowSm)'
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 24px',
    borderRadius: 100, fontSize: 14.5, fontWeight: 800, textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)', cursor: 'pointer'
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
  ticket: {
    display: 'flex', alignItems: 'flex-start', gap: 16, width: '100%', padding: 24,
    borderRadius: 22, transition: '0.2s',
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
    border: '1px solid transparent',
  },
  label: { display: 'block', fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 14 },
  input: {
    width: '100%', height: 56, padding: '0 18px', borderRadius: 16,
    fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: '0.2s',
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 60, borderRadius: 18, background: 'var(--primary)',
    color: '#fff', fontSize: 16, fontWeight: 800, marginTop: 32,
    boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 30%, transparent)', cursor: 'pointer', border: 'none'
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
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '8px 24px 24px 24px', color: 'var(--text)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
  },
  bubbleUser: {
    maxWidth: '85%', padding: '16px 20px', fontSize: 15, lineHeight: 1.55,
    background: 'var(--primary)', color: '#fff', borderRadius: '24px 24px 8px 24px',
    boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 20%, transparent)', fontWeight: 600
  },
  bubbleTime: {
    fontSize: 11.5, fontWeight: 700, margin: '8px 8px 0',
  },
  replyInput: {
    flex: 1, minHeight: 60, borderRadius: 24,
    padding: '18px 20px', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
  },
  send: {
    width: 60, height: 60, borderRadius: 24, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.3s'
  },
  closeBtn: {
    width: '100%', height: 52, borderRadius: 16, marginTop: 24,
    fontSize: 14, fontWeight: 800, color: '#FFB0A0', background: 'rgba(255,68,31,0.1)',
    border: '1px solid rgba(255,68,31,0.2)', cursor: 'pointer', transition: '0.3s'
  },
  closedNote: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 18, background: 'var(--surface2)', border: '1px solid var(--border)',
  },
  faqList: {
    marginTop: 24, borderRadius: 22, overflow: 'hidden',
  },
  faqItem: { transition: '0.2s' },
  faqBtn: {
    display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '20px 24px', cursor: 'pointer', border: 'none', background: 'transparent'
  },
  faqAnswer: {
    fontWeight: 500, fontSize: 15, lineHeight: 1.6
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, padding: '16px 18px',
    borderRadius: 16, background: 'rgba(255,68,31,0.15)', color: '#E2360F',
    fontSize: 14, fontWeight: 700, lineHeight: 1.45, border: '1px solid rgba(255,68,31,0.3)'
  },
};
