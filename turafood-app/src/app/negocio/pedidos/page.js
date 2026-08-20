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
  const { orders: realOrders, reloadOrders, toast, loading, business } = useBiz();

  const [filter, setFilter] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [sound, setSound] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // MODO DEMO: Inyectamos comandas ficticias en el flujo real
  const orders = useMemo(() => {
    if (!demoMode) return realOrders;
    
    const now = Date.now();
    return [
      ...realOrders,
      {
        id: 'demo-1', order_number: '9901', status: 'pending', created_at: new Date(now - 60000 * 2).toISOString(),
        customer_name: 'Andrés (Demo)', customer_phone: '3000000000', payment_method: 'nequi', payment_status: 'paid',
        total: 45000, delivery_instructions: 'Llamar al llegar', items: [{ name: 'Hamburguesa Doble Queso', quantity: 2 }]
      },
      {
        id: 'demo-2', order_number: '9902', status: 'cooking', created_at: new Date(now - 60000 * 18).toISOString(),
        customer_name: 'Camila (Demo)', customer_phone: '3000000000', payment_method: 'cash', payment_status: 'pending',
        total: 28000, delivery_instructions: 'Sin cebolla', items: [{ name: 'Pizza Personal', quantity: 1 }, { name: 'Gaseosa', quantity: 2 }]
      },
      {
        id: 'demo-3', order_number: '9903', status: 'ready', created_at: new Date(now - 60000 * 30).toISOString(),
        customer_name: 'Felipe (Demo)', customer_phone: '3000000000', payment_method: 'card', payment_status: 'paid',
        total: 62000, delivery_instructions: '', items: [{ name: 'Combo Familiar', quantity: 1 }]
      }
    ];
  }, [realOrders, demoMode]);

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
    if (order.id.startsWith('demo-')) {
      toast(`Simulación: ${order.order_number} avanzado`);
      return;
    }
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
    if (order.id.startsWith('demo-')) {
      toast(`Simulación: ${order.order_number} rechazado`);
      return;
    }
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

  // Imágenes de comida para fondos premium
  const foodBgs = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop', // Burger
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?q=80&w=400&auto=format&fit=crop', // Pizza
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400&auto=format&fit=crop', // Grill
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop', // Salad/Fresh
  ];

  const stats = [
    { label: 'Sin aceptar', value: grouped.nuevo.length, icon: 'notifications_active', bg: '#FF441F', fg: '#fff', img: foodBgs[0] },
    { label: 'En cocina', value: grouped.preparando.length, icon: 'skillet', bg: '#F59E0B', fg: '#fff', img: foodBgs[1] },
    { label: 'Atrasados', value: late, icon: 'running_with_errors', bg: late ? '#E11D48' : '#10B981', fg: '#fff', img: foodBgs[2] },
    { label: 'Espera promedio', value: `${avgWait} min`, icon: 'timer', bg: '#3B82F6', fg: '#fff', img: foodBgs[3] },
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

        <div style={{ display: 'flex', gap: 12 }}>
          {demoMode && (
            <button
              onClick={() => setDemoMode(false)}
              style={{
                ...S.sound, background: '#FFF1EC', color: 'var(--primary)', fontWeight: 700
              }}
            >
              Detener Demo
            </button>
          )}
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
      </div>

      {/* Indicadores con fotos en Overlay Black */}
      <div style={S.statsGrid}>
        {stats.map((k) => (
          <div key={k.label} style={{
            ...S.stat,
            backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${k.img})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
            <span style={{ ...S.statIcon, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="ms" style={{ fontSize: 20, color: k.fg, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{k.icon}</span>
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
                        {!demoMode && list.length === 0 && (
                          <button
                            onClick={() => { setDemoMode(true); if (sound) chime(); }}
                            style={{
                              marginTop: 16, padding: '8px 16px', borderRadius: 99, background: 'linear-gradient(135deg, var(--primary), #FF7B3B)',
                              color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                              boxShadow: '0 8px 20px rgba(255,68,31,0.2)'
                            }}
                          >
                            🚀 Simular día de ventas
                          </button>
                        )}
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
    background: 'rgba(18,18,18,0.7)', padding: '12px 16px', borderRadius: 20,
    backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.06)'
  },
  filters: { display: 'flex', gap: 10, flex: 1, minWidth: 0, paddingBottom: 2 },
  filter: {
    display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px',
    borderRadius: 14, fontSize: 13.5, fontWeight: 700, flex: 'none', whiteSpace: 'nowrap',
    transition: 'all 0.3s'
  },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 6px 16px rgba(255,255,255,0.15)' },
  chipOff: { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' },
  count: {
    minWidth: 22, height: 22, padding: '0 6px', borderRadius: 99,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11.5, fontWeight: 800, transition: 'all 0.3s'
  },
  countOn: { background: 'rgba(0,0,0,.15)', color: '#000' },
  countOff: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' },
  sound: {
    display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px',
    borderRadius: 14, fontSize: 13, fontWeight: 800, flex: 'none', transition: 'all 0.3s'
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
    gap: 16, marginBottom: 20,
  },
  stat: {
    display: 'flex', alignItems: 'center', gap: 14, 
    borderRadius: 20, padding: '20px 20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', minWidth: 0,
    border: '1px solid rgba(255,255,255,0.06)', color: '#fff',
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '.03em' },
  statValue: { display: 'block', fontSize: 24, fontWeight: 800, marginTop: 4, textShadow: '0 2px 10px rgba(0,0,0,0.5)' },
  colHead: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
    position: 'sticky', top: 0, zIndex: 2, background: 'rgba(18,18,18,0.85)',
    backdropFilter: 'blur(20px)', borderRadius: 16, marginBottom: 12,
    border: '1px solid rgba(255,255,255,0.05)'
  },
  colCount: { fontSize: 13.5, fontWeight: 800, color: 'rgba(255,255,255,0.5)' },

  ticket: {
    position: 'relative', background: 'rgba(24,24,24,0.7)', borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.06)', padding: '18px 16px 16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', color: '#fff'
  },
  ticketNew: {
    borderColor: 'rgba(255,68,31,.6)',
    boxShadow: '0 0 0 2px rgba(255,68,31,.2), 0 10px 30px rgba(255,68,31,.15)',
  },
  ticketLate: {
    borderColor: 'rgba(225,29,72,.6)',
    boxShadow: '0 0 0 2px rgba(225,29,72,.2), 0 10px 30px rgba(225,29,72,.15)',
  },
  notch: {
    position: 'absolute', top: 6, left: 16, right: 16, height: 2,
    background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 6px, transparent 6px 12px)',
  },
  ticketHead: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10,
  },
  orderNumber: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, letterSpacing: '-.02em',
  },
  newDot: {
    width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)',
    animation: 'pulse 1.6s infinite', flex: 'none', boxShadow: '0 0 10px var(--primary)'
  },
  channel: {
    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
    color: 'rgba(255,255,255,0.6)', fontWeight: 700, marginTop: 4,
  },
  timer: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
    borderRadius: 12, flex: 'none',
  },
  slaTrack: {
    height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)',
    marginTop: 14, overflow: 'hidden',
  },
  customer: {
    display: 'flex', flexDirection: 'column', marginTop: 14,
  },
  items: {
    display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14,
    paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.1)',
  },
  item: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  qty: {
    flex: 'none', minWidth: 30, height: 30, borderRadius: 10,
    background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 14, fontWeight: 800,
  },
  more: {
    alignSelf: 'flex-start', fontSize: 12, fontWeight: 800,
    color: 'var(--primary)', padding: '4px 0',
  },
  note: {
    display: 'flex', gap: 8, marginTop: 14, background: 'rgba(245,158,11,0.15)',
    borderRadius: 12, padding: '12px', border: '1px solid rgba(245,158,11,0.2)'
  },
  cash: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
    background: 'rgba(225,29,72,0.15)', color: '#FDA4AF', borderRadius: 12,
    padding: '10px 12px', fontSize: 12.5, fontWeight: 800, border: '1px solid rgba(225,29,72,0.2)'
  },
  footer: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px dashed rgba(255,255,255,0.1)',
  },
  paid: {
    fontSize: 10, fontWeight: 800, padding: '3px 6px', borderRadius: 6,
    background: 'rgba(16,185,129,0.2)', color: '#6EE7B7', letterSpacing: '.04em',
  },
  rejectBtn: {
    flex: 'none', width: 46, height: 46, borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
  },
  advanceBtn: {
    flex: 1, height: 46, borderRadius: 14, fontSize: 14, fontWeight: 800, transition: 'all 0.3s'
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '32px 16px', textAlign: 'center',
    opacity: 0.8,
  },
};
