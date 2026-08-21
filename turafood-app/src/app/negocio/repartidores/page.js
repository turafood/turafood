'use client';

import { useState, useEffect } from 'react';
import { getCouriersForBusiness, getPendingCouriers, subscribeToCouriers } from '@/lib/repartidores-negocio';

export default function RepartidoresPage() {
  const [repartidores, setRepartidores] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Vistas: 'lista', 'mapa', 'aprobaciones', 'simulador', 'new'
  const [view, setView] = useState('lista'); 
  const [form, setForm] = useState({ name: '', phone: '', vehicle: 'Moto' });

  // Animaciones del simulador
  const [simOnline, setSimOnline] = useState(true);
  const [simLevel, setSimLevel] = useState(86);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [couriers, pending] = await Promise.all([
        getCouriersForBusiness(),
        getPendingCouriers()
      ]);
      if (alive) {
        setRepartidores(couriers);
        setApprovals(pending);
        setLoading(false);
      }
    }
    load();
    
    const unsubscribe = subscribeToCouriers(() => {
      // Reload on any change (could be optimized, but good enough for this view)
      load();
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (view === 'simulador' && simOnline) {
      const interval = setInterval(() => {
        setSimLevel(l => (l >= 100 ? 100 : l + 1));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [view, simOnline]);

  const createDriver = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;
    
    setRepartidores([{
      id: Date.now(), ...form, status: 'desconectado', ordersToday: 0, battery: 0, synced: false, accessCode: 'TURA-' + Math.floor(1000 + Math.random() * 9000)
    }, ...repartidores]);
    
    setForm({ name: '', phone: '', vehicle: 'Moto' });
    setView('lista');
  };

  const toggleSync = (id) => {
    setRepartidores(prev => prev.map(r => r.id === id ? { ...r, synced: !r.synced, status: r.synced ? 'disponible' : 'desconectado' } : r));
  };

  const approveDriver = (id) => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'aprobado' } : a));
    alert('Repartidor aprobado al 100% y movido a tu radar.');
  };

  const copyAccess = (code) => {
    navigator.clipboard.writeText(`https://app.turafood.com/repartidor?code=${code}`);
    alert('Link de acceso copiado: envíaselo por WhatsApp.');
  };

  if (view === 'new') {
    return (
      <div style={{ maxWidth: 740 }}>
        <button onClick={() => setView('lista')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          Volver a Radar en Vivo
        </button>

        <form onSubmit={createDriver} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 36, boxShadow: 'var(--shadowSm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: 'color-mix(in srgb, var(--primary) 15%, transparent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="ms" style={{ fontSize: 32 }}>person_add</span>
            </span>
            <div>
              <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, margin: 0, color: 'var(--text)' }}>Añadir Repartidor</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13.5 }}>No requerimos documentos ni SOAT. Tu negocio avala a su personal.</p>
            </div>
          </div>

          <label style={{ display: 'block', marginTop: 32 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, display: 'block' }}>Nombre Completo</span>
            <input
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              style={{ width: '100%', height: 48, borderRadius: 12, padding: '0 16px', fontSize: 15, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
            />
          </label>
          <label style={{ display: 'block', marginTop: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, display: 'block' }}>Celular (WhatsApp)</span>
            <input
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required
              style={{ width: '100%', height: 48, borderRadius: 12, padding: '0 16px', fontSize: 15, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }}
            />
          </label>
          <button type="submit" style={{ marginTop: 32, width: '100%', height: 56, borderRadius: 16, background: 'var(--primary)', color: '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Guardar y Crear PIN
          </button>
        </form>
      </div>
    );
  }

  const onlineDrivers = repartidores.filter(r => r.synced).length;
  const totalDeliveries = repartidores.reduce((acc, curr) => acc + curr.ordersToday, 0);

  return (
    <div style={{ maxWidth: 1040 }}>
       <style>{`
        @keyframes pulse-dot { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes map-pulse { 0% { box-shadow: 0 0 0 0 rgba(255, 68, 31, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(255, 68, 31, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 68, 31, 0); } }
        .pulse-active { animation: pulse-dot 2s infinite; }
        .map-marker { animation: map-pulse 2s infinite; }
        .driver-card { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 24px; transition: 0.2s; position: relative; overflow: hidden; }
        .driver-card:hover { border-color: color-mix(in srgb, var(--primary) 30%, var(--border)); }
        
        .ai-switch { width: 52px; height: 32px; border-radius: 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.05); position: relative; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; }
        .ai-switch.on { background: var(--primary); border-color: var(--primary); }
        .ai-switch-knob { width: 24px; height: 24px; border-radius: 50%; background: #fff; position: absolute; left: 4px; transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .ai-switch.on .ai-switch-knob { transform: translateX(20px); }

        .cmd-tab { padding: 12px 20px; border-radius: 99px; font-weight: 800; font-size: 13.5px; cursor: pointer; transition: all 0.2s; border: none; display: flex; align-items: center; gap: 8px; color: var(--text); background: transparent; }
        .cmd-tab.active { background: var(--surface); color: var(--primary); box-shadow: var(--shadowSm); }
        .cmd-tab:hover:not(.active) { background: rgba(255,255,255,0.4); }
      `}</style>

      {/* HEADER HERO (Modo Comando) */}
      <section style={{ 
        background: 'linear-gradient(135deg, #141009 0%, #2A2620 100%)',
        borderRadius: 24, padding: 36, color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(20,16,10,0.15)', border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, background: 'radial-gradient(circle, rgba(255,68,31,0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase' }}>Centro de Mando AI</div>
            <h2 style={{ margin: 0, fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: 12 }}>
              Radar en Vivo
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: 'var(--primary)', color: '#fff', letterSpacing: '.05em', textTransform: 'uppercase' }}>PRO</span>
            </h2>
          </div>
          <button onClick={() => setView('new')} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 20px', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(255,68,31,0.3)' }}>
            <span className="ms" style={{ fontSize: 20 }}>person_add</span> Añadir Repartidor
          </button>
        </div>

        {/* TABS DE COMANDO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 32, background: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 100, width: 'fit-content', position: 'relative', zIndex: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
           <button className={`cmd-tab ${view === 'lista' ? 'active' : ''}`} onClick={() => setView('lista')} style={{ color: view === 'lista' ? 'var(--text)' : 'rgba(255,255,255,0.8)' }}>
             <span className="ms">radar</span> Radar
           </button>
           <button className={`cmd-tab ${view === 'mapa' ? 'active' : ''}`} onClick={() => setView('mapa')} style={{ color: view === 'mapa' ? 'var(--text)' : 'rgba(255,255,255,0.8)' }}>
             <span className="ms">map</span> Mapa
           </button>
           <button className={`cmd-tab ${view === 'aprobaciones' ? 'active' : ''}`} onClick={() => setView('aprobaciones')} style={{ color: view === 'aprobaciones' ? 'var(--text)' : 'rgba(255,255,255,0.8)' }}>
             <span className="ms">how_to_reg</span> Aprobaciones {approvals.filter(a => a.status === 'pendiente').length > 0 && <span style={{ background: 'var(--primary)', color: '#fff', borderRadius: 99, padding: '2px 6px', fontSize: 10 }}>{approvals.filter(a => a.status === 'pendiente').length}</span>}
           </button>
           <button className={`cmd-tab ${view === 'simulador' ? 'active' : ''}`} onClick={() => setView('simulador')} style={{ color: view === 'simulador' ? 'var(--text)' : 'rgba(255,255,255,0.8)' }}>
             <span className="ms">smartphone</span> Simulador App
           </button>
        </div>
      </section>

      {/* RENDER VIEW: LISTA (RADAR) */}
      {view === 'lista' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginTop: 24 }}>
          {repartidores.map(r => {
            const isOnRoute = r.status === 'en_ruta';
            const isAvailable = r.status === 'disponible';
            let statusColor = 'var(--muted)', statusLabel = 'Desconectado', statusIcon = 'cloud_off';
            if (isOnRoute) { statusColor = 'var(--amber)'; statusLabel = 'En Ruta'; statusIcon = 'route'; }
            else if (isAvailable) { statusColor = 'var(--green)'; statusLabel = 'Disponible'; statusIcon = 'check_circle'; }

            return (
              <div key={r.id} className="driver-card" style={{ background: r.synced ? 'var(--night)' : 'var(--surface)', color: r.synced ? '#fff' : 'var(--text)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: r.synced ? statusColor : 'var(--border)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <div style={{ width: 48, height: 48, borderRadius: 16, background: r.synced ? 'rgba(255,255,255,0.05)' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <span className="ms" style={{ fontSize: 24, color: r.synced ? '#fff' : 'var(--text)' }}>{r.vehicle === 'Moto' ? 'two_wheeler' : 'pedal_bike'}</span>
                     </div>
                     <div>
                       <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>{r.name}</h3>
                       <p style={{ margin: '4px 0 0', fontSize: 13, color: r.synced ? 'rgba(255,255,255,0.6)' : 'var(--muted)', fontWeight: 600 }}>{r.phone}</p>
                     </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: r.synced ? 'rgba(0,0,0,0.3)' : 'var(--surface2)', borderRadius: 14, border: `1px solid ${r.synced ? 'rgba(255,255,255,0.08)' : 'var(--border)'}`, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                     <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.synced ? 'var(--green)' : 'var(--muted)' }} className={r.synced ? 'pulse-active' : ''} />
                     <div>
                       <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.synced ? 'Conectado a Nube' : 'Sistema Apagado'}</div>
                       <div style={{ fontSize: 11, color: r.synced ? 'rgba(255,255,255,0.5)' : 'var(--muted)' }}>{r.synced ? 'Recibiendo GPS' : 'Desconectado'}</div>
                     </div>
                  </div>
                  <div className={`ai-switch ${r.synced ? 'on' : ''}`} onClick={() => toggleSync(r.id)}><div className="ai-switch-knob" /></div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                   <div style={{ background: r.synced ? 'rgba(255,255,255,0.03)' : 'var(--surface2)', padding: '12px 14px', borderRadius: 14, border: `1px solid ${r.synced ? 'rgba(255,255,255,0.05)' : 'var(--border)'}` }}>
                      <div style={{ fontSize: 10, color: r.synced ? 'rgba(255,255,255,0.5)' : 'var(--muted)', fontWeight: 800, marginBottom: 4 }}>ESTADO</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: statusColor }}>
                        <span className={`ms ${isOnRoute || isAvailable ? 'pulse-active' : ''}`} style={{ fontSize: 16 }}>{statusIcon}</span>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{statusLabel}</span>
                      </div>
                   </div>
                   <div style={{ background: r.synced ? 'rgba(255,255,255,0.03)' : 'var(--surface2)', padding: '12px 14px', borderRadius: 14, border: `1px solid ${r.synced ? 'rgba(255,255,255,0.05)' : 'var(--border)'}` }}>
                      <div style={{ fontSize: 10, color: r.synced ? 'rgba(255,255,255,0.5)' : 'var(--muted)', fontWeight: 800, marginBottom: 4 }}>ENTREGAS HOY</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: r.synced ? '#fff' : 'var(--text)' }}>
                        <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>local_mall</span>
                        <span style={{ fontSize: 13, fontWeight: 800 }}>{r.ordersToday}</span>
                      </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RENDER VIEW: MAPA (SIMULADO) */}
      {view === 'mapa' && (
        <div style={{ marginTop: 24, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', height: 600, display: 'flex', flexDirection: 'column' }}>
          {/* Header Map */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ padding: '6px 12px', background: 'color-mix(in srgb, var(--green) 12%, transparent)', color: 'var(--green)', borderRadius: 99, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%' }} className="pulse-active" />
                  Operación en Curso
               </div>
               <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 800 }}>Buenaventura (Zona Centro)</span>
             </div>
             <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{onlineDrivers} Conectados</div>
          </div>
          {/* Map Area */}
          <div style={{ flex: 1, position: 'relative', background: '#e9e5df url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%2314100a\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")', overflow: 'hidden' }}>
             
             {/* Simular calles principales (SVGs) */}
             <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.1 }}>
                <path d="M-50,200 Q400,150 800,400 T1200,300" stroke="var(--ink)" strokeWidth="12" fill="none" />
                <path d="M200,-50 Q300,300 150,600" stroke="var(--ink)" strokeWidth="8" fill="none" />
                <path d="M800,-50 Q750,200 900,600" stroke="var(--ink)" strokeWidth="10" fill="none" />
             </svg>

             {/* Marcador 1 */}
             <div className="map-marker" style={{ position: 'absolute', top: '30%', left: '45%', width: 40, height: 40, background: 'var(--amber)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>
                <span className="ms" style={{ fontSize: 20, color: '#fff', transform: 'rotate(45deg)' }}>two_wheeler</span>
             </div>
             {/* Marcador 2 */}
             <div className="map-marker" style={{ position: 'absolute', top: '55%', left: '25%', width: 40, height: 40, background: 'var(--green)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff' }}>
                <span className="ms" style={{ fontSize: 20, color: '#fff', transform: 'rotate(45deg)' }}>pedal_bike</span>
             </div>
             {/* Marcador 3 */}
             <div className="map-marker" style={{ position: 'absolute', top: '40%', left: '65%', width: 40, height: 40, background: 'var(--blue)', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', opacity: 0.6 }}>
                <span className="ms" style={{ fontSize: 20, color: '#fff', transform: 'rotate(45deg)' }}>two_wheeler</span>
             </div>

             {/* Overlay Panel */}
             <div style={{ position: 'absolute', bottom: 24, left: 24, background: 'var(--surface)', padding: 20, borderRadius: 16, boxShadow: 'var(--shadow)', width: 320, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>Resumen del Sistema</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                   <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-bricolage)' }}>47</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Pedidos Activos</div>
                   </div>
                   <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-bricolage)' }}>31m</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Promedio Entrega</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* RENDER VIEW: APROBACIONES */}
      {view === 'aprobaciones' && (
        <div style={{ marginTop: 24, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div>
               <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Verificación de Documentos</h3>
               <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>Revisa la información de los candidatos que quieren unirse a tu flota.</p>
             </div>
             <div style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
               {approvals.filter(a => a.status === 'pendiente').length} Pendientes
             </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {approvals.length === 0 ? (
               <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No hay repartidores pendientes.</div>
            ) : (
               approvals.map((a, i) => (
                 <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottom: i < approvals.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontWeight: 800, fontSize: 15 }}>
                        {a.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{a.doc} · {a.vehicle}</div>
                      </div>
                    </div>
                    
                    {a.status === 'pendiente' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: a.docs.cc ? 'var(--green)' : 'var(--surface2)', color: a.docs.cc ? '#fff' : 'var(--muted)' }}>Cédula</span>
                          <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: a.docs.license ? 'var(--green)' : 'var(--surface2)', color: a.docs.license ? '#fff' : 'var(--muted)' }}>Licencia</span>
                          <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: a.docs.soat ? 'var(--green)' : 'var(--surface2)', color: a.docs.soat ? '#fff' : 'var(--muted)' }}>SOAT</span>
                          <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: a.docs.tecno ? 'var(--green)' : 'var(--surface2)', color: a.docs.tecno ? '#fff' : 'var(--muted)' }}>Tecno</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Rechazar</button>
                          <button onClick={() => approveDriver(a.id)} style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--text)', color: 'var(--surface)', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="ms" style={{ fontSize: 18 }}>check</span> Aprobar al 100%
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--green)', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ms" style={{ fontSize: 18 }}>check_circle</span> Aprobado y Activo
                      </div>
                    )}
                 </div>
               ))
            )}
          </div>
        </div>
      )}

      {/* RENDER VIEW: SIMULADOR APP */}
      {view === 'simulador' && (
        <div style={{ marginTop: 24, display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)', margin: '0 0 16px' }}>Simulador del Repartidor</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 500 }}>
              Interactúa con este simulador funcional. Así es exactamente como se ve la app en los celulares de tus domiciliarios en la calle, impulsada por tecnología AI. Observa cómo cambia la pantalla al prenderse y apagarse, y cómo ganan niveles de fidelización por cada entrega.
            </p>
            <div style={{ marginTop: 32, padding: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
               <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 12 }}>Controles de Simulación</div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                 <button onClick={() => setSimOnline(!simOnline)} style={{ padding: '12px 20px', borderRadius: 12, background: simOnline ? 'var(--primary)' : 'var(--surface2)', color: simOnline ? '#fff' : 'var(--text)', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms" style={{ fontSize: 20 }}>power_settings_new</span>
                    {simOnline ? 'Apagar GPS Repartidor' : 'Encender GPS Repartidor'}
                 </button>
                 <button onClick={() => setSimLevel(0)} style={{ padding: '12px 20px', borderRadius: 12, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    Resetear Nivel
                 </button>
               </div>
            </div>
          </div>

          {/* iPhone Frame */}
          <div style={{ width: 340, height: 720, background: '#131110', borderRadius: 48, position: 'relative', boxShadow: '0 40px 80px rgba(0,0,0,0.2)', border: '12px solid #000', overflow: 'hidden', flex: 'none' }}>
             {/* Dynamic Island */}
             <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 120, height: 32, background: '#000', borderRadius: 16, zIndex: 100 }} />
             
             {/* Status Bar */}
             <div style={{ position: 'absolute', top: 16, left: 24, color: '#fff', fontSize: 12, fontWeight: 700, zIndex: 100 }}>20:19</div>
             <div style={{ position: 'absolute', top: 16, right: 24, display: 'flex', gap: 4, zIndex: 100, color: '#fff' }}>
                <span className="ms" style={{ fontSize: 14 }}>signal_cellular_4_bar</span>
                <span className="ms" style={{ fontSize: 14 }}>wifi</span>
                <span className="ms" style={{ fontSize: 14 }}>battery_full</span>
             </div>

             {/* App Content */}
             <div style={{ padding: '64px 20px 120px', height: '100%', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                     <div style={{ width: 44, height: 44, borderRadius: 12, background: '#262220', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F2EE', fontWeight: 800, fontSize: 15 }}>YM</div>
                     <div>
                       <div style={{ fontWeight: 800, fontSize: 16, color: '#F5F2EE' }}>Hola, Yeison</div>
                       <div style={{ fontSize: 12, color: '#A29A90', display: 'flex', alignItems: 'center', gap: 4 }}><span className="ms" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span> 4.9 · Moto</div>
                     </div>
                   </div>
                   <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><span className="ms">notifications</span></div>
                </div>

                {/* Hero Card */}
                <div style={{ background: 'linear-gradient(135deg, #1A1815 0%, #000 100%)', borderRadius: 24, padding: 24, position: 'relative', overflow: 'hidden', border: '1px solid #333' }}>
                  <div style={{ position: 'absolute', top: 0, right: -40, width: 150, height: 150, background: 'radial-gradient(circle, rgba(255,68,31,0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em', color: '#A29A90' }}>GANADO HOY</div>
                    <div style={{ background: '#332912', color: '#FFB020', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}><span className="ms" style={{ fontSize: 12 }}>workspace_premium</span> Nivel Oro</div>
                  </div>
                  
                  <div style={{ fontSize: 36, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: '#fff', marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    $84.300 <span style={{ fontSize: 12, color: 'var(--green)' }}>+18% vs. ayer</span>
                  </div>

                  <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
                    {[1,2,3,4,5].map(bar => (
                      <div key={bar} style={{ height: 24, flex: 1, background: bar === 5 ? 'var(--primary)' : '#262220', borderRadius: 4 }} />
                    ))}
                  </div>

                  {/* Toggle */}
                  <div style={{ marginTop: 24, background: simOnline ? '#1A3320' : '#1C1917', padding: '16px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${simOnline ? 'rgba(17,178,106,0.3)' : '#333'}` }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <span className="ms" style={{ color: simOnline ? 'var(--green)' : '#A29A90', fontSize: 24 }}>power_settings_new</span>
                       <div>
                         <div style={{ fontSize: 14, fontWeight: 800, color: simOnline ? 'var(--green)' : '#fff' }}>{simOnline ? 'Estás en línea' : 'Desconectado'}</div>
                         <div style={{ fontSize: 11, color: '#A29A90', marginTop: 2 }}>{simOnline ? 'Recibiendo pedidos' : 'Actívate para recibir'}</div>
                       </div>
                     </div>
                     <div className={`ai-switch ${simOnline ? 'on' : ''}`} style={{ borderColor: simOnline ? 'var(--green)' : '#444' }} onClick={() => setSimOnline(!simOnline)}>
                       <div className="ai-switch-knob" style={{ background: '#fff' }} />
                     </div>
                  </div>
                </div>

                {/* Level Progress */}
                <div style={{ marginTop: 16, background: '#1C1917', borderRadius: 16, padding: 16, border: '1px solid #333' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <span className="ms" style={{ color: '#FFB020' }}>workspace_premium</span>
                       <div>
                         <div style={{ fontSize: 14, fontWeight: 800, color: '#F5F2EE' }}>Nivel Oro</div>
                         <div style={{ fontSize: 11, color: '#A29A90' }}>Faltan {100 - simLevel} entregas a Platino</div>
                       </div>
                     </div>
                     <div style={{ fontSize: 12, fontWeight: 800, color: '#F5F2EE' }}>{simLevel} / 100</div>
                   </div>
                   <div style={{ height: 6, background: '#262220', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${simLevel}%`, height: '100%', background: '#FFB020', borderRadius: 99, transition: 'width 0.5s ease' }} />
                   </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
                   <div style={{ background: '#1C1917', padding: 12, borderRadius: 12, textAlign: 'center', border: '1px solid #333' }}>
                     <span className="ms" style={{ color: 'var(--amber)', fontSize: 20 }}>priority_high</span>
                     <div style={{ fontSize: 10, color: '#A29A90', fontWeight: 700, marginTop: 4 }}>Prioritarios</div>
                   </div>
                   <div style={{ background: '#1C1917', padding: 12, borderRadius: 12, textAlign: 'center', border: '1px solid #333' }}>
                     <span className="ms" style={{ color: 'var(--green)', fontSize: 20 }}>local_activity</span>
                     <div style={{ fontSize: 10, color: '#A29A90', fontWeight: 700, marginTop: 4 }}>Bono x1.3</div>
                   </div>
                   <div style={{ background: '#1C1917', padding: 12, borderRadius: 12, textAlign: 'center', border: '1px solid #333' }}>
                     <span className="ms" style={{ color: 'var(--blue)', fontSize: 20 }}>support_agent</span>
                     <div style={{ fontSize: 10, color: '#A29A90', fontWeight: 700, marginTop: 4 }}>Soporte</div>
                   </div>
                </div>
                
                {/* Simulated Order Card if Online */}
                {simOnline && (
                  <div style={{ marginTop: 16, background: '#FF441F1A', border: '1px solid var(--primary)', borderRadius: 16, padding: 16, position: 'relative' }}>
                     <div style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--primary)' }}>20</div>
                     <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} className="pulse-active" />
                        NUEVO PEDIDO
                     </div>
                     <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-bricolage)', color: '#fff' }}>$9.400</div>
                     <div style={{ fontSize: 12, color: '#A29A90', marginTop: 2 }}>3.1 km · 18 min</div>
                     
                     <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                        <button style={{ flex: 1, padding: 12, background: 'var(--primary)', color: '#fff', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 14 }}>Aceptar</button>
                     </div>
                  </div>
                )}
             </div>

             {/* Bottom Nav */}
             <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '16px 24px 32px', background: 'rgba(20,16,10,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-between', zIndex: 100 }}>
                <div style={{ textAlign: 'center', color: 'var(--primary)' }}><span className="ms">home</span><div style={{ fontSize: 10, fontWeight: 700 }}>Inicio</div></div>
                <div style={{ textAlign: 'center', color: '#A29A90' }}><span className="ms">account_balance_wallet</span><div style={{ fontSize: 10, fontWeight: 700 }}>Ganancias</div></div>
                <div style={{ textAlign: 'center', color: '#A29A90' }}><span className="ms">local_mall</span><div style={{ fontSize: 10, fontWeight: 700 }}>Entregas</div></div>
                <div style={{ textAlign: 'center', color: '#A29A90' }}><span className="ms">person</span><div style={{ fontSize: 10, fontWeight: 700 }}>Cuenta</div></div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}
