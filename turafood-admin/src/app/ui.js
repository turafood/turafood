'use client';

/**
 * PIEZAS COMPARTIDAS DE LA CONSOLA
 *
 * Tarjetas, píldoras, paneles y estados vacíos. Están juntas porque
 * son las mismas nueve pantallas repitiendo las mismas seis formas:
 * tenerlas sueltas en cada archivo garantizaba que se fueran
 * separando con el tiempo.
 */

import { useState } from 'react';

/* ---------------------------------------------------------------- panel */

export function Panel({ title, sub, right, children, pad = 18, style }) {
  return (
    <section style={{ ...S.panel, ...style }}>
      {(title || right) && (
        <header style={{ ...S.panelHead, padding: `${pad}px ${pad}px 0` }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={S.panelTitle}>{title}</div>}
            {sub && <div style={S.panelSub}>{sub}</div>}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- cifras */

export function Kpi({ label, value, icon, tint = '#EAF1FF', color = 'var(--blue)', note, noteColor = 'var(--muted)' }) {
  return (
    <div style={S.kpi}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <span style={S.kpiLabel}>{label}</span>
        {icon && (
          <span style={{ ...S.kpiIcon, background: tint }}>
            <span className="ms" style={{ fontSize: 18, color }}>{icon}</span>
          </span>
        )}
      </div>
      <div style={S.kpiValue}>{value}</div>
      {note && <div style={{ ...S.kpiNote, color: noteColor }}>{note}</div>}
    </div>
  );
}

/** La tarjeta oscura del GMV: la única con peso visual en el tablero,
 *  porque es la cifra que se mira primero. */
export function HeroCard({ label, value, delta, spark = [], stats = [] }) {
  const max = Math.max(...spark, 1);
  return (
    <div style={S.hero}>
      <div style={S.heroGlow} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={S.heroLabel}>{label}</span>
        {delta && (
          <span style={S.heroDelta}>
            <span className="ms" style={{ fontSize: 13 }}>trending_up</span>
            {delta}
          </span>
        )}
      </div>

      <div style={S.heroValue}>{value}</div>

      {spark.length > 0 && (
        <div style={S.heroSpark}>
          {spark.map((v, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: `${Math.max((v / max) * 100, 6)}%`,
                borderRadius: '3px 3px 1px 1px',
                background: i === spark.length - 2
                  ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                  : 'rgba(255,255,255,.16)',
              }}
            />
          ))}
        </div>
      )}

      {stats.length > 0 && (
        <div style={S.heroStats}>
          {stats.map((s) => (
            <div key={s.label} style={{ flex: 1 }}>
              <div style={S.heroStatLabel}>{s.label}</div>
              <div style={S.heroStatValue}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- píldoras */

export function Pill({ label, bg = 'var(--surface2)', color = 'var(--muted)', style }) {
  return <span style={{ ...S.pill, background: bg, color, ...style }}>{label}</span>;
}

export function Tabs({ items, value, onChange }) {
  return (
    <div style={S.tabs}>
      {items.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{ ...S.tab, ...(on ? S.tabOn : S.tabOff) }}
          >
            {t.label}
            {t.count > 0 && (
              <span style={{ ...S.tabCount, background: on ? 'rgba(255,255,255,.22)' : 'var(--surface2)' }}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- avatar */

/** Iniciales sobre color estable: el mismo nombre siempre sale del
 *  mismo color, así la lista se reconoce de un vistazo. */
export function Initials({ name, size = 34, radius }) {
  const text = String(name ?? '?')
    .split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  let hash = 0;
  for (let i = 0; i < String(name ?? '').length; i += 1) {
    hash = (hash * 31 + String(name).charCodeAt(i)) % 360;
  }

  return (
    <span
      style={{
        width: size, height: size, flex: 'none',
        borderRadius: radius ?? size / 2.6,
        background: `hsl(${hash} 62% 93%)`,
        color: `hsl(${hash} 52% 34%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.36, fontWeight: 800, letterSpacing: '-.01em',
      }}
    >
      {text}
    </span>
  );
}

/* ---------------------------------------------------------------- estados */

export function Empty({ icon = 'inbox', title, note }) {
  return (
    <div style={S.empty}>
      <span style={S.emptyIcon}>
        <span className="ms" style={{ fontSize: 26, color: 'var(--faint)' }}>{icon}</span>
      </span>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginTop: 12 }}>{title}</div>
      {note && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5, maxWidth: 320 }}>{note}</div>}
    </div>
  );
}

export function Skeleton({ rows = 3, height = 76 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk" style={{ height, borderRadius: 18 }} />
      ))}
    </div>
  );
}

export function ErrorNote({ text }) {
  if (!text) return null;
  return (
    <div style={S.error}>
      <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
      <span>{text}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- barras */

/** Barra de proporción con la etiqueta al lado. Se usa en la mezcla
 *  por vertical y en los indicadores de soporte. */
export function Meter({ label, value, max = 100, suffix = '%', color = 'var(--primary)' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted)' }}>
          {value}{suffix}
        </span>
      </div>
      <div style={S.meterTrack}>
        <div style={{ ...S.meterFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- diálogo */

/**
 * Pedir el motivo antes de rechazar.
 *
 * No es un `prompt()` porque el motivo se lo va a leer una persona en
 * su panel: merece un campo de verdad, con el nombre de a quién se le
 * está rechazando a la vista mientras se escribe.
 */
export function ReasonDialog({ open, title, note, confirmLabel = 'Rechazar', onCancel, onConfirm, busy }) {
  const [reason, setReason] = useState('');

  if (!open) return null;

  return (
    <div style={S.modalScrim} onClick={onCancel}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()} className="anim-pop">
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18 }}>{title}</div>
        {note && <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{note}</p>}

        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Escribe qué falta o qué está mal. Esto es lo que va a leer la persona."
          style={S.textarea}
        />

        <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
          <button onClick={onCancel} style={S.btnGhost}>Volver</button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || reason.trim().length < 8}
            style={{ ...S.btnDanger, opacity: reason.trim().length < 8 ? 0.5 : 1 }}
          >
            {busy ? 'Enviando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- botones */

export const btn = {
  primary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, padding: '0 20px', borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontSize: 14, fontWeight: 800, transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(255, 68, 31, 0.25)',
  },
  green: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 48, padding: '0 20px', borderRadius: 16, background: 'var(--green)',
    color: '#fff', fontSize: 14.5, fontWeight: 800, width: '100%',
    boxShadow: '0 4px 15px rgba(11, 142, 84, 0.25)', transition: 'all 0.2s ease',
  },
  ghost: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 46, padding: '0 18px', borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.06)', background: 'rgba(255,255,255,0.6)',
    fontSize: 13.5, fontWeight: 800, backdropFilter: 'blur(10px)', transition: 'all 0.2s ease',
  },
  danger: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 42, padding: '0 16px', borderRadius: 999,
    background: '#FFF0ED', color: '#C0341A', fontSize: 13, fontWeight: 700,
  },
};

const S = {
  panel: {
    background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.03)', overflow: 'hidden',
  },
  panelHead: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: 16,
  },
  panelTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em',
  },
  panelSub: { fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontWeight: 500 },

  kpi: {
    background: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: 24, padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
    transition: 'transform 0.2s ease',
  },
  kpiLabel: { fontSize: 12, fontWeight: 700, color: 'var(--muted)' },
  kpiIcon: {
    width: 30, height: 30, borderRadius: 10, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  kpiValue: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 27,
    letterSpacing: '-.03em', marginTop: 10,
  },
  kpiNote: { fontSize: 11.5, fontWeight: 700, marginTop: 6 },

  hero: {
    borderRadius: 28, padding: 19, color: '#fff', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 66%)',
    boxShadow: '0 16px 40px rgba(20,16,10,.2)',
  },
  heroGlow: {
    position: 'absolute', right: -50, top: -60, width: 200, height: 200, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,68,31,.32), rgba(255,68,31,0) 70%)',
  },
  heroLabel: { fontSize: 10, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' },
  heroDelta: {
    display: 'flex', alignItems: 'center', gap: 4, height: 23, padding: '0 9px',
    borderRadius: 999, background: 'rgba(255,255,255,.1)',
    fontSize: 10, fontWeight: 800, color: '#7BE0AE',
  },
  heroValue: {
    position: 'relative', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 31, letterSpacing: '-.03em', marginTop: 8,
  },
  heroSpark: {
    position: 'relative', display: 'flex', alignItems: 'flex-end',
    gap: 4, height: 34, marginTop: 13,
  },
  heroStats: {
    position: 'relative', display: 'flex', gap: 10, marginTop: 15,
    paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.12)',
  },
  heroStatLabel: { fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.45)' },
  heroStatValue: { fontSize: 14, fontWeight: 800, marginTop: 3 },

  pill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
    borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.03em',
    whiteSpace: 'nowrap',
  },

  tabs: { display: 'flex', gap: 8, flexWrap: 'wrap', background: 'rgba(0,0,0,0.03)', padding: 6, borderRadius: 16 },
  tab: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 38, padding: '0 16px',
    borderRadius: 12, fontSize: 13, fontWeight: 800, transition: 'all 0.2s ease',
  },
  tabOn: { background: '#fff', color: 'var(--text)', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  tabOff: { background: 'transparent', color: 'var(--muted)' },
  tabCount: {
    minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 800,
  },

  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center', padding: '46px 20px',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: '#C0341A',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },

  meterTrack: { height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 99, transition: 'width .5s cubic-bezier(.2,0,0,1)' },

  modalScrim: {
    position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    background: 'rgba(20,16,10,.5)', backdropFilter: 'blur(3px)',
  },
  modal: {
    width: '100%', maxWidth: 440, background: 'var(--surface)',
    borderRadius: 24, padding: 22, boxShadow: 'var(--shadow)',
  },
  textarea: {
    width: '100%', minHeight: 108, marginTop: 14, padding: 13, borderRadius: 14,
    border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 13.5, lineHeight: 1.5, resize: 'vertical', outline: 'none',
    fontFamily: 'inherit',
  },
  btnGhost: {
    flex: 1, height: 46, borderRadius: 14, border: '1px solid var(--border)',
    fontSize: 13.5, fontWeight: 700,
  },
  btnDanger: {
    flex: 1, height: 46, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontSize: 13.5, fontWeight: 700,
  },
};
