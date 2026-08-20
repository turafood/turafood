'use client';

import { useState } from 'react';
import HeaderHero from '../../components/HeaderHero';

const INITIAL_MOCK_DATA = [
  { id: 1, name: 'Carlos Mendoza', phone: '+57 320 123 4567', vehicle: 'Moto', status: 'en_ruta', ordersToday: 12, battery: 85, synced: true, accessCode: 'TURA-4921' },
  { id: 2, name: 'Andrés Felipe Gómez', phone: '+57 310 987 6543', vehicle: 'Bicicleta', status: 'disponible', ordersToday: 4, battery: 92, synced: true, accessCode: 'TURA-8842' },
  { id: 3, name: 'Luis Fernando Ruiz', phone: '+57 315 555 4444', vehicle: 'Moto', status: 'desconectado', ordersToday: 0, battery: 0, synced: false, accessCode: 'TURA-1092' }
];

export default function RepartidoresPage() {
  const [repartidores, setRepartidores] = useState(INITIAL_MOCK_DATA);
  const [view, setView] = useState('list'); // list | new
  const [form, setForm] = useState({ name: '', phone: '', vehicle: 'Moto' });

  const createDriver = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    
    setRepartidores([
      {
        id: Date.now(),
        ...form,
        status: 'desconectado',
        ordersToday: 0,
        battery: 0,
        synced: false,
        accessCode: 'TURA-' + Math.floor(1000 + Math.random() * 9000)
      },
      ...repartidores
    ]);
    
    setForm({ name: '', phone: '', vehicle: 'Moto' });
    setView('list');
  };

  const toggleSync = (id) => {
    setRepartidores(prev => prev.map(r => r.id === id ? { ...r, synced: !r.synced, status: r.synced ? 'disponible' : 'desconectado' } : r));
  };

  const copyAccess = (code) => {
    navigator.clipboard.writeText(`https://app.turafood.com/repartidor?code=${code}`);
    alert('Link de acceso copiado: envíaselo por WhatsApp.');
  };

  if (view === 'new') {
    return (
      <div style={{ maxWidth: 740 }}>
        <style>{`
          .glass-panel {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: var(--shadowSm);
            padding: 36px;
            transition: all 0.3s;
          }
          .input-pro:focus {
            border-color: var(--primary) !important;
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent) !important;
          }
        `}</style>
        
        <button onClick={() => setView('list')} style={S.back}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a repartidores
        </button>

        <form onSubmit={createDriver} className="glass-panel" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <span style={{ ...S.iconBox, background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)' }}>
              <span className="ms" style={{ fontSize: 32 }}>two_wheeler</span>
            </span>
            <div>
              <h1 style={{ ...S.title, color: 'var(--text)' }}>Añadir Repartidor</h1>
              <p style={{ ...S.sub, color: 'var(--muted)' }}>No requerimos documentos ni SOAT. Tu negocio avala a su personal.</p>
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 32 }}>
            <span style={S.label}>Nombre Completo</span>
            <input
              className="input-pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Juan Pérez"
              required
              style={{ ...S.input, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </label>

          <label style={{ display: 'block', marginTop: 24 }}>
            <span style={S.label}>Número de Celular (WhatsApp)</span>
            <input
              className="input-pro"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Ej. 300 123 4567"
              required
              style={{ ...S.input, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}
            />
          </label>

          <div style={{ marginTop: 24 }}>
            <span style={S.label}>Tipo de Vehículo</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {['Moto', 'Bicicleta', 'Carro'].map((veh) => {
                const on = form.vehicle === veh;
                const icon = veh === 'Moto' ? 'two_wheeler' : veh === 'Bicicleta' ? 'pedal_bike' : 'directions_car';
                return (
                  <button
                    key={veh}
                    type="button"
                    onClick={() => setForm({ ...form, vehicle: veh })}
                    style={{
                      ...S.vehBtn,
                      borderColor: on ? 'var(--primary)' : 'var(--border)',
                      background: on ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--surface2)',
                      color: on ? 'var(--primary)' : 'var(--muted)'
                    }}
                  >
                    <span className="ms" style={{ fontSize: 28 }}>{icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: on ? 'var(--primary)' : 'var(--text)' }}>{veh}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" style={S.primaryBtn}>
            Guardar y Enviar Link de Conexión
            <span className="ms" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
       <style>{`
        .glass-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: var(--shadowSm);
          padding: 30px;
          transition: all 0.3s;
        }
        @keyframes pulse-dot {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pulse-active { animation: pulse-dot 2s infinite; }
        .driver-card {
           background: var(--surface2);
           border: 1px solid var(--border);
           border-radius: 20px;
           padding: 24px;
           transition: 0.2s;
           position: relative;
           overflow: hidden;
        }
        .driver-card:hover {
           border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
        }
        
        .toggle-switch {
          position: relative;
          width: 50px;
          height: 28px;
          border-radius: 14px;
          background-color: var(--border);
          cursor: pointer;
          transition: background-color 0.3s;
        }
        .toggle-switch.on { background-color: var(--primary); }
        .toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: white;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .toggle-switch.on .toggle-knob { transform: translateX(22px); }
      `}</style>
      
      <HeaderHero
        title="Tus domiciliarios integrados a la app."
        subtitle="Si ya tienes un equipo de reparto, puedes conectarlos a nuestro sistema para que tus clientes puedan rastrear sus pedidos en tiempo real, sin depender de repartidores externos."
        images={[
          'https://images.unsplash.com/photo-1620353457591-628d6c703b0d?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1594966779435-02fc238db366?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      <section className="glass-panel" style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ ...S.panelTitle, color: 'var(--text)' }}>Tu Flota Propia</h2>
            <p style={{ ...S.panelSub, color: 'var(--muted)' }}>Administra y rastrea a los repartidores de tu negocio.</p>
          </div>
          <button onClick={() => setView('new')} style={{ ...S.newBtn, background: 'var(--primary)', color: '#fff' }}>
            <span className="ms" style={{ fontSize: 20 }}>person_add</span>
            Añadir Repartidor
          </button>
        </div>

        {repartidores.length === 0 ? (
           <div style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface2)', borderRadius: 20, marginTop: 24, border: '1px dashed var(--border)' }}>
             <span className="ms" style={{ fontSize: 48, color: 'var(--muted)', opacity: 0.5 }}>two_wheeler</span>
             <h3 style={{ fontSize: 18, color: 'var(--text)', margin: '16px 0 8px' }}>No tienes repartidores configurados</h3>
             <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 400, margin: '0 auto' }}>Añade tu primer domiciliario para enviarle un link de conexión. Podrás ver su ubicación en vivo mientras entrega tus pedidos.</p>
           </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginTop: 24 }}>
            {repartidores.map(r => {
              const isOnRoute = r.status === 'en_ruta';
              const isAvailable = r.status === 'disponible';
              
              let statusColor = 'var(--muted)';
              let statusLabel = 'Desconectado';
              let statusIcon = 'cloud_off';

              if (isOnRoute) { statusColor = 'var(--amber)'; statusLabel = 'En Ruta'; statusIcon = 'route'; }
              else if (isAvailable) { statusColor = 'var(--green)'; statusLabel = 'Disponible'; statusIcon = 'check_circle'; }

              const vehicleIcon = r.vehicle === 'Moto' ? 'two_wheeler' : r.vehicle === 'Bicicleta' ? 'pedal_bike' : 'directions_car';

              return (
                <div key={r.id} className="driver-card">
                  {/* Sync status indicator (Semaforo top) */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: r.synced ? statusColor : 'var(--border)' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadowSm)', color: 'var(--text)' }}>
                         <span className="ms" style={{ fontSize: 24 }}>{vehicleIcon}</span>
                       </div>
                       <div>
                         <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.01em' }}>{r.name}</h3>
                         <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{r.phone}</p>
                       </div>
                    </div>
                  </div>

                  {/* Access Link */}
                  <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: 12, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--border)' }}>
                     <div>
                       <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>PIN DE ACCESO</div>
                       <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '.05em', marginTop: 2 }}>{r.accessCode}</div>
                     </div>
                     <button onClick={() => copyAccess(r.accessCode)} style={{ padding: '8px 12px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ms" style={{ fontSize: 16 }}>content_copy</span>
                        Copiar Link
                     </button>
                  </div>

                  {/* Toggle Sync */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span className="ms" style={{ fontSize: 18, color: r.synced ? 'var(--primary)' : 'var(--muted)' }}>sync</span>
                       <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>Sincronización GPS</span>
                    </div>
                    <div className={`toggle-switch ${r.synced ? 'on' : ''}`} onClick={() => toggleSync(r.id)}>
                      <div className="toggle-knob" />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                     <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>ESTADO</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: statusColor }}>
                          <span className={`ms ${isOnRoute || isAvailable ? 'pulse-active' : ''}`} style={{ fontSize: 16 }}>{statusIcon}</span>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{statusLabel}</span>
                        </div>
                     </div>
                     <div style={{ background: 'var(--surface)', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>ENTREGAS HOY</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)' }}>
                          <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>local_mall</span>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>{r.ordersToday} pedidos</span>
                        </div>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, 
    fontSize: 14, fontWeight: 800, color: 'var(--text)',
    padding: '10px 18px', borderRadius: 14, background: 'var(--surface2)',
    border: '1px solid var(--border)', cursor: 'pointer'
  },
  panelTitle: { margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' },
  panelSub: { margin: '6px 0 0', fontSize: 14, fontWeight: 600 },
  newBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px',
    borderRadius: 100, fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none',
    boxShadow: 'var(--shadowSm)'
  },
  title: { margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' },
  sub: { margin: '6px 0 0', fontSize: 14, fontWeight: 600, lineHeight: 1.4 },
  iconBox: {
    width: 64, height: 64, borderRadius: 20, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  label: { display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12, letterSpacing: '.02em' },
  input: {
    width: '100%', height: 52, padding: '0 16px', borderRadius: 14,
    fontSize: 15, fontFamily: 'inherit', outline: 'none', transition: '0.2s',
  },
  vehBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '16px 12px', borderRadius: 16, border: '2px solid transparent',
    cursor: 'pointer', transition: '0.2s', width: '100%'
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    width: '100%', height: 56, borderRadius: 16, background: 'var(--primary)',
    color: '#fff', fontSize: 15, fontWeight: 800, marginTop: 32,
    boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 30%, transparent)', cursor: 'pointer', border: 'none'
  }
};
