'use client';

/**
 * IMÁGENES OPTIMIZADAS
 *
 * Las fotos originales del proyecto pesan entre 9 y 20 MB cada una
 * (burger.jpg son 20 MB). Cargadas como `background-image` viajan
 * completas al celular: el home llegaba a ~66 MB en una sola pantalla,
 * lo que en datos móviles se ve como una app rota.
 *
 * `next/image` las redimensiona al tamaño real de la tarjeta, las
 * convierte a WebP y las carga en diferido. Los archivos originales no
 * se tocan: la optimización ocurre al servir.
 *
 * `Cover`  → foto que rellena su contenedor (object-fit: cover)
 * `Icon3D` → icono 3D que se ve completo (object-fit: contain)
 */

import Image from 'next/image';

export function Cover({
  src,
  alt = '',
  radius = 0,
  sizes = '(max-width: 900px) 50vw, 320px',
  priority = false,
  style,
  children,
}) {
  // Fallback visual si el negocio no tiene foto cargada
  const fallback = '/images/steak-ribeye.jpg';
  const imgSrc = src || fallback;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        background: 'var(--surface2)',
        ...style,
      }}
    >
      {imgSrc && (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          style={{ objectFit: 'cover' }}
        />
      )}
      {children}
    </div>
  );
}

export function Icon3D({ src, alt = '', sizes = '120px', style }) {
  return (
    <span style={{ position: 'absolute', ...style }}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: 'contain' }}
      />
    </span>
  );
}
