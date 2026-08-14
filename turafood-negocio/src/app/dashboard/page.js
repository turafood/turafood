'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BusinessDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);

  const columns = [
    {
      label: 'Nuevos',
      count: 2,
      dot: 'background: var(--blue)',
      orders: [
        {
          num: '#1042',
          time: '2 min',
          timeFg: 'color: var(--primary)',
          isNew: true,
          customer: 'María Camila Ortíz',
          modeIcon: 'delivery_dining',
          mode: 'Domicilio',
          zone: 'El Jorge',
          lines: [
            { qty: 2, name: 'Combo Hamburguesa Sencilla' },
            { qty: 1, name: 'Gaseosa Manzana Postobón 400ml' }
          ],
          hasNote: true,
          note: 'Sin cebolla y extra salsa de ajo por favor.',
          total: '$42.500',
          pay: 'Efectivo al recibir',
          canReject: true,
          btnLabel: 'Aceptar pedido',
          btnStyle: 'background: var(--primary); color: #fff',
        },
        {
          num: '#1043',
          time: 'Ahora',
          timeFg: 'color: var(--blue)',
          isNew: true,
          customer: 'Andrés López',
          modeIcon: 'directions_walk',
          mode: 'Para recoger',
          zone: 'En local',
          lines: [
            { qty: 1, name: 'Pizza Pepperoni Mediana' }
          ],
          hasNote: false,
          total: '$35.000',
          pay: 'Pagado en app',
          canReject: true,
          btnLabel: 'Aceptar pedido',
          btnStyle: 'background: var(--primary); color: #fff',
        }
      ]
    },
    {
      label: 'En preparación',
      count: 1,
      dot: 'background: var(--amber)',
      orders: [
        {
          num: '#1041',
          time: '14 min',
          timeFg: 'color: var(--muted)',
          isNew: false,
          customer: 'Juan David Pérez',
          modeIcon: 'delivery_dining',
          mode: 'Domicilio',
          zone: 'Pueblo Nuevo',
          lines: [
            { qty: 1, name: 'Arroz Paisa Especial' },
            { qty: 2, name: 'Limonada Natural' }
          ],
          hasNote: false,
          total: '$68.000',
          pay: 'Pagado con Nequi',
          canReject: false,
          btnLabel: 'Marcar listo',
          btnStyle: 'background: var(--green); color: #fff',
        }
      ]
    },
    {
      label: 'Listos y En Camino',
      count: 0,
      dot: 'background: var(--green)',
      empty: true,
      orders: []
    }
  ];

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>
      
      {/* Mobile Scrim */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 38, background: 'rgba(20,16,10,.4)', backdropFilter: 'blur(2px)' }} className="md:hidden"></div>
      )}

      {/* Sidebar */}
      <div style={{ flex: 'none', width: '250px', background: 'var(--surface)', color: 'var(--text)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }} className={`${sidebarOpen ? 'absolute inset-y-0 left-0 z-40' : 'hidden'} md:static md:flex`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 18px 18px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '11px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque'", fontWeight: 800, fontSize: '19px', flex: 'none', color: '#fff' }}>t</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '15.5px', letterSpacing: '-.01em' }}>Tura Shop</div>
            <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 800, letterSpacing: '.08em' }}>NEGOCIOS</div>
          </div>
        </div>

        <button style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 12px 14px', padding: '11px', borderRadius: '16px', background: 'var(--surface2)', textAlign: 'left', transition: 'background .15s ease' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '9px', flex: 'none', background: 'var(--primary)' }}></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Asados Doña Juana</span>
            <span style={{ display: 'block', fontSize: '10.5px', color: 'var(--muted)', marginTop: '1px' }}>Restaurante</span>
          </span>
          <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--muted)', flex: 'none' }}>unfold_more</span>
        </button>

        <div style={{ flex: 1, padding: '0 10px 14px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--faint)', letterSpacing: '.1em', padding: '0 10px 8px' }}>OPERACIÓN</div>
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', background: 'var(--surface2)', color: 'var(--primary)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none' }}>receipt_long</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Kanban Pedidos</span>
              <span style={{ flex: 'none', minWidth: '20px', height: '20px', padding: '0 6px', borderRadius: '99px', background: 'var(--primary)', color: '#fff', fontSize: '10.5px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
            </Link>
            <Link href="/catalog" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', color: 'var(--text)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none', color: 'var(--muted)' }}>inventory_2</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Catálogo</span>
            </Link>
            <Link href="/history" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', color: 'var(--text)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none', color: 'var(--muted)' }}>history</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Historial</span>
            </Link>
          </div>
        </div>

        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11.5px', fontWeight: 800, flex: 'none' }}>JC</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Jhon Castillo</div>
              <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Administrador</div>
            </div>
            <button style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '17px', color: 'var(--muted)' }}>logout</span></button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: '16px', minHeight: '68px', padding: '0 26px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ width: '42px', height: '42px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginLeft: '-9px' }} className="md:hidden">
            <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '24px' }}>menu</span>
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '19px', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Kanban de Pedidos</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gestiona tus pedidos en tiempo real</div>
          </div>
          <div style={{ flex: 1 }}></div>
          <button onClick={() => setStoreOpen(!storeOpen)} style={{ display: 'flex', alignItems: 'center', gap: '9px', height: '40px', padding: '0 6px 0 14px', borderRadius: '13px', border: storeOpen ? '1px solid var(--green)' : '1px solid var(--border)', background: storeOpen ? '#E6F6EE' : 'var(--surface2)', color: storeOpen ? '#0B7A48' : 'var(--muted)' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800 }}>{storeOpen ? 'Abierto' : 'Cerrado'}</span>
            <span style={{ width: '38px', height: '22px', borderRadius: '99px', padding: '2px', display: 'flex', background: storeOpen ? 'var(--green)' : 'var(--faint)' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'transform .18s ease', transform: storeOpen ? 'translateX(16px)' : 'none' }}></span>
            </span>
          </button>
        </div>

        {/* Kanban Board */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 40px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 14px', borderRadius: '12px', background: '#E6F6EE', color: '#0B7A48', fontSize: '12.5px', fontWeight: 800 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }}></span>Sonido activo
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '14px', alignItems: 'start' }}>
            {columns.map((col, i) => (
              <div key={i} style={{ background: 'var(--surface2)', borderRadius: '18px', padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px 12px' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', cssText: col.dot }}></span>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 800 }}>{col.label}</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)' }}>{col.count}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {col.orders.map((o, j) => (
                    <div key={j} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '15px', padding: '13px', boxShadow: 'var(--shadowSm)', animation: 'pop .2s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800 }}>
                          {o.isNew && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.6s infinite' }}></span>}
                          {o.num}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, cssText: o.timeFg }}>
                          <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '14px' }}>schedule</span>{o.time}
                        </span>
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, marginTop: '9px' }}>{o.customer}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' }}>
                        <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '14px' }}>{o.modeIcon}</span>{o.mode} · {o.zone}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '11px', paddingTop: '11px', borderTop: '1px solid var(--border)' }}>
                        {o.lines.map((l, k) => (
                          <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                            <span style={{ fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>{l.qty}×</span>
                            <span style={{ flex: 1, lineHeight: 1.35 }}>{l.name}</span>
                          </div>
                        ))}
                      </div>

                      {o.hasNote && (
                        <div style={{ display: 'flex', gap: '7px', marginTop: '10px', background: '#FFF7E6', borderRadius: '10px', padding: '9px 10px' }}>
                          <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '15px', color: '#A8730B', flex: 'none' }}>sticky_note_2</span>
                          <span style={{ fontSize: '11.5px', lineHeight: 1.4, color: '#7A5405' }}>{o.note}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '11px', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 800 }}>{o.total}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)' }}>{o.pay}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '11px' }}>
                        {o.canReject && (
                          <button style={{ flex: 'none', width: '38px', height: '38px', borderRadius: '11px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '19px', color: 'var(--muted)' }}>close</span>
                          </button>
                        )}
                        <button style={{ flex: 1, height: '38px', borderRadius: '11px', fontSize: '12.5px', fontWeight: 800, cssText: o.btnStyle }}>
                          {o.btnLabel}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {col.empty && (
                    <div style={{ textAlign: 'center', padding: '26px 12px', fontSize: '12px', color: 'var(--faint)', fontWeight: 600 }}>Sin pedidos</div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
