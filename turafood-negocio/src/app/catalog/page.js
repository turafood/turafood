'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BusinessCatalog() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const categories = [
    { label: 'Entradas', count: 4 },
    { label: 'Platos Fuertes', count: 12, style: 'background:var(--surface2); color:var(--primary)' },
    { label: 'Bebidas', count: 8 },
    { label: 'Postres', count: 3 }
  ];

  const products = [
    {
      img: 'background: #FFEBE6',
      name: 'Bandeja Paisa Especial',
      desc: 'Frijoles, arroz, chicharrón, carne molida, chorizo...',
      price: '$28.000',
      sold: 142,
      bar: 'width: 80%; background: var(--green)',
      isTop: true,
      off: false,
      track: 'background: var(--green)',
      knob: 'transform: translateX(18px)'
    },
    {
      img: 'background: #E6F0FF',
      name: 'Sancocho de Gallina',
      desc: 'Sopa tradicional con arroz y ensalada',
      price: '$22.000',
      sold: 86,
      bar: 'width: 45%; background: var(--primary)',
      isTop: false,
      off: false,
      track: 'background: var(--green)',
      knob: 'transform: translateX(18px)'
    },
    {
      img: 'background: #FFF1E6',
      name: 'Mojarra Frita',
      desc: 'Mojarra de 500g con patacón, arroz con coco',
      price: '$35.000',
      sold: 51,
      bar: 'width: 25%; background: var(--amber)',
      isTop: false,
      off: true,
      rowStyle: 'opacity: 0.6',
      track: 'background: var(--surface2)',
      knob: 'transform: none'
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
            <Link href="/catalog" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', background: 'var(--surface2)', color: 'var(--primary)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none' }}>inventory_2</span>
              <span style={{ flex: 1, fontSize: '13.5px', fontWeight: 600 }}>Catálogo</span>
            </Link>
            <Link href="/history" style={{ display: 'flex', alignItems: 'center', gap: '11px', width: '100%', height: '42px', padding: '0 12px', borderRadius: '999px', textAlign: 'left', marginBottom: '2px', color: 'var(--text)' }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '20px', flex: 'none', color: 'var(--muted)' }}>history</span>
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
            <div style={{ fontFamily: "'Bricolage Grotesque'", fontWeight: 700, fontSize: '19px', letterSpacing: '-.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Catálogo de Productos</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Gestiona tus menús, precios e inventario</div>
          </div>
          <div style={{ flex: 1 }}></div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '40px', padding: '0 15px', borderRadius: '999px', background: 'var(--primary)', color: '#fff', fontSize: '13px', fontWeight: 700, boxShadow: '0 1px 3px rgba(20,16,10,.18)' }}>
            <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px' }}>add</span>Nuevo producto
          </button>
        </div>

        {/* Catalog Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 40px', display: 'flex', gap: '16px', alignItems: 'flex-start' }} className="flex-col lg:flex-row">
          
          <div style={{ flex: 'none', width: '226px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '14px', boxShadow: 'var(--shadowSm)' }} className="w-full lg:w-[226px]">
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.08em', padding: '2px 8px 10px' }}>CATEGORÍAS</div>
            {categories.map((c, i) => (
              <button key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '100%', height: '38px', padding: '0 10px', borderRadius: '11px', textAlign: 'left', marginBottom: '2px', cssText: c.style }}>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 700 }}>{c.label}</span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--muted)' }}>{c.count}</span>
              </button>
            ))}
            <button style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', height: '38px', padding: '0 10px', borderRadius: '11px', marginTop: '8px', color: 'var(--primary)', fontSize: '13px', fontWeight: 800 }}>
              <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px' }}>add</span>Nueva categoría
            </button>
          </div>

          <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', boxShadow: 'var(--shadowSm)', overflowX: 'auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flex: 1, height: '40px', background: 'var(--bg)', borderRadius: '12px', padding: '0 13px', maxWidth: '320px' }}>
                <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '19px', color: 'var(--muted)' }}>search</span>
                <input placeholder="Buscar producto" style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: '13.5px', minWidth: 0 }} />
              </div>
              <div style={{ flex: 1 }}></div>
              <span style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 600 }} className="hidden sm:inline">27 productos · 1 agotado</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.4fr) 116px 130px 108px 92px', gap: '12px', minWidth: '760px', padding: '12px 18px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
              <span>PRODUCTO</span><span>PRECIO</span><span>RENDIMIENTO</span><span>DISPONIBLE</span><span style={{ textAlign: 'right' }}>ACCIONES</span>
            </div>

            {products.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.4fr) 116px 130px 108px 92px', gap: '12px', minWidth: '760px', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border)', cssText: p.rowStyle }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span style={{ width: '44px', height: '44px', borderRadius: '12px', flex: 'none', position: 'relative', cssText: p.img }}>
                    {p.off && <span style={{ position: 'absolute', inset: 0, borderRadius: '12px', background: 'rgba(255,255,255,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--muted)' }}>visibility_off</span></span>}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      {p.isTop && <span style={{ flex: 'none', fontSize: '9.5px', fontWeight: 800, padding: '2px 6px', borderRadius: '5px', background: '#FFF0CC', color: '#A8730B' }}>TOP</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.desc}</span>
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800 }}>{p.price}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>{p.sold} vendidos</div>
                  <div style={{ height: '5px', borderRadius: '99px', background: 'var(--surface2)', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '99px', cssText: p.bar }}></div>
                  </div>
                </div>
                <div>
                  <button style={{ width: '42px', height: '24px', borderRadius: '99px', padding: '2px', display: 'flex', cssText: p.track }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'transform .18s ease', cssText: p.knob }}></span>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s ease' }}>
                    <span style={{ fontFamily: "'Material Symbols Rounded'", fontSize: '18px', color: 'var(--muted)' }}>edit</span>
                  </button>
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
