'use client';

/**
 * OVERLAY DE RENDIMIENTO ORGÁNICO
 * Panel PRO con estilo glassmorphism oscuro y dorado para mostrar
 * las métricas del embudo de ventas de un producto en particular.
 */

import { useState } from 'react';
import { cop } from '@/lib/format';

export default function PerformanceOverlay({ product, onClose }) {
  const [period, setPeriod] = useState('7D'); // 7D, 30D, 90D

  // Datos dummy basados en el producto (en producción vendrían de Supabase)
  const views = product ? Math.floor(Math.random() * 5000) + 1000 : 2580;
  const carts = Math.floor(views * (Math.random() * 0.3 + 0.1));
  const buys = Math.floor(carts * (Math.random() * 0.5 + 0.2));
  const convRate = ((buys / views) * 100).toFixed(1);
  const revenue = buys * (product?.price || 15000);

  const getPercent = (value, max) => `${(value / max) * 100}%`;

  return (
    <div onClick={onClose} style={S.scrim}>
      <style>{`
        @keyframes waveFloat {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        @keyframes meshGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .premium-bg {
          background: linear-gradient(-45deg, rgba(20,20,20,0.9), rgba(15,30,20,0.95), rgba(20,20,30,0.95), rgba(20,20,20,0.9));
          background-size: 400% 400%;
          animation: meshGradient 12s ease infinite;
        }
        .premium-wave {
          position: absolute; top: 0; left: 0; right: 0; height: 180px;
          background: radial-gradient(120% 100% at 50% 0%, rgba(17, 178, 106, 0.15) 0%, transparent 100%);
          border-radius: 24px 24px 0 0;
          pointer-events: none; z-index: 0;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .neon-bar {
          transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop premium-bg" style={S.sheet}>
        <div className="premium-wave" />
        <header style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1, position: 'relative' }}>
            {product?.images?.[0] ? (
              <img src={product.images[0]} alt="" style={S.img} />
            ) : (
              <div style={{...S.img, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <span className="ms" style={{color: 'rgba(255,255,255,0.4)'}}>image</span>
              </div>
            )}
            <div>
              <div style={S.badge}>RENDIMIENTO ORGÁNICO</div>
              <div style={S.title}>{product?.name || 'Producto seleccionado'}</div>
            </div>
          </div>
          <button onClick={onClose} style={S.close}>
            <span className="ms">close</span>
          </button>
        </header>

        <div style={S.tabs}>
          {['7D', '30D', '90D'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{ ...S.tab, background: period === p ? 'rgba(255,255,255,0.1)' : 'transparent', color: period === p ? '#fff' : 'rgba(255,255,255,0.5)' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={S.grid}>
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{color: '#93C5FD'}}>visibility</span></div>
            <div>
              <div style={S.metricValue}>{views.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Vistas totales</div>
            </div>
          </div>
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{color: '#FCD34D'}}>shopping_cart</span></div>
            <div>
              <div style={S.metricValue}>{carts.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Al Carrito</div>
            </div>
          </div>
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{color: '#6EE7B7'}}>payments</span></div>
            <div>
              <div style={S.metricValue}>{buys.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Comprados</div>
            </div>
          </div>
          <div className="glass-card" style={{ ...S.metricCard, background: convRate > 5 ? 'rgba(17, 178, 106, 0.1)' : 'rgba(255, 68, 31, 0.1)', borderColor: convRate > 5 ? 'rgba(17, 178, 106, 0.3)' : 'rgba(255, 68, 31, 0.3)' }}>
            <div style={{...S.metricIcon, background: 'transparent'}}><span className="ms" style={{color: convRate > 5 ? '#11B26A' : 'var(--primary)'}}>{convRate > 5 ? 'trending_up' : 'trending_down'}</span></div>
            <div>
              <div style={{ ...S.metricValue, color: convRate > 5 ? '#11B26A' : 'var(--primary)' }}>{convRate}%</div>
              <div style={{ ...S.metricLabel, color: convRate > 5 ? 'rgba(17,178,106,0.7)' : 'rgba(255,68,31,0.7)' }}>Tasa de Conversión</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={S.funnelContainer}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '.03em' }}>Embudo de Ventas Orgánico</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>ÚLTIMOS {period}</div>
          </div>
          
          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Vistas</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: '100%', background: '#60A5FA', boxShadow: '0 0 16px rgba(96,165,250,0.5)' }} />
            </div>
            <div style={S.funnelNum}>{views}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Agregados</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(carts, views), background: '#F472B6', boxShadow: '0 0 16px rgba(244,114,182,0.5)' }} />
            </div>
            <div style={S.funnelNum}>{carts}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Checkout</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(Math.floor((carts + buys)/2), views), background: '#FBBF24', boxShadow: '0 0 16px rgba(251,191,36,0.5)' }} />
            </div>
            <div style={S.funnelNum}>{Math.floor((carts + buys)/2)}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Compras</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(buys, views), background: '#34D399', boxShadow: '0 0 16px rgba(52,211,153,0.5)' }} />
            </div>
            <div style={S.funnelNum}>{buys}</div>
          </div>
        </div>

        <div style={S.footer}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>INGRESOS GENERADOS ({period})</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F2D399', letterSpacing: '-.02em', marginTop: 4 }}>
            {cop(revenue)}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 9000,
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 440, background: 'rgba(20, 20, 20, 0.85)',
    border: '1px solid var(--border)', borderRadius: 24,
    boxShadow: '0 30px 80px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column'
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  img: { width: 44, height: 44, borderRadius: 10, objectFit: 'cover' },
  badge: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.05em', color: '#D99A15',
    textTransform: 'uppercase', marginBottom: 4
  },
  title: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' },
  close: {
    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    border: '1px solid var(--border)', cursor: 'pointer', zIndex: 1
  },
  tabs: {
    display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, margin: '20px 24px 0'
  },
  tab: {
    flex: 1, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
    border: 'none', cursor: 'pointer', transition: 'all .2s'
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '10px 24px 20px', zIndex: 1
  },
  metricCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    borderRadius: 20, padding: '16px'
  },
  metricIcon: {
    width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 'none'
  },
  metricLabel: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  metricValue: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 },
  funnelContainer: {
    margin: '0 24px 24px', borderRadius: 24, padding: 24, zIndex: 1, position: 'relative'
  },
  funnelRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 },
  funnelLabel: { width: 80, fontSize: 12, color: 'var(--text)', fontWeight: 600 },
  funnelBarBg: { flex: 1, height: 10, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' },
  funnelBarFill: { height: '100%', borderRadius: 99 },
  funnelNum: { width: 45, textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#fff' },
  footer: {
    background: 'linear-gradient(to right, rgba(217, 154, 21, 0.15), rgba(242, 211, 153, 0.05))',
    padding: '24px', borderTop: '1px solid rgba(217, 154, 21, 0.2)', zIndex: 1
  }
};
