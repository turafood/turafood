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
              <div key={h.id} style={S.row}>
                <span style={{ fontWeight: 800 }}>#{h.order_number}</span>
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
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
                </span>
              </div>
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
    </>
  );
}

const GRID = '110px minmax(0,1.3fr) minmax(0,1fr) 116px 108px 116px 118px';

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
    alignItems: 'center', padding: '13px 18px',
    borderBottom: '1px solid var(--border)', fontSize: 13,
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
};
