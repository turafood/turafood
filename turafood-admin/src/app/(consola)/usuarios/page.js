'use client';

/**
 * USUARIOS Y ROLES
 *
 * Todas las cuentas de la plataforma en una tabla, y al lado qué
 * puede hacer cada rol.
 *
 * Los permisos se muestran pero no se editan desde aquí: el rol vive
 * en `profiles.role` y cambiarlo es la operación más peligrosa de todo
 * el sistema. Se hace en la base, a propósito, para que no sea un clic.
 */

import { useEffect, useMemo, useState } from 'react';
import { getUsers, getOverview } from '@/lib/admin';
import { Panel, Kpi, Pill, Initials, Empty, Skeleton, ErrorNote } from '../../ui';

const ROLE = {
  admin:    { label: 'SUPER ADMIN', bg: '#FFF1EC', color: 'var(--primary)' },
  ops:      { label: 'OPERACIÓN',   bg: '#EAF1FF', color: 'var(--blue)' },
  business: { label: 'NEGOCIO',     bg: '#E6F6EE', color: '#0B8E54' },
  courier:  { label: 'REPARTIDOR',  bg: '#F3ECFF', color: '#6B2FD6' },
  customer: { label: 'CLIENTE',     bg: '#F0EEE9', color: '#8C857B' },
};

const PERMISSIONS = [
  {
    role: 'admin', icon: 'shield_person', color: 'var(--primary)', tint: '#FFF1EC',
    title: 'Super Admin',
    note: 'Todo, incluido comisiones, roles, eliminación de cuentas y ejecución de liquidaciones.',
  },
  {
    role: 'ops', icon: 'headset_mic', color: 'var(--blue)', tint: '#EAF1FF',
    title: 'Operación',
    note: 'Aprobar negocios, gestionar pedidos, disputas y suspensiones. Sin acceso a comisiones ni pagos.',
  },
  {
    role: 'business', icon: 'store', color: '#0B8E54', tint: '#E6F6EE',
    title: 'Negocio',
    note: 'Solo su propia tienda: catálogo, pedidos, promociones, horarios y sus liquidaciones.',
  },
  {
    role: 'courier', icon: 'two_wheeler', color: '#6B2FD6', tint: '#F3ECFF',
    title: 'Repartidor',
    note: 'App de repartidor: aceptar pedidos, navegación y registro de entregas.',
  },
];

export default function UsuariosPage() {
  const [rows, setRows] = useState(null);
  const [overview, setOverview] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getUsers(), getOverview()])
      .then(([u, o]) => { setRows(u); setOverview(o); })
      .catch((err) => setError(err.message));
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((u) =>
      `${u.full_name ?? ''} ${u.email ?? ''} ${u.role ?? ''}`.toLowerCase().includes(q));
  }, [rows, query]);

  if (!rows) return <Skeleton rows={5} height={64} />;

  const byRole = (role) => rows.filter((u) => u.role === role).length;

  return (
    <>
      <ErrorNote text={error} />

      <div style={S.kpis}>
        <Kpi
          label="Clientes registrados" value={String(byRole('customer'))}
          icon="group" tint="#F3ECFF" color="#6B2FD6"
        />
        <Kpi
          label="Cuentas de negocio" value={String(overview?.negocios?.activos ?? byRole('business'))}
          icon="store" tint="#E6F6EE" color="#0B8E54"
          note={`${overview?.negocios?.pendientes ?? 0} en revisión`}
        />
        <Kpi
          label="Repartidores" value={String(overview?.repartidores?.activos ?? byRole('courier'))}
          icon="two_wheeler" tint="#EAF1FF" color="var(--blue)"
          note={`${overview?.repartidores?.en_linea ?? 0} conectados ahora`}
        />
        <Kpi
          label="Staff TuraFood" value={String(byRole('admin') + byRole('ops'))}
          icon="badge" tint="#FFF1EC" color="var(--primary)"
          note={`${byRole('admin')} super admin · ${byRole('ops')} operación`}
        />
      </div>

      <div style={S.split}>
        <Panel
          title="Usuarios de la plataforma"
          right={
            <div style={S.search}>
              <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre, correo o rol"
                style={S.searchInput}
              />
            </div>
          }
          pad={14}
        >
          {list.length === 0 ? (
            <Empty icon="group" title="Sin coincidencias" note="Prueba con otro nombre o correo." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ ...S.row, ...S.head }}>
                <span>USUARIO</span><span>ROL</span><span>PEDIDOS</span>
                <span style={{ textAlign: 'right' }}>ÚLTIMO ACCESO</span>
              </div>
              {list.map((u) => {
                const r = ROLE[u.role] ?? ROLE.customer;
                return (
                  <div key={u.id} style={S.row} className="adm-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <Initials name={u.full_name ?? u.email ?? '?'} size={32} radius={16} />
                      <span style={{ minWidth: 0 }}>
                        <span style={S.name}>{u.full_name ?? 'Sin nombre'}</span>
                        <span style={S.meta}>{u.email ?? u.phone ?? '—'}</span>
                      </span>
                    </span>
                    <span><Pill label={r.label} bg={r.bg} color={r.color} /></span>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
                      {u.orders ?? '—'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>
                      {u.last ?? '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Roles y permisos" sub="Solo el super admin puede editarlos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {PERMISSIONS.map((p) => (
              <div key={p.role} style={S.perm}>
                <span style={{ ...S.permIcon, background: p.tint }}>
                  <span className="ms" style={{ fontSize: 19, color: p.color }}>{p.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{p.title}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', flex: 'none' }}>
                      {byRole(p.role)} {byRole(p.role) === 1 ? 'cuenta' : 'cuentas'}
                    </span>
                  </span>
                  <span style={S.permNote}>{p.note}</span>
                </span>
              </div>
            ))}
          </div>

          <p style={S.warn}>
            <span className="ms" style={{ fontSize: 15, verticalAlign: '-2px' }}>lock</span>
            {' '}Cambiar el rol de alguien se hace en la base, no aquí. Es la operación más
            delicada del sistema y no debería ser un clic.
          </p>
        </Panel>
      </div>
    </>
  );
}

const GRID = 'minmax(200px,2fr) 130px 90px 130px';

const S = {
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 },
  split: { display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 16, marginTop: 16, alignItems: 'start' },
  search: {
    display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px',
    borderRadius: 11, background: 'var(--bg)', minWidth: 200,
  },
  searchInput: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 12.5 },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, alignItems: 'center',
    minWidth: 560, padding: '11px 0', borderBottom: '1px solid var(--border)',
  },
  head: { fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' },
  name: {
    display: 'block', fontSize: 13, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  meta: {
    display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 2,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  perm: { display: 'flex', alignItems: 'flex-start', gap: 11 },
  permIcon: {
    width: 34, height: 34, borderRadius: 11, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  permNote: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 },
  warn: {
    margin: '18px 0 0', paddingTop: 14, borderTop: '1px solid var(--border)',
    fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.55,
  },
};
