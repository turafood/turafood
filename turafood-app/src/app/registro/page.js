'use client';

/**
 * ALTA DE NEGOCIO — corta a propósito
 *
 * Antes eran 4 pasos con documentos y cuenta bancaria ANTES de poder
 * entrar. Quien no tenía el RUT a mano cerraba la pestaña y no volvía.
 *
 * Ahora esta pantalla no pide NADA: solo eliges con qué entras. El
 * nombre del negocio se pregunta en /registro/completar, cuando la
 * sesión ya existe — un solo campo, imposible de abandonar a medias.
 *
 * Sin correo y contraseña a propósito: era el paso donde más gente se
 * caía (contraseña débil, correo mal escrito, confirmación que nunca
 * llega). Google, Facebook y el celular no fallan en eso.
 *
 * Quien crea la ficha es `register_business()` en la base: resuelve el
 * slug único y pone el rol. La pantalla no inventa identificadores.
 */

import { useState } from 'react';
import Link from 'next/link';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';

const PERKS = [
  ['storefront', 'Publicas tu catálogo el mismo día'],
  ['sports_motorsports', 'Repartidores Tura o tu propia flota'],
  ['payments', 'Consignación semanal, todos los viernes'],
];

const OTP_CHANNEL = 'sms';

export default function RegistroPage() {
  const [mode, setMode] = useState('choose');   // choose | phone | otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const guard = () => {
    if (isConfigured()) return true;
    setError('Supabase todavía no está conectado en este entorno.');
    return false;
  };

  const withProvider = async (provider) => {
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      // Volvemos a /registro/completar, que termina de crear la ficha
      // con el nombre del negocio una vez la sesión ya existe.
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/registro/completar` },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const sendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const { error: otpError } = await createClient().auth.signInWithOtp({
        phone: `+57${phone}`,
        options: { channel: OTP_CHANNEL },
      });
      if (otpError) throw new Error(otpError.message);
      setMode('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await createClient().auth.verifyOtp({
        phone: `+57${phone}`,
        token: otp,
        type: 'sms',
      });
      if (verifyError) throw new Error('El código no es correcto o ya venció.');
      // Recarga completa para que el proxy vea la sesión nueva
      window.location.assign('/registro/completar');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      <HeroBackdrop
        images={['/images/burger-hero.jpg', '/images/steak-ribeye.jpg', '/images/fried-steak.jpg']}
        brightness={0.3}
      />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          <div style={S.card}>

            <div style={S.brand}>
              <span style={S.logo}>t</span>
              <span>
                <span style={S.brandName}>TuraFood</span>
                <span style={S.brandKicker}>NEGOCIOS</span>
              </span>
            </div>

            {mode === 'choose' && (
              <div className="anim-fade">
                <h1 style={S.title}>Empieza a vender<br />en Buenaventura.</h1>
                <p style={S.subtitle}>
                  Sin formularios. Entras con la cuenta que ya usas y adentro
                  te pedimos una sola cosa: el nombre de tu negocio.
                </p>

                <div style={S.actions}>
                  <button onClick={() => withProvider('google')} disabled={busy} className="md3-btn" style={S.white}>
                    <GoogleMark size={19} />
                    Continuar con Google
                  </button>

                  <button onClick={() => withProvider('facebook')} disabled={busy} className="md3-btn" style={S.facebook}>
                    <FacebookMark size={19} />
                    Continuar con Facebook
                  </button>

                  <button onClick={() => setMode('phone')} className="md3-btn" style={S.ghost}>
                    <span className="ms" style={{ fontSize: 20 }}>smartphone</span>
                    Continuar con mi celular
                  </button>
                </div>

                {error && <Alert text={error} />}

                <ul style={S.perks}>
                  {PERKS.map(([icon, text]) => (
                    <li key={text} style={S.perk}>
                      <span className="ms" style={S.perkIcon}>{icon}</span>
                      {text}
                    </li>
                  ))}
                </ul>

                <p style={S.reassure}>
                  Tu tienda queda activa de inmediato con un tope de 20 pedidos al día.
                  Al aprobar tus documentos se levanta el tope.
                </p>

                <div style={S.footer}>
                  <span style={S.footerText}>¿Ya tienes cuenta?</span>
                  <Link href="/auth" style={S.footerLink}>Inicia sesión</Link>
                </div>
              </div>
            )}

            {mode === 'phone' && (
              <form onSubmit={sendOtp} className="anim-up">
                <BackButton onClick={() => { setMode('choose'); setError(null); }} />
                <h1 style={S.title}>Tu celular</h1>
                <p style={S.subtitle}>Te mandamos un código de 6 dígitos para confirmar.</p>

                <div style={S.phoneRow}>
                  <span style={S.prefix}>+57</span>
                  <input
                    type="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="300 000 0000"
                    style={S.phoneInput}
                  />
                </div>

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={busy || phone.length < 10}
                  className="md3-btn"
                  style={{ ...S.primary, opacity: phone.length < 10 ? 0.5 : 1 }}
                >
                  {busy ? 'Enviando…' : 'Enviar código'}
                </button>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={verifyOtp} className="anim-up">
                <BackButton onClick={() => { setMode('phone'); setError(null); }} />
                <h1 style={S.title}>Confirma tu número</h1>
                <p style={S.subtitle}>Escribe el código que enviamos al +57 {phone}.</p>

                <input
                  type="text"
                  inputMode="numeric"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={S.otp}
                />

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={busy || otp.length < 6}
                  className="md3-btn"
                  style={{ ...S.primary, opacity: otp.length < 6 ? 0.5 : 1 }}
                >
                  {busy ? 'Confirmando…' : 'Continuar'}
                </button>
              </form>
            )}
          </div>

          <p style={S.legal}>
            Al continuar aceptas los Términos y la Política de privacidad de TuraFood.
          </p>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} style={S.back} aria-label="Volver">
      <span className="ms" style={{ fontSize: 19 }}>arrow_back</span>
    </button>
  );
}

function Alert({ text }) {
  return (
    <div style={S.alert}>
      <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
      <span>{text}</span>
    </div>
  );
}

const S = {
  page: { position: 'relative', minHeight: '100dvh', background: '#080706', color: '#fff' },
  scroller: {
    position: 'relative', zIndex: 2, minHeight: '100dvh', maxHeight: '100dvh',
    overflowY: 'auto', display: 'flex',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 404, padding: '36px 20px 28px' },
  card: {
    background: 'rgba(18,17,15,.62)',
    backdropFilter: 'blur(46px) saturate(150%)',
    WebkitBackdropFilter: 'blur(46px) saturate(150%)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 28,
    padding: '30px 28px',
    boxShadow: '0 36px 90px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.14)',
    animation: 'pop .45s cubic-bezier(.2,0,0,1) both',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  logo: {
    width: 34, height: 34, borderRadius: 11, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    boxShadow: '0 5px 16px rgba(255,68,31,.45)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17, letterSpacing: '-.02em', lineHeight: 1.1,
  },
  brandKicker: {
    display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em',
    color: 'rgba(255,255,255,.42)', marginTop: 2,
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 27, lineHeight: 1.12, letterSpacing: '-.03em', textWrap: 'balance',
  },
  subtitle: {
    margin: '9px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,.6)',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 9, marginTop: 24 },
  white: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 50, borderRadius: 14, background: '#fff',
    color: 'var(--ink)', fontWeight: 700, fontSize: 14.5,
  },
  facebook: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 50, borderRadius: 14, background: '#1877F2',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  ghost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 50, borderRadius: 14,
    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 50, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 18,
    boxShadow: '0 10px 26px rgba(255,68,31,.36)',
  },
  perks: {
    listStyle: 'none', margin: '24px 0 0', padding: '18px 0 0',
    borderTop: '1px solid rgba(255,255,255,.09)',
    display: 'flex', flexDirection: 'column', gap: 11,
  },
  perk: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 12.5, color: 'rgba(255,255,255,.72)',
  },
  perkIcon: { fontSize: 17, color: 'var(--primary)', flex: 'none' },
  reassure: {
    margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.5,
    color: 'rgba(255,255,255,.4)',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 20, paddingTop: 17, borderTop: '1px solid rgba(255,255,255,.09)',
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 13, color: 'rgba(255,255,255,.5)' },
  footerLink: { fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' },
  back: {
    width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.09)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', marginBottom: 18,
  },
  phoneRow: {
    display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 15px',
    borderRadius: 14, marginTop: 20, background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.14)',
  },
  prefix: { fontWeight: 700, color: 'rgba(255,255,255,.5)', flex: 'none' },
  phoneInput: {
    flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: 17, fontWeight: 600,
  },
  otp: {
    width: '100%', height: 64, borderRadius: 16, marginTop: 20,
    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontSize: 27, fontWeight: 800, letterSpacing: '.26em',
    textAlign: 'center', outline: 'none',
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 13, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.32)', color: '#FFC7BA',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
  },
  legal: {
    margin: '18px 0 0', textAlign: 'center', fontSize: 11,
    lineHeight: 1.5, color: 'rgba(255,255,255,.32)',
  },
};
