'use client';

/**
 * REPARTIDORES
 *
 * Arriba lo que hay que decidir hoy (verificación de documentos),
 * abajo la flota completa. El orden importa: quien abre esta pantalla
 * casi siempre viene a aprobar a alguien, no a mirar la tabla.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getCouriers, reviewCourier, COURIER_STATUS, ago,
} from '@/lib/admin';
import { Panel, Kpi, Pill, Tabs, Initials, Empty, Skeleton, ErrorNote, ReasonDialog } from '../../ui';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'pending_review', label: 'En verificación' },
  { id: 'active', label: 'Activos' },
  { id: 'online', label: 'En línea ahora' },
  { id: 'suspended', label: 'Suspendidos' },
];

/**
 * Las claves son las que guarda la base (`courier_profiles.vehicle_type`
 * solo acepta motorcycle, bicycle o car). Estaban en español y por eso
 * ninguna fila real encontraba su etiqueta.
 */
const VEHICLE = {
  motorcycle: { label: 'Moto',  bg: '#FFF0ED', color: '#C0341A' },
  bicycle:    { label: 'Bici',  bg: '#E6F6EE', color: '#0B8E54' },
  car:        { label: 'Carro', bg: '#EAF1FF', color: '#2E6BFF' },
};

/** Los cuatro papeles sin los cuales no puede salir a rodar */
const REQUIRED_DOCS = [
  ['cedula', 'Cédula'],
  ['licencia', 'Licencia'],
  ['soat', 'SOAT'],
  ['tecnomecanica', 'Tecnomecánica'],
];

export default function RepartidoresPage() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    getCouriers().then(setRows).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = (rows ?? []).filter((c) => c.approval_status === 'pending_review');

  const list = useMemo(() => {
    const base = (rows ?? []).filter((c) => {
      if (tab === 'todos') return true;
      if (tab === 'online') return c.status === 'online' && c.approval_status === 'active';
      return c.approval_status === tab;
    });
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => `${c.full_name} ${c.doc ?? ''}`.toLowerCase().includes(q));
  }, [rows, tab, query]);

  const decide = async (courier, approve, reason = null) => {
    setBusy(true);
    setError(null);
    try {
      await reviewCourier(courier.id, approve, reason);
      setTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Skeleton rows={4} height={92} />;

  const online = rows.filter((c) => c.status === 'online' && c.approval_status === 'active');
  const active = rows.filter((c) => c.approval_status === 'active');
  const rated = active.filter((c) => c.rating);
  const accepted = active.filter((c) => c.acceptance_rate != null);

  const avgRating = rated.length
    ? (rated.reduce((a, c) => a + Number(c.rating), 0) / rated.length).toFixed(1).replace('.', ',')
    : '—';
  const avgAcceptance = accepted.length
    ? Math.round((accepted.reduce((a, c) => a + Number(c.acceptance_rate), 0) / accepted.length) * 100)
    : null;

  const counts = Object.fromEntries(TABS.map((t) => [
    t.id,
    t.id === 'todos' ? rows.length
      : t.id === 'online' ? online.length
        : rows.filter((c) => c.approval_status === t.id).length,
  ]));

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="En línea ahora" value={String(online.length)}
          icon="sensors" tint="#E6F6EE" color="#0B8E54"
          note={`de ${active.length} activos`}
        />
        <Kpi
          label="En verificación" value={String(pending.length)}
          icon="pending_actions" tint="#FFF7E6" color="#A8730B"
          note="Meta: revisar en menos de 24 h"
        />
        <Kpi
          label="Aceptación media" value={avgAcceptance != null ? `${avgAcceptance}%` : '—'}
          icon="task_alt" tint="#EAF1FF" color="var(--blue)"
          note="Sobre pedidos ofrecidos"
        />
        <Kpi
          label="Rating de flota" value={avgRating}
          icon="star" tint="#F3ECFF" color="#6B2FD6"
          note={`Sobre ${rated.length} repartidores calificados`}
        />
      </div>

      {/* Verificación pendiente */}
      {pending.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Panel
            title="Verificación de documentos"
            right={<span style={S.pendingTag}>{pending.length} PENDIENTES</span>}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map((c) => {
                const docs = c.docs ?? {};
                const ok = REQUIRED_DOCS.filter(([k]) => docs[k]).length;
                const complete = ok === REQUIRED_DOCS.length;
                return (
                  <div key={c.id} style={S.verifyRow}>
                    <Initials name={c.full_name} size={40} radius={13} />

                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={S.name}>{c.full_name}</span>
                      <span style={S.meta}>
                        {c.doc ?? '—'} · {(VEHICLE[c.vehicle_type] ?? VEHICLE.motorcycle).label}
                        {c.zone ? ` · ${c.zone}` : ''}
                      </span>
                    </span>

                    <span style={S.docChips}>
                      {REQUIRED_DOCS.map(([key, label]) => (
                        <span
                          key={key}
                          style={{
                            ...S.docChip,
                            background: docs[key] ? '#E6F6EE' : 'var(--surface2)',
                            color: docs[key] ? '#0B8E54' : 'var(--faint)',
                          }}
                        >
                          <span className="ms" style={{ fontSize: 13 }}>
                            {docs[key] ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          {label}
                        </span>
                      ))}
                    </span>

                    <span style={{ display: 'flex', gap: 7, flex: 'none' }}>
                      <button onClick={() => setTarget(c)} disabled={busy} style={S.rejectBtn}>
                        Rechazar
                      </button>
                      <button
                        onClick={() => decide(c, true)}
                        disabled={busy}
                        style={{ ...S.approveBtn, opacity: complete ? 1 : 0.75 }}
                        title={complete ? 'Aprobar' : 'Le faltan documentos, pero puedes aprobar igual'}
                      >
                        <span className="ms" style={{ fontSize: 16 }}>check</span>
                        {complete ? 'Aprobar' : `Faltan ${REQUIRED_DOCS.length - ok}`}
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* Flota completa */}
      <div style={{ ...S.bar, marginTop: 16 }}>
        <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />
        <div style={S.search}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o cédula"
            style={S.searchInput}
          />
        </div>
      </div>

      <div style={S.table}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.head }}>
            <span>REPARTIDOR</span><span>ZONA</span><span>VEHÍCULO</span>
            <span>ENTREGAS</span><span>RATING</span><span>ACEPTACIÓN</span>
            <span style={{ textAlign: 'right' }}>ESTADO</span>
          </div>

          {list.map((c) => {
            const vehicle = VEHICLE[c.vehicle_type] ?? VEHICLE.motorcycle;
            const status = COURIER_STATUS[c.approval_status];
            const isOnline = c.status === 'online' && c.approval_status === 'active';
            return (
              <div key={c.id} style={S.row} className="adm-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <span style={{ position: 'relative', flex: 'none' }}>
                    <Initials name={c.full_name} size={34} radius={17} />
                    {isOnline && <span style={S.onlineDot} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={S.name}>{c.full_name}</span>
                    <span style={S.meta}>{c.doc ?? c.plate ?? '—'}</span>
                  </span>
                </span>

                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.zone ?? '—'}</span>
                <span><Pill label={vehicle.label} bg={vehicle.bg} color={vehicle.color} /></span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {(c.total_deliveries ?? 0).toLocaleString('es-CO')}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                  <span className="ms" style={{ fontSize: 15, color: 'var(--amber)', verticalAlign: '-3px' }}>star</span>
                  {' '}{c.rating ? String(c.rating).replace('.', ',') : '—'}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                  {c.acceptance_rate != null ? `${Math.round(c.acceptance_rate * 100)}%` : '—'}
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <Pill label={status.label} bg={status.bg} color={status.color} />
                  {c.approval_status === 'active' && (
                    <button onClick={() => setTarget(c)} title="Suspender" style={S.iconBtn}>
                      <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>block</span>
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {list.length === 0 && (
          <Empty icon="two_wheeler" title="Sin coincidencias" note="Prueba con otro nombre o cambia de pestaña." />
        )}
      </div>

      <ReasonDialog
        open={Boolean(target)}
        busy={busy}
        title={`Rechazar a ${target?.full_name ?? ''}`}
        note="Escribe qué documento falta o qué está mal. Es lo que va a ver en su app."
        confirmLabel="Enviar rechazo"
        onCancel={() => setTarget(null)}
        onConfirm={(reason) => decide(target, false, reason)}
      />
    </>
  );
}

const GRID = 'minmax(200px,2fr) 130px 90px 90px 80px 100px 140px';

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  pendingTag: {
    height: 22, padding: '0 9px', borderRadius: 999, background: '#FFF7E6',
    color: '#A8730B', fontSize: 10, fontWeight: 800, letterSpacing: '.04em',
    display: 'inline-flex', alignItems: 'center',
  },
  verifyRow: {
    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    padding: 13, borderRadius: 16, background: 'var(--bg)',
  },
  docChips: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  docChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 9px',
    borderRadius: 999, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
  },
  approveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 34, padding: '0 14px',
    borderRadius: 999, background: 'var(--green)', color: '#fff', fontSize: 12.5, fontWeight: 700,
  },
  rejectBtn: {
    display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
  },

  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 14,
  },
  search: {
    display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 13px',
    borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)',
    minWidth: 230,
  },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 13 },

  table: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, boxShadow: 'var(--shadowSm)', overflow: 'hidden',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 900, padding: '12px 18px', borderBottom: '1px solid var(--border)',
    transition: 'background .15s ease',
  },
  head: {
    background: 'var(--bg)', fontSize: 10, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.06em',
  },
  name: {
    display: 'block', fontSize: 13.5, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: {
    display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  onlineDot: {
    position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: '50%',
    background: 'var(--green)', border: '2px solid var(--surface)',
  },
  iconBtn: {
    width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
