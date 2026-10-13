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
    if (valor.length === 4 && valor === '1234') confirmar(valor);
    else if (valor.length === 6) confirmar(valor);
  };

  const tel = mostrarCelular(normalizarCelularCO(celular) || celular);
  const ayuda = linkSoporte(`Hola TuraFood, no me llega el código al ${tel}`);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Confirma tu celular"
      style={S.fondo}
      onClick={(e) => {
        if (e.target === e.currentTarget && !trabajando) onCerrar?.();
      }}
    >
      <style>{`
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .turafood-input-otp:focus {
          border-color: var(--primary, #FF441F) !important;
          box-shadow: 0 0 0 4px var(--primarySoft, rgba(255, 68, 31, 0.15)) !important;
        }
      `}</style>

      <div style={S.hoja}>
        <button
          onClick={onCerrar}
          disabled={trabajando}
          aria-label="Cerrar"
          style={S.cerrar}
        >
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>

        <div style={S.headerCenter}>
          <div style={S.iconoBadge}>
            <span className="ms ms-fill" style={{ fontSize: 26, color: 'var(--primary, #FF441F)' }}>sms</span>
          </div>
          <h2 style={S.titulo}>Confirma tu celular</h2>
          <p style={S.texto}>
            {paso === 'enviando'
              ? `Enviando el código al ${tel}…`
              : paso === 'codigo'
                ? `Escribe el código de 6 dígitos que enviamos por SMS al ${tel}`
                : 'No pudimos enviar el código.'}
          </p>
        </div>

        {aviso && <div role="status" style={S.aviso}>{aviso}</div>}

        {paso === 'codigo' && (
          <div style={{
            background: 'rgba(255, 68, 31, 0.08)',
            border: '1px dashed var(--primary, #FF441F)',
            borderRadius: 14,
            padding: '10px 14px',
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 12.5,
            color: 'var(--text)',
            textAlign: 'left',
          }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary, #FF441F)', flex: 'none' }}>sms</span>
            <span>
              Te enviamos un SMS con tu código. (Para pruebas usa <strong>1234</strong> si no lo recibes).
            </span>
          </div>
        )}

        {paso === 'codigo' && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <input
              ref={caja}
              value={codigo}
              onChange={alEscribir}
              disabled={trabajando}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="1234 o ••••••"
              maxLength={6}
              aria-label="Código de verificación"
              className="turafood-input-otp"
              style={S.campo}
            />

            <div
              aria-live="polite"
              style={{
                minHeight: 22,
                marginTop: 10,
                textAlign: 'center',
                fontSize: 13.5,
                fontWeight: 700,
                color: error ? 'var(--primary, #FF441F)' : 'var(--muted)',
              }}
            >
              {trabajando ? 'Verificando y creando tu pedido…' : error}
            </div>

            <button
              type="button"
              disabled={espera > 0 || trabajando}
              onClick={() => reintentar(envio?.modo === 'ingresar' ? { forzarIngreso: true } : {})}
              style={{
                ...S.enlace,
                opacity: espera > 0 || trabajando ? 0.6 : 1,
                cursor: espera > 0 || trabajando ? 'not-allowed' : 'pointer',
              }}
            >
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código por SMS'}
            </button>
          </div>
        )}

        {paso === 'error' && (
          <div style={{ marginTop: 16 }}>
            {error && <div role="alert" style={S.error}>{error}</div>}
            <button onClick={() => reintentar()} style={S.boton}>
              Intentar de nuevo
            </button>
          </div>
        )}

        <div style={S.accionesFooter}>
          <button
            type="button"
            onClick={onCambiarNumero}
            disabled={trabajando}
            style={S.secundario}
          >
            ¿Número equivocado? Cámbialo
          </button>

          {(fallos >= 2 || paso === 'error') && (
            <a
              href={ayuda}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...S.secundario, textDecoration: 'none', color: 'var(--green, #11B26A)' }}
            >
              ¿No te llega? Escríbenos
            </a>
          )}
        </div>

        <p style={S.pie}>
          Así el negocio y el repartidor saben que eres tú, y tu historial y tus direcciones te acompañan en cualquier celular. Sin contraseñas.
        </p>
      </div>
    </div>
  );
}

const S = {
  fondo: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box',
  },
  hoja: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--surface, #FFFFFF)',
    borderRadius: 24,
    padding: '28px 24px 22px',
    boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--border)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
  },
  cerrar: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--surface2, #F0EEE9)',
    color: 'var(--text, #17140F)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s, transform 0.15s',
    zIndex: 2,
  },
  headerCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    width: '100%',
  },
  iconoBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    background: 'var(--primarySoft, #FFF0ED)',
    border: '1px solid var(--primarySoftBorder, rgba(255, 68, 31, 0.20))',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titulo: {
    fontFamily: 'var(--font-bricolage, system-ui, sans-serif)',
    fontWeight: 800,
    fontSize: 20,
    color: 'var(--text, #17140F)',
    margin: 0,
    lineHeight: 1.25,
  },
  texto: {
    fontSize: 14,
    color: 'var(--muted, #8C857B)',
    margin: '6px 0 0',
    lineHeight: 1.45,
    maxWidth: 340,
  },
  aviso: {
    marginTop: 14,
    padding: '10px 14px',
    borderRadius: 14,
    background: 'var(--primarySoft, #FFF0ED)',
    border: '1px solid var(--primarySoftBorder, rgba(255, 68, 31, 0.20))',
    fontSize: 13,
    color: 'var(--text, #17140F)',
    lineHeight: 1.45,
    textAlign: 'center',
  },
  campo: {
    width: '100%',
    height: 58,
    borderRadius: 16,
    border: '2px solid var(--border)',
    background: 'var(--surface2, #F0EEE9)',
    color: 'var(--text, #17140F)',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '0.35em',
    outline: 'none',
    boxSizing: 'border-box',
  },
  boton: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    border: 'none',
    background: 'var(--primary, #FF441F)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 12,
    transition: 'opacity 0.15s',
  },
  enlace: {
    width: '100%',
    marginTop: 6,
    height: 38,
    background: 'none',
    border: 'none',
    color: 'var(--primary, #FF441F)',
    fontWeight: 800,
    fontSize: 13.5,
  },
  accionesFooter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  secundario: {
    background: 'none',
    border: 'none',
    padding: '4px 6px',
    color: 'var(--muted, #8C857B)',
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  error: {
    fontSize: 13.5,
    fontWeight: 700,
    color: 'var(--primary, #FF441F)',
    textAlign: 'center',
    marginBottom: 8,
  },
  pie: {
    margin: '16px 0 0',
    fontSize: 11.5,
    color: 'var(--muted, #8C857B)',
    lineHeight: 1.5,
    textAlign: 'center',
  },
};
