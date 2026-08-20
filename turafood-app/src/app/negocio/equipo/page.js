'use client';

/**
 * EQUIPO Y CUENTA
 * Conversión de `isTeam` (línea 850) del mockup de Negocios.
 *
 * Estado de verificación, plan y cierre de sesión. La verificación no
 * es decorativa: sale de `business_profiles.status`, que es lo que
 * mueve el Super Admin al aprobar el negocio.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import { createClient } from '@/utils/supabase/client';
import { isPaymentAvailable, openSubscriptionCheckout } from '@/services/payment/epayco';
import { useBiz } from '../BizContext';
import HeaderHero from '../../components/HeaderHero';

const PRO_INTRO = 9990;
const PRO_REGULAR = 59990;
const PRO_INTRO_MONTHS = 3;

const VERIFICATION = {
  pending_review: {
    label: 'En revisión', color: '#FFB57A', dot: 'var(--amber)', icon: 'schedule',
    note: 'Estamos revisando tus documentos. Mientras tanto puedes vender con un límite de 20 pedidos diarios.',
  },
  active: {
    label: 'Aprobado', color: '#7BE8B0', dot: 'var(--green)', icon: 'check',
    note: 'Tu negocio está aprobado y visible en la app de clientes.',
  },
  rejected: {
    label: 'Rechazado', color: '#FF7A4D', dot: 'var(--primary)', icon: 'close',
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
  
  // Efecto "vivo"
  const [liveDot, setLiveDot] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setLiveDot(v => !v), 2000);
    return () => clearInterval(timer);
  }, []);

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
      toast('Abriendo pasarela de pago...');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    toast('Cerrando sesión segura...');
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <>
      <style>{`
        .glass-panel {
          background: rgba(20,20,20,0.65);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 28px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 26px;
        }
        .golden-glow {
          background: linear-gradient(158deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.9) 100%);
          border: 1px solid rgba(217,154,21,0.25);
          box-shadow: 0 12px 30px rgba(217,154,21,0.1), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        @keyframes pulse-dot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-active { animation: pulse-dot 2s infinite; }
      `}</style>
      
      <HeaderHero
        title="Equipo y Ajustes"
        subtitle="Administra tu perfil, verificación y sube de nivel con Tura Growth."
        images={[
          'https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 16, alignItems: 'start' }}>
        {/* Cuenta */}
        <section className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={S.avatar}>
              {initials(business?.name)}
              {/* Dot vivo indicando que el panel está sincronizado */}
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div className="pulse-active" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
              </div>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="tr1" style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>
                {business?.name ?? '—'}
              </span>
              <span style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                {VERTICAL_LABEL[business?.vertical] ?? 'Negocio'} · Administrador Maestro
              </span>
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 24 }}>
            <Row icon="location_on" label="Dirección" value={business?.address ?? '—'} />
            <Row icon="call" label="Teléfono" value={business?.phone ?? '—'} />
            <Row icon="schedule" label="Preparación" value={`${business?.prep_time_min ?? 25} min`} />
            <Row icon="star" label="Calificación" value={`${Number(business?.rating ?? 5).toFixed(1).replace('.', ',')} · ${business?.reviews_count ?? 0} reseñas`} last />
          </div>

          <div style={S.teamNote}>
            <span className="ms pulse-active" style={{ fontSize: 18, color: '#FFB57A', flex: 'none' }}>group</span>
            <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              Las cuentas por rol (caja, cocina, solo lectura) llegarán en la versión PRO 2.0. Por ahora, el administrador tiene control total.
            </span>
          </div>

          <button onClick={signOut} style={S.signOut}>Cerrar sesión segura</button>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Verificación */}
          <section className="glass-panel">
            <div style={S.cardTitle}>Estado de verificación</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
              <span style={{ ...S.dot, background: `color-mix(in srgb, ${st.color} 20%, transparent)` }}>
                <span className="ms pulse-active" style={{ fontSize: 16, color: st.color }}>{st.icon}</span>
              </span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#fff' }}>Tu negocio en TuraFood</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: st.color, background: `color-mix(in srgb, ${st.color} 15%, transparent)`, padding: '4px 10px', borderRadius: 99 }}>{st.label}</span>
            </div>

            <div
              style={{
                ...S.statusNote,
                background: business?.status === 'active' ? 'rgba(11,142,84,0.1)' : 'rgba(255,181,122,0.1)',
                border: `1px solid ${business?.status === 'active' ? 'rgba(11,142,84,0.2)' : 'rgba(255,181,122,0.2)'}`,
                color: business?.status === 'active' ? '#7BE8B0' : '#FFB57A',
              }}
            >
              <span className="ms pulse-active" style={{ fontSize: 18, flex: 'none' }}>
                {business?.status === 'active' ? 'verified' : 'sync'}
              </span>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                {business?.rejection_reason || st.note}
              </span>
            </div>
          </section>

          {/* Plan */}
          <section className="glass-panel golden-glow">
            <div style={{ ...S.cardTitle, color: '#F2D399' }}>Tu Plan Premium</div>

            {isPro ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
                  <span className="ms ms-fill pulse-active" style={{ fontSize: 24, color: '#D99A15' }}>stars</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Biz Pro</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginTop: 8 }}>
                  Sin comisión por pedido: pagas solo la mensualidad. Todo lo que vendes es tuyo.
                </div>
                <div style={S.planRows}>
                  <PlanRow label="Comisión por pedido" value="0%" />
                  <PlanRow label="Mensualidad" value={`${cop(PRO_INTRO)} / mes`} />
                  {business?.pro_plan_expires_at && (
                     <PlanRow label="Siguiente cobro" value={new Date(business.pro_plan_expires_at).toLocaleDateString('es-CO')} />
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 16 }}>
                  <span className="ms" style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)' }}>storefront</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Plan Starter (Por Comisión)</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginTop: 8 }}>
                  Pagas {rate}% de comisión por cada pedido entregado. 
                  {business?.vertical === 'pharmacy' || business?.vertical === 'liquor' ? ' Farmacias y licoreras 15%.' : ''}
                </div>

                <div style={S.proOffer}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms ms-fill pulse-active" style={{ fontSize: 22, color: '#D99A15' }}>stars</span>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, color: '#F2D399', letterSpacing: '-0.02em' }}>
                      Sube a Biz Pro
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 32, color: '#fff', letterSpacing: '-0.03em' }}>
                      {cop(PRO_INTRO)}
                    </span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>/ mes</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginTop: 8 }}>
                    Los primeros {PRO_INTRO_MONTHS} meses. Después {cop(PRO_REGULAR)} al mes.
                    <br/><b style={{ color: '#fff' }}>Dejas de pagar el {rate}% por pedido hoy mismo.</b>
                  </div>
                  <button onClick={subscribe} disabled={busy} style={S.subscribe}>
                    {busy ? 'Estableciendo conexión segura…' : `Activar PRO por ${cop(PRO_INTRO)}`}
                  </button>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.45, marginTop: 12 }}>
                    El plan se activa cuando la pasarela confirma el pago de forma automática.
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
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="ms" style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)', flex: 'none' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      <span className="tr1" style={{ fontSize: 13.5, color: '#fff', fontWeight: 700, maxWidth: '55%', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

function PlanRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '4px 0' }}>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 800, color: '#fff' }}>{value}</span>
    </div>
  );
}

const S = {
  cardTitle: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', color: '#fff' },
  avatar: {
    position: 'relative',
    width: 68, height: 68, borderRadius: 22, 
    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, flex: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)'
  },
  dot: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statusNote: {
    display: 'flex', gap: 12, marginTop: 22, borderRadius: 18, padding: 18,
  },
  teamNote: {
    display: 'flex', gap: 12, marginTop: 24, background: 'rgba(0,0,0,0.3)',
    borderRadius: 18, padding: 18, border: '1px solid rgba(255,255,255,0.05)',
  },
  signOut: {
    width: '100%', height: 54, borderRadius: 18, border: '1px solid rgba(255,68,31,0.3)',
    background: 'rgba(255,68,31,0.05)', color: '#FFB0A0', fontWeight: 800, fontSize: 15, 
    marginTop: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer', transition: 'all 0.3s'
  },
  planRows: {
    display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20,
    paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  proOffer: {
    marginTop: 24, padding: 26, borderRadius: 22,
    background: 'linear-gradient(145deg, rgba(217, 154, 21, 0.15) 0%, rgba(217, 154, 21, 0.02) 100%)',
    border: '1px solid rgba(217, 154, 21, 0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  subscribe: {
    width: '100%', height: 56, borderRadius: 18, background: 'linear-gradient(120deg, #D99A15, #F2D399)',
    color: '#000', fontWeight: 800, fontSize: 15, marginTop: 20,
    boxShadow: '0 12px 30px rgba(217,154,21,0.4)', cursor: 'pointer', border: 'none'
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '16px 20px',
    borderRadius: 18, background: 'rgba(255,68,31,0.15)', color: '#FFB0A0', fontSize: 14, fontWeight: 700,
    border: '1px solid rgba(255,68,31,0.3)'
  },
};

