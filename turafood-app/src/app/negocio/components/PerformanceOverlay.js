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
      <div onClick={(e) => e.stopPropagation()} className="anim-pop" style={S.sheet}>
        
        <header style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {product?.images?.[0] && (
              <img src={product.images[0]} alt="" style={S.img} />
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
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Vistas</div>
            <div style={S.metricValue}>{views.toLocaleString('es-CO')}</div>
          </div>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Al Carrito</div>
            <div style={S.metricValue}>{carts.toLocaleString('es-CO')}</div>
          </div>
          <div style={S.metricCard}>
            <div style={S.metricLabel}>Comprados</div>
            <div style={S.metricValue}>{buys.toLocaleString('es-CO')}</div>
          </div>
          <div style={{ ...S.metricCard, background: convRate > 5 ? 'rgba(17, 178, 106, 0.15)' : 'rgba(255, 68, 31, 0.15)', borderColor: convRate > 5 ? 'rgba(17, 178, 106, 0.3)' : 'rgba(255, 68, 31, 0.3)' }}>
            <div style={{ ...S.metricLabel, color: convRate > 5 ? '#11B26A' : 'var(--primary)' }}>Conversión</div>
            <div style={{ ...S.metricValue, color: convRate > 5 ? '#11B26A' : 'var(--primary)' }}>{convRate}%</div>
          </div>
        </div>

        <div style={S.funnelContainer}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>Embudo de Ventas</div>
          
          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Vistas</div>
            <div style={S.funnelBarBg}>
              <div style={{ ...S.funnelBarFill, width: '100%', background: '#fff' }} />
            </div>
            <div style={S.funnelNum}>{views}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Agregados</div>
            <div style={S.funnelBarBg}>
              <div style={{ ...S.funnelBarFill, width: getPercent(carts, views), background: '#FFB020' }} />
            </div>
            <div style={S.funnelNum}>{carts}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Checkout</div>
            <div style={S.funnelBarBg}>
              <div style={{ ...S.funnelBarFill, width: getPercent(Math.floor((carts + buys)/2), views), background: '#FF7A3D' }} />
            </div>
            <div style={S.funnelNum}>{Math.floor((carts + buys)/2)}</div>
          </div>

          <div style={S.funnelRow}>
            <div style={S.funnelLabel}>Compras</div>
            <div style={S.funnelBarBg}>
              <div style={{ ...S.funnelBarFill, width: getPercent(buys, views), background: '#11B26A' }} />
            </div>
            <div style={S.funnelNum}>{buys}</div>
          </div>
        </div>

        <div style={S.footer}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>INGRESOS GENERADOS ({period})</div>
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
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24,
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
  title: { fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2 },
  close: {
    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
    border: 'none', cursor: 'pointer'
  },
  tabs: {
    display: 'flex', background: 'rgba(0,0,0,0.3)', padding: 4, borderRadius: 12, margin: '20px 24px 0'
  },
  tab: {
    flex: 1, height: 32, borderRadius: 8, fontSize: 13, fontWeight: 700,
    border: 'none', cursor: 'pointer', transition: 'all .2s'
  },
  grid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '20px 24px'
  },
  metricCard: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16
  },
  metricLabel: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' },
  funnelContainer: {
    background: 'rgba(0,0,0,0.3)', margin: '0 24px 24px', borderRadius: 20, padding: 20,
    border: '1px solid rgba(255,255,255,0.04)'
  },
  funnelRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  funnelLabel: { width: 70, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 },
  funnelBarBg: { flex: 1, height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' },
  funnelBarFill: { height: '100%', borderRadius: 99 },
  funnelNum: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#fff' },
  footer: {
    background: 'linear-gradient(to right, rgba(217, 154, 21, 0.1), rgba(242, 211, 153, 0.05))',
    padding: '20px 24px', borderTop: '1px solid rgba(217, 154, 21, 0.2)'
  }
};
