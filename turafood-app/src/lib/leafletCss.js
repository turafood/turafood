'use client';

/**
 * LA HOJA DE LEAFLET, SOLO DONDE HAY MAPA
 *
 * Estaba en el layout global: se descargaba en todas las pantallas de
 * las tres apps, desde un tercero (unpkg), y bloqueaba el primer
 * pintado con su propio DNS y su propio apretón TLS. La consola de
 * administración ni siquiera usa mapas.
 *
 * Ahora la pide el componente del mapa cuando se monta. Se inserta una
 * sola vez aunque haya varios mapas en pantalla.
 */

const URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

export function cargarLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${URL}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = URL;
  document.head.appendChild(link);
}
