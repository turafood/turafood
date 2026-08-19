'use client';

/**
 * PAGOS Y LIQUIDACIONES
 * Conversión de `isPayouts` (línea 789) del mockup de Negocios.
 *
 * El corte es semanal: se toman los pedidos entregados de lunes a
 * domingo y se agrupan. Bruto, comisión y neto salen de lo que la base
 * ya guardó en cada pedido.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import { getSalesWindow, getPayouts } from '@/lib/negocio';
import { useBiz } from '../BizContext';
import CabeceraSeccion from '../../components/CabeceraSeccion';

/** Lunes de la semana a la que pertenece una fecha */
function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;   // 0 = lunes
  x.setDate(x.getDate() - day);
  return x;
}

const fmt = (d) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

/** Próximo viernes: es cuando se consigna */
function nextFriday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7 || 7));
  return d;
}

export default function LiquidacionesPage() {
  const { business } = useBiz();
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const [s, p] = await Promise.all([
          getSalesWindow(business.id, 42),
          getPayouts(business.id),
        ]);
        if (!alive) return;
        setSales(s);
        setPayouts(p);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  /** Agrupa los pedidos entregados por semana */
  const weeks = useMemo(() => {
    const map = new Map();
    sales.forEach((o) => {
      if (o.status !== 'delivered') return;
      const start = weekStart(o.created_at);
      const key = start.toISOString().slice(0, 10);
      const cur = map.get(key) ?? { start, orders: 0, gross: 0, fee: 0 };
      cur.orders += 1;
      cur.gross += Number(o.subtotal ?? 0);
      cur.fee += Number(o.business_commission ?? 0);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .map((w) => {
        const end = new Date(w.start);
        end.setDate(end.getDate() + 6);
        return { ...w, end, net: w.gross - w.fee };
      })
      .sort((a, b) => b.start - a.start);
  }, [sales]);

  const thisWeek = weeks[0] ?? { orders: 0, gross: 0, fee: 0, net: 0 };
  const paidThisMonth = weeks
    .slice(1)
    .filter((w) => w.start.getMonth() === new Date().getMonth())
    .reduce((a, w) => a + w.net, 0);

  const mix = [
    { label: 'Ventas', value: thisWeek.gross, color: '#7BE0AE' },
    { label: 'Comisión', value: thisWeek.fee, color: '#FF7A3D' },
  ].filter((m) => m.value > 0);
  const mixTotal = mix.reduce((a, m) => a + m.value, 0) || 1;

  const isPro = Boolean(business?.pro_plan);

  const diasParaElCorte = (() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const viernes = nextFriday();
    viernes.setHours(0, 0, 0, 0);
    return Math.round((viernes - hoy) / 86400000);
  })();

  return (
    <>
      <CabeceraSeccion
        escena="plata"
        etiqueta="TODOS LOS VIERNES"
        titulo="Lo que te vamos a consignar"
        texto="El corte se cierra el domingo y se consigna el viernes. Acá ves cada peso antes de que te llegue."
      />

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        {/* Próxima liquidación */}
        <div style={S.heroCard}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '.05em' }}>
            PRÓXIMA LIQUIDACIÓN
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30, marginTop: 8 }}>
            {loading ? '…' : cop(thisWeek.net)}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.6)', marginTop: 5 }}>
            Se consigna el {nextFriday().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>

          {/* Cuanto falta, en dias. "El viernes" no dice nada si hoy
              es jueves y uno necesita la plata. */}
          <div style={S.countdown}>
            <span className="ms" style={{ fontSize: 16, flex: 'none' }}>schedule</span>
            <span>
              {diasParaElCorte === 0
                ? 'El corte es hoy'
                : diasParaElCorte === 1
                  ? 'Falta 1 día'
                  : `Faltan ${diasParaElCorte} días`}
            </span>
          </div>

          <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: 16, gap: 2 }}>
            {mix.map((m) => (
              <span key={m.label} style={{ flex: m.value / mixTotal, background: m.color, borderRadius: 99 }} />
            ))}
            {mix.length === 0 && <span style={{ flex: 1, background: 'rgba(255,255,255,.2)', borderRadius: 99 }} />}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 11 }}>
            {mix.map((m) => (
              <span key={m.label} style={S.mixItem}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: m.color }} />
                {m.label} {m.label === 'Comisión' ? `−${cop(m.value)}` : cop(m.value)}
              </span>
            ))}
          </div>

          <div style={S.bank}>
            <span style={S.bankIcon}>
              <span className="ms" style={{ fontSize: 18 }}>account_balance</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>Cuenta registrada</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>
                La configuraste al registrarte
              </span>
            </span>
          </div>
        </div>

        {/* Resumen del mes */}
        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Liquidado este mes</div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, marginTop: 10 }}>
            {cop(paidThisMonth)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>
            Semanas ya cerradas del mes en curso.
          </div>
          <div style={S.rows}>
            <Row label="Semanas cerradas" value={String(Math.max(0, weeks.length - 1))} />
            <Row label="Pedidos liquidados" value={String(weeks.slice(1).reduce((a, w) => a + w.orders, 0))} />
          </div>
        </div>

        {/* Comisión */}
        <div style={S.card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Tu comisión</div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, marginTop: 10 }}>
            {isPro ? '0%' : `${Math.round((business?.commission_rate ?? 0.1) * 100)}%`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>
            {isPro
              ? 'Con Biz Pro activo no pagas porcentaje por pedido, solo la suscripción fija.'
              : 'Se descuenta de cada pedido entregado. Con Biz Pro baja a 0%.'}
          </div>
          <div style={S.rows}>
            <Row label="Descontado esta semana" value={cop(thisWeek.fee)} />
            <Row label="Pedidos de la semana" value={String(thisWeek.orders)} />
          </div>
        </div>
      </div>

      {/* Historial */}
      <section style={S.table}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
            Historial de liquidaciones
          </div>
          {payouts.length > 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
              {payouts.length} {payouts.length === 1 ? 'retiro solicitado' : 'retiros solicitados'}
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.headRow }}>
            <span>PERIODO</span><span>PEDIDOS</span><span>BRUTO</span>
            <span>COMISIÓN</span><span>NETO</span>
            <span style={{ textAlign: 'right' }}>ESTADO</span>
          </div>

          {weeks.map((w, i) => {
            const open = i === 0;
            return (
              <div key={w.start.toISOString()} style={S.row}>
                <span style={{ fontWeight: 700 }}>{fmt(w.start)} – {fmt(w.end)}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{w.orders}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{cop(w.gross)}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{cop(w.fee)}</span>
                <span style={{ fontWeight: 800 }}>{cop(w.net)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span
                    style={{
                      ...S.pill,
                      background: open ? '#FFF7E6' : '#E6F6EE',
                      color: open ? '#A8730B' : '#0B7A48',
                    }}
                  >
                    {open ? 'EN CURSO' : 'CERRADA'}
                  </span>
                </span>
              </div>
            );
          })}

          {!loading && weeks.length === 0 && (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>account_balance_wallet</span>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Todavía no hay liquidaciones</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                Aparecen aquí en cuanto entregues tu primer pedido.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              <span className="sk" style={{ display: 'block', height: 64, borderRadius: 16 }} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

const GRID = 'minmax(0,1.4fr) 100px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 120px';

const S = {
  countdown: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12,
    height: 28, padding: '0 12px', borderRadius: 999,
    background: 'rgba(255,255,255,.1)', fontSize: 12, fontWeight: 700,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 20, boxShadow: 'var(--shadowSm)',
  },
  heroCard: {
    background: 'linear-gradient(135deg,var(--ink),#3A332A)',
    borderRadius: 28, padding: 20, color: '#fff',
  },
  mixItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.62)',
  },
  bank: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,.14)',
  },
  bankIcon: {
    width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  rows: {
    display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16,
    paddingTop: 14, borderTop: '1px solid var(--border)',
  },
  table: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    boxShadow: 'var(--shadowSm)', marginTop: 16, overflow: 'hidden',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, minWidth: 840,
    alignItems: 'center', padding: '13px 18px',
    borderBottom: '1px solid var(--border)', fontSize: 13,
  },
  headRow: {
    background: 'var(--bg)', borderTop: '1px solid var(--border)',
    fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em',
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
