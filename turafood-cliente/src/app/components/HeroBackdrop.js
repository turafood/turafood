'use client';

/**
 * FONDO CINEMATOGRÁFICO CON CRUCE DE IMÁGENES
 *
 * Dos capas superpuestas: una visible y una que entra. Cada cierto
 * tiempo se intercambian con una transición de opacidad larga, así el
 * cambio se siente como respiración y no como un pase de diapositivas.
 *
 * Las fotos son las locales ya optimizadas (`public/images`), no una
 * URL de terceros: cargan rápido, funcionan sin internet abierto y
 * nadie las puede cambiar por fuera.
 *
 * Respeta "reducir movimiento": si el sistema lo pide, se queda quieta
 * en la primera imagen.
 */

import { useEffect, useState } from 'react';

const DEFAULT_IMAGES = [
  '/images/steak-ribeye.jpg',
  '/images/burger-hero.jpg',
  '/images/food-fork.jpg',
  '/images/lamb-chops.jpg',
  '/images/steak-fork.jpg',
];

export default function HeroBackdrop({
  images = DEFAULT_IMAGES,
  interval = 6000,
  brightness = 0.38,
}) {
  const [index, setIndex] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setStill(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Precarga la siguiente: si no, el cruce muestra un hueco negro
  useEffect(() => {
    if (still || images.length < 2) return;
    const next = new Image();
    next.src = images[(index + 1) % images.length];
  }, [index, images, still]);

  useEffect(() => {
    if (still || images.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % images.length), interval);
    return () => clearInterval(id);
  }, [images.length, interval, still]);

  return (
    <div aria-hidden="true" style={S.wrap}>
      {images.map((src, i) => (
        <div
          key={src}
          style={{
            ...S.layer,
            backgroundImage: `url('${src}')`,
            filter: `brightness(${brightness}) contrast(1.12) saturate(1.15)`,
            opacity: i === index ? 1 : 0,
            // Un zoom lentísimo en la capa visible da sensación de vida
            transform: i === index && !still ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      ))}

      {/* Degradado para que el texto siempre tenga contraste */}
      <div style={S.veil} />
      {/* Halo cálido de la marca */}
      <div style={S.glow} />
    </div>
  );
}

const S = {
  wrap: { position: 'absolute', inset: 0, overflow: 'hidden', background: '#080706' },
  layer: {
    position: 'absolute',
    inset: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'opacity 1.6s ease-in-out, transform 7s ease-out',
    willChange: 'opacity, transform',
  },
  veil: {
    position: 'absolute',
    inset: 0,
    background:
      'linear-gradient(180deg, rgba(8,7,6,.55) 0%, rgba(8,7,6,.35) 38%, rgba(8,7,6,.82) 100%)',
  },
  glow: {
    position: 'absolute',
    left: '50%',
    top: '46%',
    transform: 'translate(-50%,-50%)',
    width: 620,
    height: 620,
    maxWidth: '140%',
    background: 'radial-gradient(circle, rgba(255,68,31,.20) 0%, transparent 62%)',
    filter: 'blur(50px)',
    pointerEvents: 'none',
  },
};
