'use client';

/**
 * ENTRAR A TURAFOOD
 *
 * Las mismas cuatro puertas que en app.turafood.com, en el mismo
 * orden: Google, Facebook, WhatsApp y mirar sin cuenta. Que la pantalla
 * de acceso sea distinta en cada app confunde a quien es cliente y
 * además tiene un negocio — y en Buenaventura eso es media ciudad.
 *
 * El correo sigue existiendo, un nivel más abajo, para quien ya se
 * registró así o no usa ninguna de las otras.
 *
 * El perfil en `public.profiles` no se crea aquí: lo crea el trigger
 * `handle_new_user()` al insertarse el usuario en `auth.users`, con el
 * rol que viaja en `raw_user_meta_data`. Así no hay dos fuentes de
 * verdad para el mismo dato.
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import RouteSkeleton from '../components/RouteSkeleton';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';

/**
 * Canal del código de un solo uso.
 *
 * Va por WhatsApp y no por SMS porque acá todo el mundo tiene WhatsApp
 * y no todo el mundo tiene saldo. Requiere el remitente de WhatsApp
 * activo en Twilio; si no está, Supabase devuelve error y la pantalla
 * lo dice en vez de quedarse esperando un mensaje que no va a llegar.
 */
const OTP_CHANNEL = 'whatsapp';

export default function AuthPageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={3} />}>
      <AuthPage />
    </Suspense>
  );
}

function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();

  // choose | phone | otp | email
  const [mode, setMode] = useState(params.get('mode') === 'email' ? 'email' : 'choose');
  const [isSignup, setIsSignup] = useState(params.get('mode') === 'signup');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const guard = () => {
    if (isConfigured()) return true;
    setError('Supabase todavía no está conectado en este entorno.');
    return false;
  };

  const enter = () => {
    router.replace('/home');
    router.refresh();
  };

  const signInWith = async (provider) => {
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/home` },
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

  const withEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const supabase = createClient();

      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim(), role: 'customer' } },
        });
        if (signUpError) throw new Error(signUpError.message);

        if (!data.session) {
          setNotice('Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve a entrar.');
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw new Error('Correo o contraseña incorrectos.');
      }

      enter();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      <HeroBackdrop brightness={0.3} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          <div style={S.card}>

            <div style={S.brand}>
              <span style={S.logo}>t</span>
              <span style={S.wordmark}>TuraFood</span>
            </div>

            {mode === 'choose' && (
              <div className="anim-fade">
                <h1 style={S.title}>Bienvenido de vuelta</h1>
                <p style={S.subtitle}>
                  Entra para seguir pidiendo en Buenaventura.
                </p>

                <div style={S.actions}>
                  <button onClick={() => signInWith('google')} disabled={busy} className="md3-btn" style={S.white}>
                    <GoogleMark size={19} />
                    Continuar con Google
                  </button>

                  <button onClick={() => signInWith('facebook')} disabled={busy} className="md3-btn" style={S.facebook}>
                    <FacebookMark size={19} />
                    Continuar con Facebook
                  </button>

                  <button onClick={() => setMode('phone')} className="md3-btn" style={S.whatsapp}>
                    <WhatsAppMark size={20} />
                    Continuar con WhatsApp
                  </button>
                </div>

                {error && <Alert text={error} />}

                <button
                  onClick={() => { setMode('email'); setIsSignup(false); setError(null); }}
                  style={S.emailLink}
                >
                  Entrar con correo y contraseña
                </button>

                <div style={S.sep}>
                  <span style={S.sepLine} />
                  <span style={S.sepText}>O MIRA PRIMERO</span>
                  <span style={S.sepLine} />
                </div>

                {/* Siempre visible, y con forma de botón. Antes era un
                    texto tenue al final: quien no quería dar sus datos
                    todavía no lo veía y cerraba la app. */}
                <button onClick={() => router.push('/home')} style={S.guestBtn}>
                  <span className="ms" style={{ fontSize: 19 }}>visibility</span>
                  Solo estoy mirando
                </button>
                <p style={S.guestNote}>
                  Mira todo el catálogo sin cuenta. Te la pedimos solo al momento de pedir.
                </p>
              </div>
            )}

            {mode === 'phone' && (
              <form onSubmit={sendOtp} className="anim-up">
                <BackButton onClick={() => { setMode('choose'); setError(null); }} />
                <h1 style={S.title}>Tu WhatsApp</h1>
                <p style={S.subtitle}>Te mandamos un código de 6 dígitos por WhatsApp.</p>

                <div style={S.phoneRow}>
                  <span style={S.prefix}>+57</span>
                  <input
                    type="tel" required autoFocus
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
                  type="text" inputMode="numeric" required autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  style={S.otp}
                />

                {error && <Alert text={error} />}

                <button
                  type="submit"
                  disabled={busy || otp.length < 6}
                  style={{ ...S.primary, opacity: otp.length < 6 ? 0.5 : 1 }}
                >
                  {busy ? 'Confirmando…' : 'Entrar'}
                </button>
              </form>
            )}

            {mode === 'email' && (
              <form onSubmit={withEmail} className="anim-up">
                <BackButton onClick={() => { setMode('choose'); setError(null); setNotice(null); }} />
                <h1 style={S.title}>{isSignup ? 'Crea tu cuenta' : 'Con tu correo'}</h1>
                <p style={S.subtitle}>
                  {isSignup
                    ? 'Para guardar tus direcciones y tu historial.'
                    : 'Para cuentas creadas antes, o si no usas las otras opciones.'}
                </p>

                {isSignup && (
                  <input
                    required autoFocus
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                    style={{ ...S.field, marginTop: 20 }}
                  />
                )}

                <input
                  type="email" required autoFocus={!isSignup}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="username"
                  style={{ ...S.field, marginTop: isSignup ? 10 : 20 }}
                />
                <input
                  type="password" required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  style={{ ...S.field, marginTop: 10 }}
                />

                {error && <Alert text={error} />}
                {notice && (
                  <div style={S.notice}>
                    <span className="ms" style={{ fontSize: 18, flex: 'none' }}>mark_email_unread</span>
                    <span>{notice}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} style={S.primary}>
                  {busy ? 'Un momento…' : isSignup ? 'Crear mi cuenta' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setIsSignup(!isSignup); setError(null); setNotice(null); }}
                  style={S.emailLink}
                >
                  {isSignup ? '¿Ya tienes cuenta? Entra' : '¿Eres nuevo? Crea tu cuenta'}
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

/** El verde de WhatsApp es reconocible aunque el logo esté en blanco */
function WhatsAppMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01c-1.52 0-3.02-.41-4.32-1.18l-.31-.18-3.21.84.86-3.13-.2-.32a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
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
  center: { margin: 'auto', width: '100%', maxWidth: 400, padding: '32px 20px 26px' },
  card: {
    background: 'rgba(18,17,15,.62)',
    backdropFilter: 'blur(46px) saturate(150%)',
    WebkitBackdropFilter: 'blur(46px) saturate(150%)',
    border: '1px solid rgba(255,255,255,.1)',
    borderRadius: 28, padding: '30px 26px',
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
  wordmark: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, letterSpacing: '-.02em',
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 27, lineHeight: 1.12, letterSpacing: '-.03em',
  },
  subtitle: {
    margin: '9px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,255,255,.6)',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 9, marginTop: 24 },
  white: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 50, borderRadius: 14, background: '#fff',
    color: '#17140F', fontWeight: 700, fontSize: 14.5,
  },
  facebook: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 50, borderRadius: 14, background: '#1877F2',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  whatsapp: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 50, borderRadius: 14, background: '#25D366',
    color: '#08301A', fontWeight: 800, fontSize: 14.5,
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 50, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 18,
    boxShadow: '0 10px 26px rgba(255,68,31,.36)',
  },
  emailLink: {
    display: 'block', width: '100%', marginTop: 16, padding: '6px 0',
    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.62)',
    textAlign: 'center', textDecoration: 'underline',
    textUnderlineOffset: 3, textDecorationColor: 'rgba(255,255,255,.25)',
  },
  sep: { display: 'flex', alignItems: 'center', gap: 11, margin: '18px 0 12px' },
  sepLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.12)' },
  sepText: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.11em', color: 'rgba(255,255,255,.38)',
  },
  guestBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 50, borderRadius: 14,
    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
    color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
  guestNote: {
    margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.5,
    color: 'rgba(255,255,255,.42)', textAlign: 'center',
  },
  back: {
    width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,.09)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', marginBottom: 18,
  },
  field: {
    width: '100%', height: 50, borderRadius: 14, padding: '0 15px',
    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontSize: 15, outline: 'none',
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
  notice: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 13, background: 'rgba(255,176,32,.14)',
    border: '1px solid rgba(255,176,32,.32)', color: '#FFD9A0',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
  },
  legal: {
    margin: '18px 0 0', textAlign: 'center', fontSize: 11,
    lineHeight: 1.5, color: 'rgba(255,255,255,.32)',
  },
};
