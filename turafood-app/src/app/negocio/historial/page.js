'use client';

/**
 * HISTORIAL DE PEDIDOS
 * Conversión de `isHistory` (línea 493) del mockup de Negocios.
 */

import { useEffect, useState, useMemo } from 'react';
import { cop } from '@/lib/format';
import { getHistory } from '@/lib/negocio';
import { QRCodeSVG } from 'qrcode.react';
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
  const { business, demoMode } = useBiz();
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

  const activeRows = useMemo(() => {
    if (!demoMode) return rows;
    const now = Date.now();
    return [
      ...rows,
      { id: 'h1', order_number: '9801', status: 'delivered', created_at: new Date(now - 86400000 * 0.1).toISOString(), customer: { full_name: 'Daniela Ríos' }, mode: 'delivery', payment_method: 'nequi', total: 45000, subtotal: 38000, delivery_fee: 7000, items: [{name: 'Combo Familiar', quantity: 1, unit_price: 38000}] },
      { id: 'h2', order_number: '9802', status: 'delivered', created_at: new Date(now - 86400000 * 0.2).toISOString(), customer: { full_name: 'Andrés López' }, mode: 'pickup', payment_method: 'cash', total: 28000, subtotal: 28000, delivery_fee: 0, items: [{name: 'Pizza Personal', quantity: 1, unit_price: 28000}] },
      { id: 'h3', order_number: '9803', status: 'cancelled', created_at: new Date(now - 86400000 * 0.5).toISOString(), customer: { full_name: 'Mateo Orozco' }, mode: 'delivery', payment_method: 'card', total: 52000, subtotal: 45000, delivery_fee: 7000, items: [{name: 'Hamburguesa Doble', quantity: 2, unit_price: 22500}] },
      { id: 'h4', order_number: '9804', status: 'delivered', created_at: new Date(now - 86400000 * 1.1).toISOString(), customer: { full_name: 'Sara Castrillón' }, mode: 'delivery', payment_method: 'nequi', total: 31000, subtotal: 24000, delivery_fee: 7000, items: [{name: 'Gaseosa 1.5L', quantity: 1, unit_price: 8000}, {name: 'Papas Cascos', quantity: 2, unit_price: 8000}] },
      { id: 'h5', order_number: '9805', status: 'refunded', created_at: new Date(now - 86400000 * 1.5).toISOString(), customer: { full_name: 'Camilo Jaramillo' }, mode: 'delivery', payment_method: 'card', total: 125000, subtotal: 115000, delivery_fee: 10000, items: [{name: 'Bandeja Paisa', quantity: 3, unit_price: 35000}, {name: 'Jugo Natural', quantity: 2, unit_price: 5000}] },
    ];
  }, [rows, demoMode]);

  const q = norm(query.trim());
  const shown = activeRows.filter((h) => {
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
              style={S.rowCard}
              className="anim-fade ticket-row"
              title="Ver el ticket completo"
            >
              <div style={{ ...S.rowItem, minWidth: 80 }}>
                <span style={S.rowLabel}>Orden</span>
                <span style={{ ...S.rowValue, fontFamily: 'var(--font-bricolage)', fontSize: 16, fontWeight: 800 }}>#{h.order_number}</span>
              </div>
              
              <div style={S.rowItem}>
                <span style={S.rowLabel}>Cliente</span>
                <span className="tr1" style={S.rowValue}>{h.customer?.full_name ?? 'Cliente'}</span>
              </div>

              <div style={S.rowItem}>
                <span style={S.rowLabel}>Fecha</span>
                <span style={S.rowValue}>{when(h.created_at)}</span>
              </div>

              <div style={S.rowItem}>
                <span style={S.rowLabel}>Entrega</span>
                <span style={S.rowValue}>
                  {h.mode === 'pickup' ? 'Recoger' : 'Domicilio'}
                </span>
              </div>

              <div style={S.rowItem}>
                <span style={S.rowLabel}>Total</span>
                <span style={{ ...S.rowValue, fontWeight: 800 }}>{cop(h.total)}</span>
              </div>
              
              <div style={{ ...S.rowItem, alignItems: 'flex-end', minWidth: 100 }}>
                <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!loading && shown.length === 0 && (
        <div style={S.empty}>
          <span style={S.emptyIcon}>
            <span className="ms" style={{ fontSize: 26, color: 'var(--text)' }}>receipt_long</span>
          </span>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 14 }}>
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

      <Ticket order={ticket} onClose={() => setTicket(null)} isDemo={demoMode} />
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
function Ticket({ order, onClose, isDemo }) {
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
      {/* Estilos para impresión y recibo zig-zag */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-ticket, #printable-ticket * { visibility: visible !important; }
          #printable-ticket { 
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; 
            margin: 0 !important; box-shadow: none !important; filter: none !important; 
            background: #fff !important;
          }
          .no-print { display: none !important; }
        }
        .receipt-zigzag {
           position: relative;
           background: #fff;
           filter: drop-shadow(0 10px 40px rgba(0,0,0,0.15));
        }
        .receipt-zigzag::before, .receipt-zigzag::after {
           content: "";
           position: absolute;
           left: 0; right: 0;
           height: 12px;
           background-size: 24px 100%;
        }
        .receipt-zigzag::before {
           top: -12px;
           background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%);
           background-position: -12px 0;
        }
        .receipt-zigzag::after {
           bottom: -12px;
           background-image: linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(315deg, #fff 25%, transparent 25%);
           background-position: -12px 0;
        }
      `}</style>
      
      <div 
        style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360, margin: '40px auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          id="printable-ticket"
          className="anim-slideup receipt-zigzag"
          role="dialog"
          aria-label={`Pedido ${order.order_number}`}
          style={{ padding: '32px 24px', color: '#000', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Cabecera Ticket */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-bricolage)', letterSpacing: '-.02em', textTransform: 'uppercase' }}>
              TuraFood
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Recibo de Orden #{order.order_number}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{when(order.created_at)}</div>
          </div>
          
          {/* Contenido (resumen) */}
          <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Cliente:</span>
                <span>{order.customer?.full_name ?? 'Cliente'}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tipo:</span>
                <span>{order.mode === 'pickup' ? 'Recoge en Tienda' : 'Domicilio'}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pago:</span>
                <span>{PAY[order.payment_method] ?? 'Otro'}</span>
             </div>
             {order.mode === 'delivery' && (
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Lugar:</span>
                  <span style={{ textAlign: 'right', maxWidth: 160, lineHeight: 1.2 }}>{order.delivery_address ?? 'Sin dirección'}</span>
               </div>
             )}
          </div>

          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((i, k) => (
              <div key={i.id ?? k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 700, width: 28, flex: 'none' }}>{i.quantity ?? 1}x</span>
                <span style={{ flex: 1, paddingRight: 8 }}>
                  {i.name ?? i.product_name ?? 'Producto'}
                  {i.notes && <span style={{ display: 'block', fontSize: 11, color: '#666', marginTop: 2 }}>{i.notes}</span>}
                </span>
                <span style={{ fontWeight: 600 }}>{cop(Number(i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1))}</span>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: '1px dashed #ccc', margin: '8px 0' }} />

          {/* Totales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
             {discount > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span>Descuento</span><span>- {cop(discount)}</span>
               </div>
             )}
             {delivery > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span>Domicilio</span><span>{cop(delivery)}</span>
               </div>
             )}
             {service > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span>Servicio</span><span>{cop(service)}</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 8 }}>
                <span>TOTAL</span>
                <span>{cop(order.total)}</span>
             </div>
          </div>

          {/* QR */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 16 }}>
             {isDemo ? (
               <div style={{ opacity: 0.8, filter: 'grayscale(1)' }}>
                 <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white"/>
                    <rect x="10" y="10" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="15" y="15" width="10" height="10" fill="black"/>
                    <rect x="70" y="10" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="75" y="15" width="10" height="10" fill="black"/>
                    <rect x="10" y="70" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="15" y="75" width="10" height="10" fill="black"/>
                    <path d="M40 10H60V20H40V10Z" fill="black"/>
                    <path d="M40 30H50V40H40V30Z" fill="black"/>
                    <path d="M70 40H90V50H70V40Z" fill="black"/>
                    <path d="M10 40H30V50H10V40Z" fill="black"/>
                    <path d="M50 50H70V60H50V50Z" fill="black"/>
                    <path d="M40 70H60V80H40V70Z" fill="black"/>
                    <path d="M70 70H80V80H70V70Z" fill="black"/>
                    <path d="M80 80H90V90H80V80Z" fill="black"/>
                    <path d="M40 80H50V90H40V80Z" fill="black"/>
                 </svg>
               </div>
             ) : (
               <QRCodeSVG value={`https://turafood.com/order/${order.id}`} size={100} level="M" />
             )}
             <span style={{ fontSize: 10, color: '#666', marginTop: 8, letterSpacing: '.05em', fontWeight: 600 }}>ESCANEA PARA VER DETALLES</span>
          </div>
        </aside>

        {/* Acciones */}
        <div className="no-print" style={{ display: 'flex', gap: 12 }}>
           <button onClick={() => window.print()} style={{ flex: 1, padding: '16px', background: 'var(--green)', color: '#fff', borderRadius: 16, fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(11,122,72,0.2)', transition: 'transform 0.2s' }}>
             <span className="ms">print</span>
             Imprimir Comanda
           </button>
           <button onClick={onClose} style={{ padding: '16px 24px', background: 'var(--surface2)', color: 'var(--text)', borderRadius: 16, fontWeight: 800, fontSize: 15, border: '1px solid var(--border)', cursor: 'pointer', transition: 'transform 0.2s' }}>
             Cerrar
           </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  chip: { height: 40, padding: '0 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, transition: 'all 0.2s' },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' },
  chipOff: { background: 'var(--surface)', color: 'rgba(255,255,255,0.7)', border: '1px solid var(--border)' },
  search: {
    display: 'flex', alignItems: 'center', gap: 10, width: 280, height: 42,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '0 16px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)'
  },
  searchInput: { flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, minWidth: 0, color: 'var(--text)' },
  
  ticketsGrid: {
    display: 'flex', flexDirection: 'column', gap: 12
  },
  rowCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    boxShadow: 'var(--shadow)', display: 'flex', flexWrap: 'wrap',
    alignItems: 'center', justifyContent: 'space-between', gap: 16, cursor: 'pointer',
    transition: 'all 0.2s', padding: '16px 20px', textAlign: 'left'
  },
  rowItem: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 },
  rowLabel: { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' },
  rowValue: { fontSize: 14, fontWeight: 600, color: 'var(--text)' },

  pill: { fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 10, letterSpacing: '.05em' },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    padding: '64px 20px', textAlign: 'center', background: 'var(--surface)',
    borderRadius: 24, border: '1px dashed rgba(255,255,255,0.1)'
  },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 20, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)'
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
    background: '#1a1a1a', boxShadow: '-20px 0 60px rgba(0,0,0,0.5)', color: 'var(--text)',
    borderLeft: '1px solid rgba(255,255,255,0.06)'
  },
  ticketHead: {
    display: 'flex', alignItems: 'center', gap: 10, flex: 'none',
    padding: '24px', borderBottom: '1px dashed rgba(255,255,255,0.1)',
  },
  ticketNumber: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)'
  },
  ticketWhen: { display: 'block', fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  close: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', border: 'none', cursor: 'pointer'
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
    background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800, color: 'var(--text)'
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
