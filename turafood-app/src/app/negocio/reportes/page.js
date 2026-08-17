'use client';

/**
 * REPORTES DE VENTAS
 * Conversión de `isReports` (línea 755) del mockup de Negocios.
 *
 * La comisión que se muestra es la que la base guardó en cada pedido
 * (`orders.business_commission`), no un porcentaje recalculado aquí.
 * Con Biz Pro vigente esa comisión es 0 y la tabla lo refleja solo.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import { getSalesWindow, summarizeByDay } from '@/lib/negocio';
import { useBiz } from '../BizContext';

const RANGES = [
  { label: '7 días', days: 7 },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
];

export default function ReportesPage() {
  const { business } = useBiz();
  const [sales, setSales] = useState([]);
  const [range, setRange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getSalesWindow(business.id, 30);
        if (alive) setSales(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const days = useMemo(
    () => summarizeByDay(sales, RANGES[range].days),
    [sales, range],
  );

  const totals = days.reduce(
    (a, d) => ({
      orders: a.orders + d.orders,
      gross: a.gross + d.gross,
      fee: a.fee + d.fee,
      net: a.net + d.net,
    }),
    { orders: 0, gross: 0, fee: 0, net: 0 },
  );
  const avg = totals.orders ? Math.round(totals.gross / totals.orders) : 0;

  const isPro = Boolean(business?.pro_plan);
  const ratePct = totals.gross ? Math.round((totals.fee / totals.gross) * 100) : 0;

  const exportCsv = () => {
    const head = 'Fecha;Pedidos;Ticket promedio;Venta bruta;Comisión;Neto';
    const rows = days.map((d) => [
      d.date.toLocaleDateString('es-CO'), d.orders, d.avg, d.gross, d.fee, d.net,
    ].join(';'));
    const csv = [head, ...rows].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turafood-ventas-${RANGES[range].days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRange(i)}
            style={{ ...S.chip, ...(i === range ? S.chipOn : S.chipOff) }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
        <Kpi label="Venta bruta" value={cop(totals.gross)} note={`${totals.orders} pedidos entregados`} />
        <Kpi
          label={isPro ? 'Comisión TuraFood' : `Comisión TuraFood (${ratePct}%)`}
          value={cop(totals.fee)}
          note={isPro ? 'Con Biz Pro no pagas porcentaje por pedido' : 'Se descuenta en la liquidación'}
          accent={isPro ? 'var(--green)' : 'var(--muted)'}
        />
        <Kpi label="Neto a recibir" value={cop(totals.net)} note="Se consigna los viernes" />
        <Kpi label="Ticket promedio" value={cop(avg)} note="Por pedido entregado" />
      </div>

      <section style={S.table}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
              Detalle por día
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {days[0]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
              {' – '}
              {days[days.length - 1]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button onClick={exportCsv} style={S.export}>
            <span className="ms" style={{ fontSize: 18 }}>download</span>
            Exportar CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.headRow }}>
            <span>FECHA</span><span>PEDIDOS</span><span>TICKET PROM.</span>
            <span>VENTA BRUTA</span><span>COMISIÓN</span>
            <span style={{ textAlign: 'right' }}>NETO</span>
          </div>

          {days.map((d, i) => (
            <div
              key={i}
              style={{ ...S.row, background: i === days.length - 1 ? '#FFF9F7' : 'transparent' }}
            >
              <span style={{ fontWeight: 700 }}>
                {d.date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{d.orders}</span>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{d.orders ? cop(d.avg) : '—'}</span>
              <span style={{ fontWeight: 700 }}>{cop(d.gross)}</span>
              <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{cop(d.fee)}</span>
              <span style={{ fontWeight: 800, textAlign: 'right' }}>{cop(d.net)}</span>
            </div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Cargando ventas…
          </div>
        )}
      </section>
    </>
  );
}

function Kpi({ label, value, note, accent = 'var(--muted)' }) {
  return (
    <div style={S.card}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 25, letterSpacing: '-.02em', marginTop: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 5, color: accent }}>{note}</div>
    </div>
  );
}

const GRID = 'repeat(6, minmax(0,1fr))';

const S = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 18, boxShadow: 'var(--shadowSm)',
  },
  chip: { height: 36, padding: '0 14px', borderRadius: 11, fontSize: 12.5, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  table: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    boxShadow: 'var(--shadowSm)', marginTop: 16, overflow: 'hidden',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, minWidth: 800,
    padding: '13px 18px', borderBottom: '1px solid var(--border)', fontSize: 13,
  },
  headRow: {
    background: 'var(--bg)', borderTop: '1px solid var(--border)',
    fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em',
  },
  export: {
    display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 18px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
