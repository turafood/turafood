'use client';

/**
 * TURA IA — hoja inferior del repartidor
 * Conversión de `aiOpen` (línea 761) del mockup del Repartidor.
 *
 * Las respuestas son las mismas del mockup (línea 957): reglas sobre
 * palabras clave. Cuando exista el servicio real solo cambia
 * `answer()`.
 */

import { useEffect, useRef, useState } from 'react';

const TIPS = [
  {
    id: 'zone', title: 'Muévete al Centro', icon: 'near_me', bg: '#FFF1EC', fg: '#E2360F',
    body: 'Hay 7 restaurantes despachando y solo 3 repartidores en línea. Desde donde estás son 6 minutos.',
  },
  {
    id: 'hour', title: 'Quédate hasta las 9 p.m.', icon: 'schedule', bg: '#EAF1FF', fg: '#2E6BFF',
    body: 'De 6:30 a 9 es tu franja más rentable. Con 4 entregas más completas tu meta de hoy.',
  },
  {
    id: 'gold', title: 'Cuida tu tasa de aceptación', icon: 'workspace_premium', bg: '#FFF7E6', fg: '#A8730B',
    body: 'Rechazar seguido baja tu prioridad para recibir pedidos. Mantente sobre el 85%.',
  },
];

const CHIPS = [
  '¿A qué zona me muevo?',
  '¿Cuánto me falta para la meta?',
  '¿Hasta qué hora conviene?',
  '¿Cómo cuido mi nivel?',
];

function answer(q) {
  const t = q.toLowerCase();
  if (t.includes('zona') || t.includes('dónde') || t.includes('donde') || t.includes('mover'))
    return 'Muévete al Centro, cerca del Malecón. Hay 7 restaurantes con pedidos saliendo y solo 3 repartidores en línea. Desde donde estás son 6 minutos.';
  if (t.includes('conect') || t.includes('hora') || t.includes('cuándo') || t.includes('cuando'))
    return 'Tus mejores horas son 11 a 1 y 6:30 a 9. Conectándote hasta las 9 p.m. completas tu meta con unas 4 entregas más.';
  if (t.includes('gan') || t.includes('meta') || t.includes('cuánto') || t.includes('cuanto'))
    return 'Mira tu pestaña de Ganancias: ahí ves cuánto llevas hoy, cuántas entregas hiciste y el promedio por viaje. Te digo qué falta para la meta con esos mismos números.';
  if (t.includes('acept') || t.includes('rechaz') || t.includes('nivel') || t.includes('oro'))
    return 'Tu tasa de aceptación decide qué tan seguido te llegan pedidos. Por encima del 85% mantienes prioridad; rechazar mucho te deja de último en la fila.';
  if (t.includes('propina') || t.includes('calific') || t.includes('estrell'))
    return 'Los clientes que dan propina casi siempre mencionan que el repartidor avisó cuando iba llegando. Un mensaje corto al salir del negocio sube la propina promedio.';
  if (t.includes('gasolina') || t.includes('combust') || t.includes('gast'))
    return 'Con unas 9 entregas haces cerca de 38 km, que a precio de hoy son unos $9.800 en gasolina. Agrupar pedidos de la misma zona baja ese porcentaje.';
  return 'Puedo decirte a qué zona moverte, cuánto te falta para tu meta, cuándo conviene conectarte o cómo cuidar tu tasa de aceptación.';
}

export default function TuraIARider({ open, onClose }) {
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [done, setDone] = useState([]);
  const timer = useRef(null);
  const scroller = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, thinking]);

  const say = (q) => {
    const text = q.trim();
    if (!text) return;
    setMsgs((m) => [...m, { me: true, text }]);
    setDraft('');
    setThinking(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { me: false, text: answer(text) }]);
    }, 1100);
  };

  if (!open) return null;

  const tips = TIPS.filter((t) => !done.includes(t.id));
  const shown = msgs.length
    ? msgs
    : [{ me: false, text: 'Hola. Puedo decirte a qué zona moverte, cuánto te falta para tu meta o cómo cuidar tu tasa de aceptación.' }];

  return (
    <>
      <div onClick={onClose} className="anim-fade" style={S.scrim} />
      <div style={S.sheet}>
        <div style={{ flex: 'none', padding: '12px 20px 0' }}>
          <div style={S.grabber} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={S.avatar}>
              <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--amber)' }}>auto_awesome</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>
                Tura IA
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                Sabe dónde hay demanda ahora mismo
              </span>
            </span>
            <button onClick={onClose} style={S.close} aria-label="Cerrar Tura IA">
              <span className="ms" style={{ fontSize: 19 }}>close</span>
            </button>
          </div>
        </div>

        <div ref={scroller} className="sc" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px' }}>
          {tips.length > 0 && (
            <>
              <div style={S.sectionLabel}>PARA GANAR MÁS HOY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 11 }}>
                {tips.map((t) => (
                  <div key={t.id} style={S.tip}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                      <span style={{ ...S.tipIcon, background: t.bg }}>
                        <span className="ms" style={{ fontSize: 18, color: t.fg }}>{t.icon}</span>
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700, fontSize: 14, textWrap: 'pretty' }}>{t.title}</span>
                        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4, textWrap: 'pretty' }}>
                          {t.body}
                        </span>
                      </span>
                    </div>
                    <button onClick={() => setDone((d) => [...d, t.id])} style={S.tipSkip}>Entendido</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            {shown.map((m, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.me ? 'flex-end' : 'flex-start' }}>
                <div style={m.me ? S.bubbleMe : S.bubbleAi}>{m.text}</div>
              </div>
            ))}
            {thinking && (
              <div style={S.thinking}>
                <span style={S.spinner} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--muted)' }}>Pensando…</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 'none', padding: '10px 20px 24px', borderTop: '1px solid var(--border)' }}>
          <div className="hs" style={{ display: 'flex', gap: 8, margin: '0 -20px 11px', padding: '0 20px' }}>
            {CHIPS.map((c) => (
              <button key={c} onClick={() => say(c)} style={S.chip}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') say(draft); }}
              placeholder="Pregúntale a Tura IA"
              style={S.input}
            />
            <button
              onClick={() => say(draft)}
              aria-label="Enviar"
              style={{
                ...S.send,
                opacity: draft.trim() ? 1 : 0.5,
              }}
            >
              <span className="ms" style={{ fontSize: 21 }}>arrow_upward</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  scrim: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(10px)', zIndex: 120,
  },
  sheet: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 130,
    height: '85vh', maxHeight: 800,
    background: 'rgba(20,20,20,0.65)', backdropFilter: 'blur(30px)',
    borderTop: '1px solid rgba(255,255,255,0.1)', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column',
  },
  grabber: {
    width: 48, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.2)',
    margin: '0 auto 16px',
  },
  avatar: {
    width: 46, height: 46, borderRadius: 16, flex: 'none',
    background: 'linear-gradient(135deg, rgba(217,154,21,0.2), rgba(217,154,21,0.05))',
    border: '1px solid rgba(217,154,21,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(217,154,21,0.1)'
  },
  close: {
    width: 44, height: 44, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer'
  },
  sectionLabel: {
    fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,0.5)',
  },
  tip: {
    background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 18,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  tipIcon: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tipSkip: {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 16px',
    borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: '#fff',
    fontSize: 13, fontWeight: 700, marginTop: 14, marginLeft: 49,
    border: 'none', cursor: 'pointer'
  },
  bubbleMe: {
    maxWidth: '85%', padding: '14px 18px', fontSize: 14.5, lineHeight: 1.5,
    background: '#D99A15', color: '#000', borderRadius: '24px 24px 8px 24px',
    fontWeight: 600,
  },
  bubbleAi: {
    maxWidth: '85%', padding: '14px 18px', fontSize: 14.5, lineHeight: 1.5,
    background: 'rgba(255,255,255,0.06)', color: '#fff', borderRadius: '8px 24px 24px 24px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  thinking: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    padding: '12px 18px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px 24px 24px 24px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  spinner: {
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#D99A15',
    animation: 'spin 1s linear infinite',
  },
  footer: {
    padding: '12px 20px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  chipsRow: {
    display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch',
  },
  suggChip: {
    whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 99, flex: 'none',
    background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)',
    fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
  },
  inputRow: { display: 'flex', alignItems: 'flex-end', gap: 10 },
  inputWrap: {
    flex: 1, minWidth: 0, borderRadius: 20, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 8,
  },
  input: {
    flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 15, fontFamily: 'inherit', resize: 'none',
  },
  send: {
    width: 44, height: 44, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#D99A15', color: '#000', border: 'none', cursor: 'pointer'
  },
};
