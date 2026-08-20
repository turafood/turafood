'use client';

/**
 * HEADER HERO (Slider Pequeño pero Ancho)
 * 
 * Componente universal para dar un look premium a todas las secciones.
 * Reemplaza las cajas sólidas o textos planos con un slider de fotos
 * de alta calidad en el fondo (overlay black) y copy persuasivo.
 */

import { useState, useEffect } from 'react';

const S = {
  container: {
    position: 'relative',
    width: '100%',
    height: 140, // Pequeño pero ancho
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    marginBottom: 24,
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
  },
  slider: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
  },
  slide: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 2s ease-in-out',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 100%)',
    zIndex: 2,
  },
  content: {
    position: 'relative',
    zIndex: 3,
    color: '#fff',
    maxWidth: 600,
  },
  title: {
    fontFamily: 'var(--font-bricolage)',
    fontSize: 26,
    fontWeight: 800,
    margin: 0,
    letterSpacing: '-0.02em',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    margin: '6px 0 0',
    lineHeight: 1.5,
  }
};

export default function HeaderHero({ title, subtitle, images = [] }) {
  const [current, setCurrent] = useState(0);

  // Imágenes por defecto si no se pasan
  const bgImages = images.length > 0 ? images : [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=1200&auto=format&fit=crop'
  ];

  useEffect(() => {
    if (bgImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bgImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [bgImages.length]);

  return (
    <div style={S.container}>
      <div style={S.slider}>
        {bgImages.map((img, index) => (
          <div
            key={index}
            style={{
              ...S.slide,
              backgroundImage: `url(${img})`,
              opacity: current === index ? 1 : 0,
            }}
          />
        ))}
      </div>
      <div style={S.overlay} />
      <div style={S.content}>
        <h1 style={S.title}>{title}</h1>
        <p style={S.subtitle}>{subtitle}</p>
      </div>
    </div>
  );
}
