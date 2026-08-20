'use client';

/**
 * EQUIPO Y CUENTA
 * Conversión de `isTeam` (línea 850) del mockup de Negocios.
 *
 * Estado de verificación, plan y cierre de sesión. La verificación no
 * es decorativa: sale de `business_profiles.status`, que es lo que
 * mueve el Super Admin al aprobar el negocio.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import { createClient } from '@/utils/supabase/client';
import { isPaymentAvailable, openSubscriptionCheckout } from '@/services/payment/epayco';
import { useBiz } from '../BizContext';

/** Precios reales del negocio (restaurant_plans, código SUBSCRIPTION) */
const PRO_INTRO = 9990;
const PRO_REGULAR = 59990;
const PRO_INTRO_MONTHS = 3;

const VERIFICATION = {
  pending_review: {
    label: 'En revisión', color: '#A8730B', dot: 'var(--amber)', icon: 'schedule',
    note: 'Estamos revisando tus documentos. Mientras tanto puedes vender con un límite de 20 pedidos diarios.',
  },
  active: {
    label: 'Aprobado', color: 'var(--green)', dot: 'var(--green)', icon: 'check',
    note: 'Tu negocio está aprobado y visible en la app de clientes.',
  },
  rejected: {
    label: 'Rechazado', color: 'var(--primary)', dot: 'var(--primary)', icon: 'close',
    note: 'Tu solicitud fue rechazada. Escríbenos para saber qué corregir.',
  },
  suspended: {
    label: 'Suspendido', color: 'var(--muted)', dot: 'var(--faint)', icon: 'pause',
    note: 'Tu cuenta está suspendida. No apareces en la app hasta que se resuelva.',
  },
  closed: {
    label: 'Cerrado', color: 'var(--muted)', dot: 'var(--faint)', icon: 'block',
    note: 'Tu negocio está cerrado en la plataforma.',
  },
};

const VERTICAL_LABEL = {
  restaurant: 'Restaurante', pharmacy: 'Farmacia', market: 'Minimercado',
  liquor: 'Licorera', store: 'Tienda', turbo: 'Turbo', boat: 'Lanchas',
};

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function EquipoPage() {
  const router = useRouter();
  const { business, toast } = useBiz();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const st = VERIFICATION[business?.status] ?? VERIFICATION.pending_review;
  const isPro = Boolean(business?.pro_plan)
    && (!business?.pro_plan_expires_at || new Date(business.pro_plan_expires_at) > new Date());
  const rate = Math.round((business?.commission_rate ?? 0.1) * 100);

  const subscribe = async () => {
    setError(null);
    if (!isPaymentAvailable()) {
      setError('El pago en línea todavía no está habilitado en este entorno.');
      return;
    }
    setBusy(true);
    try {
      await openSubscriptionCheckout({
        kind: 'BUSINESS_PRO',
        subjectId: business.id,
        amount: PRO_INTRO,
        name: 'TuraFood Biz Pro',
        description: `Suscripción mensual · ${business.name}`,
        returnPath: '/negocio/equipo',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <>
      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, alignItems: 'start' }}>
        {/* Cuenta */}
        <section style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={S.avatar}>{initials(business?.name)}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="tr1" style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19 }}>
                {business?.name ?? '—'}
              </span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                {VERTICAL_LABEL[business?.vertical] ?? 'Negocio'} · Administrador
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 18 }}>
            <Row icon="location_on" label="Dirección" value={business?.address ?? '—'} />
            <Row icon="call" label="Teléfono" value={business?.phone ?? '—'} />
            <Row icon="schedule" label="Tiempo de preparación" value={`${business?.prep_time_min ?? 25} min`} />
            <Row icon="star" label="Calificación" value={`${Number(business?.rating ?? 5).toFixed(1).replace('.', ',')} · ${business?.reviews_count ?? 0} reseñas`} last />
          </div>

          <div style={S.teamNote}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>group</span>
            <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              Por ahora cada negocio entra con una sola cuenta. Los usuarios por rol
              (caja, cocina, solo lectura) llegan en la siguiente versión.
            </span>
          </div>

          <button onClick={signOut} style={S.signOut}>Cerrar sesión</button>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verificación */}
          <section style={S.card}>
            <div style={S.cardTitle}>Estado de verificación</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginTop: 14 }}>
              <span style={{ ...S.dot, background: st.dot }}>
                <span className="ms" style={{ fontSize: 16, color: '#fff' }}>{st.icon}</span>
              </span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>Tu negocio en TuraFood</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: st.color }}>{st.label}</span>
            </div>

            <div
              style={{
                ...S.statusNote,
                background: business?.status === 'active' ? '#E6F6EE' : '#FFF7E6',
                color: business?.status === 'active' ? '#0B7A48' : '#7A5405',
              }}
            >
              <span className="ms" style={{ fontSize: 18, flex: 'none' }}>
                {business?.status === 'active' ? 'verified' : 'schedule'}
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>
                {business?.rejection_reason || st.note}
              </span>
            </div>
          </section>

          {/* Plan */}
          <section style={S.card}>
            <div style={S.cardTitle}>Tu plan</div>

            {isPro ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
                  <span className="ms ms-fill" style={{ fontSize: 20, color: '#D99A15' }}>verified</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Biz Pro</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
                  Sin comisión por pedido: pagas solo la mensualidad. Todo lo que vendes,
                  menos el envío y la tarifa de servicio, es tuyo.
                </div>
                <div style={S.planRows}>
                  <PlanRow label="Comisión por pedido" value="0%" />
                  <PlanRow label="Mensualidad" value={`${cop(PRO_INTRO)} / mes`} />
                  {business?.pro_plan_expires_at && (
                    <PlanRow
                      label="Siguiente cobro"
                      value={new Date(business.pro_plan_expires_at).toLocaleDateString('es-CO')}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12 }}>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>storefront</span>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>Plan por comisión</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
                  Pagas {rate}% de comisión por cada pedido entregado, sin cuota fija.
                  {business?.vertical === 'pharmacy' || business?.vertical === 'liquor'
                    ? ' Farmacias y licoreras tienen 15%.'
                    : ''}
                </div>

                <div style={S.proOffer}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms ms-fill" style={{ fontSize: 19, color: '#D99A15' }}>verified</span>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17 }}>
                      Biz Pro
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 28 }}>
                      {cop(PRO_INTRO)}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>/ mes</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, marginTop: 6 }}>
                    Los primeros {PRO_INTRO_MONTHS} meses. Después {cop(PRO_REGULAR)} al mes.
                    <b style={{ color: 'var(--text)' }}> Dejas de pagar el {rate}% por pedido.</b>
                  </div>
                  <button onClick={subscribe} disabled={busy} style={S.subscribe}>
                    {busy ? 'Abriendo pasarela…' : `Activar por ${cop(PRO_INTRO)} al mes`}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--faint)', lineHeight: 1.45, marginTop: 10 }}>
                    El plan se activa cuando ePayco nos confirma el pago. Si la pantalla
                    todavía dice “por comisión”, recárgala en un minuto.
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value, last }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0',
        borderBottom: last ? 'none' : '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <span className="ms" style={{ fontSize: 22, color: 'var(--muted)', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{label}</span>
      <span className="tr1" style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function PlanRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 800, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

const S = {
  card: {
    background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.04)',
    borderRadius: 28, padding: 26, boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
  },
  cardTitle: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, letterSpacing: '-.01em' },
  avatar: {
    width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, var(--surface2) 0%, var(--bg) 100%)',
    color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, flex: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.04)'
  },
  dot: {
    width: 32, height: 32, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statusNote: {
    display: 'flex', gap: 12, marginTop: 20, borderRadius: 16, padding: 16,
  },
  teamNote: {
    display: 'flex', gap: 12, marginTop: 24, background: 'var(--bg)',
    borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)',
  },
  signOut: {
    width: '100%', height: 50, borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
    background: 'var(--surface)', color: 'var(--primary)', fontWeight: 800, fontSize: 14.5, 
    marginTop: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
  },
  planRows: {
    display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20,
    paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.04)',
  },
  proOffer: {
    marginTop: 20, padding: 22, borderRadius: 20,
    background: 'linear-gradient(145deg, #FFF9EB 0%, #FFFDF8 100%)',
    border: '1px solid #FFE7A0', boxShadow: '0 4px 15px rgba(217, 154, 21, 0.05)',
  },
  subscribe: {
    width: '100%', height: 50, borderRadius: 16, background: '#D99A15',
    color: '#fff', fontWeight: 800, fontSize: 14.5, marginTop: 18,
    boxShadow: '0 8px 24px rgba(217,154,21,.3)',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '14px 16px',
    borderRadius: 16, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13.5, fontWeight: 700,
  },
};
