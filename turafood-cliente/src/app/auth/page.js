'use client';

/**
 * REGISTRO E INICIO DE SESIÓN
 *
 * Una sola pantalla con dos modos (entrar / crear cuenta), sobre la
 * misma estética del onboarding: foto de fondo, degradado oscuro y
 * hoja de contenido abajo.
 *
 * El perfil en `public.profiles` no se crea aquí: lo crea el trigger
 * `handle_new_user()` al insertarse el usuario en `auth.users`, con el
 * rol que viaja en `raw_user_meta_data`. Así no hay dos fuentes de
 * verdad para el mismo dato.
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
export default function AuthPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}

function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();

  const [mode, setMode] = useState(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const isSignup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isConfigured()) {
      setError('La base de datos todavía no está conectada en este entorno.');
      return;
    }
    if (isSignup && !accepted) {
      setError('Debes aceptar los Términos y la Política de privacidad.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setBusy(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            // El trigger handle_new_user() lee estos campos
            data: {
              role: 'customer',
              full_name: fullName.trim(),
              phone: phone.trim(),
            },
          },
        });
        if (signUpError) throw signUpError;

        // Si el proyecto exige confirmar correo, no hay sesión todavía
        if (!data.session) {
          setNotice('Te enviamos un correo para confirmar tu cuenta.');
          setBusy(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }

      router.push('/home');
    } catch (err) {
      setError(traducir(err.message));
      setBusy(false);
    }
  };

  return (
    <>
      <div style={S.screen}>
        <div style={S.photo} />
        <div style={S.shade} />

        {/* Marca */}
        <div style={S.brandRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={S.logo}>t</div>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18.5, letterSpacing: '-.01em' }}>
              Tura Shop
            </span>
          </div>
          <span style={S.cityTag}>BUENAVENTURA</span>
        </div>

        {/* Hoja */}
        <div className="sc" style={S.sheet}>
          <h1 style={S.title}>
            {isSignup ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}
          </h1>
          <p style={S.subtitle}>
            {isSignup
              ? 'Pide de todo el puerto en minutos.'
              : 'Entra para seguir pidiendo en Buenaventura.'}
          </p>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 20 }}>
            {isSignup && (
              <>
                <Field
                  id="nombre" label="Nombre completo" icon="person"
                  value={fullName} onChange={setFullName}
                  placeholder="María Camila Ortíz" autoComplete="name" required
                />
                <Field
                  id="tel" label="Celular" icon="smartphone" type="tel"
                  value={phone} onChange={setPhone}
                  placeholder="316 123 4567" autoComplete="tel" required
                />
              </>
            )}

            <Field
              id="email" label="Correo" icon="mail" type="email"
              value={email} onChange={setEmail}
              placeholder="tucorreo@ejemplo.com" autoComplete="email" required
            />

            <div>
              <label htmlFor="pass" style={S.label}>Contraseña</label>
              <div style={S.inputWrap}>
                <span className="ms" style={S.inputIcon}>lock</span>
                <input
                  id="pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  style={S.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  style={{ flex: 'none', padding: '0 4px' }}
                >
                  <span className="ms" style={{ fontSize: 20, color: 'rgba(255,255,255,.5)' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {isSignup && (
              <button
                type="button"
                onClick={() => setAccepted((v) => !v)}
                style={S.termsRow}
              >
                <span style={{ ...S.check, background: accepted ? 'var(--primary)' : 'transparent', border: accepted ? 'none' : '2px solid rgba(255,255,255,.4)' }}>
                  {accepted && <span className="ms" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                </span>
                <span style={{ flex: 1, textAlign: 'left', fontSize: 12, color: 'rgba(255,255,255,.66)', lineHeight: 1.45 }}>
                  Acepto los Términos y la Política de privacidad de Tura Shop.
                </span>
              </button>
            )}

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 17 }}>error</span>
                {error}
              </div>
            )}
            {notice && (
              <div style={S.notice}>
                <span className="ms" style={{ fontSize: 17 }}>mark_email_read</span>
                {notice}
              </div>
            )}

            <button type="submit" disabled={busy} style={S.primaryBtn}>
              {busy
                ? 'Un momento…'
                : isSignup ? 'Crear cuenta' : 'Entrar'}
            </button>
          </form>

          <button
            onClick={() => { setMode(isSignup ? 'login' : 'signup'); setError(null); setNotice(null); }}
            style={S.switchBtn}
          >
            {isSignup ? '¿Ya tienes cuenta? Entra' : '¿Eres nuevo? Crea tu cuenta'}
          </button>

          <button onClick={() => router.push('/home')} style={S.guestBtn}>
            Explorar sin registrarme
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ id, label, icon, value, onChange, ...rest }) {
  return (
    <div>
      <label htmlFor={id} style={S.label}>{label}</label>
      <div style={S.inputWrap}>
        <span className="ms" style={S.inputIcon}>{icon}</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={S.input}
          {...rest}
        />
      </div>
    </div>
  );
}

/** Los mensajes de Supabase llegan en inglés; los pasamos a español */
function traducir(msg = '') {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered')) return 'Ese correo ya tiene una cuenta. Intenta entrar.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento.';
  if (m.includes('password')) return 'La contraseña no cumple los requisitos.';
  return msg;
}

const S = {
  screen: {
    position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
    background: '#0C0B0A', color: '#fff', overflow: 'hidden', minHeight: 0,
  },
  photo: {
    position: 'absolute', left: 0, right: 0, top: 0, height: '52%',
    backgroundImage: "url('/images/onboarding-burger.jpg')",
    backgroundSize: 'cover', backgroundPosition: 'center 35%',
  },
  shade: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg,rgba(8,7,6,.2) 0%,rgba(8,7,6,.55) 26%,rgba(8,7,6,.94) 46%,#0C0B0A 58%)',
  },
  brandRow: {
    position: 'relative', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '12px 22px 0', flex: 'none',
  },
  logo: {
    width: 36, height: 36, borderRadius: 12, background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, color: '#fff',
  },
  cityTag: {
    padding: '7px 12px', borderRadius: 999, background: 'rgba(255,255,255,.14)',
    fontSize: 11.5, fontWeight: 700, letterSpacing: '.02em',
  },
  sheet: {
    position: 'relative', flex: 1, overflowY: 'auto',
    padding: '26px 26px 34px', marginTop: 'auto', minHeight: 0,
  },
  title: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30,
    lineHeight: 1.08, letterSpacing: '-.02em', margin: 0,
  },
  subtitle: {
    marginTop: 8, color: 'rgba(255,255,255,.62)', fontSize: 14, lineHeight: 1.5,
  },
  label: {
    display: 'block', fontSize: 11.5, fontWeight: 800,
    color: 'rgba(255,255,255,.55)', letterSpacing: '.05em', marginBottom: 6,
  },
  inputWrap: {
    display: 'flex', alignItems: 'center', gap: 10, height: 52,
    borderRadius: 15, background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.14)', padding: '0 14px',
  },
  inputIcon: {
    fontSize: 20, color: 'rgba(255,255,255,.5)', flex: 'none',
  },
  input: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none',
    color: '#fff', fontSize: 15,
  },
  termsRow: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4, padding: 0,
  },
  check: {
    width: 20, height: 20, borderRadius: 6, flex: 'none', marginTop: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%', height: 56, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15.5, marginTop: 6,
    boxShadow: '0 10px 26px rgba(255,68,31,.4)',
  },
  switchBtn: {
    width: '100%', height: 46, fontWeight: 700, fontSize: 13.5,
    color: 'rgba(255,255,255,.8)', marginTop: 10,
  },
  guestBtn: {
    width: '100%', height: 42, fontWeight: 600, fontSize: 13,
    color: 'rgba(255,255,255,.5)',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px',
    borderRadius: 12, background: 'rgba(255,68,31,.16)',
    color: '#FFB4A2', fontSize: 12.5, fontWeight: 600,
  },
  notice: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px',
    borderRadius: 12, background: 'rgba(17,178,106,.16)',
    color: '#7EE2B0', fontSize: 12.5, fontWeight: 600,
  },
};
