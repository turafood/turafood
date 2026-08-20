'use client';

/**
 * HISTORIAL DE PEDIDOS
 * Conversión de `isHistory` (línea 493) del mockup de Negocios.
 */

import { useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { getHistory } from '@/lib/negocio';
import { useBiz } from '../BizContext';
import HeaderHero from '../../components/HeaderHero';

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
      <HeaderHero
        title="Historial de pedidos"
        subtitle="Todos los pedidos de esta sucursal. Revisa los detalles, el medio de pago y el estado de cada transacción."
        images={[
          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
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
          <span className="ms" style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pedido..."
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

      <div style={S.ticketsGrid}>
        {shown.map((h) => {
          const st = STATE[h.status] ?? STATE.cancelled;
          return (
            <button
              key={h.id}
              onClick={() => setTicket(h)}
              style={S.voucherCard}
              className="anim-fade"
              title="Ver el ticket completo"
            >
              <div style={S.voucherHead}>
                <div>
                  <div style={S.voucherLabel}>NÚMERO DE ORDEN</div>
                  <div style={S.voucherNumber}>#{h.order_number}</div>
                </div>
                <div style={S.voucherQrWrapper}>
                  <span className="ms" style={S.voucherQr}>qr_code_2</span>
                </div>
              </div>

              <div style={S.voucherBody}>
                <div style={S.voucherRow}>
                  <span style={S.voucherCellLabel}>CLIENTE</span>
                  <span className="tr1" style={S.voucherCellValue}>{h.customer?.full_name ?? 'Cliente'}</span>
                </div>
                <div style={S.voucherRow}>
                  <span style={S.voucherCellLabel}>FECHA</span>
                  <span style={S.voucherCellValue}>{when(h.created_at)}</span>
                </div>
                <div style={S.voucherRow}>
                  <span style={S.voucherCellLabel}>ENTREGA / PAGO</span>
                  <span style={S.voucherCellValue}>
                    {h.mode === 'pickup' ? 'Recoger' : 'Domicilio'} · {PAY[h.payment_method] ?? '—'}
                  </span>
                </div>
              </div>

              <div style={S.voucherDivider} />

              <div style={S.voucherFoot}>
                <div>
                  <div style={S.voucherLabel}>TOTAL</div>
                  <div style={S.voucherTotal}>{cop(h.total)}</div>
                </div>
                <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && shown.length === 0 && (
        <div style={S.empty}>
          <span style={S.emptyIcon}>
            <span className="ms" style={{ fontSize: 26, color: '#fff' }}>receipt_long</span>
          </span>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            {rows.length ? 'Sin pedidos que coincidan' : 'Todavía no tienes pedidos cerrados'}
          </div>
        </div>
      )}

      {loading && (
        <div style={S.ticketsGrid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <span key={i} className="sk" style={{ display: 'block', height: 260, borderRadius: 24 }} />
          ))}
        </div>
      )}

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

const S = {
  chip: { height: 40, padding: '0 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, transition: 'all 0.2s' },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' },
  chipOff: { background: 'rgba(24,24,24,0.7)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' },
  search: {
    display: 'flex', alignItems: 'center', gap: 10, width: 280, height: 42,
    background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14, padding: '0 16px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, minWidth: 0, color: '#fff' },
  
  ticketsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20
  },
  voucherCard: {
    background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
    boxShadow: '0 8px 30px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)',
    display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
    position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', padding: 0,
    outline: 'none', overflow: 'hidden'
  },
  voucherHead: {
    padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
  },
  voucherLabel: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 4
  },
  voucherNumber: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#fff'
  },
  voucherQrWrapper: {
    width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  voucherQr: {
    fontSize: 32, color: '#000'
  },
  voucherBody: {
    padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 12
  },
  voucherRow: {
    display: 'flex', flexDirection: 'column', gap: 2
  },
  voucherCellLabel: {
    fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)'
  },
  voucherCellValue: {
    fontSize: 13.5, fontWeight: 600, color: '#fff'
  },
  voucherDivider: {
    height: 0, borderBottom: '2px dashed rgba(255,255,255,0.1)', width: '100%'
  },
  voucherFoot: {
    padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'rgba(0,0,0,0.2)'
  },
  voucherTotal: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, color: '#fff', marginTop: 2
  },

  pill: { fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10, letterSpacing: '.05em' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    padding: '64px 20px', textAlign: 'center', background: 'rgba(24,24,24,0.7)',
    borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)'
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)'
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },

  /* ---------------------------------------------------------- ticket */
  scrim: {
    position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end',
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
  },
  sheet: {
    width: '100%', maxWidth: 420, height: '100dvh', display: 'flex', flexDirection: 'column',
    background: '#1a1a1a', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', color: '#fff',
    borderLeft: '1px solid rgba(255,255,255,0.06)'
  },
  ticketHead: {
    display: 'flex', alignItems: 'center', gap: 10, flex: 'none',
    padding: '24px', borderBottom: '1px dashed rgba(255,255,255,0.1)',
  },
  ticketNumber: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.02em', color: '#fff'
  },
  ticketWhen: { display: 'block', fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  close: {
    width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', border: 'none', cursor: 'pointer'
  },
  ticketBody: { flex: 1, overflowY: 'auto', padding: 24 },
  block: {
    paddingBottom: 24, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  blockLabel: {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em',
    color: 'rgba(255,255,255,0.4)', marginBottom: 12,
  },
  phone: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8,
    fontSize: 14, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none',
  },
  instructions: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14,
    borderRadius: 14, background: 'rgba(255,255,255,0.03)', fontSize: 13, lineHeight: 1.5,
    color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.05)'
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
  },
  qty: {
    minWidth: 26, height: 26, borderRadius: 8, flex: 'none', padding: '0 6px',
    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800, color: '#fff'
  },
  itemNote: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  totalLine: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10,
    marginTop: 14, paddingTop: 16, borderTop: '1px dashed rgba(255,255,255,0.1)',
  },
  payRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 },
  netBlock: {
    padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.03)', marginBottom: 24, border: '1px solid rgba(255,255,255,0.05)'
  },
};
