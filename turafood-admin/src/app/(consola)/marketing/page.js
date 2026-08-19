'use client';

/**
 * MARKETING — la cola hacia MailerLite
 *
 * Aquí no se escriben correos: los correos los arma el dueño en
 * MailerLite. Esto es la tubería — quién entró a qué grupo y si el
 * envío salió o se atoró.
 *
 * Vale la pena tener la pantalla precisamente porque la integración
 * puede fallar en silencio: un token vencido no rompe nada visible,
 * simplemente deja de llegarle la bienvenida a la gente. Aquí se ve.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMarketingQueue, getOverview, ago } from '@/lib/admin';
import { Panel, Kpi, Pill, Tabs, Initials, Empty, Skeleton, ErrorNote } from '../../ui';

const TABS = [
  { id: 'pending', label: 'En cola' },
  { id: 'failed', label: 'Fallidos' },
  { id: 'sent', label: 'Enviados' },
  { id: 'skipped', label: 'Omitidos' },
];

const STATUS = {
  pending: { label: 'EN COLA',  bg: '#FFF7E6', color: '#A8730B' },
  sent:    { label: 'ENVIADO',  bg: '#E6F6EE', color: '#0B8E54' },
  failed:  { label: 'FALLÓ',    bg: '#FFF0ED', color: '#C0341A' },
  skipped: { label: 'OMITIDO',  bg: '#F0EEE9', color: '#8C857B' },
};

const KIND = {
  business_registered: 'Se registró',
  business_approved: 'Quedó aprobado',
  plan_requested: 'Pidió un plan',
  plan_activated: 'Le activaron el plan',
  plan_cancelled: 'Canceló el plan',
};

export default function MarketingPage() {
  const [rows, setRows] = useState(null);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('pending');
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    Promise.all([getMarketingQueue(), getOverview()])
      .then(([q, o]) => { setRows(q); setOverview(o); })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(
    () => (rows ?? []).filter((r) => r.status === tab),
    [rows, tab],
  );

  // Si la carga falló, el estado se queda en null y esto mostraba un
  // esqueleto eterno, con el aviso de error debajo del return — o sea
  // invisible. Mejor decir qué pasó.
  if (error && !rows) return <ErrorNote text={error} />;
  if (!rows) return <Skeleton rows={4} height={80} />;

  const counts = Object.fromEntries(
    TABS.map((t) => [t.id, rows.filter((r) => r.status === t.id).length]),
  );

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="En cola" value={String(overview?.marketing?.pendientes ?? counts.pending)}
          icon="schedule_send" tint="#FFF7E6" color="#A8730B"
          note="Salen en el próximo pase"
        />
        <Kpi
          label="Enviados" value={String(overview?.marketing?.enviados ?? counts.sent)}
          icon="mark_email_read" tint="#E6F6EE" color="#0B8E54"
          note="Contactos que entraron a un grupo"
        />
        <Kpi
          label="Fallidos" value={String(overview?.marketing?.fallidos ?? counts.failed)}
          icon="error" tint={counts.failed ? '#FFF0ED' : '#F0EEE9'}
          color={counts.failed ? 'var(--primary)' : 'var(--muted)'}
          note={counts.failed ? 'Revisa el token de MailerLite' : 'Nada atorado'}
          noteColor={counts.failed ? 'var(--primary)' : 'var(--muted)'}
        />
      </div>

      <div style={{ marginTop: 16, marginBottom: 14 }}>
        <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />
      </div>

      <Panel pad={14}>
        {list.length === 0 ? (
          <Empty
            icon="mark_email_read"
            title="Nada en esta pestaña"
            note="La cola se llena sola cuando alguien se registra, se aprueba un negocio o se activa un plan."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map((r) => {
              const st = STATUS[r.status] ?? STATUS.pending;
              return (
                <div key={r.id} style={S.row}>
                  <Initials name={r.full_name ?? r.email ?? '?'} size={38} radius={12} />

                  <span style={{ flex: 1, minWidth: 180 }}>
                    <span style={S.name}>{r.full_name ?? r.email ?? 'Sin nombre'}</span>
                    <span style={S.meta}>
                      {KIND[r.kind] ?? r.kind}
                      {r.email ? ` · ${r.email}` : ''}
                    </span>
                  </span>

                  <span style={S.group}>{r.group_name}</span>

                  <span style={{ flex: 'none', textAlign: 'right' }}>
                    <Pill label={st.label} bg={st.bg} color={st.color} />
                    <span suppressHydrationWarning style={S.when}>
                      {ago(r.sent_at ?? r.created_at)}
                      {r.attempts > 1 ? ` · ${r.attempts} intentos` : ''}
                    </span>
                  </span>

                  {r.last_error && (
                    <span style={S.errorLine}>
                      <span className="ms" style={{ fontSize: 14, verticalAlign: '-2px' }}>info</span>
                      {' '}{r.last_error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div style={S.howto}>
        <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>
          Cómo queda conectado
        </div>
        <ol style={S.steps}>
          <li>
            El token de MailerLite vive en los secrets del proyecto, nunca en el código:
            <code style={S.code}>supabase secrets set MAILERLITE_TOKEN=…</code>
          </li>
          <li>
            La base anota en la cola cuando alguien se registra, se aprueba o activa un plan.
            No llama a MailerLite en ese momento: si estuviera caído, tumbaría la activación.
          </li>
          <li>
            La función <code style={S.code}>mailerlite-sync</code> drena la cola cada pocos minutos,
            crea el grupo si no existe y mete al contacto.
          </li>
          <li>
            En MailerLite armas la automatización sobre ese grupo. El nombre del grupo se ve
            en esta tabla tal cual aparece allá.
          </li>
        </ol>
      </div>
    </>
  );
}

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  row: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    padding: 13, borderRadius: 16, background: 'var(--bg)',
  },
  name: {
    display: 'block', fontSize: 13.5, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 },
  group: {
    flex: 'none', maxWidth: 300, fontSize: 11.5, fontWeight: 700, color: 'var(--blue)',
    background: '#EAF1FF', borderRadius: 9, padding: '5px 10px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  when: { display: 'block', fontSize: 10.5, color: 'var(--faint)', marginTop: 5 },
  errorLine: {
    width: '100%', fontSize: 11.5, color: '#C0341A', lineHeight: 1.5,
    paddingTop: 9, borderTop: '1px solid var(--border)',
  },

  howto: {
    marginTop: 16, padding: 18, borderRadius: 20,
    background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)',
  },
  steps: {
    margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8,
    fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)',
  },
  code: {
    background: 'var(--surface2)', borderRadius: 6, padding: '2px 6px',
    fontSize: 11.5, margin: '0 3px', color: 'var(--text)',
  },
};
