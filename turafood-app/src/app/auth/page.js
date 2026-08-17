'use client';

/**
 * ENTRADA ÚNICA DE app.turafood.com
 *
 * Negocios y repartidores entran por la misma puerta. Quién es cada
 * quien lo decide el servidor leyendo `profiles.role` (ver src/proxy.js);
 * esta pantalla solo autentica. Por eso lo dice de frente en la
 * cabecera: si no, quien es repartidor duda de si está en el sitio
 * correcto.
 *
 * La pantalla entera hace scroll a propósito. Con el teclado abierto en
 * un celular pequeño el formulario no cabe, y antes quedaba cortado sin
 * forma de bajar.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';

/**
 * Canal del código de un solo uso. Supabase manda SMS con Twilio;
 * si en Twilio activas el remitente de WhatsApp, cambiar esto a
 * 'whatsapp' es lo único que hay que tocar.
 */
const OTP_CHANNEL = 'sms';

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState('choose');   // choose | email | phone | otp
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const guard = () => {
    if (isConfigured()) return true;
    setError('Supabase todavía no está conectado en este entorno.');
    return false;
  };

  /** El proxy lee el rol y manda a /negocio o a /repartidor */
  const enter = () => {
    router.replace('/');
    router.refresh();
  };

  const signInEmail = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // No revelamos si el correo existe: sería una forma de sondear cuentas
      if (authError) setError('Correo o contraseña incorrectos.');
      else enter();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signInWith = async (provider) => {
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/` },
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
      enter();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const back = () => { setMode('choose'); setError(null); };

  return (
    <div style={S.page}>
      <HeroBackdrop />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          <div style={S.card}>

            {/* Marca */}
            <div style={S.brand}>
              <span style={S.logo}>t</span>
              <span>
                <span style={S.brandName}>TuraFood</span>
                <span style={S.brandKicker}>NEGOCIOS Y REPARTIDORES</span>
              </span>
            </div>

            {mode === 'choose' && (
              <div className="anim-fade">
                <h1 style={S.title}>Tu negocio y tu ruta,<br />en la misma app.</h1>
                <p style={S.subtitle}>
                  Recibe pedidos, cobra y reparte en todo Buenaventura.
                </p>

                {/* Lo que la gente pregunta primero: ¿este es mi login? */}
                <div style={S.roles}>
                  <span style={S.roleChip}>
                    <span className="ms" style={{ fontSize: 17 }}>storefront</span>
                    Negocio
                  </span>
                  <span style={S.rolePlus}>+</span>
                  <span style={S.roleChip}>
                    <span className="ms" style={{ fontSize: 17 }}>two_wheeler</span>
                    Repartidor
                  </span>
                </div>
                <p style={S.roleNote}>
                  Un solo acceso para los dos. Al entrar te llevamos al panel que te
                  corresponde.
                </p>

                <div style={S.actions}>
                  <button onClick={() => setMode('email')} className="md3-btn" style={S.primaryBtn}>
                    <span className="ms" style={{ fontSize: 19 }}>mail</span>
                    Continuar con correo
                  </button>

                  <button onClick={() => signInWith('google')} disabled={busy} className="md3-btn" style={S.whiteBtn}>
                    <GoogleMark />
                    Continuar con Google
                  </button>

                  <button onClick={() => signInWith('facebook')} disabled={busy} className="md3-btn" style={S.facebookBtn}>
                    <FacebookMark />
                    Continuar con Facebook
                  </button>

                  <button onClick={() => setMode('phone')} className="md3-btn" style={S.ghostBtn}>
                    <span className="ms" style={{ fontSize: 19 }}>smartphone</span>
                    Continuar con mi celular
                  </button>
                </div>

                {error && <Alert text={error} />}

                <div style={S.divider}>
                  <span style={S.dividerLine} />
                  <span style={S.dividerText}>¿AÚN NO TIENES CUENTA?</span>
                  <span style={S.dividerLine} />
                </div>

                <Link href="/registro" className="md3-btn" style={S.outlineBtn}>
                  <span className="ms" style={{ fontSize: 18 }}>add_business</span>
                  Registrar mi negocio
                </Link>

                <p style={S.riderNote}>
                  ¿Quieres ser repartidor? Escríbenos por WhatsApp al 316 000 0000 y te
                  creamos la cuenta.
                </p>
              </div>
            )}

            {mode === 'email' && (
              <form onSubmit={signInEmail} className="anim-up">
                <BackButton onClick={back} />
                <h1 style={S.stepTitle}>Entra con tu correo</h1>
                <p style={S.stepSub}>El mismo que registraste en TuraFood.</p>

                <Field
                  label="Correo" type="email" value={email} onChange={setEmail}
                  placeholder="tucorreo@ejemplo.com" autoComplete="email" autoFocus
                />
                <Field
                  label="Contraseña" type="password" value={password} onChange={setPassword}
                  placeholder="Tu contraseña" autoComplete="current-password"
                />

                {error && <Alert text={error} />}

                <button type="submit" disabled={busy} className="md3-btn" style={{ ...S.primaryBtn, marginTop: 18 }}>
                  {busy ? 'Entrando…' : 'Entrar'}
                </button>
              </form>
            )}

            {mode === 'phone' && (
              <form onSubmit={sendOtp} className="anim-up">
                <BackButton onClick={back} />
                <h1 style={S.stepTitle}>Tu número de celular</h1>
                <p style={S.stepSub}>Te mandamos un código de 6 dígitos para confirmar.</p>

                <span style={S.label}>Celular</span>
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
                  style={{ ...S.primaryBtn, marginTop: 18, opacity: phone.length < 10 ? 0.55 : 1 }}
                >
                  {busy ? 'Enviando…' : 'Enviar código'}
                </button>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={verifyOtp} className="anim-up">
                <BackButton onClick={() => setMode('phone')} />
                <h1 style={S.stepTitle}>Confirma tu número</h1>
                <p style={S.stepSub}>Escribe el código que enviamos al +57 {phone}.</p>

                <input
                  type="text"
                  inputMode="numeric"
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={S.otpInput}
                />

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={busy || otp.length < 6}
                  className="md3-btn"
                  style={{ ...S.primaryBtn, marginTop: 18, opacity: otp.length < 6 ? 0.55 : 1 }}
                >
                  {busy ? 'Confirmando…' : 'Confirmar'}
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

function Field({ label, type, value, onChange, placeholder, autoComplete, autoFocus }) {
  return (
    <label style={{ display: 'block', marginTop: 14 }}>
      <span style={S.label}>{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        style={S.input}
      />
    </label>
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
    position: 'relative',
    zIndex: 2,
    minHeight: '100dvh',
    maxHeight: '100dvh',
    overflowY: 'auto',
    display: 'flex',
  },
  center: {
    margin: 'auto',
    width: '100%',
    maxWidth: 460,
    padding: '32px 20px 28px',
  },
  card: {
    background: 'linear-gradient(150deg, rgba(38,34,30,.55) 0%, rgba(12,11,10,.68) 100%)',
    backdropFilter: 'blur(42px) saturate(160%)',
    WebkitBackdropFilter: 'blur(42px) saturate(160%)',
    border: '1px solid rgba(255,255,255,.13)',
    borderRadius: 30,
    padding: '30px 26px',
    boxShadow: '0 40px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.16)',
    animation: 'pop .5s cubic-bezier(.2,0,0,1) both',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 },
  logo: {
    width: 40, height: 40, borderRadius: 13, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23,
    boxShadow: '0 6px 18px rgba(255,68,31,.45)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 19, letterSpacing: '-.02em',
  },
  brandKicker: {
    display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
    color: 'rgba(255,255,255,.5)', marginTop: 2,
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 31,
    lineHeight: 1.08, letterSpacing: '-.03em', textWrap: 'balance',
  },
  subtitle: {
    margin: '10px 0 0', fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,.68)',
  },
  roles: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 20 },
  roleChip: {
    display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
    borderRadius: 999, background: 'rgba(255,255,255,.09)',
    border: '1px solid rgba(255,255,255,.14)', fontSize: 13, fontWeight: 700,
  },
  rolePlus: { fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,.4)' },
  roleNote: {
    margin: '10px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'rgba(255,255,255,.55)',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 50, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15,
    boxShadow: '0 10px 26px rgba(255,68,31,.38)',
  },
  whiteBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 48, borderRadius: 999, background: '#fff',
    color: '#17140F', fontWeight: 700, fontSize: 14.5,
  },
  facebookBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 48, borderRadius: 999, background: '#1877F2',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  ghostBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 48, borderRadius: 999,
    background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.16)',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  outlineBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 48, borderRadius: 999,
    border: '1px solid rgba(255,255,255,.22)', background: 'transparent',
    color: '#fff', fontWeight: 700, fontSize: 14.5, textDecoration: 'none',
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '22px 0 14px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.14)' },
  dividerText: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.45)' },
  riderNote: {
    margin: '16px 0 0', fontSize: 11.5, lineHeight: 1.55, color: 'rgba(255,255,255,.45)',
    textAlign: 'center',
  },
  back: {
    width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', marginBottom: 16,
  },
  stepTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 25,
    letterSpacing: '-.02em',
  },
  stepSub: { margin: '8px 0 4px', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.65)' },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '.02em',
    color: 'rgba(255,255,255,.62)', marginBottom: 7,
  },
  input: {
    width: '100%', height: 50, borderRadius: 15, padding: '0 15px',
    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
    color: '#fff', fontSize: 16, outline: 'none',
  },
  phoneRow: {
    display: 'flex', alignItems: 'center', gap: 10, height: 50, padding: '0 15px',
    borderRadius: 15, background: 'rgba(255,255,255,.07)',
    border: '1px solid rgba(255,255,255,.15)',
  },
  prefix: { fontWeight: 700, color: 'rgba(255,255,255,.55)', flex: 'none' },
  phoneInput: {
    flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: 17, fontWeight: 600,
  },
  otpInput: {
    width: '100%', height: 62, borderRadius: 16, marginTop: 16,
    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
    color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '.24em',
    textAlign: 'center', outline: 'none',
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.35)', color: '#FFC7BA',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
  legal: {
    margin: '18px 0 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5,
    color: 'rgba(255,255,255,.42)',
  },
};
