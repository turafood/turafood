'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function RiderAuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [vehicle, setVehicle] = useState('moto');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          vehicle_type: vehicle,
          role: 'RIDER'
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      alert('¡Cuenta de repartidor creada! Iniciando sesión...');
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '10%', left: '-20%', width: '80%', height: '50%', background: 'linear-gradient(135deg, var(--primary) 0%, #ff7b5a 100%)', borderRadius: '50%', filter: 'blur(60px)', opacity: 0.15, zIndex: 0 }} />

      <div style={{ flex: 'none', padding: '60px 24px 20px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '32px', lineHeight: 1.1 }}>
          TuraFood <br /><span style={{ color: 'var(--primary)' }}>Repartidores</span>
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--muted)', fontSize: '15px' }}>
          Conduce, entrega y gana a tu propio ritmo.
        </p>
      </div>

      <div style={{ flex: 1, padding: '0 24px 40px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        
        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: '14px', padding: '4px', marginBottom: '24px' }}>
          <button 
            onClick={() => { setActiveTab('login'); setError(null); }}
            style={{ flex: 1, height: '44px', borderRadius: '11px', fontWeight: 700, fontSize: '14px', background: activeTab === 'login' ? 'var(--surface)' : 'transparent', color: activeTab === 'login' ? 'var(--text)' : 'var(--muted)', boxShadow: activeTab === 'login' ? 'var(--shadowSm)' : 'none', transition: 'all 0.2s' }}
          >
            Iniciar Sesión
          </button>
          <button 
            onClick={() => { setActiveTab('signup'); setError(null); }}
            style={{ flex: 1, height: '44px', borderRadius: '11px', fontWeight: 700, fontSize: '14px', background: activeTab === 'signup' ? 'var(--surface)' : 'transparent', color: activeTab === 'signup' ? 'var(--text)' : 'var(--muted)', boxShadow: activeTab === 'signup' ? 'var(--shadowSm)' : 'none', transition: 'all 0.2s' }}
          >
            Registrarme
          </button>
        </div>

        {error && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Forms */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Correo Electrónico</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>mail</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="repartidor@ejemplo.com" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Contraseña</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>lock</span>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '16px', boxShadow: '0 10px 24px rgba(255,68,31,.32)', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? 'Ingresando...' : 'Iniciar Turno'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Nombre Completo</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>person</span>
                <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Juan Pérez" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Vehículo</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>two_wheeler</span>
                <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)', appearance: 'none' }}>
                  <option value="moto">Moto</option>
                  <option value="bicicleta">Bicicleta</option>
                  <option value="carro">Carro</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Correo Electrónico</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>mail</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px' }}>Contraseña</label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0 16px', height: '56px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--muted)', marginRight: '12px', fontSize: '20px' }}>lock</span>
                <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', color: 'var(--text)' }} />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '16px', boxShadow: '0 10px 24px rgba(255,68,31,.32)', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {loading ? 'Creando cuenta...' : 'Unirme como Repartidor'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
