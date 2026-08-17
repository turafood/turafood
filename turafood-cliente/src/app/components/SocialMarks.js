'use client';

/**
 * Logotipos de los proveedores de acceso.
 *
 * Van como SVG en línea, no como imagen remota: son marcas registradas
 * cuyos colores no se pueden alterar, y así no dependemos de un CDN
 * externo para que el botón se vea completo.
 */

export function GoogleMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 010-24c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0024 4a20 20 0 100 40c11 0 19.5-8 19.5-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0124 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7A19.9 19.9 0 0024 4 20 20 0 006.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0124 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5A20 20 0 0024 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2C39.9 35.9 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function FacebookMark({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill={color}
        d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z"
      />
    </svg>
  );
}

export function AppleMark({ size = 18, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill={color}
        d="M16.36 12.72c.02 2.6 2.28 3.46 2.3 3.47-.02.06-.36 1.24-1.19 2.45-.72 1.05-1.47 2.1-2.65 2.12-1.16.02-1.53-.69-2.86-.69-1.32 0-1.74.67-2.83.71-1.14.04-2-1.13-2.73-2.18-1.49-2.15-2.63-6.08-1.1-8.73.76-1.32 2.11-2.15 3.58-2.17 1.11-.02 2.17.75 2.85.75.68 0 1.96-.93 3.31-.79.56.02 2.14.23 3.15 1.71-.08.05-1.88 1.1-1.86 3.29M14.2 4.6c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.68.97.07 1.96-.49 2.56-1.23"
      />
    </svg>
  );
}
