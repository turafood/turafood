'use client';

/**
 * ZONAS Y TARIFAS
 *
 * Las cuatro zonas de cobertura con su tarifa, las comisiones por
 * vertical y los interruptores de la plataforma.
 *
 * Los interruptores cambian de estado en pantalla pero todavía no
 * escriben en la base: falta la tabla de configuración. Se dice en la
 * pantalla en vez de fingir que guardó — un interruptor que se mueve
 * y no hace nada es peor que uno que avisa.
 */

import { useState } from 'react';
import { cop } from '@/lib/format';
import { ZONES, COMMISSIONS, PLATFORM_RULES } from '@/lib/admin';
import { Panel } from '../../ui';

export default function ZonasPage() {
  const [rules, setRules] = useState(PLATFORM_RULES);
  const [rates, setRates] = useState(COMMISSIONS);
  const [editing, setEditing] = useState(null);

  const toggle = (id) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, on: !r.on } : r)));
  };

  const saveRate = (vertical, value) => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n <= 40) {
      setRates((prev) => prev.map((r) => (r.vertical === vertical ? { ...r, rate: n } : r)));
    }
    setEditing(null);
  };

  return (
    <>
      <div style={S.split}>
        {/* Zonas */}
        <Panel title="Cobertura actual" sub="Cuatro zonas · tarifa base, por kilómetro y pedido mínimo">
          <div style={S.zoneMap}>
            {ZONES.map((z, i) => (
              <span
                key={z.id}
                style={{
                  ...S.zoneBlob,
                  background: `${z.color}22`,
                  border: `2px dashed ${z.color}`,
                  width: 90 + i * 26,
                  height: 90 + i * 26,
                  left: `${12 + i * 17}%`,
                  top: `${18 + (i % 2) * 20}%`,
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 800, color: z.color }}>
                  Zona {i + 1}
                </span>
              </span>
            ))}
            <span style={S.mapNote}>
              Buenaventura · el mapa real se dibuja con las coordenadas de{' '}
              <code style={S.code}>delivery_zones</code>
            </span>
          </div>

          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <div style={{ ...S.row, ...S.head }}>
              <span>ZONA</span><span>TARIFA BASE</span><span>POR KM</span>
              <span style={{ textAlign: 'right' }}>MÍNIMO</span>
            </div>
            {ZONES.map((z) => (
              <div key={z.id} style={S.row}>
                <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
                  <span style={{ ...S.swatch, background: z.color }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{z.name}</span>
                    <span style={S.areas}>{z.areas}</span>
                  </span>
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{cop(z.base)}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{cop(z.perKm)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right', color: 'var(--blue)' }}>
                  {cop(z.min)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Comisiones */}
          <Panel title="Comisiones por vertical" sub="Lo que TuraFood se queda de cada pedido">
            {rates.map((c) => (
              <div key={c.vertical} style={S.rateRow}>
                <span style={S.rateIcon}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>{c.icon}</span>
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.label}</span>

                {editing === c.vertical ? (
                  <input
                    autoFocus
                    type="number"
                    defaultValue={c.rate}
                    min={0}
                    max={40}
                    onBlur={(e) => saveRate(c.vertical, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRate(c.vertical, e.target.value);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                    style={S.rateInput}
                  />
                ) : (
                  <>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{c.rate}%</span>
                    <button onClick={() => setEditing(c.vertical)} style={S.editBtn} aria-label="Editar">
                      <span className="ms" style={{ fontSize: 15, color: 'var(--muted)' }}>edit</span>
                    </button>
                  </>
                )}
              </div>
            ))}

            <p style={S.pending}>
              <span className="ms" style={{ fontSize: 15, verticalAlign: '-2px' }}>info</span>
              {' '}Los cambios se ven aquí pero todavía no se guardan: falta la tabla de
              configuración de la plataforma. Por ahora la comisión real es la de cada
              negocio en <code style={S.code}>business_profiles.commission_rate</code>.
            </p>
          </Panel>

          {/* Reglas */}
          <Panel title="Reglas de la plataforma">
            {rules.map((r, i) => (
              <div
                key={r.id}
                style={{ ...S.ruleRow, borderBottom: i === rules.length - 1 ? 'none' : '1px solid var(--border)' }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{r.label}</span>
                  <span style={S.ruleNote}>{r.note}</span>
                </span>
                <button
                  onClick={() => toggle(r.id)}
                  role="switch"
                  aria-checked={r.on}
                  style={{ ...S.switch, background: r.on ? 'var(--green)' : 'var(--surface2)' }}
                >
                  <span style={{ ...S.knob, transform: r.on ? 'translateX(20px)' : 'none' }} />
                </button>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

const GRID = 'minmax(160px,2fr) 110px 90px 100px';

const S = {
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(280px,1fr)', gap: 16, alignItems: 'start' },

  zoneMap: {
    position: 'relative', height: 220, borderRadius: 16, overflow: 'hidden',
    background: 'linear-gradient(140deg,#EDEBE6,#E3E0D9)',
  },
  zoneBlob: {
    position: 'absolute', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  mapNote: {
    position: 'absolute', left: 12, bottom: 10, right: 12,
    fontSize: 10.5, color: 'var(--muted)', fontWeight: 600,
  },

  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 480, padding: '11px 0', borderBottom: '1px solid var(--border)',
  },
  head: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' },
  swatch: { width: 10, height: 10, borderRadius: 3, flex: 'none', marginTop: 4 },
  areas: { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2 },

  rateRow: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  },
  rateIcon: {
    width: 32, height: 32, borderRadius: 10, background: 'var(--bg)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rateInput: {
    width: 62, height: 32, borderRadius: 9, padding: '0 9px', textAlign: 'right',
    border: '1px solid var(--primary)', outline: 'none', fontSize: 13.5, fontWeight: 800,
  },
  editBtn: {
    width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },

  ruleRow: { display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0' },
  ruleNote: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 },
  switch: {
    width: 44, height: 24, borderRadius: 999, flex: 'none', padding: 2,
    display: 'flex', alignItems: 'center', transition: 'background .2s ease',
  },
  knob: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,.25)', transition: 'transform .2s cubic-bezier(.2,0,0,1)',
  },

  pending: {
    margin: '14px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55,
  },
  code: {
    background: 'var(--surface2)', borderRadius: 5, padding: '1px 5px',
    fontSize: 11, color: 'var(--text)',
  },
};
