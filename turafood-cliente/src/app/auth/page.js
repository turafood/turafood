'use client';

/**
 * ENTRAR A TURAFOOD
 *
 * Nadie tiene que registrarse para mirar ni para pedir por primera vez. Esta pantalla es
 * para quien YA pidió y quiere volver a su cuenta (historial, direcciones) desde otro
 * celular: escribe su correo, recibe un código en segundos y entra. Un correo nuevo no
 * necesita registro: el código crea la cuenta. NUNCA se pide contraseña.
 *
 * El código por SMS se enciende con NEXT_PUBLIC_OTP_METODO=sms cuando Twilio esté
 * verificado; mientras tanto llega por correo (Resend, con la identidad de TuraFood).
 *
 * Diseño: AuthShell + ta-auth.css (ver ese archivo).
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import AuthShell from '../components/AuthShell';
import RouteSkeleton from '../components/RouteSkeleton';
import CodigoInput from '../components/CodigoInput';
import {
  enviarCodigo, confirmarCodigo, tieneVerificacion,
  esCorreo, normalizarCorreo, METODO_POR_DEFECTO,
} from '@/lib/cuenta';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 30;

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

  // contacto | codigo
  const [paso, setPaso] = useState('contacto');
  const [contacto, setContacto] = useState('');         // correo o celular
  const [otp, setOtp] = useState('');
  const [envio, setEnvio] = useState(null);             // { contacto, modo, metodo }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [espera, setEspera] = useState(0);

  const porCorreo = esCorreo(contacto);
  const contactoOk = porCorreo ? Boolean(normalizarCorreo(contacto)) : Boolean(normalizarCelularCO(contacto));
  const quien = porCorreo ? contacto.trim() : mostrarCelular(normalizarCelularCO(contacto) || contacto);

  // Quien ya entró no necesita esta pantalla; y el último correo se recuerda
  useEffect(() => {
    tieneVerificacion().then((v) => { if (v) router.replace(destino); }).catch(() => {});
    Promise.resolve().then(() => {
      try { setContacto(localStorage.getItem('turafood_customer_email') || ''); } catch { /* sin almacenamiento */ }
    });
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const entrar = () => {
    router.replace(destino);
    router.refresh();
  };

  /** Manda el código. Si el dato ya es de una cuenta, se entra a ESA cuenta. */
  const mandarCodigo = async (e) => {
    e?.preventDefault();
    setError(null);
    setAviso(null);
    if (!guard()) return;
    if (!porCorreo && METODO_POR_DEFECTO !== 'sms') {
      setError('Por ahora el código llega a tu correo. Escribe tu correo.');
      return;
    }
    setBusy(true);
    try {
      let r;
      try {
        r = await enviarCodigo(contacto);
      } catch (err) {
        if (err.message === 'EXISTE') r = await enviarCodigo(contacto, { forzarIngreso: true });
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

  /** Confirma el código y entra */
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
    } finally {
      setBusy(false);
    }
  };

  const volver = () => { setPaso('contacto'); setError(null); setAviso(null); };

  const errorMsg = error ? (
    <div className="ta-msg error" role="alert"><span className="ms">error</span><span>{error}</span></div>
  ) : null;

  return (
    <AuthShell variante="cliente">
      {paso === 'contacto' && (
        <form onSubmit={mandarCodigo} className="ta-step">
          <h1 className="ta-title">Entra a tu cuenta</h1>
          <p className="ta-sub">Recupera tus pedidos y direcciones en cualquier celular. Si es tu primera vez, tu cuenta se crea sola.</p>

          <div className="ta-field">
            <input
              id="ta-contacto" type="text" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
              required autoFocus placeholder=" " value={contacto} onChange={(e) => setContacto(e.target.value)}
            />
            <label htmlFor="ta-contacto">Correo o celular</label>
          </div>

          {errorMsg}

          <button type="submit" className="ta-btn" disabled={busy || !contactoOk}>{busy ? 'Enviando…' : 'Enviarme un código'}</button>
          <div className="ta-or">O</div>
          <button type="button" className="ta-btn tonal" style={{ marginTop: 12 }} onClick={() => router.push('/')}>
            <span className="ms">storefront</span> Solo estoy mirando
          </button>
          <p className="ta-sub" style={{ textAlign: 'center', fontSize: 13, marginTop: 10 }}>No necesitas cuenta para mirar ni para pedir la primera vez.</p>

        </form>
      )}

      {paso === 'codigo' && (
        <div className="ta-step">
          <button type="button" className="ta-back" onClick={volver} aria-label="Volver"><span className="ms">arrow_back</span></button>
          <h1 className="ta-title">Escribe el código</h1>
          <p className="ta-sub">
            Lo enviamos a <strong>{quien}</strong>
            {envio?.metodo === 'correo' ? '. Llega en segundos; revisa también spam o promociones.' : ' por SMS.'}
          </p>

          {aviso && <div className="ta-msg info"><span className="ms">info</span><span>{aviso}</span></div>}

          <div style={{ marginTop: 26 }}>
            <CodigoInput valor={otp} onChange={setOtp} onCompleto={confirmar} deshabilitado={busy} error={Boolean(error)} />
          </div>

          <div aria-live="polite" style={{ minHeight: 24, marginTop: 14, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: error ? 'var(--ta-error)' : 'var(--ta-muted)' }}>
            {busy ? 'Verificando…' : error}
          </div>

          <button type="button" className="ta-link" disabled={espera > 0 || busy} onClick={() => mandarCodigo()}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
