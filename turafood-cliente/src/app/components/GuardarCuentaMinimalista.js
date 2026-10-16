'use client';

/**
 * GUARDAR CUENTA ULTRA MINIMALISTA & PRO (ESTILO TURA SOFA)
 * 
 * Unifica en una sola tarjeta elegante de alta gama:
 * - Vinculación de cuenta anónima a celular en 1 paso por WhatsApp / SMS.
 * - Enlace opcional colapsable para recibir copia del recibo por correo.
 * - Enlace directo para clientes existentes ("Ya tengo cuenta").
 * - Badge de estado verificado si el usuario ya está autenticado.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { esInvitado } from '@/lib/sesion';
import { enviarCodigo, confirmarCodigo, CANAL_POR_DEFECTO, METODO_POR_DEFECTO } from '@/lib/cuenta';
import { mostrarCelular, normalizarCelularCO, codigoValido } from '@/lib/direcciones.mjs';
import { pedirRecibo, getRecibo } from '@/lib/recibo';
import { createClient, isConfigured } from '@/utils/supabase/client';

const ESPERA_REENVIO = 45;

export default function GuardarCuentaMinimalista({ orderId, telefonoInicial = '', className = '' }) {
  const router = useRouter();
  const [esInv, setEsInv] = useState(METODO_POR_DEFECTO === 'sms');   // con verificación por correo, el pedido ya deja la cuenta guardada
  const [userPhone, setUserPhone] = useState('');
  const [paso, setPaso] = useState('telefono'); // 'telefono' | 'codigo' | 'listo'
  const [celular, setCelular] = useState(telefonoInicial);
  const [codigo, setCodigo] = useState('');
  const [envio, setEnvio] = useState(null);
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [mostrarEmail, setMostrarEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [emailGuardado, setEmailGuardado] = useState(false);
  const [emailEnviando, setEmailEnviando] = useState(false);
  const cajaCodigo = useRef(null);

  // Comprobar sesión actual
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConfigured()) return;
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!alive) return;
        const u = session?.user;
        const invitado = await esInvitado();
        if (alive) {
          setEsInv(invitado && METODO_POR_DEFECTO === 'sms');
          if (u?.phone) {
            setUserPhone(mostrarCelular(normalizarCelularCO(u.phone) || u.phone));
          }
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // Pre-cargar celular guardado al hacer el checkout
  useEffect(() => {
    if (celular) return;
    try {
      const p = telefonoInicial || localStorage.getItem('turafood_customer_phone') || '';
      if (p) setCelular(mostrarCelular(normalizarCelularCO(p) || p).replace(/^\+57\s?/, ''));
    } catch {}
  }, [telefonoInicial, celular]);

  // Temporizador de reenvío
  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Focus en el código
  useEffect(() => {
    if (paso === 'codigo') cajaCodigo.current?.focus();
  }, [paso]);

  // Si ya tiene cuenta verificada
  if (!esInv && userPhone) {
    return (
      <div style={S.verifiedCard} className={className}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={S.checkBadge}>
            <span className="ms ms-fill" style={{ fontSize: 18, color: '#10B981' }}>verified</span>
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              Pedido vinculado a tu cuenta
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              {userPhone} · Puedes ver tu historial en cualquier momento.
            </div>
          </div>
        </div>
        <button
          onClick={() => router.push('/account')}
          style={S.verCuentaBtn}
        >
          Mi cuenta
        </button>
      </div>
    );
  }

  const celularOk = Boolean(normalizarCelularCO(celular));

  const handleEnviar = async (opts = {}) => {
    setError('');
    setTrabajando(true);
    try {
      const r = await enviarCodigo(celular, opts);
      setEnvio(r);
      setPaso('codigo');
      setCodigo('');
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      if (err.message === 'EXISTE') {
        setError('Este celular ya está registrado. Entra a tu cuenta para ver todos tus pedidos.');
      } else {
        setError(err.message || 'Error al enviar código');
      }
    } finally {
      setTrabajando(false);
    }
  };

  const handleConfirmar = async (e) => {
    e?.preventDefault();
    if (!codigoValido(codigo)) {
      setError('El código debe ser de 4 o 6 dígitos.');
      return;
    }
    setError('');
    setTrabajando(true);
    try {
      await confirmarCodigo({ tel: envio.tel, codigo, modo: envio.modo });
      setPaso('listo');
      try { window.dispatchEvent(new CustomEvent('turafood:cuenta-guardada')); } catch {}
    } catch (err) {
      setError(err.message || 'Código incorrecto o vencido');
    } finally {
      setTrabajando(false);
    }
  };

  const handleGuardarEmail = async (e) => {
    e?.preventDefault();
    if (!email || !email.includes('@')) return;
    setEmailEnviando(true);
    setError('');
    try {
      await pedirRecibo(orderId, email);
      setEmailGuardado(true);
    } catch (err) {
      setError(err.message || 'No se pudo guardar el correo');
    } finally {
      setEmailEnviando(false);
    }
  };

  return (
    <div style={S.card} className={className}>
      {paso === 'listo' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
          <span style={{ ...S.checkBadge, background: '#E6F6EE' }}>
            <span className="ms ms-fill" style={{ fontSize: 22, color: '#10B981' }}>check_circle</span>
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              ¡Tu cuenta ha quedado guardada!
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Tus direcciones y pedidos ahora están seguros en tu cuenta de TuraFood.
            </div>
          </div>
        </div>
      ) : paso === 'codigo' ? (
        <form onSubmit={handleConfirmar} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
              Escribe el código de verificación
            </div>
            <button
              type="button"
              onClick={() => { setPaso('telefono'); setError(''); }}
              style={S.textBtn}
            >
              Cambiar número
            </button>
          </div>
          
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Enviado por {envio?.canal === 'whatsapp' ? 'WhatsApp' : 'SMS'} al +57 {mostrarCelular(envio?.tel || '').replace(/^\+57\s?/, '')}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input
              ref={cajaCodigo}
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              style={S.otpInput}
            />
            <button
              type="submit"
              disabled={trabajando || codigo.length < 6}
              style={{
                ...S.primaryBtn,
                opacity: codigo.length === 6 && !trabajando ? 1 : 0.6,
                flex: 'none',
                minWidth: 110,
              }}
            >
              {trabajando ? 'Validando…' : 'Confirmar'}
            </button>
          </div>

          {error && <div style={S.errorText}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <button
              type="button"
              disabled={espera > 0 || trabajando}
              onClick={() => handleEnviar({ canal: envio?.canal === 'whatsapp' ? 'sms' : 'whatsapp' })}
              style={{ ...S.textBtn, opacity: espera > 0 ? 0.6 : 1 }}
            >
              {espera > 0 ? `Reenviar en ${espera}s` : `Reenviar por ${envio?.canal === 'whatsapp' ? 'SMS' : 'WhatsApp'}`}
            </button>
          </div>
        </form>
      ) : (
        <div>
          {/* Header Minimalista */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={S.sparkleBadge}>
                <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--primary)' }}>auto_awesome</span>
              </span>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  Guarda este pedido en tu cuenta
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                  Conserva tus direcciones y compras sin contraseñas obligatorias.
                </div>
              </div>
            </div>
          </div>

          {/* Formulario Inline Ultra-PRO */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={S.inputGroup}>
              <span style={S.inputPrefix}>+57</span>
              <input
                value={celular}
                onChange={(e) => {
                  setCelular(e.target.value);
                  setError('');
                }}
                inputMode="tel"
                placeholder="300 123 4567"
                style={S.phoneInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && celularOk && !trabajando) void handleEnviar();
                }}
              />
            </div>
            <button
              onClick={() => handleEnviar()}
              disabled={!celularOk || trabajando}
              style={{
                ...S.primaryBtn,
                opacity: celularOk && !trabajando ? 1 : 0.6,
                flex: 'none',
              }}
            >
              {trabajando ? 'Enviando…' : 'Guardar'}
            </button>
          </div>

          {error && <div style={S.errorText}>{error}</div>}

          {/* Enlaces de pie limpios */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              onClick={() => router.push('/auth?next=' + encodeURIComponent(window.location.pathname + window.location.search))}
              style={S.textBtn}
            >
              ¿Ya tienes cuenta? <b>Iniciar sesión</b>
            </button>

            {orderId && (
              <button
                type="button"
                onClick={() => setMostrarEmail(!mostrarEmail)}
                style={{ ...S.textBtn, color: mostrarEmail ? 'var(--primary)' : 'var(--muted)' }}
              >
                {emailGuardado ? '✓ Recibo solicitado' : mostrarEmail ? 'Ocultar correo' : '¿Copia por correo?'}
              </button>
            )}
          </div>

          {/* Campo desplegable sutil de Correo */}
          {mostrarEmail && orderId && !emailGuardado && (
            <form onSubmit={handleGuardarEmail} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@gmail.com"
                style={S.emailInput}
              />
              <button
                type="submit"
                disabled={!email || !email.includes('@') || emailEnviando}
                style={S.secondaryBtn}
              >
                {emailEnviando ? 'Enviando…' : 'Enviar copia'}
              </button>
            </form>
          )}

          {emailGuardado && (
            <div style={{ fontSize: 11.5, color: '#10B981', fontWeight: 700, marginTop: 8 }}>
              ✓ Te enviaremos una copia del recibo a tu correo al completarse la entrega.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 20,
    padding: '16px 18px',
    boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
    transition: 'all 0.2s ease',
  },
  verifiedCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  checkBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: 'rgba(16, 185, 129, 0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
  },
  sparkleBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
  },
  verCuentaBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '6px 14px',
    fontSize: 12.5,
    fontWeight: 700,
    color: 'var(--text)',
    cursor: 'pointer',
    flex: 'none',
  },
  inputGroup: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 6,
  },
  inputPrefix: {
    fontSize: 13,
    fontWeight: 800,
    color: 'var(--muted)',
    flex: 'none',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text)',
  },
  emailInput: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 10,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    padding: '0 12px',
    fontSize: 13,
    color: 'var(--text)',
    outline: 'none',
  },
  otpInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    fontSize: 20,
    fontWeight: 900,
    fontFamily: 'monospace',
    letterSpacing: '0.25em',
    textAlign: 'center',
    color: 'var(--text)',
    outline: 'none',
  },
  primaryBtn: {
    height: 44,
    padding: '0 18px',
    borderRadius: 12,
    background: 'var(--text)',
    color: 'var(--bg)',
    fontSize: 13.5,
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.12s ease',
  },
  secondaryBtn: {
    height: 38,
    padding: '0 14px',
    borderRadius: 10,
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
    transition: 'color 0.15s ease',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: 700,
    marginTop: 2,
  },
};
