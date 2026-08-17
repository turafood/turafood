'use client';

/**
 * ENTRADA ÚNICA DE app.turafood.com
 *
 * Negocios y repartidores entran por la misma puerta. Quién es cada
 * quien lo decide el servidor leyendo `profiles.role` (ver src/proxy.js);
 * esta pantalla solo autentica.
 *
 * El panel oscuro de la izquierda es el del mockup de Negocios
 * (línea 79), con el texto ajustado para cubrir los dos públicos.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';

const PERKS = [
  { icon: 'storefront', text: 'Tu catálogo publicado el mismo día, sin desarrollo ni app propia.' },
  { icon: 'two_wheeler', text: 'Usa repartidores Tura o tu propia flota, tú decides por pedido.' },
  { icon: 'account_balance', text: 'Consignación semanal los viernes, con reporte de comisiones al detalle.' },
  { icon: 'insights', text: 'Reportes de ventas, productos top y horas de mayor demanda.' },
];

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured()) {
      setError('Supabase todavía no está conectado en este entorno.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        // No revelamos si el correo existe o no.
        setError('Correo o contraseña incorrectos.');
        return;
      }
      // El proxy lee el rol y manda a /negocio o a /repartidor.
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      {/* Panel de marca — solo en escritorio */}
      <aside className="desktop-only" style={S.brand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={S.logo}>t</div>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em' }}>
              TuraFood
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.05em' }}>
              NEGOCIOS Y REPARTIDORES
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', maxWidth: 430 }}>
          <div style={S.brandTitle}>Vende en línea en todo Buenaventura.</div>
          <div style={S.brandSub}>
            Restaurantes, farmacias, minimercados y licoreras. Publica tu catálogo,
            recibe pedidos y cobra sin montar tu propia app.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 34 }}>
            {PERKS.map((p) => (
              <div key={p.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={S.perkIcon}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>{p.icon}</span>
                </span>
                <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.86)', paddingTop: 4 }}>
                  {p.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 40, fontSize: 12, color: 'rgba(255,255,255,.36)' }}>
          Aprobación en menos de 24 horas · Sin costo de instalación
        </div>
      </aside>

      {/* Formulario */}
      <main style={S.formWrap}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div className="mobile-only" style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 30 }}>
            <div style={{ ...S.logo, background: 'var(--primary)' }}>t</div>
            <div>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18 }}>TuraFood</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.08em' }}>
                NEGOCIOS Y REPARTIDORES
              </div>
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 29, letterSpacing: '-.02em' }}>
            Entra a tu cuenta
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
            Con el mismo correo entras a tu negocio o a tu cuenta de repartidor.
            Te llevamos al panel que te corresponde.
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
            <label style={{ display: 'block' }}>
              <span style={S.label}>Correo</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                style={S.input}
              />
            </label>

            <label style={{ display: 'block' }}>
              <span style={S.label}>Contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                style={S.input}
              />
            </label>

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 18 }}>error</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={busy} className="md3-btn" style={S.submit}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div style={S.divider}>
            <span style={S.dividerLine} />
            <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 700 }}>¿AÚN NO TIENES CUENTA?</span>
            <span style={S.dividerLine} />
          </div>

          <button onClick={() => router.push('/registro')} className="md3-btn" style={S.secondary}>
            <span className="ms" style={{ fontSize: 19 }}>add_business</span>
            Registrar mi negocio
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 18 }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>two_wheeler</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              ¿Quieres ser repartidor? Escríbenos por WhatsApp al 316 000 0000 y te
              pasamos los requisitos. Nosotros te creamos la cuenta.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

const S = {
  page: {
    display: 'flex',
    minHeight: '100dvh',
    background: 'var(--bg)',
  },
  brand: {
    flex: 'none',
    width: '44%',
    maxWidth: 620,
    background: '#17140F',
    color: '#fff',
    padding: '52px 56px',
    flexDirection: 'column',
  },
  logo: {
    width: 40, height: 40, borderRadius: 13, background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, color: '#fff',
  },
  brandTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38,
    lineHeight: 1.08, letterSpacing: '-.025em', textWrap: 'balance',
  },
  brandSub: {
    marginTop: 16, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,.62)',
  },
  perkIcon: {
    width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  formWrap: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', overflowY: 'auto', background: 'var(--bg)',
  },
  label: {
    display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7,
  },
  input: {
    width: '100%', height: 50, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 15px', fontSize: 16, outline: 'none',
  },
  submit: {
    height: 52, borderRadius: 15, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15, boxShadow: '0 10px 24px rgba(255,68,31,.3)', marginTop: 4,
  },
  secondary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 52, borderRadius: 15, border: '1px solid var(--border)',
    background: 'var(--surface)', fontWeight: 700, fontSize: 14.5,
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '26px 0 16px',
  },
  dividerLine: { flex: 1, height: 1, background: 'var(--border)' },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600,
  },
};
