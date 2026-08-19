'use client';

/**
 * OPERACIÓN EN VIVO
 *
 * Lo que está pasando ahora mismo. Se refresca solo cada 20 segundos:
 * quien tiene esta pantalla abierta la deja en una esquina y la mira
 * de reojo, no la va a recargar a mano.
 */

import { useCallback, useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { getLiveOrders, getFleet, getOverview, ORDER_STATUS, ago } from '@/lib/admin';
import { Panel, Kpi, Pill, Initials, Empty, Skeleton, ErrorNote } from '../../ui';

const REFRESH_MS = 20000;

const FLEET_STATE = {
  en_ruta:   { label: 'EN RUTA',   bg: '#EAF1FF', color: '#2E6BFF' },
  retrasado: { label: 'RETRASADO', bg: '#FFF0ED', color: '#C0341A' },
  libre:     { label: 'LIBRE',     bg: '#E6F6EE', color: '#0B8E54' },
};

export default function OperacionPage() {
  const [orders, setOrders] = useState(null);
  const [fleet, setFleet] = useState([]);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const [o, f, ov] = await Promise.all([getLiveOrders(), getFleet(), getOverview()]);
      setOrders(o);
      setFleet(f);
      setOverview(ov);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  // Si la carga falló, `orders` se queda en null para siempre. Sin
  // esto la pantalla mostraba un esqueleto eterno y el aviso de error
  // quedaba debajo del return, o sea invisible: una consola en blanco
  // sin una sola pista de por qué.
  if (error && !orders) return <ErrorNote text={error} />;
  if (!orders) return <Skeleton rows={4} height={92} />;

  const late = orders.filter((o) => Date.now() - new Date(o.created_at).getTime() > 45 * 60000);
  const waiting = orders.filter((o) => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status));
  const busy = fleet.filter((f) => f.state === 'en_ruta').length;

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="Pedidos en curso" value={String(orders.length)}
          icon="sensors" tint="#EAF1FF" color="var(--blue)"
          note={`${waiting.length} esperando repartidor`}
        />
        <Kpi
          label="Entrega promedio" value="31 min"
          icon="schedule" tint="#E6F6EE" color="#0B8E54"
          note="Meta: 35 min" noteColor="var(--green)"
        />
        <Kpi
          label="Repartidores conectados" value={String(fleet.length)}
          icon="two_wheeler" tint="#F3ECFF" color="#6B2FD6"
          note={`${busy} en ruta ahora`}
        />
        <Kpi
          label="Pedidos demorados" value={String(late.length)}
          icon="warning" tint={late.length ? '#FFF0ED' : '#E6F6EE'}
          color={late.length ? 'var(--primary)' : '#0B8E54'}
          note={late.length ? 'Llevan más de 45 minutos' : 'Todo dentro de tiempo'}
          noteColor={late.length ? 'var(--primary)' : 'var(--green)'}
        />
      </div>

      <div style={S.split}>
        <Panel
          title="Pedidos activos ahora"
          sub={updatedAt ? `Actualizado ${updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : null}
          right={<span style={S.count}>{orders.length} EN CURSO</span>}
        >
          {orders.length === 0 ? (
            <Empty icon="inbox" title="Nada en curso" note="Cuando entre un pedido aparece aquí sin recargar." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ ...S.row, ...S.head }}>
                <span>PEDIDO</span><span>NEGOCIO</span><span>CLIENTE</span>
                <span>VALOR</span><span style={{ textAlign: 'right' }}>ESTADO</span>
              </div>
              {orders.map((o) => {
                const st = ORDER_STATUS[o.status] ?? { label: o.status, color: 'var(--muted)' };
                const isLate = Date.now() - new Date(o.created_at).getTime() > 45 * 60000;
                return (
                  <div key={o.id} style={S.row} className="adm-row">
                    <span style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--primary)' }}>
                      {o.order_number}
                    </span>
                    <span style={S.cell}>{o.business_name}</span>
                    <span style={{ ...S.cell, color: 'var(--muted)' }}>{o.customer_name}</span>
                    <span style={{ fontWeight: 700, fontSize: 12.5 }}>{cop(o.total)}</span>
                    <span style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color }}>{st.label}</span>
                      <span
                        suppressHydrationWarning
                        style={{ display: 'block', fontSize: 10.5, color: isLate ? 'var(--primary)' : 'var(--faint)', marginTop: 2 }}
                      >
                        {ago(o.created_at)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Flota" sub={`${fleet.length} conectados`}>
            {fleet.length === 0 ? (
              <Empty icon="two_wheeler" title="Nadie conectado" note="Los repartidores aparecen al ponerse en línea." />
            ) : fleet.map((f) => {
              const st = FLEET_STATE[f.state] ?? FLEET_STATE.libre;
              return (
                <div key={f.id} style={S.fleetRow}>
                  <Initials name={f.name} size={34} radius={17} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={S.fleetName}>{f.name}</span>
                    <span style={S.fleetMeta}>
                      {f.vehicle === 'bicycle' ? 'Bicicleta'
                        : f.vehicle === 'car' ? `Carro ${f.plate ?? ''}`
                        : `Moto ${f.plate ?? ''}`}
                      {f.rating ? ` · ${String(f.rating).replace('.', ',')}` : ''}
                    </span>
                  </span>
                  <Pill label={st.label} bg={st.bg} color={st.color} />
                </div>
              );
            })}
          </Panel>

          {overview && (
            <Panel title="Alertas">
              <Alert
                on={late.length > 0}
                icon="schedule"
                text={late.length
                  ? `${late.length} pedidos llevan más de 45 minutos`
                  : 'Ningún pedido demorado'}
              />
              <Alert
                on={overview.negocios.pendientes > 0}
                icon="how_to_reg"
                text={`${overview.negocios.pendientes} negocios esperando aprobación`}
              />
              <Alert
                on={overview.soporte.abiertos > 0}
                icon="support_agent"
                text={`${overview.soporte.abiertos} tickets de soporte sin responder`}
              />
              <Alert
                on={overview.marketing.fallidos > 0}
                icon="mark_email_read"
                text={overview.marketing.fallidos
                  ? `${overview.marketing.fallidos} correos no salieron`
                  : 'La cola de correos está al día'}
                last
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Alert({ on, icon, text, last }) {
  return (
    <div style={{ ...S.alertRow, borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <span
        className="ms"
        style={{ fontSize: 18, flex: 'none', color: on ? 'var(--primary)' : 'var(--green)' }}
      >
        {on ? icon : 'check_circle'}
      </span>
      <span style={{ flex: 1, fontSize: 12.5, fontWeight: on ? 700 : 400 }}>{text}</span>
    </div>
  );
}

const GRID = '90px minmax(140px,1.4fr) minmax(120px,1fr) 100px 150px';

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(260px,1fr)', gap: 16, marginTop: 16, alignItems: 'start' },
  count: {
    height: 22, padding: '0 9px', borderRadius: 999, background: 'var(--bg)',
    color: 'var(--muted)', fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
    display: 'inline-flex', alignItems: 'center',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 620, padding: '11px 0', borderBottom: '1px solid var(--border)',
  },
  head: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' },
  cell: {
    fontSize: 12.5, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  fleetRow: {
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '10px 0', borderBottom: '1px solid var(--border)',
  },
  fleetName: {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  fleetMeta: { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 1 },
  alertRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0' },
};
