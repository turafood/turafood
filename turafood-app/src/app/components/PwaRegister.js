'use client';

import { useEffect } from 'react';

/**
 * Registra el service worker al abrir la app. Es lo que la hace instalable
 * ("Añadir a pantalla de inicio") y lo que permite recibir push.
 * Solo en producción: en desarrollo un service worker se queda con versiones
 * viejas de los archivos y confunde.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const registrar = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') registrar();
    else window.addEventListener('load', registrar, { once: true });
  }, []);

  return null;
}
