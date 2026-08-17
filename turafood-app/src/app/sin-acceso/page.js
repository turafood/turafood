'use client';

/**
 * Alguien con sesión válida pero de otro rol (cliente o admin) llegó aquí.
 * No es un error suyo: simplemente este dominio no es el de su cuenta.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function SinAccesoPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <span style={S.icon}>
          <span className="ms" style={{ fontSize: 30, color: 'var(--muted)' }}>lock_person</span>
        </span>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, marginTop: 16 }}>
          Esta cuenta no es de aquí
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
          app.turafood.com es para negocios y repartidores. Si eres cliente,
          tu app es <b style={{ color: 'var(--text)' }}>turafood.com</b>. Si administras
          la plataforma, entra por <b style={{ color: 'var(--text)' }}>dash.turafood.com</b>.
        </div>
        <a href="https://turafood.com" style={S.primary}>Ir a turafood.com</a>
        <button onClick={signOut} disabled={busy} style={S.secondary}>
          {busy ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 24, background: 'var(--bg)',
  },
  card: {
    width: '100%', maxWidth: 420, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 22, padding: 28,
    textAlign: 'center', boxShadow: 'var(--shadow)',
  },
  icon: {
    width: 62, height: 62, borderRadius: '50%', background: 'var(--surface2)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: 15, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 14.5, marginTop: 22, textDecoration: 'none',
  },
  secondary: {
    width: '100%', height: 48, borderRadius: 15, border: '1px solid var(--border)',
    fontWeight: 700, fontSize: 14, marginTop: 10, color: 'var(--muted)',
  },
};
