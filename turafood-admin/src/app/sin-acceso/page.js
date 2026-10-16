'use client';

/**
 * PUERTA EQUIVOCADA
 *
 * Alguien con sesión válida pero sin rol de administrador. Casi siempre es un
 * negocio o un repartidor que llegó a este dominio por error: necesita el enlace
 * a SU panel, no un regaño.
 */

import { createClient, isConfigured } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import AuthShell from '../components/AuthShell';

export default function SinAccesoPage() {
  const router = useRouter();

  const signOut = async () => {
    if (isConfigured()) await createClient().auth.signOut();
    router.replace('/auth');
    router.refresh();
  };

  return (
    <AuthShell variante="admin" pie={<>¿Deberías tener acceso? Pide a quien maneja la consola que te asigne el rol.</>}>
      <div className="ta-step">
        <div className="ta-msg info" style={{ marginTop: 0, marginBottom: 22 }}><span className="ms">door_front</span><span>Tu sesión está bien, pero esta puerta no es la tuya.</span></div>
        <h1 className="ta-title">Esta es la consola del equipo</h1>
        <p className="ta-sub">Si tienes un negocio o repartes con nosotros, tu panel está en app.turafood.com.</p>

        <a href="https://app.turafood.com" className="ta-btn" style={{ textDecoration: 'none' }}>
          Ir a app.turafood.com <span className="ms">arrow_forward</span>
        </a>
        <button type="button" className="ta-btn outline" style={{ marginTop: 10 }} onClick={signOut}>Cerrar sesión</button>
      </div>
    </AuthShell>
  );
}
