'use client';

/**
 * ENTRAR A TURAFOOD
 *
 * Las mismas cuatro puertas que en app.turafood.com, en el mismo
 * orden: Google, Facebook, celular y mirar sin cuenta. Que la pantalla
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
 * SMS por ahora. WhatsApp sería mejor —acá todo el mundo lo tiene y no
 * todo el mundo tiene saldo— pero mandar por WhatsApp exige un
 * remitente aprobado por Meta, y eso toma días. Prometer WhatsApp y
 * mandar un SMS es peor que no prometerlo.
 *
 * Cuando Meta apruebe el remitente, esta línea pasa a 'whatsapp' y el
 * botón de abajo vuelve a decir WhatsApp. Es lo único que hay que
 * tocar.
 */
const OTP_CHANNEL = 'sms';

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
  const [fullName, setFullName] = useState('');

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

                  <button onClick={() => setMode('phone')} className="md3-btn" style={S.ghost}>
                    <span className="ms" style={{ fontSize: 20 }}>sms</span>
                    Continuar con mi celular
                  </button>
                </div>

                {error && <Alert text={error} />}



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
                <h1 style={S.title}>Tu celular</h1>
                <p style={S.subtitle}>Te mandamos un código de 6 dígitos por mensaje de texto.</p>

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
