'use client';

/**
 * SERVICIOS Y PLANES — Growth Partner
 *
 * La app es gratis; esto es lo que se cobra. Cada fila es un negocio
 * que pidió algo (ficha de Google, campañas, agente de voz, reservas)
 * y está esperando que alguien se lo monte.
 *
 * Pasar una solicitud a "Activo" es lo que dispara la secuencia de
 * correos en MailerLite: el trigger de la base escribe en la cola y la
 * función `mailerlite-sync` la drena. Por eso el botón dice qué va a
 * pasar, no solo "activar".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getServiceRequests, setServiceStatus,
  SERVICE_STATUS, SERVICE_KIND, ago,
} from '@/lib/admin';
import { Panel, Kpi, Pill, Tabs, Initials, Empty, Skeleton, ErrorNote, ReasonDialog } from '../../ui';

const TABS = [
  { id: 'submitted', label: 'Por revisar' },
  { id: 'in_progress', label: 'Montando' },
  { id: 'active', label: 'Activos' },
  { id: 'todos', label: 'Todos' },
];

const KIND_ICON = {
  gmb: 'travel_explore', google_ads: 'campaign', voice_agent: 'support_agent',
  booking: 'event_available', website: 'language', custom_app: 'phone_iphone', other: 'more_horiz',
};

export default function ServiciosPage() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('submitted');
  const [busy, setBusy] = useState(null);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    getServiceRequests().then(setRows).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(
    () => (rows ?? []).filter((r) => tab === 'todos' || r.status === tab),
    [rows, tab],
  );

  const move = async (request, status, notes = null) => {
    setBusy(request.id);
    setError(null);
    try {
      await setServiceStatus(request.id, status, notes);
      setTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return <Skeleton rows={4} height={92} />;

  const counts = Object.fromEntries(TABS.map((t) => [
    t.id, t.id === 'todos' ? rows.length : rows.filter((r) => r.status === t.id).length,
  ]));

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="Por revisar" value={String(counts.submitted)}
          icon="inbox" tint="#FFF7E6" color="#A8730B"
          note="Solicitudes que nadie ha tomado"
        />
        <Kpi
          label="En montaje" value={String(counts.in_progress)}
          icon="build" tint="#EAF1FF" color="var(--blue)"
          note="El equipo está trabajando en esto"
        />
        <Kpi
          label="Funcionando" value={String(counts.active)}
          icon="rocket_launch" tint="#E6F6EE" color="#0B8E54"
          note="Ya reciben su secuencia de correos"
        />
      </div>

      <div style={{ marginTop: 16, marginBottom: 14 }}>
        <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />
      </div>

      <Panel pad={14}>
        {list.length === 0 ? (
          <Empty
            icon="rocket_launch"
            title="Nada en esta pestaña"
            note="Las solicitudes llegan desde la sección de Crecimiento del panel del negocio."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {list.map((r) => {
              const st = SERVICE_STATUS[r.status];
              const working = busy === r.id;
              return (
                <div key={r.id} style={S.card}>
                  <span style={S.kindIcon}>
                    <span className="ms" style={{ fontSize: 21, color: 'var(--primary)' }}>
                      {KIND_ICON[r.kind] ?? 'more_horiz'}
                    </span>
                  </span>

                  <span style={{ flex: 1, minWidth: 200 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{SERVICE_KIND[r.kind] ?? r.kind}</span>
                      <Pill label={st.label} bg={st.bg} color={st.color} />
                    </span>
                    <span style={S.meta}>
                      {r.business_name}
                      {r.payload?.plan ? ` · plan ${r.payload.plan}` : ' · sin plan elegido'}
                      {' · '}
                      <span suppressHydrationWarning>{ago(r.submitted_at ?? r.created_at)}</span>
                    </span>
                  </span>

                  <span style={{ display: 'flex', gap: 7, flex: 'none', flexWrap: 'wrap' }}>
                    {r.status === 'submitted' && (
                      <button onClick={() => move(r, 'in_progress')} disabled={working} style={S.btnBlue}>
                        Tomar y montar
                      </button>
                    )}
                    {r.status === 'in_progress' && (
                      <button
                        onClick={() => move(r, 'active')}
                        disabled={working}
                        style={S.btnGreen}
                        title="Activa el servicio y le manda la secuencia de correos"
                      >
                        <span className="ms" style={{ fontSize: 16 }}>send</span>
                        {working ? 'Activando…' : 'Activar y avisar'}
                      </button>
                    )}
                    {['submitted', 'in_progress'].includes(r.status) && (
                      <button onClick={() => setTarget(r)} disabled={working} style={S.btnGhost}>
                        Rechazar
                      </button>
                    )}
                  </span>

                  {r.team_notes && (
                    <span style={S.notes}>
                      <span className="ms" style={{ fontSize: 14, verticalAlign: '-2px' }}>sticky_note_2</span>
                      {' '}{r.team_notes}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <p style={S.footnote}>
        Al pasar una solicitud a <strong>Activo</strong> la base encola el correo y la función
        <code style={S.code}>mailerlite-sync</code> mete al negocio en el grupo del plan.
        Puedes ver cómo va en Marketing.
      </p>

      <ReasonDialog
        open={Boolean(target)}
        busy={Boolean(busy)}
        title="Rechazar la solicitud"
        note="Escribe qué falta o por qué no se puede montar. El negocio lo ve en su panel."
        confirmLabel="Enviar rechazo"
        onCancel={() => setTarget(null)}
        onConfirm={(reason) => move(target, 'rejected', reason)}
      />
    </>
  );
}

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  card: {
    display: 'flex', alignItems: 'center', gap: 13, flexWrap: 'wrap',
    padding: 14, borderRadius: 18, background: 'var(--bg)',
  },
  kindIcon: {
    width: 44, height: 44, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#FFF0ED',
  },
  meta: { display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 4 },
  btnBlue: {
    height: 36, padding: '0 15px', borderRadius: 999,
    background: '#EAF1FF', color: 'var(--blue)', fontSize: 12.5, fontWeight: 700,
  },
  btnGreen: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    height: 36, padding: '0 15px', borderRadius: 999,
    background: 'var(--green)', color: '#fff', fontSize: 12.5, fontWeight: 700,
  },
  btnGhost: {
    height: 36, padding: '0 15px', borderRadius: 999,
    border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
  },
  notes: {
    width: '100%', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5,
    paddingTop: 10, borderTop: '1px solid var(--border)',
  },
  footnote: {
    margin: '14px 2px 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.6,
  },
  code: {
    background: 'var(--surface2)', borderRadius: 6, padding: '2px 6px',
    fontSize: 11.5, margin: '0 3px',
  },
};
