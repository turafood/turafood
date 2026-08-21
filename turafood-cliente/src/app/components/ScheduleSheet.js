'use client';

/**
 * PROGRAMAR PEDIDO
 *
 * Hoja con los próximos días y sus franjas horarias. Las franjas se
 * generan desde el horario del negocio, no de una lista fija: si el
 * sitio abre a las 10 y cierra a las 22, no ofrece las 8 de la mañana.
 *
 * Para hoy solo muestra franjas que todavía alcanzan, contando el
 * tiempo de preparación.
 */

import { useEffect, useMemo, useState } from 'react';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Próximos 5 días desde hoy */
function nextDays(count = 5) {
  const days = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      key: d.toISOString().slice(0, 10),
      date: d,
      label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAY_NAMES[d.getDay()],
      sub: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
      isToday: i === 0,
    });
  }
  return days;
}

/**
 * Franjas de una hora dentro del horario del negocio.
 * `prepMin` empuja la primera franja disponible de hoy.
 */
function slotsFor(day, { opensAt = 10, closesAt = 22, prepMin = 30 }) {
  const slots = [];
  const now = new Date();
  const earliest = new Date(now.getTime() + prepMin * 60000);

  for (let h = opensAt; h < closesAt; h += 1) {
    const start = new Date(day.date);
    start.setHours(h, 0, 0, 0);

    // Para hoy, descartar lo que ya no alcanza
    if (day.isToday && start < earliest) continue;

    slots.push({
      key: `${day.key}-${h}`,
      label: `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`,
      iso: start.toISOString(),
    });
  }
  return slots;
}

export default function ScheduleSheet({
  open,
  onClose,
  onSelect,
  address,
  business,
  selected,
}) {
  const days = useMemo(() => nextDays(), []);
  const [dayKey, setDayKey] = useState(days[0].key);
  const [slotKey, setSlotKey] = useState(selected?.key ?? null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const day = days.find((d) => d.key === dayKey) ?? days[0];
  const slots = useMemo(
    () => slotsFor(day, { prepMin: business?.prep_time_min ?? 30 }),
    [day, business?.prep_time_min],
  );

  if (!open) return null;

  const chosen = slots.find((s) => s.key === slotKey);

  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Programar pedido">

        <div style={S.header}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
            Programa tu pedido
          </span>
          <button onClick={onClose} style={S.closeBtn} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {address && (
          <div style={S.address}>
            <span className="ms" style={{ fontSize: 20, color: 'var(--muted)', flex: 'none' }}>location_on</span>
            <span className="tr1" style={{ fontSize: 14, fontWeight: 600 }}>{address}</span>
          </div>
        )}

        {/* Días */}
        <div className="hs" style={S.days}>
          {days.map((d) => {
            const on = dayKey === d.key;
            return (
              <button
                key={d.key}
                onClick={() => { setDayKey(d.key); setSlotKey(null); }}
                style={{
                  ...S.day,
                  background: on ? 'var(--text)' : 'var(--surface)',
                  color: on ? '#fff' : 'var(--text)',
                  border: on ? 'none' : '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 14.5, fontWeight: 800 }}>{d.label}</span>
                <span style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>{d.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Franjas */}
        <div className="sc" style={S.slots}>
          {slots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <span className="ms" style={{ fontSize: 30, color: 'var(--faint)' }}>schedule</span>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 10 }}>
                Ya no hay franjas para hoy
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                Elige otro día para programar tu pedido.
              </div>
            </div>
          )}

          {slots.map((s) => {
            const on = slotKey === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSlotKey(s.key)}
                style={{
                  ...S.slot,
                  border: on ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 15, fontWeight: on ? 800 : 600 }}>{s.label}</span>
                <span style={S.freeTag}>
                  <span className="ms" style={{ fontSize: 13 }}>workspace_premium</span>
                  Gratis
                </span>
              </button>
            );
          })}
        </div>

        <div style={S.footer}>
          <button
            onClick={() => { onSelect({ ...chosen, dayLabel: day.label }); onClose(); }}
            disabled={!chosen}
            style={{
              ...S.confirmBtn,
              background: chosen ? 'var(--primary)' : 'var(--surface2)',
              color: chosen ? '#fff' : 'var(--faint)',
              boxShadow: chosen ? '0 10px 24px rgba(255,68,31,.3)' : 'none',
            }}
          >
            {chosen ? `Programar para ${day.label}, ${chosen.label}` : 'Elige una franja'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 330,
    background: 'rgba(15, 12, 9, 0.72)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '16px',
    animation: 'fade .16s ease both',
  },
  sheet: {
    width: '100%', maxWidth: 500, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', borderRadius: 28,
    border: '1px solid var(--border)',
    boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
    animation: 'scaleUp .22s cubic-bezier(0.16, 1, 0.3, 1) both',
    overflow: 'hidden',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '22px 22px 14px', borderBottom: '1px solid var(--border)',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  address: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 22px 0',
  },
  days: {
    flex: 'none', display: 'flex', gap: 10, padding: '16px 22px 4px',
  },
  day: {
    flex: 'none', minWidth: 92, height: 68, borderRadius: 16,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '0 14px',
  },
  slots: {
    flex: 1, overflowY: 'auto', padding: '14px 22px 8px',
    display: 'flex', flexDirection: 'column', gap: 9, minHeight: 0,
  },
  slot: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', height: 56, padding: '0 16px', borderRadius: 15,
    background: 'var(--surface)',
  },
  freeTag: {
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'var(--amber)', color: '#17140F',
    fontSize: 11.5, fontWeight: 800, padding: '5px 9px', borderRadius: 7,
  },
  footer: {
    flex: 'none', padding: '12px 22px 24px',
    borderTop: '1px solid var(--border)', background: 'var(--surface)',
  },
  confirmBtn: {
    width: '100%', height: 54, borderRadius: 999, fontWeight: 800, fontSize: 15,
  },
};
