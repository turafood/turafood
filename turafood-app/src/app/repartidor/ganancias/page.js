'use client';

/**
 * GANANCIAS
 * Conversión de `isEarnings` (línea 607) del mockup del Repartidor.
 *
 * Todo sale de las entregas reales: lo que la base guardó en
 * `orders.courier_earnings` de cada pedido entregado. El retiro va por
 * `request_payout`, que valida el saldo contra la billetera, no contra
 * lo que diga esta pantalla.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop, relativeTime } from '@/lib/format';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { getDeliveries, earningsByDay } from '@/lib/repartidor';
import { useRider } from '../RiderContext';

const RANGES = [
  { label: 'Día', days: 1, title: 'Hoy' },
  { label: 'Semana', days: 7, title: 'Esta semana' },
  { label: 'Mes', days: 30, title: 'Últimos 30 días' },
];

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function GananciasPage() {
  const { courier, toast } = useRider();
  const [deliveries, setDeliveries] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [range, setRange] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courier) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getDeliveries(courier.id, 200);
        if (alive) setDeliveries(rows);

        if (isConfigured()) {
          const supabase = createClient();
          const { data } = await supabase
            .from('wallets').select('id, credits').eq('user_id', courier.id).maybeSingle();
          if (alive) setWallet(data);
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [courier]);

  const days = useMemo(
    () => earningsByDay(deliveries, RANGES[range].days),
    [deliveries, range],
  );

  const shown = range === 2 ? days.slice(-14) : days;
  const chartMax = Math.max(...shown.map((d) => d.total), 1);
  const total = days.reduce((a, d) => a + d.total, 0);
  const tips = days.reduce((a, d) => a + d.tips, 0);
  const count = days.reduce((a, d) => a + d.count, 0);

  /**
   * Lo que se puede retirar.
   *
   * Con la base conectada manda la billetera: es la unica que sabe que
   * ya se consigno y que no. Sin base —revisando pantallas en local—
   * se estima con lo ganado desde el ultimo viernes, que es cuando cae
   * el corte. Se estima para que la pantalla no salga en cero y parezca
   * rota, no para que nadie decida nada con ese numero.
   */
  const sinceCut = useMemo(() => {
    const cut = new Date();
    cut.setHours(0, 0, 0, 0);
    // Retrocede hasta el viernes mas reciente (5 = viernes)
    while (cut.getDay() !== 5) cut.setDate(cut.getDate() - 1);
    return deliveries
      .filter((d) => new Date(d.delivered_at ?? d.created_at) >= cut)
      .reduce((a, d) => a + Number(d.courier_earnings ?? 0), 0);
  }, [deliveries]);

  const live = isConfigured();
  const available = live ? Number(wallet?.credits ?? 0) : sinceCut;

  const withdraw = async () => {
    setError(null);
    if (!isConfigured()) {
      setError('El retiro todavía no está habilitado en este entorno.');
      return;
    }
    if (available <= 0) {
      setError('No tienes saldo disponible para retirar.');
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('request_payout', {
        p_amount: available,
        p_method: 'nequi',
        p_account: courier?.profile?.phone ?? '',
        p_account_name: courier?.profile?.full_name ?? '',
      });
      if (rpcError) throw new Error(rpcError.message);
      toast('Retiro solicitado');
      setWallet((w) => ({ ...w, credits: 0 }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header style={S.header}>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
          Ganancias
        </span>
      </header>

      <div className="sc" style={S.scroll}>
        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Disponible */}
        <div style={S.available}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '.05em' }}>
            DISPONIBLE PARA RETIRAR
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 32, marginTop: 6 }}>
            {loading ? '…' : cop(available)}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.55)', marginTop: 4 }}>
            {live
              ? 'Se consigna a la cuenta que registraste'
              : 'Estimado con lo ganado desde el ultimo corte'}
          </div>

          {/* Corte: saber cuando cae la plata es la mitad de la pregunta */}
          <div style={S.cutRow}>
            <span className="ms" style={{ fontSize: 17, color: 'rgba(255,255,255,.5)', flex: 'none' }}>
              event
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,.62)' }}>
              El corte automatico cae el viernes a las 6:00 a. m.
            </span>
          </div>

          <button onClick={withdraw} disabled={busy || available <= 0} style={S.withdraw}>
            <span className="ms" style={{ fontSize: 19 }}>account_balance</span>
            {busy ? 'Enviando…' : 'Retirar ahora'}
          </button>
        </div>

        {/* Rango */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19 }}>
            {RANGES[range].title}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 800 }}>{cop(total)}</span>
        </div>

        <div style={S.tabs}>
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRange(i)}
              style={{
                ...S.tab,
                ...(i === range
                  ? { background: 'var(--surface)', boxShadow: 'var(--shadowSm)' }
                  : { color: 'var(--muted)' }),
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Gráfica */}
        <div style={S.chartCard}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 148 }}>
            {shown.map((d, i) => (
              <div key={i} style={S.barCol}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--muted)' }}>
                  {d.total ? `$${Math.round(d.total / 1000)}k` : '—'}
                </span>
                <span
                  style={{
                    width: '100%', borderRadius: '7px 7px 3px 3px',
                    height: `${Math.max(5, (d.total / chartMax) * 100)}%`,
                    background: d.total === chartMax && d.total > 0
                      ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                      : 'var(--surface2)',
                  }}
                />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--faint)' }}>
                  {DAY_SHORT[d.date.getDay()]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11, marginTop: 14 }}>
          {[
            { label: 'Tarifas de entrega', value: cop(total - tips) },
            { label: 'Propinas', value: cop(tips) },
            { label: 'Entregas', value: String(count) },
            { label: 'Promedio por viaje', value: cop(count ? Math.round(total / count) : 0) },
          ].map((e) => (
            <div key={e.label} style={S.breakCard}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>{e.label}</div>
              <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, marginTop: 7 }}>
                {e.value}
              </div>
            </div>
          ))}
        </div>

        {/* Movimientos */}
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 24 }}>
          Movimientos
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {deliveries.slice(0, 15).map((d) => (
            <div key={d.id} style={S.movement}>
              <span style={S.movIcon}>
                <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>two_wheeler</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>
                  Entrega #{d.order_number}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                  {d.business?.name ?? ''} · {relativeTime(d.delivered_at)}
                </span>
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, flex: 'none' }}>
                +{cop(d.courier_earnings ?? 0)}
              </span>
            </div>
          ))}

          {!loading && deliveries.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Todavía no tienes entregas. Tus movimientos aparecen aquí.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const S = {
  header: { flex: 'none', padding: '18px 20px 10px' },
  scroll: { flex: 1, overflowY: 'auto', padding: '6px 20px 108px', minHeight: 0 },
  cutRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
    paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.12)',
  },
  available: {
    background: 'linear-gradient(135deg,#17140F,#3A332A)', borderRadius: 20, padding: 20, color: '#fff',
  },
  withdraw: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 48, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 14,
    boxShadow: '0 10px 24px rgba(255,68,31,.34)',
  },
  tabs: {
    display: 'flex', background: 'var(--surface2)', borderRadius: 13,
    padding: 4, gap: 4, marginTop: 11,
  },
  tab: { flex: 1, height: 36, borderRadius: 10, fontSize: 12.5, fontWeight: 700 },
  chartCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: '18px 16px', marginTop: 11, boxShadow: 'var(--shadowSm)', overflowX: 'auto',
  },
  barCol: {
    flex: 1, minWidth: 24, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end',
  },
  breakCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: 14, boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  movement: {
    display: 'flex', alignItems: 'center', gap: 13, padding: '14px 0',
    borderBottom: '1px solid var(--border)',
  },
  movIcon: {
    width: 38, height: 38, borderRadius: 11, background: '#FDF0EA', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
