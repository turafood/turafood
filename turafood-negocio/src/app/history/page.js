'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BusinessHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const history = [
    {
      num: '#1040',
      customer: 'Carlos Ramírez',
      date: 'Hoy, 2:14 PM',
      icon: 'delivery_dining',
      mode: 'Domicilio',
      pay: 'Nequi',
      total: '$45.000',
      pill: 'background: #E6F6EE; color: #0B7A48',
      state: 'Entregado'
    },
    {
      num: '#1039',
      customer: 'Andrea Suarez',
      date: 'Hoy, 1:30 PM',
      icon: 'directions_walk',
      mode: 'Para recoger',
      pay: 'Efectivo',
      total: '$22.000',
      pill: 'background: #E6F6EE; color: #0B7A48',
      state: 'Entregado'
    },
    {
      num: '#1038',
      customer: 'David Muñoz',
      date: 'Ayer, 8:45 PM',
      icon: 'delivery_dining',
      mode: 'Domicilio',
      pay: 'Wompi',
      total: '$68.000',
      pill: 'background: #FFF1EC; color: var(--primary)',
      state: 'Cancelado'
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
            <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', color: 'var(--text)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none', color: 'var(--muted)' }}>receipt_long</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Kanban Pedidos</span>
            </Link>
            <Link href="/catalog" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', color: 'var(--text)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none', color: 'var(--muted)' }}>inventory_2</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Catálogo</span>
            </Link>
            <Link href="/history" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', background: 'var(--surface2)', color: 'var(--primary)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none' }}>history</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Historial</span>
            </Link>
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
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '19px', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Historial de Pedidos</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Revisa tus pedidos pasados</div>
          </div>
        </div>

        {/* History Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 40px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <button style={{ height: '38px', padding: '0 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, background: 'var(--text)', color: '#fff' }}>Todos</button>
            <button style={{ height: '38px', padding: '0 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--border)' }}>Entregados</button>
            <button style={{ height: '38px', padding: '0 14px', borderRadius: '12px', fontSize: '13px', fontWeight: 700, border: '1px solid var(--border)' }}>Cancelados</button>
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '280px', height: '38px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 13px' }} className="hidden sm:flex">
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--muted)' }}>search</span>
              <input placeholder="Cliente o número de pedido" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: '13px', minWidth: 0 }} />
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', boxShadow: 'var(--shadowSm)', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1.3fr) minmax(0,1fr) 116px 108px 116px 108px', gap: '12px', minWidth: '880px', padding: '12px 18px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
              <span>PEDIDO</span><span>CLIENTE</span><span>FECHA</span><span>CANAL</span><span>PAGO</span><span>TOTAL</span><span style={{ textAlign: 'right' }}>ESTADO</span>
            </div>
            
            {history.map((h, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1.3fr) minmax(0,1fr) 116px 108px 116px 108px', gap: '12px', minWidth: '880px', alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ fontWeight: 800 }}>{h.num}</span>
                <span style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.customer}</span>
                <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{h.date}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontWeight: 600 }}>
                  <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '15px' }}>{h.icon}</span>{h.mode}
                </span>
                <span style={{ color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.pay}</span>
                <span style={{ fontWeight: 800 }}>{h.total}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, padding: '5px 9px', borderRadius: '8px', cssText: h.pill }}>{h.state}</span>
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
