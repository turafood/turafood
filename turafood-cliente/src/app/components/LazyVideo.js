'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * VIDEO QUE SOLO SE DESCARGA CUANDO SE VE
 *
 * Un <video autoPlay> baja su archivo apenas la página carga, aunque esté
 * debajo de la pantalla o escondido por CSS (la versión de escritorio del
 * hero seguía descargando en el celular). Aquí el <video> no existe hasta
 * que el contenedor entra en pantalla, y no se carga nunca si el usuario
 * tiene activado el ahorro de datos o prefiere menos movimiento.
 *
 * El contenedor ocupa el 100% de su padre, igual que el video que
 * reemplaza, así que el diseño no cambia.
 */
export default function LazyVideo({ src, style, ...rest }) {
  const caja = useRef(null);
  const [cargar, setCargar] = useState(false);

  useEffect(() => {
    const el = caja.current;
    if (!el) return;

    const ahorro = navigator.connection?.saveData === true;
    const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (ahorro || menosMovimiento) return;

    if (!('IntersectionObserver' in window)) {
      setCargar(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setCargar(true);
          io.disconnect();
        }
      },
      { rootMargin: '150px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={caja} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {cargar && (
        <video src={src} autoPlay loop muted playsInline style={style} {...rest} />
      )}
    </div>
  );
}
