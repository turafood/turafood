'use client';

import { useState } from 'react';

export default function CourierDashboard() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
      
      {/* SIDEBAR TABLET */}
      <div style={{ flex: 'none', width: '250px', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '16px' }} className="hidden md:flex">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', padding: '0 8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>two_wheeler</span>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: '15px' }}>Tura Repartidor</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>Buenaventura</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '16px', background: '#FFF1EC', color: 'var(--primary)', fontWeight: 700, fontSize: '14px', textAlign: 'left' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>home</span>Inicio
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '14px', textAlign: 'left' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>payments</span>Ganancias
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '14px', textAlign: 'left' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>receipt_long</span>Entregas
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '16px', color: 'var(--muted)', fontWeight: 600, fontSize: '14px', textAlign: 'left' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>person</span>Cuenta
          </button>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ background: '#17140F', borderRadius: '16px', padding: '16px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: '#FFB020', fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              <span style={{ fontWeight: 800, fontSize: '14px' }}>Nivel Oro</span>
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginTop: '2px', marginBottom: '8px' }}>86 / 100</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,.2)', borderRadius: '99px' }}>
              <div style={{ height: '100%', width: '86%', background: '#FFB020', borderRadius: '99px' }}></div>
            </div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px 16px', borderRadius: '16px', border: '1px solid var(--border)', marginTop: '8px', fontSize: '13px', fontWeight: 700 }}>
            <span className="material-symbols-rounded" style={{ color: '#FFB020', fontSize: '18px' }}>auto_awesome</span>Tura IA
          </button>
        </div>
      </div>

      {/* MAIN VIEW */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        
        {/* MOBILE HEADER */}
        <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>YM</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>Hola, Yeison</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-rounded" style={{ color: '#FFB020', fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>star</span>4.9 · Moto WQR-18C
              </div>
            </div>
          </div>
          <button style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>notifications</span>
          </button>
        </div>

        {/* TABLET HEADER */}
        <div className="hidden md:flex" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>YM</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800 }}>Yeison Mosquera</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-rounded" style={{ color: '#FFB020', fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>star</span>4.9 · Moto WQR-18C
              </div>
            </div>
          </div>
          
          <button onClick={() => setIsOnline(!isOnline)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface)', border: '1px solid var(--border)', padding: '6px 6px 6px 16px', borderRadius: '999px', boxShadow: 'var(--shadowSm)' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 800 }}>{isOnline ? 'Estás en línea' : 'Desconectado'}</div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{isOnline ? 'Recibiendo pedidos en zona Centro' : 'Pausado'}</div>
            </div>
            <div style={{ width: '52px', height: '30px', borderRadius: '99px', background: isOnline ? 'var(--green)' : 'var(--surface2)', padding: '3px', transition: 'background .2s ease' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#fff', transform: isOnline ? 'translateX(22px)' : 'none', transition: 'transform .2s ease' }}></div>
            </div>
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '12px 20px 100px' }} className="md:px-8 md:pb-8">
          
          {/* MOBILE DARK CARD */}
          <div className="md:hidden" style={{ background: 'linear-gradient(180deg, #241D15 0%, #17140F 100%)', borderRadius: '24px', padding: '20px', color: '#fff', boxShadow: 'var(--shadow)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(255,68,31,0.25) 0%, rgba(255,68,31,0) 70%)' }}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '.05em', color: 'rgba(255,255,255,.6)' }}>GANADO HOY</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 176, 32, 0.15)', color: '#FFB020', padding: '4px 8px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 800 }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>Nivel Oro
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '38px', fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>$84.300</span>
                <span style={{ color: 'var(--green)', fontSize: '12px', fontWeight: 800 }}>+18% vs. ayer</span>
              </div>

              {/* Chart Placeholder */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '40px', marginTop: '16px' }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '40%' }}></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '60%' }}></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '30%' }}></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '80%' }}></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '50%' }}></div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,.1)', borderRadius: '4px', height: '70%' }}></div>
                <div style={{ flex: 1, background: 'var(--primary)', borderRadius: '4px', height: '100%', boxShadow: '0 4px 12px rgba(255,68,31,.3)' }}></div>
              </div>

              {/* Toggle in mobile */}
              <button onClick={() => setIsOnline(!isOnline)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,.3)', padding: '12px 16px', borderRadius: '16px', marginTop: '24px', width: '100%', border: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isOnline ? 'var(--green)' : 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '18px', color: isOnline ? '#fff' : 'rgba(255,255,255,.5)' }}>bolt</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{isOnline ? 'Estás en línea' : 'Desconectado'}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)' }}>{isOnline ? 'Recibiendo pedidos en zona Centro' : 'Actívate para recibir pedidos'}</div>
                  </div>
                </div>
                <div style={{ width: '48px', height: '28px', borderRadius: '99px', background: isOnline ? 'var(--green)' : 'rgba(255,255,255,.2)', padding: '3px', transition: 'background .2s ease' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#fff', transform: isOnline ? 'translateX(20px)' : 'none', transition: 'transform .2s ease' }}></div>
                </div>
              </button>
            </div>
          </div>

          {/* TABLET STATS */}
          <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', marginBottom: '12px' }}>payments</span>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>$84.300</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Ganado hoy</div>
            </div>
            <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--green)', marginBottom: '12px' }}>check_circle</span>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>9</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Entregas</div>
            </div>
            <div style={{ background: 'var(--surface)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--blue)', marginBottom: '12px' }}>route</span>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>34 km</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>Recorrido</div>
            </div>
          </div>

          {/* MOBILE LEVEL BAR */}
          <div className="md:hidden" style={{ marginTop: '24px', background: 'var(--surface)', padding: '16px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: '#FFB020', fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>Nivel Oro</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>86 / 100</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Te faltan 14 entregas para llegar a Platino</div>
            <div style={{ height: '5px', background: 'var(--surface2)', borderRadius: '99px', marginTop: '12px' }}>
              <div style={{ height: '100%', width: '86%', background: '#FFB020', borderRadius: '99px' }}></div>
            </div>
          </div>

          {/* BENEFITS / TAGS */}
          <div className="md:hidden" style={{ marginTop: '24px', fontSize: '14px', fontWeight: 700 }}>Tus beneficios de Nivel Oro</div>
          <div className="hidden md:block" style={{ marginTop: '0', fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Tus beneficios de Nivel Oro</div>
          
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }} className="hs">
            <div style={{ flex: 'none', background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: 700, boxShadow: 'var(--shadowSm)' }}>
              <span style={{ color: '#FFB020', fontWeight: 800 }}>!</span> Pedidos prioritarios
            </div>
            <div style={{ flex: 'none', background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: 700, boxShadow: 'var(--shadowSm)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--green)', fontSize: '18px' }}>sell</span> Bono semanal x1.3
            </div>
            <div style={{ flex: 'none', background: 'var(--surface)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: 700, boxShadow: 'var(--shadowSm)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--blue)', fontSize: '18px' }}>support_agent</span> Soporte VIP
            </div>
          </div>

          {/* NEW ORDER CARD */}
          <div style={{ background: 'var(--surface)', borderRadius: '24px', border: '1.5px solid var(--primary)', padding: '4px', marginTop: '24px', boxShadow: '0 8px 30px rgba(255,68,31,.15)', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: '4px', borderRadius: '20px', background: 'linear-gradient(180deg, #FFF4F2 0%, var(--surface) 100%)', zIndex: 0 }}></div>
            
            <div style={{ position: 'relative', zIndex: 1, padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,68,31,.1)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 800, fontSize: '11.5px', letterSpacing: '.05em' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }}></span>NUEVO PEDIDO DISPONIBLE
                </span>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>9</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }} className="md:flex-row md:items-center md:gap-8">
                
                <div style={{ flex: 'none' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>$9.400</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' }}>3,1 km · 18 min</div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E6F6EE', color: '#0B7A48', padding: '6px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, marginTop: '12px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>payments</span>Incluye $2.500 de propina
                  </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }} className="md:mt-0 md:flex-1">
                  <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '24px', width: '2px', background: 'var(--border)' }}></div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#17140F', border: '3px solid #FFF4F2', flex: 'none', marginTop: '2px' }}></div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>RECOGER EN</div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, marginTop: '2px' }}>Asadero El Puerto</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Cra. 3 # 4-58, Centro</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'var(--primary)', border: '3px solid var(--surface)', flex: 'none', marginTop: '2px' }}></div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>ENTREGAR EN</div>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, marginTop: '2px' }}>Sharick G.</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Cl. 8 # 52-14, Punta del Este</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }} className="md:mt-0 md:w-[180px]">
                  <button style={{ height: '50px', background: 'var(--primary)', color: '#fff', borderRadius: '14px', fontSize: '15px', fontWeight: 700, boxShadow: '0 8px 20px rgba(255,68,31,.3)' }}>Aceptar pedido</button>
                  <button style={{ height: '50px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '14px', fontSize: '15px', fontWeight: 700 }}>Rechazar</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 40 }}>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
          <span className="material-symbols-rounded" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span style={{ fontSize: '10px', fontWeight: 800 }}>Inicio</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
          <span className="material-symbols-rounded">payments</span>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>Ganancias</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
          <span className="material-symbols-rounded">receipt_long</span>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>Entregas</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
          <span className="material-symbols-rounded">person</span>
          <span style={{ fontSize: '10px', fontWeight: 700 }}>Cuenta</span>
        </button>
      </div>

      {/* MOBILE TURA IA FLOATING BUTTON */}
      <button className="md:hidden" style={{ position: 'absolute', bottom: '90px', right: '20px', display: 'flex', alignItems: 'center', gap: '6px', background: '#17140F', color: '#fff', padding: '12px 18px', borderRadius: '999px', boxShadow: '0 8px 24px rgba(20,16,10,.3)', zIndex: 30 }}>
        <span className="material-symbols-rounded" style={{ color: '#FFB020', fontSize: '18px' }}>auto_awesome</span>
        <span style={{ fontSize: '13.5px', fontWeight: 800 }}>Tura IA</span>
      </button>

    </div>
  );
}
