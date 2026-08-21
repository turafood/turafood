'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cop } from '@/lib/format';
import { useBiz } from '../BizContext';

export default function TurboPage() {
  const { toast } = useBiz ? useBiz() : { toast: () => {} };

  // Turbo Configuration State
  const [turboActive, setTurboActive] = useState(true);
  const [turboRadius, setTurboRadius] = useState(2.5); // 1.0 to 4.0 km
  const [maxKitchenTime, setMaxKitchenTime] = useState(5); // 3 to 8 mins
  const [turboSurcharge, setTurboSurcharge] = useState(3500); // Express fee
  const [autoPriorityDispatch, setAutoPriorityDispatch] = useState(true);

  // Live Timer Simulation State
  const [simActive, setSimActive] = useState(true);
  const [simSecondsLeft, setSimSecondsLeft] = useState(840); // 14 mins
  const [simPhase, setSimPhase] = useState('en_ruta'); // cocina, despacho, en_ruta, entregado

  // Turbo Menu Products (demo fast preparation items)
  const [turboProducts, setTurboProducts] = useState([
    { id: 1, name: 'Hamburguesa clásica', prep: '4 mins', price: 16000, active: true, icon: '🍔' },
    { id: 2, name: 'Salchipapa personal', prep: '3 mins', price: 12000, active: true, icon: '🍟' },
    { id: 3, name: 'Limonada de coco 16 oz', prep: '2 mins', price: 9500, active: true, icon: '🍹' },
    { id: 4, name: 'Gaseosa personal 400ml', prep: '1 min', price: 4500, active: true, icon: '🥤' },
    { id: 5, name: 'Postre Tres Leches', prep: '1 min', price: 8000, active: true, icon: '🍰' },
  ]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (simActive && simSecondsLeft > 0) {
      interval = setInterval(() => {
        setSimSecondsLeft(s => {
          if (s <= 1) {
            setSimPhase('entregado');
            return 0;
          }
          if (s > 700) setSimPhase('cocina');
          else if (s > 600) setSimPhase('despacho');
          else setSimPhase('en_ruta');
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [simActive, simSecondsLeft]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTurboProduct = (id) => {
    setTurboProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  };

  const resetSimulation = () => {
    setSimSecondsLeft(900); // 15 mins
    setSimActive(true);
    setSimPhase('cocina');
    if (toast) toast('Simulación de Pedido Turbo reiniciada');
  };

  const saveTurboConfig = () => {
    if (toast) toast('Configuración de Tura Turbo ⚡ guardada con éxito');
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 80 }}>

      {/* ─────────── HERO TURBO NIVEL DIOS (NEON GOLD & ORANGE + 3D ICON) ─────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #141009 0%, #291807 50%, #15110B 100%)',
        borderRadius: 28, padding: '40px 40px', color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 28px 60px rgba(255,68,31,0.2)', border: '1px solid rgba(255,122,77,0.3)',
        marginBottom: 28
      }}>
        {/* Glows */}
        <div style={{ position: 'absolute', top: -100, right: 100, width: 350, height: 350, background: 'radial-gradient(circle, rgba(255,107,0,0.25) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 300, height: 300, background: 'radial-gradient(circle, rgba(232,199,102,0.18) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 28 }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,107,0,0.15)', borderRadius: 99, border: '1px solid rgba(255,107,0,0.35)', marginBottom: 16 }}>
              <span className="ms" style={{ fontSize: 16, color: '#FF7A4D' }}>bolt</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#FF7A4D', letterSpacing: '.1em', textTransform: 'uppercase' }}>Despacho Ultra Rápido</span>
            </div>

            <h1 style={{ margin: '0 0 12px', fontSize: 36, fontFamily: 'var(--font-bricolage)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>
              Tura Turbo ⚡ <br /><span style={{ background: 'linear-gradient(90deg, #FF7A4D, #E8C766)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Entregas en menos de 15 Minutos</span>
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 520 }}>
              Destaca tu restaurante en la sección exclusiva <strong>TURBO 15 MIN</strong> de la app para clientes hambrientos que exigen entregas inmediatas con tarifa express.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => setTurboActive(!turboActive)}
                style={{
                  height: 48, padding: '0 24px', borderRadius: 14, border: 'none',
                  background: turboActive ? 'linear-gradient(135deg, #FF7A4D, #E2360F)' : 'var(--surface2)',
                  color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: turboActive ? '0 8px 24px rgba(255,68,31,0.4)' : 'none',
                  transition: 'all .3s'
                }}
              >
                <span className="ms" style={{ fontSize: 20 }}>{turboActive ? 'bolt' : 'power_settings_new'}</span>
                {turboActive ? '● MODO TURBO ACTIVADO' : '○ ACTIVAR MODO TURBO'}
              </button>

              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                {turboActive ? '⚡ Visible en carrusel prioritario' : 'Pausado temporalmente'}
              </span>
            </div>
          </div>

          {/* 3D Turbo Bag Mockup */}
          <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image
              src="/images/ic-turbo.png"
              alt="Tura Turbo 10-15 min"
              width={200}
              height={200}
              style={{
                objectFit: 'contain',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
                animation: 'tffloat 6s ease-in-out infinite'
              }}
            />
          </div>
        </div>
      </section>


      {/* ─────────── 2 COLUMNAS: SIMULADOR DE TIMER & CONFIGURACIÓN ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 24, marginBottom: 28 }}>
        
        {/* COL 1: CRONÓMETRO Y PROMESA DE ENTREGA EN VIVO (RAPPI TURBO STYLE) */}
        <div style={{
          background: 'var(--surface)', borderRadius: 24, padding: 32, border: '1px solid var(--border)',
          boxShadow: 'var(--shadowSm)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
                Temporizador con Promesa
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                Lo que ve el cliente y el repartidor durante la entrega
              </p>
            </div>
            <button onClick={resetSimulation} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="ms" style={{ fontSize: 16 }}>refresh</span> Reiniciar
            </button>
          </div>

          {/* Big Neon Countdown */}
          <div style={{
            background: 'var(--surface2)', borderRadius: 20, padding: '24px 20px',
            border: '1px solid var(--border)', textAlign: 'center', marginBottom: 20,
            position: 'relative'
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FF7A4D', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>
              ⚡ TIEMPO RESTANTE GARANTIZADO
            </div>
            <div style={{ fontSize: 48, fontFamily: 'monospace', fontWeight: 900, color: simSecondsLeft < 180 ? 'var(--primary)' : 'var(--text)', letterSpacing: '0.05em' }}>
              {formatTimer(simSecondsLeft)}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
              Objetivo: Entrega antes de <strong>15:00 mins</strong>
            </div>

            {/* Progress Bar */}
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', marginTop: 16, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((900 - simSecondsLeft) / 900) * 100}%`,
                background: 'linear-gradient(90deg, var(--gold), #FF7A4D)',
                borderRadius: 99,
                transition: 'width 1s linear'
              }} />
            </div>
          </div>

          {/* Phase Stepper */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'cocina', label: '1. Cocina Express (0 - 3 min)', icon: 'restaurant', desc: 'Plato empacado y sellado en tiempo récord' },
              { id: 'despacho', label: '2. Asignación VIP Repartidor', icon: 'two_wheeler', desc: 'Repartidor a < 500m notificado al instante' },
              { id: 'en_ruta', label: '3. En Ruta hacia el Cliente', icon: 'navigation', desc: 'Ruta más rápida con prioridad semafórica' },
              { id: 'entregado', label: '4. Entrega Exitosa a Tiempo', icon: 'verified', desc: 'Pedido entregado en menos de 15 minutos' },
            ].map(ph => {
              const isCurrent = simPhase === ph.id;
              return (
                <div key={ph.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                  background: isCurrent ? 'var(--primary-tint)' : 'var(--surface2)',
                  border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--border)'}`,
                  transition: 'all .2s'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isCurrent ? 'var(--primary)' : 'var(--surface)',
                    color: isCurrent ? '#fff' : 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'
                  }}>
                    <span className="ms" style={{ fontSize: 18 }}>{ph.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: isCurrent ? 'var(--primary)' : 'var(--text)' }}>{ph.label}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{ph.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* COL 2: PARÁMETROS DEL ALGORITMO TURBO */}
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 32, border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>tune</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
                Reglas de Operación Turbo
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                Ajusta las restricciones para garantizar el cumplimiento del tiempo
              </p>
            </div>
          </div>

          {/* Radio de Cobertura Turbo */}
          <div style={{ background: 'var(--surface2)', padding: '18px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Radio Máximo de Cobertura Turbo</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Solo clientes dentro de este rango verán la opción Turbo</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                {turboRadius} km
              </span>
            </div>
            <input
              type="range" min="1.0" max="4.0" step="0.5"
              value={turboRadius} onChange={(e) => setTurboRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Tiempo Máximo de Cocina */}
          <div style={{ background: 'var(--surface2)', padding: '18px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Tiempo Máximo de Preparación en Cocina</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Plazo para tener el pedido listo para entrega</div>
              </div>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)', background: 'var(--surface)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
                {maxKitchenTime} mins
              </span>
            </div>
            <input
              type="range" min="2" max="8" step="1"
              value={maxKitchenTime} onChange={(e) => setMaxKitchenTime(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          </div>

          {/* Tarifa Express Extra */}
          <div style={{ background: 'var(--surface2)', padding: '18px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Tarifa Express Adicional Turbo</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recargo que paga el cliente por la entrega ultra-rápida</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '4px 10px' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)' }}>+$</span>
                <input
                  type="number"
                  value={turboSurcharge}
                  onChange={(e) => setTurboSurcharge(Number(e.target.value))}
                  style={{ width: 65, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 800, color: 'var(--text)', textAlign: 'right' }}
                />
              </div>
            </div>
          </div>

          {/* Despacho VIP */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--surface2)', borderRadius: 14, border: '1px solid var(--border)' }}>
            <input
              type="checkbox"
              id="autoPriority"
              checked={autoPriorityDispatch}
              onChange={(e) => setAutoPriorityDispatch(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <label htmlFor="autoPriority" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
              Asignar automáticamente al repartidor más cercano antes de que la cocina termine de empacar.
            </label>
          </div>

          <button
            onClick={saveTurboConfig}
            style={{
              marginTop: 'auto', height: 48, borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #FF7A4D, #E2360F)',
              color: '#fff', fontWeight: 800, fontSize: 14.5, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(255,68,31,0.35)'
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>save</span>
            Guardar Configuración Turbo
          </button>
        </div>

      </div>


      {/* ─────────── PRODUCTOS HABILITADOS PARA TURBO ─────────── */}
      <section style={{ background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadowSm)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
              Catálogo de Platos Habilitados para Turbo ⚡
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Solo activa productos con preparación menor a 5 minutos para no comprometer el cronómetro.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FF7A4D', background: 'rgba(255,107,0,0.15)', padding: '4px 12px', borderRadius: 99 }}>
            {turboProducts.filter(p => p.active).length} Platos Turbo
          </span>
        </div>

        <table style={{ width: '100%', fontSize: 13.5, textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Producto', 'Tiempo de Cocina', 'Precio', 'Tarifa Turbo Extra', 'Estado Turbo', 'Acción'].map(h => (
                <th key={h} style={{ padding: '14px 24px', fontWeight: 700, color: 'var(--muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turboProducts.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }} className="hover-row">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {p.icon}
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontWeight: 700 }}>
                    <span className="ms" style={{ fontSize: 16 }}>timer</span> {p.prep}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--text)' }}>{cop(p.price)}</td>
                <td style={{ padding: '16px 24px', color: '#FF7A4D', fontWeight: 800 }}>+{cop(turboSurcharge)}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 800,
                    background: p.active ? 'rgba(255,107,0,0.15)' : 'var(--surface2)',
                    color: p.active ? '#FF7A4D' : 'var(--muted)'
                  }}>
                    {p.active ? '⚡ Turbo Activo' : '○ Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <button
                    onClick={() => toggleTurboProduct(p.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 10, border: '1px solid var(--border)',
                      background: p.active ? 'var(--surface2)' : 'var(--primary-tint)',
                      color: p.active ? 'var(--muted)' : 'var(--primary)',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    {p.active ? 'Desactivar' : 'Habilitar Turbo'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
