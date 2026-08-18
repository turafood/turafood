'use client';

/**
 * ¿Hay una hoja o panel abierto encima?
 *
 * El botón flotante de Tura IA y la barra inferior viven fijos abajo;
 * las hojas (el ticket de un pedido, los asistentes) se abren encima.
 * Quedaban en el mismo nivel de apilamiento y el botón se pintaba
 * después, así que terminaba tapando justo la esquina de la hoja.
 *
 * En vez de que cada hoja se acuerde de avisar —y que la próxima que
 * alguien escriba se olvide— se mira el DOM. Todas usan `role="dialog"`
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
