'use client';

/**
 * MAPA COMPARTIDO (Leaflet + teselas de CARTO)
 *
 * Mismo montaje que el mockup: `L.map`, capa `light_all` y pines con la
 * clase `.tura-pin`. Leaflet llega por CDN igual que en la app de
 * cliente, así no engorda el bundle.
 *
 * Props:
 *   points  [{ lat, lng, color, label, badge }]
 *   route   [[lat,lng], ...]  línea del recorrido
 *   progress 0..1             cuánto del recorrido va hecho
 *   circles  boolean          dibuja el radio de cobertura de cada punto
 */

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { cargarLeafletCss } from '@/lib/leafletCss';

/** Centro de Buenaventura, por si no hay puntos que encuadrar */
const FALLBACK = [3.8801, -77.0313];

export default function TuraMap({
  points = [], route = null, progress = 0, circles = false,
  height = 260, radius = 18, interactive = true,
}) {
  const holder = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const done = useRef(null);
  const [ready, setReady] = useState(false);

  // Montaje
  useEffect(() => {
    cargarLeafletCss();
    if (!ready || !holder.current || map.current) return undefined;
    const L = window.L;
    if (!L) return undefined;

    const m = L.map(holder.current, {
      zoomControl: interactive,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: interactive,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }).addTo(m);

    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    m.setView(FALLBACK, 13);
    setTimeout(() => m.invalidateSize(), 120);

    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
      done.current = null;
    };
  }, [ready, interactive]);

  // Dibujo
  useEffect(() => {
    const m = map.current;
    const L = window.L;
    if (!m || !L || !layer.current) return;

    layer.current.clearLayers();
    done.current = null;

    const pin = (color, size, inner) => L.divIcon({
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: `<div class="tura-pin" style="width:${size}px;height:${size}px;background:${color};border:3px solid #fff;font:800 11px 'Plus Jakarta Sans',sans-serif;color:#fff">${inner ?? ''}</div>`,
    });

    if (route && route.length > 1) {
      L.polyline(route, { color: '#D8D3CB', weight: 5, opacity: 1, lineCap: 'round' })
        .addTo(layer.current);
      done.current = L.polyline([route[0]], { color: '#FF441F', weight: 5, opacity: .95, lineCap: 'round' })
        .addTo(layer.current);
    }

    points.forEach((p) => {
      const color = p.color ?? '#FF441F';
      if (circles) {
        L.circle([p.lat, p.lng], {
          radius: 900, color, weight: 1.5, fillColor: color, fillOpacity: .1, opacity: .6,
        }).addTo(layer.current);
      }
      const marker = L.marker([p.lat, p.lng], { icon: pin(color, p.badge ? 26 : 16, p.badge) })
        .addTo(layer.current);
      if (p.label) marker.bindPopup(p.label);
    });

    const all = [
      ...points.map((p) => [p.lat, p.lng]),
      ...(route ?? []),
    ];
    if (all.length === 1) m.setView(all[0], 15);
    else if (all.length > 1) m.fitBounds(L.latLngBounds(all).pad(0.3));

    setTimeout(() => m.invalidateSize(), 80);
  }, [points, route, circles, ready]);

  // Avance del recorrido
  useEffect(() => {
    const line = done.current;
    if (!line || !route || route.length < 2) return;
    const at = pointAt(route, progress);
    line.setLatLngs(route.slice(0, at.index + 1).concat([at.point]));
  }, [progress, route]);

  return (
    <>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div
        ref={holder}
        style={{
          height, borderRadius: radius, overflow: 'hidden', background: '#EDEBE6',
        }}
      />
    </>
  );
}

/** Punto del recorrido en la fracción `t` (0..1) */
export function pointAt(path, t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const d = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segs.push(d);
    total += d;
  }
  let left = Math.max(0, Math.min(1, t)) * total;
  let i = 0;
  while (i < segs.length && left > segs[i]) { left -= segs[i]; i += 1; }
  if (i >= segs.length) return { point: path[path.length - 1], index: path.length - 1 };
  const f = segs[i] ? left / segs[i] : 0;
  return {
    point: [
      path[i][0] + (path[i + 1][0] - path[i][0]) * f,
      path[i][1] + (path[i + 1][1] - path[i][1]) * f,
    ],
    index: i,
  };
}
