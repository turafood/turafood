'use client';

/**
 * TURA IA — panel lateral del negocio
 * Conversión de `aiOpen` (línea 972) del mockup de Negocios.
 *
 * Las respuestas son las mismas del mockup: reglas sobre palabras clave,
 * sin llamar a ningún modelo. Cuando exista el servicio real solo cambia
 * `answer()`; la pantalla no se toca.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const CONTEXT_BY_PATH = {
  '/negocio': 'Revisa tu día y te dice qué priorizar',
  '/negocio/pedidos': 'Vigila la cocina y los tiempos',
  '/negocio/historial': 'Busca patrones en tus pedidos',
  '/negocio/catalogo': 'Sugiere precios y platos a impulsar',
  '/negocio/promociones': 'Diseña promociones que sí rinden',
  '/negocio/resenas': 'Redacta respuestas a tus clientes',
  '/negocio/reportes': 'Explica tus números en palabras',
  '/negocio/liquidaciones': 'Aclara descuentos y consignaciones',
  '/negocio/sucursales': 'Compara el desempeño por sede',
  '/negocio/horarios': 'Ajusta horarios según la demanda',
  '/negocio/equipo': 'Organiza permisos y turnos',
};

const CHIPS_BY_PATH = {
  '/negocio': ['¿Qué debo revisar hoy?', '¿Cuál es mi hora pico?'],
  '/negocio/pedidos': ['¿Por qué se demoran los pedidos?', '¿Cuál es mi hora pico?'],
  '/negocio/catalogo': ['¿Qué es lo más vendido?', '¿Puedo subir precios?'],
  '/negocio/promociones': ['¿Qué promoción me conviene?', '¿Cuál es mi día más flojo?'],
  '/negocio/resenas': ['¿Cómo respondo una crítica?', '¿Qué dicen mis reseñas?'],
  '/negocio/reportes': ['¿Cómo voy este mes?', '¿Qué es lo más vendido?'],
  '/negocio/liquidaciones': ['¿Cuánto me consignan?', '¿Qué me descuentan?'],
};

const DEFAULT_CHIPS = CHIPS_BY_PATH['/negocio'];

/** Respuestas del mockup, línea 1190 */
function answer(q) {
  const t = q.toLowerCase();
  if (t.includes('vend') || t.includes('más ped') || t.includes('mas ped') || t.includes('top'))
    return 'Tus tres platos más vendidos esta semana son la Picada Pacífico (84 pedidos), el Arroz atollado (61) y la Limonada de coco (58). La picada sola representa el 31% de tus ventas.';
  if (t.includes('precio') || t.includes('cobr') || t.includes('subir'))
    return 'La Picada Pacífico está $4.000 por debajo del promedio de tu zona y se agota casi todos los días. Subirla a $52.900 no debería afectar la demanda y suma cerca de $340.000 al mes.';
  if (t.includes('hora') || t.includes('cuándo') || t.includes('cuando') || t.includes('pico'))
    return 'Tu hora pico es de 7 a 9 p.m., con el 46% de los pedidos del día. Los martes son tu día más flojo: ahí una promo 2x1 rinde más que un descuento plano.';
  if (t.includes('reseñ') || t.includes('resen') || t.includes('calific') || t.includes('estrell'))
    return 'Tienes reseñas sin responder, y las críticas mencionan demoras y notas de pedido que no se leyeron. Responder en menos de 24 horas sube tu calificación promedio.';
  if (t.includes('demor') || t.includes('tiempo') || t.includes('tarde'))
    return 'Tu tiempo medio de preparación es 24 minutos, 6 más que hace un mes. El cuello de botella está entre las 7 y las 8 p.m. Marcar los pedidos como listos apenas salgan de cocina mejora el estimado que ve el cliente.';
  if (t.includes('promo') || t.includes('descuent') || t.includes('cupón') || t.includes('cupon'))
    return 'Te recomiendo una promo de martes con 2x1 en limonada: es tu producto de mayor margen y el día de menor volumen. Con 40 pedidos extra recuperas el costo el mismo día.';
  return 'Puedo ayudarte con precios, promociones, tiempos de preparación, reseñas o qué revisar hoy. Pregúntame por lo que más se vende o por dónde estás perdiendo pedidos.';
}

export default function TuraIA({ open, onClose, pendingReviews = 0, onTipCount }) {
  const router = useRouter();
  const path = usePathname();
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [done, setDone] = useState([]);
  const timer = useRef(null);
  const scroller = useRef(null);

  const allTips = [
    {
      id: 'rev',
      title: `Responde ${pendingReviews} ${pendingReviews === 1 ? 'reseña pendiente' : 'reseñas pendientes'}`,
      icon: 'reviews', bg: '#FFF7E6', fg: '#A8730B', cta: 'Ir a reseñas', go: '/negocio/resenas',
      body: 'Dos son críticas y mencionan demoras. Responder dentro de 24 horas mejora tu calificación y evita que el cliente se vaya.',
    },
    {
      id: 'price', title: 'Sube el precio de la Picada Pacífico',
      icon: 'trending_up', bg: '#E6F6EE', fg: '#0B8E54', cta: 'Ver catálogo', go: '/negocio/catalogo',
      body: 'Está $4.000 bajo el promedio de tu zona y se agota casi a diario. A $52.900 sumas unos $340.000 al mes sin perder pedidos.',
    },
    {
      id: 'promo', title: 'Crea una promo para el martes',
      icon: 'campaign', bg: '#EAF1FF', fg: '#2E6BFF', cta: 'Crear promoción', go: '/negocio/promociones',
      body: 'El martes es tu día más flojo. Un 2x1 en limonada de coco, tu producto de mayor margen, llena las horas muertas.',
    },
    {
      id: 'prep', title: 'Tu tiempo de preparación subió 6 minutos',
      icon: 'timer', bg: '#FFF1EC', fg: '#E2360F', cta: 'Ver pedidos en vivo', go: '/negocio/pedidos',
      body: 'Entre 7 y 8 p.m. la cocina se congestiona. Marca los pedidos como listos apenas salgan para que el estimado del cliente sea real.',
    },
  ];

  const tips = allTips
    .filter((t) => !done.includes(t.id))
    .filter((t) => t.id !== 'rev' || pendingReviews > 0);

  useEffect(() => {
    onTipCount?.(tips.length);
  }, [tips.length, onTipCount]);

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

  const chips = CHIPS_BY_PATH[path] ?? DEFAULT_CHIPS;
  const shown = msgs.length
    ? msgs
    : [{ me: false, text: 'Pregúntame por precios, promociones o por qué bajaron tus pedidos. Veo tus datos de los últimos 30 días.' }];

  return (
    <>
      <div onClick={onClose} className="anim-fade" style={S.scrim} />
      <aside style={S.panel}>
        <header style={S.header}>
          <span style={S.avatar}>
            <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--amber)' }}>auto_awesome</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>
              Tura IA
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              {CONTEXT_BY_PATH[path] ?? 'Mira tu negocio y te dice qué hacer'}
            </span>
          </span>
          <button onClick={onClose} style={S.close} aria-label="Cerrar Tura IA">
            <span className="ms" style={{ fontSize: 19 }}>close</span>
          </button>
        </header>

        <div ref={scroller} className="sc" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
          <div style={S.sectionLabel}>QUÉ HARÍA HOY</div>

          {tips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
                    <button
                      onClick={() => { setDone((d) => [...d, t.id]); onClose(); router.push(t.go); }}
                      style={S.tipCta}
                    >
                      {t.cta}
                    </button>
                    <button onClick={() => setDone((d) => [...d, t.id])} style={S.tipSkip}>Ahora no</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 26 }}>task_alt</span>
              </span>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 12 }}>Todo al día</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                No veo nada urgente en esta sección.
              </div>
            </div>
          )}

          <div style={{ ...S.sectionLabel, marginTop: 24 }}>PREGÚNTAME</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
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

        <footer style={S.footer}>
          <div className="hs" style={{ display: 'flex', gap: 8, marginBottom: 11 }}>
            {chips.map((c) => (
              <button key={c} onClick={() => say(c)} style={S.chip}>{c}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') say(draft); }}
              placeholder="Escribe tu pregunta"
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
              <span className="ms" style={{ fontSize: 20 }}>arrow_upward</span>
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

const S = {
  scrim: { position: 'fixed', inset: 0, background: 'rgba(23,20,15,.34)', zIndex: 70 },
  panel: {
    position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100%)', zIndex: 71,
    background: 'var(--surface)', borderLeft: '1px solid var(--border)',
    boxShadow: '-20px 0 60px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column',
    animation: 'slidein .28s cubic-bezier(.2,.9,.25,1)',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
    padding: '20px 20px 16px', borderBottom: '1px solid var(--border)',
  },
  avatar: {
    width: 40, height: 40, borderRadius: 13, flex: 'none',
    background: 'linear-gradient(150deg,#2A2620,var(--ink))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  close: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  sectionLabel: { fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em' },
  tip: { border: '1px solid var(--border)', borderRadius: 16, padding: 15, background: 'var(--bg)' },
  tipIcon: {
    width: 32, height: 32, borderRadius: 9, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tipCta: {
    height: 38, padding: '0 16px', borderRadius: 999, background: 'var(--text)',
    color: '#fff', fontSize: 12.5, fontWeight: 700,
  },
  tipSkip: {
    height: 38, padding: '0 14px', borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '40px 20px', border: '1px dashed var(--border)', borderRadius: 16, marginTop: 12,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: '50%', background: '#E6F6EE', color: '#0B8E54',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bubbleMe: {
    maxWidth: '88%', padding: '12px 15px', fontSize: 13.5, lineHeight: 1.5, textWrap: 'pretty',
    background: 'var(--primary)', color: '#fff', borderRadius: '16px 16px 5px 16px',
  },
  bubbleAi: {
    maxWidth: '88%', padding: '12px 15px', fontSize: 13.5, lineHeight: 1.5, textWrap: 'pretty',
    background: 'var(--bg)', borderRadius: '16px 16px 16px 5px',
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
  footer: { flex: 'none', padding: '12px 20px 20px', borderTop: '1px solid var(--border)' },
  chip: {
    flex: 'none', height: 34, padding: '0 13px', borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
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
