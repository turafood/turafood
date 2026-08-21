'use client';

/**
 * ACCESO A app.turafood.com
 *
 * Sin correo y contraseña a propósito: una contraseña más es una
 * contraseña más que olvidar, y recuperarla por correo es donde se cae
 * la mitad de la gente. Entrar con Google, Facebook o el celular es más
 * rápido y más seguro — nosotros nunca vemos una credencial.
 *
 * Negocios y repartidores entran por la misma puerta. Quién es cada
 * quien lo decide el servidor leyendo `profiles.role` (ver src/proxy.js).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';
import { probarComo } from '@/lib/sesion';
import LegalModal from '../components/LegalModal';

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

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState('choose');   // choose | phone | otp | email
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [legalModal, setLegalModal] = useState(null); // 'terminos' | 'privacidad' | null

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

  /**
   * Entrar a probar sin dar datos.
   *
   * Pedirle papeles a alguien antes de dejarlo ver el panel es pedirle
   * fe. Entra con una sesión anónima, trabaja de verdad con el tope de
   * 20 pedidos diarios que la base ya impone a quien no está
   * verificado, y se queda con la cuenta cuando quiera.
   */
  const probar = async (rol) => {
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const user = await probarComo(rol);
      if (!user) {
        throw new Error(
          'No se pudo abrir la sesión de prueba. Puede que esté desactivada en el proyecto.',
        );
      }
      enter();
    } catch (err) {
      setError(err.message);
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

  /**
   * Entrada por correo.
   *
   * No es la puerta principal —está un nivel más abajo, detrás de un
   * enlace— pero tiene que existir: quien ya se registró con correo, y
   * quien no usa Google ni Facebook, se queda afuera sin ella. Quitarla
   * del todo dejaba gente encerrada.
   */
  const signInWithEmail = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;

    setBusy(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw new Error('Correo o contraseña incorrectos.');
      enter();
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

  const [message, setMessage] = useState(null);

  const sendMagicLink = async () => {
    setError(null);
    setMessage(null);
    if (!guard()) return;
    if (!email || !email.includes('@')) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    setBusy(true);
    try {
      const { error: magicError } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (magicError) throw new Error(magicError.message);
      setMessage(`¡Magic Link enviado a ${email}! Revisa tu bandeja de entrada o spam para acceder en un toque.`);
    } catch (err) {
      setError(err.message || 'Error al enviar el enlace mágico.');
    } finally {
      setBusy(false);
    }
  };

  const sendRecoveryEmail = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setMessage(null);
    if (!guard()) return;
    if (!email || !email.includes('@')) {
      setError('Escribe tu correo para enviarte el enlace de recuperación.');
      return;
    }

    setBusy(true);
    try {
      const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/actualizar-clave`,
      });
      if (resetError) throw new Error(resetError.message);
      setMessage(`Enlace de restablecimiento enviado a ${email}. Abre el correo para crear tu nueva contraseña.`);
    } catch (err) {
      setError(err.message || 'Error al enviar correo de recuperación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      ...S.page,
      background: 'radial-gradient(100% 60% at 50% 10%, #171519 0%, #0E0D10 50%, #080709 100%)',
      color: '#fff'
    }}>
      {/* Subtle Warm Ambient Glows */}
      <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 640, height: 280, background: 'radial-gradient(ellipse at top, rgba(232,199,102,0.06) 0%, rgba(255,68,31,0.03) 40%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '15%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,77,0.04), transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '-10%', bottom: '5%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(17,178,106,0.03), transparent 65%)', pointerEvents: 'none' }} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          
          {/* Top Brand & Platform Pill */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10, marginBottom: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 14px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#11B26A', boxShadow: '0 0 8px #11B26A' }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)' }}>
                Acceso Oficial para Negocios
              </span>
            </div>

            <div style={S.brand}>
              <span style={{...S.logo, boxShadow: '0 6px 20px rgba(255,68,31,.4)'}}>t</span>
              <span>
                <span style={{...S.brandName, color: '#fff'}}>Tura Food <span className="tf-serif" style={{color: 'var(--primary)'}}>AI</span></span>
                <span style={{...S.brandKicker, color: 'var(--gold)', letterSpacing: '0.12em'}}>MKT PARA NEGOCIOS LOCALES</span>
              </span>
            </div>
          </div>

          <div style={S.card}>

            {mode === 'choose' && (
              <div className="anim-fade">
                <h1 style={{...S.title, textAlign: 'center', fontSize: 23, color: '#fff'}}>
                  Inicia sesión en tu panel
                </h1>
                <p style={{...S.subtitle, textAlign: 'center', color: 'rgba(255,255,255,0.65)'}}>
                  Ingresa para administrar tu negocio, catálogo y pedidos en tiempo real.
                </p>

                <div style={S.actions}>
                  <button onClick={() => signInWith('google')} disabled={busy} className="md3-btn" style={S.white}>
                    <GoogleMark size={19} />
                    Continuar con Google
                  </button>

                  <button onClick={() => setMode('phone')} className="md3-btn" style={S.ghost}>
                    <span className="ms" style={{ fontSize: 20, color: '#11B26A' }}>smartphone</span>
                    Continuar con mi celular
                  </button>
                </div>

                {error && <Alert text={error} />}

                <button onClick={() => { setMode('email'); setError(null); setMessage(null); }} style={S.emailLink}>
                  Entrar con correo o Magic Link
                </button>

                <div style={S.footer}>
                  <span style={S.footerText}>¿Primera vez en Tura Food?</span>
                  <Link href="/entrar" style={{...S.footerLink, color: 'var(--gold)', fontWeight: 800}}>
                    Crea tu negocio gratis
                  </Link>
                </div>
              </div>
            )}

            {mode === 'email' && (
              <form onSubmit={signInWithEmail} className="anim-up">
                <BackButton onClick={() => { setMode('choose'); setError(null); setMessage(null); }} />
                <h1 style={{...S.title, color: '#fff'}}>Con tu correo</h1>
                <p style={S.subtitle}>Escribe tus datos o solicita un enlace mágico de acceso.</p>

                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="username"
                  style={{ ...S.field, marginTop: 18 }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="current-password"
                  style={{ ...S.field, marginTop: 10 }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setMode('recovery'); setError(null); setMessage(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {error && <Alert text={error} />}
                {message && <SuccessAlert text={message} />}

                <button type="submit" disabled={busy || !password} style={{...S.primary, opacity: !password ? 0.7 : 1}}>
                  {busy ? 'Verificando…' : 'Ingresar con contraseña'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
                    O SIN CONTRASEÑA
                  </span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>

                <button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={busy || !email.includes('@')}
                  style={{
                    ...S.ghost,
                    borderColor: 'rgba(232,199,102,0.3)',
                    background: 'rgba(232,199,102,0.06)',
                    color: '#E8C766',
                    opacity: !email.includes('@') ? 0.5 : 1,
                  }}
                >
                  <span className="ms" style={{ fontSize: 18, color: '#E8C766' }}>bolt</span>
                  Enviar Magic Link al correo
                </button>
              </form>
            )}

            {mode === 'recovery' && (
              <form onSubmit={sendRecoveryEmail} className="anim-up">
                <BackButton onClick={() => { setMode('email'); setError(null); setMessage(null); }} />
                <h1 style={{...S.title, color: '#fff'}}>Recuperar contraseña</h1>
                <p style={S.subtitle}>Te enviaremos un enlace seguro para restablecer tu clave o ingresar.</p>

                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  autoComplete="email"
                  style={{ ...S.field, marginTop: 18 }}
                />

                {error && <Alert text={error} />}
                {message && <SuccessAlert text={message} />}

                <button type="submit" disabled={busy || !email.includes('@')} style={S.primary}>
                  {busy ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            )}

            {mode === 'phone' && (
              <form onSubmit={sendOtp} className="anim-up">
                <BackButton onClick={() => { setMode('choose'); setError(null); }} />
                <h1 style={{...S.title, color: '#fff'}}>Tu número de celular</h1>
                <p style={S.subtitle}>Te enviaremos un código de seguridad por SMS.</p>

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
                  {busy ? 'Enviando código…' : 'Enviar código'}
                </button>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={verifyOtp} className="anim-up">
                <BackButton onClick={() => { setMode('phone'); setError(null); }} />
                <h1 style={{...S.title, color: '#fff'}}>Confirma tu código</h1>
                <p style={S.subtitle}>Ingresa los 6 dígitos enviados al +57 {phone}.</p>

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
                  {busy ? 'Confirmando…' : 'Ingresar'}
                </button>
              </form>
            )}
          </div>

          {/* Social Proof & Porteño Tag Strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 14, padding: '6px 12px', background: 'rgba(255,255,255,0.02)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 10.5, color: '#E8C766', fontWeight: 800, letterSpacing: '0.04em' }}>
              PA´ TURÍN CON AMOR ❤️
            </span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              · Plataforma segura · Buenaventura
            </span>
          </div>

          <p style={S.legal}>
            Al continuar aceptas nuestros{' '}
            <button type="button" onClick={() => setLegalModal('terminos')} style={S.legalBtn}>
              Términos de Servicio SaaS
            </button>
            {' '}y la{' '}
            <button type="button" onClick={() => setLegalModal('privacidad')} style={S.legalBtn}>
              Política de Privacidad
            </button>.
          </p>

          <LegalModal
            isOpen={Boolean(legalModal)}
            initialTab={legalModal || 'terminos'}
            onClose={() => setLegalModal(null)}
          />
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

function SuccessAlert({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 12px',
      borderRadius: 12, background: 'rgba(17,178,106,0.15)',
      border: '1px solid rgba(17,178,106,0.35)', color: '#A6F4C5',
      fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
    }}>
      <span className="ms" style={{ fontSize: 18, flex: 'none', color: '#11B26A' }}>check_circle</span>
      <span>{text}</span>
    </div>
  );
}

export const S = {
  page: { position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#080709', color: '#fff', overflow: 'hidden' },
  scroller: {
    position: 'relative', zIndex: 2, width: '100%', height: '100%',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 410, padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  card: {
    background: 'linear-gradient(145deg, rgba(28,26,30,0.92) 0%, rgba(13,12,15,0.98) 100%)',
    backdropFilter: 'blur(30px) saturate(180%)',
    WebkitBackdropFilter: 'blur(30px) saturate(180%)',
    border: '1px solid rgba(232,199,102,0.18)',
    borderRadius: 24,
    padding: '24px 22px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)',
    animation: 'pop .4s cubic-bezier(.2,0,0,1) both',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  logo: {
    width: 34, height: 34, borderRadius: 10, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    boxShadow: '0 6px 20px rgba(255,68,31,.4)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17.5, lineHeight: 1.15, letterSpacing: '-.02em',
  },
  brandKicker: {
    display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.12em',
    color: 'var(--gold)', textTransform: 'uppercase', marginTop: 1,
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 22, lineHeight: 1.18, letterSpacing: '-.02em',
  },
  subtitle: {
    margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,.65)',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 9, marginTop: 20 },
  white: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 48, borderRadius: 14, background: '#fff',
    color: '#0F0E11', fontWeight: 700, fontSize: 14,
    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
  },
  facebook: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 48, borderRadius: 14, background: '#1877F2',
    color: '#fff', fontWeight: 700, fontSize: 14,
  },
  ghost: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 48, borderRadius: 14,
    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
    color: '#fff', fontWeight: 700, fontSize: 14,
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
    color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 16,
    boxShadow: '0 8px 22px rgba(255,68,31,.4)',
  },
  trySep: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 10px' },
  trySepLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.08)' },
  trySepText: {
    fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
    color: 'rgba(255,255,255,.35)',
  },
  tryBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
    color: '#fff', fontWeight: 700, fontSize: 12.5,
  },
  tryNote: {
    margin: '9px 0 0', fontSize: 11, lineHeight: 1.4,
    color: 'rgba(255,255,255,.4)', textAlign: 'center',
  },
  emailLink: {
    display: 'block', width: '100%', marginTop: 12, padding: '4px 0',
    fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.6)',
    textAlign: 'center', textDecoration: 'underline',
    textUnderlineOffset: 3, textDecorationColor: 'rgba(255,255,255,.2)',
  },
  field: {
    width: '100%', height: 48, borderRadius: 12, padding: '0 14px',
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
    color: '#fff', fontSize: 14, outline: 'none',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.07)',
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 12.5, color: 'rgba(255,255,255,.5)' },
  footerLink: { fontSize: 12.5, fontWeight: 700, textDecoration: 'none' },
  back: {
    width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', marginBottom: 14, border: 'none', cursor: 'pointer',
  },
  phoneRow: {
    display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 14px',
    borderRadius: 12, marginTop: 16, background: 'rgba(255,255,255,.04)',
    border: '1px solid rgba(255,255,255,.12)',
  },
  prefix: { fontWeight: 700, color: 'rgba(255,255,255,.5)', flex: 'none', fontSize: 14 },
  phoneInput: {
    flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none',
    color: '#fff', fontSize: 15, fontWeight: 600,
  },
  otp: {
    width: '100%', height: 56, borderRadius: 14, marginTop: 16,
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: '.24em',
    textAlign: 'center', outline: 'none',
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 12px',
    borderRadius: 12, background: 'rgba(255,68,31,.12)',
    border: '1px solid rgba(255,68,31,.3)', color: '#FFC7BA',
    fontSize: 12, fontWeight: 600, lineHeight: 1.4,
  },
  legal: {
    margin: '14px 0 0', textAlign: 'center', fontSize: 10.5,
    lineHeight: 1.45, color: 'rgba(255,255,255,.3)',
  },
  legalBtn: {
    background: 'none', border: 'none', padding: 0,
    color: 'rgba(255,255,255,.75)', textDecoration: 'underline',
    textUnderlineOffset: 3, fontWeight: 700, cursor: 'pointer',
    fontSize: 'inherit', display: 'inline',
  },
};
