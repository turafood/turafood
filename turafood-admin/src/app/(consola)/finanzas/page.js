'use client';

/**
 * FINANZAS
 *
 * El corte semanal: cuánto vendió cada negocio, cuánto se quedó
 * TuraFood y cuánto hay que consignarle.
 *
 * "Ejecutar corte" está deshabilitado a propósito mientras no exista
 * la función que mueve la plata de verdad. Un botón que parece que
 * paga y no paga es la peor pantalla posible en una sección de dinero.
 */

import { useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { getPayoutCut, getOverview, millions } from '@/lib/admin';
import { Panel, Kpi, HeroCard, Pill, Initials, Empty, Skeleton, ErrorNote } from '../../ui';

const CUT_STATE = {
  lista:    { label: 'LISTA',    bg: '#E6F6EE', color: '#0B8E54' },
  revisar:  { label: 'REVISAR',  bg: '#FFF7E6', color: '#A8730B' },
  retenida: { label: 'RETENIDA', bg: '#FFF0ED', color: '#C0341A' },
};

export default function FinanzasPage() {
  const [cut, setCut] = useState(null);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getPayoutCut(), getOverview()])
      .then(([c, o]) => { setCut(c); setOverview(o); })
      .catch((err) => setError(err.message));
  }, []);

  if (!cut) return <Skeleton rows={4} height={92} />;

  const totalNet = cut.reduce((a, b) => a + b.net, 0);
  const totalFee = cut.reduce((a, b) => a + b.fee, 0);
  const totalGross = cut.reduce((a, b) => a + b.gross, 0);
  const ready = cut.filter((b) => b.state === 'lista');
  const rate = totalGross ? ((totalFee / totalGross) * 100).toFixed(1).replace('.', ',') : '0';

  const exportCsv = () => {
    const head = 'Negocio;Pedidos;Bruto;Comision;A pagar;Estado';
    const rows = cut.map((b) => [b.name, b.orders, b.gross, b.fee, b.net, b.state].join(';'));
    const blob = new Blob([`﻿${[head, ...rows].join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `turafood-corte-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="GMV del mes" value={millions(overview?.plata?.bruto_mes ?? totalGross)}
          icon="trending_up" tint="#EAF1FF" color="var(--blue)"
          note="Todo lo que se transó"
        />
        <HeroCard
          label="INGRESO TURAFOOD"
          value={millions(overview?.plata?.comision_mes ?? totalFee)}
          delta={`${rate}%`}
          stats={[
            { label: 'COMISIÓN PROM.', value: `${rate}%` },
            { label: 'NEGOCIOS', value: String(cut.length) },
          ]}
        />
        <Kpi
          label="Por consignar el viernes" value={millions(totalNet)}
          icon="account_balance" tint="#E6F6EE" color="#0B8E54"
          note={`${ready.length} negocios listos en el corte`}
        />
        <Kpi
          label="Retenido" value={millions(cut.filter((b) => b.state === 'retenida').reduce((a, b) => a + b.net, 0))}
          icon="pause_circle" tint="#FFF0ED" color="var(--primary)"
          note="A la espera de resolver disputas"
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Panel
          title="Liquidaciones a negocios"
          sub="El corte se ejecuta los viernes a las 6:00 a. m."
          right={
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={exportCsv} style={S.ghost}>
                <span className="ms" style={{ fontSize: 17 }}>download</span>
                Exportar CSV
              </button>
              <button disabled style={S.runBtn} title="Falta la función que mueve la plata">
                <span className="ms" style={{ fontSize: 17 }}>bolt</span>
                Ejecutar corte
              </button>
            </div>
          }
          pad={18}
        >
          {cut.length === 0 ? (
            <Empty icon="account_balance" title="Sin ventas en el periodo" note="El corte se arma con los pedidos entregados de la semana." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ ...S.row, ...S.head }}>
                <span>NEGOCIO</span><span>PEDIDOS</span><span>BRUTO</span>
                <span>COMISIÓN</span><span>A PAGAR</span>
                <span style={{ textAlign: 'right' }}>ESTADO</span>
              </div>

              {cut.map((b) => {
                const st = CUT_STATE[b.state] ?? CUT_STATE.lista;
                return (
                  <div key={b.id} style={S.row} className="adm-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <Initials name={b.name} size={32} radius={10} />
                      <span style={S.name}>{b.name}</span>
                    </span>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{b.orders}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{millions(b.gross)}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--green)' }}>{cop(b.fee)}</span>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{cop(b.net)}</span>
                    <span style={{ textAlign: 'right' }}>
                      <Pill label={st.label} bg={st.bg} color={st.color} />
                    </span>
                  </div>
                );
              })}

              <div style={{ ...S.row, ...S.total }}>
                <span style={{ fontWeight: 800, fontSize: 13 }}>Total del corte</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {cut.reduce((a, b) => a + b.orders, 0)}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{millions(totalGross)}</span>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--green)' }}>{cop(totalFee)}</span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{cop(totalNet)}</span>
                <span />
              </div>
            </div>
          )}

          <p style={S.pending}>
            <span className="ms" style={{ fontSize: 15, verticalAlign: '-2px' }}>info</span>
            {' '}El botón de ejecutar el corte está apagado mientras no exista la función
            que mueve la plata de verdad. Prefiero un botón que no se puede tocar a uno
            que parece que paga y no paga.
          </p>
        </Panel>
      </div>
    </>
  );
}

const GRID = 'minmax(180px,2fr) 90px 100px 110px 120px 110px';

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 760, padding: '12px 0', borderBottom: '1px solid var(--border)',
  },
  head: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' },
  total: { borderBottom: 'none', borderTop: '2px solid var(--text)', marginTop: 4 },
  name: {
    fontSize: 13, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  ghost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 15px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
  },
  runBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px',
    borderRadius: 999, background: 'var(--surface2)', color: 'var(--faint)',
    fontSize: 12.5, fontWeight: 700, cursor: 'not-allowed',
  },
  pending: { margin: '16px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 },
};
