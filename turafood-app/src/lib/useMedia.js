'use client';

import { useEffect, useState } from 'react';

/**
 * `true` cuando la consulta CSS se cumple. Arranca en `false` para que
 * el HTML del servidor y el del primer render del navegador coincidan;
 * el valor real llega en el efecto.
 */
export function useMedia(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return matches;
}

/** El corte que usa el mockup para pasar a la vista de celular */
export const useIsMobile = () => useMedia('(max-width: 899px)');

/** `true` después de la hidratación. Para leer localStorage sin desajustes. */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
