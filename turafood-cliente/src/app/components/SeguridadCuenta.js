'use client';

/**
 * SEGURIDAD DE LA CUENTA (en Cuenta)
 *
 * · Celular verificado: es lo que identifica la cuenta (como en Uber o Rappi).
 * · Contraseña: opcional. Con ella se entra con celular + contraseña sin
 *   esperar el SMS; sin ella siempre se puede entrar con un código.
 * · Quien todavía no verificó su celular ve una invitación a entrar.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { guardarContrasena, validarContrasena, MIN_CONTRASENA } from '@/lib/cuenta';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';

export default function SeguridadCuenta({ plano = false }) {
  const router = useRouter();
  const [estado, setEstado] = useState(undefined);      // undefined = cargando | { verificado, tel, conClave }
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!isConfigured()) return undefined;
    let vivo = true;
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return;
      const u = session?.user;
      const verificado = Boolean(u && !u.is_anonymous && u.phone && u.phone_confirmed_at);
      setEstado({
        verificado,
        tel: u?.phone ? mostrarCelular(normalizarCelularCO(u.phone) || `+${u.phone}`) : '',
        conClave: Boolean(u?.user_metadata?.tiene_contrasena),
      });
    });
    return () => { vivo = false; };
  }, []);

  if (estado === undefined) return null;

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const motivo = validarContrasena(clave);
    if (motivo) { setError(motivo); return; }
    setGuardando(true);
    try {
      await guardarContrasena(clave);
      setEstado((s) => ({ ...s, conClave: true }));
      setListo(true);
      setAbierto(false);
      setClave('');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!estado.verificado) {
    return (
      <section style={plano ? { ...S.tarjeta, margin: 0 } : S.tarjeta}>
        <div style={S.fila}>
          <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>phone_iphone</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>Entra con tu celular</div>
            <div style={S.texto}>Lleva tu historial y tus direcciones a cualquier celular. Sin contraseñas obligatorias.</div>
          </div>
          <button onClick={() => router.push('/auth?next=/account')} style={S.boton}>Entrar</button>
        </div>
      </section>
    );
  }

  return (
    <section style={plano ? { ...S.tarjeta, margin: 0 } : S.tarjeta}>
      <div style={S.fila}>
        <span style={{ ...S.icono, background: 'var(--green)' }}><span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>verified_user</span></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.titulo}>Celular verificado</div>
          <div style={S.texto}>+57 {estado.tel}</div>
        </div>
      </div>

      <div style={{ ...S.fila, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>lock</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>Contraseña</div>
          <div style={S.texto}>
            {listo ? 'Guardada. Ya puedes entrar con tu celular y tu contraseña.'
              : estado.conClave ? 'Puedes entrar con ella o con un código por SMS.'
                : 'Opcional: entra sin esperar el SMS.'}
          </div>
        </div>
        {!abierto && <button onClick={() => { setAbierto(true); setListo(false); }} style={S.enlace}>{estado.conClave ? 'Cambiar' : 'Crear'}</button>}
      </div>

      {abierto && (
        <form onSubmit={guardar} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={ver ? 'text' : 'password'} autoFocus autoComplete="new-password"
              value={clave} onChange={(e) => setClave(e.target.value)}
              placeholder={`Mínimo ${MIN_CONTRASENA} caracteres`} aria-label="Nueva contraseña" style={S.campo}
            />
            <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} style={S.ojo}>
              <span className="ms" style={{ fontSize: 20 }}>{ver ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
          {error && <div role="alert" style={S.error}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button type="submit" disabled={guardando || clave.length < MIN_CONTRASENA} style={{ ...S.boton, flex: 1, opacity: guardando || clave.length < MIN_CONTRASENA ? 0.6 : 1 }}>
              {guardando ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            <button type="button" onClick={() => { setAbierto(false); setError(''); setClave(''); }} style={S.cancelar}>Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}

const S = {
  tarjeta: { margin: '14px 20px 0', padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18 },
  fila: { display: 'flex', alignItems: 'center', gap: 12 },
  icono: { width: 42, height: 42, borderRadius: 13, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 15, color: 'var(--text)' },
  texto: { fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 },
  boton: { height: 42, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', flex: 'none' },
  enlace: { background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: 14, cursor: 'pointer', flex: 'none' },
  campo: { flex: 1, minWidth: 0, height: 46, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 16 },
  ojo: { width: 46, height: 46, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--muted)', cursor: 'pointer', flex: 'none' },
  cancelar: { height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  error: { marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' },
};
