'use client';

/**
 * EL PANEL PRO DE PREPARACIÓN
 *
 * El usuario pidió algo "PRO", así que quitamos la olla básica de SVG
 * y la reemplazamos por un diseño moderno de "glowing rings" y transiciones
 * suaves, inspirado en interfaces premium (Apple, Stripe, etc).
 *
 * Se adapta al color y contexto de su nicho para mantener la magia.
 */

import { useEffect, useState } from 'react';

const ESCENAS = {
  comidas_rapidas: { icon: 'fastfood',         titulo: 'Entorno FastFood',         color: '#FFB020' },
  farmacia:        { icon: 'local_pharmacy',   titulo: 'Entorno Health & Pharma',  color: '#4A90E2' },
  licores:         { icon: 'sports_bar',       titulo: 'Entorno Nightlife',        color: '#9B6BE8' },
  turbo:           { icon: 'bolt',             titulo: 'Entorno Turbo Logistics',  color: '#D97706' },
  turapp:          { icon: 'apps',             titulo: 'Entorno Multi-Service',    color: '#15803D' },
  repartidor:      { icon: 'two_wheeler',      titulo: 'Entorno Courier Grid',     color: '#25D366' },
};

const POR_DEFECTO = { icon: 'auto_awesome', titulo: 'Entorno de Operaciones', color: '#FF7A4D' };

export default function PreparandoPanel({ nicho, pasos = [], listo }) {
  const [visto, setVisto] = useState(0);
  const escena = ESCENAS[nicho] ?? POR_DEFECTO;

  // Un poco más despacio para que la animación pro se sienta fluida
  useEffect(() => {
    if (visto >= pasos.length) return undefined;
    const id = setTimeout(() => setVisto((n) => n + 1), 350);
    return () => clearTimeout(id);
  }, [visto, pasos.length]);

  return (
    <>
      <style>{`
        @keyframes pro-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pro-pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
        @keyframes pro-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .pro-ring {
          animation: pro-spin 2s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
          transform-origin: center;
        }
        .pro-glow {
          animation: pro-pulse-glow 3s ease-in-out infinite;
        }
        .pro-icon-float {
          animation: pro-float 3s ease-in-out infinite;
        }
      `}</style>
      <div style={S.capa} role="status" aria-live="polite">
        <div style={S.gridBg} />
        <div style={S.centro}>

          {/* ---------------------------------------- El Loader PRO */}
          <div style={S.escena}>
            {/* Brillo de fondo sutil */}
            <div style={{ ...S.glow, background: escena.color }} className="pro-glow" aria-hidden="true" />
            
            {/* Contenedor de los anillos */}
            <div style={S.ringContainer}>
              <svg viewBox="0 0 100 100" style={S.ringSvg} aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle 
                  cx="50" cy="50" r="46" 
                  fill="none" 
                  stroke={escena.color} 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  className="pro-ring" 
                  strokeDasharray="90 200" 
                  style={{ filter: `drop-shadow(0 0 6px ${escena.color})` }}
                />
              </svg>
              {/* Ícono central flotante */}
              <span className="ms pro-icon-float" style={{ ...S.centerIcon, color: escena.color }}>
                {escena.icon}
              </span>
            </div>
          </div>

          {/* ---------------------------------------- El texto */}
          <h2 style={S.titulo}>{escena.titulo}</h2>
          <p style={S.bajada}>Sincronizando topología de red...</p>

          {/* ---------------------------------------- Los pasos */}
          <div style={S.pasosCaja}>
            <ol style={S.pasos}>
              {pasos.map((p, n) => {
                const hecho = n < visto;
                const actual = n === visto;
                return (
                  <li key={p} style={{ ...S.paso, opacity: hecho || actual ? 1 : 0.25 }}>
                    <div style={{
                      ...S.terminalLine,
                      borderColor: actual ? escena.color : 'rgba(255,255,255,0.03)',
                      background: actual ? `${escena.color}11` : 'rgba(0,0,0,0.2)',
                    }}>
                      <span style={{ 
                        color: hecho ? escena.color : activo ? '#fff' : 'transparent',
                        fontFamily: 'monospace', fontSize: 13, minWidth: 16,
                        animation: actual ? 'pro-pulse-glow 1s infinite' : 'none'
                      }}>
                        {hecho ? '✓' : '>'}
                      </span>
                      <span style={{ 
                        fontSize: 13, 
                        fontWeight: actual ? 700 : 500,
                        color: actual ? '#fff' : (hecho ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)'),
                        fontFamily: 'var(--font-jakarta)'
                      }}>
                        {p}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {listo && (
            <div style={{ ...S.bajada, color: escena.color, fontWeight: 700, marginTop: 24, animation: 'pro-float 2s infinite' }}>
              Entrando al panel…
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const S = {
  capa: {
    position: 'fixed', inset: 0, zIndex: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    background: '#040302',
    color: '#fff',
  },
  gridBg: {
    position: 'absolute', inset: 0, opacity: 0.08,
    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  centro: {
    width: '100%', maxWidth: 360,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
    position: 'relative',
    zIndex: 2,
  },

  escena: {
    position: 'relative', width: 140, height: 140,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  glow: {
    position: 'absolute', inset: 0,
    borderRadius: '50%',
    filter: 'blur(40px)',
    opacity: 0.5,
    zIndex: 0,
  },
  ringContainer: {
    position: 'relative', width: 110, height: 110,
    zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.02)',
    boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  },
  // El anillo giratorio estilo Vercel / Stripe usando conic-gradient
  ringConic: {
    position: 'absolute', inset: -2, borderRadius: '50%',
    maskImage: 'radial-gradient(transparent 52px, black 53px)',
    WebkitMaskImage: 'radial-gradient(transparent 52px, black 53px)',
  },
  centerIcon: {
    fontSize: 42,
    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
    zIndex: 2,
  },

  titulo: {
    margin: '24px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 26, letterSpacing: '-.03em', color: '#fff',
  },
  bajada: {
    margin: '8px 0 0', fontSize: 15, lineHeight: 1.5,
    color: 'rgba(255,255,255,.5)',
  },

  pasosCaja: {
    width: '100%', marginTop: 36,
    padding: '24px',
    background: 'rgba(20, 20, 20, 0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  pasos: {
    listStyle: 'none', margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column', gap: 14,
    width: '100%', textAlign: 'left',
  },
  paso: {
    transition: 'opacity .3s ease',
  },
  terminalLine: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.03)',
    transition: 'all .4s cubic-bezier(.2,0,0,1)',
  }
};
