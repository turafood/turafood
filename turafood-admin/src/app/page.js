'use client';

/**
 * SUPER ADMIN — TURAFOOD
 * Réplica de "Tura Shop - Admin.dc.html". El mockup es una máquina de
 * estados con barra lateral; aquí se conserva esa estructura y cada
 * sección lee de `lib/data`.
 *
 * La sección de Aprobaciones es la que permite publicar un negocio:
 * un negocio nace en `pending_review` y no aparece en la app cliente
 * hasta que aquí se apruebe.
 */

import { useCallback, useEffect, useState } from 'react';
import { cop, relativeTime } from '@/lib/format';
import {
  getBusinesses, getCouriers, getOverview,
  reviewBusiness, reviewCourier,
  VERTICAL_PILL, STATUS_PILL, REQUIRED_DOCS, isLive,
} from '@/lib/data';

const NAV = [
  { id: 'overview', icon: 'dashboard', label: 'Dashboard' },
  { id: 'approvals', icon: 'pending_actions', label: 'Aprobaciones' },
  { id: 'stores', icon: 'storefront', label: 'Negocios' },
  { id: 'riders', icon: 'two_wheeler', label: 'Repartidores' },
  { id: 'zones', icon: 'map', label: 'Zonas y Tarifas' },
  { id: 'finance', icon: 'payments', label: 'Comisiones' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('approvals');
  const [businesses, setBusinesses] = useState([]);
  const [couriers, setCouriers] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [biz, cour, ov] = await Promise.all([
        getBusinesses(), getCouriers(), getOverview(),
      ]);
      setBusinesses(biz);
      setCouriers(cour);
      setOverview(ov);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (message, kind = 'ok') => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3200);
  };

  const pendingBusinesses = businesses.filter((b) => b.status === 'pending_review');
  const pendingCouriers = couriers.filter((c) => c.approval_status === 'pending_review');
  const pendingCount = pendingBusinesses.length + pendingCouriers.length;

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ---------------- BARRA LATERAL ---------------- */}
      <aside style={sidebar}>
        <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={logoMark}>
            <span className="ms" style={{ fontSize: 24, color: '#fff' }}>admin_panel_settings</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>
              Tura Shop
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
              SUPER ADMIN
            </div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 16px' }}>
          {NAV.map((item) => {
            const active = tab === item.id;
            const badge = item.id === 'approvals' && pendingCount > 0 ? pendingCount : null;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 12,
                  background: active ? 'var(--primary)' : 'transparent',
                  color: active ? '#fff' : 'var(--text)',
                  transition: 'all .2s', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="ms" style={{ fontSize: 20, color: active ? '#fff' : 'var(--muted)' }}>
                    {item.icon}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: active ? 700 : 600 }}>{item.label}</span>
                </span>
                {badge && (
                  <span style={{
                    background: active ? '#fff' : 'var(--amber)',
                    color: active ? 'var(--primary)' : '#fff',
                    fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                  }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', padding: 16 }}>
          <div style={dataModeBox}>
            <span className="ms" style={{ fontSize: 16, color: isLive() ? 'var(--green)' : 'var(--amber)' }}>
              {isLive() ? 'cloud_done' : 'cloud_off'}
            </span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--muted)', fontWeight: 600 }}>
              {isLive()
                ? 'Conectado a Supabase'
                : 'Datos locales de desarrollo. Al configurar Supabase, esta misma pantalla lee de la base de datos.'}
            </span>
          </div>
        </div>
      </aside>

      {/* ---------------- CONTENIDO ---------------- */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em' }}>
              {NAV.find((n) => n.id === tab)?.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              Operación de TuraFood en Buenaventura
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={load} style={refreshBtn} disabled={loading}>
            <span className="ms" style={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none' }}>
              refresh
            </span>
            Actualizar
          </button>
        </header>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '22px 26px 40px' }}>
          {error && (
            <div style={errorBox}>
              <span className="ms" style={{ fontSize: 20 }}>error</span>
              <div>
                <div style={{ fontWeight: 800 }}>No se pudieron cargar los datos</div>
                <div style={{ fontSize: 12.5, marginTop: 2 }}>{error}</div>
              </div>
            </div>
          )}

          {tab === 'overview' && (
            <Overview overview={overview} loading={loading} onGoApprovals={() => setTab('approvals')} />
          )}

          {tab === 'approvals' && (
            <Approvals
              businesses={pendingBusinesses}
              couriers={pendingCouriers}
              loading={loading}
              onReviewBusiness={async (id, approve, reason) => {
                try {
                  await reviewBusiness(id, approve, reason);
                  notify(approve ? 'Negocio aprobado y publicado' : 'Solicitud rechazada');
                  await load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
              onReviewCourier={async (id, approve, reason) => {
                try {
                  await reviewCourier(id, approve, reason);
                  notify(approve ? 'Repartidor aprobado' : 'Solicitud rechazada');
                  await load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            />
          )}

          {tab === 'stores' && <StoresTable rows={businesses} loading={loading} />}
          {tab === 'riders' && <RidersTable rows={couriers} loading={loading} />}
          {(tab === 'zones' || tab === 'finance') && <Placeholder tab={tab} />}
        </div>
      </main>

      {toast && (
        <div style={{ ...toastBox, background: toast.kind === 'error' ? 'var(--primary)' : 'var(--text)' }}>
          <span className="ms" style={{ fontSize: 18 }}>
            {toast.kind === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Overview({ overview, loading, onGoApprovals }) {
  const stats = [
    { label: 'Solicitudes pendientes', value: overview?.pendingApprovals ?? 0, icon: 'pending_actions', color: 'var(--amber)', action: onGoApprovals },
    { label: 'Negocios activos', value: overview?.activeBusinesses ?? 0, icon: 'storefront', color: 'var(--primary)' },
    { label: 'Repartidores en línea', value: overview?.onlineCouriers ?? 0, icon: 'electric_moped', color: 'var(--green)' },
    { label: 'Ingresos (semana)', value: cop(overview?.weekRevenue ?? 0), icon: 'account_balance_wallet', color: 'var(--blue)' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
      {stats.map((s) => (
        <button
          key={s.label}
          onClick={s.action}
          style={{ ...card, padding: 20, textAlign: 'left', cursor: s.action ? 'pointer' : 'default' }}
        >
          <span className="ms" style={{ color: s.color, fontSize: 24 }}>{s.icon}</span>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-bricolage)', marginTop: 12 }}>
            {loading ? '—' : s.value}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   APROBACIONES — la pantalla clave
   ============================================================ */
function Approvals({ businesses, couriers, loading, onReviewBusiness, onReviewCourier }) {
  const [kind, setKind] = useState('business');
  const [selectedId, setSelectedId] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = kind === 'business' ? businesses : couriers;
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;

  // Si la fila seleccionada desaparece tras aprobarla, limpiamos la selección
  useEffect(() => {
    if (selectedId && !rows.some((r) => r.id === selectedId)) {
      setSelectedId(null);
      setRejecting(false);
      setReason('');
    }
  }, [rows, selectedId]);

  const act = async (approve) => {
    if (!selected) return;
    if (!approve && !reason.trim()) {
      setRejecting(true);
      return;
    }
    setBusy(true);
    try {
      if (kind === 'business') {
        await onReviewBusiness(selected.id, approve, approve ? null : reason.trim());
      } else {
        await onReviewCourier(selected.id, approve, approve ? null : reason.trim());
      }
      setRejecting(false);
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    // El mockup pone lista y detalle lado a lado; sin `nowrap` el panel
    // de 352px se iba a la línea siguiente en pantallas de 1280px.
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'nowrap' }}>

      {/* Lista de solicitudes */}
      <div style={{ ...card, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'business', label: 'Negocios', count: businesses.length },
            { id: 'courier', label: 'Repartidores', count: couriers.length },
          ].map((t) => {
            const active = kind === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setKind(t.id); setSelectedId(null); setRejecting(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 13px',
                  borderRadius: 11, fontSize: 12.5, fontWeight: 700,
                  background: active ? 'var(--primary)' : 'var(--surface2)',
                  color: active ? '#fff' : 'var(--text)',
                }}
              >
                {t.label}
                <span style={{
                  minWidth: 19, height: 19, padding: '0 5px', borderRadius: 99,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10.5, fontWeight: 800,
                  background: active ? 'rgba(255,255,255,.25)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--muted)',
                }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {loading && <div style={emptyBox}>Cargando solicitudes…</div>}

        {!loading && rows.length === 0 && (
          <div style={emptyBox}>
            <span className="ms" style={{ fontSize: 30, color: 'var(--green)' }}>task_alt</span>
            <div style={{ fontWeight: 800, marginTop: 8 }}>No hay solicitudes pendientes</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              Todo al día por ahora.
            </div>
          </div>
        )}

        {!loading && rows.map((r) => {
          const active = selected?.id === r.id;
          const pill = kind === 'business'
            ? VERTICAL_PILL[r.vertical] ?? VERTICAL_PILL.store
            : { label: r.vehicle_type === 'motorcycle' ? 'Moto' : r.vehicle_type === 'bicycle' ? 'Bicicleta' : 'Carro', bg: 'var(--surface2)', fg: 'var(--muted)' };

          return (
            <button
              key={r.id}
              onClick={() => { setSelectedId(r.id); setRejecting(false); setReason(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                padding: '15px 18px', borderBottom: '1px solid var(--border)',
                textAlign: 'left',
                background: active ? 'var(--bg)' : 'transparent',
                borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <span style={{
                width: 46, height: 46, borderRadius: 13, flex: 'none',
                backgroundImage: kind === 'business' ? `url('${r.cover_url}')` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center',
                background: kind === 'business' ? undefined : 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {kind === 'courier' && (
                  <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>two_wheeler</span>
                )}
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="tr1" style={{ fontSize: 14, fontWeight: 700 }}>
                    {kind === 'business' ? r.name : r.full_name}
                  </span>
                  <span style={{ ...tagPill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                </span>
                <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  {kind === 'business'
                    ? `${r.address} · NIT ${r.nit ?? '—'}`
                    : `${r.plate ? `Placa ${r.plate}` : 'Sin placa'} · ${r.phone}`}
                </span>
              </span>

              <span style={{ flex: 'none', textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--faint)' }}>
                  {relativeTime(r.created_at)}
                </span>
              </span>

              <span style={{ ...tagPill, ...STATUS_PILL.pending_review && { background: STATUS_PILL.pending_review.bg, color: STATUS_PILL.pending_review.fg }, width: 104, textAlign: 'center' }}>
                En revisión
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalle de la solicitud */}
      {selected && (
        <div style={{ ...card, flex: 'none', width: 352 }}>
          <div style={{
            height: 120, position: 'relative',
            backgroundImage: kind === 'business' ? `url('${selected.cover_url}')` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center',
            background: kind === 'business' ? undefined : 'var(--surface2)',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.42))' }} />
            <div style={riskPill}>
              <span className="ms" style={{ fontSize: 14 }}>verified_user</span>
              RIESGO BAJO
            </div>
          </div>

          <div style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>
                  {kind === 'business' ? selected.name : selected.full_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                  {kind === 'business'
                    ? `${VERTICAL_PILL[selected.vertical]?.label ?? 'Negocio'} · ${relativeTime(selected.created_at)}`
                    : `Repartidor · ${relativeTime(selected.created_at)}`}
                </div>
              </div>
              <span style={{ ...tagPill, background: STATUS_PILL.pending_review.bg, color: STATUS_PILL.pending_review.fg }}>
                En revisión
              </span>
            </div>

            {/* Datos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              {(kind === 'business'
                ? [
                  { label: 'Representante', value: selected.owner?.full_name ?? '—' },
                  { label: 'Teléfono', value: selected.phone ?? '—' },
                  { label: 'Dirección', value: selected.address },
                  { label: 'Zona', value: selected.zone ?? '—' },
                  { label: 'NIT', value: selected.nit ?? '—' },
                  { label: 'Comisión', value: `${Math.round((selected.commission_rate ?? 0.1) * 100)}%` },
                ]
                : [
                  { label: 'Teléfono', value: selected.phone ?? '—' },
                  { label: 'Vehículo', value: selected.vehicle_type === 'motorcycle' ? 'Moto' : selected.vehicle_type === 'bicycle' ? 'Bicicleta' : 'Carro' },
                  { label: 'Placa', value: selected.plate ?? 'No aplica' },
                  { label: 'Zona', value: selected.zone ?? '—' },
                ]
              ).map((row) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600, flex: 'none' }}>{row.label}</span>
                  <span style={{ fontWeight: 700, textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Documentos */}
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginTop: 18 }}>
              DOCUMENTOS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              {REQUIRED_DOCS[kind].map((d) => (
                <div key={d.key} style={docRow}>
                  <span style={docIcon}>
                    <span className="ms" style={{ fontSize: 16, color: 'var(--muted)' }}>description</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700 }}>{d.label}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{d.meta}</span>
                  </span>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--faint)' }}>schedule</span>
                </div>
              ))}
            </div>
            <div style={{ ...noteBox, marginTop: 10 }}>
              <span className="ms" style={{ fontSize: 16, color: 'var(--amber)', flex: 'none' }}>info</span>
              <span>
                La carga de documentos aún no está implementada: el estado mostrado es
                &quot;pendiente&quot; para todos. Se conecta cuando exista Supabase Storage.
              </span>
            </div>

            {/* Motivo de rechazo */}
            {rejecting && (
              <div style={{ marginTop: 16 }}>
                <label htmlFor="reason" style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
                  MOTIVO DEL RECHAZO
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. El concepto sanitario está vencido."
                  rows={3}
                  style={textarea}
                />
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
              <button onClick={() => act(true)} disabled={busy} style={approveBtn}>
                {busy ? 'Procesando…' : kind === 'business' ? 'Aprobar y publicar tienda' : 'Aprobar repartidor'}
              </button>
              <div style={{ display: 'flex', gap: 9 }}>
                {rejecting && (
                  <button
                    onClick={() => { setRejecting(false); setReason(''); }}
                    disabled={busy}
                    style={secondaryBtn}
                  >
                    Cancelar
                  </button>
                )}
                <button onClick={() => act(false)} disabled={busy} style={rejectBtn}>
                  {rejecting ? 'Confirmar rechazo' : 'Rechazar'}
                </button>
              </div>
            </div>

            <div style={{ ...noteBox, marginTop: 14 }}>
              <span className="ms" style={{ fontSize: 17, color: 'var(--muted)', flex: 'none' }}>history</span>
              <span>
                Al aprobar, el negocio pasa a estado <strong>activo</strong> y aparece de
                inmediato en la app del cliente. La acción queda registrada con tu usuario.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TABLAS
   ============================================================ */
function StoresTable({ rows, loading }) {
  const cols = 'minmax(0,2fr) 116px 90px 96px 118px 108px';
  return (
    <div style={{ ...card, overflowX: 'auto' }}>
      <div style={{ ...tableHead, gridTemplateColumns: cols }}>
        <span>NEGOCIO</span><span>VERTICAL</span><span>RATING</span>
        <span>PEDIDOS</span><span>COMISIÓN</span>
        <span style={{ textAlign: 'right' }}>ESTADO</span>
      </div>
      {loading && <div style={emptyBox}>Cargando negocios…</div>}
      {!loading && rows.map((r) => {
        const vert = VERTICAL_PILL[r.vertical] ?? VERTICAL_PILL.store;
        const st = STATUS_PILL[r.status] ?? STATUS_PILL.closed;
        return (
          <div key={r.id} style={{ ...tableRow, gridTemplateColumns: cols }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{
                width: 38, height: 38, borderRadius: 11, flex: 'none',
                backgroundImage: `url('${r.cover_url}')`, backgroundSize: 'cover', backgroundPosition: 'center',
              }} />
              <span style={{ minWidth: 0 }}>
                <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
                <span className="tr1" style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  {r.zone ?? r.address}
                </span>
              </span>
            </div>
            <span style={{ ...tagPill, background: vert.bg, color: vert.fg, justifySelf: 'start' }}>{vert.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <span className="ms ms-fill" style={{ fontSize: 15, color: 'var(--amber)' }}>star</span>
              {r.rating}
            </span>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{r.total_orders}</span>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {Math.round((r.commission_rate ?? 0.1) * 100)}%
            </span>
            <span style={{ ...tagPill, background: st.bg, color: st.fg, justifySelf: 'end' }}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RidersTable({ rows, loading }) {
  const cols = 'minmax(0,2fr) 110px 110px 100px 108px';
  return (
    <div style={{ ...card, overflowX: 'auto' }}>
      <div style={{ ...tableHead, gridTemplateColumns: cols }}>
        <span>REPARTIDOR</span><span>VEHÍCULO</span><span>ENTREGAS</span>
        <span>RATING</span><span style={{ textAlign: 'right' }}>ESTADO</span>
      </div>
      {loading && <div style={emptyBox}>Cargando repartidores…</div>}
      {!loading && rows.map((r) => {
        const st = r.approval_status === 'active'
          ? { label: r.status === 'online' ? 'En línea' : 'Aprobado', bg: '#E6F6EE', fg: '#0B7A48' }
          : STATUS_PILL[r.approval_status] ?? STATUS_PILL.suspended;
        return (
          <div key={r.id} style={{ ...tableRow, gridTemplateColumns: cols }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <span style={{
                width: 38, height: 38, borderRadius: '50%', flex: 'none', background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'var(--muted)',
              }}>
                {(r.full_name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{r.full_name}</span>
                <span className="tr1" style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  {r.phone}
                </span>
              </span>
            </div>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
              {r.vehicle_type === 'motorcycle' ? `Moto ${r.plate ?? ''}` : r.vehicle_type === 'bicycle' ? 'Bicicleta' : 'Carro'}
            </span>
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{r.total_deliveries}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
              <span className="ms ms-fill" style={{ fontSize: 15, color: 'var(--amber)' }}>star</span>
              {r.rating}
            </span>
            <span style={{ ...tagPill, background: st.bg, color: st.fg, justifySelf: 'end' }}>{st.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function Placeholder({ tab }) {
  return (
    <div style={{ ...card, padding: 40, textAlign: 'center' }}>
      <span className="ms" style={{ fontSize: 36, color: 'var(--faint)' }}>
        {tab === 'zones' ? 'map' : 'payments'}
      </span>
      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 12 }}>
        {tab === 'zones' ? 'Zonas y tarifas' : 'Comisiones y liquidaciones'}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, maxWidth: 460, marginInline: 'auto', lineHeight: 1.5 }}>
        {tab === 'zones'
          ? 'Las tres zonas de Buenaventura (Centro, Isla Cascajal y Continente) ya existen en la base de datos con sus tarifas. Falta el editor de polígonos sobre el mapa.'
          : 'El cálculo de comisión por pedido ya se guarda en cada orden. Falta la vista de liquidación semanal por negocio y repartidor.'}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Estilos — valores del mockup del admin
   ------------------------------------------------------------ */

const sidebar = {
  width: 260, flex: 'none', background: 'var(--surface)',
  borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
};

const logoMark = {
  width: 40, height: 40, borderRadius: 12, background: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const topbar = {
  flex: 'none', display: 'flex', alignItems: 'center', gap: 16,
  minHeight: 68, padding: '0 26px',
  background: 'var(--surface)', borderBottom: '1px solid var(--border)',
};

const refreshBtn = {
  display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px',
  borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)',
  fontSize: 12.5, fontWeight: 700,
};

const card = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 18, boxShadow: 'var(--shadowSm)', overflow: 'hidden',
};

const tagPill = {
  fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 7, flex: 'none',
};

const tableHead = {
  display: 'grid', gap: 12, minWidth: 860, padding: '12px 18px',
  background: 'var(--bg)', borderBottom: '1px solid var(--border)',
  fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em',
};

const tableRow = {
  display: 'grid', gap: 12, minWidth: 860, alignItems: 'center',
  padding: '13px 18px', borderBottom: '1px solid var(--border)', fontSize: 13,
};

const emptyBox = {
  padding: '40px 18px', textAlign: 'center', fontSize: 13, color: 'var(--muted)',
};

const riskPill = {
  position: 'absolute', left: 14, bottom: 12,
  display: 'flex', alignItems: 'center', gap: 7, height: 26, padding: '0 11px',
  borderRadius: 999, background: 'rgba(255,255,255,.94)', color: '#0B7A48',
  fontSize: 10.5, fontWeight: 800, letterSpacing: '.03em',
};

const docRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: 'var(--bg)', borderRadius: 12, padding: '11px 12px',
};

const docIcon = {
  width: 28, height: 28, borderRadius: 8, background: 'var(--surface)',
  border: '1px solid var(--border)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flex: 'none',
};

const noteBox = {
  display: 'flex', gap: 9, background: 'var(--bg)', borderRadius: 12, padding: 12,
  fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45,
};

const textarea = {
  width: '100%', marginTop: 8, padding: '10px 12px', borderRadius: 12,
  border: '1px solid var(--border)', background: 'var(--bg)',
  fontSize: 13, resize: 'vertical', outline: 'none',
};

const approveBtn = {
  width: '100%', height: 46, borderRadius: 14,
  background: 'var(--green)', color: '#fff', fontSize: 13.5, fontWeight: 800,
};

const rejectBtn = {
  flex: 1, height: 44, borderRadius: 13,
  border: '1px solid rgba(255,68,31,.3)', color: 'var(--primary)',
  fontSize: 12.5, fontWeight: 800,
};

const secondaryBtn = {
  flex: 1, height: 44, borderRadius: 13,
  border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
};

const dataModeBox = {
  display: 'flex', gap: 9, alignItems: 'flex-start',
  background: 'var(--bg)', borderRadius: 12, padding: 12,
};

const errorBox = {
  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
  padding: '14px 16px', borderRadius: 14,
  background: '#FFF0ED', color: 'var(--primary)', fontSize: 13,
};

const toastBox = {
  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', alignItems: 'center', gap: 9,
  color: '#fff', padding: '13px 20px', borderRadius: 14,
  fontSize: 13.5, fontWeight: 700, boxShadow: 'var(--shadow)',
  animation: 'up .25s ease both', zIndex: 200,
};
