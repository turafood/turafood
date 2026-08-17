'use client';

/**
 * ¿Hay una hoja abierta encima?
 *
 * La barra inferior y el carrito flotante viven fijos abajo; las hojas
 * (dirección, pago, horario) suben desde abajo. Se pisaban justo sobre
 * los campos que hay que llenar: la persona tocaba "Torre, apartamento
 * o referencia" y le salía la canasta.
 *
 * En vez de que cada hoja avise —y que la próxima que alguien escriba
 * se olvide de hacerlo— se mira el DOM. Todas usan `role="dialog"`
 * porque es lo que corresponde para accesibilidad, así que la señal ya
 * existía; solo había que leerla.
 */

import { useEffect, useState } from 'react';

export function useDialogOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setOpen(document.querySelector('[role="dialog"]') !== null);
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return open;
}
