'use client';

/**
 * VERIFICAR EL CELULAR ANTES DE PEDIR
 *
 * El primer pedido no pide nada. Para el segundo (o si ese celular ya tiene
 * cuenta) se manda un código por SMS al número del pedido, y con eso se
 * entra a la cuenta de verdad: historial, direcciones y pedidos se quedan.
 *
 *   · Misma cuenta de invitado → el celular pasa a ser suyo (`vincular`).
 *   · El celular ya era de otra cuenta → se entra a ESA cuenta (`ingresar`).
 *
 * `onVerificado({ cambioDeUsuario })` le avisa al checkout si ahora es otra
 * cuenta (sus direcciones guardadas son otras).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarCodigo, confirmarCodigo, CANAL_POR_DEFECTO } from '@/lib/cuenta';
import { usuarioActual } from '@/lib/sesion';
import { mostrarCelular, normalizarCelularCO, codigoValido } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 45;

export default function VerificarCelular({ open, celular, onVerificado, onCerrar }) {
  const [paso, setPaso] = useState('enviando');     // enviando | codigo | error
  const [envio, setEnvio] = useState(null);         // { tel, modo, canal }
  const [aviso, setAviso] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [espera, setEspera] = useState(0);
  const idInicial = useRef(null);
  const caja = useRef(null);

  const mandar = useCallback(async (opciones = {}) => {
    try {
      let r;
      try {
        r = await enviarCodigo(celular, { canal: CANAL_POR_DEFECTO, ...opciones });
      } catch (e) {
        // El número ya es de otra cuenta: en vez de abrir una aparte, se entra a esa
        if (e.message === 'EXISTE' && !opciones.forzarIngreso) {
          setAviso('Este número ya tiene una cuenta en TuraFood. Te mandamos el código para entrar a ella.');
          r = await enviarCodigo(celular, { canal: CANAL_POR_DEFECTO, forzarIngreso: true });
        } else {
          throw e;
        }
      }
      setEnvio(r);
      setPaso('codigo');
      setEspera(ESPERA_REENVIO);
    } catch (e) {
      setError(e.message === 'EXISTE' ? 'No pudimos enviar el código. Inténtalo de nuevo.' : e.message);
      setPaso('error');
    }
  }, [celular]);

  /** Pedir otro código (o reintentar): vuelve a "enviando" y manda */
  const reintentar = (opciones) => {
    setError('');
    setPaso('enviando');
    mandar(opciones);
  };

  // Se monta solo cuando hay que verificar: el código se manda solo, la persona ya sabe que va a pedirlo
  useEffect(() => {
    usuarioActual().then((u) => { idInicial.current = u?.id ?? null; });
    const t = setTimeout(() => mandar(), 0);
    return () => clearTimeout(t);
    // una vez por apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  useEffect(() => { if (paso === 'codigo') caja.current?.focus(); }, [paso]);

  const confirmar = async (e) => {
    e?.preventDefault();
    if (!envio || !codigoValido(codigo)) { setError('El código tiene 6 dígitos.'); return; }
    setTrabajando(true);
    setError('');
    try {
      const user = await confirmarCodigo({ tel: envio.tel, codigo, modo: envio.modo });
      onVerificado?.({ cambioDeUsuario: Boolean(idInicial.current && user?.id && user.id !== idInicial.current) });
    } catch (err) {
      setError(err.message);
      setTrabajando(false);
    }
  };

  if (!open) return null;

  const tel = mostrarCelular(normalizarCelularCO(celular) || celular);

  return (
    <div role="dialog" aria-modal="true" aria-label="Verifica tu celular"
      style={S.fondo} onClick={(e) => { if (e.target === e.currentTarget && !trabajando) onCerrar?.(); }}>
      <div style={S.hoja}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 24, color: '#fff' }}>sms</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>Verifica tu celular</div>
            <div style={S.texto}>
              {paso === 'enviando' ? `Enviando el código a ${tel}…`
                : paso === 'codigo' ? `Escribe el código de 6 dígitos que enviamos al ${tel}.`
                  : 'No pudimos enviar el código.'}
            </div>
          </div>
          <button onClick={onCerrar} disabled={trabajando} aria-label="Cerrar" style={S.cerrar}>
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {aviso && <div role="status" style={S.aviso}>{aviso}</div>}

        {paso === 'codigo' && (
          <form onSubmit={confirmar} style={{ marginTop: 16 }}>
            <input
              ref={caja} value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" maxLength={6}
              aria-label="Código de verificación" style={S.campo}
            />
            <button type="submit" disabled={trabajando || codigo.length !== 6} style={{ ...S.boton, opacity: trabajando || codigo.length !== 6 ? 0.6 : 1 }}>
              {trabajando ? 'Verificando…' : 'Verificar y pedir'}
            </button>
            <button type="button" disabled={espera > 0 || trabajando} onClick={() => reintentar(envio?.modo === 'ingresar' ? { forzarIngreso: true } : {})} style={S.reenviar}>
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
            </button>
          </form>
        )}

        {paso === 'error' && (
          <button onClick={() => reintentar()} style={{ ...S.boton, marginTop: 16 }}>Intentar de nuevo</button>
        )}

        {error && <div role="alert" style={S.error}>{error}</div>}

        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Así tu cuenta queda protegida y tus pedidos y direcciones te acompañan en cualquier celular. Sin contraseñas.
        </p>
      </div>
    </div>
  );
}

const S = {
  fondo: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  hoja: { width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: 20, boxShadow: '0 -12px 40px rgba(0,0,0,.25)' },
  icono: { width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--text)' },
  texto: { fontSize: 13.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 },
  cerrar: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', flex: 'none' },
  aviso: { marginTop: 14, padding: '10px 12px', borderRadius: 12, background: 'color-mix(in srgb, var(--primary) 10%, var(--surface))', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 },
  campo: { width: '100%', height: 56, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', textAlign: 'center', fontSize: 26, fontWeight: 800, letterSpacing: '.4em' },
  boton: { width: '100%', height: 52, marginTop: 12, borderRadius: 14, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  reenviar: { width: '100%', marginTop: 8, height: 40, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  error: { marginTop: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' },
};
