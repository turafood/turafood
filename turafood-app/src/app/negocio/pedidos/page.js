'use client';

/**
 * PEDIDOS EN VIVO
 * Conversión de `isLive` (línea 352) del mockup de Negocios.
 *
 * El tablero se alimenta de la suscripción Realtime que abre el armazón,
 * así que los pedidos nuevos entran solos. El botón de cada tarjeta
 * avanza el estado en la base; el cliente lo ve en su seguimiento.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cop, relativeTime } from '@/lib/format';
import { COLUMNS, columnOf, setOrderStatus } from '@/lib/negocio';
import { useBiz } from '../BizContext';

const PAY_LABEL = {
  cash: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', card: 'Tarjeta',
};

export default function PedidosPage() {
  const { orders, reloadOrders, toast, loading } = useBiz();
  const [filter, setFilter] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [sound, setSound] = useState(true);

  // Aviso sonoro cuando entra un pedido nuevo
  const prevNew = useRef(null);
  useEffect(() => {
    const count = orders.filter((o) => columnOf(o.status).key === 'nuevo').length;
    if (prevNew.current !== null && count > prevNew.current && sound) {
      beep();
    }
    prevNew.current = count;
  }, [orders, sound]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    orders.forEach((o) => {
      const col = columnOf(o.status);
      map[col.key]?.push(o);
    });
    return map;
  }, [orders]);

  const shown = filter ? COLUMNS.filter((c) => c.key === filter) : COLUMNS;

  const advance = async (order) => {
    const col = columnOf(order.status);
    if (!col.next) return;
    setBusyId(order.id);
    try {
      await setOrderStatus(order.id, col.next);
      await reloadOrders();
      toast(`${order.order_number} → ${nextLabel(col.next)}`);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (order) => {
    setBusyId(order.id);
    try {
      await setOrderStatus(order.id, 'cancelled', 'Rechazado por el negocio');
      await reloadOrders();
      toast(`${order.order_number} rechazado`);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const stats = [
    { label: 'Sin aceptar', value: String(grouped.nuevo.length), icon: 'notifications_active', bg: '#FDF0EA', fg: 'var(--primary)' },
    { label: 'En cocina', value: String(grouped.preparando.length), icon: 'skillet', bg: '#FFF7E6', fg: '#A8730B' },
    { label: 'Listos', value: String(grouped.listo.length), icon: 'timer', bg: '#E6F6EE', fg: '#0B8E54' },
    { label: 'Ventas en curso', value: cop(orders.reduce((a, o) => a + Number(o.total ?? 0), 0)), icon: 'payments', bg: '#EAF1FF', fg: 'var(--blue)' },
  ];

  return (
    <>
      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {COLUMNS.map((c) => {
          const on = filter === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setFilter(on ? null : c.key)}
              style={{ ...S.filter, ...(on ? S.chipOn : S.chipOff) }}
            >
              {c.label}
              <span style={{ ...S.filterCount, ...(on ? S.countOn : S.countOff) }}>
                {grouped[c.key].length}
              </span>
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setSound((s) => !s)}
          style={{
            ...S.sound,
            background: sound ? '#E6F6EE' : 'var(--surface2)',
            color: sound ? '#0B7A48' : 'var(--muted)',
          }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: sound ? 'var(--green)' : 'var(--faint)',
              animation: sound ? 'pulse 2s infinite' : 'none',
            }}
          />
          {sound ? 'Sonido de pedidos activo' : 'Sonido desactivado'}
        </button>
      </div>

      {/* Indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14, marginBottom: 14 }}>
        {stats.map((k) => (
          <div key={k.label} style={S.stat}>
            <span style={{ ...S.statIcon, background: k.bg }}>
              <span className="ms" style={{ fontSize: 18, color: k.fg }}>{k.icon}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>{k.label}</span>
              <span className="tr1" style={{ display: 'block', fontSize: 17, fontWeight: 800, marginTop: 1 }}>{k.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Tablero */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: 14, alignItems: 'start' }}>
        {shown.map((col) => {
          const list = grouped[col.key];
          return (
            <div key={col.key} style={S.column}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>{col.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{list.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {list.map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    column={col}
                    busy={busyId === o.id}
                    onAdvance={() => advance(o)}
                    onReject={() => reject(o)}
                  />
                ))}
                {list.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '26px 12px', fontSize: 12, color: 'var(--faint)', fontWeight: 600 }}>
                    {loading ? 'Cargando…' : 'Sin pedidos'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function OrderCard({ order, column, busy, onAdvance, onReject }) {
  const isNew = column.key === 'nuevo';
  const note = order.delivery_instructions
    || (order.items ?? []).map((i) => i.notes).filter(Boolean).join(' · ');

  return (
    <article
      className="anim-pop"
      style={{
        ...S.orderCard,
        ...(isNew ? S.orderCardNew : null),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800 }}>
          {isNew && <span style={S.newDot} />}
          #{order.order_number}
        </span>
        <span
          style={{
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
            color: isNew ? 'var(--primary)' : 'var(--muted)',
          }}
        >
          <span className="ms" style={{ fontSize: 14 }}>schedule</span>
          {relativeTime(order.created_at)}
        </span>
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 9 }}>
        {order.customer?.full_name ?? 'Cliente'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
        <span className="ms" style={{ fontSize: 14 }}>
          {order.mode === 'pickup' ? 'storefront' : 'two_wheeler'}
        </span>
        {order.mode === 'pickup' ? 'Recoger' : 'Domicilio'}
        {order.delivery_address ? ` · ${order.delivery_address}` : ''}
      </div>

      <div style={S.lines}>
        {(order.items ?? []).map((l) => (
          <div key={l.id ?? l.name} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
            <span style={{ fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>{l.quantity}×</span>
            <span style={{ flex: 1, lineHeight: 1.35 }}>{l.name}</span>
          </div>
        ))}
      </div>

      {note && (
        <div style={S.note}>
          <span className="ms" style={{ fontSize: 15, color: '#A8730B', flex: 'none' }}>sticky_note_2</span>
          <span style={{ fontSize: 11.5, lineHeight: 1.4, color: '#7A5405' }}>{note}</span>
        </div>
      )}

      <div style={S.totalRow}>
        <span style={{ fontSize: 14.5, fontWeight: 800 }}>{cop(order.total)}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
          {PAY_LABEL[order.payment_method] ?? '—'}
          {order.payment_status === 'paid' ? ' · pagado' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
        {column.canReject && (
          <button onClick={onReject} disabled={busy} style={S.rejectBtn} aria-label="Rechazar pedido">
            <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>close</span>
          </button>
        )}
        <button
          onClick={onAdvance}
          disabled={busy || !column.next}
          style={{
            ...S.advanceBtn,
            ...(column.next
              ? { background: 'var(--primary)', color: '#fff' }
              : { border: '1px solid var(--border)', color: 'var(--muted)' }),
          }}
        >
          {busy ? 'Guardando…' : column.btnLabel}
        </button>
      </div>
    </article>
  );
}

const NEXT_LABELS = {
  accepted: 'aceptado', ready: 'listo', courier_assigned: 'en camino',
};
const nextLabel = (s) => NEXT_LABELS[s] ?? s;

/** Pitido corto con la API de audio del navegador: sin archivos ni permisos. */
function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.52);
    osc.onended = () => ctx.close();
  } catch {
    // Si el navegador bloquea el audio hasta que haya un gesto del usuario,
    // no pasa nada: el tablero igual se actualiza solo.
  }
}

const S = {
  filter: {
    display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px',
    borderRadius: 12, fontSize: 13, fontWeight: 700,
  },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  filterCount: {
    minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800,
  },
  countOn: { background: 'rgba(255,255,255,.18)', color: '#fff' },
  countOff: { background: 'var(--surface2)', color: 'var(--muted)' },
  sound: {
    display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px',
    borderRadius: 12, fontSize: 12.5, fontWeight: 800,
  },
  stat: {
    display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 15, padding: '13px 15px',
    boxShadow: 'var(--shadowSm)',
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  column: { background: 'var(--surface2)', borderRadius: 18, padding: 12 },
  orderCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 15,
    padding: 13, boxShadow: 'var(--shadowSm)',
  },
  orderCardNew: {
    borderColor: 'rgba(255,68,31,.35)',
    boxShadow: '0 0 0 3px rgba(255,68,31,.07)',
  },
  newDot: {
    width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)',
    animation: 'pulse 1.6s infinite',
  },
  lines: {
    display: 'flex', flexDirection: 'column', gap: 4, marginTop: 11,
    paddingTop: 11, borderTop: '1px solid var(--border)',
  },
  note: {
    display: 'flex', gap: 7, marginTop: 10, background: '#FFF7E6',
    borderRadius: 10, padding: '9px 10px',
  },
  totalRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border)',
  },
  rejectBtn: {
    flex: 'none', width: 38, height: 38, borderRadius: 11, border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  advanceBtn: { flex: 1, height: 38, borderRadius: 11, fontSize: 12.5, fontWeight: 800 },
};
