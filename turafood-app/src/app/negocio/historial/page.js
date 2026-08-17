'use client';

/**
 * HISTORIAL DE PEDIDOS
 * Conversión de `isHistory` (línea 493) del mockup de Negocios.
 */

import { useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { getHistory } from '@/lib/negocio';
import { useBiz } from '../BizContext';

const FILTERS = [
  { label: 'Todos', match: () => true },
  { label: 'Entregados', match: (h) => h.status === 'delivered' },
  { label: 'Cancelados', match: (h) => h.status === 'cancelled' },
  { label: 'Reembolsados', match: (h) => h.status === 'refunded' },
];

const STATE = {
  delivered: { label: 'ENTREGADO', bg: '#E6F6EE', color: '#0B7A48' },
  delivering: { label: 'EN CAMINO', bg: '#EAF1FF', color: '#1E4FBF' },
  refunded: { label: 'REEMBOLSADO', bg: '#FFF7E6', color: '#A8730B' },
  cancelled: { label: 'CANCELADO', bg: 'var(--surface2)', color: 'var(--muted)' },
};

const PAY = { cash: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', card: 'Tarjeta' };

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const when = (iso) => {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace('a. m.', 'a.m.').replace('p. m.', 'p.m.');
  if (d >= today) return `Hoy · ${time}`;
  if (d >= yest) return `Ayer · ${time}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · ${time}`;
};

export default function HistorialPage() {
  const { business } = useBiz();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const data = await getHistory(business.id);
        if (alive) setRows(data);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const q = norm(query.trim());
  const shown = rows.filter((h) => {
    const byState = FILTERS[filter].match(h);
    const byText = !q
      || norm(h.customer?.full_name).includes(q)
      || norm(h.order_number).includes(q);
    return byState && byText;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setFilter(i)}
            style={{ ...S.chip, ...(i === filter ? S.chipOn : S.chipOff) }}
          >
            {f.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={S.search}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cliente o número de pedido"
            style={S.searchInput}
          />
        </div>
      </div>

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={S.table}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.headRow }}>
            <span>PEDIDO</span><span>CLIENTE</span><span>FECHA</span>
            <span>CANAL</span><span>PAGO</span><span>TOTAL</span>
            <span style={{ textAlign: 'right' }}>ESTADO</span>
          </div>

          {shown.map((h) => {
            const st = STATE[h.status] ?? STATE.cancelled;
            return (
              <button
                key={h.id}
                onClick={() => setTicket(h)}
                style={S.row}
                className="hist-row"
                title="Ver el ticket completo"
              >
                <span style={{ fontWeight: 800, textAlign: 'left' }}>#{h.order_number}</span>
                <span className="tr1" style={{ fontWeight: 700 }}>{h.customer?.full_name ?? 'Cliente'}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{when(h.created_at)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontWeight: 600 }}>
                  <span className="ms" style={{ fontSize: 15 }}>
                    {h.mode === 'pickup' ? 'storefront' : 'two_wheeler'}
                  </span>
                  {h.mode === 'pickup' ? 'Recoger' : 'Domicilio'}
                </span>
                <span className="tr1" style={{ color: 'var(--muted)', fontWeight: 600 }}>
                  {PAY[h.payment_method] ?? '—'}
                </span>
                <span style={{ fontWeight: 800 }}>{cop(h.total)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
                  <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
                  <span className="ms hist-arrow" style={{ fontSize: 18, color: 'var(--faint)' }}>
                    chevron_right
                  </span>
                </span>
              </button>
            );
          })}

          {!loading && shown.length === 0 && (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>receipt_long</span>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {rows.length ? 'Sin pedidos que coincidan' : 'Todavía no tienes pedidos cerrados'}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Cargando historial…
            </div>
          )}
        </div>
      </div>

      <Ticket order={ticket} onClose={() => setTicket(null)} />
    </>
  );
}

/**
 * EL TICKET
 *
 * Lo que se imprimiría en la comanda: qué pidió, cuánto pagó y por
 * dónde. Se abre en un panel lateral y no en otra página porque la
 * pregunta que trae a alguien aquí ("¿qué llevaba el #4788?") se
 * responde en diez segundos y después quiere seguir mirando la lista.
 *
 * Los totales se muestran como los guardó la base. No se recalculan
 * aquí: un pedido de hace tres meses tenía otra comisión y otra tarifa
 * de domicilio, y volver a calcularlo hoy mostraría cifras que nunca
 * existieron.
 */
function Ticket({ order, onClose }) {
  // Cerrar con Escape: quien revisa veinte pedidos no va a buscar la X
  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  const st = STATE[order.status] ?? STATE.cancelled;
  const items = order.items ?? [];
  const itemsTotal = items.reduce(
    (a, i) => a + Number(i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1), 0,
  );
  const subtotal = Number(order.subtotal ?? itemsTotal);
  const delivery = Number(order.delivery_fee ?? 0);
  const service = Number(order.service_fee ?? 0);
  const tip = Number(order.tip ?? 0);
  const discount = Number(order.discount ?? 0);

  return (
    <div style={S.scrim} onClick={onClose}>
      <aside
        style={S.sheet}
        onClick={(e) => e.stopPropagation()}
        className="anim-slideup"
        role="dialog"
        aria-label={`Pedido ${order.order_number}`}
      >
        <header style={S.ticketHead}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={S.ticketNumber}>#{order.order_number}</span>
            <span style={S.ticketWhen}>{when(order.created_at)}</span>
          </span>
          <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
          <button onClick={onClose} style={S.close} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </header>

        <div className="sc" style={S.ticketBody}>
          {/* Cliente y entrega */}
          <section style={S.block}>
            <div style={S.blockLabel}>CLIENTE</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {order.customer?.full_name ?? 'Cliente'}
            </div>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} style={S.phone}>
                <span className="ms" style={{ fontSize: 16 }}>call</span>
                {order.customer.phone}
              </a>
            )}

            <div style={{ ...S.blockLabel, marginTop: 16 }}>
              {order.mode === 'pickup' ? 'RECOGE EN TIENDA' : 'ENTREGA'}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {order.mode === 'pickup'
                ? 'El cliente lo recogió en el local.'
                : (order.delivery_address ?? 'Sin dirección registrada')}
            </div>
            {order.delivery_instructions && (
              <div style={S.instructions}>
                <span className="ms" style={{ fontSize: 15, flex: 'none' }}>sticky_note_2</span>
                <span>{order.delivery_instructions}</span>
              </div>
            )}
          </section>

          {/* Productos */}
          <section style={S.block}>
            <div style={S.blockLabel}>LO QUE PIDIÓ</div>
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                No quedó el detalle de los productos de este pedido.
              </div>
            ) : items.map((i, k) => (
              <div key={i.id ?? k} style={S.item}>
                <span style={S.qty}>{i.quantity ?? 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>
                    {i.name ?? i.product_name ?? 'Producto'}
                  </span>
                  {i.notes && <span style={S.itemNote}>{i.notes}</span>}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 'none' }}>
                  {cop(Number(i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1))}
                </span>
              </div>
            ))}
          </section>

          {/* Cuentas */}
          <section style={S.block}>
            <div style={S.blockLabel}>CUENTAS</div>
            <Line label="Productos" value={cop(subtotal)} />
            {discount > 0 && <Line label="Descuento" value={`- ${cop(discount)}`} green />}
            {delivery > 0 && <Line label="Domicilio" value={cop(delivery)} />}
            {service > 0 && <Line label="Servicio" value={cop(service)} />}
            {tip > 0 && <Line label="Propina al repartidor" value={cop(tip)} />}
            <div style={S.totalLine}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21 }}>
                {cop(order.total)}
              </span>
            </div>
            <div style={S.payRow}>
              <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>
                {order.payment_method === 'cash' ? 'payments' : 'credit_card'}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                Pagó con {PAY[order.payment_method] ?? 'otro medio'}
                {order.payment_method === 'cash' ? ' al recibir' : ''}
              </span>
            </div>
          </section>

          {/* Lo que te quedó */}
          {order.business_commission != null && (
            <section style={S.netBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Comisión TuraFood</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                  - {cop(order.business_commission)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>Te quedó</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)' }}>
                  {cop(subtotal - Number(order.business_commission))}
                </span>
              </div>
            </section>
          )}

          {order.courier?.full_name && (
            <section style={S.block}>
              <div style={S.blockLabel}>LO LLEVÓ</div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.courier.full_name}</div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Line({ label, value, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: green ? 'var(--green)' : 'var(--text)' }}>
        {value}
      </span>
    </div>
  );
}

const GRID = '110px minmax(0,1.3fr) minmax(0,1fr) 116px 108px 116px 140px';

const S = {
  chip: { height: 38, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, width: 280, height: 38,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '0 13px',
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 16, minWidth: 0 },
  table: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, boxShadow: 'var(--shadowSm)', overflow: 'hidden',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, minWidth: 900,
    alignItems: 'center', padding: '13px 18px', width: '100%',
    borderBottom: '1px solid var(--border)', fontSize: 13,
    textAlign: 'left', background: 'none',
  },
  headRow: {
    background: 'var(--bg)', fontSize: 11, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.05em',
  },
  pill: { fontSize: 10.5, fontWeight: 800, padding: '5px 9px', borderRadius: 8 },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
    padding: '56px 20px', textAlign: 'center',
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 14, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },

  /* ---------------------------------------------------------- ticket */
  scrim: {
    position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end',
    background: 'rgba(20,16,10,.45)', backdropFilter: 'blur(3px)',
  },
  sheet: {
    width: '100%', maxWidth: 420, height: '100dvh', display: 'flex', flexDirection: 'column',
    background: 'var(--surface)', boxShadow: '-20px 0 60px rgba(20,16,10,.25)',
  },
  ticketHead: {
    display: 'flex', alignItems: 'center', gap: 10, flex: 'none',
    padding: '18px 18px 16px', borderBottom: '1px solid var(--border)',
  },
  ticketNumber: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, letterSpacing: '-.02em',
  },
  ticketWhen: { display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  close: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--bg)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  ticketBody: { flex: 1, overflowY: 'auto', padding: 18 },
  block: {
    paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid var(--border)',
  },
  blockLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
    color: 'var(--faint)', marginBottom: 8,
  },
  phone: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6,
    fontSize: 13, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none',
  },
  instructions: {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: 11,
    borderRadius: 12, background: 'var(--bg)', fontSize: 12.5, lineHeight: 1.5,
    color: 'var(--muted)',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 11, padding: '9px 0',
  },
  qty: {
    minWidth: 24, height: 24, borderRadius: 8, flex: 'none', padding: '0 6px',
    background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800,
  },
  itemNote: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 3 },
  totalLine: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
    marginTop: 10, paddingTop: 12, borderTop: '1px solid var(--border)',
  },
  payRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  netBlock: {
    padding: 14, borderRadius: 16, background: 'var(--bg)', marginBottom: 18,
  },
};
