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

  // Datos dummy basados en el producto
  const views = product ? Math.floor(Math.random() * 5000) + 1000 : 2580;
  const carts = Math.floor(views * (Math.random() * 0.3 + 0.1));
  const buys = Math.floor(carts * (Math.random() * 0.5 + 0.2));
  const convRate = ((buys / views) * 100).toFixed(1);
  const revenue = buys * (product?.price || 15000);

  const getPercent = (value, max) => `${(value / max) * 100}%`;

  return (
    <div onClick={onClose} style={S.scrim}>
      <style>{`
        @keyframes meshGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .premium-bg {
          background: linear-gradient(-45deg, rgba(25,25,25,0.95), rgba(15,30,22,0.98), rgba(20,20,32,0.98), rgba(25,25,25,0.95));
          background-size: 400% 400%;
          animation: meshGradient 12s ease infinite;
        }
        .premium-wave {
          position: absolute; top: 0; left: 0; right: 0; height: 160px;
          background: radial-gradient(120% 100% at 50% 0%, rgba(17, 178, 106, 0.2) 0%, transparent 100%);
          border-radius: 28px 28px 0 0;
          pointer-events: none; z-index: 0;
        }
        .glass-card {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .glass-card:hover {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        .neon-bar {
          transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div onClick={(e) => e.stopPropagation()} className="anim-pop premium-bg sc" style={S.sheet}>
        <div className="premium-wave" />
        
        {/* Header */}
        <header style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1, position: 'relative', minWidth: 0 }}>
            {product?.images?.[0] ? (
              <img src={product.images[0]} alt="" style={S.img} />
            ) : (
              <div style={{ ...S.img, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="ms" style={{ color: 'rgba(255,255,255,0.5)' }}>lunch_dining</span>
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={S.badge}>RENDIMIENTO ORGÁNICO</div>
              <div style={S.title} className="tr1">{product?.name || 'Producto seleccionado'}</div>
            </div>
          </div>
          <button onClick={onClose} style={S.close} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 18, color: '#fff' }}>close</span>
          </button>
        </header>

        {/* Tabs Period */}
        <div style={S.tabs}>
          {['7D', '30D', '90D'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                ...S.tab,
                background: period === p ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: period === p ? '#fff' : 'rgba(255,255,255,0.5)',
                boxShadow: period === p ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Metric Cards Grid */}
        <div style={S.grid}>
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{ color: '#93C5FD', fontSize: 20 }}>visibility</span></div>
            <div>
              <div style={S.metricValue}>{views.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Vistas totales</div>
            </div>
          </div>
          
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{ color: '#FCD34D', fontSize: 20 }}>shopping_cart</span></div>
            <div>
              <div style={S.metricValue}>{carts.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Al Carrito</div>
            </div>
          </div>
          
          <div className="glass-card" style={S.metricCard}>
            <div style={S.metricIcon}><span className="ms" style={{ color: '#6EE7B7', fontSize: 20 }}>payments</span></div>
            <div>
              <div style={S.metricValue}>{buys.toLocaleString('es-CO')}</div>
              <div style={S.metricLabel}>Comprados</div>
            </div>
          </div>
          
          <div className="glass-card" style={{ ...S.metricCard, background: convRate > 5 ? 'rgba(17, 178, 106, 0.12)' : 'rgba(255, 68, 31, 0.12)', borderColor: convRate > 5 ? 'rgba(17, 178, 106, 0.35)' : 'rgba(255, 68, 31, 0.35)' }}>
            <div style={{ ...S.metricIcon, background: 'transparent' }}>
              <span className="ms" style={{ color: convRate > 5 ? '#11B26A' : '#FF5B22', fontSize: 20 }}>{convRate > 5 ? 'trending_up' : 'trending_down'}</span>
            </div>
            <div>
              <div style={{ ...S.metricValue, color: convRate > 5 ? '#11B26A' : '#FF5B22' }}>{convRate}%</div>
              <div style={{ ...S.metricLabel, color: convRate > 5 ? 'rgba(17,178,106,0.9)' : 'rgba(255,91,34,0.9)' }}>Tasa Conversión</div>
            </div>
          </div>
        </div>

        {/* Funnel Container */}
        <div className="glass-card" style={S.funnelContainer}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', letterSpacing: '.02em' }}>Embudo de Ventas Orgánico</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>ÚLTIMOS {period}</div>
          </div>
          
          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Vistas</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: '100%', background: '#60A5FA', boxShadow: '0 0 14px rgba(96,165,250,0.6)' }} />
            </div>
            <div style={S.funnelNum}>{views}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Agregados</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(carts, views), background: '#F472B6', boxShadow: '0 0 14px rgba(244,114,182,0.6)' }} />
            </div>
            <div style={S.funnelNum}>{carts}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Checkout</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(Math.floor((carts + buys)/2), views), background: '#FBBF24', boxShadow: '0 0 14px rgba(251,191,36,0.6)' }} />
            </div>
            <div style={S.funnelNum}>{Math.floor((carts + buys)/2)}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Compras</div>
            <div style={S.funnelBarBg}>
              <div className="neon-bar" style={{ ...S.funnelBarFill, width: getPercent(buys, views), background: '#34D399', boxShadow: '0 0 14px rgba(52,211,153,0.6)' }} />
            </div>
            <div style={S.funnelNum}>{buys}</div>
          </div>
        </div>

        {/* Footer Revenue */}
        <div style={S.footer}>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '.05em' }}>INGRESOS ESTIMADOS ({period})</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#F2D399', letterSpacing: '-.02em', marginTop: 4 }}>
            {cop(revenue)}
          </div>
        </div>

      </div>
    </div>
  );
}

const S = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 480, maxHeight: '88vh', background: 'rgba(20, 20, 20, 0.95)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 28,
    boxShadow: '0 30px 90px rgba(0,0,0,0.9), inset 0 1px 1px rgba(255,255,255,0.15)',
    overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  img: { width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flex: 'none' },
  badge: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', color: '#D99A15',
    textTransform: 'uppercase', marginBottom: 2
  },
  title: { fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2 },
  close: {
    width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', zIndex: 2, flex: 'none'
  },
  tabs: {
    display: 'flex', background: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 12, margin: '18px 24px 0',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  tab: {
    flex: 1, height: 32, borderRadius: 8, fontSize: 12.5, fontWeight: 800,
    border: 'none', cursor: 'pointer', transition: 'all .2s'
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '14px 24px 18px', zIndex: 1
  },
  metricCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    borderRadius: 18, padding: '14px 16px'
  },
  metricIcon: {
    width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 'none'
  },
  metricLabel: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  metricValue: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 },
  funnelContainer: {
    margin: '0 24px 20px', borderRadius: 20, padding: 20, zIndex: 1, position: 'relative'
  },
  funnelRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  funnelLabel: { width: 80, fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 700 },
  funnelBarBg: { flex: 1, height: 9, background: 'rgba(0,0,0,0.4)', borderRadius: 99, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)' },
  funnelBarFill: { height: '100%', borderRadius: 99 },
  funnelNum: { width: 45, textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: '#fff' },
  footer: {
    background: 'linear-gradient(to right, rgba(217, 154, 21, 0.15), rgba(242, 211, 153, 0.05))',
    padding: '20px 24px', borderTop: '1px solid rgba(217, 154, 21, 0.2)', zIndex: 1
  }
};
