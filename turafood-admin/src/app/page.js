'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('solicitudes');

  const stats = [
    { label: 'Solicitudes Pendientes', value: '14', icon: 'pending_actions', color: '#FFB020' },
    { label: 'Negocios Activos', value: '86', icon: 'storefront', color: 'var(--primary)' },
    { label: 'Repartidores Online', value: '32', icon: 'electric_moped', color: '#11B26A' },
    { label: 'Ingresos (Semana)', value: '$1.2M', icon: 'account_balance_wallet', color: '#4470FF' }
  ];

  const pendingRequests = [
    { id: 1, type: 'business', name: 'Asadero El Puerto', desc: 'Restaurante • Cra. 3 # 4-58', date: 'Hace 2 horas' },
    { id: 2, type: 'courier', name: 'Carlos Mina', desc: 'Moto • Placa: WQR-18C', date: 'Hace 5 horas' },
    { id: 3, type: 'business', name: 'Droguería La Rebaja', desc: 'Farmacia • Cl. 8 # 52-14', date: 'Ayer' },
    { id: 4, type: 'courier', name: 'Luis Fernando', desc: 'Bicicleta', date: 'Ayer' },
  ];

  return (
    <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flex: 'none' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>admin_panel_settings</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '18px', color: 'var(--primary)' }}>TuraFood</div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '0.05em' }}>SUPER ADMIN</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 16px' }}>
          {[
            { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
            { id: 'solicitudes', icon: 'pending_actions', label: 'Solicitudes', badge: '14' },
            { id: 'negocios', icon: 'storefront', label: 'Negocios' },
            { id: 'repartidores', icon: 'two_wheeler', label: 'Repartidores' },
            { id: 'zonas', icon: 'map', label: 'Zonas y Tarifas' },
            { id: 'comisiones', icon: 'payments', label: 'Comisiones' }
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', background: isActive ? 'var(--primary)' : 'transparent', color: isActive ? '#fff' : 'var(--text)', transition: 'all 0.2s', border: 'none', textAlign: 'left' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '20px', color: isActive ? '#fff' : 'var(--muted)' }}>{item.icon}</span>
                  <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 600 }}>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{ background: isActive ? '#fff' : '#FFB020', color: isActive ? 'var(--primary)' : '#fff', fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px' }}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--surface2)', borderRadius: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'var(--primary)' }}>S</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>Sophia Admin</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Director</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* TOPBAR */}
        <div style={{ height: '80px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: 'var(--surface)' }}>
          <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '24px' }}>
            Centro de Aprobaciones
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface2)', padding: '0 16px', height: '44px', borderRadius: '99px', width: '300px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--muted)' }}>search</span>
              <input placeholder="Buscar negocios, usuarios..." style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }} />
            </div>
            <button style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded">notifications</span>
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--surface)' }}></div>
            </button>
          </div>
        </div>

        {/* DASHBOARD SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
          
          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '24px', borderRadius: '24px', boxShadow: 'var(--shadowSm)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>{s.icon}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '32px', marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* MAIN PANEL */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', boxShadow: 'var(--shadowSm)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '20px' }}>Solicitudes Pendientes (14)</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ padding: '8px 16px', borderRadius: '99px', background: 'var(--surface2)', fontSize: '13px', fontWeight: 700 }}>Todos</button>
                <button style={{ padding: '8px 16px', borderRadius: '99px', background: 'transparent', color: 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>Negocios</button>
                <button style={{ padding: '8px 16px', borderRadius: '99px', background: 'transparent', color: 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>Repartidores</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingRequests.map(req => (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: req.type === 'business' ? '#FFF1EC' : '#E6F6EE', color: req.type === 'business' ? 'var(--primary)' : '#11B26A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '28px' }}>{req.type === 'business' ? 'storefront' : 'electric_moped'}</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '16px' }}>{req.name}</span>
                        <span style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase' }}>{req.type === 'business' ? 'Nuevo Negocio' : 'Nuevo Repartidor'}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>{req.desc}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right', color: 'var(--muted)', fontSize: '13px' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px', verticalAlign: 'text-bottom', marginRight: '4px' }}>schedule</span>
                      {req.date}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button style={{ height: '40px', padding: '0 20px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 700, fontSize: '14px' }}>Revisar Docs</button>
                      <button style={{ height: '40px', padding: '0 24px', borderRadius: '12px', background: '#11B26A', color: '#fff', fontWeight: 800, fontSize: '14px', border: 'none', boxShadow: '0 4px 12px rgba(17,178,106,0.2)' }}>Aprobar</button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
            
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '14px', background: 'transparent', border: 'none' }}>Ver todas las solicitudes</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
