'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useBiz } from '../BizContext';

export default function SeguridadPage() {
  const { toast } = useBiz();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
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
      setPassword('');
      setConfirmPassword('');
      toast('Contraseña actualizada exitosamente', { icono: 'lock_reset' });
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.1em', textTransform: 'uppercase' }}>
            Privacidad & Credenciales
          </span>
          <span style={{
            fontSize: 10, fontWeight: 800, color: '#11B26A',
            background: 'rgba(17,178,106,0.12)', border: '1px solid rgba(17,178,106,0.25)',
            padding: '2px 8px', borderRadius: 99,
          }}>
            ● CIFRADO SSL 256-BIT
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-.02em' }}>
          Seguridad y Cambio de Contraseña
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '6px 0 0', maxWidth: 620, lineHeight: 1.5 }}>
          Gestiona tus credenciales de acceso, contraseñas y sesiones activas en tu panel de negocio.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        
        {/* Card: Change Password */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 22, padding: '24px', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'rgba(255, 68, 31, 0.12)',
              border: '1px solid rgba(255, 68, 31, 0.25)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--primary)',
            }}>
              <span className="ms" style={{ fontSize: 22 }}>lock_reset</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
                Cambiar Contraseña
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Actualiza tu clave de acceso al panel
              </div>
            </div>
          </div>

          {success && (
            <div style={{
              padding: '12px 14px', borderRadius: 12, background: 'rgba(17,178,106,0.12)',
              border: '1px solid rgba(17,178,106,0.3)', color: '#11B26A', fontSize: 13,
              fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="ms" style={{ fontSize: 18 }}>check_circle</span>
              ¡Tu contraseña ha sido cambiada con éxito!
            </div>
          )}

          <form onSubmit={handleUpdatePassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={{
                  width: '100%', height: 44, borderRadius: 12, padding: '0 14px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 13.5, outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                Confirmar Nueva Contraseña
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                style={{
                  width: '100%', height: 44, borderRadius: 12, padding: '0 14px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: 13.5, outline: 'none',
                }}
              />
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, padding: '10px 12px',
                borderRadius: 12, background: 'rgba(255,68,31,.12)',
                border: '1px solid rgba(255,68,31,.3)', color: '#FF7A4D',
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
                width: '100%', height: 46, borderRadius: 14,
                background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
                color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', boxShadow: '0 6px 20px rgba(255, 68, 31, 0.4)',
                opacity: !password ? 0.6 : 1,
              }}
            >
              {busy ? 'Actualizando contraseña…' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        </div>

        {/* Card: Active Sessions & Security Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 22, padding: '22px', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: 'rgba(17,178,106,0.12)',
                border: '1px solid rgba(17,178,106,0.25)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#11B26A',
              }}>
                <span className="ms" style={{ fontSize: 20 }}>devices</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                  Sesión Actual
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Dispositivo conectado actualmente
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--surface2)', padding: '12px 14px', borderRadius: 14,
              border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>laptop</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Panel Web Administrador
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Buenaventura, Colombia · En línea ahora
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#11B26A',
                background: 'rgba(17,178,106,0.12)', padding: '2px 8px', borderRadius: 99,
              }}>
                ACTIVO
              </span>
            </div>
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 22, padding: '20px', boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--gold)' }}>verified</span>
              <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                Acceso Passwordless & Magic Link
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              También puedes ingresar en cualquier momento solicitando un Magic Link seguro a tu correo o mediante tu número de WhatsApp sin depender de recordar tu clave.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
