'use client';

/**
 * TURA PLUS
 * Conversión 1:1 de `isPlus` (línea 1565) del mockup del cliente.
 *
 * Dos caras según el estado del usuario:
 *   · suscrito     → resumen del plan, ahorro y beneficios
 *   · no suscrito  → oferta con el precio introductorio y alta
 *
 * Precios reales del negocio: $9.990 los primeros 3 meses y luego
 * $19.990 (ver subscription_plans en el esquema).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { cop } from '@/lib/format';
const PRICE_INTRO = 9990;
const PRICE_REGULAR = 19990;
const INTRO_MONTHS = 3;

const PERKS = [
  { icon: 'electric_moped', text: 'Envíos gratis ilimitados en todos tus pedidos, sin monto mínimo.' },
  { icon: 'savings', text: 'Descuento en la tarifa de servicio de cada pedido.' },
  { icon: 'local_activity', text: 'Precios y cupones exclusivos en negocios seleccionados del puerto.' },
  { icon: 'support_agent', text: 'Soporte prioritario: tus casos se atienden primero.' },
];

export default function PlusPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConfigured()) {
          // Sin base de datos mostramos la clienta del mockup, ya suscrita
          if (alive) setProfile({ full_name: 'Sharick', tura_plus: true, tura_plus_expires_at: null });
          return;
        }
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setProfile(null);
          return;
        }
        const { data } = await supabase
          .from('profiles')
          .select('full_name, tura_plus, tura_plus_expires_at')
          .eq('id', user.id)
          .maybeSingle();
        if (alive) setProfile(data);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isPlus = Boolean(profile?.tura_plus);
  const firstName = (profile?.full_name ?? '').split(' ')[0];

  const nextCharge = profile?.tura_plus_expires_at
    ? new Date(profile.tura_plus_expires_at).toLocaleDateString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    : '—';

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.push('/account')} style={S.backBtn} aria-label="Volver a la cuenta">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 40px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 27, letterSpacing: '-.02em' }}>
            {loading ? 'Tura Plus' : firstName ? `Hola, ${firstName}` : 'Tura Plus'}
          </div>

          {/* Estado del plan */}
          {isPlus ? (
            <div style={S.planCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="ms ms-fill" style={{ fontSize: 21, color: '#D99A15' }}>verified</span>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20 }}>Tura Plus</span>
              </div>
              <div style={S.planRows}>
                <Row label="Periodo" value="Mensual" />
                <Row label="Precio" value={cop(PRICE_INTRO)} />
                <Row label="Siguiente cobro" value={nextCharge} />
              </div>
            </div>
          ) : (
            <div style={S.offerCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="ms ms-fill" style={{ fontSize: 21, color: '#D99A15' }}>verified</span>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20 }}>Tura Plus</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30 }}>
                  {cop(PRICE_INTRO)}
                </span>
                <span style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 700 }}>/ mes</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.45 }}>
                Los primeros {INTRO_MONTHS} meses. Después {cop(PRICE_REGULAR)} al mes.
                Cancelas cuando quieras.
              </div>
            </div>
          )}

          {/* Ahorro */}
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20, marginTop: 24 }}>
            {isPlus ? 'Tus beneficios' : 'Lo que te ahorras'}
          </div>

          <div style={S.savingsCard}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 40, letterSpacing: '-.03em' }}>
              {cop(68400)}
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.4, marginTop: 6, color: 'rgba(255,255,255,.9)' }}>
              Es lo que ahorra en promedio un usuario Plus cada mes
            </div>
          </div>

          {isPlus && (
            <div style={S.ordersRow}>
              <span className="ms" style={{ fontSize: 17 }}>shopping_bag</span>
              PEDIDOS ESTE MES
              <span style={S.ordersCount}>7</span>
            </div>
          )}

          {/* Beneficios */}
          <div style={S.perksCard}>
            {PERKS.map((p, i) => (
              <div
                key={p.icon}
                style={{
                  display: 'flex', gap: 13, alignItems: 'flex-start', padding: '16px 0',
                  borderBottom: i === PERKS.length - 1 ? 'none' : '1px solid var(--border)',
                }}
              >
                <span className="ms" style={{ fontSize: 24, color: 'var(--primary)', flex: 'none' }}>{p.icon}</span>
                <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>{p.text}</span>
              </div>
            ))}
          </div>

          {isPlus ? (
            <button style={S.manageBtn}>Gestionar suscripción</button>
          ) : (
            <>
              <button onClick={() => router.push('/plus/checkout')} style={S.subscribeBtn}>
                Suscribirme por {cop(PRICE_INTRO)} al mes
              </button>
              <div style={S.legal}>
                Se renueva automáticamente cada mes. Puedes cancelar en cualquier
                momento desde tu cuenta.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  planCard: {
    marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 18,
  },
  offerCard: {
    marginTop: 16, background: '#FFFBF2', border: '1px solid #F0C97A',
    borderRadius: 20, padding: 18,
  },
  planRows: {
    display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16,
    paddingTop: 16, borderTop: '1px solid var(--border)',
  },
  savingsCard: {
    marginTop: 12, borderRadius: 28,
    background: 'linear-gradient(135deg,#FF7A3D,#FF441F)',
    padding: '28px 20px', textAlign: 'center', color: '#fff',
  },
  ordersRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 14, fontSize: 11.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.04em',
  },
  ordersCount: {
    minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
    background: 'var(--amber)', color: '#17140F',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5,
  },
  perksCard: {
    marginTop: 24, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '6px 18px',
  },
  manageBtn: {
    width: '100%', height: 54, borderRadius: 999, background: 'var(--surface)',
    border: '1px solid var(--border)', color: 'var(--muted)',
    fontWeight: 700, fontSize: 14, marginTop: 18,
  },
  subscribeBtn: {
    width: '100%', height: 56, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15.5, marginTop: 18,
    boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  legal: {
    fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45,
    textAlign: 'center', marginTop: 12, padding: '0 10px',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
