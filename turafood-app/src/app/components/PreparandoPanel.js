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
  comidas_rapidas: { icon: 'fastfood',         titulo: 'Preparando tu espacio',    color: '#FFB020' },
  farmacia:        { icon: 'local_pharmacy',   titulo: 'Organizando inventario',   color: '#4A90E2' },
  licores:         { icon: 'sports_bar',       titulo: 'Alistando tu catálogo',    color: '#9B6BE8' },
  turbo:           { icon: 'bolt',             titulo: 'Alistando entregas',       color: '#D97706' },
  turapp:          { icon: 'apps',             titulo: 'Configurando servicios',   color: '#15803D' },
  repartidor:      { icon: 'two_wheeler',      titulo: 'Preparando tu ruta',       color: '#25D366' },
};

const POR_DEFECTO = { icon: 'auto_awesome', titulo: 'Armando tu panel', color: '#FF7A4D' };

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
          <p style={S.bajada}>Afinando cada detalle para ti.</p>

          {/* ---------------------------------------- Los pasos */}
          <ol style={S.pasos}>
            {pasos.map((p, n) => {
              const hecho = n < visto;
              const actual = n === visto;
              return (
                <li key={p} style={{ ...S.paso, opacity: hecho || actual ? 1 : 0.25 }}>
                  <span
                    style={{
                      ...S.marca,
                      background: hecho ? escena.color : (actual ? 'rgba(255,255,255,0.1)' : 'transparent'),
                      borderColor: actual ? escena.color : 'transparent',
                      boxShadow: actual ? `0 0 12px ${escena.color}66` : 'none',
                    }}
                  >
                    {hecho && <span className="ms" style={{ fontSize: 13, color: '#fff' }}>check</span>}
                    {actual && <span style={{ width: 6, height: 6, borderRadius: '50%', background: escena.color }} />}
                  </span>
                  <span style={{ fontWeight: actual ? 700 : 500, color: actual ? '#fff' : 'rgba(255,255,255,0.85)' }}>{p}</span>
                </li>
              );
            })}
          </ol>

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
    background: '#080706', // Fondo súper oscuro, muy Apple
    color: '#fff',
  },
  centro: {
    width: '100%', maxWidth: 340,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
  },

  escena: {
    position: 'relative', width: 140, height: 140,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  glow: {
    position: 'absolute', inset: 10,
    borderRadius: '50%',
    filter: 'blur(35px)',
    zIndex: 0,
  },
  ringContainer: {
    position: 'relative', width: '100%', height: '100%',
    zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  ringSvg: {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    overflow: 'visible',
  },
  centerIcon: {
    fontSize: 48,
    textShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },

  titulo: {
    margin: '18px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.03em',
  },
  bajada: {
    margin: '6px 0 0', fontSize: 14, lineHeight: 1.5,
    color: 'rgba(255,255,255,.5)',
  },

  pasos: {
    listStyle: 'none', margin: '32px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 14,
    width: '100%', textAlign: 'left',
  },
  paso: {
    display: 'flex', alignItems: 'center', gap: 14,
    fontSize: 14.5, transition: 'all .4s cubic-bezier(.2,0,0,1)',
  },
  marca: {
    width: 24, height: 24, borderRadius: '50%', flex: 'none',
    border: '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .4s cubic-bezier(.2,0,0,1)',
  },
};
