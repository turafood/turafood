'use client';

import { useState, useMemo } from 'react';
import { cop } from '@/lib/format';
import { useBiz } from '../../BizContext';

export default function AjustesDespachoPage() {
  const { toast } = useBiz ? useBiz() : { toast: () => {} };

  // Dispatch rules
  const [autoAssign, setAutoAssign] = useState(true);
  const [radius, setRadius] = useState(5);
  const [allowCash, setAllowCash] = useState(false);

  // Dynamic Pricing (Uber / DiDi Food Engine)
  const [dynamicPricingActive, setDynamicPricingActive] = useState(true);
  const [baseFee, setBaseFee] = useState(4000);
  const [kmFee, setKmFee] = useState(1200);
  const [minFee, setMinFee] = useState(5000);
  const [surgeMultiplier, setSurgeMultiplier] = useState(1.4); // 1.0x to 2.5x
  const [rainSurchargeActive, setRainSurchargeActive] = useState(true);
  const [rainSurcharge, setRainSurcharge] = useState(2500);
  const [nightSurchargeActive, setNightSurchargeActive] = useState(false);
  const [nightSurchargePercent, setNightSurchargePercent] = useState(20);
  const [autoSurgeOnHighDemand, setAutoSurgeOnHighDemand] = useState(true);

  // Live Simulation test params
  const [simKm, setSimKm] = useState(3.8);
  const [simIsRaining, setSimIsRaining] = useState(true);
  const [simIsNight, setSimIsNight] = useState(false);

  // Calculated simulation
  const simResult = useMemo(() => {
    let raw = Number(baseFee);
    if (simKm > 2) {
      raw += (simKm - 2) * Number(kmFee);
    }
    raw = Math.max(raw, Number(minFee));

    // Apply surge multiplier if active
    let surged = dynamicPricingActive ? raw * Number(surgeMultiplier) : raw;

    // Apply rain
    if (rainSurchargeActive && simIsRaining) {
      surged += Number(rainSurcharge);
    }

    // Apply night
    if (nightSurchargeActive && simIsNight) {
      surged += surged * (Number(nightSurchargePercent) / 100);
    }

    // Round to nearest hundred
    const finalFee = Math.round(surged / 100) * 100;
    const riderShare = Math.round((finalFee * 0.85) / 100) * 100;
    const platformShare = finalFee - riderShare;

    return {
      base: raw,
      final: finalFee,
      riderShare,
      platformShare,
      surgeDiff: finalFee - raw,
    };
  }, [baseFee, kmFee, minFee, surgeMultiplier, dynamicPricingActive, rainSurchargeActive, rainSurcharge, nightSurchargeActive, nightSurchargePercent, simKm, simIsRaining, simIsNight]);

  const handleSave = () => {
    if (toast) {
      toast('Configuración de Tarifas Dinámicas guardada con éxito');
    }
  };

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 80 }}>
      <style>{`
        .ai-switch {
          width: 54px; height: 30px; border-radius: 99px;
          background: var(--surface2); border: 1px solid var(--border);
          position: relative; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; align-items: center;
          flex-shrink: 0;
        }
        .ai-switch.on {
          background: var(--primary);
          border-color: var(--primary);
        }
        .ai-switch-knob {
          width: 22px; height: 22px; border-radius: 50%;
          background: #fff; position: absolute; left: 3px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .ai-switch.on .ai-switch-knob { 
          transform: translateX(24px); 
        }

        .range-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 8px;
          border-radius: 99px;
          background: var(--surface2);
          outline: none;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary);
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(255,68,31,0.35);
          border: 3px solid #fff;
        }

        .surge-pill {
          padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 800;
          cursor: pointer; border: 1px solid var(--border); background: var(--surface2);
          color: var(--muted); transition: all .2s; display: flex; align-items: center; gap: 6px;
        }
        .surge-pill.active {
          background: linear-gradient(135deg, #FF7A4D, #E2360F);
          color: #fff; border-color: transparent;
          box-shadow: 0 6px 18px rgba(255,68,31,0.3);
        }
      `}</style>

      {/* ─────────── HERO SECTION ─────────── */}
      <section style={{ 
        background: 'linear-gradient(135deg, #141009 0%, #241D14 50%, #1A130B 100%)',
        borderRadius: 24, padding: '36px 36px', color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(20,16,10,0.15)', border: '1px solid rgba(232,199,102,0.18)'
      }}>
        <div style={{ position: 'absolute', top: -100, right: -50, width: 320, height: 320, background: 'radial-gradient(circle, rgba(232,199,102,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, background: 'radial-gradient(circle, rgba(255,68,31,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, position: 'relative', zIndex: 2 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(145deg, #FF7A4D, #E2360F)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(255,68,31,0.35)', flex: 'none' }}>
            <span className="ms" style={{ fontSize: 34, color: '#fff' }}>electric_bolt</span>
          </div>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--gold)', marginBottom: 8, textTransform: 'uppercase' }}>
              <span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Motor de Despacho &amp; Tarifas Dinámicas
            </div>
            <h1 style={{ margin: 0, fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 800, letterSpacing: '-.02em' }}>
              Algoritmo de Tarifas tipo <span style={{ color: 'var(--gold)' }}>Uber &amp; DiDi Food</span>
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, maxWidth: 640 }}>
              Controla precios base, multiplicadores por alta demanda (Surge), recargos climáticos y reglas de asignación por geolocalización en tiempo real.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── 1. SIMULADOR INTERACTIVO DE PRECIO EN VIVO (UBER STYLE) ─────────── */}
      <section style={{ marginTop: 24, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadowSm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ms" style={{ color: 'var(--primary)', fontSize: 22 }}>calculate</span>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
                Simulador de Tarifa Dinámica en Vivo
              </h2>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              Prueba cómo el algoritmo calcula la tarifa de entrega según la distancia y factores en tiempo real.
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 99, background: 'var(--green-tint)', color: 'var(--green)', letterSpacing: '.05em' }}>
            ● ALGORITMO ACTIVO
          </span>
        </div>

        {/* Live Fare Card Breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, background: 'var(--surface2)', borderRadius: 20, padding: 24, border: '1px solid var(--border)' }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
                <span>Distancia estimada del pedido</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{simKm} km</span>
              </div>
              <input
                type="range" min="1" max="12" step="0.2"
                value={simKm} onChange={(e) => setSimKm(Number(e.target.value))}
                className="range-slider"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setSimIsRaining(!simIsRaining)}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)',
                  background: simIsRaining ? 'rgba(46,107,255,0.15)' : 'var(--surface)',
                  color: simIsRaining ? '#2E6BFF' : 'var(--muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span className="ms" style={{ fontSize: 16 }}>rainy</span>
                {simIsRaining ? '🌧️ Lloviendo (+Recargo)' : 'Clima despejado'}
              </button>

              <button
                onClick={() => setSimIsNight(!simIsNight)}
                style={{
                  padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)',
                  background: simIsNight ? 'rgba(168,85,247,0.15)' : 'var(--surface)',
                  color: simIsNight ? '#A855F7' : 'var(--muted)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                <span className="ms" style={{ fontSize: 16 }}>dark_mode</span>
                {simIsNight ? '🌙 Horario Nocturno' : 'Horario Diurno'}
              </button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
              Fórmula: Base ({cop(baseFee)}) + Km Extra + Surge ({surgeMultiplier}x) + Factores
            </div>
          </div>

          {/* Fare Result */}
          <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Tarifa Final al Cliente
              </div>
              <div style={{ fontSize: 32, fontFamily: 'var(--font-bricolage)', fontWeight: 900, color: 'var(--text)', marginTop: 4, lineHeight: 1 }}>
                {cop(simResult.final)}
              </div>
              {simResult.surgeDiff > 0 && (
                <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginTop: 4 }}>
                  +{cop(simResult.surgeDiff)} por alta demanda / clima
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>Pago Repartidor (85%)</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{cop(simResult.riderShare)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700 }}>Margen Restaurante</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{cop(simResult.platformShare)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ─────────── 2. MULTIPLICADOR DE DEMANDA (SURGE PRICING) ─────────── */}
      <section style={{ marginTop: 20, display: 'grid', gap: 16 }}>
        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={S.settingTitle}>
                <span className="ms" style={{ color: 'var(--primary)' }}>trending_up</span>
                Tarifa Dinámica por Demanda (Surge Pricing)
                {dynamicPricingActive && <span style={S.activeBadge}>ACTIVO</span>}
              </div>
              <div className={`ai-switch ${dynamicPricingActive ? 'on' : ''}`} onClick={() => setDynamicPricingActive(!dynamicPricingActive)}>
                <div className="ai-switch-knob" />
              </div>
            </div>

            <div style={S.settingDesc}>
              Aumenta automáticamente el valor del domicilio durante horas pico o cuando hay muchos pedidos activos para incentivar a los repartidores a conectarse.
            </div>

            {dynamicPricingActive && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                  Multiplicador Actual en Vivo:
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { val: 1.0, label: '1.0x (Normal)' },
                    { val: 1.2, label: '1.2x (+20%)' },
                    { val: 1.4, label: '1.4x (+40%)' },
                    { val: 1.7, label: '1.7x (+70%)' },
                    { val: 2.0, label: '2.0x (+100%)' },
                  ].map((p) => (
                    <button
                      key={p.val}
                      onClick={() => setSurgeMultiplier(p.val)}
                      className={`surge-pill ${surgeMultiplier === p.val ? 'active' : ''}`}
                    >
                      <span className="ms" style={{ fontSize: 16 }}>bolt</span>
                      {p.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="checkbox"
                    id="autoSurge"
                    checked={autoSurgeOnHighDemand}
                    onChange={(e) => setAutoSurgeOnHighDemand(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoSurge" style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
                    Auto-ajuste por IA: Subir a 1.6x cuando el 85% de la flota esté en entrega
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* ─────────── 3. TARIFAS BASE Y DISTANCIA ─────────── */}
        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={S.settingTitle}>
              <span className="ms" style={{ color: 'var(--amber)' }}>payments</span>
              Estructura de Costos Base
            </div>
            <div style={S.settingDesc}>
              Define el piso mínimo de entrega y el costo gradual por cada kilómetro recorrido.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 20 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Tarifa Base Inicial (Hasta 2 km)</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    value={baseFee}
                    onChange={(e) => setBaseFee(Number(e.target.value))}
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '12px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text)', width: '100%' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--faint)' }}>COP</span>
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Costo por Km adicional</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    value={kmFee}
                    onChange={(e) => setKmFee(Number(e.target.value))}
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '12px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text)', width: '100%' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--faint)' }}>COP/km</span>
                </div>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Tarifa Mínima Garantizada</span>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted)' }}>$</span>
                  <input
                    type="number"
                    value={minFee}
                    onChange={(e) => setMinFee(Number(e.target.value))}
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '12px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text)', width: '100%' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--faint)' }}>COP</span>
                </div>
              </label>
            </div>
          </div>
        </div>


        {/* ─────────── 4. RECARGOS POR CLIMA & HORARIO ─────────── */}
        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={S.settingTitle}>
              <span className="ms" style={{ color: '#2E6BFF' }}>water_drop</span>
              Recargos Inteligentes (Clima y Horario)
            </div>
            <div style={S.settingDesc}>
              Evita rechazos masivos de pedidos compensando a la flota cuando las condiciones operativas son difíciles.
            </div>

            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lluvia */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(46,107,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ color: '#2E6BFF', fontSize: 20 }}>rainy</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Recargo por Lluvia / Tormenta</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Añade un bono fijo directo por mal clima</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '4px 10px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>+$</span>
                    <input
                      type="number"
                      value={rainSurcharge}
                      onChange={(e) => setRainSurcharge(Number(e.target.value))}
                      style={{ width: 70, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'right' }}
                    />
                  </div>
                  <div className={`ai-switch ${rainSurchargeActive ? 'on' : ''}`} onClick={() => setRainSurchargeActive(!rainSurchargeActive)}>
                    <div className="ai-switch-knob" />
                  </div>
                </div>
              </div>

              {/* Noche */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="ms" style={{ color: '#A855F7', fontSize: 20 }}>nightlight</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Recargo Nocturno (10:00 PM – 6:00 AM)</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Porcentaje adicional sobre la tarifa calculada</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--border)', padding: '4px 10px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>+%</span>
                    <input
                      type="number"
                      value={nightSurchargePercent}
                      onChange={(e) => setNightSurchargePercent(Number(e.target.value))}
                      style={{ width: 50, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, fontWeight: 800, color: 'var(--text)', textAlign: 'right' }}
                    />
                  </div>
                  <div className={`ai-switch ${nightSurchargeActive ? 'on' : ''}`} onClick={() => setNightSurchargeActive(!nightSurchargeActive)}>
                    <div className="ai-switch-knob" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* ─────────── 5. ASIGNACIÓN Y COBERTURA (EXISTENTES MEJORADOS) ─────────── */}
        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={S.settingTitle}>
                <span className="ms" style={{ color: 'var(--green)' }}>near_me</span>
                Asignación Automática Inteligente (GPS)
                {autoAssign && <span style={S.activeBadge}>ACTIVO</span>}
              </div>
              <div className={`ai-switch ${autoAssign ? 'on' : ''}`} onClick={() => setAutoAssign(!autoAssign)}>
                <div className="ai-switch-knob" />
              </div>
            </div>
            <div style={S.settingDesc}>
              El algoritmo despacha la comanda al repartidor libre más cercano en ruta para reducir los minutos de entrega.
            </div>
          </div>
        </div>

        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={S.settingTitle}>
              <span className="ms" style={{ color: 'var(--gold)' }}>radar</span>
              Radio Máximo de Cobertura
            </div>
            <div style={S.settingDesc}>
              Limita hasta dónde pueden pedir tus clientes para proteger la temperatura y calidad de la comida.
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <input type="range" min="1" max="15" value={radius} onChange={(e) => setRadius(e.target.value)} className="range-slider" style={{ flex: 1 }} />
              <div style={{ width: 76, height: 40, background: 'var(--surface2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, border: '1px solid var(--border)', color: 'var(--text)' }}>
                {radius} km
              </div>
            </div>
          </div>
        </div>

        <div style={S.settingCard}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={S.settingTitle}>
                <span className="ms" style={{ color: 'var(--muted)' }}>local_atm</span>
                Pago contra entrega (Efectivo)
                {allowCash && <span style={S.activeBadge}>ACTIVO</span>}
              </div>
              <div className={`ai-switch ${allowCash ? 'on' : ''}`} onClick={() => setAllowCash(!allowCash)}>
                <div className="ai-switch-knob" />
              </div>
            </div>
            <div style={S.settingDesc}>
              Permite recibir efectivo con liquidación al final del día en el módulo de Finanzas y Pagos.
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── BOTÓN GUARDAR FLOTANTE / INLINE ─────────── */}
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={handleSave}
          style={{
            padding: '0 32px', height: 48, borderRadius: 99,
            background: 'linear-gradient(135deg, var(--primary), #FF7A4D)',
            color: '#fff', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(255,68,31,0.3)', display: 'flex', alignItems: 'center', gap: 8
          }}
        >
          <span className="ms" style={{ fontSize: 20 }}>save</span>
          Guardar Reglas de Despacho
        </button>
      </div>

    </div>
  );
}

const S = {
  settingCard: {
    display: 'flex', alignItems: 'flex-start', gap: 24, padding: 28,
    borderRadius: 22, background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: 'var(--shadowSm)'
  },
  settingTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 8,
    display: 'flex', alignItems: 'center', gap: 10
  },
  settingDesc: {
    fontSize: 14, color: 'var(--muted)', lineHeight: 1.5
  },
  activeBadge: {
    fontSize: 10, padding: '4px 8px', borderRadius: 6, background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    color: 'var(--primary)', fontWeight: 800, letterSpacing: '.05em'
  }
};
