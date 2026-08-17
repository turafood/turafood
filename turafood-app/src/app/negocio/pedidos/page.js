'use client';

/**
 * PEDIDOS EN VIVO — TABLERO DE COMANDAS
 *
 * Es la pantalla que la cocina mira todo el día, así que está pensada
 * como el papel que reemplaza: cada pedido es una comanda con borde
 * troquelado, número grande y un cronómetro que corre de verdad.
 *
 * El cronómetro cambia de color solo cuando el pedido se está pasando
 * del tiempo prometido. Es la señal que hace que la cocina no tenga
 * que estar leyendo cada tarjeta: mira la que está en rojo.
 *
 * En celular las columnas se recorren de lado, como en una barra de
 * cocina, en vez de apilarse en una lista de dos kilómetros.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cop } from '@/lib/format';
import { COLUMNS, columnOf, setOrderStatus } from '@/lib/negocio';
import Vertical3D from '../../components/Vertical3D';
import { useBiz } from '../BizContext';

const PAY = {
  cash: { label: 'Efectivo', icon: 'payments', warn: true },
  nequi: { label: 'Nequi', icon: 'account_balance_wallet' },
  daviplata: { label: 'Daviplata', icon: 'account_balance' },
  card: { label: 'Tarjeta', icon: 'credit_card' },
};

/** Minutos desde que entró el pedido */
const minutesSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

/**
 * Semáforo de la comanda. `limit` es el tiempo de preparación que el
 * negocio le prometió al cliente: pasado eso, la comanda se pone roja.
 */
function urgency(minutes, limit) {
  if (minutes >= limit) return { key: 'late', color: 'var(--primary)', bg: '#FFF1EC', label: 'Atrasado' };
  if (minutes >= limit * 0.66) return { key: 'soon', color: '#A8730B', bg: '#FFF7E6', label: 'Va justo' };
  return { key: 'ok', color: '#0B7A48', bg: '#E6F6EE', label: 'A tiempo' };
}

export default function PedidosPage() {
  const { orders, reloadOrders, toast, loading, business } = useBiz();

  const [filter, setFilter] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [sound, setSound] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Un solo reloj para todo el tablero: cada comanda no monta el suyo
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const prepLimit = business?.prep_time_min ?? 25;

  // Aviso sonoro cuando entra una comanda nueva
  const prevNew = useRef(null);
  useEffect(() => {
    const count = orders.filter((o) => columnOf(o.status).key === 'nuevo').length;
    if (prevNew.current !== null && count > prevNew.current && sound) chime();
    prevNew.current = count;
  }, [orders, sound]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    orders.forEach((o) => map[columnOf(o.status).key]?.push(o));
    // La más vieja primero: es la que hay que sacar
    Object.values(map).forEach((list) => list.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    ));
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
      toast(`#${order.order_number} → ${NEXT_LABEL[col.next] ?? col.next}`);
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
      toast(`#${order.order_number} rechazado`);
    } catch (err) {
      toast(err.message);
    } finally {
      setBusyId(null);
    }
  };

  // Indicadores de la barra superior
  const late = orders.filter((o) => {
    const col = columnOf(o.status).key;
    return (col === 'nuevo' || col === 'preparando') && minutesSince(o.created_at) >= prepLimit;
  }).length;

  const avgWait = orders.length
    ? Math.round(orders.reduce((a, o) => a + minutesSince(o.created_at), 0) / orders.length)
    : 0;

  const stats = [
    { label: 'Sin aceptar', value: grouped.nuevo.length, icon: 'notifications_active', bg: '#FDF0EA', fg: 'var(--primary)' },
    { label: 'En cocina', value: grouped.preparando.length, icon: 'skillet', bg: '#FFF7E6', fg: '#A8730B' },
    { label: 'Atrasados', value: late, icon: 'running_with_errors', bg: late ? '#FFF1EC' : '#E6F6EE', fg: late ? 'var(--primary)' : '#0B8E54' },
    { label: 'Espera promedio', value: `${avgWait} min`, icon: 'timer', bg: '#EAF1FF', fg: 'var(--blue)' },
  ];

  return (
    <>
      {/* Barra de control */}
      <div style={S.toolbar}>
        <div className="hs" style={S.filters}>
          <button
            onClick={() => setFilter(null)}
            style={{ ...S.filter, ...(!filter ? S.chipOn : S.chipOff) }}
          >
            Todo
            <span style={{ ...S.count, ...(!filter ? S.countOn : S.countOff) }}>{orders.length}</span>
          </button>
          {COLUMNS.map((c) => {
            const on = filter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setFilter(on ? null : c.key)}
                style={{ ...S.filter, ...(on ? S.chipOn : S.chipOff) }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, flex: 'none' }} />
                {c.label}
                <span style={{ ...S.count, ...(on ? S.countOn : S.countOff) }}>{grouped[c.key].length}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setSound((s) => !s)}
          style={{
            ...S.sound,
            background: sound ? '#E6F6EE' : 'var(--surface2)',
            color: sound ? '#0B7A48' : 'var(--muted)',
          }}
        >
          <span className="ms" style={{ fontSize: 18 }}>{sound ? 'volume_up' : 'volume_off'}</span>
          <span className="sound-label">{sound ? 'Sonido activo' : 'Sin sonido'}</span>
        </button>
      </div>

      {/* Indicadores */}
      <div style={S.statsGrid}>
        {stats.map((k) => (
          <div key={k.label} style={S.stat}>
            <span style={{ ...S.statIcon, background: k.bg }}>
              <span className="ms" style={{ fontSize: 18, color: k.fg }}>{k.icon}</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.statLabel}>{k.label}</span>
              <span className="tr1" style={S.statValue}>{k.value}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Tablero */}
      <div className="kanban">
        {shown.map((col) => {
          const list = grouped[col.key];
          return (
            <section key={col.key} className="kanban-col">
              <header style={S.colHead}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>{col.label}</span>
                <span style={S.colCount}>{list.length}</span>
              </header>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {list.map((o) => (
                  <Comanda
                    key={o.id}
                    order={o}
                    column={col}
                    prepLimit={prepLimit}
                    busy={busyId === o.id}
                    open={expanded === o.id}
                    onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                    onAdvance={() => advance(o)}
                    onReject={() => reject(o)}
                  />
                ))}

                {list.length === 0 && (
                  <div style={S.empty}>
                    {loading ? (
                      <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600 }}>Cargando…</span>
                    ) : (
                      <>
                        <Vertical3D vertical={business?.vertical} size={54} />
                        <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600, marginTop: 8 }}>
                          Sin comandas
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

/** Una comanda: el papel que la cocina lee de un vistazo */
function Comanda({ order, column, prepLimit, busy, open, onToggle, onAdvance, onReject }) {
  const isNew = column.key === 'nuevo';
  const mins = minutesSince(order.created_at);
  const live = isNew || column.key === 'preparando';
  const u = urgency(mins, prepLimit);

  const items = order.items ?? [];
  const units = items.reduce((a, i) => a + (i.quantity ?? 1), 0);
  const note = order.delivery_instructions
    || items.map((i) => i.notes).filter(Boolean).join(' · ');

  const pay = PAY[order.payment_method] ?? { label: '—', icon: 'help' };
  const unpaidCash = order.payment_method === 'cash' && order.payment_status !== 'paid';

  // Con muchos productos la comanda se vuelve ilegible: se corta y se
  // despliega, para que la columna no se convierta en un rollo.
  const LIMIT = 4;
  const visible = open ? items : items.slice(0, LIMIT);
  const hidden = items.length - visible.length;

  return (
    <article
      className="anim-pop comanda"
      style={{
        ...S.ticket,
        ...(isNew ? S.ticketNew : null),
        ...(live && u.key === 'late' ? S.ticketLate : null),
      }}
    >
      {/* Troquelado superior */}
      <span style={S.notch} aria-hidden="true" />

      <header style={S.ticketHead}>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isNew && <span style={S.newDot} />}
            <span style={S.orderNumber}>#{order.order_number}</span>
          </span>
          <span style={S.channel}>
            <span className="ms" style={{ fontSize: 14 }}>
              {order.mode === 'pickup' ? 'storefront' : 'two_wheeler'}
            </span>
            {order.mode === 'pickup' ? 'Recoger' : 'Domicilio'}
          </span>
        </span>

        {live ? (
          <span style={{ ...S.timer, background: u.bg, color: u.color }}>
            <span className="ms" style={{ fontSize: 15 }}>timer</span>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16 }}>
              {mins}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800 }}>MIN</span>
          </span>
        ) : (
          <span style={{ ...S.timer, background: 'var(--surface2)', color: 'var(--muted)' }}>
            <span className="ms" style={{ fontSize: 15 }}>check</span>
            <span style={{ fontSize: 11, fontWeight: 800 }}>{mins} min</span>
          </span>
        )}
      </header>

      {/* Barra de tiempo contra lo prometido al cliente */}
      {live && (
        <div style={S.slaTrack} title={`${u.label} · prometido ${prepLimit} min`}>
          <div
            style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(100, (mins / prepLimit) * 100)}%`,
              background: u.color,
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}

      <div style={S.customer}>
        <span className="tr1" style={{ fontSize: 14, fontWeight: 700 }}>
          {order.customer?.full_name ?? 'Cliente'}
        </span>
        {order.delivery_address && (
          <span className="tr1" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {order.delivery_address}
          </span>
        )}
      </div>

      {/* Los productos: lo que la cocina realmente necesita */}
      <div style={S.items}>
        {visible.map((l) => (
          <div key={l.id ?? l.name} style={S.item}>
            <span style={S.qty}>{l.quantity}</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>
              {l.name}
              {l.notes && (
                <span style={{ display: 'block', fontSize: 11.5, color: '#A8730B', fontWeight: 600, marginTop: 2 }}>
                  {l.notes}
                </span>
              )}
            </span>
          </div>
        ))}

        {hidden > 0 && (
          <button onClick={onToggle} style={S.more}>
            +{hidden} {hidden === 1 ? 'producto más' : 'productos más'}
          </button>
        )}
        {open && items.length > LIMIT && (
          <button onClick={onToggle} style={S.more}>Ver menos</button>
        )}
      </div>

      {note && (
        <div style={S.note}>
          <span className="ms" style={{ fontSize: 15, color: '#A8730B', flex: 'none' }}>sticky_note_2</span>
          <span style={{ fontSize: 11.5, lineHeight: 1.4, color: '#7A5405' }}>{note}</span>
        </div>
      )}

      {unpaidCash && (
        <div style={S.cash}>
          <span className="ms" style={{ fontSize: 15, flex: 'none' }}>payments</span>
          Cobrar {cop(order.total)} en efectivo
        </div>
      )}

      {/* Troquelado inferior */}
      <div style={S.footer}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
          <span className="ms" style={{ fontSize: 15 }}>{pay.icon}</span>
          {pay.label}
          {order.payment_status === 'paid' && (
            <span style={S.paid}>PAGADO</span>
          )}
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--faint)', letterSpacing: '.05em' }}>
            {units} {units === 1 ? 'PRODUCTO' : 'PRODUCTOS'}
          </span>
          <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17 }}>
            {cop(order.total)}
          </span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {column.canReject && (
          <button onClick={onReject} disabled={busy} style={S.rejectBtn} aria-label={`Rechazar ${order.order_number}`}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>close</span>
          </button>
        )}
        <button
          onClick={onAdvance}
          disabled={busy || !column.next}
          className="md3-btn"
          style={{
            ...S.advanceBtn,
            ...(column.next
              ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 6px 16px rgba(255,68,31,.28)' }
              : { border: '1px solid var(--border)', color: 'var(--muted)' }),
          }}
        >
          {busy ? 'Guardando…' : column.btnLabel}
        </button>
      </div>
    </article>
  );
}

const NEXT_LABEL = {
  accepted: 'aceptado',
  ready: 'listo',
  courier_assigned: 'en camino',
};

/**
 * Campanita de dos notas con la API de audio: no hace falta un archivo
 * ni pedir permisos. Si el navegador exige un gesto previo, falla en
 * silencio y el tablero igual se actualiza solo.
 */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const at = ctx.currentTime + i * 0.16;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.45);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Silencio: el aviso es un extra, no el mecanismo
  }
}

const S = {
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'nowrap',
  },
  filters: { display: 'flex', gap: 8, flex: 1, minWidth: 0, paddingBottom: 2 },
  filter: {
    display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px',
    borderRadius: 12, fontSize: 13, fontWeight: 700, flex: 'none', whiteSpace: 'nowrap',
  },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  count: {
    minWidth: 20, height: 20, padding: '0 5px', borderRadius: 99,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800,
  },
  countOn: { background: 'rgba(255,255,255,.18)', color: '#fff' },
  countOff: { background: 'var(--surface2)', color: 'var(--muted)' },
  sound: {
    display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px',
    borderRadius: 12, fontSize: 12.5, fontWeight: 800, flex: 'none',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
    gap: 12, marginBottom: 16,
  },
  stat: {
    display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 15, padding: '12px 14px',
    boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)' },
  statValue: { display: 'block', fontSize: 17, fontWeight: 800, marginTop: 1 },
  colHead: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px',
    position: 'sticky', top: 0, zIndex: 2,
  },
  colCount: { fontSize: 12, fontWeight: 800, color: 'var(--muted)' },

  ticket: {
    position: 'relative', background: 'var(--surface)', borderRadius: 16,
    border: '1px solid var(--border)', padding: '15px 14px 14px',
    boxShadow: 'var(--shadowSm)',
  },
  ticketNew: {
    borderColor: 'rgba(255,68,31,.4)',
    boxShadow: '0 0 0 3px rgba(255,68,31,.08), var(--shadowSm)',
  },
  ticketLate: {
    borderColor: 'rgba(255,68,31,.55)',
    boxShadow: '0 0 0 3px rgba(255,68,31,.12), 0 8px 24px rgba(255,68,31,.14)',
  },
  /** La franja punteada de arriba imita el papel de comanda */
  notch: {
    position: 'absolute', top: 6, left: 14, right: 14, height: 2,
    background: 'repeating-linear-gradient(90deg, var(--border) 0 5px, transparent 5px 10px)',
  },
  ticketHead: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
  },
  orderNumber: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em',
  },
  newDot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)',
    animation: 'pulse 1.6s infinite', flex: 'none',
  },
  channel: {
    display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5,
    color: 'var(--muted)', fontWeight: 700, marginTop: 2,
  },
  timer: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px',
    borderRadius: 10, flex: 'none',
  },
  slaTrack: {
    height: 4, borderRadius: 99, background: 'var(--surface2)',
    marginTop: 10, overflow: 'hidden',
  },
  customer: {
    display: 'flex', flexDirection: 'column', marginTop: 11,
  },
  items: {
    display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12,
    paddingTop: 12, borderTop: '1px dashed var(--border)',
  },
  item: { display: 'flex', gap: 10, alignItems: 'flex-start' },
  qty: {
    flex: 'none', minWidth: 26, height: 26, borderRadius: 8,
    background: 'var(--surface2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 13, fontWeight: 800,
  },
  more: {
    alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 800,
    color: 'var(--primary)', padding: '2px 0',
  },
  note: {
    display: 'flex', gap: 7, marginTop: 11, background: '#FFF7E6',
    borderRadius: 10, padding: '9px 10px',
  },
  cash: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 9,
    background: '#FFF1EC', color: '#B3300F', borderRadius: 10,
    padding: '8px 10px', fontSize: 11.5, fontWeight: 800,
  },
  footer: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: 10, marginTop: 12, paddingTop: 11, borderTop: '1px dashed var(--border)',
  },
  paid: {
    fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4,
    background: '#E6F6EE', color: '#0B7A48', letterSpacing: '.04em',
  },
  rejectBtn: {
    flex: 'none', width: 42, height: 42, borderRadius: 12,
    border: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  advanceBtn: {
    flex: 1, height: 42, borderRadius: 12, fontSize: 13, fontWeight: 800,
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '28px 12px', textAlign: 'center',
    opacity: 0.75,
  },
};
