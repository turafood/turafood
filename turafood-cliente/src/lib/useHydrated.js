'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve `true` solo después de montar en el navegador.
 *
 * Sirve para todo lo que dependa de `localStorage`: el carrito y los
 * favoritos se guardan ahí, así que el servidor renderiza sin ellos y
 * el cliente con ellos. Sin esta guarda React detecta que el HTML no
 * coincide y descarta el árbol ("Hydration failed").
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
