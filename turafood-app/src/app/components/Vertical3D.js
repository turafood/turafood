'use client';

/**
 * ICONOS 3D POR VERTICAL
 *
 * Son los mismos `ic-*.png` del mockup. Se usan en los estados vacíos y
 * como respaldo de foto de producto: un icono 3D se ve intencional,
 * mientras que un recuadro gris se ve roto.
 */

import Image from 'next/image';

export const VERTICAL_ICON = {
  restaurant: '/images/ic-restaurantes.png',
  market: '/images/ic-mercado.png',
  pharmacy: '/images/ic-farmacia.png',
  liquor: '/images/ic-licores.png',
  store: '/images/ic-tiendas.png',
  turbo: '/images/ic-turbo.png',
  boat: '/images/ic-viajes.png',
};

/** Tinte de fondo que acompaña a cada icono */
export const VERTICAL_TINT = {
  restaurant: '#FFF1EC',
  market: '#E9F7EF',
  pharmacy: '#EAF1FF',
  liquor: '#F3ECFF',
  store: '#FFF7E6',
  turbo: '#FFF1EC',
  boat: '#E9F5FF',
};

export default function Vertical3D({ vertical = 'restaurant', size = 64, alt = '' }) {
  return (
    <Image
      src={VERTICAL_ICON[vertical] ?? VERTICAL_ICON.restaurant}
      alt={alt}
      width={size}
      height={size}
      style={{ objectFit: 'contain', filter: 'drop-shadow(0 6px 14px rgba(20,16,10,.16))' }}
    />
  );
}

/**
 * Miniatura de producto. Si el negocio todavía no subió foto, en vez de
 * un hueco gris se muestra el icono 3D de su vertical sobre su tinte.
 */
export function ProductThumb({ src, vertical = 'restaurant', size = 44, radius = 12, alt = '' }) {
  if (src) {
    return (
      <span
        style={{
          width: size, height: size, borderRadius: radius, flex: 'none', display: 'block',
          backgroundImage: `url('${src}')`, backgroundSize: 'cover', backgroundPosition: 'center',
        }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <span
      style={{
        width: size, height: size, borderRadius: radius, flex: 'none',
        background: VERTICAL_TINT[vertical] ?? VERTICAL_TINT.restaurant,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
      role="img"
      aria-label={alt || 'Sin foto'}
    >
      <Image
        src={VERTICAL_ICON[vertical] ?? VERTICAL_ICON.restaurant}
        alt=""
        width={Math.round(size * 0.72)}
        height={Math.round(size * 0.72)}
        style={{ objectFit: 'contain' }}
      />
    </span>
  );
}
