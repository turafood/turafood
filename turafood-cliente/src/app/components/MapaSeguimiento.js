'use client';

/**
 * MAPA DE SEGUIMIENTO (datos reales)
 *
 * Muestra solo lo que de verdad se sabe:
 *   · el destino de entrega (la dirección que el cliente guardó),
 *   · el negocio, si tiene ubicación,
 *   · el repartidor, mientras publica su posición.
 *
 * Antes este mapa dibujaba una ruta de demostración fija: el "restaurante" y
 * la "casa" eran los dos extremos de esa ruta (no sus direcciones), y la moto
 * se movía según el estado del pedido, con un nombre inventado en el tooltip.
 *
 * Si todavía no hay repartidor, el mapa muestra el destino. Cuando aparece, el
 * marcador se mueve solo con cada posición nueva (sin reconstruir el mapa).
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

const CENTRO = [3.8801, -77.0312];

function icono(L, fondo, glifo, grande = false) {
  const t = grande ? 38 : 32;
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${grande ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${fondo};opacity:.35;animation:pulseGlow 1.8s infinite;"></div>` : ''}
        <div style="width:${t}px;height:${t}px;border-radius:50%;background:${fondo};border:2.5px solid #fff;box-shadow:0 6px 18px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:#fff;">
          <span class="ms" style="font-size:${grande ? 20 : 17}px;line-height:1;">${glifo}</span>
        </div>
      </div>`,
    iconSize: [t, t],
    iconAnchor: [t / 2, t / 2],
  });
}

const MapaSeguimiento = forwardRef(function MapaSeguimiento({ destino, negocio, repartidor, etiquetaDestino, etiquetaNegocio }, ref) {
  const el = useRef(null);
  const mapa = useRef(null);
  const LRef = useRef(null);
  const marcas = useRef({});
  const linea = useRef(null);
  const encuadreDe = useRef('');

  const sincronizar = useCallback(() => {
    const L = LRef.current;
    const m = mapa.current;
    if (!L || !m) return;

    const poner = (clave, punto, fondo, glifo, tip, grande = false) => {
      if (!punto || !Number.isFinite(punto.lat) || !Number.isFinite(punto.lng)) {
        if (marcas.current[clave]) { m.removeLayer(marcas.current[clave]); delete marcas.current[clave]; }
        return;
      }
      const ll = [punto.lat, punto.lng];
      if (marcas.current[clave]) {
        marcas.current[clave].setLatLng(ll);
      } else {
        marcas.current[clave] = L.marker(ll, { icon: icono(L, fondo, glifo, grande), zIndexOffset: grande ? 800 : 0 })
          .bindTooltip(tip, { direction: 'top' })
          .addTo(m);
      }
      if (tip) marcas.current[clave].setTooltipContent(tip);
    };

    poner('destino', destino, '#10B981', 'home', etiquetaDestino || 'Tu dirección');
    poner('negocio', negocio, '#1E293B', 'storefront', etiquetaNegocio || 'El negocio');
    poner('repartidor', repartidor, 'var(--primary)', 'two_wheeler', 'Tu repartidor', true);

    // Línea punteada del repartidor (o del negocio) hacia el destino: solo guía visual
    const origen = repartidor ?? negocio;
    if (linea.current) { m.removeLayer(linea.current); linea.current = null; }
    if (origen && destino) {
      linea.current = L.polyline([[origen.lat, origen.lng], [destino.lat, destino.lng]], {
        color: 'var(--primary)', weight: 3.5, opacity: 0.8, dashArray: '8, 8', lineCap: 'round',
      }).addTo(m);
    }

    // Encuadre: solo cuando cambia QUÉ puntos hay (no con cada posición del repartidor)
    const puntos = [destino, negocio, repartidor].filter((p) => p && Number.isFinite(p.lat));
    const clave = [destino ? 'd' : '', negocio ? 'n' : '', repartidor ? 'r' : ''].join('');
    if (puntos.length === 0) {
      if (encuadreDe.current !== 'vacio') { m.setView(CENTRO, 14); encuadreDe.current = 'vacio'; }
    } else if (clave !== encuadreDe.current) {
      encuadreDe.current = clave;
      if (puntos.length === 1) m.setView([puntos[0].lat, puntos[0].lng], 16);
      else m.fitBounds(L.latLngBounds(puntos.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    } else if (repartidor && !m.getBounds().contains([repartidor.lat, repartidor.lng])) {
      m.panTo([repartidor.lat, repartidor.lng]);   // se salió de la vista: seguirlo
    }
  }, [destino, negocio, repartidor, etiquetaDestino, etiquetaNegocio]);

  useEffect(() => {
    let vivo = true;
    let temporizador;
    (async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
      if (!vivo || !el.current || mapa.current) return;
      const m = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(m);
      m.setView(CENTRO, 14);
      mapa.current = m;
      sincronizar();
      temporizador = setTimeout(() => { if (mapa.current === m) m.invalidateSize(); }, 200);
    })();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      mapa.current?.remove();
      mapa.current = null; marcas.current = {}; linea.current = null; encuadreDe.current = '';
    };
    // el mapa se crea una sola vez; los datos se aplican en el efecto de abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sincronizar(); }, [sincronizar]);

  useImperativeHandle(ref, () => ({
    /** Centra en el repartidor si hay posición; si no, en el destino */
    centrar() {
      const m = mapa.current;
      const p = repartidor ?? destino ?? negocio;
      if (m && p) m.setView([p.lat, p.lng], 16, { animate: true });
    },
  }), [repartidor, destino, negocio]);

  return <div ref={el} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />;
});

export default MapaSeguimiento;
