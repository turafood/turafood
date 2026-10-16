'use client';

/**
 * ENTRADA A LA CONSOLA
 *
 * Sin registro y sin proveedores sociales: aquí no hay cuentas que crear. El rol
 * de administrador se pone a mano en la base, y quien no lo tenga rebota aunque
 * entre con una sesión válida (ver src/proxy.js).
 *
 * Correo y contraseña: son pocas personas y una credencial que no depende de
 * Google ni de Facebook es lo que se quiere para la puerta de atrás.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import AuthShell from '../components/AuthShell';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured()) {
      // Sin credenciales la consola corre con los datos de la maqueta
      router.replace('/');
      return;
    }

    setBusy(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error('Correo o contraseña incorrectos.');
      // El proxy comprueba el rol; si no es admin, rebota a /sin-acceso
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthShell variante="admin" pie={<>Acceso restringido al equipo de TuraFood.</>}>
      <form onSubmit={submit} className="ta-step">
        <h1 className="ta-title">Entrada del equipo</h1>
        <p className="ta-sub">Esta puerta es solo para administradores. Si tienes un negocio o repartes con nosotros, tu panel está en <a href="https://app.turafood.com">app.turafood.com</a>.</p>

        <div className="ta-field">
          <input id="ta-mail" type="email" required autoFocus placeholder=" " autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="ta-mail">Correo</label>
        </div>

        <div className="ta-field">
          <input id="ta-pass" type={ver ? 'text' : 'password'} required placeholder=" " autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <label htmlFor="ta-pass">Contraseña</label>
          <button type="button" className="ta-eye" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <span className="ms" style={{ fontSize: 21 }}>{ver ? 'visibility_off' : 'visibility'}</span>
          </button>
        </div>

        {error && <div className="ta-msg error" role="alert"><span className="ms">error</span><span>{error}</span></div>}

        <button type="submit" className="ta-btn" disabled={busy || !email || !password}>{busy ? 'Entrando…' : 'Entrar'}</button>

        {!isConfigured() && (
          <p className="ta-sub" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 16 }}>
            Supabase no está conectado en este entorno. Puedes entrar igual y la consola muestra los datos de la maqueta.
          </p>
        )}
      </form>
    </AuthShell>
  );
}
