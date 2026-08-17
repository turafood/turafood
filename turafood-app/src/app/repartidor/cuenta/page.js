'use client';

/**
 * CUENTA DEL REPARTIDOR
 * Conversión de `isAccount` (línea 703) del mockup del Repartidor.
 *
 * El estado de la cuenta sale de `courier_profiles.approval_status`,
 * que es lo que mueve el Super Admin al aprobar a un repartidor.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRider } from '../RiderContext';

const APPROVAL = {
  pending_review: {
    label: 'En revisión', color: '#A8730B', dot: 'var(--amber)', icon: 'schedule',
    note: 'Estamos revisando tus documentos. Te avisamos apenas quede aprobada; mientras tanto no vas a recibir pedidos.',
  },
  active: {
    label: 'Activa', color: 'var(--green)', dot: 'var(--green)', icon: 'check',
    note: 'Tu cuenta está aprobada. Conéctate desde Inicio para empezar a recibir pedidos.',
  },
  rejected: {
    label: 'Rechazada', color: 'var(--primary)', dot: 'var(--primary)', icon: 'close',
    note: 'Tu solicitud fue rechazada. Escríbenos para saber qué corregir.',
  },
  suspended: {
    label: 'Suspendida', color: 'var(--muted)', dot: 'var(--faint)', icon: 'pause',
    note: 'Tu cuenta está suspendida. Contáctanos para revisar tu caso.',
  },
};

const VEHICLE = {
  motorcycle: 'Moto', bicycle: 'Bicicleta', car: 'Carro',
};

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function CuentaPage() {
  const router = useRouter();
  const { courier, online } = useRider();
  const [busy, setBusy] = useState(false);

  const st = APPROVAL[courier?.approval_status] ?? APPROVAL.pending_review;

  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <>
      <header style={S.header}>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
          Cuenta
        </span>
      </header>

      <div className="sc" style={S.scroll}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={S.avatar}>{initials(courier?.profile?.full_name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
              {courier?.profile?.full_name ?? 'Repartidor'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {courier?.created_at
                ? `Repartidor desde ${new Date(courier.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
                : 'Repartidor en TuraFood'}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, marginTop: 18 }}>
          {[
            { value: Number(courier?.profile?.rating ?? 5).toFixed(1).replace('.', ','), label: 'Calificación' },
            { value: (courier?.total_deliveries ?? 0).toLocaleString('es-CO'), label: 'Entregas' },
            { value: `${Math.round(courier?.acceptance_rate ?? 100)}%`, label: 'Aceptación' },
          ].map((p) => (
            <div key={p.label} style={S.stat}>
              <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
                {p.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 3 }}>{p.label}</div>
            </div>
          ))}
        </div>

        {/* Estado de la cuenta */}
        <div style={S.card}>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
            Estado de tu cuenta
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 13 }}>
            <span style={{ ...S.dot, background: st.dot }}>
              <span className="ms" style={{ fontSize: 16, color: '#fff' }}>{st.icon}</span>
            </span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>Verificación</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color }}>{st.label}</span>
          </div>

          <div
            style={{
              ...S.note,
              background: courier?.approval_status === 'active' ? '#E6F6EE' : '#FFF7E6',
              color: courier?.approval_status === 'active' ? '#0B7A48' : '#7A5405',
            }}
          >
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>
              {courier?.approval_status === 'active' ? 'verified' : 'schedule'}
            </span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>
              {courier?.rejection_reason || st.note}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div style={S.rowsCard}>
          <Row icon="two_wheeler" label="Mi vehículo" value={`${VEHICLE[courier?.vehicle_type] ?? '—'}${courier?.plate ? ` · ${courier.plate}` : ''}`} />
          <Row icon="call" label="Teléfono" value={courier?.profile?.phone ?? '—'} />
          <Row icon="bolt" label="Conexión" value={online ? 'En línea' : 'Desconectado'} />
          <Row icon="map" label="Zona de trabajo" value="Buenaventura" last />
        </div>

        <a href="https://wa.me/573137594713" target="_blank" rel="noopener noreferrer" style={S.support}>
          <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>headset_mic</span>
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>Ayuda y soporte</span>
          <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
        </a>

        <button onClick={signOut} disabled={busy} style={S.signOut}>
          {busy ? 'Saliendo…' : 'Cerrar sesión'}
        </button>

        <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--faint)', marginTop: 14 }}>
          TuraFood Repartidor · v1.0.0
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value, last }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '15px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <span className="ms" style={{ fontSize: 22, color: 'var(--muted)', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{label}</span>
      <span className="tr1" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, maxWidth: '50%', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

const S = {
  header: { flex: 'none', padding: '18px 20px 10px' },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 20px 108px', minHeight: 0 },
  avatar: {
    width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22,
    color: 'var(--muted)', flex: 'none',
  },
  stat: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: 14, textAlign: 'center', boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 18, marginTop: 16, boxShadow: 'var(--shadowSm)',
  },
  dot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: { display: 'flex', gap: 9, marginTop: 14, borderRadius: 12, padding: 12 },
  rowsCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    marginTop: 16, padding: '4px 16px', boxShadow: 'var(--shadowSm)',
  },
  support: {
    display: 'flex', alignItems: 'center', gap: 13, marginTop: 16, padding: '15px 16px',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    boxShadow: 'var(--shadowSm)', textDecoration: 'none', color: 'var(--text)',
  },
  signOut: {
    width: '100%', height: 50, borderRadius: 16, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--primary)', fontWeight: 700,
    fontSize: 14.5, marginTop: 16,
  },
};
