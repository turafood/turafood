'use client';

/**
 * CONFIRMA TU PEDIDO (al pulsar "Pedir")
 *
 * Todo pedido sale con un dato de contacto verificado: así el negocio y el repartidor
 * saben que hay una persona real detrás y se frenan los pedidos falsos. Se pide al final
 * —la persona ya eligió todo— y una sola vez por dispositivo.
 *
 *   · HOY por CORREO: el código llega al instante desde pedidos@turafood.com.
 *   · Con `NEXT_PUBLIC_OTP_METODO=sms` (cuando Twilio esté verificado) se manda por SMS
 *     al celular del pedido y no se pide correo.
 *
 *   · Misma cuenta de invitado → el dato pasa a ser suyo (`vincular`): su dirección y su
 *     canasta se quedan donde estaban.
 *   · El dato ya era de otra cuenta → se entra a ESA cuenta (`ingresar`).
 *
 * `onVerificado({ cambioDeUsuario })` le avisa al checkout si ahora es otra cuenta
 * (sus direcciones guardadas son otras).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarCodigo, confirmarCodigo, normalizarCorreo, correoValido, METODO_POR_DEFECTO } from '@/lib/cuenta';
import { usuarioActual } from '@/lib/sesion';
import { linkSoporte } from '@/lib/contacto';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';
import CodigoInput from './CodigoInput';

const ESPERA_REENVIO = 30;

/** Esconde la mitad del correo: ma***@gmail.com */
function enmascarar(c) {
  const [u, d] = String(c).split('@');
  if (!d) return c;
  return `${u.slice(0, 2)}${'•'.repeat(Math.max(2, Math.min(5, u.length - 2)))}@${d}`;
}

/** Atajo para abrir la bandeja según el proveedor del correo */
function bandeja(c) {
  const d = String(c).split('@')[1]?.toLowerCase() ?? '';
  if (/gmail|googlemail/.test(d)) return { nombre: 'Gmail', url: 'https://mail.google.com/mail/u/0/#search/from%3Aturafood.com' };
  if (/outlook|hotmail|live|msn/.test(d)) return { nombre: 'Outlook', url: 'https://outlook.live.com/mail/' };
  if (/yahoo/.test(d)) return { nombre: 'Yahoo', url: 'https://mail.yahoo.com/' };
  if (/icloud|me\.com/.test(d)) return { nombre: 'iCloud', url: 'https://www.icloud.com/mail' };
  return null;
}

export default function VerificarCelular({ celular, correoInicial = '', onVerificado, onCerrar, onCambiarNumero }) {
  const porCorreo = METODO_POR_DEFECTO === 'correo';
  const [paso, setPaso] = useState(porCorreo ? 'correo' : 'enviando');   // correo | enviando | codigo | error
  const [correo, setCorreo] = useState(correoInicial);
  const [envio, setEnvio] = useState(null);                              // { contacto, modo, metodo }
  const [aviso, setAviso] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [fallos, setFallos] = useState(0);
  const [espera, setEspera] = useState(0);
  const idInicial = useRef(null);

  const contacto = porCorreo ? normalizarCorreo(correo) : celular;
  const telBonito = mostrarCelular(normalizarCelularCO(celular) || celular);

  const mandar = useCallback(async (destino, opciones = {}) => {
    try {
      let r;
      try {
        r = await enviarCodigo(destino, opciones);
      } catch (e) {
        // Ya era de otra cuenta: en vez de abrir una aparte, se entra a esa
        if (e.message === 'EXISTE' && !opciones.forzarIngreso) {
          setAviso(porCorreo
            ? 'Este correo ya tiene una cuenta en TuraFood. Te enviamos el código para entrar a ella, con tu historial.'
            : 'Este número ya tiene una cuenta en TuraFood. Te enviamos el código para entrar a ella, con tu historial.');
          r = await enviarCodigo(destino, { ...opciones, forzarIngreso: true });
        } else {
          throw e;
        }
      }
      setEnvio(r);
      setCodigo('');
      setPaso('codigo');
      setEspera(ESPERA_REENVIO);
    } catch (e) {
      setError(e.message === 'EXISTE' ? 'No pudimos enviar el código. Inténtalo de nuevo.' : e.message);
      setPaso(porCorreo ? 'correo' : 'error');
    }
  }, [porCorreo]);

  // Con SMS el código sale solo al abrir (la persona ya sabe que va a pedirlo)
  useEffect(() => {
    usuarioActual().then((u) => { idInicial.current = u?.id ?? null; });
    if (porCorreo) return undefined;
    const t = setTimeout(() => mandar(celular), 0);
    return () => clearTimeout(t);
    // una vez por apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  const enviarAlCorreo = (e) => {
    e?.preventDefault();
    setError('');
    if (!correoValido(correo)) { setError('Escribe un correo válido, por ejemplo nombre@correo.com.'); return; }
    setAviso('');
    setPaso('enviando');
    mandar(contacto);
  };

  const reenviar = () => {
    setError('');
    setPaso('enviando');
    mandar(envio?.contacto ?? contacto, envio?.modo === 'ingresar' ? { forzarIngreso: true } : {});
  };

  const confirmar = async (valor) => {
    if (!envio || trabajando) return;
    setTrabajando(true);
    setError('');
    try {
      const user = await confirmarCodigo({ contacto: envio.contacto, codigo: valor, modo: envio.modo });
      onVerificado?.({ cambioDeUsuario: Boolean(idInicial.current && user?.id && user.id !== idInicial.current) });
    } catch (err) {
      setError(err.message);
      setFallos((n) => n + 1);
      setCodigo('');
      setTrabajando(false);
    }
  };

  const destinoVisible = envio ? (envio.metodo === 'correo' ? enmascarar(envio.contacto) : telBonito) : '';
  const abrir = envio?.metodo === 'correo' ? bandeja(envio.contacto) : null;
  const ayuda = linkSoporte(`Hola TuraFood, no me llega el código${porCorreo ? ` al correo ${correo}` : ` al ${telBonito}`}`);

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirma tu pedido"
      style={S.fondo} onClick={(e) => { if (e.target === e.currentTarget && !trabajando) onCerrar?.(); }}>
      <div style={S.hoja}>
        <div style={S.agarre} aria-hidden="true" />
        <button onClick={onCerrar} disabled={trabajando} aria-label="Cerrar" style={S.cerrar}>
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>

        {/* Indicador de pasos */}
        <div aria-hidden="true" style={S.pasosFila}>
          {[porCorreo ? 'Correo' : 'Celular', 'Código', 'Listo'].map((t, i) => {
            const actual = (paso === 'correo' || paso === 'enviando' ? 0 : 1);
            return (
              <div key={t} style={{ flex: 1 }}>
                <div style={{ height: 4, borderRadius: 4, background: i <= actual ? 'var(--primary)' : 'var(--border)', transition: 'background .25s' }} />
                <div style={{ fontSize: 11, fontWeight: 800, marginTop: 6, color: i <= actual ? 'var(--text)' : 'var(--faint, var(--muted))' }}>{t}</div>
              </div>
            );
          })}
        </div>

        <div style={S.cabecera}>
          <div style={S.insignia}>
            <span className="ms ms-fill" style={{ fontSize: 28, color: 'var(--primary)' }}>
              {paso === 'codigo' ? 'mark_email_unread' : porCorreo ? 'alternate_email' : 'sms'}
            </span>
          </div>
          <h2 style={S.titulo}>
            {paso === 'codigo' ? 'Revisa tu bandeja' : porCorreo ? 'Confirma tu pedido' : 'Confirma tu celular'}
          </h2>
          <p style={S.texto}>
            {paso === 'correo' && 'Te enviamos un código de 6 dígitos a tu correo. Es solo la primera vez.'}
            {paso === 'enviando' && 'Enviando tu código…'}
            {paso === 'codigo' && <>Enviamos un código de 6 dígitos a <strong style={{ color: 'var(--text)' }}>{destinoVisible}</strong>. Llega en segundos.</>}
            {paso === 'error' && 'No pudimos enviar el código.'}
          </p>
        </div>

        {aviso && <div role="status" style={S.aviso}>{aviso}</div>}

        {paso === 'correo' && (
          <form onSubmit={enviarAlCorreo} style={{ marginTop: 18 }}>
            <label style={S.campoEnvoltura}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>mail</span>
              <input
                type="email" inputMode="email" autoComplete="email" autoFocus required
                value={correo} onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@gmail.com" aria-label="Tu correo" style={S.campo}
              />
            </label>
            {error && <div role="alert" style={{ ...S.error, marginTop: 10 }}>{error}</div>}
            <button type="submit" disabled={!correoValido(correo)} style={{ ...S.boton, marginTop: 14, opacity: correoValido(correo) ? 1 : 0.55 }}>
              Enviarme el código
            </button>
            <p style={S.pie}>
              Con tu correo puedes recuperar tus pedidos y direcciones desde cualquier celular. Sin contraseñas.
            </p>
          </form>
        )}

        {paso === 'enviando' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '26px 0 8px' }} aria-live="polite">
            <span className="ms" style={{ fontSize: 34, color: 'var(--primary)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
          </div>
        )}

        {paso === 'codigo' && (
          <div style={{ marginTop: 20 }}>
            <CodigoInput valor={codigo} onChange={setCodigo} onCompleto={confirmar} deshabilitado={trabajando} error={Boolean(error)} />

            <div aria-live="polite" style={{ minHeight: 24, marginTop: 14, textAlign: 'center', fontSize: 13.5, fontWeight: 700, color: error ? 'var(--primary)' : 'var(--muted)' }}>
              {trabajando ? 'Verificando y creando tu pedido…' : error}
            </div>

            {abrir && (
              <a href={abrir.url} target="_blank" rel="noopener noreferrer" style={S.botonSecundario}>
                <span className="ms" style={{ fontSize: 18 }}>open_in_new</span> Abrir {abrir.nombre}
              </a>
            )}

            <button type="button" disabled={espera > 0 || trabajando} onClick={reenviar}
              style={{ ...S.enlace, opacity: espera > 0 || trabajando ? 0.55 : 1 }}>
              {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
            </button>
            <p style={{ ...S.pie, marginTop: 4 }}>¿No lo ves? Revisa la carpeta de spam o promociones.</p>
          </div>
        )}

        {paso === 'error' && (
          <div style={{ marginTop: 16 }}>
            {error && <div role="alert" style={S.error}>{error}</div>}
            <button onClick={() => { setPaso('enviando'); mandar(contacto); }} style={{ ...S.boton, marginTop: 12 }}>Intentar de nuevo</button>
          </div>
        )}

        <div style={S.pieAcciones}>
          {paso === 'codigo' && porCorreo ? (
            <button type="button" onClick={() => { setPaso('correo'); setError(''); setCodigo(''); }} disabled={trabajando} style={S.secundario}>
              ¿Correo equivocado? Cámbialo
            </button>
          ) : (
            !porCorreo && <button type="button" onClick={onCambiarNumero} disabled={trabajando} style={S.secundario}>¿Número equivocado? Cámbialo</button>
          )}
          {(fallos >= 2 || paso === 'error') && (
            <a href={ayuda} target="_blank" rel="noopener noreferrer" style={{ ...S.secundario, textDecoration: 'none', color: 'var(--green, #11B26A)' }}>
              ¿No te llega? Escríbenos
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  fondo: { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(12,10,8,.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  hoja: { position: 'relative', width: '100%', maxWidth: 460, background: 'var(--surface)', borderRadius: '28px 28px 0 0', padding: '12px 22px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))', boxShadow: '0 -18px 50px rgba(0,0,0,.28)', animation: 'tfsubir .28s cubic-bezier(.2,0,0,1) both' },
  agarre: { width: 40, height: 4, borderRadius: 4, background: 'var(--border)', margin: '0 auto 14px' },
  cerrar: { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer' },
  pasosFila: { display: 'flex', gap: 8, padding: '0 44px 0 0' },
  cabecera: { textAlign: 'center', marginTop: 20 },
  insignia: { width: 64, height: 64, borderRadius: 20, margin: '0 auto', background: 'color-mix(in srgb, var(--primary) 11%, var(--surface))', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  titulo: { margin: '14px 0 0', fontFamily: 'var(--font-bricolage, inherit)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)' },
  texto: { margin: '8px 0 0', fontSize: 14.5, lineHeight: 1.55, color: 'var(--muted)' },
  aviso: { marginTop: 16, padding: '11px 13px', borderRadius: 14, background: 'color-mix(in srgb, var(--primary) 9%, var(--surface))', fontSize: 13, lineHeight: 1.45, color: 'var(--text)' },
  campoEnvoltura: { display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 16px', borderRadius: 16, background: 'var(--surface2)', border: '1.5px solid var(--border)' },
  campo: { flex: 1, minWidth: 0, height: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 16.5, fontWeight: 600 },
  boton: { width: '100%', height: 54, borderRadius: 16, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 10px 24px color-mix(in srgb, var(--primary) 28%, transparent)' },
  botonSecundario: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 46, borderRadius: 14, border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 800, fontSize: 14.5, textDecoration: 'none' },
  enlace: { width: '100%', marginTop: 6, height: 40, background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: 14, cursor: 'pointer' },
  pieAcciones: { display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  secundario: { background: 'none', border: 'none', padding: '8px 0', color: 'var(--muted)', fontWeight: 700, fontSize: 13, textDecoration: 'underline', cursor: 'pointer' },
  pie: { margin: '12px 0 0', textAlign: 'center', fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)' },
  error: { fontSize: 13.5, fontWeight: 700, color: 'var(--primary)', textAlign: 'center' },
};
