'use client';

/**
 * SEGUIMIENTO DEL PEDIDO
 * Conversión 1:1 de `isTracking` (línea 1051) del mockup del cliente.
 *
 * El mapa es Leaflet con la ruta real de Buenaventura que trae el
 * mockup (`BVA.route`). Cuando hay Supabase, el estado del pedido se
 * actualiza solo por Realtime (`subscribeToOrder`).
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { getOrder, subscribeToOrder } from '@/lib/data';
import { BUENAVENTURA } from '@/lib/seed';
import { ORDER_STATUS } from '@/lib/format';
import RouteSkeleton from '../components/RouteSkeleton';
import { cargarLeafletCss } from '@/lib/leafletCss';
/** Los cuatro pasos que dibuja la barra de progreso del diseño */
const STEPS = ['accepted', 'preparing', 'picked_up', 'delivered'];

const STEP_INDEX = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 2,
  courier_assigned: 2,
  picked_up: 3,
  delivering: 3,
  delivered: 4,
};

export default function TrackingPageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={3} height={140} />}>
      <TrackingPage />
    </Suspense>
  );
}

function TrackingPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order');

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const mapEl = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    cargarLeafletCss();
    let alive = true;
    let unsubscribe = () => {};

    (async () => {
      try {
        const data = await getOrder(orderId);
        if (!alive) return;
        if (!data) {
          setError('No encontramos este pedido.');
          return;
        }
        setOrder(data);
        unsubscribe = subscribeToOrder(data.id, (updated) => {
          setOrder((prev) => ({ ...prev, ...updated }));
        });
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();

    return () => { alive = false; unsubscribe(); };
  }, [orderId]);

  // Dibuja la ruta una vez que Leaflet cargó y el pedido existe
  useEffect(() => {
    if (!leafletReady || !mapEl.current || mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(mapEl.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const route = BUENAVENTURA.route;
    const line = L.polyline(route, { color: '#FF441F', weight: 4, opacity: .95 }).addTo(map);

    // Origen (negocio), repartidor y destino
    const pin = (color, icon) => L.divIcon({
      className: '',
      html: `<span class="tura-pin" style="width:26px;height:26px;background:${color}">
               <span class="material-symbols-rounded" style="font-size:15px;color:#fff">${icon}</span>
             </span>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });

    L.marker(route[0], { icon: pin('#17140F', 'storefront') }).addTo(map);
    L.marker(route[3], { icon: pin('#FF441F', 'two_wheeler') }).addTo(map);
    L.marker(route[route.length - 1], { icon: pin('#11B26A', 'home') }).addTo(map);

    map.fitBounds(line.getBounds(), { padding: [34, 34] });

    return () => { map.remove(); mapRef.current = null; };
  }, [leafletReady, order]);

  if (error) {
    return (
      <>
        <div style={S.errorScreen}>
          <span className="ms" style={{ fontSize: 40, color: 'var(--faint)' }}>local_shipping</span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 12 }}>
            No pudimos abrir el seguimiento
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>{error}</div>
          <button onClick={() => router.push('/account/orders')} style={S.errorBtn}>Ver mis pedidos</button>
        </div>
      </>
    );
  }

  const step = STEP_INDEX[order?.status] ?? 0;
  const status = ORDER_STATUS[order?.status] ?? ORDER_STATUS.pending;

  const log = [
    { icon: 'check', title: 'Pedido confirmado', at: order?.created_at, done: step >= 1 },
    { icon: 'restaurant', title: 'El restaurante está preparando', at: order?.accepted_at, done: step >= 2 },
    { icon: 'two_wheeler', title: 'Tu pedido va en camino', at: order?.picked_up_at, done: step >= 3 },
    { icon: 'home', title: `Entregado en ${order?.delivery_address ?? 'tu dirección'}`, at: order?.delivered_at, done: step >= 4 },
  ];

  const hhmm = (iso) => (iso
    ? new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'Estimado');

  return (
    <>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onLoad={() => setLeafletReady(true)}
      />

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        {/* Mapa */}
        <div style={{ position: 'relative', flex: 'none', height: 270, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />
          <button onClick={() => router.push('/home')} style={S.mapBack} aria-label="Volver al inicio">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={S.livePill}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            EN VIVO
          </div>
        </div>

        {/* Hoja */}
        <div className="sc" style={S.sheet}>
          <div style={{ width: 42, height: 4, borderRadius: 99, background: 'var(--faint)', margin: '0 auto 16px' }} />

          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em' }}>
            PEDIDO #{order?.order_number ?? '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', marginTop: 5 }}>
            {status.label === 'En camino' ? 'Tu pedido va en camino' : status.label}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 5 }}>
            {order?.business?.name ?? ''}
          </div>

          {/* Progreso */}
          <div style={{ display: 'flex', gap: 7, marginTop: 18 }}>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  flex: 1, height: 6, borderRadius: 99,
                  background: i < step ? 'var(--primary)' : 'var(--surface2)',
                }}
              />
            ))}
          </div>

          {/* Repartidor */}
          <div style={S.courierCard}>
            <div style={S.avatar}>
              <span className="ms" style={{ fontSize: 26, color: 'var(--muted)' }}>person</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Yeison Mosquera</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Moto · Placa WQR-18C</div>
            </div>
            <button onClick={() => router.push(`/chat?order=${order?.id ?? ''}`)} style={S.chatBtn} aria-label="Escribir al repartidor">
              <span className="ms" style={{ fontSize: 20 }}>chat_bubble</span>
              <span style={S.unread}>2</span>
            </button>
            <button style={S.callBtn} aria-label="Llamar al repartidor">
              <span className="ms" style={{ fontSize: 20, color: '#fff' }}>call</span>
            </button>
          </div>

          {/* Código de entrega */}
          <div style={S.codeCard}>
            <span className="ms" style={{ fontSize: 22, color: 'var(--amber)', flex: 'none' }}>password</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.55)' }}>
                CÓDIGO DE ENTREGA
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>
                Dáselo al repartidor al recibir
              </span>
            </span>
            <span style={{ display: 'flex', gap: 6, flex: 'none' }}>
              {['4', '8', '2', '1'].map((d, i) => (
                <span key={i} style={S.codeDigit}>{d}</span>
              ))}
            </span>
          </div>

          {/* Bitácora */}
          <div style={{ marginTop: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {log.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{
                    ...S.logDot,
                    background: l.done ? 'var(--green)' : 'var(--surface2)',
                    color: l.done ? '#fff' : 'var(--faint)',
                  }}>
                    <span className="ms" style={{ fontSize: 16 }}>{l.icon}</span>
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{
                      display: 'block', fontWeight: 700, fontSize: 13.5,
                      color: l.done ? 'var(--text)' : 'var(--muted)',
                    }}>
                      {l.title}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {hhmm(l.at)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => router.push('/help')} style={S.helpBtn}>
            <span className="ms" style={{ fontSize: 19 }}>headset_mic</span>
            Necesito ayuda con este pedido
          </button>
          <button onClick={() => router.push(`/rate?order=${order?.id ?? ''}`)} style={S.rateBtn}>
            <span className="ms" style={{ fontSize: 19 }}>star</span>
            Ya lo recibí, calificar
          </button>
        </div>
      </div>
    </>
  );
}

const S = {
  mapBack: {
    position: 'absolute', top: 8, left: 16, width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(255,255,255,.95)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', boxShadow: 'var(--shadowSm)', zIndex: 500,
  },
  livePill: {
    position: 'absolute', top: 8, right: 16, zIndex: 500,
    display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px',
    borderRadius: 999, background: 'rgba(255,255,255,.95)', boxShadow: 'var(--shadowSm)',
    fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em',
  },
  sheet: {
    flex: 1, overflowY: 'auto', background: 'var(--bg)',
    borderRadius: '28px 28px 0 0', marginTop: -24, position: 'relative',
    padding: '20px 20px 40px', minHeight: 0,
  },
  courierCard: {
    display: 'flex', alignItems: 'center', gap: 13, marginTop: 20,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 14, boxShadow: 'var(--shadowSm)',
  },
  avatar: {
    width: 50, height: 50, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  chatBtn: {
    position: 'relative', width: 40, height: 40, borderRadius: '50%',
    background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  unread: {
    position: 'absolute', top: -1, right: -1, minWidth: 17, height: 17, padding: '0 4px',
    borderRadius: 99, background: 'var(--primary)', color: '#fff', fontSize: 10,
    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid var(--surface)',
  },
  callBtn: {
    width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  codeCard: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 12,
    background: '#17140F', borderRadius: 18, padding: '15px 16px', color: '#fff',
  },
  codeDigit: {
    width: 34, height: 40, borderRadius: 10, background: 'rgba(255,255,255,.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
  },
  logDot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 52, borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', fontWeight: 700, fontSize: 14, marginTop: 16,
  },
  rateBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 52, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 10,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
  errorScreen: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  errorBtn: {
    marginTop: 20, height: 48, padding: '0 24px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
};
