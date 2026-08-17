'use client';

/**
 * NEGOCIOS
 *
 * La tabla completa de tiendas. Sirve para dos cosas: buscar una en
 * concreto y suspender la que está dando problemas. Todo lo demás
 * (aprobar, ver documentos) vive en Aprobaciones.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import {
  getBusinesses, setBusinessStatus, BUSINESS_STATUS, VERTICAL, millions,
} from '@/lib/admin';
import { Pill, Tabs, Initials, Empty, Skeleton, ErrorNote, ReasonDialog } from '../../ui';

const TABS = [
  { id: 'todos', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'pending_review', label: 'En revisión' },
  { id: 'suspended', label: 'Suspendidos' },
];

export default function NegociosPage() {
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    getBusinesses().then(setRows).catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = useMemo(() => {
    const base = (rows ?? []).filter((b) => tab === 'todos' || b.status === tab);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((b) =>
      `${b.name} ${b.address ?? ''} ${b.nit ?? ''}`.toLowerCase().includes(q));
  }, [rows, tab, query]);

  const suspend = async (reason) => {
    setBusy(true);
    try {
      await setBusinessStatus(target.id, 'suspended', reason);
      setTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reactivate = async (business) => {
    setBusy(true);
    try {
      await setBusinessStatus(business.id, 'active');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!rows) return <Skeleton rows={5} height={64} />;

  const counts = Object.fromEntries(
    TABS.map((t) => [t.id, t.id === 'todos' ? rows.length : rows.filter((b) => b.status === t.id).length]),
  );

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.bar}>
        <Tabs items={TABS.map((t) => ({ ...t, count: counts[t.id] }))} value={tab} onChange={setTab} />
        <div style={S.search}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, dirección o NIT"
            style={S.searchInput}
          />
        </div>
      </div>

      <div style={S.table}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.head }}>
            <span>NEGOCIO</span><span>VERTICAL</span><span>RATING</span>
            <span>PEDIDOS</span><span>GMV MES</span><span>COMISIÓN</span>
            <span style={{ textAlign: 'right' }}>ESTADO</span>
          </div>

          {list.map((b) => {
            const vertical = VERTICAL[b.vertical] ?? VERTICAL.store;
            const status = BUSINESS_STATUS[b.status];
            return (
              <div key={b.id} style={S.row} className="adm-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <Initials name={b.name} size={34} radius={11} />
                  <span style={{ minWidth: 0 }}>
                    <span style={S.name}>{b.name}</span>
                    <span style={S.meta}>
                      {b.address}{b.branches ? ` · ${b.branches} sucursales` : ''}
                    </span>
                  </span>
                </span>

                <span><Pill label={vertical.label} bg={vertical.bg} color={vertical.color} /></span>

                <span style={{ fontWeight: 700, fontSize: 12.5 }}>
                  <span className="ms" style={{ fontSize: 15, color: 'var(--amber)', verticalAlign: '-3px' }}>star</span>
                  {' '}{b.rating ? String(b.rating).replace('.', ',') : '—'}
                </span>

                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>{b.total_orders ?? 0}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{b.gmv_month ? millions(b.gmv_month) : '—'}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                  {b.commission_rate ? `${Math.round(b.commission_rate * 100)}%` : '—'}
                </span>

                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                  <Pill label={status.label} bg={status.bg} color={status.color} />
                  {b.status === 'active' && (
                    <button
                      onClick={() => setTarget(b)}
                      title="Suspender"
                      style={S.iconBtn}
                    >
                      <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>block</span>
                    </button>
                  )}
                  {b.status === 'suspended' && (
                    <button
                      onClick={() => reactivate(b)}
                      disabled={busy}
                      title="Reactivar"
                      style={S.iconBtn}
                    >
                      <span className="ms" style={{ fontSize: 17, color: 'var(--green)' }}>play_arrow</span>
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {list.length === 0 && (
          <Empty
            icon="storefront"
            title="Sin coincidencias"
            note="Prueba con otro nombre, o cambia de pestaña."
          />
        )}
      </div>

      <ReasonDialog
        open={Boolean(target)}
        busy={busy}
        title={`Suspender a ${target?.name ?? ''}`}
        note="La tienda deja de recibir pedidos de inmediato y se cierra aunque el dueño la tenga abierta. Escribe por qué."
        confirmLabel="Suspender"
        onCancel={() => setTarget(null)}
        onConfirm={suspend}
      />
    </>
  );
}

const GRID = 'minmax(220px,2.2fr) 110px 80px 80px 100px 90px 150px';

const S = {
  bar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, flexWrap: 'wrap', marginBottom: 14,
  },
  search: {
    display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 13px',
    borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--border)',
    minWidth: 240,
  },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 13 },

  table: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, boxShadow: 'var(--shadowSm)', overflow: 'hidden',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 940, padding: '12px 18px', borderBottom: '1px solid var(--border)',
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
  iconBtn: {
    width: 28, height: 28, borderRadius: 9, border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
