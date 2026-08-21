'use client';

import { cop } from '@/lib/format';

const MOCK_DATA = [
  { id: 1, name: 'Carlos Mendoza', deliveries: 12, cashCollected: 125000, fee: 36000, net: -89000 },
  { id: 2, name: 'Andrés Felipe Gómez', deliveries: 4, cashCollected: 0, fee: 12000, net: 12000 },
];

export default function LiquidacionPage() {
  const totalDeliveries = MOCK_DATA.reduce((acc, r) => acc + r.deliveries, 0);
  const totalFee = MOCK_DATA.reduce((acc, r) => acc + r.fee, 0);
  const totalCash = MOCK_DATA.reduce((acc, r) => acc + r.cashCollected, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* PREMIUM DARK HERO SECTION */}
      <section style={{ 
        background: 'linear-gradient(135deg, #141009 0%, #2A2620 100%)',
        borderRadius: 24, padding: 36, color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(20,16,10,0.15)', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, background: 'radial-gradient(circle, rgba(17,178,106,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(145deg, #FFB020, #E8C766)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,176,32,0.3)', flex: 'none' }}>
            <span className="ms" style={{ fontSize: 32, color: 'var(--ink)' }}>account_balance_wallet</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase' }}>Cortes y Cierres</div>
            <h2 style={{ margin: 0, fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
              Finanzas y Pagos
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, maxWidth: 600 }}>
              Liquida a tus repartidores al final del día. Observa en tiempo real cuánto te deben por efectivo recaudado vs. cuánto les debes por tarifas de entrega.
            </p>
          </div>
        </div>

        {/* METRICS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 36, position: 'relative', zIndex: 2 }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', marginBottom: 8 }}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--gold)' }}>local_mall</span>
              ENTREGAS HOY
            </div>
            <div style={{ fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800 }}>{totalDeliveries}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', marginBottom: 8 }}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--green)' }}>payments</span>
              DEUDA A REPARTIDORES
            </div>
            <div style={{ fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--green)' }}>{cop(totalFee)}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 20 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, letterSpacing: '.05em', marginBottom: 8 }}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>account_balance</span>
              EFECTIVO RECAUDADO
            </div>
            <div style={{ fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--primary)' }}>{cop(totalCash)}</div>
          </div>
        </div>
      </section>

      {/* TABLE DATA */}
      <section className="glass-panel" style={{ marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={S.rowHead}>
            <span>Repartidor</span>
            <span style={{ textAlign: 'center' }}>Entregas</span>
            <span style={{ textAlign: 'right' }}>Tarifas (A Favor)</span>
            <span style={{ textAlign: 'right' }}>Efectivo (En Contra)</span>
            <span style={{ textAlign: 'right' }}>Balance Neto</span>
            <span />
          </div>
          {MOCK_DATA.map((r, index) => {
            const isLast = index === MOCK_DATA.length - 1;
            return (
              <div key={r.id} style={{ ...S.row, borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ fontSize: 18, color: 'var(--text)' }}>person</span>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--text)' }}>{r.name}</span>
                </span>
                
                <span style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{r.deliveries}</span>
                
                <span style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 800 }}>{cop(r.fee)}</span>
                
                <span style={{ textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{r.cashCollected > 0 ? cop(r.cashCollected) : '-'}</span>
                
                <span style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ 
                    padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                    background: r.net < 0 ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'color-mix(in srgb, var(--green) 12%, transparent)',
                    color: r.net < 0 ? 'var(--primary)' : 'var(--green)'
                  }}>
                    {r.net < 0 ? `Debes cobrar ${cop(Math.abs(r.net))}` : `Debes pagar ${cop(r.net)}`}
                  </span>
                </span>
                
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button style={S.btnSettle}>Liquidar Hoy</button>
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

const S = {
  rowHead: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', gap: 16, padding: '20px 24px',
    background: 'var(--surface2)', fontSize: 11, fontWeight: 800, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '1px solid var(--border)'
  },
  row: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px', gap: 16, padding: '16px 24px',
    alignItems: 'center', fontSize: 14
  },
  btnSettle: {
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    boxShadow: 'var(--shadowSm)', transition: 'background 0.2s'
  }
};
