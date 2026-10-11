'use client';

/**
 * CONFIRMA TU CELULAR (al pulsar "Pedir")
 *
 * Todo pedido sale con un celular verificado por SMS: así el negocio y el
 * repartidor tienen un número real al que escribir y se frenan los pedidos
 * falsos. Se pide al final —la persona ya eligió todo— y una sola vez por
 * dispositivo: después la sesión queda verificada.
 *
 *   · Misma cuenta de invitado → el celular pasa a ser suyo (`vincular`):
 *     su dirección y su canasta se quedan donde estaban.
 *   · El celular ya era de otra cuenta → se entra a ESA cuenta (`ingresar`).
 *
 * `onVerificado({ cambioDeUsuario })` le avisa al checkout si ahora es otra
 * cuenta (sus direcciones guardadas son otras).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarCodigo, confirmarCodigo, CANAL_POR_DEFECTO } from '@/lib/cuenta';
import { usuarioActual } from '@/lib/sesion';
import { linkSoporte } from '@/lib/contacto';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 45;

export default function VerificarCelular({ celular, onVerificado, onCerrar, onCambiarNumero }) {
  const [paso, setPaso] = useState('enviando');     // enviando | codigo | error
  const [envio, setEnvio] = useState(null);         // { tel, modo, canal }
  const [aviso, setAviso] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [fallos, setFallos] = useState(0);
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
          setAviso('Este número ya tiene una cuenta en TuraFood. Te enviamos el código para entrar a ella, con tu historial.');
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
    setCodigo('');
    setPaso('enviando');
    mandar(opciones);
  };

  // Se monta solo cuando hay que verificar: el código se envía solo, la persona ya sabe que va a pedirlo
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

  const confirmar = async (valor) => {
    if (!envio || trabajando) return;
    setTrabajando(true);
    setError('');
    try {
      const user = await confirmarCodigo({ tel: envio.tel, codigo: valor, modo: envio.modo });
      onVerificado?.({ cambioDeUsuario: Boolean(idInicial.current && user?.id && user.id !== idInicial.current) });
    } catch (err) {
      setError(err.message);
      setFallos((n) => n + 1);
      setCodigo('');
      setTrabajando(false);
      caja.current?.focus();
    }
  };

  /** Al escribir el sexto dígito se confirma solo (sin buscar el botón con el teclado abierto) */
  const alEscribir = (e) => {
    const valor = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCodigo(valor);
    if (valor.length === 6) confirmar(valor);
  };

  const tel = mostrarCelular(normalizarCelularCO(celular) || celular);
  const ayuda = linkSoporte(`Hola TuraFood, no me llega el código al ${tel}`);

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirma tu celular"
      style={S.fondo} onClick={(e) => { if (e.target === e.currentTarget && !trabajando) onCerrar?.(); }}>
      <div style={S.hoja}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 24, color: '#fff' }}>sms</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>Confirma tu celular</div>
            <div style={S.texto}>
              {paso === 'enviando' ? `Enviando el código al ${tel}…`
                : paso === 'codigo' ? `Escribe el código de 6 dígitos que enviamos por SMS al ${tel}.`
                  : 'No pudimos enviar el código.'}
            </div>
          </div>
          <button onClick={onCerrar} disabled={trabajando} aria-label="Cerrar" style={S.cerrar}>
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {aviso && <div role="status" style={S.aviso}>{aviso}</div>}

        {paso === 'codigo' && (
          <div style={{ marginTop: 16 }}>
            <input
              ref={caja} value={codigo} onChange={alEscribir} disabled={trabajando}
              inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" maxLength={6}
              aria-label="Código de verificación" style={S.campo}
            />
            <div aria-live="polite" style={{ minHeight: 20, marginTop: 10, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: error ? 'var(--primary)' : 'var(--muted)' }}>
              {trabajando ? 'Verificando y haciendo tu pedido…' : error}
            </div>
            <button type="button" disabled={espera > 0 || trabajando}
              onClick={() => reintentar(envio?.modo === 'ingresar' ? { forzarIngreso: true } : {})}
              style={S.enlace}>
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
            </button>
          </div>
        )}

        {paso === 'error' && (
          <>
            {error && <div role="alert" style={{ ...S.error, marginTop: 14 }}>{error}</div>}
            <button onClick={() => reintentar()} style={{ ...S.boton, marginTop: 14 }}>Intentar de nuevo</button>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" onClick={onCambiarNumero} disabled={trabajando} style={S.secundario}>
            ¿Número equivocado? Cámbialo
          </button>
          {(fallos >= 2 || paso === 'error') && (
            <a href={ayuda} target="_blank" rel="noopener noreferrer" style={{ ...S.secundario, textDecoration: 'none' }}>
              ¿No te llega? Escríbenos
            </a>
          )}
        </div>

        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Así el negocio y el repartidor saben que eres tú, y tu historial y tus direcciones te acompañan en cualquier celular. Sin contraseñas.
        </p>
      </div>
    </div>
  );
}

const S = {
  fondo: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  hoja: { width: '100%', maxWidth: 480, background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: 20, paddingBottom: 'max(20px, env(safe-area-inset-bottom))', boxShadow: '0 -12px 40px rgba(0,0,0,.25)' },
  icono: { width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--text)' },
  texto: { fontSize: 13.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 },
  cerrar: { width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', flex: 'none' },
  aviso: { marginTop: 14, padding: '10px 12px', borderRadius: 12, background: 'color-mix(in srgb, var(--primary) 10%, var(--surface))', fontSize: 13, color: 'var(--text)', lineHeight: 1.4 },
  campo: { width: '100%', height: 60, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', textAlign: 'center', fontSize: 28, fontWeight: 800, letterSpacing: '.4em' },
  boton: { width: '100%', height: 52, borderRadius: 14, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  enlace: { width: '100%', marginTop: 4, height: 40, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  secundario: { background: 'none', border: 'none', padding: '6px 0', color: 'var(--muted)', fontWeight: 700, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' },
  error: { fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' },
};
