'use client';

/**
 * ACCESO A app.turafood.com
 *
 * Negocios y repartidores entran por la misma puerta; quién es cada quien lo
 * decide el servidor leyendo `profiles.role` (ver src/proxy.js).
 *
 * Misma lógica que en turafood.com: código al correo (llega en segundos) o
 * contraseña, y Google escondido para quien ya lo usaba. Quien no tiene cuenta
 * crea su negocio en /entrar, sin papeles.
 *
 * Diseño: AuthShell + ta-auth.css (idéntico en las tres apps).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import AuthShell from '../components/AuthShell';
import CodigoInput from '../components/CodigoInput';
import {
  enviarCodigo, confirmarCodigo, entrarConContrasena, esCorreo, normalizarCorreo,
} from '@/lib/acceso';

const ESPERA_REENVIO = 30;

export default function AuthPage() {
  const router = useRouter();
  const [paso, setPaso] = useState('contacto');   // contacto | codigo | clave
  const [correo, setCorreo] = useState('');
  const [otp, setOtp] = useState('');
  const [envio, setEnvio] = useState(null);
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [espera, setEspera] = useState(0);

  const correoOk = esCorreo(correo) && Boolean(normalizarCorreo(correo));

  useEffect(() => {
    Promise.resolve().then(() => {
      try { setCorreo(localStorage.getItem('turafood_customer_email') || ''); } catch { /* sin almacenamiento */ }
    });
  }, []);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const guard = () => {
    if (isConfigured()) return true;
    setError('Supabase todavía no está conectado en este entorno.');
    return false;
  };

  /** El proxy lee el rol y manda a /negocio o a /repartidor */
  const entrar = () => {
    router.replace('/');
    router.refresh();
  };

  const mandarCodigo = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    try {
      let r;
      try {
        r = await enviarCodigo(correo);
      } catch (err) {
        if (err.message === 'EXISTE') r = await enviarCodigo(correo, { forzarIngreso: true });
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

  const confirmar = async (valor) => {
    if (busy || !envio) return;
    setError(null);
    setBusy(true);
    try {
      await confirmarCodigo({ contacto: envio.contacto, codigo: valor, modo: envio.modo });
      entrar();
    } catch (err) {
      setError(err.message);
      setOtp('');
      setBusy(false);
    }
  };

  const conClave = async (e) => {
    e.preventDefault();
    setError(null);
    if (!guard()) return;
    setBusy(true);
    try {
      await entrarConContrasena(correo, password);
      entrar();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const volver = () => { setPaso('contacto'); setError(null); setPassword(''); };

  const errorMsg = error ? (
    <div className="ta-msg error" role="alert"><span className="ms">error</span><span>{error}</span></div>
  ) : null;

  return (
    <AuthShell variante="negocio">
      {paso === 'contacto' && (
        <form onSubmit={mandarCodigo} className="ta-step">
          <h1 className="ta-title">Entra a tu panel</h1>
          <p className="ta-sub">Administra tu menú y tus pedidos en tiempo real. Te enviamos un código al correo, sin contraseñas que recordar.</p>

          <div className="ta-field">
            <input id="ta-mail" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required autoFocus placeholder=" " value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <label htmlFor="ta-mail">Correo</label>
          </div>

          {errorMsg}

          <button type="submit" className="ta-btn" disabled={busy || !correoOk}>{busy ? 'Enviando…' : 'Enviarme un código'}</button>
          <button type="button" className="ta-btn outline" style={{ marginTop: 10 }} disabled={!correoOk}
            onClick={() => { setError(null); setPaso('clave'); }}>
            <span className="ms">lock</span> Entrar con mi contraseña
          </button>

          <div className="ta-or">¿PRIMERA VEZ?</div>
          <a href="/empezar" className="ta-btn tonal" style={{ textDecoration: 'none' }}>
            <span className="ms">storefront</span> Crear mi negocio gratis
          </a>

        </form>
      )}

      {paso === 'codigo' && (
        <div className="ta-step">
          <button type="button" className="ta-back" onClick={volver} aria-label="Volver"><span className="ms">arrow_back</span></button>
          <h1 className="ta-title">Escribe el código</h1>
          <p className="ta-sub">Lo enviamos a <strong>{correo.trim()}</strong>. Llega en segundos; revisa también spam o promociones.</p>

          <div style={{ marginTop: 26 }}>
            <CodigoInput valor={otp} onChange={setOtp} onCompleto={confirmar} deshabilitado={busy} error={Boolean(error)} />
          </div>

          <div aria-live="polite" style={{ minHeight: 24, marginTop: 14, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: error ? 'var(--ta-error)' : 'var(--ta-muted)' }}>
            {busy ? 'Verificando…' : error}
          </div>

          <button type="button" className="ta-link" disabled={espera > 0 || busy} onClick={() => mandarCodigo()}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
          <button type="button" className="ta-link muted" disabled={busy} onClick={() => { setError(null); setPaso('clave'); }}>
            Prefiero entrar con mi contraseña
          </button>
        </div>
      )}

      {paso === 'clave' && (
        <form onSubmit={conClave} className="ta-step">
          <button type="button" className="ta-back" onClick={volver} aria-label="Volver"><span className="ms">arrow_back</span></button>
          <h1 className="ta-title">Tu contraseña</h1>
          <p className="ta-sub">Para <strong>{correo.trim()}</strong>.</p>

          <div className="ta-field">
            <input id="ta-clave" type={ver ? 'text' : 'password'} required autoFocus placeholder=" " autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <label htmlFor="ta-clave">Contraseña</label>
            <button type="button" className="ta-eye" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <span className="ms" style={{ fontSize: 21 }}>{ver ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {errorMsg}

          <button type="submit" className="ta-btn" disabled={busy || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>
          <button type="button" className="ta-link" disabled={busy} onClick={() => mandarCodigo()}>
            Olvidé mi contraseña · enviarme un código
          </button>
        </form>
      )}
    </AuthShell>
  );
}
