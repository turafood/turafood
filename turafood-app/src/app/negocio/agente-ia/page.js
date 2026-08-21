'use client';

import { useState } from 'react';

/* ═══════════════════════ MOCK DATA ═══════════════════════ */

const AGENTS = [
  { id: 1, name: 'Recepcionista', desc: 'Toma pedidos por llamada telefónica', status: 'production', phone: '+57 300 123 4567', calls: 1125, csat: 96.2, costMin: 0.05, active: 21 },
  { id: 2, name: 'Billing Agent', desc: 'Confirma pagos y facturación', status: 'production', phone: '+57 300 555 3421', calls: 185, csat: 94.8, costMin: 0.04, active: 6 },
  { id: 3, name: 'Appointment Rescheduler', desc: 'Reagenda citas y reservas', status: 'draft', phone: '', calls: 0, csat: 0, costMin: 0, active: 0 },
];

const VOICES = [
  { id: 1, name: 'Sofía - Business Seller', desc: 'Emprendedora argentina con voz cálida...', lang: 'Spanish', accent: 'Colombian', uses: 7900, category: 'Social M.', age: '90d' },
  { id: 2, name: 'AD-berto - Velvety ads', desc: 'AD-berto is a premium Latin...', lang: 'Spanish', accent: 'Colombian', uses: 1600, category: 'Advertis.', age: '2y' },
  { id: 3, name: 'Alonso - Steady and Professional', desc: 'A slightly deeper male voice with a...', lang: 'Spanish', accent: 'Mexican', uses: 21300, category: 'Social M.', age: '∞' },
  { id: 4, name: 'Dr. Lozano - Confident', desc: 'A middle-aged Spanish man,...', lang: 'Spanish', accent: 'Peninsular', uses: 490, category: 'Convers.', age: '90d' },
  { id: 5, name: 'Alejandro - Colombia accent', desc: 'Seems like someone you\'d grab a...', lang: 'Spanish', accent: 'Latin American', uses: 711, category: 'Convers.', age: '' },
];

const CALL_LOGS = [
  { id: 1, name: 'Llamar a Alison Carter', date: '18 de jun, 9:04 a. m.', duration: '30 s', status: 'completed', sentiment: 'positive' },
  { id: 2, name: 'Llamar a Peter Jones', date: '16 de jun, 1:32 p. m.', duration: '1 m 42 s', status: 'completed', sentiment: 'positive' },
  { id: 3, name: 'Llamada con Karen Bridges', date: '14 de junio, 14:47', duration: 'sin respuesta', status: 'missed', sentiment: 'neutral' },
  { id: 4, name: 'Llamar a Carl Brand', date: '12 de jun, 11:12 a. m.', duration: '42 seg', status: 'completed', sentiment: 'negative' },
  { id: 5, name: 'Confirmar pedido María López', date: '11 de jun, 3:45 p. m.', duration: '2 m 10 s', status: 'completed', sentiment: 'positive' },
];

const WORKFLOWS = [
  { id: 1, name: 'Confirmar reserva', type: 'call', when: '2 horas antes', active: true, icon: 'phone_in_talk' },
  { id: 2, name: 'Recordatorio por SMS', type: 'sms', when: '24 horas antes', active: true, icon: 'sms' },
  { id: 3, name: 'Bienvenida WhatsApp', type: 'whatsapp', when: 'Primer pedido', active: true, icon: 'forum' },
  { id: 4, name: 'Seguimiento de carritos', type: 'sms', when: '30 min después', active: false, icon: 'shopping_cart' },
];

/* ═══════════════════════ COMPONENT ═══════════════════════ */

export default function AgenteIAPage() {
  const [tab, setTab] = useState('agents');
  const [showFlowTypeModal, setShowFlowTypeModal] = useState(false);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState('Sofía - Business Seller');
  const [aiActive, setAiActive] = useState(true);

  const [agentConfig, setAgentConfig] = useState({
    voice: 'sofia',
    language: 'es-CO',
    greeting: 'Hola, soy el asistente virtual de TuraFood. ¿Qué te gustaría ordenar hoy?',
    prompt: 'Eres un asistente de recepción de pedidos telefónicos para un restaurante. Eres amable, conciso y tu meta es tomar el nombre, dirección y pedido del cliente.',
    personality: 'Eres seguro sin ser agresivo. Respetuoso y con paciencia.',
    style: 'Estás ayudando a posibles clientes a programar llamadas con nuestro equipo.',
    tone: 'Eres profesional, agradable y amigable. Eres comprensivo.',
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>

      {/* ─────────── HERO (VAPI STYLE) ─────────── */}
      <section style={{ background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1320 50%, #0f1923 100%)', borderRadius: 28, padding: '48px 44px', position: 'relative', overflow: 'hidden', marginBottom: 32, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ position: 'absolute', top: -100, right: -60, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,68,31,0.1) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: 100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)' }} />

        <div style={{ display: 'flex', gap: 40, alignItems: 'center', position: 'relative', zIndex: 2, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 380px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
              <span className="ms" style={{ fontSize: 16, color: 'var(--gold)' }}>auto_awesome</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Centro de Mando Omnicanal</span>
            </div>
            <h1 style={{ margin: '0 0 16px', fontSize: 38, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: '#fff', letterSpacing: '-.03em', lineHeight: 1.1 }}>
              Build, test, and deploy <span style={{ background: 'linear-gradient(90deg, #FF441F, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>in minutes.</span>
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 460 }}>
              Configura todo desde la voz y el flujo de conversación hasta la telefonía e integraciones. Tura.ai maneja la infraestructura para que vayas del prompt a producción rápido.
            </p>

            {/* SWITCH IA */}
            <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 14, padding: '10px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 99, border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: aiActive ? 'rgba(255,255,255,0.4)' : '#fff' }}>Manual</span>
              <button onClick={() => setAiActive(!aiActive)} style={{ width: 52, height: 28, borderRadius: 99, padding: 3, border: 'none', cursor: 'pointer', background: aiActive ? 'var(--green)' : 'rgba(255,255,255,0.15)', transition: 'background .3s', flex: 'none' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: aiActive ? 'translateX(24px)' : 'translateX(0)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: aiActive ? '#fff' : 'rgba(255,255,255,0.4)' }}>IA a cargo</span>
            </div>
          </div>

          {/* Phone mockup */}
          <div style={{ flex: '0 0 260px', height: 340, background: '#080808', borderRadius: 28, border: '4px solid #222', padding: 18, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>+57 300 123 4567</div>
              <div style={{ fontSize: 15, color: '#fff', fontWeight: 800 }}>Tura.ai Agente</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ color: '#fff', fontSize: 14 }}>smart_toy</span></div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '2px 12px 12px 12px', fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>Hola, Juan. Soy Sofía de TuraFood. ¿Cómo estás hoy?</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignSelf: 'flex-end', flexDirection: 'row-reverse', marginBottom: 14 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800 }}>J</div>
              <div style={{ background: 'var(--primary)', padding: '10px 14px', borderRadius: '12px 2px 12px 12px', fontSize: 12, color: '#fff', lineHeight: 1.4 }}>Muy bien Sofía, quería confirmar mi pedido.</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--primary)', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ color: '#fff', fontSize: 14 }}>smart_toy</span></div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '2px 12px 12px 12px', fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>¡Genial! Solo estoy llamando para confirmar la entrega a las 7pm. 🍕</div>
            </div>
            <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>mic_off</span></div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ color: '#000', fontSize: 18 }}>mic</span></div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="ms" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>volume_up</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── TABS ─────────── */}
      <nav style={{ display: 'flex', gap: 4, background: 'var(--surface)', padding: 6, borderRadius: 16, border: '1px solid var(--border)', marginBottom: 28 }}>
        {[
          { id: 'agents', label: 'Agentes', icon: 'smart_toy' },
          { id: 'workflows', label: 'Flujos de Trabajo', icon: 'bolt' },
          { id: 'logs', label: 'Registro', icon: 'call_log' },
          { id: 'voices', label: 'Voces', icon: 'record_voice_over' },
          { id: 'settings', label: 'Configuración', icon: 'tune' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 8px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: tab === t.id ? 'var(--text)' : 'transparent',
            color: tab === t.id ? 'var(--surface)' : 'var(--muted)',
            fontSize: 13, fontWeight: 700, transition: 'all .2s',
            boxShadow: tab === t.id ? '0 4px 16px rgba(0,0,0,0.12)' : 'none'
          }}>
            <span className="ms" style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      {/* ═══════════ TAB: AGENTS (VAPI Dashboard) ═══════════ */}
      {tab === 'agents' && (
        <div className="anim-pop">
          {/* KPI ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total llamadas', value: '1,125', change: '+8% last month', color: '#11B26A', icon: 'call' },
              { label: 'Latencia promedio', value: '340ms', change: '↓ 5% last month', color: '#3B82F6', icon: 'speed' },
              { label: 'Costo promedio/min', value: '$0.05', change: '↑ 7% last month', color: '#FF441F', icon: 'payments' },
              { label: 'CSAT Score', value: '90%', change: '+1% last month', color: '#A855F7', icon: 'sentiment_satisfied' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, background: `radial-gradient(circle, ${kpi.color}12 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${kpi.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ fontSize: 18, color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{kpi.value}</div>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 8 }}>{kpi.change}</div>
              </div>
            ))}
          </div>

          {/* AGENT CARDS (VAPI style) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Agentes</h2>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 40, borderRadius: 99, background: 'var(--text)', color: 'var(--surface)', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <span className="ms" style={{ fontSize: 16 }}>add</span> Create Agent
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {AGENTS.map(a => (
              <div key={a.id} onClick={() => setSelectedAgent(a)} style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: `1px solid ${selectedAgent?.id === a.id ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>
                {a.status === 'production' && <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: 'radial-gradient(circle, rgba(17,178,106,0.1) 0%, transparent 70%)', borderRadius: '50%' }} />}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: a.status === 'production' ? 'var(--primary-tint)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ fontSize: 20, color: a.status === 'production' ? 'var(--primary)' : 'var(--muted)' }}>smart_toy</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.desc}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', background: a.status === 'production' ? 'var(--green-tint)' : 'var(--amber-tint)', color: a.status === 'production' ? 'var(--green)' : 'var(--amber)' }}>
                    {a.status === 'production' ? '● Production' : '● Draft'}
                  </span>
                  {a.phone && <span style={{ fontSize: 11, color: 'var(--faint)' }}>{a.phone}</span>}
                </div>

                <div style={{ display: 'flex', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{a.calls.toLocaleString()}</div><div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600 }}>calls</div></div>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)' }}>{a.csat}%</div><div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600 }}>CSAT</div></div>
                  <div><div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{a.active}</div><div style={{ fontSize: 10, color: 'var(--faint)', fontWeight: 600 }}>active calls</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB: WORKFLOWS ═══════════ */}
      {tab === 'workflows' && (
        <div className="anim-pop">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Flujos de Trabajo</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--muted)' }}>Llamadas, SMS y mensajes que se disparan automáticamente.</p>
            </div>
            <button onClick={() => setShowFlowTypeModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 44, borderRadius: 99, background: 'var(--text)', color: 'var(--surface)', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <span className="ms" style={{ fontSize: 18 }}>add</span> Nueva Automatización
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {WORKFLOWS.map(w => (
              <div key={w.id} style={{ background: 'var(--surface)', padding: 28, borderRadius: 20, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, transition: 'all .2s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: w.active ? 'var(--primary-tint)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <span className="ms" style={{ fontSize: 22, color: w.active ? 'var(--primary)' : 'var(--muted)' }}>{w.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{w.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{w.when}</div>
                </div>
                <div style={{ width: 48, height: 28, borderRadius: 99, padding: 3, background: w.active ? 'var(--green)' : 'var(--surface2)', flex: 'none', cursor: 'pointer' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: w.active ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ TAB: CALL LOGS ═══════════ */}
      {tab === 'logs' && (
        <div className="anim-pop">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Registro y Transcripciones</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--muted)' }}>Accede a transcripciones detalladas y métricas de rendimiento.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--muted)' }}>
                <span className="ms" style={{ fontSize: 16 }}>search</span> Buscar...
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 14, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Fecha', 'Duración', 'Sentimiento', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', fontSize: 12, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CALL_LOGS.map(log => (
                  <tr key={log.id} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer' }} className="hover-row">
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="ms" style={{ fontSize: 16, color: log.status === 'completed' ? 'var(--green)' : 'var(--primary)' }}>{log.status === 'completed' ? 'call' : 'call_missed'}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{log.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>{log.date}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--text)' }}>{log.duration}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: log.sentiment === 'positive' ? 'var(--green-tint)' : log.sentiment === 'negative' ? 'var(--primary-tint)' : 'var(--surface2)', color: log.sentiment === 'positive' ? 'var(--green)' : log.sentiment === 'negative' ? 'var(--primary)' : 'var(--muted)' }}>
                        {log.sentiment === 'positive' ? '😊 Positivo' : log.sentiment === 'negative' ? '😠 Negativo' : '😐 Neutro'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: log.status === 'completed' ? 'var(--green-tint)' : 'var(--amber-tint)', color: log.status === 'completed' ? 'var(--green)' : 'var(--amber)' }}>
                        {log.status === 'completed' ? 'Completado' : 'Perdida'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <button style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}>
                        <span className="ms" style={{ fontSize: 18 }}>play_arrow</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: VOICES (ElevenLabs style) ═══════════ */}
      {tab === 'voices' && (
        <div className="anim-pop">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Voces</h2>
              <span style={{ fontSize: 13, color: 'var(--muted)', padding: '4px 12px', background: 'var(--surface2)', borderRadius: 99 }}>Explorar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--muted)' }}>
              <span className="ms" style={{ fontSize: 16 }}>search</span> Search everything... <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--surface2)', fontSize: 11, fontWeight: 700, marginLeft: 8 }}>⌘K</span>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 14, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nombre', 'Idioma', 'Acento', 'Usos', 'Categoría', ''].map(h => (
                    <th key={h} style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--muted)', fontSize: 12, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {VOICES.map(v => (
                  <tr key={v.id} onClick={() => setSelectedVoice(v.name)} style={{ borderTop: '1px solid var(--border)', cursor: 'pointer', background: selectedVoice === v.name ? 'var(--surface2)' : 'transparent' }} className="hover-row">
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: selectedVoice === v.name ? '2px solid var(--primary)' : '2px solid var(--border)' }}>
                          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>person</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{v.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--faint)' }}>{v.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px' }}><span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontWeight: 600 }}>🇪🇸 {v.lang}</span></td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>{v.accent}</td>
                    <td style={{ padding: '14px 20px' }}><span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}><span className="ms" style={{ fontSize: 14 }}>group</span> {v.uses >= 1000 ? `${(v.uses / 1000).toFixed(1)}K` : v.uses}</span></td>
                    <td style={{ padding: '14px 20px', color: 'var(--muted)', fontSize: 13 }}>{v.category}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}><span className="ms" style={{ fontSize: 16 }}>play_arrow</span></button>
                        <button style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}><span className="ms" style={{ fontSize: 16 }}>graphic_eq</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Voice preview bar */}
          <div style={{ marginTop: 16, background: 'var(--surface)', borderRadius: 16, padding: '12px 20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{selectedVoice}</div>
              <div style={{ fontSize: 12, color: 'var(--faint)' }}>Default voice preview</div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, marginLeft: 16 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>0:02</span>
              <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--surface2)', position: 'relative' }}>
                <div style={{ width: '40%', height: '100%', borderRadius: 99, background: 'var(--text)' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>0:03</span>
            </div>
            <button style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--text)', color: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><span className="ms" style={{ fontSize: 20 }}>play_arrow</span></button>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: SETTINGS ═══════════ */}
      {tab === 'settings' && (
        <div className="anim-pop" style={{ maxWidth: 700 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Configuración del Agente</h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'var(--muted)' }}>Define cómo interactúa tu agente IA con los clientes.</p>

          {/* Personality cards (Cal.ai style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Personalidad', value: agentConfig.personality, icon: 'psychology', color: '#A855F7' },
              { label: 'Estilo de aviso', value: agentConfig.style, icon: 'edit_note', color: '#3B82F6' },
              { label: 'Tono', value: agentConfig.tone, icon: 'mic', color: '#11B26A' },
            ].map((card, i) => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -12, right: -12, width: 48, height: 48, background: `radial-gradient(circle, ${card.color}15 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span className="ms" style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{card.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 32, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 24 }}>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Voz del Agente</span>
              <select value={agentConfig.voice} onChange={e => setAgentConfig({ ...agentConfig, voice: e.target.value })} style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, outline: 'none', color: 'var(--text)' }}>
                <option value="sofia">Sofía - Amigable y atenta (Femenino, Colombian)</option>
                <option value="carlos">Carlos - Profesional y directo (Masculino, Mexican)</option>
                <option value="alejandro">Alejandro - Tu amigo colombiano (Masculino, Colombian)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Mensaje de Saludo</span>
              <input type="text" value={agentConfig.greeting} onChange={e => setAgentConfig({ ...agentConfig, greeting: e.target.value })} style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, outline: 'none', color: 'var(--text)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>System Prompt</span>
              <textarea rows={5} value={agentConfig.prompt} onChange={e => setAgentConfig({ ...agentConfig, prompt: e.target.value })} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6, color: 'var(--text)' }} />
            </label>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', gap: 12 }}>
              <button style={{ padding: '0 28px', height: 48, borderRadius: 99, background: 'var(--text)', color: 'var(--surface)', border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: 'var(--shadowSm)' }}>Guardar Cambios</button>
              <button style={{ padding: '0 28px', height: 48, borderRadius: 99, background: 'none', color: 'var(--muted)', border: '1px solid var(--border)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════ MODAL: NEW WORKFLOW ═══════════ */}
      {showFlowTypeModal && (
        <div onClick={() => setShowFlowTypeModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} className="anim-pop" style={{ width: '100%', maxWidth: 540, background: '#1a1a1a', borderRadius: 24, padding: 36, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 24, color: '#fff', fontFamily: 'var(--font-bricolage)' }}>Flujo de trabajo nuevo</h3>
            <p style={{ margin: '0 0 28px', fontSize: 15, color: 'rgba(255,255,255,0.5)' }}>¿Cómo te gustaría empezar?</p>

            <div style={{ display: 'flex', gap: 16 }}>
              <div onClick={() => { setShowFlowTypeModal(false); setShowFlowBuilder(true); }} style={{ flex: 1, padding: 28, borderRadius: 20, border: '2px solid var(--primary)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><span className="ms" style={{ color: '#fff', fontSize: 20 }}>add</span></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Comenzar desde cero</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Crea tu propio flujo de trabajo a medida.</div>
              </div>
              <div style={{ flex: 1, padding: 28, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><span className="ms" style={{ color: '#fff', fontSize: 20 }}>phone_in_talk</span></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Plantilla de Tura.ai</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Agentes IA preconfigurados para tu negocio.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
              <button onClick={() => setShowFlowTypeModal(false)} style={{ padding: '8px 20px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { setShowFlowTypeModal(false); setShowFlowBuilder(true); }} style={{ padding: '8px 24px', borderRadius: 99, background: '#fff', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Crear</button>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════ MODAL: FLOW BUILDER ═══════════ */}
      {showFlowBuilder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#111', display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#181818' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setShowFlowBuilder(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}><span className="ms">arrow_back</span></button>
              <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>Flujos de trabajo / Sin título</span> <span className="ms" style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>edit</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ padding: '8px 16px', borderRadius: 99, background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>delete</span></button>
              <button style={{ padding: '8px 24px', borderRadius: 99, background: '#fff', color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Guardar</button>
            </div>
          </header>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Trigger */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <span className="ms" style={{ color: 'var(--gold)', fontSize: 20 }}>bolt</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Desencadenante</span>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Cuándo</span>
                  <select style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, outline: 'none' }}>
                    <option style={{ color: '#000' }}>Cuando se reserva un nuevo pedido</option>
                    <option style={{ color: '#000' }}>Antes del inicio de la entrega</option>
                    <option style={{ color: '#000' }}>Cuando se cancela el pedido</option>
                    <option style={{ color: '#000' }}>Si no ha pedido en 30 días</option>
                  </select>
                </label>
              </div>

              {/* Action */}
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms" style={{ color: 'var(--primary)', fontSize: 20 }}>arrow_forward</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Acción</span>
                  </div>
                  <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><span className="ms">delete</span></button>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Hacer esto</span>
                  <select style={{ padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, outline: 'none' }}>
                    <option style={{ color: '#000' }}>Llamar al cliente con Tura.ai Agente</option>
                    <option style={{ color: '#000' }}>Enviar recordatorio por SMS</option>
                    <option style={{ color: '#000' }}>Enviar mensaje por WhatsApp</option>
                    <option style={{ color: '#000' }}>Enviar correo electrónico</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Plantilla de mensaje</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>Añadir variable ↓</span>
                  </div>
                  <textarea rows={4} defaultValue={"Hola {NOMBRE_CLIENTE},\n\nEste es un recordatorio sobre tu pedido #{ID_PEDIDO}.\n\nTotal: {TOTAL_PEDIDO}"} style={{ padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                </label>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
