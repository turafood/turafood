'use client';

/**
 * HORARIOS Y DISPONIBILIDAD
 * Conversión de `isHours` (línea 558) del mockup de Negocios.
 *
 * Los horarios se guardan en `business_hours`. La pausa temporal cierra
 * la tienda (`is_open = false`) y la vuelve a abrir sola al vencer.
 */

import { useEffect, useRef, useState } from 'react';
import { DAY_LABELS, getHours, upsertHour, setStoreOpen } from '@/lib/negocio';
import { useBiz } from '../BizContext';

/** Orden de lunes a domingo, como se lee un horario */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

const PAUSES = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: 'Resto del día', minutes: null },
];

/** "21:30:00" -> "9:30 p.m." */
function pretty(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  const ap = h >= 12 ? 'p.m.' : 'a.m.';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function HorariosPage() {
  const { business, toast } = useBiz();
  const [hours, setHours] = useState([]);
  const [pause, setPause] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getHours(business.id);
        if (alive) setHours(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const byDay = (d) => hours.find((h) => h.day_of_week === d);

  const toggleDay = async (day) => {
    const row = byDay(day);
    const next = !(row?.is_open ?? false);
    setHours((list) => {
      const exists = list.some((h) => h.day_of_week === day);
      if (exists) return list.map((h) => (h.day_of_week === day ? { ...h, is_open: next } : h));
      return [...list, { day_of_week: day, is_open: next, opens_at: '11:00', closes_at: '21:00' }];
    });
    try {
      await upsertHour(business.id, day, {
        is_open: next,
        opens_at: row?.opens_at ?? '11:00',
        closes_at: row?.closes_at ?? '21:00',
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const changeTime = async (day, field, value) => {
    const row = byDay(day);
    setHours((list) => list.map((h) => (h.day_of_week === day ? { ...h, [field]: value } : h)));
    try {
      await upsertHour(business.id, day, {
        is_open: row?.is_open ?? true,
        opens_at: field === 'opens_at' ? value : (row?.opens_at ?? '11:00'),
        closes_at: field === 'closes_at' ? value : (row?.closes_at ?? '21:00'),
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const applyPause = async (i) => {
    const p = PAUSES[i];
    setPause(i);
    try {
      await setStoreOpen(business.id, false);
      toast(`Pedidos pausados ${p.label.toLowerCase()}`);
      clearTimeout(timer.current);
      if (p.minutes) {
        // Se reactiva sola mientras la pestaña siga abierta. Si se cierra,
        // el negocio reabre con el interruptor de la barra superior.
        timer.current = setTimeout(async () => {
          await setStoreOpen(business.id, true);
          setPause(-1);
          toast('Tienda abierta de nuevo');
        }, p.minutes * 60000);
      }
    } catch (err) {
      setError(err.message);
      setPause(-1);
    }
  };

  return (
    <>
      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16, alignItems: 'start' }}>
        <section style={S.card}>
          <div style={S.cardTitle}>Horario de atención</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
            Los clientes solo pueden pedir dentro de estas franjas.
          </div>

          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Cargando…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 14 }}>
              {ORDER.map((day, i) => {
                const row = byDay(day);
                const open = row?.is_open ?? false;
                return (
                  <div
                    key={day}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                      borderBottom: i === ORDER.length - 1 ? 'none' : '1px solid var(--border)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      onClick={() => toggleDay(day)}
                      aria-label={`${open ? 'Cerrar' : 'Abrir'} ${DAY_LABELS[day]}`}
                      style={{ ...S.track, background: open ? 'var(--green)' : 'var(--surface2)', boxShadow: open ? '0 0 10px rgba(16,185,129,0.3)' : 'none' }}
                    >
                      <span style={{ ...S.knob, transform: open ? 'translateX(20px)' : 'none' }} />
                    </button>
                    <span style={{ flex: 'none', width: 96, fontSize: 13.5, fontWeight: 700 }}>
                      {DAY_LABELS[day]}
                    </span>

                    {open ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                        <input
                          type="time"
                          value={String(row?.opens_at ?? '11:00').slice(0, 5)}
                          onChange={(e) => changeTime(day, 'opens_at', e.target.value)}
                          style={S.time}
                          aria-label={`Apertura ${DAY_LABELS[day]}`}
                        />
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>a</span>
                        <input
                          type="time"
                          value={String(row?.closes_at ?? '21:00').slice(0, 5)}
                          onChange={(e) => changeTime(day, 'closes_at', e.target.value)}
                          style={S.time}
                          aria-label={`Cierre ${DAY_LABELS[day]}`}
                        />
                        <span style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 700 }}>
                          {pretty(row?.opens_at)} – {pretty(row?.closes_at)}
                        </span>
                      </span>
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                        Cerrado todo el día
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section style={S.card}>
            <div style={S.cardTitle}>Pausa temporal</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
              Deja de recibir pedidos sin cerrar la tienda. Se reactiva sola.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 14 }}>
              {PAUSES.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => applyPause(i)}
                  style={{ ...S.chip, ...(i === pause ? S.chipOn : S.chipOff) }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {pause >= 0 && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 12, lineHeight: 1.45 }}>
                La tienda está en pausa. Si cierras esta pestaña, vuelve a abrirla desde el
                interruptor de arriba.
              </div>
            )}
          </section>

          <section style={S.card}>
            <div style={S.cardTitle}>Tiempos de preparación</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ fontWeight: 700 }}>Prometido a los clientes</span>
                  <span style={{ fontWeight: 800 }}>{business?.prep_time_min ?? 25} min</span>
                </div>
                <div style={S.bar}>
                  <div style={{ height: '100%', borderRadius: 99, width: '93%', background: 'var(--surface2)', border: '1px solid var(--border)' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                  Es el tiempo que ve el cliente al pedirte.
                </div>
              </div>
            </div>
          </section>

          <section style={{ ...S.card, background: 'linear-gradient(180deg, rgba(255,68,31,0.03) 0%, rgba(255,68,31,0.01) 100%)', border: '1px solid rgba(255,68,31,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--ink)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8, letterSpacing: '.05em' }}>
                <span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Guía IA
              </span>
              <div style={S.cardTitle}>Consejos de disponibilidad</div>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text)', marginTop: 14 }}>
              Cerrar la tienda de imprevisto más de 3 veces durante tu horario habitual <b>afecta negativamente tu posicionamiento</b> en la app.
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', marginTop: 12 }}>
              <span className="ms" style={{ fontSize: 18, color: '#A8730B', marginBottom: 4 }}>lightbulb</span>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                Si tienes un "pico" de trabajo en cocina y no das abasto, no apagues tu tienda. Usa la <b>Pausa Temporal</b> de 15 o 30 minutos arriba.
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

const S = {
  card: {
    background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: 22, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
    transition: 'box-shadow 0.3s ease',
  },
  cardTitle: { fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 },
  track: { 
    width: 44, height: 24, borderRadius: 99, padding: 3, display: 'flex', flex: 'none',
    transition: 'background 0.3s ease, box-shadow 0.3s ease'
  },
  knob: { 
    width: 18, height: 18, borderRadius: '50%', background: '#fff', 
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 2px 5px rgba(0,0,0,.15)'
  },
  time: {
    height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
    background: 'var(--bg)', fontSize: 13.5, fontWeight: 700, outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)', transition: 'border-color 0.2s',
  },
  chip: { height: 40, padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, transition: 'all 0.2s ease' },
  chipOn: { background: 'var(--text)', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  chipOff: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid transparent' },
  bar: { height: 8, borderRadius: 99, background: 'var(--bg)', marginTop: 8, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)' },
  warning: {
    display: 'flex', gap: 11, background: '#FFF7E6', border: '1px solid #F0DCA8',
    borderRadius: 18, padding: 18,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
