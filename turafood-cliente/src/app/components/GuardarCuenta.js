'use client';

/**
 * "GUARDA TU CUENTA": quien pidió sin registrarse la termina con un código.
 *
 * Pedir primero y registrarse después es lo que más convierte: nadie tiene que
 * crear una cuenta con el carrito lleno. Cuando el pedido ya salió, esta
 * tarjeta le ofrece guardar su historial y sus direcciones verificando el
 * celular con un código por WhatsApp (o SMS). Es la MISMA cuenta que se creó
 * al pedir: no se pierde nada de lo que hizo sin registrarse.
 *
 * Solo aparece para sesiones de invitado, y desaparece sola cuando la cuenta
 * queda guardada.
 */

import { useEffect, useRef, useState } from 'react';
import { esInvitado } from '@/lib/sesion';
import { enviarCodigo, confirmarCodigo, CANAL_POR_DEFECTO, METODO_POR_DEFECTO } from '@/lib/cuenta';
import { mostrarCelular, normalizarCelularCO, codigoValido } from '@/lib/direcciones.mjs';

const ESPERA_REENVIO = 45;

export default function GuardarCuenta({ telefonoInicial = '', compacto = false }) {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState('inicio');        // inicio | telefono | codigo | listo
  const [celular, setCelular] = useState(telefonoInicial);
  const [codigo, setCodigo] = useState('');
  const [envio, setEnvio] = useState(null);          // { tel, modo, canal }
  const [error, setError] = useState('');
  const [existe, setExiste] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [espera, setEspera] = useState(0);
  const cajaCodigo = useRef(null);

  useEffect(() => {
    let vivo = true;
    // Esta tarjeta guarda la cuenta con el celular (SMS): solo tiene sentido cuando el SMS está activo
    esInvitado().then((v) => { if (vivo) setVisible(v && METODO_POR_DEFECTO === 'sms'); }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (celular) return;
    let tel = telefonoInicial;
    if (!tel) {
      // El celular que dejó al pedir (checkout lo guarda en el navegador)
      try { tel = localStorage.getItem('turafood_customer_phone') || ''; } catch { tel = ''; }
    }
    if (tel) setCelular(mostrarCelular(normalizarCelularCO(tel) || tel).replace(/^\+57\s?/, ''));
    // solo al montar o cuando llega el dato inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefonoInicial]);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [espera]);

  useEffect(() => {
    if (paso === 'codigo') cajaCodigo.current?.focus();
  }, [paso]);

  if (!visible) return null;

  const mandar = async (opts = {}) => {
    setError(''); setExiste(false); setTrabajando(true);
    try {
      const r = await enviarCodigo(celular, opts);
      setEnvio(r); setPaso('codigo'); setCodigo(''); setEspera(ESPERA_REENVIO);
    } catch (e) {
      if (e.message === 'EXISTE') { setExiste(true); setError('Ese número ya tiene una cuenta en TuraFood.'); }
      else setError(e.message);
    } finally {
      setTrabajando(false);
    }
  };

  const confirmar = async (e) => {
    e?.preventDefault();
    if (!codigoValido(codigo)) { setError('El código tiene 6 dígitos.'); return; }
    setError(''); setTrabajando(true);
    try {
      await confirmarCodigo({ tel: envio.tel, codigo, modo: envio.modo });
      setPaso('listo');
      try { window.dispatchEvent(new CustomEvent('turafood:cuenta-guardada')); } catch { /* sin eventos */ }
      setTimeout(() => setVisible(false), 4500);
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  const celularOk = Boolean(normalizarCelularCO(celular));

  return (
    <section style={{ ...S.tarjeta, padding: compacto ? 14 : 18 }} aria-live="polite">
      {paso === 'inicio' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 24, color: '#fff' }}>bookmark_added</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>Guarda tu pedido y tus direcciones</div>
            <div style={S.texto}>Verifica tu celular con un código. Sin contraseñas y sin perder lo que ya pediste.</div>
          </div>
          <button onClick={() => setPaso('telefono')} style={S.boton}>Guardar</button>
        </div>
      )}

      {paso === 'telefono' && (
        <div>
          <div style={S.titulo}>¿A qué celular te mandamos el código?</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span style={S.prefijo}>+57</span>
            <input
              value={celular}
              onChange={(e) => { setCelular(e.target.value); setError(''); setExiste(false); }}
              inputMode="tel" autoComplete="tel-national" placeholder="300 123 4567" aria-label="Celular"
              style={S.entrada}
              onKeyDown={(e) => { if (e.key === 'Enter' && celularOk) void mandar(); }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={() => mandar({ canal: 'whatsapp' })} disabled={!celularOk || trabajando} style={{ ...S.canal, ...S.whatsapp, opacity: celularOk ? 1 : 0.5 }}>
              <span style={{ fontWeight: 800 }}>{trabajando ? 'Enviando…' : 'Recibir por WhatsApp'}</span>
            </button>
            <button onClick={() => mandar({ canal: 'sms' })} disabled={!celularOk || trabajando} style={{ ...S.canal, opacity: celularOk ? 1 : 0.5 }}>
              Por SMS
            </button>
          </div>
          {CANAL_POR_DEFECTO === 'sms' && <div style={S.nota}>Te llegará un SMS con el código.</div>}
          {error && <div role="alert" style={S.error}>{error}</div>}
          {existe && (
            <button onClick={() => mandar({ forzarIngreso: true })} style={S.enlace}>
              Entrar con ese número (los pedidos hechos en este celular no se pasan a esa cuenta)
            </button>
          )}
          <button onClick={() => { setPaso('inicio'); setError(''); setExiste(false); }} style={S.volver}>Ahora no</button>
        </div>
      )}

      {paso === 'codigo' && envio && (
        <form onSubmit={confirmar}>
          <div style={S.titulo}>Escribe el código de 6 dígitos</div>
          <div style={S.texto}>
            Lo enviamos por {envio.canal === 'whatsapp' ? 'WhatsApp' : 'SMS'} al +57 {mostrarCelular(envio.tel).replace(/^\+57\s?/, '')}.
          </div>
          <input
            ref={cajaCodigo}
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
            inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="······" aria-label="Código de verificación"
            style={S.codigo}
          />
          {error && <div role="alert" style={S.error}>{error}</div>}
          <button type="submit" disabled={trabajando || codigo.length < 6} style={{ ...S.confirmar, opacity: codigo.length < 6 ? 0.55 : 1 }}>
            {trabajando ? 'Verificando…' : 'Verificar y guardar'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <button type="button" onClick={() => { setPaso('telefono'); setError(''); }} style={S.volver}>Cambiar número</button>
            <button
              type="button" disabled={espera > 0 || trabajando}
              onClick={() => mandar({ canal: envio.canal, forzarIngreso: envio.modo === 'ingresar' })}
              style={{ ...S.volver, opacity: espera > 0 ? 0.5 : 1 }}
            >
              {espera > 0 ? `Reenviar en ${espera}s` : 'Reenviar código'}
            </button>
          </div>
        </form>
      )}

      {paso === 'listo' && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ ...S.icono, background: 'var(--green)' }}><span className="ms ms-fill" style={{ fontSize: 24, color: '#fff' }}>check</span></span>
          <div>
            <div style={S.titulo}>¡Listo, cuenta guardada!</div>
            <div style={S.texto}>La próxima vez entras con un código y ves tus pedidos y direcciones.</div>
          </div>
        </div>
      )}
    </section>
  );
}

const S = {
  tarjeta: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    boxShadow: '0 6px 20px rgba(20,16,10,.06)',
  },
  icono: {
    width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 15.5, letterSpacing: '-.01em' },
  texto: { fontSize: 12.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 },
  boton: {
    flex: 'none', height: 40, padding: '0 16px', borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 800, fontSize: 13.5, boxShadow: '0 6px 16px color-mix(in srgb, var(--primary) 28%, transparent)',
  },
  prefijo: {
    display: 'flex', alignItems: 'center', padding: '0 12px', height: 48, borderRadius: 13,
    background: 'var(--surface2)', border: '1px solid var(--border)', fontWeight: 800, fontSize: 15,
  },
  entrada: {
    flex: 1, minWidth: 0, height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 14px', fontSize: 16, outline: 'none', fontWeight: 600,
  },
  canal: {
    flex: 1, minWidth: 130, height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--surface)', fontWeight: 700, fontSize: 13.5,
  },
  whatsapp: { background: 'linear-gradient(135deg,#25D366,#00A884)', color: '#fff', border: 'none', boxShadow: '0 6px 16px rgba(37,211,102,.3)' },
  nota: { fontSize: 11.5, color: 'var(--muted)', marginTop: 8 },
  codigo: {
    width: '100%', height: 56, marginTop: 12, borderRadius: 14, border: '1.5px solid var(--border)',
    background: 'var(--surface)', textAlign: 'center', fontSize: 26, letterSpacing: '.4em', fontWeight: 800, outline: 'none',
  },
  confirmar: {
    width: '100%', height: 50, marginTop: 12, borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 800, fontSize: 15, boxShadow: '0 8px 20px color-mix(in srgb, var(--primary) 28%, transparent)',
  },
  error: {
    marginTop: 10, padding: '9px 12px', borderRadius: 11, background: 'var(--primary-tint)', color: 'var(--primary)',
    fontSize: 12.5, fontWeight: 700, lineHeight: 1.4,
  },
  enlace: { display: 'block', marginTop: 10, fontSize: 12.5, fontWeight: 800, color: 'var(--primary)', textAlign: 'left', textDecoration: 'underline' },
  volver: { marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' },
};
