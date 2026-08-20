'use client';

/**
 * REPORTES DE VENTAS
 *
 * Una tabla de números no le dice nada a nadie. Lo que un dueño
 * necesita saber son tres cosas: si va mejor o peor que antes, qué día
 * le rinde más, y a qué hora necesita gente en cocina. Esta pantalla
 * responde esas tres y deja la tabla al final para quien quiera el
 * detalle o el CSV.
 *
 * Las gráficas son SVG a mano, sin librería: son tres formas simples y
 * traer 90 KB de charting para esto sería cobrarle el peso a la gente
 * que abre el panel desde un celular con datos.
 *
 * La comisión que se muestra es la que la base guardó en cada pedido
 * (`orders.business_commission`), no un porcentaje recalculado aquí.
 * Con Biz Pro vigente esa comisión es 0 y la tabla lo refleja solo.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import {
  getSalesWindow, summarizeByDay, summarizeByHour,
  summarizeByWeekday, summarizePrevious,
} from '@/lib/negocio';
import { useBiz } from '../BizContext';
import HeaderHero from '../../components/HeaderHero';

const RANGES = [
  { label: '7 días', days: 7 },
  { label: '14 días', days: 14 },
  { label: '30 días', days: 30 },
];

/** Traemos el doble del rango mayor: el periodo anterior también se grafica */
const WINDOW_DAYS = 60;

export default function ReportesPage() {
  const { business } = useBiz();
  const [sales, setSales] = useState([]);
  const [range, setRange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(false);

  const days = RANGES[range].days;

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getSalesWindow(business.id, WINDOW_DAYS);
        if (alive) setSales(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const daily = useMemo(() => summarizeByDay(sales, days), [sales, days]);
  const hourly = useMemo(() => summarizeByHour(sales, days), [sales, days]);
  const weekly = useMemo(() => summarizeByWeekday(sales, days), [sales, days]);
  const before = useMemo(() => summarizePrevious(sales, days), [sales, days]);

  const totals = daily.reduce(
    (a, d) => ({
      orders: a.orders + d.orders,
      gross: a.gross + d.gross,
      fee: a.fee + d.fee,
      net: a.net + d.net,
    }),
    { orders: 0, gross: 0, fee: 0, net: 0 },
  );
  const avg = totals.orders ? Math.round(totals.gross / totals.orders) : 0;
  const avgBefore = before.orders ? Math.round(before.gross / before.orders) : 0;

  const isPro = Boolean(business?.pro_plan);
  const ratePct = totals.gross ? Math.round((totals.fee / totals.gross) * 100) : 0;

  const bestDay = weekly.reduce((a, b) => (b.avgGross > a.avgGross ? b : a), weekly[0]);
  const peakHour = hourly.reduce((a, b) => (b.orders > a.orders ? b : a), hourly[0]);

  const exportCsv = () => {
    const head = 'Fecha;Pedidos;Ticket promedio;Venta bruta;Comisión;Neto';
    const rows = daily.map((d) => [
      d.date.toLocaleDateString('es-CO'), d.orders, d.avg, d.gross, d.fee, d.net,
    ].join(';'));
    const csv = [head, ...rows].join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turafood-ventas-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Skeleton />;

  return (
    <div style={{ maxWidth: 1040 }}>
      <HeaderHero
        title="Rendimiento del negocio"
        subtitle="Analiza qué se vende, a qué hora entran más pedidos y qué productos mueven tu caja. Usa estos datos para optimizar tus horarios y catálogo."
        images={[
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop', // Data/charts
          'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop' // Dashboard
        ]}
      />

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Rango */}
      <div style={S.rangeBar}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
        <button onClick={exportCsv} style={S.export}>
          <span className="ms" style={{ fontSize: 17 }}>download</span>
          Exportar CSV
        </button>
      </div>

      {/* KPIs con comparación contra el periodo anterior */}
      <div style={S.kpis}>
        <Kpi
          label="Venta bruta" value={cop(totals.gross)}
          now={totals.gross} then={before.gross} days={days}
        />
        <Kpi
          label="Neto a recibir" value={cop(totals.net)}
          now={totals.net} then={before.net} days={days}
          foot="Se consigna los viernes"
        />
        <Kpi
          label="Pedidos entregados" value={String(totals.orders)}
          now={totals.orders} then={before.orders} days={days}
        />
        <Kpi
          label="Ticket promedio" value={cop(avg)}
          now={avg} then={avgBefore} days={days}
        />
      </div>

      {/* Curva de ventas */}
      <section style={S.panel}>
        <PanelHead
          title="Cómo vienen tus ventas"
          sub={`Neto por día · ${daily[0]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} al ${daily[daily.length - 1]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
        />
        <AreaChart days={daily} />
      </section>

      {/* Ritmo semanal y horario */}
      <div style={S.duo}>
        <section style={S.panel}>
          <PanelHead
            title="Tus mejores días"
            sub={bestDay?.avgGross
              ? `El ${bestDay.label.toLowerCase()} es tu día fuerte`
              : 'Todavía no hay suficientes pedidos'}
          />
          <WeekdayBars data={weekly} />
        </section>

        <section style={S.panel}>
          <PanelHead
            title="Tus horas pico"
            sub={peakHour?.orders
              ? `El golpe más duro llega a las ${fmtHour(peakHour.hour)}`
              : 'Todavía no hay suficientes pedidos'}
          />
          <HourBars data={hourly} peak={peakHour?.hour} />
        </section>
      </div>

      {/* Comisión, aparte porque es plata que sale */}
      <section style={S.feeCard}>
        <span style={S.feeIcon}>
          <span className="ms" style={{ fontSize: 22, color: isPro ? 'var(--green)' : 'var(--primary)' }}>
            {isPro ? 'verified' : 'percent'}
          </span>
        </span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5 }}>
            {isPro ? 'Comisión TuraFood' : `Comisión TuraFood · ${ratePct}%`}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
            {isPro
              ? 'Con Biz Pro no pagas porcentaje por pedido. Esto es lo que te habrías gastado sin el plan.'
              : 'Se descuenta en la liquidación del viernes, no lo pagas aparte.'}
          </div>
        </div>
        <div style={{
          fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24,
          letterSpacing: '-.02em', color: isPro ? 'var(--green)' : 'var(--text)',
        }}>
          {isPro ? `${cop(totals.fee)} ahorrados` : cop(totals.fee)}
        </div>
      </section>

      {/* Detalle, cerrado por defecto */}
      <section style={{ ...S.panel, padding: 0, overflow: 'hidden' }}>
        <button onClick={() => setDetail((v) => !v)} style={S.detailToggle}>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 15.5 }}>
              Detalle día por día
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {daily.length} días, con comisión y neto de cada uno
            </span>
          </span>
          <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>
            {detail ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {detail && (
          <div style={{ overflowX: 'auto' }} className="anim-fade">
            <div style={{ ...S.row, ...S.headRow }}>
              <span>FECHA</span><span>PEDIDOS</span><span>TICKET PROM.</span>
              <span>VENTA BRUTA</span><span>COMISIÓN</span>
              <span style={{ textAlign: 'right' }}>NETO</span>
            </div>

            {[...daily].reverse().map((d, i) => (
              <div key={i} style={{ ...S.row, background: i === 0 ? 'var(--primary-tint)' : 'transparent' }}>
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
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- piezas */

function PanelHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5, letterSpacing: '-.01em' }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Kpi({ label, value, now, then, days, foot }) {
  // Sin periodo anterior no inventamos un porcentaje: mejor no decir nada
  const hasBase = then > 0;
  const delta = hasBase ? Math.round(((now - then) / then) * 100) : null;
  const up = delta !== null && delta >= 0;

  return (
    <div style={S.kpi}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26,
        letterSpacing: '-.025em', marginTop: 9,
      }}>
        {value}
      </div>

      {delta !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ ...S.delta, background: up ? 'var(--green-tint)' : 'var(--primary-tint)', color: up ? 'var(--green)' : 'var(--primary)' }}>
            <span className="ms" style={{ fontSize: 14 }}>{up ? 'trending_up' : 'trending_down'}</span>
            {up ? '+' : ''}{delta}%
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>vs. {days} días antes</span>
        </div>
      ) : (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 8 }}>
          {foot ?? 'Sin periodo anterior para comparar'}
        </div>
      )}
    </div>
  );
}

/** Área con degradado. viewBox fijo + preserveAspectRatio none = se estira solo */
function AreaChart({ days }) {
  const [hover, setHover] = useState(null);

  const W = 700;
  const H = 200;
  const PAD = 14;
  const max = Math.max(...days.map((d) => d.net), 1);

  const x = (i) => (days.length === 1 ? W / 2 : (i / (days.length - 1)) * W);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);

  const line = days.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.net).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const active = hover !== null ? days[hover] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 190, display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="rep-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Tres líneas guía: sin ejes cargados, solo referencia */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f} x1="0" x2={W} y1={y(max * f)} y2={y(max * f)}
            stroke="var(--border)" strokeWidth="1" strokeDasharray="3 5"
          />
        ))}

        <path d={area} fill="url(#rep-fill)" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

        {active && (
          <line x1={x(hover)} x2={x(hover)} y1={y(active.net)} y2={H}
            stroke="var(--primary)" strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        )}
        {days.map((d, i) => (
          <circle
            key={i} cx={x(i)} cy={y(d.net)} r={hover === i ? 5 : 0}
            fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Zonas de hover encima: una por día, así no hay que calcular distancias */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }} onMouseLeave={() => setHover(null)}>
        {days.map((d, i) => (
          <div
            key={i} style={{ flex: 1, cursor: 'crosshair' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </div>

      {active && (
        <div style={{
          ...S.tip,
          left: `${(hover / Math.max(days.length - 1, 1)) * 100}%`,
          transform: `translateX(${hover < days.length / 2 ? '0' : '-100'}%)`,
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>
            {active.date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, marginTop: 3 }}>{cop(active.net)} neto</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
            {active.orders} {active.orders === 1 ? 'pedido' : 'pedidos'}
          </div>
        </div>
      )}

      <div style={S.axis}>
        <span>{days[0]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
        <span>{days[days.length - 1]?.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}

function WeekdayBars({ data }) {
  const max = Math.max(...data.map((d) => d.avgGross), 1);
  // Domingo al final, como se lee una semana aquí
  const ordered = [...data.slice(1), data[0]];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 168 }}>
      {ordered.map((d) => {
        const h = Math.max((d.avgGross / max) * 128, 3);
        const best = d.avgGross === max && max > 1;
        return (
          <div key={d.index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: best ? 'var(--primary)' : 'var(--muted)' }}>
              {d.avgGross ? shortCop(d.avgGross) : '—'}
            </span>
            <div
              title={`${d.label}: ${cop(d.avgGross)} promedio`}
              style={{
                width: '100%', height: h, borderRadius: '9px 9px 4px 4px',
                background: best
                  ? 'linear-gradient(180deg, var(--primary) 0%, #FF7A4D 100%)'
                  : 'var(--border)',
                transition: 'height .35s cubic-bezier(.2,0,0,1)',
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: best ? 'var(--text)' : 'var(--muted)' }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Solo horas con actividad: pintar la madrugada vacía es ruido */
function HourBars({ data, peak }) {
  const live = data.filter((h) => h.orders > 0);
  const from = live.length ? live[0].hour : 10;
  const to = live.length ? live[live.length - 1].hour : 22;
  const slice = data.slice(from, to + 1);
  const max = Math.max(...slice.map((h) => h.orders), 1);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
        {slice.map((h) => (
          <div
            key={h.hour}
            title={`${fmtHour(h.hour)}: ${h.orders} pedidos`}
            style={{
              flex: 1,
              height: Math.max((h.orders / max) * 138, 3),
              borderRadius: '6px 6px 3px 3px',
              background: h.hour === peak
                ? 'linear-gradient(180deg, var(--primary) 0%, #FF7A4D 100%)'
                : `color-mix(in srgb, var(--primary) ${18 + (h.orders / max) * 40}%, transparent)`,
              transition: 'height .35s cubic-bezier(.2,0,0,1)',
            }}
          />
        ))}
      </div>
      <div style={{ ...S.axis, marginTop: 10 }}>
        <span>{fmtHour(from)}</span>
        <span>{fmtHour(to)}</span>
      </div>
    </>
  );
}

function Skeleton() {
  return (
    <div style={{ maxWidth: 1040 }}>
      <div style={S.kpis}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="sk" style={{ height: 118, borderRadius: 20 }} />)}
      </div>
      <div className="sk" style={{ height: 268, borderRadius: 20, marginTop: 16 }} />
      <div style={S.duo}>
        <div className="sk" style={{ height: 260, borderRadius: 20 }} />
        <div className="sk" style={{ height: 260, borderRadius: 20 }} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- utiles */

/** 1.180.000 → $1,18 M — cabe en una etiqueta de barra */
function shortCop(v) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(v >= 10000000 ? 0 : 1).replace('.', ',')} M`;
  if (v >= 1000) return `$${Math.round(v / 1000)} K`;
  return `$${v}`;
}

function fmtHour(h) {
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

const GRID = 'repeat(6, minmax(0,1fr))';

const S = {
  rangeBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 20, marginTop: 10
  },
  chip: { height: 40, padding: '0 18px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, transition: 'all 0.2s' },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' },
  chipOff: { background: 'rgba(24,24,24,0.7)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' },

  export: {
    height: 40, padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 700,
    background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.2s'
  },

  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 },
  kpi: {
    background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', color: '#fff'
  },
  delta: {
    display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 10px',
    borderRadius: 999, fontSize: 12, fontWeight: 800,
  },

  panel: {
    background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
    padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', marginTop: 20, backdropFilter: 'blur(20px)', color: '#fff'
  },
  duo: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 },

  axis: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginTop: 12,
  },
  tip: {
    position: 'absolute', top: -6, pointerEvents: 'none', zIndex: 2,
    background: 'rgba(24,24,24,0.95)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, padding: '12px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
    color: '#fff'
  },

  feeCard: {
    display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    background: 'rgba(24,24,24,0.7)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24,
    padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.3)', marginTop: 20, backdropFilter: 'blur(20px)', color: '#fff'
  },
  feeIcon: {
    width: 54, height: 54, borderRadius: 18, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'
  },

  detailToggle: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    padding: 24, background: 'none', textAlign: 'left', color: '#fff'
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 16, minWidth: 800,
    padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 13.5,
  },
  headRow: {
    background: 'var(--bg)',
    fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600,
  },
};
