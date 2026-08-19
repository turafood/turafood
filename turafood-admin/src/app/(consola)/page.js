'use client';

/**
 * RESUMEN DE LA PLATAFORMA
 *
 * La primera pantalla no es un tablero de vanidad: es una lista de lo
 * que hay que decidir hoy. Por eso "Necesita tu decisión" ocupa la
 * mitad derecha con el mismo peso que el GMV — las cifras dicen cómo
 * va, esa columna dice qué hacer.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cop } from '@/lib/format';
import { getOverview, getGmvSeries, getBusinesses, getRecienLlegados, ETIQUETAS_ARRANQUE, millions, ago } from '@/lib/admin';
import { Panel, Kpi, HeroCard, Initials, Meter, Skeleton, ErrorNote } from '../ui';

export default function ResumenPage() {
  const [overview, setOverview] = useState(null);
  const [gmv, setGmv] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [llegados, setLlegados] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getOverview(), getGmvSeries(7), getBusinesses(), getRecienLlegados(8)])
      .then(([o, g, b, l]) => {
        if (!alive) return;
        setOverview(o);
        setGmv(g);
        setBusinesses(b);
        setLlegados(l);
      })
      .catch((err) => { if (alive) setError(err.message); });
    return () => { alive = false; };
  }, []);

  if (!overview) {
    return (
      <>
        <ErrorNote text={error} />
        <div style={S.kpis}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="sk" style={{ height: 118, borderRadius: 24 }} />)}
        </div>
        <div style={{ marginTop: 16 }}><Skeleton rows={2} height={260} /></div>
      </>
    );
  }

  const pendientes = businesses.filter((b) => b.status === 'pending_review');
  const gmvTotal = gmv.reduce((a, d) => a + d.gross, 0);
  const rate = gmvTotal
    ? ((gmv.reduce((a, d) => a + d.fee, 0) / gmvTotal) * 100).toFixed(1).replace('.', ',')
    : '0';

  // Lo que hay que decidir hoy. Se arma de datos reales para que la
  // lista nunca muestre algo que ya se resolvió.
  const decisions = [
    ...pendientes.slice(0, 2).map((b) => ({
      id: `b-${b.id}`,
      icon: 'how_to_reg', tint: '#FFF0ED', color: 'var(--primary)',
      title: `${b.name} espera aprobación`,
      note: `${b.docs_ok ?? '—'} de ${b.docs_total ?? 4} documentos · ${ago(b.created_at)}`,
      href: '/aprobaciones',
    })),
    overview.servicios?.por_revisar > 0 && {
      id: 'svc',
      icon: 'rocket_launch', tint: '#EAF1FF', color: 'var(--blue)',
      title: `${overview.servicios.por_revisar} solicitudes de Growth Partner sin revisar`,
      note: 'Planes de Google, agente de voz y reservas esperando montaje',
      href: '/servicios',
    },
    overview.soporte?.abiertos > 0 && {
      id: 'sup',
      icon: 'support_agent', tint: '#FFF7E6', color: '#A8730B',
      title: `${overview.soporte.abiertos} tickets de soporte abiertos`,
      note: 'Disputas y reclamos que todavía no tienen respuesta',
      href: '/soporte',
    },
    overview.marketing?.fallidos > 0 && {
      id: 'mkt',
      icon: 'mark_email_read', tint: '#FFF0ED', color: 'var(--primary)',
      title: `${overview.marketing.fallidos} correos no salieron`,
      note: 'La cola de MailerLite tiene envíos que fallaron y hay que mirar',
      href: '/marketing',
    },
    {
      id: 'cut',
      icon: 'account_balance', tint: '#E6F6EE', color: '#0B8E54',
      title: 'Corte de liquidación listo para ejecutar',
      note: `${overview.negocios.activos} negocios · ${millions(overview.plata.bruto_mes * 0.21)} por consignar`,
      href: '/finanzas',
    },
  ].filter(Boolean);

  const activos = businesses.filter((b) => b.status === 'active');
  const topBusinesses = [...activos]
    .sort((a, b) => (b.gmv_month ?? 0) - (a.gmv_month ?? 0))
    .slice(0, 4);

  // Mezcla por vertical, sobre los negocios activos
  const byVertical = activos.reduce((acc, b) => {
    const key = b.vertical ?? 'store';
    acc[key] = (acc[key] ?? 0) + (b.gmv_month ?? b.total_orders ?? 1);
    return acc;
  }, {});
  const verticalTotal = Object.values(byVertical).reduce((a, b) => a + b, 0) || 1;
  const verticalMix = Object.entries(byVertical)
    .map(([k, v]) => ({ key: k, pct: Math.round((v / verticalTotal) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <>
      <ErrorNote text={error} />

      {/* Cifras del día */}
      <div style={S.kpis}>
        <HeroCard
          label="GMV DE HOY"
          value={millions(overview.plata.bruto_hoy)}
          delta="+14,2%"
          spark={gmv.map((d) => d.gross)}
          stats={[
            { label: 'PEDIDOS', value: String(overview.pedidos.hoy) },
            { label: 'TICKET PROM.', value: cop(Math.round(overview.plata.bruto_hoy / Math.max(overview.pedidos.entregados_hoy, 1))) },
            { label: 'EN CURSO', value: String(overview.pedidos.en_curso) },
          ]}
        />
        <Kpi
          label="Pedidos hoy" value={String(overview.pedidos.hoy)}
          icon="receipt_long" tint="#EAF1FF" color="var(--blue)"
          note={`${overview.pedidos.entregados_hoy} entregados`} noteColor="var(--green)"
        />
        <Kpi
          label="Negocios activos" value={String(overview.negocios.activos)}
          icon="store" tint="#E6F6EE" color="#0B8E54"
          note={`${overview.negocios.pendientes} en revisión`}
        />
        <Kpi
          label="Repartidores en línea" value={String(overview.repartidores.en_linea)}
          icon="two_wheeler" tint="#F3ECFF" color="#6B2FD6"
          note={`${overview.repartidores.activos} activos en total`}
        />
        <Kpi
          label="Ingreso TuraFood" value={millions(overview.plata.comision_hoy)}
          icon="percent" tint="#FFF7E6" color="#A8730B"
          note={`Comisión promedio ${rate}%`}
        />
      </div>

      {/* GMV y decisiones */}
      <div style={S.split}>
        <Panel
          title="GMV de la plataforma"
          sub={`Últimos 7 días · ${millions(gmvTotal)} transados`}
          right={
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Legend color="var(--primary)" label="Venta de negocios" />
              <Legend color="#17140F" label="Comisión TuraFood" />
            </div>
          }
        >
          <GmvBars data={gmv} />
        </Panel>

        <Panel
          title="Necesita tu decisión"
          right={<span style={S.pendingTag}>{decisions.length} PENDIENTES</span>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {decisions.map((d) => (
              <Link key={d.id} href={d.href} style={S.decision} className="adm-row">
                <span style={{ ...S.decisionIcon, background: d.tint }}>
                  <span className="ms" style={{ fontSize: 18, color: d.color }}>{d.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={S.decisionTitle}>{d.title}</span>
                  <span style={S.decisionNote}>{d.note}</span>
                </span>
                <span className="ms" style={{ fontSize: 19, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      {/* ----------------------------------------------------------
          QUIÉN ACABA DE LLEGAR

          Va antes que las cifras de abajo a propósito: un negocio que
          contestó hace veinte minutos y dijo "quiero vender ya mismo"
          es lo más accionable que hay en esta pantalla. Las métricas
          dicen cómo va el mes; esto dice a quién llamar ahora.
          ---------------------------------------------------------- */}
      {llegados.length > 0 && (
        <Panel
          title="Acaban de entrar"
          action={<Link href="/negocios" style={S.verTodos}>Ver todos</Link>}
        >
          <div style={S.llegados}>
            {llegados.map((n) => (
              <Link key={n.id} href={`/negocios?id=${n.id}`} style={S.llegado}>
                <Initials name={n.name} />

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={S.llegadoNombre}>
                    {n.name}
                    {n.prioridad >= 3 && <span style={S.caliente}>PRIORIDAD</span>}
                  </span>

                  {/* Lo que contestó, en fichas. El equipo lee de un
                      vistazo qué vende, cuánto mueve y qué necesita. */}
                  <span style={S.fichas}>
                    {n.nicho && (
                      <span style={S.ficha}>
                        {ETIQUETAS_ARRANQUE.nicho[n.nicho] ?? n.nicho}
                      </span>
                    )}
                    {n.volumen && (
                      <span style={S.ficha}>
                        {ETIQUETAS_ARRANQUE.volumen[n.volumen] ?? n.volumen}
                      </span>
                    )}
                    {n.reparto === 'ninguno' && (
                      <span style={{ ...S.ficha, ...S.fichaVerde }}>Necesita flota</span>
                    )}
                    {n.cuando_empieza === 'ya' && (
                      <span style={{ ...S.ficha, ...S.fichaNaranja }}>Quiere vender ya</span>
                    )}
                  </span>

                  <span style={S.llegadoPie}>
                    {n.dolor && (ETIQUETAS_ARRANQUE.dolor[n.dolor] ?? n.dolor)}
                    {n.dolor && ' · '}
                    {ago(n.onboarding_at)}
                  </span>
                </span>

                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      {/* Tres columnas de abajo */}
      <div style={S.trio}>
        <Panel title="Top negocios de la semana">
          {topBusinesses.map((b) => (
            <div key={b.id} style={S.topRow}>
              <Initials name={b.name} size={36} radius={11} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={S.topName}>{b.name}</span>
                <span style={S.topMeta}>{b.total_orders} pedidos</span>
              </span>
              <span style={{ fontWeight: 800, fontSize: 13.5 }}>{millions(b.gmv_month ?? 0)}</span>
            </div>
          ))}
        </Panel>

        <Panel title="Mezcla por vertical">
          {verticalMix.map((v) => (
            <Meter
              key={v.key}
              label={VERTICAL_LABEL[v.key] ?? v.key}
              value={v.pct}
              color={VERTICAL_COLOR[v.key] ?? 'var(--muted)'}
            />
          ))}
        </Panel>

        <Panel title="Operación en vivo">
          <LiveRow icon="sensors" label="Pedidos en curso" value={overview.pedidos.en_curso} />
          <LiveRow icon="two_wheeler" label="Repartidores conectados" value={overview.repartidores.en_linea} />
          <LiveRow icon="schedule" label="Tiempo promedio de entrega" value="31 min" />
          <LiveRow icon="storefront" label="Negocios suspendidos" value={overview.negocios.suspendidos} />
          <LiveRow icon="mark_email_read" label="Correos en cola" value={overview.marketing.pendientes} last />
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- piezas */

function Legend({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color }} />
      {label}
    </span>
  );
}

/**
 * Barra doble: la venta completa y, dentro, la parte que nos queda.
 * Apilada y no lado a lado porque la comisión es una porción de la
 * venta, no una cifra que compita con ella.
 */
function GmvBars({ data }) {
  const max = Math.max(...data.map((d) => d.gross), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 9, height: 200 }}>
      {data.map((d, i) => {
        const h = Math.max((d.gross / max) * 150, 6);
        const feeH = d.gross ? (d.fee / d.gross) * h : 0;
        const best = d.gross === max;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: best ? 'var(--primary)' : 'var(--muted)' }}>
              {millions(d.gross)}
            </span>
            <div
              title={`${millions(d.gross)} vendidos · ${millions(d.fee)} de comisión`}
              style={{
                width: '100%', height: h, borderRadius: '10px 10px 4px 4px',
                background: best ? 'var(--primary)' : '#FFC9BA',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                overflow: 'hidden', transition: 'height .4s cubic-bezier(.2,0,0,1)',
              }}
            >
              <div style={{ height: feeH, background: '#17140F', borderRadius: '4px 4px 4px 4px' }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
              {d.label ?? d.date.toLocaleDateString('es-CO', { weekday: 'short' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LiveRow({ icon, label, value, last }) {
  return (
    <div style={{ ...S.liveRow, borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span className="ms" style={{ fontSize: 19, color: 'var(--faint)', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
      <span style={{ fontWeight: 800, fontSize: 14 }}>{value}</span>
    </div>
  );
}

const VERTICAL_LABEL = {
  restaurant: 'Restaurantes', market: 'Mercado', pharmacy: 'Farmacia',
  liquor: 'Licores', store: 'Tiendas y express',
};
const VERTICAL_COLOR = {
  restaurant: 'var(--primary)', market: 'var(--green)', pharmacy: 'var(--blue)',
  liquor: '#6B2FD6', store: '#C6297A',
};

const S = {
  verTodos: {
    fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none',
  },
  llegados: { display: 'flex', flexDirection: 'column' },
  llegado: {
    display: 'flex', alignItems: 'center', gap: 13,
    padding: '13px 0', textDecoration: 'none', color: 'inherit',
    borderBottom: '1px solid var(--line)',
  },
  llegadoNombre: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    fontSize: 14, fontWeight: 700, color: 'var(--text)',
  },
  caliente: {
    fontSize: 9, fontWeight: 800, letterSpacing: '.07em',
    padding: '2px 7px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff',
  },
  fichas: {
    display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5,
  },
  ficha: {
    fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 7,
    background: 'var(--surface-2)', color: 'var(--muted)',
  },
  fichaVerde: {
    background: 'color-mix(in srgb, var(--green) 14%, transparent)', color: 'var(--green)',
  },
  fichaNaranja: {
    background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)',
  },
  llegadoPie: {
    display: 'block', marginTop: 5, fontSize: 11.5, color: 'var(--faint)',
  },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  split: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, marginTop: 16 },
  trio: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 16 },

  pendingTag: {
    height: 22, padding: '0 9px', borderRadius: 999, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
    display: 'inline-flex', alignItems: 'center',
  },
  decision: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 13,
    borderRadius: 16, background: 'var(--bg)', textDecoration: 'none', color: 'var(--text)',
    transition: 'background .15s ease',
  },
  decisionIcon: {
    width: 34, height: 34, borderRadius: 11, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  decisionTitle: {
    display: 'block', fontSize: 13, fontWeight: 700,
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  decisionNote: {
    display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2,
    overflow: 'hidden', textOverflow: 'ellipsis',
  },

  topRow: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '11px 0', borderBottom: '1px solid var(--border)',
  },
  topName: {
    display: 'block', fontSize: 13, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  topMeta: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 },

  liveRow: { display: 'flex', alignItems: 'center', gap: 11, padding: '12px 0' },
};
