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

        {/* ============================================================
            VISTA DESKTOP: PANEL DE SEGUIMIENTO EN 2 COLUMNAS
            ============================================================ */}
        <div className="desktop-only" style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => router.push('/home')} style={S.backBtnHeader} aria-label="Volver al inicio">
                <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
              </button>
              <div>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
                  Seguimiento de Pedido #{order?.order_number ?? '—'}
                </span>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                  {order?.business?.name ?? 'Restaurante en Buenaventura'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E6F6EE', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(17,178,106,0.2)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--green)', letterSpacing: '.04em' }}>EN VIVO</span>
            </div>
          </div>
        </div>

        <div className="desktop-only sc" style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 60px', minHeight: 0, width: '100%', maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* COLUMNA IZQUIERDA: MAPA EN VIVO + REPARTIDOR + PIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Contenedor del Mapa */}
              <div style={{ position: 'relative', height: 380, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />
                <div style={{ ...S.livePill, top: 16, right: 16 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
                  GPS BUENAVENTURA
                </div>
              </div>

              {/* Repartidor */}
              <div style={{ ...S.courierCard, marginTop: 0, padding: '18px 20px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                <div style={{ ...S.avatar, width: 52, height: 52 }}>
                  <span className="ms" style={{ fontSize: 28, color: 'var(--muted)' }}>person</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15.5 }}>Yeison Mosquera</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Moto · Placa WQR-18C · Repartidor Oficial</div>
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
              <div style={{ ...S.codeCard, marginTop: 0, padding: '18px 22px' }}>
                <span className="ms" style={{ fontSize: 26, color: 'var(--amber)', flex: 'none' }}>password</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.6)' }}>
                    CÓDIGO DE ENTREGA
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 2 }}>
                    Dáselo al repartidor al recibir tu pedido
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 8, flex: 'none' }}>
                  {['4', '8', '2', '1'].map((d, i) => (
                    <span key={i} style={S.codeDigit}>{d}</span>
                  ))}
                </span>
              </div>
            </div>

            {/* COLUMNA DERECHA: ESTADO + TIMELINE + AYUDA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Tarjeta de Estado Principal */}
              <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 24, border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  ESTADO EN TIEMPO REAL
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', marginTop: 6 }}>
                  {status.label === 'En camino' ? 'Tu pedido va en camino' : status.label}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
                  {order?.business?.name ?? 'Preparando los mejores sabores del puerto'}
                </div>

                {/* Barra de progreso */}
                <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      style={{
                        flex: 1, height: 8, borderRadius: 99,
                        background: i < step ? 'var(--primary)' : 'var(--surface2)',
                        transition: 'background .3s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Bitácora de Pasos */}
              <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 24, border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,.03)' }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18 }}>Historial de entrega</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {log.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span style={{
                        ...S.logDot,
                        background: l.done ? 'var(--green)' : 'var(--surface2)',
                        color: l.done ? '#fff' : 'var(--faint)',
                      }}>
                        <span className="ms" style={{ fontSize: 16 }}>{l.icon}</span>
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{
                          display: 'block', fontWeight: 700, fontSize: 14,
                          color: l.done ? 'var(--text)' : 'var(--muted)',
                        }}>
                          {l.title}
                        </span>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {hhmm(l.at)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button onClick={() => router.push('/help')} style={{ ...S.helpBtn, marginTop: 0, height: 50, borderRadius: 16, cursor: 'pointer' }}>
                  <span className="ms" style={{ fontSize: 20 }}>headset_mic</span>
                  <span>Necesito ayuda con este pedido</span>
                </button>
                <button onClick={() => router.push(`/rate?order=${order?.id ?? ''}`)} style={{ ...S.rateBtn, marginTop: 0, height: 50, borderRadius: 16, cursor: 'pointer' }}>
                  <span className="ms" style={{ fontSize: 20 }}>star</span>
                  <span>Ya lo recibí, calificar</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================
            VISTA MÓVIL: FLUJO ORIGINAL 100% INTOCADO
            ============================================================ */}
        <div className="mobile-only" style={{ position: 'relative', flex: 'none', height: 270, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />
          <button onClick={() => router.push('/home')} style={S.mapBack} aria-label="Volver al inicio">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={S.livePill}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            EN VIVO
          </div>
        </div>

        {/* Hoja Móvil */}
        <div className="mobile-only sc" style={S.sheet}>
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
          <div style={{ marginTop: 24, background: 'var(--surface)', borderRadius: 20, padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,.04)' }}>
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
  backBtnHeader: {
    width: 44, height: 44, borderRadius: 14, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  mapBack: {
    position: 'absolute', top: 12, left: 16, width: 42, height: 42, borderRadius: '50%',
    background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.08)', zIndex: 500,
  },
  livePill: {
    position: 'absolute', top: 12, right: 16, zIndex: 500,
    display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
    borderRadius: 999, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0,0,0,.08)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', color: 'var(--text)',
  },
  sheet: {
    flex: 1, overflowY: 'auto', background: 'var(--bg)',
    borderRadius: '32px 32px 0 0', marginTop: -32, position: 'relative',
    padding: '24px 20px 40px', minHeight: 0,
    boxShadow: '0 -10px 30px rgba(0,0,0,.08)',
  },
  courierCard: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 22,
    background: 'var(--surface2)', borderRadius: 20, padding: '16px', border: 'none',
  },
  avatar: {
    width: 48, height: 48, borderRadius: '50%', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    boxShadow: '0 4px 10px rgba(0,0,0,.05)',
  },
  chatBtn: {
    position: 'relative', width: 42, height: 42, borderRadius: '50%',
    background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,.05)',
  },
  unread: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, padding: '0 4px',
    borderRadius: 99, background: 'var(--primary)', color: '#fff', fontSize: 10,
    fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid var(--surface2)',
  },
  callBtn: {
    width: 42, height: 42, borderRadius: '50%', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,68,31,.3)',
  },
  codeCard: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 14,
    background: 'linear-gradient(135deg, #221E18 0%, #17140F 100%)', borderRadius: 20, padding: '16px 20px', color: '#fff',
    boxShadow: '0 8px 24px rgba(23,20,15,.2)',
  },
  codeDigit: {
    width: 36, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, color: 'var(--amber)',
  },
  logDot: {
    width: 28, height: 28, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 54, borderRadius: 999, border: 'none', background: 'var(--surface2)',
    fontWeight: 700, fontSize: 14.5, marginTop: 24,
  },
  rateBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 54, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 12,
    boxShadow: '0 12px 28px rgba(255,68,31,.34)',
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
