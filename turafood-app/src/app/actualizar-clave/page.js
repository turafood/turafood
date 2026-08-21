'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function ActualizarClavePage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password: password,
      });

      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
      setTimeout(() => {
        router.replace('/negocio');
      }, 2000);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      background: 'radial-gradient(100% 60% at 50% 10%, #171519 0%, #0E0D10 50%, #080709 100%)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      {/* Background Flares */}
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 500, height: 260, background: 'radial-gradient(ellipse at top, rgba(232,199,102,0.08) 0%, rgba(255,68,31,0.04) 50%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 410,
        background: 'linear-gradient(145deg, rgba(28,26,30,0.94) 0%, rgba(13,12,15,0.98) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(232,199,102,0.2)',
        borderRadius: 24, padding: '28px 24px',
        boxShadow: '0 25px 70px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)',
        position: 'relative', zIndex: 2,
      }}>
        
        {/* Brand Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 10, background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
            fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18,
            boxShadow: '0 6px 18px rgba(255,68,31,.4)',
          }}>t</span>
          <div>
            <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-.02em' }}>
              Tura Food <span className="tf-serif" style={{ color: 'var(--primary)' }}>AI</span>
            </span>
            <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
              Seguridad de Cuenta
            </span>
          </div>
        </div>

        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, color: '#fff' }}>
          Nueva Contraseña
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
          Establece una nueva clave segura para acceder a tu panel de negocio.
        </p>

        {success ? (
          <div style={{
            padding: '20px', borderRadius: 16, background: 'rgba(17,178,106,0.15)',
            border: '1px solid rgba(17,178,106,0.35)', textAlign: 'center',
          }}>
            <span className="ms" style={{ fontSize: 36, color: '#11B26A', display: 'block', marginBottom: 8 }}>
              check_circle
            </span>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#A6F4C5', marginBottom: 4 }}>
              ¡Contraseña Actualizada!
            </div>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Redirigiendo a tu panel en unos segundos…
            </p>
          </div>
        ) : (
          <form onSubmit={handleUpdate}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%', height: 48, borderRadius: 12, padding: '0 14px',
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>
                Confirmar Contraseña
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                style={{
                  width: '100%', height: 48, borderRadius: 12, padding: '0 14px',
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)',
                  color: '#fff', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, padding: '10px 12px',
                borderRadius: 12, background: 'rgba(255,68,31,.12)',
                border: '1px solid rgba(255,68,31,.3)', color: '#FFC7BA',
                fontSize: 12, fontWeight: 600,
              }}>
                <span className="ms" style={{ fontSize: 17, flex: 'none' }}>error</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy || !password}
              style={{
                width: '100%', height: 48, borderRadius: 14,
                background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14.5,
                cursor: 'pointer', boxShadow: '0 8px 22px rgba(255,68,31,.4)',
              }}
            >
              {busy ? 'Guardando nueva clave…' : 'Guardar y entrar al panel'}
            </button>
          </form>
        )}

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' }}>
          <Link href="/auth" style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>
            Volver a Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
