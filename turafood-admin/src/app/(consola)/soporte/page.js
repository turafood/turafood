'use client';

/**
 * SOPORTE Y DISPUTAS
 *
 * Los tickets a la izquierda con su acción sugerida al lado; a la
 * derecha los indicadores del día y el registro de auditoría.
 *
 * La acción viene sugerida a propósito: "Reembolsar" o "Reasignar"
 * dicho de una vez ahorra que cada persona del equipo decida distinto
 * frente al mismo tipo de reclamo.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import { getTickets, AUDIT_LOG, ago } from '@/lib/admin';
import { Panel, Kpi, Pill, Tabs, Meter, Empty, Skeleton, ErrorNote } from '../../ui';

/**
 * Las cinco pestañas son los cinco estados que acepta la base. Antes
 * había tres, así que los tickets en proceso o ya resueltos no
 * aparecían en ninguna: quedaban invisibles sin que nadie lo notara.
 */
const TABS = [
  { id: 'open', label: 'Abiertos' },
  { id: 'in_progress', label: 'En proceso' },
  { id: 'waiting', label: 'Esperando al negocio' },
  { id: 'resolved', label: 'Resueltos' },
  { id: 'closed', label: 'Cerrados' },
];

/**
 * Claves de la base, no del idioma. `support_tickets.priority` solo
 * acepta urgent, high, normal o low; con las claves en español ningún
 * ticket real encontraba su etiqueta y todos salían como "BAJA".
 */
const PRIORITY = {
  urgent: { label: 'URGENTE', bg: '#FFF0ED', color: '#C0341A' },
  high:   { label: 'ALTA',    bg: '#FFF0ED', color: '#C0341A' },
  normal: { label: 'MEDIA',   bg: '#FFF7E6', color: '#A8730B' },
  low:    { label: 'BAJA',    bg: '#F0EEE9', color: '#8C857B' },
};

/** Las siete categorías que acepta `support_tickets.category` */
const CATEGORY_ICON = {
  orders: 'receipt_long', payouts: 'account_balance', account: 'person',
  catalog: 'restaurant_menu', growth: 'rocket_launch',
  technical: 'bug_report', other: 'flag',
};

export default function SoportePage() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('open');
  const [error, setError] = useState(null);

  useEffect(() => {
    getTickets().then(setRows).catch((err) => setError(err.message));
  }, []);

  const list = useMemo(() => (rows ?? []).filter((t) => t.status === tab), [rows, tab]);

  // Si la carga falló, el estado se queda en null y esto mostraba un
  // esqueleto eterno, con el aviso de error debajo del return — o sea
  // invisible. Mejor decir qué pasó.
  if (error && !rows) return <ErrorNote text={error} />;
  if (!rows) return <Skeleton rows={4} height={92} />;

  const counts = Object.fromEntries(
    TABS.map((t) => [t.id, rows.filter((r) => r.status === t.id).length]),
  );
  const high = rows.filter((t) => t.status === 'open' && ['high', 'urgent'].includes(t.priority)).length;

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="Tickets abiertos" value={String(counts.open)}
          icon="confirmation_number" tint="#FFF0ED" color="var(--primary)"
          note={high ? `${high} de prioridad alta` : 'Ninguno urgente'}
          noteColor={high ? 'var(--primary)' : 'var(--green)'}
        />
        <Kpi
          label="Disputas activas" value="2"
          icon="gavel" tint="#FFF7E6" color="#A8730B"
          note="Reclamos con plata de por medio"
        />
        <Kpi
          label="Resueltos hoy" value="18"
          icon="task_alt" tint="#E6F6EE" color="#0B8E54"
          note="De 23 que entraron" noteColor="var(--green)"
        />
        <Kpi
          label="Monto en disputa" value={cop(76300)}
          icon="payments" tint="#EAF1FF" color="var(--blue)"
          note="Pendiente de decidir"
        />
      </div>

      <div style={S.split}>
        <div>
          <div style={{ marginBottom: 14 }}>
            <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />
          </div>

          <Panel pad={14}>
            {list.length === 0 ? (
              <Empty icon="support_agent" title="Nada aquí" note="Los tickets llegan desde la sección de Soporte del negocio." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {list.map((t) => {
                  const p = PRIORITY[t.priority] ?? PRIORITY.low;
                  return (
                    <div key={t.id} style={S.ticket}>
                      <span style={S.ticketIcon}>
                        <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>
                          {CATEGORY_ICON[t.category] ?? 'flag'}
                        </span>
                      </span>

                      <span style={{ flex: 1, minWidth: 200 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{t.subject}</span>
                          <Pill label={p.label} bg={p.bg} color={p.color} />
                        </span>
                        {t.body && <span style={S.body}>{t.body}</span>}
                        <span style={S.who}>
                          {t.who ?? '—'}
                          {t.ref ? ` · ${t.ref}` : ''}
                          {' · '}
                          <span suppressHydrationWarning>{ago(t.created_at)}</span>
                        </span>
                      </span>

                      <span style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 'none' }}>
                        <button style={S.actionBtn}>{t.action ?? 'Responder'}</button>
                        <button style={S.assignBtn}>Asignar</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="Soporte hoy">
            <Meter label="Primera respuesta" value={82} suffix="%" color="var(--green)" />
            <Meter label="Tickets resueltos" value={78} suffix="%" color="var(--green)" />
            <Meter label="Satisfacción del cliente" value={92} suffix="%" color="var(--green)" />
            <Meter label="Escalados a super admin" value={9} suffix="%" color="var(--amber)" />
            <p style={S.note}>
              La primera respuesta va en 2 min 40 s de promedio. Es el número que más pesa
              en la satisfacción: contestar rápido importa más que resolver rápido.
            </p>
          </Panel>

          <Panel title="Registro de auditoría" sub="Quién tocó qué">
            {AUDIT_LOG.map((a, i) => (
              <div key={i} style={{ ...S.audit, borderBottom: i === AUDIT_LOG.length - 1 ? 'none' : '1px solid var(--border)' }}>
                <span style={S.auditDot} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={S.auditWhat}>{a.what}</span>
                  <span style={S.auditWho}>{a.who} · {a.when}</span>
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </>
  );
}

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(260px,1fr)', gap: 16, marginTop: 16, alignItems: 'start' },

  ticket: {
    display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
    padding: 14, borderRadius: 18, background: 'var(--bg)',
  },
  ticketIcon: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF0ED',
  },
  body: { display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 },
  who: { display: 'block', fontSize: 11, color: 'var(--faint)', marginTop: 6, fontWeight: 600 },
  actionBtn: {
    height: 32, padding: '0 14px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700,
  },
  assignBtn: {
    height: 32, padding: '0 14px', borderRadius: 999,
    border: '1px solid var(--border)', fontSize: 12, fontWeight: 700,
  },

  note: { margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55 },

  audit: { display: 'flex', alignItems: 'flex-start', gap: 11, padding: '11px 0' },
  auditDot: {
    width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)',
    flex: 'none', marginTop: 5,
  },
  auditWhat: { display: 'block', fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 },
  auditWho: { display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 3 },
};
