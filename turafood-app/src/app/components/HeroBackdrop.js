'use client';

/**
 * FONDO PRO MINIMALISTA (APP-LIKE)
 *
 * Se eliminaron las fotos pesadas de fondo. En su lugar, usamos una
 * base oscura pura con un orbe brillante que respira (escala y opacidad)
 * de forma extremadamente fluida con CSS.
 *
 * Carga en 0ms, no consume red, elimina la sensación de "página web"
 * y le da un toque premium estilo Vercel / Linear / Apple.
 */

import { useEffect, useState } from 'react';

export default function HeroBackdrop({
  brightness = 0.38,
}) {
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div aria-hidden="true" style={S.wrap}>
      {/* Fondo ultra-oscuro base */}
      <div style={S.base} />

      {/* Orbe principal animado (brillo sutil) */}
      <div 
        style={{
          ...S.orb,
          opacity: brightness * 1.5,
          animation: still ? 'none' : 'orbPulse 8s ease-in-out infinite alternate',
        }} 
      />

      {/* Malla sutil (opcional, para dar textura "glass") */}
      <div style={S.noise} />
      
      {/* Estilos de animación globales inyectados */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes orbPulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: ${brightness}; }
          100% { transform: translate(-50%, -50%) scale(1.15); opacity: ${brightness * 1.8}; }
        }
      `}} />
    </div>
  );
}

const S = {
  wrap: { 
    position: 'absolute', inset: 0, overflow: 'hidden', 
    background: '#040302' 
  },
  base: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(circle at 50% 0%, rgba(20,15,12,1) 0%, rgba(4,3,2,1) 100%)',
  },
  orb: {
    position: 'absolute',
    left: '50%',
    top: '30%',
    transform: 'translate(-50%,-50%)',
    width: '120vw',
    height: '120vw',
    maxWidth: 900,
    maxHeight: 900,
    background: 'radial-gradient(circle, rgba(255,68,31,.18) 0%, rgba(255,68,31,.04) 40%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
    willChange: 'transform, opacity',
  },
  noise: {
    position: 'absolute', inset: 0,
    background: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%220.03%22/%3E%3C/svg%3E")',
    pointerEvents: 'none',
    opacity: 0.6,
  }
};
