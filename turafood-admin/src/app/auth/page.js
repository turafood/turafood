'use client';

/**
 * ENTRADA A LA CONSOLA
 *
 * Sin registro y sin proveedores sociales: aquí no hay cuentas que
 * crear. El rol de administrador se pone a mano en la base, y quien no
 * lo tenga rebota aunque entre con una sesión válida (ver src/proxy.js).
 *
 * Correo y contraseña sí, al revés que en app.turafood.com. Allá se
 * quitó porque le costaba usuarios; aquí son cuatro personas y una
 * credencial que no depende de Google ni de Facebook es justamente lo
 * que se quiere para la puerta de atrás.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
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
    <div style={S.page}>
      <div style={S.glow} />

      <form onSubmit={submit} style={S.card} className="anim-up">
        <div style={S.brand}>
          <span style={S.logo}>t</span>
          <span>
            <span style={S.name}>TuraFood</span>
            <span style={S.kicker}>CONSOLA ADMIN</span>
          </span>
        </div>

        <h1 style={S.title}>Entrada del equipo</h1>
        <p style={S.subtitle}>
          Esta puerta es solo para administradores. Si eres un negocio o un
          repartidor, tu panel está en app.turafood.com.
        </p>

        <label style={{ display: 'block', marginTop: 22 }}>
          <span style={S.label}>Correo</span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@turafood.co"
            autoComplete="username"
            style={S.input}
          />
        </label>

        <label style={{ display: 'block', marginTop: 12 }}>
          <span style={S.label}>Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            style={S.input}
          />
        </label>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={busy} style={S.button}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>

        {!isConfigured() && (
          <p style={S.localNote}>
            Supabase no está conectado en este entorno. Puedes entrar igual y
            la consola muestra los datos de la maqueta.
          </p>
        )}
      </form>
    </div>
  );
}

const S = {
  page: {
    position: 'relative', minHeight: '100dvh', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    background: 'radial-gradient(120% 90% at 50% 0%, #221D19, #0D0B0A)',
    color: '#fff', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%,-50%)',
    width: 560, height: 560, maxWidth: '150%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,68,31,.22) 0%, transparent 64%)',
    filter: 'blur(46px)',
  },
  card: {
    position: 'relative', width: '100%', maxWidth: 380,
    background: 'rgba(24,21,19,.72)',
    backdropFilter: 'blur(44px) saturate(150%)',
    WebkitBackdropFilter: 'blur(44px) saturate(150%)',
    border: '1px solid rgba(255,255,255,.1)', borderRadius: 26, padding: '30px 26px',
    boxShadow: '0 34px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.12)',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 },
  logo: {
    width: 34, height: 34, borderRadius: 11, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    boxShadow: '0 5px 16px rgba(255,68,31,.45)',
  },
  name: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16.5, letterSpacing: '-.02em', lineHeight: 1.1,
  },
  kicker: {
    display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.12em',
    color: 'rgba(255,255,255,.42)', marginTop: 2,
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 25, letterSpacing: '-.03em',
  },
  subtitle: {
    margin: '9px 0 0', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,.58)',
  },
  label: {
    display: 'block', fontSize: 11.5, fontWeight: 700,
    color: 'rgba(255,255,255,.55)', marginBottom: 6,
  },
  input: {
    width: '100%', height: 48, borderRadius: 14, padding: '0 15px',
    background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)',
    color: '#fff', fontSize: 15, outline: 'none',
  },
  button: {
    width: '100%', height: 50, borderRadius: 14, marginTop: 20,
    background: 'var(--primary)', color: '#fff', fontSize: 15, fontWeight: 700,
    boxShadow: '0 10px 26px rgba(255,68,31,.36)',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14, padding: '12px 14px',
    borderRadius: 13, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.32)', color: '#FFC7BA',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
  },
  localNote: {
    margin: '16px 0 0', fontSize: 11, lineHeight: 1.5,
    color: 'rgba(255,255,255,.36)', textAlign: 'center',
  },
};
