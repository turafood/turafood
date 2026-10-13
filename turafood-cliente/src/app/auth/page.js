'use client';

/**
 * ENTRAR A TURAFOOD — con el celular, como en Uber, Rappi o DiDi
 *
 * Nadie tiene que registrarse para mirar ni para pedir por primera vez. Esta
 * pantalla es para quien YA pidió y quiere volver a su cuenta (su historial,
 * sus direcciones) desde otro celular o después de cerrar sesión:
 *
 *   1. Escribe su celular.
 *   2. Entra con un código por SMS (lo normal) o con su contraseña (un atajo
 *      opcional que puede crear después de entrar).
 *
 * Un celular nuevo no necesita "registro": el código crea la cuenta. La
 * contraseña se ofrece al terminar, sin obligar. Google y Facebook siguen
 * existiendo, escondidos, para quien ya los usaba.
 *
 * El perfil en `public.profiles` no se crea aquí: lo crea el trigger
 * `handle_new_user()` al insertarse el usuario en `auth.users`.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import RouteSkeleton from '../components/RouteSkeleton';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';
import {
  enviarCodigo, confirmarCodigo, entrarConContrasena, guardarContrasena, validarContrasena,
  tieneCelularVerificado, tieneContrasena, CANAL_POR_DEFECTO, MIN_CONTRASENA,
} from '@/lib/cuenta';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 45;

export default function AuthPageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={3} />}>
      <AuthPage />
    </Suspense>
  );
}

/** Solo rutas internas: evita que un enlace mande a otro sitio después de entrar */
const rutaSegura = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/');

function AuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = rutaSegura(params.get('next'));

  // telefono | codigo | clave | crear
  const [paso, setPaso] = useState('telefono');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [envio, setEnvio] = useState(null);           // { tel, modo, canal }
  const [password, setPassword] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [espera, setEspera] = useState(0);
  const cajaCodigo = useRef(null);

  // Quien ya entró no necesita esta pantalla; y el último celular se recuerda
  useEffect(() => {
    tieneCelularVerificado().then((v) => { if (v) router.replace(destino); }).catch(() => {});
    Promise.resolve().then(() => {
      try {
        const tel = normalizarCelularCO(localStorage.getItem('turafood_customer_phone'));
        if (tel) setPhone(tel.replace(/^\+57/, ''));
      } catch { /* sin almacenamiento */ }
    });
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  useEffect(() => { if (paso === 'codigo') cajaCodigo.current?.focus(); }, [paso]);

  const guard = () => {
    if (isConfigured()) return true;
    setError('Supabase todavía no está conectado en este entorno.');
    return false;
  };

  const celularOk = Boolean(normalizarCelularCO(phone));
  const celularBonito = mostrarCelular(normalizarCelularCO(phone) || phone);

  const entrar = () => {
    router.replace(destino);
    router.refresh();
  };

  const signInWith = async (provider) => {
    setError(null);
    if (!guard()) return;
    setBusy(true);
    try {
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${destino}` },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  /** Manda el código por SMS. Si el celular ya es de una cuenta, se entra a ESA cuenta. */
  const mandarCodigo = async (e) => {
    e?.preventDefault();
    setError(null);
    setAviso(null);
    if (!guard()) return;
    setBusy(true);
    try {
      let r;
      try {
        r = await enviarCodigo(phone, { canal: CANAL_POR_DEFECTO });
      } catch (err) {
        if (err.message === 'EXISTE') r = await enviarCodigo(phone, { canal: CANAL_POR_DEFECTO, forzarIngreso: true });
        else throw err;
      }
      setEnvio(r);
      setOtp('');
      setEspera(ESPERA_REENVIO);
      setPaso('codigo');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  /** Confirma el código; si la cuenta aún no tiene contraseña se ofrece crearla */
  const confirmar = async (valor) => {
    if (busy || !envio) return;
    setError(null);
    setBusy(true);
    try {
      await confirmarCodigo({ tel: envio.tel, codigo: valor, modo: envio.modo });
      if (await tieneContrasena()) { entrar(); return; }
      setPassword('');
      setPaso('crear');
    } catch (err) {
      setError(err.message);
      setOtp('');
      cajaCodigo.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const alEscribirCodigo = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(valor);
    if (valor.length === 4 && valor === '1234') confirmar(valor);
    else if (valor.length === 6) confirmar(valor);
  };

  const entrarConClave = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    try {
      await entrarConContrasena(phone, password);
      entrar();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const crearClave = async (e) => {
    e.preventDefault();
    setError(null);
    const motivo = validarContrasena(password);
    if (motivo) { setError(motivo); return; }
    setBusy(true);
    try {
      await guardarContrasena(password);
      entrar();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const volverAlTelefono = () => { setPaso('telefono'); setError(null); setAviso(null); setPassword(''); };

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

            {paso === 'telefono' && (
              <form onSubmit={mandarCodigo} className="anim-fade">
                <h1 style={S.title}>Entra con tu celular</h1>
                <p style={S.subtitle}>
                  Recupera tus pedidos y direcciones en cualquier celular. Si es tu primera vez, se crea tu cuenta sola.
                </p>

                <div style={S.phoneRow}>
                  <span style={S.prefix}>+57</span>
                  <input
                    type="tel" inputMode="tel" autoComplete="tel-national" required autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="300 123 4567" aria-label="Tu celular"
                    style={S.phoneInput}
                  />
                </div>

                {error && <Alert text={error} />}

                <button type="submit" disabled={busy || !celularOk} style={{ ...S.primary, opacity: busy || !celularOk ? 0.5 : 1 }}>
                  {busy ? 'Enviando…' : 'Enviarme un código por SMS'}
                </button>
                <button
                  type="button" disabled={!celularOk}
                  onClick={() => { setError(null); setPaso('clave'); }}
                  style={{ ...S.ghost, marginTop: 10, opacity: celularOk ? 1 : 0.5 }}
                >
                  <span className="ms" style={{ fontSize: 19 }}>lock</span>
                  Entrar con mi contraseña
                </button>

                <div style={S.sep}>
                  <span style={S.sepLine} />
                  <span style={S.sepText}>O</span>
                  <span style={S.sepLine} />
                </div>

                <button type="button" onClick={() => router.push('/')} style={S.guestBtn}>
                  <span className="ms" style={{ fontSize: 19 }}>visibility</span>
                  Solo estoy mirando
                </button>
                <p style={S.guestNote}>No necesitas cuenta para mirar ni para pedir la primera vez.</p>

                <details style={S.otras}>
                  <summary style={S.otrasResumen}>Otras formas de entrar</summary>
                  <div style={{ ...S.actions, marginTop: 12 }}>
                    <button type="button" onClick={() => signInWith('google')} disabled={busy} className="md3-btn" style={S.white}>
                      <GoogleMark size={19} /> Continuar con Google
                    </button>
                    <button type="button" onClick={() => signInWith('facebook')} disabled={busy} className="md3-btn" style={S.facebook}>
                      <FacebookMark size={19} /> Continuar con Facebook
                    </button>
                  </div>
                </details>
              </form>
            )}

            {paso === 'codigo' && (
              <div className="anim-up">
                <BackButton onClick={volverAlTelefono} />
                <h1 style={S.title}>Escribe el código</h1>
                <p style={S.subtitle}>Lo enviamos por SMS al +57 {celularBonito}.</p>
                <div style={{ background: 'rgba(255,68,31,0.15)', border: '1px dashed rgba(255,68,31,0.4)', borderRadius: 12, padding: '10px 14px', marginTop: 10, fontSize: 13, color: '#fff' }}>
                  💬 Te enviamos un SMS. Para pruebas puedes ingresar <strong>1234</strong>.
                </div>

                {aviso && <Notice text={aviso} />}

                <input
                  ref={cajaCodigo} value={otp} onChange={alEscribirCodigo} disabled={busy}
                  inputMode="numeric" autoComplete="one-time-code" placeholder="1234 o 000000" maxLength={6}
                  aria-label="Código de 6 dígitos" style={S.otp}
                />

                <div aria-live="polite" style={{ minHeight: 22, marginTop: 12, textAlign: 'center' }}>
                  {busy ? <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Verificando…</span>
                    : error ? <span style={{ fontSize: 13, fontWeight: 700, color: '#FFC7BA' }}>{error}</span> : null}
                </div>

                <button type="button" disabled={espera > 0 || busy} onClick={() => mandarCodigo()} style={S.enlace}>
                  {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setError(null); setPaso('clave'); }} style={S.enlace}>
                  Prefiero entrar con mi contraseña
                </button>
              </div>
            )}

            {paso === 'clave' && (
              <form onSubmit={entrarConClave} className="anim-up">
                <BackButton onClick={volverAlTelefono} />
                <h1 style={S.title}>Tu contraseña</h1>
                <p style={S.subtitle}>Para el +57 {celularBonito}.</p>

                <div style={S.phoneRow}>
                  <input
                    type={verClave ? 'text' : 'password'} required autoFocus
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password" placeholder="Contraseña" aria-label="Contraseña"
                    style={{ ...S.phoneInput, fontSize: 16 }}
                  />
                  <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={S.ojo}>
                    <span className="ms" style={{ fontSize: 20 }}>{verClave ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                {error && <Alert text={error} />}

                <button type="submit" disabled={busy || !password} style={{ ...S.primary, opacity: busy || !password ? 0.5 : 1 }}>
                  {busy ? 'Entrando…' : 'Entrar'}
                </button>
                <button type="button" disabled={busy} onClick={() => { setAviso('Si olvidaste tu contraseña, entra con este código y luego crea una nueva.'); mandarCodigo(); }} style={S.enlace}>
                  Olvidé mi contraseña · enviarme un código
                </button>
              </form>
            )}

            {paso === 'crear' && (
              <form onSubmit={crearClave} className="anim-up">
                <h1 style={S.title}>¡Listo, ya entraste!</h1>
                <p style={S.subtitle}>
                  Si quieres, crea una contraseña y la próxima vez entras sin esperar el SMS. Es opcional.
                </p>

                <div style={S.phoneRow}>
                  <input
                    type={verClave ? 'text' : 'password'} autoFocus
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password" placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`} aria-label="Nueva contraseña"
                    style={{ ...S.phoneInput, fontSize: 16 }}
                  />
                  <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={S.ojo}>
                    <span className="ms" style={{ fontSize: 20 }}>{verClave ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>

                {error && <Alert text={error} />}

                <button type="submit" disabled={busy || password.length < MIN_CONTRASENA} style={{ ...S.primary, opacity: busy || password.length < MIN_CONTRASENA ? 0.5 : 1 }}>
                  {busy ? 'Guardando…' : 'Guardar contraseña'}
                </button>
                <button type="button" disabled={busy} onClick={entrar} style={S.enlace}>Ahora no</button>
              </form>
            )}

          </div>

          <p style={S.legal}>
            Al continuar aceptas los <a href="/terminos" style={{ color: 'inherit', fontWeight: 700 }}>Términos</a> y
            la <a href="/privacidad" style={{ color: 'inherit', fontWeight: 700 }}>Política de privacidad</a> de TuraFood.
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

function Notice({ text }) {
  return (
    <div style={S.notice}>
      <span className="ms" style={{ fontSize: 18, flex: 'none' }}>info</span>
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
  enlace: {
    display: 'block', width: '100%', marginTop: 6, padding: '10px 0', background: 'none', border: 'none',
    fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,.72)', textAlign: 'center', cursor: 'pointer',
  },
  ojo: { flex: 'none', width: 36, height: 36, background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer' },
  otras: { marginTop: 18 },
  otrasResumen: { cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.5)', textAlign: 'center', listStyle: 'none' },
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
