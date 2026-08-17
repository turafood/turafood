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
                background: draft.trim() ? 'var(--text)' : 'var(--surface2)',
                color: draft.trim() ? '#fff' : 'var(--faint)',
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
  scrim: { position: 'absolute', inset: 0, background: 'rgba(23,20,15,.46)', zIndex: 100 },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 101,
    background: 'var(--surface)', borderRadius: '30px 30px 0 0',
    boxShadow: '0 -20px 60px rgba(0,0,0,.26)',
    animation: 'up .3s cubic-bezier(.2,.9,.25,1)',
    maxHeight: '84%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  grabber: {
    width: 42, height: 4, borderRadius: 99, background: 'var(--faint)', margin: '0 auto 14px',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 13, flex: 'none',
    background: 'linear-gradient(150deg,#2A2620,#17140F)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  close: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em' },
  tip: { border: '1px solid var(--border)', borderRadius: 16, padding: 14, background: 'var(--bg)' },
  tipIcon: {
    width: 32, height: 32, borderRadius: 9, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tipSkip: {
    height: 34, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginTop: 11,
  },
  bubbleMe: {
    maxWidth: '88%', padding: '12px 15px', fontSize: 14, lineHeight: 1.5, textWrap: 'pretty',
    background: 'var(--primary)', color: '#fff', borderRadius: '18px 18px 6px 18px',
  },
  bubbleAi: {
    maxWidth: '88%', padding: '12px 15px', fontSize: 14, lineHeight: 1.5, textWrap: 'pretty',
    background: 'var(--bg)', borderRadius: '18px 18px 18px 6px',
  },
  thinking: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '12px 15px',
    background: 'var(--bg)', borderRadius: '16px 16px 16px 5px', alignSelf: 'flex-start',
  },
  spinner: {
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid var(--surface2)', borderTopColor: 'var(--text)',
    animation: 'spin .7s linear infinite',
  },
  chip: {
    flex: 'none', height: 36, padding: '0 14px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  input: {
    flex: 1, height: 48, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 17px', fontSize: 16, outline: 'none', minWidth: 0,
  },
  send: {
    width: 48, height: 48, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
