'use client';

/**
 * TRAER EL CARRITO GUARDADO, DESPUÉS DE HIDRATAR
 *
 * Va de la mano con `skipHydration` en el store: el primer render
 * tiene que ser idéntico al del servidor —carrito vacío— o React
 * descarta todo el HTML que llegó y lo vuelve a pintar en el celular.
 *
 * Acá, ya hidratado, se lee el localStorage y el carrito aparece. Es
 * un frame de diferencia: nadie lo nota, y a cambio la página no se
 * repinta entera.
 */

import { useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';

export default function RehidratarCarrito() {
  useEffect(() => {
    useCartStore.persist.rehydrate();
  }, []);

  return null;
}
