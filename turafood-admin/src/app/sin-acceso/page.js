'use client';

/**
 * PUERTA EQUIVOCADA
 *
 * Alguien con sesión válida pero sin rol de administrador. No le
 * decimos "no tienes permiso" a secas: casi siempre es un negocio o un
 * repartidor que llegó a este dominio por error, así que lo que
 * necesita es el enlace a SU panel, no un regaño.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function SinAccesoPage() {
  const router = useRouter();

  const signOut = async () => {
    if (isConfigured()) await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <span style={S.icon}>
          <span className="ms" style={{ fontSize: 30, color: 'var(--muted)' }}>door_front</span>
        </span>

        <h1 style={S.title}>Esta puerta no es la tuya</h1>
        <p style={S.text}>
          Tu cuenta existe y la sesión está bien, pero dash.turafood.com es la
          consola interna del equipo. Si tienes un negocio o repartes con
          nosotros, tu panel está en el otro dominio.
        </p>

        <a href="https://app.turafood.com" style={S.primary}>
          Ir a app.turafood.com
          <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
        </a>

        <button onClick={signOut} style={S.ghost}>Cerrar sesión</button>

        <p style={S.foot}>
          ¿Deberías tener acceso de administrador? Escríbele a quien maneja la
          consola para que te asigne el rol.
        </p>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, background: 'var(--bg)',
  },
  card: {
    width: '100%', maxWidth: 420, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 26, padding: 30,
    boxShadow: 'var(--shadow)', textAlign: 'center',
  },
  icon: {
    width: 62, height: 62, borderRadius: 20, background: 'var(--bg)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: '18px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 23, letterSpacing: '-.02em',
  },
  text: { margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.6, color: 'var(--muted)' },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    width: '100%', height: 48, borderRadius: 14, marginTop: 22,
    background: 'var(--primary)', color: '#fff', fontSize: 14.5, fontWeight: 700,
    textDecoration: 'none',
  },
  ghost: {
    width: '100%', height: 44, borderRadius: 14, marginTop: 9,
    border: '1px solid var(--border)', fontSize: 13.5, fontWeight: 700,
  },
  foot: { margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.55, color: 'var(--faint)' },
};
