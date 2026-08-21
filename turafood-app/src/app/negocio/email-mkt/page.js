'use client';

import { useState, useCallback, useEffect } from 'react';

/* ═══════════════ DATA & CONSTANTS ═══════════════ */

const CAMPAIGNS = [
  { id: 1, name: 'Promo 2x1 Fin de Semana', subject: '¡Tu fin de semana con doble sabor! 🍔🍔', status: 'sent', sent: 1240, openRate: 42, clickRate: 15, date: '18 Ago 2026' },
  { id: 2, name: 'Nuevo Menú de Postres', subject: 'Endulza tu día con nuestras novedades 🍰', status: 'sent', sent: 850, openRate: 55, clickRate: 22, date: '10 Ago 2026' },
  { id: 3, name: 'Día de la Madre', subject: 'Consiente a mamá como se merece ❤️', status: 'draft', sent: 0, openRate: 0, clickRate: 0, date: '-' },
];

const INIT_AUTOMATIONS = [
  { id: 1, name: 'Bienvenida (Onboarding)', trigger: 'when_first_order', triggerLabel: 'Cuando un cliente hace su primer pedido', action: 'send_email', actionLabel: 'Enviar correo electrónico', active: true, emails: 3, opens: 68, icon: 'waving_hand', subject: '¡Bienvenido a {NOMBRE_NEGOCIO}!', body: 'Hola {NOMBRE_CLIENTE},\n\nGracias por tu primer pedido. Aquí tienes un cupón de 10% para tu próxima compra: {CUPON}' },
  { id: 2, name: 'Recuperación de Carrito', trigger: 'when_cart_abandoned', triggerLabel: 'Si deja items en el carrito por 2 horas', action: 'send_email', actionLabel: 'Enviar correo electrónico', active: true, emails: 1, opens: 45, icon: 'shopping_cart', subject: '¿Olvidaste algo delicioso? 🛒', body: 'Hola {NOMBRE_CLIENTE},\n\nTienes artículos esperándote en tu carrito. Termina tu pedido ahora y disfruta tu comida caliente.' },
  { id: 3, name: 'Te Extrañamos (Win‑back)', trigger: 'when_inactive_30d', triggerLabel: 'Si no ha pedido en 30 días', action: 'send_email', actionLabel: 'Enviar correo electrónico', active: false, emails: 2, opens: 0, icon: 'favorite', subject: '¡Te extrañamos, {NOMBRE_CLIENTE}!', body: 'Hola {NOMBRE_CLIENTE},\n\nHace tiempo que no te vemos. Vuelve con un 15% OFF usando el código RETORNO15.' },
  { id: 4, name: 'Feliz Cumpleaños', trigger: 'when_birthday', triggerLabel: 'El día del cumpleaños del cliente', action: 'send_email', actionLabel: 'Enviar correo electrónico', active: true, emails: 1, opens: 72, icon: 'cake', subject: '🎂 ¡Feliz cumpleaños, {NOMBRE_CLIENTE}!', body: 'Hoy es tu día especial. Te regalamos un postre gratis con tu próximo pedido.' },
];

const TRIGGERS = [
  { id: 'when_first_order', label: 'Cuando un cliente hace su primer pedido', icon: 'person_add' },
  { id: 'when_cart_abandoned', label: 'Si deja items en el carrito por 2 horas', icon: 'remove_shopping_cart' },
  { id: 'when_inactive_30d', label: 'Si no ha pedido en 30 días', icon: 'hourglass_empty' },
  { id: 'when_birthday', label: 'El día del cumpleaños del cliente', icon: 'cake' },
  { id: 'when_order_completed', label: 'Cuando se completa un pedido', icon: 'check_circle' },
  { id: 'when_review_submitted', label: 'Cuando deja una reseña', icon: 'rate_review' },
];

const ACTIONS = [
  { id: 'send_email', label: 'Enviar correo electrónico', icon: 'mail' },
  { id: 'send_sms', label: 'Enviar SMS', icon: 'sms' },
  { id: 'send_whatsapp', label: 'Enviar mensaje por WhatsApp', icon: 'forum' },
  { id: 'call_ai', label: 'Llamar con Tura.ai Agente', icon: 'phone_in_talk' },
  { id: 'add_to_group', label: 'Mover a grupo de audiencia', icon: 'group_add' },
];

const VARIABLES = [
  '{NOMBRE_CLIENTE}', '{NOMBRE_NEGOCIO}', '{TOTAL_PEDIDO}', '{ID_PEDIDO}', '{CUPON}', '{FECHA_PEDIDO}'
];

const TEMPLATES = [
  { title: 'Carrito abandonado', desc: 'Haz un seguimiento automático de los compradores que no completaron su compra.', tags: ['Recordatorio', 'E-commerce'], icon: 'shopping_cart', trigger: 'when_cart_abandoned', action: 'send_email' },
  { title: 'Proceso de pago abandonado', desc: 'Sigue a quienes iniciaron el proceso de pago pero lo dejaron a medias.', tags: ['Recordatorio', 'E-commerce'], icon: 'credit_card_off', trigger: 'when_cart_abandoned', action: 'send_email' },
  { title: 'Reward repeat customers', desc: 'Recompensa a clientes que repiten con un descuento o agradecimiento.', tags: ['Fidelización', 'E-commerce'], icon: 'loyalty', trigger: 'when_order_completed', action: 'send_email' },
  { title: 'Compra un producto específico', desc: 'Añade clientes a un grupo después de comprar un producto en particular.', tags: ['Sugerencias', 'E-commerce'], icon: 'shopping_bag', trigger: 'when_order_completed', action: 'add_to_group' },
  { title: 'Win-back inactivos', desc: 'Recupera clientes que no han pedido en los últimos 30 días.', tags: ['Fidelización'], icon: 'favorite', trigger: 'when_inactive_30d', action: 'send_email' },
  { title: 'Promociona un producto', desc: 'Presenta un nuevo producto a clientes que ya te han comprado.', tags: ['Promoción', 'E-commerce'], icon: 'campaign', trigger: 'when_order_completed', action: 'send_email' },
];

const ONBOARDING = [
  { step: 1, title: 'Conecta tu catálogo de productos', done: true },
  { step: 2, title: 'Diseña tu primera campaña con IA', done: false },
  { step: 3, title: 'Prueba un envío en vivo en el Simulador', done: false },
  { step: 4, title: 'Activa tus automatizaciones de venta', done: false },
];

/* ═══════════════ GOLDEN & APPLE LUXURY TOKENS (ORIGINAL ESTHETICS) ═══════════════ */
const G = {
  bg: '#0C0A07',
  surface: '#14110E',
  surface2: '#1D1914',
  border: 'rgba(232,199,102,0.18)',
  borderSubtle: 'rgba(255,255,255,0.08)',
  gold: '#E8C766',
  gold2: '#F6E4A6',
  goldDeep: '#B8912F',
  goldGlow: 'radial-gradient(circle, rgba(232,199,102,0.14) 0%, transparent 70%)',
  text: '#F5F0E8',
  muted: 'rgba(245,240,232,0.65)',
  faint: 'rgba(245,240,232,0.3)',
  green: '#11B26A',
  red: '#FF441F',
  blue: '#2E6BFF',
  purple: '#A855F7',
  serif: "'Playfair Display', 'Georgia', serif",
};

/* ═══════════════ COMPONENT ═══════════════ */
export default function EmailMktAIPage() {
  const [tab, setTab] = useState('simulator');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(ONBOARDING.map(o => o.done));
  const [automations, setAutomations] = useState(INIT_AUTOMATIONS);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCampaignEditor, setShowCampaignEditor] = useState(false);

  // SIMULATOR LAB STATE
  const [simChannel, setSimChannel] = useState('email');
  const [simEmail, setSimEmail] = useState('tu-correo@ejemplo.com');
  const [simPhone, setSimPhone] = useState('+57 300 123 4567');
  const [simClientName, setSimClientName] = useState('Alejandro Silva');
  const [simSelectedTemplate, setSimSelectedTemplate] = useState('carrito');
  const [simSending, setSimSending] = useState(false);
  const [simSendStep, setSimSendStep] = useState('');
  const [simCallActive, setSimCallActive] = useState(false);
  const [simCallDuration, setSimCallDuration] = useState(0);
  const [simCallTranscript, setSimCallTranscript] = useState([]);
  const [simEventLogs, setSimEventLogs] = useState([
    { id: 1, type: 'email', title: 'Email de bienvenida', recipient: 'cliente@gmail.com', status: '200 OK', time: 'Hace 5m', latency: '98ms' },
    { id: 2, type: 'whatsapp', title: 'Recordatorio de reserva', recipient: '+57 310 987 6543', status: '200 OK', time: 'Hace 24m', latency: '142ms' },
    { id: 3, type: 'call', title: 'Llamada Voice AI confirmación', recipient: '+57 300 456 7890', status: '200 OK', time: 'Hace 1h', latency: '310ms' },
  ]);

  // FLOW BUILDER STATE
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [editingFlow, setEditingFlow] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [flowTrigger, setFlowTrigger] = useState('');
  const [flowAction, setFlowAction] = useState('');
  const [flowSubject, setFlowSubject] = useState('');
  const [flowBody, setFlowBody] = useState('');
  const [flowActive, setFlowActive] = useState(true);
  const [flowHasCondition, setFlowHasCondition] = useState(false);
  const [flowCondition, setFlowCondition] = useState('opened_email');
  const [flowElseAction, setFlowElseAction] = useState('send_sms');
  const [savedMsg, setSavedMsg] = useState('');

  const doneCount = onboardingDone.filter(Boolean).length;

  useEffect(() => {
    let interval;
    if (simCallActive) {
      interval = setInterval(() => {
        setSimCallDuration(d => d + 1);
      }, 1000);
    } else {
      setSimCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [simCallActive]);

  const toggleAutomation = (id) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const openFlowEditor = useCallback((auto) => {
    setEditingFlow(auto);
    setFlowName(auto?.name || '');
    setFlowTrigger(auto?.trigger || TRIGGERS[0].id);
    setFlowAction(auto?.action || ACTIONS[0].id);
    setFlowSubject(auto?.subject || '');
    setFlowBody(auto?.body || '');
    setFlowActive(auto?.active ?? true);
    setFlowHasCondition(false);
    setFlowCondition('opened_email');
    setFlowElseAction('send_sms');
    setSavedMsg('');
    setShowFlowBuilder(true);
  }, []);

  const openNewFromTemplate = (tpl) => {
    setEditingFlow(null);
    setFlowName(tpl.title);
    setFlowTrigger(tpl.trigger);
    setFlowAction(tpl.action);
    setFlowSubject('');
    setFlowBody('');
    setFlowActive(true);
    setFlowHasCondition(false);
    setSavedMsg('');
    setShowTemplateModal(false);
    setShowFlowBuilder(true);
  };

  const saveFlow = () => {
    const triggerObj = TRIGGERS.find(t => t.id === flowTrigger);
    const actionObj = ACTIONS.find(a => a.id === flowAction);
    if (editingFlow) {
      setAutomations(prev => prev.map(a => a.id === editingFlow.id ? { ...a, name: flowName, trigger: flowTrigger, triggerLabel: triggerObj?.label, action: flowAction, actionLabel: actionObj?.label, subject: flowSubject, body: flowBody, active: flowActive } : a));
    } else {
      const newAuto = { id: Date.now(), name: flowName, trigger: flowTrigger, triggerLabel: triggerObj?.label, action: flowAction, actionLabel: actionObj?.label, active: flowActive, emails: 0, opens: 0, icon: 'auto_awesome', subject: flowSubject, body: flowBody };
      setAutomations(prev => [...prev, newAuto]);
    }
    setSavedMsg('✓ Guardado correctamente');
    setTimeout(() => { setShowFlowBuilder(false); setSavedMsg(''); }, 1200);
  };

  const deleteFlow = () => {
    if (editingFlow) {
      setAutomations(prev => prev.filter(a => a.id !== editingFlow.id));
    }
    setShowFlowBuilder(false);
  };

  const insertVariable = (v) => {
    setFlowBody(prev => prev + ' ' + v);
  };

  const handleTriggerSimulation = () => {
    if (simChannel === 'call') {
      setSimCallActive(true);
      setSimCallTranscript([
        { speaker: 'ia', text: `Hola ${simClientName}, soy Sofía de TuraFood. Te llamo para confirmar tu pedido especial.` }
      ]);
      setTimeout(() => {
        setSimCallTranscript(prev => [
          ...prev,
          { speaker: 'user', text: '¡Hola Sofía! Sí, confirmo la entrega para las 7:30 PM.' },
          { speaker: 'ia', text: '¡Perfecto! Ya notificamos a cocina y al repartidor. ¡Que disfrutes tu comida!' }
        ]);
      }, 3500);

      setSimEventLogs(prev => [
        { id: Date.now(), type: 'call', title: `Llamada Voice AI a ${simClientName}`, recipient: simPhone, status: '200 Conectada', time: 'Ahora mismo', latency: '180ms' },
        ...prev
      ]);
      return;
    }

    setSimSending(true);
    setSimSendStep('Iniciando motor de entrega...');
    setTimeout(() => setSimSendStep('Resolviendo variables dinámicas...'), 600);
    setTimeout(() => setSimSendStep(simChannel === 'email' ? 'Conectando con servidor SMTP...' : 'Enviando webhook a Meta/Twilio...'), 1200);
    setTimeout(() => {
      setSimSending(false);
      setSimSendStep('¡Disparado con éxito!');

      setSimEventLogs(prev => [
        {
          id: Date.now(),
          type: simChannel,
          title: simChannel === 'email' ? `Email: ${simSelectedTemplate}` : `Mensaje ${simChannel.toUpperCase()}`,
          recipient: simChannel === 'email' ? simEmail : simPhone,
          status: '200 Entregado',
          time: 'Ahora mismo',
          latency: '112ms'
        },
        ...prev
      ]);

      setTimeout(() => setSimSendStep(''), 3000);
    }, 2000);
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 80 }}>

      {/* ─────────── HERO (GOLDEN SERIF + APPLE LUXURY VIBE) ─────────── */}
      <section style={{
        background: G.bg, borderRadius: 28, padding: '48px 44px', position: 'relative',
        overflow: 'hidden', marginBottom: 28, border: `1px solid ${G.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -60, width: 500, height: 500, background: 'radial-gradient(circle, rgba(232,199,102,0.1) 0%, transparent 55%)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 300, height: 300, background: 'radial-gradient(circle, rgba(184,145,47,0.1) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop" alt="" style={{ position: 'absolute', top: 0, right: 0, width: 340, height: '100%', objectFit: 'cover', opacity: 0.15, maskImage: 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.7) 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(232,199,102,0.1)', borderRadius: 99, border: `1px solid ${G.border}`, marginBottom: 18 }}>
            <span className="ms" style={{ fontSize: 16, color: G.gold }}>auto_awesome</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: G.gold, letterSpacing: '.12em', textTransform: 'uppercase' }}>Omnicanal IA · Email + SMS + Voz</span>
          </div>
          <h1 style={{ margin: '0 0 14px', fontSize: 38, fontFamily: G.serif, fontWeight: 700, color: G.text, letterSpacing: '-.02em', lineHeight: 1.15 }}>
            Email Marketing &amp; Automatizaciones<br /><em style={{ color: G.gold, fontStyle: 'italic' }}>en tiempo real.</em>
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: G.muted, lineHeight: 1.7, maxWidth: 540 }}>
            Diseña, prueba en vivo y automatiza. Prueba enviándote un correo de prueba, un SMS a tu móvil o una llamada de voz con IA en nuestro Simulador en Vivo.
          </p>
        </div>
      </section>

      {/* ─────────── TABS (NOTION / APPLE STYLE) ─────────── */}
      <nav style={{
        display: 'flex', gap: 6, background: G.surface, padding: 6,
        borderRadius: 18, border: `1px solid ${G.borderSubtle}`, marginBottom: 26,
        overflowX: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
      }}>
        {[
          { id: 'simulator', label: '🧪 Simulador en Vivo', icon: 'science', isSpecial: true },
          { id: 'dashboard', label: 'Panel de control', icon: 'dashboard' },
          { id: 'campaigns', label: 'Campañas', icon: 'campaign' },
          { id: 'automations', label: 'Automatizaciones', icon: 'bolt' },
          { id: 'forms', label: 'Formularios', icon: 'web' },
          { id: 'audience', label: 'Suscriptores', icon: 'group' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '11px 16px', borderRadius: 13, border: 'none', cursor: 'pointer',
              background: tab === t.id ? (t.isSpecial ? `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})` : G.text) : 'transparent',
              color: tab === t.id ? '#0C0A07' : G.muted,
              fontSize: 13, fontWeight: 700, transition: 'all .2s ease',
              whiteSpace: 'nowrap',
              boxShadow: tab === t.id ? '0 4px 18px rgba(0,0,0,0.35)' : 'none',
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ═══════════ 0. SIMULADOR EN VIVO (LIVE TESTING LAB) ═══════════ */}
      {tab === 'simulator' && (
        <div className="anim-pop">
          
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(232,199,102,0.1) 0%, rgba(20,17,14,0.98) 100%)',
            borderRadius: 24, padding: '30px 34px', border: `1px solid ${G.border}`,
            marginBottom: 26, display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: G.gold, marginBottom: 6 }}>
                <span className="ms" style={{ fontSize: 20 }}>bolt</span>
                <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Laboratorio de Pruebas en Vivo</span>
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 26, fontFamily: G.serif, fontWeight: 700, color: G.text }}>
                Pruébate a ti mismo cada automatización
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: G.muted, maxWidth: 520 }}>
                Ingresa tus datos de prueba y dispara correos, SMS o llamadas de voz instantáneas para validar cómo lo experimentarán tus clientes.
              </p>
            </div>

            {/* Channel Selector Pills */}
            <div style={{ display: 'flex', gap: 6, background: G.surface2, padding: 6, borderRadius: 16, border: `1px solid ${G.borderSubtle}` }}>
              {[
                { id: 'email', label: 'Email', icon: 'mail', color: G.gold },
                { id: 'sms', label: 'SMS', icon: 'sms', color: G.blue },
                { id: 'whatsapp', label: 'WhatsApp', icon: 'forum', color: G.green },
                { id: 'call', label: 'Llamada IA', icon: 'phone_in_talk', color: G.purple },
              ].map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setSimChannel(ch.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: simChannel === ch.id ? ch.color : 'transparent',
                    color: simChannel === ch.id ? '#0C0A07' : G.muted,
                    fontWeight: 700, fontSize: 13, transition: 'all .2s'
                  }}
                >
                  <span className="ms" style={{ fontSize: 16 }}>{ch.icon}</span>{ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Split Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 24, marginBottom: 32 }}>

            {/* LEFT: Config Panel */}
            <div style={{ background: G.surface, borderRadius: 24, padding: 30, border: `1px solid ${G.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: G.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ms" style={{ color: G.gold, fontSize: 20 }}>tune</span> Parámetros del Disparador
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Nombre del cliente ficticio</span>
                <input value={simClientName} onChange={e => setSimClientName(e.target.value)} style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }} />
              </label>

              {simChannel === 'email' ? (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Tu correo de prueba</span>
                  <input type="email" value={simEmail} onChange={e => setSimEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }} />
                </label>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Tu número celular de prueba</span>
                  <input type="tel" value={simPhone} onChange={e => setSimPhone(e.target.value)} placeholder="+57 300 123 4567" style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }} />
                </label>
              )}

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Plantilla / Evento a Simular</span>
                <select value={simSelectedTemplate} onChange={e => setSimSelectedTemplate(e.target.value)} style={{ padding: '12px 16px', borderRadius: 12, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }}>
                  <option value="carrito">🛒 Carrito Abandonado (2 Horas)</option>
                  <option value="bienvenida">🎉 Bienvenida Primer Pedido</option>
                  <option value="promo">🍔 Promo 2x1 Fin de Semana</option>
                  <option value="cumple">🎂 Cuponazo Cumpleaños VIP</option>
                  <option value="confirmacion">📞 Confirmación de Reserva / Mesa</option>
                </select>
              </label>

              {/* Action Trigger Button */}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={handleTriggerSimulation}
                  disabled={simSending || simCallActive}
                  style={{
                    width: '100%', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: simCallActive ? G.red : `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`,
                    color: simCallActive ? '#fff' : '#0C0A07',
                    fontWeight: 800, fontSize: 14.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(232,199,102,0.25)', transition: 'all .2s',
                  }}
                >
                  {simSending ? (
                    <><span className="ms spin" style={{ fontSize: 20 }}>refresh</span> {simSendStep}</>
                  ) : simCallActive ? (
                    <><span className="ms" style={{ fontSize: 20 }}>call_end</span> Finalizar Llamada ({simCallDuration}s)</>
                  ) : (
                    <>
                      <span className="ms" style={{ fontSize: 20 }}>
                        {simChannel === 'email' ? 'send' : simChannel === 'call' ? 'phone_in_talk' : 'chat'}
                      </span>
                      {simChannel === 'email' ? 'Enviar Email de Prueba Ahora' : simChannel === 'call' ? 'Iniciar Llamada en Vivo' : `Enviar ${simChannel.toUpperCase()} de Prueba`}
                    </>
                  )}
                </button>

                {simSendStep && !simSending && (
                  <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: G.green, fontWeight: 700 }}>
                    {simSendStep}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Live Visual Preview */}
            <div style={{ background: G.surface, borderRadius: 24, padding: 24, border: `1px solid ${G.borderSubtle}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: G.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Vista Previa en Vivo</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: G.gold }}>
                  <span className="ms" style={{ fontSize: 14 }}>visibility</span> Renderizado Dinámico
                </div>
              </div>

              {/* 1. EMAIL PREVIEW */}
              {simChannel === 'email' && (
                <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', color: '#1a1a1a', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', background: '#fafafa' }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>De: <strong style={{ color: '#111' }}>TuraFood &lt;pedidos@turafood.com&gt;</strong></div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Para: <strong style={{ color: '#111' }}>{simEmail}</strong></div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111', marginTop: 8 }}>
                      {simSelectedTemplate === 'carrito' ? `¿Olvidaste algo delicioso, ${simClientName}? 🛒` : simSelectedTemplate === 'bienvenida' ? `¡Bienvenido a TuraFood, ${simClientName}! 🎉` : `¡2x1 Especial para ti, ${simClientName}! 🍔`}
                    </div>
                  </div>

                  <div style={{ padding: '24px 20px', flex: 1, fontSize: 14, lineHeight: 1.6, color: '#333' }}>
                    <p style={{ margin: '0 0 12px' }}>Hola <strong>{simClientName}</strong>,</p>
                    <p style={{ margin: '0 0 16px', color: '#555' }}>
                      {simSelectedTemplate === 'carrito'
                        ? 'Notamos que dejaste tu hamburguesa favorita en el carrito. Tu orden está guardada y lista para enviarse directo a tu mesa.'
                        : 'Gracias por unirte a la familia TuraFood. Aquí tienes un cupón exclusivo del 10% de descuento en tu primer pedido.'}
                    </p>

                    <div style={{ background: '#f8f8f8', padding: '16px', borderRadius: 12, border: '1px dashed #ddd', textAlign: 'center', margin: '16px 0' }}>
                      <div style={{ fontSize: 12, color: '#777', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Código de Descuento</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#FF441F', letterSpacing: '0.1em' }}>TURA10OFF</div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                      <button style={{ padding: '12px 28px', borderRadius: 99, background: '#111', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13 }}>
                        Completar Pedido →
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SMS / WHATSAPP PREVIEW */}
              {(simChannel === 'sms' || simChannel === 'whatsapp') && (
                <div style={{ background: simChannel === 'whatsapp' ? '#0b141a' : '#1a1a1a', borderRadius: 20, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ textAlign: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{simChannel === 'whatsapp' ? '🟢 WhatsApp Business API' : '💬 Mensaje SMS'}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>TuraFood Verified</div>
                  </div>

                  <div style={{
                    alignSelf: 'flex-start',
                    background: simChannel === 'whatsapp' ? '#005c4b' : 'rgba(255,255,255,0.1)',
                    color: '#fff', padding: '14px 18px', borderRadius: '16px 16px 16px 2px',
                    maxWidth: '85%', fontSize: 13, lineHeight: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    Hola {simClientName}! 🍔 Tu pedido en TuraFood está listo para ser despachado. Haz seguimiento en vivo aquí: app.turafood.com/track/4892
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right', marginTop: 6 }}>12:45 PM {simChannel === 'whatsapp' && '✓✓'}</div>
                  </div>
                </div>
              )}

              {/* 3. VOICE AI CALL PREVIEW */}
              {simChannel === 'call' && (
                <div style={{ background: '#0a0a0a', borderRadius: 20, padding: 24, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                  {simCallActive && (
                    <div style={{ position: 'absolute', top: 20, display: 'flex', gap: 4, alignItems: 'center', height: 30 }}>
                      {[40, 80, 60, 100, 70, 90, 50, 80].map((h, i) => (
                        <div key={i} style={{ width: 4, height: `${h}%`, borderRadius: 99, background: G.purple, animation: `pulse 0.8s ease-in-out infinite alternate ${i * 0.1}s` }} />
                      ))}
                    </div>
                  )}

                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${G.purple}, #6366F1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 12, boxShadow: '0 0 30px rgba(168,85,247,0.4)' }}>
                    <span className="ms" style={{ fontSize: 36, color: '#fff' }}>support_agent</span>
                  </div>

                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: G.serif }}>Sofía · Agente IA</div>
                  <div style={{ fontSize: 13, color: simCallActive ? G.green : G.muted, marginTop: 4, fontWeight: 600 }}>
                    {simCallActive ? `En llamada: ${simCallDuration}s` : 'Listo para iniciar llamada de prueba'}
                  </div>

                  {simCallTranscript.length > 0 && (
                    <div style={{ marginTop: 20, width: '100%', background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 120, overflowY: 'auto' }}>
                      {simCallTranscript.map((t, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: t.speaker === 'ia' ? G.gold : '#fff', lineHeight: 1.4 }}>
                          <strong>{t.speaker === 'ia' ? '🤖 Sofía:' : '👤 Tú:'}</strong> {t.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* EVENT LOGS STREAM */}
          <div style={{ background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${G.borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ms" style={{ color: G.gold, fontSize: 18 }}>terminal</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: G.text }}>Registro de Eventos y Disparos en Tiempo Real</span>
              </div>
              <span style={{ fontSize: 12, color: G.green, fontWeight: 700 }}>● Sistema Operacional</span>
            </div>

            <table style={{ width: '100%', fontSize: 13, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Canal', 'Evento / Plantilla', 'Destinatario', 'Estado', 'Latencia', 'Fecha'].map(h => (
                    <th key={h} style={{ padding: '12px 20px', fontWeight: 600, color: G.muted, fontSize: 11, borderBottom: `1px solid ${G.borderSubtle}`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {simEventLogs.map(log => (
                  <tr key={log.id} style={{ borderTop: `1px solid ${G.borderSubtle}` }}>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: G.surface2, color: G.text, fontWeight: 700, fontSize: 11 }}>
                        <span className="ms" style={{ fontSize: 14, color: log.type === 'email' ? G.gold : log.type === 'call' ? G.purple : G.green }}>
                          {log.type === 'email' ? 'mail' : log.type === 'call' ? 'phone' : 'chat'}
                        </span>
                        {log.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: G.text }}>{log.title}</td>
                    <td style={{ padding: '14px 20px', color: G.muted }}>{log.recipient}</td>
                    <td style={{ padding: '14px 20px' }}><span style={{ color: G.green, fontWeight: 700 }}>{log.status}</span></td>
                    <td style={{ padding: '14px 20px', color: G.muted }}>{log.latency}</td>
                    <td style={{ padding: '14px 20px', color: G.faint }}>{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ═══════════ 1. DASHBOARD ═══════════ */}
      {tab === 'dashboard' && (
        <div className="anim-pop">
          {showOnboarding && (
            <section style={{ background: G.bg, borderRadius: 24, border: `1px solid ${G.border}`, padding: 40, marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: G.goldGlow, borderRadius: '50%', filter: 'blur(30px)' }} />
              <div style={{ display: 'flex', gap: 48, position: 'relative', zIndex: 2 }}>
                <div style={{ flex: '0 0 260px' }}>
                  <h2 style={{ margin: '0 0 8px', fontSize: 28, fontFamily: G.serif, fontWeight: 700, color: G.text }}>¡Comencemos!</h2>
                  <p style={{ margin: '0 0 20px', fontSize: 14, color: G.muted, lineHeight: 1.5 }}>Configura tu motor de email marketing en pocos pasos.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: G.gold }}>{doneCount} / {ONBOARDING.length} pasos</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: G.surface2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(doneCount / ONBOARDING.length) * 100}%`, background: `linear-gradient(90deg, ${G.goldDeep}, ${G.gold})`, borderRadius: 99, transition: 'width .4s ease' }} />
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {ONBOARDING.map((o, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderRadius: 16, background: !onboardingDone[i] && i === doneCount ? G.surface2 : 'transparent' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: onboardingDone[i] ? G.gold : G.surface2, color: onboardingDone[i] ? G.bg : G.text, fontSize: 14, fontWeight: 800 }}>
                        {onboardingDone[i] ? <span className="ms" style={{ fontSize: 18 }}>check</span> : o.step}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: onboardingDone[i] ? G.muted : G.text, textDecoration: onboardingDone[i] ? 'line-through' : 'none' }}>{o.title}</div>
                      </div>
                      {!onboardingDone[i] && i === doneCount && (
                        <button onClick={() => { const n = [...onboardingDone]; n[i] = true; setOnboardingDone(n); }} style={{ padding: '8px 20px', borderRadius: 99, background: `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`, color: G.bg, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Comenzar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowOnboarding(false)} style={{ position: 'absolute', bottom: 16, right: 24, background: 'none', border: 'none', color: G.faint, fontSize: 13, cursor: 'pointer' }}>✕ Descartar</button>
            </section>
          )}

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Emails enviados', value: '2,090', icon: 'send', color: G.gold },
              { label: 'Abiertos', value: '48.5%', icon: 'visibility', color: G.green },
              { label: 'Clics', value: '18.5%', icon: 'ads_click', color: G.blue },
              { label: 'CTOR', value: '38.1%', icon: 'trending_up', color: G.purple },
            ].map((kpi, i) => (
              <div key={i} style={{ background: G.surface, borderRadius: 20, padding: 24, border: `1px solid ${G.borderSubtle}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, background: `radial-gradient(circle, ${kpi.color}18 0%, transparent 70%)`, borderRadius: '50%' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ fontSize: 18, color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: G.muted }}>{kpi.label}</span>
                </div>
                <div style={{ fontSize: 32, fontFamily: G.serif, fontWeight: 700, color: G.text, lineHeight: 1 }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* TABLE */}
          <div style={{ background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${G.borderSubtle}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: G.text }}>Rendimiento por mes</span>
            </div>
            <table style={{ width: '100%', fontSize: 14, textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead><tr>{['Mes', 'Campañas', 'Enviados', 'Abierto', 'Clics'].map(h => <th key={h} style={{ padding: '14px 24px', fontWeight: 600, color: G.muted, fontSize: 12, borderBottom: `1px solid ${G.borderSubtle}`, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {[['2026 agosto', '2', '1,240', '42%', '15%'], ['2026 julio', '1', '850', '55%', '22%']].map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${G.borderSubtle}` }}>{row.map((cell, j) => <td key={j} style={{ padding: '16px 24px', color: G.text, fontWeight: j === 0 ? 700 : 400 }}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ 2. CAMPAIGNS ═══════════ */}
      {tab === 'campaigns' && (
        <div className="anim-pop">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontFamily: G.serif, fontWeight: 700, color: G.text }}>Campañas</h2>
            <button onClick={() => setShowCampaignEditor(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 44, borderRadius: 99, background: G.bg, color: G.gold, border: `1px solid ${G.border}`, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <span className="ms" style={{ fontSize: 18 }}>auto_awesome</span> Crear con IA
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CAMPAIGNS.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '20px 24px', background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, cursor: 'pointer', transition: 'all .2s' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: G.text }}>{c.name}</span>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 700, background: c.status === 'sent' ? 'rgba(17,178,106,0.15)' : 'rgba(232,199,102,0.15)', color: c.status === 'sent' ? G.green : G.gold }}>{c.status === 'sent' ? 'Enviado' : 'Borrador'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: G.muted }}>{c.subject}</div>
                </div>
                <div style={{ display: 'flex', gap: 32 }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: G.text }}>{c.sent.toLocaleString()}</div><div style={{ fontSize: 11, color: G.faint }}>Enviados</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: G.green }}>{c.openRate}%</div><div style={{ fontSize: 11, color: G.faint }}>Abiertos</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: 18, fontWeight: 800, color: G.blue }}>{c.clickRate}%</div><div style={{ fontSize: 11, color: G.faint }}>Clics</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ 3. AUTOMATIONS ═══════════ */}
      {tab === 'automations' && (
        <div className="anim-pop">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24, fontFamily: G.serif, fontWeight: 700, color: G.text }}>Flujos Automatizados</h2>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: G.muted }}>Correos y mensajes que se envían solos cuando tus clientes realizan acciones.</p>
            </div>
            <button onClick={() => setShowTemplateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 44, borderRadius: 99, background: G.bg, color: G.gold, border: `1px solid ${G.border}`, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              <span className="ms" style={{ fontSize: 18 }}>add</span> Nueva Automatización
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {automations.map(a => (
              <div key={a.id} style={{ background: G.surface, borderRadius: 20, padding: 28, border: `1px solid ${G.borderSubtle}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: a.active ? `${G.gold}15` : G.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <span className="ms" style={{ fontSize: 22, color: a.active ? G.gold : G.muted }}>{a.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: G.text, marginBottom: 4 }}>{a.name}</div>
                      <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.4 }}>{a.triggerLabel}</div>
                    </div>
                  </div>
                  <button onClick={() => toggleAutomation(a.id)} style={{ width: 48, height: 28, borderRadius: 99, padding: 3, border: 'none', cursor: 'pointer', background: a.active ? G.green : G.surface2, transition: 'background .3s', flex: 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: a.active ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 2px 6px rgba(0,0,0,.15)' }} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 24, borderTop: `1px solid ${G.borderSubtle}`, paddingTop: 16 }}>
                  <div><span style={{ fontSize: 11, fontWeight: 600, color: G.faint, textTransform: 'uppercase' }}>Correos</span><div style={{ fontSize: 18, fontWeight: 800, color: G.text, marginTop: 2 }}>{a.emails}</div></div>
                  <div><span style={{ fontSize: 11, fontWeight: 600, color: G.faint, textTransform: 'uppercase' }}>Open rate</span><div style={{ fontSize: 18, fontWeight: 800, color: a.opens > 0 ? G.green : G.muted, marginTop: 2 }}>{a.opens}%</div></div>
                  <div style={{ marginLeft: 'auto' }}>
                    <button onClick={() => openFlowEditor(a)} style={{ fontSize: 13, fontWeight: 700, color: G.gold, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Editar flujo <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ 4. FORMS ═══════════ */}
      {tab === 'forms' && (
        <div className="anim-pop">
          <div style={{ background: G.surface, borderRadius: 24, border: `1px solid ${G.borderSubtle}`, padding: 48, display: 'flex', gap: 48, alignItems: 'center' }}>
            <div style={{ flex: '0 0 320px', height: 260, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
              <img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=600&auto=format&fit=crop" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 16, opacity: 0.5 }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '75%', background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#000', marginBottom: 8, fontFamily: G.serif }}>🎉 ¡10% OFF!</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>En tu primer pedido</div>
                <div style={{ height: 32, background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, marginBottom: 10 }} />
                <div style={{ height: 32, background: G.gold, borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 28, fontFamily: G.serif, fontWeight: 700, color: G.text }}>Crea tu primer pop-up</h2>
              <p style={{ margin: '0 0 8px', fontSize: 15, color: G.muted, lineHeight: 1.6 }}>Captura suscriptores con ventanas emergentes inteligentes que aparecen en el momento justo.</p>
              <ul style={{ margin: '0 0 24px', padding: '0 0 0 20px', color: G.muted, fontSize: 14, lineHeight: 1.8 }}>
                <li>Pop-ups, barras flotantes y diapositivas</li>
                <li>Personaliza por tiempo, scroll o intento de salida</li>
                <li>Plantillas premium prediseñadas</li>
              </ul>
              <button style={{ padding: '0 28px', height: 44, borderRadius: 99, background: `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`, color: G.bg, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Crear Pop-up</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ 5. AUDIENCE ═══════════ */}
      {tab === 'audience' && (
        <div className="anim-pop">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[{ label: 'Activos', value: '1,847', icon: 'person', color: G.green }, { label: 'Nuevos (7d)', value: '124', icon: 'person_add', color: G.blue }, { label: 'Desuscritos', value: '23', icon: 'person_remove', color: G.muted }].map((s, i) => (
              <div key={i} style={{ background: G.surface, borderRadius: 20, padding: 24, border: `1px solid ${G.borderSubtle}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><span className="ms" style={{ fontSize: 20, color: s.color }}>{s.icon}</span><span style={{ fontSize: 13, fontWeight: 600, color: G.muted }}>{s.label}</span></div>
                <div style={{ fontSize: 28, fontFamily: G.serif, fontWeight: 700, color: G.text }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: TEMPLATE CATALOG ═══════════ */}
      {showTemplateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: G.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <header style={{ padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${G.borderSubtle}`, background: G.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', color: G.text, cursor: 'pointer' }}><span className="ms" style={{ fontSize: 20 }}>close</span></button>
              <span style={{ color: G.muted, fontSize: 14 }}>Automatizaciones {'>'} <span style={{ color: G.text, fontWeight: 700 }}>Plantilla</span></span>
            </div>
          </header>
          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '48px 48px 80px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <h1 style={{ fontSize: 40, fontWeight: 700, color: G.text, fontFamily: G.serif, marginBottom: 12 }}>Seleccionar una <em style={{ color: G.gold }}>plantilla</em></h1>
              <p style={{ fontSize: 16, color: G.muted, marginBottom: 48 }}>Elige una plantilla prediseñada o empieza desde cero.</p>

              <div style={{ display: 'flex', gap: 32, marginBottom: 56, background: G.surface, borderRadius: 24, border: `1px solid ${G.borderSubtle}`, overflow: 'hidden' }}>
                <div style={{ flex: '0 0 340px', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: G.surface2, borderRight: `1px solid ${G.borderSubtle}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: G.gold, padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: G.bg }}>When subscriber joins</div>
                    <div style={{ width: 2, height: 20, background: G.border }} />
                    <div style={{ background: G.gold, padding: '10px 24px', borderRadius: 10, fontSize: 12, fontWeight: 700, color: G.bg, display: 'flex', alignItems: 'center', gap: 6 }}><span className="ms" style={{ fontSize: 16 }}>mail</span> Email</div>
                  </div>
                </div>
                <div style={{ flex: 1, padding: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h3 style={{ fontSize: 28, color: G.text, margin: '0 0 12px', fontFamily: G.serif }}>Empezar desde cero</h3>
                  <p style={{ fontSize: 15, color: G.muted, marginBottom: 28 }}>Construye una automatización completamente personalizada.</p>
                  <button onClick={() => { setShowTemplateModal(false); openFlowEditor(null); }} style={{ alignSelf: 'flex-start', padding: '0 28px', height: 48, borderRadius: 99, background: `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`, color: G.bg, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Comenzar →</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
                {TEMPLATES.map((tpl, i) => (
                  <div key={i} onClick={() => openNewFromTemplate(tpl)} style={{ background: G.surface, border: `1px solid ${G.borderSubtle}`, borderRadius: 20, padding: 32, cursor: 'pointer', transition: 'border-color .2s' }} className="hover-row">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {tpl.tags.map(tag => <span key={tag} style={{ fontSize: 11, fontWeight: 700, color: G.muted, background: G.surface2, padding: '4px 10px', borderRadius: 6 }}>{tag}</span>)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${G.gold}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span className="ms" style={{ fontSize: 20, color: G.gold }}>{tpl.icon}</span></div>
                      <div>
                        <h3 style={{ fontSize: 18, color: G.text, margin: '0 0 8px', fontWeight: 700 }}>{tpl.title}</h3>
                        <p style={{ fontSize: 14, color: G.muted, lineHeight: 1.5, margin: 0 }}>{tpl.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: FLOW BUILDER ═══════════ */}
      {showFlowBuilder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: G.bg, display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${G.borderSubtle}`, background: G.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => setShowFlowBuilder(false)} style={{ background: 'none', border: 'none', color: G.text, cursor: 'pointer', display: 'flex' }}><span className="ms">arrow_back</span></button>
              <input value={flowName} onChange={e => setFlowName(e.target.value)} placeholder="Nombre del flujo..." style={{ background: 'none', border: 'none', color: G.text, fontSize: 16, fontWeight: 700, outline: 'none', width: 300 }} />
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {savedMsg && <span style={{ color: G.green, fontSize: 14, fontWeight: 700 }}>{savedMsg}</span>}
              {editingFlow && <button onClick={deleteFlow} style={{ padding: '8px 16px', borderRadius: 99, background: 'none', border: `1px solid ${G.borderSubtle}`, color: G.red, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><span className="ms" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>delete</span> Eliminar</button>}
              <button onClick={saveFlow} style={{ padding: '8px 24px', borderRadius: 99, background: `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`, color: G.bg, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Guardar</button>
            </div>
          </header>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: 40 }}>
            <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', background: G.surface, borderRadius: 16, border: `1px solid ${G.borderSubtle}` }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: G.text }}>Estado:</span>
                <button onClick={() => setFlowActive(!flowActive)} style={{ width: 48, height: 28, borderRadius: 99, padding: 3, border: 'none', cursor: 'pointer', background: flowActive ? G.green : G.surface2, transition: 'background .3s', flex: 'none' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: flowActive ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .3s cubic-bezier(.34,1.56,.64,1)' }} />
                </button>
                <span style={{ fontSize: 14, color: flowActive ? G.green : G.muted, fontWeight: 700 }}>{flowActive ? 'Activo' : 'Pausado'}</span>
              </div>

              <div style={{ background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <span className="ms" style={{ color: G.gold, fontSize: 20 }}>bolt</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Desencadenante</span>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Cuándo se activa</span>
                  <select value={flowTrigger} onChange={e => setFlowTrigger(e.target.value)} style={{ padding: '14px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }}>
                    {TRIGGERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
              </div>

              {!flowHasCondition && (
                <button onClick={() => setFlowHasCondition(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 16, border: `1px dashed ${G.border}`, background: 'none', color: G.gold, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  <span className="ms" style={{ fontSize: 18 }}>add</span> Añadir condición (Sí / No)
                </button>
              )}

              {flowHasCondition && (
                <div style={{ background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="ms" style={{ color: G.purple, fontSize: 20 }}>call_split</span>
                      <span style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Condición</span>
                    </div>
                    <button onClick={() => setFlowHasCondition(false)} style={{ background: 'none', border: 'none', color: G.faint, cursor: 'pointer' }}><span className="ms">close</span></button>
                  </div>
                  <select value={flowCondition} onChange={e => setFlowCondition(e.target.value)} style={{ width: '100%', padding: '14px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none', marginBottom: 16 }}>
                    <option value="opened_email">¿Abrió el email anterior?</option>
                    <option value="has_whatsapp">¿Tiene número de WhatsApp?</option>
                    <option value="is_vip">¿Es cliente VIP?</option>
                  </select>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ flex: 1, padding: 16, borderRadius: 14, background: `${G.green}10`, border: `1px solid ${G.green}30`, textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: G.green, marginBottom: 4 }}>✓ Sí →</div>
                      <div style={{ fontSize: 12, color: G.muted }}>Ejecuta la acción principal</div>
                    </div>
                    <div style={{ flex: 1, padding: 16, borderRadius: 14, background: `${G.red}10`, border: `1px solid ${G.red}30`, textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: G.red, marginBottom: 4 }}>✗ No →</div>
                      <select value={flowElseAction} onChange={e => setFlowElseAction(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 12, outline: 'none' }}>
                        {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ background: G.surface, borderRadius: 20, border: `1px solid ${G.borderSubtle}`, padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <span className="ms" style={{ color: G.gold, fontSize: 20 }}>arrow_forward</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: G.text }}>Acción</span>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Hacer esto</span>
                  <select value={flowAction} onChange={e => setFlowAction(e.target.value)} style={{ padding: '14px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }}>
                    {ACTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Asunto del correo</span>
                  <input value={flowSubject} onChange={e => setFlowSubject(e.target.value)} placeholder="Ej: ¡Hola {NOMBRE_CLIENTE}!" style={{ padding: '14px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none' }} />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: G.muted, fontWeight: 600 }}>Cuerpo del mensaje</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {VARIABLES.map(v => (
                        <button key={v} onClick={() => insertVariable(v)} style={{ padding: '3px 8px', borderRadius: 6, border: `1px solid ${G.border}`, background: 'none', color: G.gold, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <textarea rows={6} value={flowBody} onChange={e => setFlowBody(e.target.value)} placeholder="Escribe el cuerpo de tu correo..." style={{ padding: '16px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface2, color: G.text, fontSize: 14, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
                </label>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: AI CAMPAIGN EDITOR ═══════════ */}
      {showCampaignEditor && (
        <div onClick={() => setShowCampaignEditor(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} className="anim-pop" style={{ width: '100%', maxWidth: 560, background: G.bg, borderRadius: 28, padding: 40, border: `1px solid ${G.border}`, boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <span className="ms" style={{ fontSize: 24, color: G.gold }}>auto_awesome</span>
              <h3 style={{ margin: 0, fontSize: 22, color: G.text, fontFamily: G.serif }}>Crear Campaña con IA</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: G.muted }}>¿De qué trata tu correo?</span>
                <input type="text" placeholder="Ej: Promoción 2x1 en hamburguesas" style={{ padding: '14px 18px', borderRadius: 14, border: `1px solid ${G.borderSubtle}`, background: G.surface, color: G.text, fontSize: 15, outline: 'none' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: G.muted }}>Tono</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Divertido', 'Exclusivo', 'Urgente', 'Amigable'].map(t => <button key={t} style={{ padding: '8px 16px', borderRadius: 99, border: `1px solid ${G.border}`, background: 'none', color: G.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{t}</button>)}
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button style={{ flex: 1, height: 48, borderRadius: 99, background: `linear-gradient(135deg, ${G.goldDeep}, ${G.gold})`, color: G.bg, border: 'none', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                <span className="ms" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6 }}>auto_awesome</span> Generar con IA
              </button>
              <button onClick={() => setShowCampaignEditor(false)} style={{ height: 48, padding: '0 24px', borderRadius: 99, background: 'none', border: `1px solid ${G.borderSubtle}`, color: G.text, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
