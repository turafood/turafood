'use client';

/**
 * EMPEZAR A OPERAR — el "go live" del demo
 *
 * Solo tres datos: nombre del negocio, celular y correo. Todo lo demás (dirección,
 * menú, horarios, documentos) se completa después, ya dentro del panel.
 *
 * El correo se verifica con un código (llega en segundos); cuando Twilio esté
 * activo el mismo paso se hace por SMS al celular. Al verificar, `register_business()`
 * crea la ficha y pone el rol: la pantalla no inventa identificadores.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import AuthShell from '../components/AuthShell';
import CodigoInput from '../components/CodigoInput';
import { enviarCodigo, confirmarCodigo, normalizarCorreo } from '@/lib/acceso';
import { normalizarCelularCO } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 30;

export default function EmpezarPage() {
  const router = useRouter();
  const [paso, setPaso] = useState('datos');   // datos | codigo
  const [negocio, setNegocio] = useState('');
  const [celular, setCelular] = useState('');
  const [correo, setCorreo] = useState('');
  const [otp, setOtp] = useState('');
  const [envio, setEnvio] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [espera, setEspera] = useState(0);

  const celularE164 = normalizarCelularCO(celular);
  const correoOk = Boolean(normalizarCorreo(correo));
  const listo = negocio.trim().length >= 2 && Boolean(celularE164) && correoOk;

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
        // ese correo ya tiene cuenta: se entra a ella (register_business no duplica)
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
      const { error: rpcError } = await createClient().rpc('register_business', {
        p_name: negocio.trim(),
        p_phone: celularE164,
      });
      if (rpcError) throw new Error(rpcError.message);
      router.replace('/negocio');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setOtp('');
      setBusy(false);
    }
  };

  return (
    <AuthShell variante="negocio">
      {paso === 'datos' && (
        <form onSubmit={mandarCodigo} className="ta-step">
          <h1 className="ta-title">Empieza a vender</h1>
          <p className="ta-sub">Tres datos y estás dentro. Tu menú, dirección y horarios los completas después.</p>

          <div className="ta-field">
            <input id="ta-neg" required autoFocus placeholder=" " autoComplete="organization"
              value={negocio} onChange={(e) => setNegocio(e.target.value)} />
            <label htmlFor="ta-neg">Nombre del negocio</label>
          </div>
          <div className="ta-field">
            <input id="ta-cel" type="tel" inputMode="tel" required placeholder=" " autoComplete="tel"
              value={celular} onChange={(e) => setCelular(e.target.value)} />
            <label htmlFor="ta-cel">Celular (WhatsApp)</label>
          </div>
          <div className="ta-field">
            <input id="ta-mail" type="email" inputMode="email" required placeholder=" " autoComplete="email"
              autoCapitalize="none" spellCheck={false} value={correo} onChange={(e) => setCorreo(e.target.value)} />
            <label htmlFor="ta-mail">Correo</label>
          </div>

          {error && <div className="ta-msg error" role="alert"><span className="ms">error</span><span>{error}</span></div>}

          <button type="submit" className="ta-btn" disabled={busy || !listo}>{busy ? 'Enviando…' : 'Continuar'}</button>
          <p className="ta-sub" style={{ textAlign: 'center', fontSize: 13, marginTop: 14 }}>
            ¿Ya tienes cuenta? <a href="/auth">Entra aquí</a>
          </p>
        </form>
      )}

      {paso === 'codigo' && (
        <div className="ta-step">
          <button type="button" className="ta-back" onClick={() => { setPaso('datos'); setError(null); }} aria-label="Volver"><span className="ms">arrow_back</span></button>
          <h1 className="ta-title">Confirma tu correo</h1>
          <p className="ta-sub">Enviamos un código a <strong>{correo.trim()}</strong>. Llega en segundos; revisa también spam o promociones.</p>

          <div style={{ marginTop: 26 }}>
            <CodigoInput valor={otp} onChange={setOtp} onCompleto={confirmar} deshabilitado={busy} error={Boolean(error)} />
          </div>
          <div aria-live="polite" style={{ minHeight: 24, marginTop: 14, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: error ? 'var(--ta-error)' : 'var(--ta-muted)' }}>
            {busy ? 'Creando tu panel…' : error}
          </div>
          <button type="button" className="ta-link" disabled={espera > 0 || busy} onClick={() => mandarCodigo()}>
            {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
