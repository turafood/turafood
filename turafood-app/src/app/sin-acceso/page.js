'use client';

/**
 * Alguien con sesión válida pero de otro rol (cliente o admin) llegó aquí.
 * No es un error suyo: simplemente este dominio no es el de su cuenta.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import AuthShell from '../components/AuthShell';

export default function SinAccesoPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rol, setRol] = useState(null);

  // Con el rol a la vista el enlace lleva al panel correcto, no a un regaño
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        const { data } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
        setRol(data?.role ?? null);
      } catch { /* sin sesión: se muestran los enlaces genéricos */ }
    })();
  }, []);

  const signOut = async () => {
    setBusy(true);
    await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <AuthShell variante="negocio">
      <div className="ta-step">
        <div className="ta-msg info" style={{ marginTop: 0, marginBottom: 22 }}><span className="ms">lock_person</span><span>Esta cuenta no es de este panel.</span></div>
        <h1 className="ta-title">Esta cuenta no es de aquí</h1>
        <p className="ta-sub">
          app.turafood.com es para negocios y repartidores. Si eres cliente, tu app es <strong>turafood.com</strong>.
          Si administras la plataforma, entra por <strong>admin.turafood.com</strong>.
        </p>
        {rol === 'admin'
          ? <a href="https://admin.turafood.com" className="ta-btn" style={{ textDecoration: 'none' }}>Ir a la consola admin</a>
          : <a href="https://turafood.com" className="ta-btn" style={{ textDecoration: 'none' }}>Ir a turafood.com</a>}
        <button type="button" className="ta-btn outline" style={{ marginTop: 10 }} onClick={signOut} disabled={busy}>
          {busy ? 'Saliendo…' : 'Cerrar sesión'}
        </button>
      </div>
    </AuthShell>
  );
}
