'use client';

/**
 * TICKET / COMANDA TÉRMICA REUTILIZABLE
 * Modal y visor imprimible para cocina e historial.
 * Compatible con impresoras térmicas POS (80mm/58mm) vía window.print().
 */

import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cop } from '@/lib/format';

const formatWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace('a. m.', 'a.m.').replace('p. m.', 'p.m.');
  if (d >= today) return `Hoy · ${time}`;
  if (d >= yest) return `Ayer · ${time}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · ${time}`;
};

const PAY_LABELS = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  card: 'Tarjeta',
};

export default function TicketModal({ order, onClose, isDemo = false }) {
  useEffect(() => {
    if (!order) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  if (!order) return null;

  const items = order.items ?? [];
  const itemsTotal = items.reduce(
    (a, i) => a + Number(i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1), 0,
  );
  const subtotal = Number(order.subtotal ?? itemsTotal);
  const delivery = Number(order.delivery_fee ?? 0);
  const service = Number(order.service_fee ?? 0);
  const discount = Number(order.discount ?? 0);

  return (
    <div style={S.scrim} onClick={onClose}>
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
           filter: drop-shadow(0 10px 40px rgba(0,0,0,0.25));
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
        style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360, margin: 'auto', padding: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <aside
          id="printable-ticket"
          className="anim-slideup receipt-zigzag"
          role="dialog"
          aria-label={`Comanda ${order.order_number}`}
          style={{ padding: '32px 24px', color: '#111', display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 4 }}
        >
          {/* Cabecera Ticket */}
          <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-bricolage)', letterSpacing: '-.02em', textTransform: 'uppercase' }}>
              TuraFood
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4, fontWeight: 700 }}>
              Comanda #{order.order_number}
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
              {formatWhen(order.created_at)}
            </div>
          </div>
          
          {/* Metadatos */}
          <div style={{ fontSize: 13.5, display: 'flex', flexDirection: 'column', gap: 8 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Cliente:</span>
                <span>{order.customer?.full_name ?? order.customer_name ?? 'Cliente'}</span>
             </div>
             {order.customer_phone && (
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Teléfono:</span>
                  <span>{order.customer_phone}</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Tipo:</span>
                <span style={{ fontWeight: 700 }}>{order.mode === 'pickup' ? 'Para Recoger' : 'Domicilio'}</span>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Pago:</span>
                <span style={{ fontWeight: 700 }}>{PAY_LABELS[order.payment_method] ?? order.payment_method ?? 'Efectivo'}</span>
             </div>
             {order.mode === 'delivery' && order.delivery_address && (
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontWeight: 700 }}>Dirección:</span>
                  <span style={{ textAlign: 'right', maxWidth: 180, lineHeight: 1.25, fontSize: 12.5 }}>{order.delivery_address}</span>
               </div>
             )}
             {order.delivery_instructions && (
               <div style={{ marginTop: 4, padding: '6px 8px', background: '#FFF7E6', borderRadius: 6, fontSize: 12, color: '#7A5405', lineHeight: 1.3 }}>
                  <strong>Nota:</strong> {order.delivery_instructions}
               </div>
             )}
          </div>

          <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }} />

          {/* Items de la Comanda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {items.map((i, k) => (
              <div key={i.id ?? k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 800, width: 28, flex: 'none', color: '#000' }}>{i.quantity ?? 1}x</span>
                <span style={{ flex: 1, paddingRight: 8 }}>
                  <span style={{ fontWeight: 600 }}>{i.name ?? i.product_name ?? 'Producto'}</span>
                  {i.notes && <span style={{ display: 'block', fontSize: 11.5, color: '#A8730B', marginTop: 2, fontWeight: 600 }}>📌 {i.notes}</span>}
                </span>
                <span style={{ fontWeight: 700 }}>{cop(Number(i.unit_price ?? i.price ?? 0) * (i.quantity ?? 1))}</span>
              </div>
            ))}
          </div>
          
          <div style={{ borderTop: '1px dashed #ccc', margin: '4px 0' }} />

          {/* Totales */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
             {discount > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0B8E54' }}>
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
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 6, paddingTop: 6, borderTop: '1px solid #111' }}>
                <span>TOTAL</span>
                <span>{cop(order.total)}</span>
             </div>
          </div>

          {/* QR de Seguimiento */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 12 }}>
             {isDemo ? (
               <div style={{ opacity: 0.8, filter: 'grayscale(1)' }}>
                 <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
                    <rect width="100" height="100" fill="white"/>
                    <rect x="10" y="10" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="15" y="15" width="10" height="10" fill="black"/>
                    <rect x="70" y="10" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="75" y="15" width="10" height="10" fill="black"/>
                    <rect x="10" y="70" width="20" height="20" stroke="black" strokeWidth="4"/>
                    <rect x="15" y="75" width="10" height="10" fill="black"/>
                 </svg>
               </div>
             ) : (
               <QRCodeSVG value={`https://turafood.com/order/${order.id}`} size={84} level="M" />
             )}
             <span style={{ fontSize: 9.5, color: '#777', marginTop: 6, letterSpacing: '.05em', fontWeight: 700 }}>
               ESCANEA PARA TRACKING
             </span>
          </div>
        </aside>

        {/* Acciones */}
        <div className="no-print" style={{ display: 'flex', gap: 10 }}>
           <button 
             onClick={() => window.print()} 
             style={{ 
               flex: 1, padding: '14px', background: 'var(--green)', color: '#fff', 
               borderRadius: 14, fontWeight: 800, fontSize: 14.5, display: 'flex', 
               alignItems: 'center', justifyContent: 'center', gap: 8, border: 'none', 
               cursor: 'pointer', boxShadow: '0 4px 12px rgba(11,142,84,0.25)' 
             }}
           >
             <span className="ms" style={{ fontSize: 20 }}>print</span>
             Imprimir Comanda
           </button>
           <button 
             onClick={onClose} 
             style={{ 
               padding: '14px 20px', background: 'var(--surface2)', color: 'var(--text)', 
               borderRadius: 14, fontWeight: 800, fontSize: 14.5, border: '1px solid var(--border)', 
               cursor: 'pointer' 
             }}
           >
             Cerrar
           </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', overflowY: 'auto',
  },
};
