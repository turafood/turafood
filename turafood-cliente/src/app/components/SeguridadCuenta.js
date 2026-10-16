'use client';

/**
 * SEGURIDAD DE LA CUENTA (en Cuenta)
 *
 * · Celular verificado: es lo que identifica la cuenta (como en Uber o Rappi).
 * · Sin contraseñas: siempre se entra con un código.
 * · Quien todavía no verificó su celular ve una invitación a entrar.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { mostrarCelular, normalizarCelularCO } from '@/lib/direcciones.mjs';

export default function SeguridadCuenta({ plano = false }) {
  const router = useRouter();
  const [estado, setEstado] = useState(undefined);      // undefined = cargando | { verificado, tel, conClave }

  useEffect(() => {
    if (!isConfigured()) return undefined;
    let vivo = true;
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!vivo) return;
      const u = session?.user;
      const verificado = Boolean(u && !u.is_anonymous && (u.email_confirmed_at || u.phone_confirmed_at));
      setEstado({
        verificado,
        tel: u?.email ? u.email : (u?.phone ? `+57 ${mostrarCelular(normalizarCelularCO(u.phone) || `+${u.phone}`)}` : ''),
        esCorreo: Boolean(u?.email),
      });
    });
    return () => { vivo = false; };
  }, []);

  if (estado === undefined) return null;

  if (!estado.verificado) {
    return (
      <section style={plano ? { ...S.tarjeta, margin: 0 } : S.tarjeta}>
        <div style={S.fila}>
          <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>phone_iphone</span></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>Entra a tu cuenta</div>
            <div style={S.texto}>Lleva tu historial y tus direcciones a cualquier celular. Sin contraseñas.</div>
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
          <div style={S.titulo}>{estado.esCorreo ? 'Correo verificado' : 'Celular verificado'}</div>
          <div style={{ ...S.texto, overflowWrap: 'anywhere' }}>{estado.tel}</div>
        </div>
      </div>

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
