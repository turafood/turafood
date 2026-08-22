'use client';

/**
 * SEGUIMIENTO DE PEDIDO ULTRA PRO CON MAPA EN VIVO Y NOTIFICACIONES PUSH
 * 
 * Incluye:
 * - Mapa interactivo Leaflet GPS en tiempo real de Buenaventura con ruta trazada.
 * - Marcador de moto animado que avanza por la ruta según el estado del pedido.
 * - Notificaciones PUSH de navegador + Toast In-App con campanazo de audio (Web Audio API).
 * - Soporte responsivo dual (Desktop 2 columnas + Mobile App).
 * - Selector interactivo de simulación para probar todos los estados en vivo.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { getOrder, subscribeToOrder } from '@/lib/data';
import { BUENAVENTURA } from '@/lib/seed';
import { ORDER_STATUS, cop } from '@/lib/format';
import { comandaWhatsapp, linkWhatsapp } from '@/lib/comandaWhatsapp';
import RouteSkeleton from '../components/RouteSkeleton';
import { cargarLeafletCss } from '@/lib/leafletCss';
import { useThemeStore } from '@/store/useThemeStore';
import ComandaTicket from '../components/ComandaTicket';

/** Pasos del flujo de entrega */

const STEPS = ['pending', 'accepted', 'preparing', 'picked_up', 'delivering', 'delivered'];

const STEP_INDEX = {
  pending: 0,
  accepted: 1,
  preparing: 2,
  ready: 2,
  courier_assigned: 2,
  picked_up: 3,
  delivering: 4,
  delivered: 5,
};

const STEP_DETAILS = {
  pending: {
    label: 'Pendiente de Confirmación',
    title: 'Pedido Registrado y Enviado',
    desc: 'El restaurante está revisando tu orden para confirmarla.',
    pushBody: 'Tu pedido fue recibido por el restaurante y está pendiente de confirmación.',
    icon: 'hourglass_top',
    color: '#FF9800',
    progress: 15,
    routeIndex: 0,
  },
  accepted: {
    label: 'Pedido Aceptado',
    title: '¡El Restaurante Aceptó tu Pedido!',
    desc: 'Tu orden fue confirmada y entró a la fila de cocina.',
    pushBody: '¡Buenas noticias! El restaurante aceptó tu pedido y se pondrá a cocinar.',
    icon: 'restaurant',
    color: '#2E6BFF',
    progress: 25,
    routeIndex: 0,
  },
  preparing: {
    label: 'En Preparación',
    title: 'Cocinando tus Platos',
    desc: 'Los chefs están preparando tu comida con los mejores ingredientes.',
    pushBody: 'Tu comida se está cocinando al instante con los mejores sabores.',
    icon: 'skillet',
    color: '#A8730B',
    progress: 45,
    routeIndex: 1,
  },
  picked_up: {
    label: 'Pedido Recogido',
    title: '¡Repartidor en Camino!',
    desc: 'Yeison Mosquera recogió tu pedido en el restaurante y va en ruta.',
    pushBody: '¡El repartidor ya tiene tu comida y va en camino hacia tu dirección!',
    icon: 'two_wheeler',
    color: '#FF441F',
    progress: 70,
    routeIndex: 2,
  },
  delivering: {
    label: 'Cerca de tu Casa',
    title: '¡El Repartidor está Llegando!',
    desc: 'Tu repartidor está a menos de 5 minutos de tu puerta.',
    pushBody: '¡Atento al timbre o teléfono! Tu repartidor está llegando a tu dirección.',
    icon: 'near_me',
    color: '#FF441F',
    progress: 90,
    routeIndex: 3,
  },
  delivered: {
    label: 'Entregado',
    title: '¡Pedido Entregado con Éxito!',
    desc: '¡Buen provecho! Disfruta tu comida.',
    pushBody: 'Tu pedido ha sido entregado. ¡Esperamos que disfrutes tu comida!',
    icon: 'check_circle',
    color: '#10B981',
    progress: 100,
    routeIndex: 4,
  },
};

/** Reproductor de sonido sutil / Chime Web Audio API (Sin archivos externos) */
function playNotificationChime() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Nota 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Nota 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.6);
  } catch {
    // Audio no permitido o silenciado
  }
}

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

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [pushToast, setPushToast] = useState(null);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const mapDesktopEl = useRef(null);
  const mapMobileEl = useRef(null);
  const mapDesktopRef = useRef(null);
  const mapMobileRef = useRef(null);
  const bikeMarkerDeskRef = useRef(null);
  const bikeMarkerMobRef = useRef(null);

  // Solicitar permiso de notificaciones push
  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationsAllowed(perm === 'granted');
        if (perm === 'granted') {
          triggerPushNotification('pending', '¡Notificaciones Push activadas!', 'Te avisaremos en tiempo real de cada movimiento de tu pedido.');
        }
      } catch (err) {
        console.warn('Push notification error:', err);
      }
    }
  };

  // Disparar Notificación Push (Nativa + In-App + Sonido)
  const triggerPushNotification = (statusKey, customTitle, customBody) => {
    const details = STEP_DETAILS[statusKey] || STEP_DETAILS.pending;
    const title = customTitle || details.title;
    const body = customBody || details.pushBody;

    // 1. Sonido
    playNotificationChime();

    // 1.1 Vibración Háptica en Móvil
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([50, 80, 50]); } catch {}
    }

    // 2. Notificación nativa de navegador
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Tura Food AI · ${title}`, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // Fallback silently
      }
    }

    // 3. Banner Toast In-App visual
    setPushToast({
      title,
      body,
      icon: details.icon,
      color: details.color,
      time: new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true }),
    });

    // Auto-ocultar toast después de 6.5s
    setTimeout(() => {
      setPushToast((prev) => (prev?.title === title ? null : prev));
    }, 6500);
  };

  // Compartir seguimiento en tiempo real por WhatsApp
  const shareTrackingOnWhatsapp = () => {
    const currentOrderId = order?.id || orderId || 'current';
    const orderNum = order?.order_number ? `#${order.order_number}` : '';
    const shareUrl = `https://turafood.com/tracking?order=${currentOrderId}`;
    const text = `¡Hola! 👋 Sigue mi pedido ${orderNum} de Tura Food en tiempo real por el mapa 🛵💨:\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Abrir o reenviar comanda directa en WhatsApp del restaurante
  const openRestaurantWhatsapp = () => {
    if (typeof window !== 'undefined') {
      const cachedUrl = localStorage.getItem('turafood_last_whatsapp_url');
      if (cachedUrl) {
        window.open(cachedUrl, '_blank');
        return;
      }
    }

    if (order) {
      const targetPhone = order.business?.whatsapp_phone || order.business?.phone || '+573026886449';
      const itemsList = (order.items || []).map((i) => ({
        name: i.name,
        qty: i.quantity || 1,
        unitPrice: i.unit_price || 0,
        opts: i.notes || '',
        notes: i.notes || '',
      }));

      const comandaText = comandaWhatsapp(
        {
          ...order,
          order_number: order.order_number || `TS-${String(order.id || '').slice(0, 5)}`,
          subtotal: order.subtotal || order.total || 0,
          delivery_fee: order.delivery_fee || 0,
          service_fee: order.service_fee || 0,
          tip: order.tip || 0,
          discount: order.discount || 0,
          total: order.total || 0,
          mode: order.mode || 'delivery',
          delivery_address: order.delivery_address || '',
          delivery_instructions: order.delivery_instructions || '',
          payment_method: order.payment_method || 'cash',
        },
        itemsList,
        {
          negocio: order.business?.name || 'Restaurante',
          cliente: 'Cliente Tura Food',
          numeroPago: order.business?.nequi_phone || order.business?.phone || '',
        }
      );

      const url = linkWhatsapp(targetPhone, comandaText);
      if (url) window.open(url, '_blank');
    }
  };

  // Cargar CSS y comprobar si Leaflet ya está en window
  useEffect(() => {
    cargarLeafletCss();
    if (typeof window !== 'undefined') {
      if (window.L) {
        setLeafletReady(true);
      } else {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setLeafletReady(true);
        document.body.appendChild(script);
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        setNotificationsAllowed(true);
      }
    }
  }, []);

  // Cargar pedido
  useEffect(() => {
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
        const initStatus = data.status || 'pending';
        setCurrentStatus(initStatus);

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('turafood_active_order', JSON.stringify(data));
            localStorage.setItem('turafood_last_order', JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('turafood:active-order', { detail: data }));
            window.dispatchEvent(new CustomEvent('turafood:order-status', { detail: data }));
          } catch {}
        }

        unsubscribe = subscribeToOrder(data.id, (updated) => {
          setOrder((prev) => {
            const merged = { ...prev, ...updated };
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem('turafood_active_order', JSON.stringify(merged));
                localStorage.setItem('turafood_last_order', JSON.stringify(merged));
                window.dispatchEvent(new CustomEvent('turafood:active-order', { detail: merged }));
              } catch {}
            }
            return merged;
          });
          if (updated.status && updated.status !== currentStatus) {
            setCurrentStatus(updated.status);
            triggerPushNotification(updated.status);
          }
        });
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();

    return () => { alive = false; unsubscribe(); };
  }, [orderId]);

  // Cambiar de estado manualmente / simulación
  const handleSetStatus = (statusKey) => {
    setCurrentStatus(statusKey);
    setOrder((prev) => ({ ...prev, status: statusKey }));
    triggerPushNotification(statusKey);

    // Mover moto en los mapas
    const details = STEP_DETAILS[statusKey] || STEP_DETAILS.pending;
    const route = BUENAVENTURA.route;
    const targetIdx = Math.min(details.routeIndex, route.length - 1);
    const targetCoord = route[targetIdx];

    if (bikeMarkerDeskRef.current) bikeMarkerDeskRef.current.setLatLng(targetCoord);
    if (bikeMarkerMobRef.current) bikeMarkerMobRef.current.setLatLng(targetCoord);
  };

  // Simulación continua automática
  useEffect(() => {
    if (!isSimulating) return;
    const allSteps = ['pending', 'accepted', 'preparing', 'picked_up', 'delivering', 'delivered'];
    let curIdx = allSteps.indexOf(currentStatus);
    if (curIdx >= allSteps.length - 1) curIdx = -1;

    const interval = setInterval(() => {
      curIdx++;
      if (curIdx < allSteps.length) {
        handleSetStatus(allSteps[curIdx]);
      } else {
        setIsSimulating(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulating, currentStatus]);

  // Inicializar Mapas de Leaflet (Desktop y Mobile por separado)
  useEffect(() => {
    if (!leafletReady || !order) return;
    const L = window.L;
    if (!L) return;

    const route = BUENAVENTURA.route;
    const startCoord = route[0];
    const endCoord = route[route.length - 1];
    const details = STEP_DETAILS[currentStatus] || STEP_DETAILS.pending;
    const bikeCoord = route[Math.min(details.routeIndex, route.length - 1)];

    // Crear icono personalizado con pulso y estilo Material 3
    const makeIcon = (bg, icon, isBike = false) => L.divIcon({
      className: '',
      html: `
        <div style="position:relative;display:flex;align-items:center;justify-content:center;">
          ${isBike ? `<div style="position:absolute;inset:-8px;border-radius:50%;background:${bg};opacity:0.35;animation:pulseGlow 1.8s infinite;"></div>` : ''}
          <div style="
            width:${isBike ? '38px' : '32px'};
            height:${isBike ? '38px' : '32px'};
            border-radius:50%;
            background:${bg};
            border:2.5px solid #fff;
            box-shadow:0 6px 18px rgba(0,0,0,0.3);
            display:flex;align-items:center;justify-content:center;
            color:#fff;
          ">
            <span class="material-symbols-rounded" style="font-size:${isBike ? '20px' : '17px'};line-height:1;">${icon}</span>
          </div>
        </div>
      `,
      iconSize: isBike ? [38, 38] : [32, 32],
      iconAnchor: isBike ? [19, 19] : [16, 16],
    });

    const initMapInstance = (containerEl, isDesktop = true) => {
      if (!containerEl) return null;
      
      const map = L.map(containerEl, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
      });

      // Carto Voyager Tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Línea de brillo de fondo
      L.polyline(route, { color: '#FF441F', weight: 10, opacity: 0.22, lineCap: 'round' }).addTo(map);
      // Línea principal de ruta
      const polyline = L.polyline(route, { color: '#FF441F', weight: 4.5, opacity: 0.95, lineCap: 'round', dashArray: '8, 8' }).addTo(map);

      // Marcador 1: Restaurante
      L.marker(startCoord, { icon: makeIcon('#1E293B', 'storefront') })
        .bindTooltip(`🏪 ${order.business?.name || 'Restaurante'}`, { permanent: false, direction: 'top' })
        .addTo(map);

      // Marcador 2: Repartidor en Vivo
      const bikeMarker = L.marker(bikeCoord, { icon: makeIcon('#FF441F', 'two_wheeler', true) })
        .bindTooltip('🛵 Yeison Mosquera (En ruta)', { permanent: true, direction: 'top', className: 'cura-tooltip' })
        .addTo(map);

      // Marcador 3: Destino Casa Cliente
      L.marker(endCoord, { icon: makeIcon('#10B981', 'home') })
        .bindTooltip(`🏠 ${order.delivery_address || 'Tu dirección'}`, { permanent: false, direction: 'top' })
        .addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: isDesktop ? [40, 40] : [28, 28] });

      setTimeout(() => {
        map.invalidateSize();
      }, 200);

      return { map, bikeMarker };
    };

    // Limpiar mapas previos
    if (mapDesktopRef.current) mapDesktopRef.current.remove();
    if (mapMobileRef.current) mapMobileRef.current.remove();

    if (mapDesktopEl.current) {
      const res = initMapInstance(mapDesktopEl.current, true);
      if (res) {
        mapDesktopRef.current = res.map;
        bikeMarkerDeskRef.current = res.bikeMarker;
      }
    }

    if (mapMobileEl.current) {
      const res = initMapInstance(mapMobileEl.current, false);
      if (res) {
        mapMobileRef.current = res.map;
        bikeMarkerMobRef.current = res.bikeMarker;
      }
    }

    return () => {
      if (mapDesktopRef.current) { mapDesktopRef.current.remove(); mapDesktopRef.current = null; }
      if (mapMobileRef.current) { mapMobileRef.current.remove(); mapMobileRef.current = null; }
    };
  }, [leafletReady, order]);

  // Centrar mapa en el repartidor
  const centerOnCourier = () => {
    const details = STEP_DETAILS[currentStatus] || STEP_DETAILS.pending;
    const route = BUENAVENTURA.route;
    const bikeCoord = route[Math.min(details.routeIndex, route.length - 1)];

    if (mapDesktopRef.current) {
      mapDesktopRef.current.setView(bikeCoord, 16, { animate: true });
    }
    if (mapMobileRef.current) {
      mapMobileRef.current.setView(bikeCoord, 16, { animate: true });
    }
  };

  if (error) {
    return (
      <div style={S.errorScreen}>
        <span className="ms" style={{ fontSize: 48, color: 'var(--faint)' }}>local_shipping</span>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, marginTop: 14 }}>
          No pudimos abrir el seguimiento
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>{error}</div>
        <button onClick={() => router.push('/home')} style={S.errorBtn}>Volver al Inicio</button>
      </div>
    );
  }

  const step = STEP_INDEX[currentStatus] ?? 0;
  const statusDetails = STEP_DETAILS[currentStatus] ?? STEP_DETAILS.pending;

  const log = [
    { id: 'pending', icon: 'check', title: 'Pedido confirmado y recibido', at: order?.created_at, done: step >= 0 },
    { id: 'accepted', icon: 'storefront', title: 'Restaurante aceptó la orden', at: order?.accepted_at, done: step >= 1 },
    { id: 'preparing', icon: 'skillet', title: 'Cocinando y empacando tu pedido', at: order?.preparing_at, done: step >= 2 },
    { id: 'picked_up', icon: 'two_wheeler', title: 'Repartidor recogió el pedido', at: order?.picked_up_at, done: step >= 3 },
    { id: 'delivering', icon: 'near_me', title: 'Repartidor cerca de tu dirección', at: order?.delivering_at, done: step >= 4 },
    { id: 'delivered', icon: 'home', title: `Entregado en ${order?.delivery_address ?? 'tu dirección'}`, at: order?.delivered_at, done: step >= 5 },
  ];

  const hhmm = (iso) => (iso
    ? new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true })
    : 'En curso');

  return (
    <>
      {/* Toast Flotante de Notificación Push */}
      {pushToast && (
        <div style={S.pushNotificationToast}>
          <div style={{ ...S.pushToastIcon, background: `${pushToast.color}22` }}>
            <span className="ms ms-fill" style={{ fontSize: 24, color: pushToast.color }}>
              {pushToast.icon}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: pushToast.color, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                🔔 NOTIFICACIÓN EN VIVO
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pushToast.time}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)', marginTop: 2 }}>
              {pushToast.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>
              {pushToast.body}
            </div>
          </div>
          <button onClick={() => setPushToast(null)} style={S.closePushBtn}>
            <span className="ms" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

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
                  Seguimiento de Pedido #{order?.order_number ?? 'TS-4838'}
                </span>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                  {order?.business?.name ?? 'Burger House Bahia'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Botón de Activar Push */}
              {!notificationsAllowed && (
                <button
                  onClick={requestPushPermission}
                  style={S.pushToggleBtn}
                  title="Activar notificaciones de escritorio"
                >
                  <span className="ms ms-fill" style={{ fontSize: 18, color: 'var(--primary)' }}>notifications_active</span>
                  <span>Activar Alertas Push</span>
                </button>
              )}

              {/* Botón de Modo Oscuro / Claro */}
              <button
                onClick={toggleTheme}
                style={{
                  height: 40, width: 40, borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: theme === 'dark' ? '#FFB800' : 'var(--text)',
                  boxShadow: 'var(--shadowSm)',
                }}
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                aria-label="Cambiar tema"
              >
                <span className="ms" style={{ fontSize: 20 }}>
                  {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                </span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#E6F6EE', padding: '6px 14px', borderRadius: 99, border: '1px solid rgba(17,178,106,0.2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--green)', letterSpacing: '.04em' }}>EN VIVO</span>
              </div>
            </div>
          </div>
        </div>

        <div className="desktop-only sc" style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 60px', minHeight: 0, width: '100%', maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* COLUMNA IZQUIERDA: MAPA INTERACTIVO + REPARTIDOR + ACCIONES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Contenedor del Mapa Leaflet Interactivo */}
              <div style={{ position: 'relative', height: 380, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                <div ref={mapDesktopEl} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
                
                {/* Badge Flotante GPS */}
                <div style={{ ...S.livePill, top: 14, left: 14, zIndex: 500 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
                  GPS BUENAVENTURA · EN TIEMPO REAL
                </div>

                {/* Controles Flotantes del Mapa */}
                <div style={{ position: 'absolute', bottom: 14, right: 14, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    onClick={centerOnCourier}
                    style={S.mapCtrlBtn}
                    title="Centrar en el repartidor"
                  >
                    <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>my_location</span>
                  </button>
                  <button
                    onClick={() => setIsSimulating(!isSimulating)}
                    style={{
                      ...S.mapCtrlBtn,
                      background: isSimulating ? 'var(--primary)' : '#fff',
                      color: isSimulating ? '#fff' : 'var(--text)',
                      width: 'auto', padding: '0 12px',
                    }}
                    title="Simular avance automático de ruta"
                  >
                    <span className="ms ms-fill" style={{ fontSize: 18 }}>
                      {isSimulating ? 'pause' : 'play_arrow'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      {isSimulating ? 'Simulando...' : 'Simular'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Repartidor Oficial */}
              <div style={{ ...S.courierCard, marginTop: 0, padding: '16px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
                <div style={{ ...S.avatar, width: 46, height: 46 }}>
                  <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>person</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>Yeison Mosquera</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Moto · Placa WQR-18C · Repartidor Oficial</div>
                </div>
                <button onClick={() => router.push(`/chat?order=${order?.id ?? ''}`)} style={S.chatBtn} aria-label="Escribir al repartidor">
                  <span className="ms" style={{ fontSize: 19 }}>chat_bubble</span>
                  <span style={S.unread}>2</span>
                </button>
                <button
                  onClick={() => window.open('tel:+573026886449', '_self')}
                  style={S.callBtn}
                  aria-label="Llamar al repartidor"
                >
                  <span className="ms" style={{ fontSize: 19, color: '#fff' }}>call</span>
                </button>
              </div>

              {/* Botones de acción complementarios en 1 fila */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => router.push(`/help?order=${order?.id ?? ''}`)} style={{ ...S.helpBtn, marginTop: 0, height: 44, borderRadius: 14, fontSize: 13, cursor: 'pointer' }}>
                  <span className="ms" style={{ fontSize: 18 }}>headset_mic</span>
                  <span>Ayuda con el pedido</span>
                </button>
                <button onClick={() => router.push(`/rate?order=${order?.id ?? ''}`)} style={{ ...S.rateBtn, marginTop: 0, height: 44, borderRadius: 14, fontSize: 13, cursor: 'pointer' }}>
                  <span className="ms" style={{ fontSize: 18 }}>star</span>
                  <span>Calificar entrega</span>
                </button>
              </div>
            </div>

            {/* COLUMNA DERECHA: ESTADO EN VIVO + TICKET COMANDA PRO */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Tarjeta de Estado Compacta */}
              <div style={{ background: 'var(--surface)', borderRadius: 20, padding: '16px 20px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusDetails.color, animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: statusDetails.color, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      {statusDetails.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
                    {hhmm(order?.created_at)}
                  </span>
                </div>

                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, letterSpacing: '-.01em', marginTop: 6 }}>
                  {statusDetails.title}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  {statusDetails.desc}
                </div>

                {/* Barra de progreso */}
                <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'var(--surface2)', marginTop: 12, overflow: 'hidden' }}>
                  <div style={{
                    width: `${statusDetails.progress}%`, height: '100%',
                    background: 'linear-gradient(90deg, #FF441F 0%, #10B981 100%)',
                    borderRadius: 99, transition: 'width .4s ease',
                  }} />
                </div>

                {/* Simulador rápido de estados (Prueba interactiva) */}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  {STEPS.map((stKey) => {
                    const active = currentStatus === stKey;
                    return (
                      <button
                        key={stKey}
                        onClick={() => handleSetStatus(stKey)}
                        style={{
                          padding: '3px 8px', borderRadius: 7, fontSize: 10.5, fontWeight: 700,
                          border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                          background: active ? 'rgba(255,68,31,0.1)' : 'var(--surface2)',
                          color: active ? 'var(--primary)' : 'var(--muted)',
                          cursor: 'pointer', transition: 'all .12s ease',
                        }}
                      >
                        {STEP_DETAILS[stKey]?.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TICKET DIGITAL DE COMPRA & COMANDA PRO (DESKTOP) */}
              <ComandaTicket
                order={order}
                onOpenWhatsapp={openRestaurantWhatsapp}
                onShareWhatsapp={shareTrackingOnWhatsapp}
                onCenterMap={centerOnCourier}
              />
            </div>

          </div>
        </div>

        {/* ============================================================
            VISTA MÓVIL: MAPA EXPANDIDO + HOJA DESLIZANTE
            ============================================================ */}
        <div className="mobile-only" style={{ position: 'relative', flex: 'none', height: 310, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div ref={mapMobileEl} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          
          <button onClick={() => router.push('/home')} style={S.mapBack} aria-label="Volver al inicio">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>

          <div style={{ ...S.livePill, top: 12, right: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 2s infinite' }} />
            GPS EN VIVO
          </div>

          {/* Botón centrar en repartidor */}
          <button
            onClick={centerOnCourier}
            style={{ position: 'absolute', bottom: 44, right: 16, zIndex: 500, ...S.mapCtrlBtn }}
            title="Centrar en el repartidor"
          >
            <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>my_location</span>
          </button>
        </div>

        {/* Hoja Móvil */}
        <div className="mobile-only sc" style={S.sheet}>
          <div style={{ width: 42, height: 4, borderRadius: 99, background: 'var(--faint)', margin: '0 auto 16px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: statusDetails.color, letterSpacing: '.06em' }}>
              PEDIDO #{order?.order_number ?? 'TS-4838'}
            </div>
            <button
              onClick={toggleTheme}
              style={{
                height: 32, width: 32, borderRadius: 10,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: theme === 'dark' ? '#FFB800' : 'var(--text)',
              }}
              title="Cambiar tema"
            >
              <span className="ms" style={{ fontSize: 16 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>

          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', marginTop: 5 }}>
            {statusDetails.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {statusDetails.desc}
          </div>

          {/* Progreso */}
          <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'var(--surface2)', marginTop: 14, overflow: 'hidden' }}>
            <div style={{
              width: `${statusDetails.progress}%`, height: '100%',
              background: 'linear-gradient(90deg, #FF441F 0%, #10B981 100%)',
              borderRadius: 99, transition: 'width .4s ease',
            }} />
          </div>

          {/* Simulación Rápida Móvil */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 14, paddingBottom: 4 }}>
            {STEPS.map((stKey) => {
              const active = currentStatus === stKey;
              return (
                <button
                  key={stKey}
                  onClick={() => handleSetStatus(stKey)}
                  style={{
                    padding: '4px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    background: active ? 'rgba(255,68,31,0.1)' : 'var(--surface2)',
                    color: active ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer', flex: 'none',
                  }}
                >
                  {STEP_DETAILS[stKey]?.label}
                </button>
              );
            })}
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
            <button
              onClick={() => window.open('tel:+573026886449', '_self')}
              style={S.callBtn}
              aria-label="Llamar al repartidor"
            >
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

          {/* TICKET DIGITAL DE COMPRA & COMANDA PRO (MÓVIL) */}
          <div style={{ marginTop: 20 }}>
            <ComandaTicket
              order={order}
              onOpenWhatsapp={openRestaurantWhatsapp}
              onShareWhatsapp={shareTrackingOnWhatsapp}
              onCenterMap={centerOnCourier}
            />
          </div>

          {/* Bitácora */}
          <div style={{ marginTop: 20, background: 'var(--surface)', borderRadius: 20, padding: '16px 20px', boxShadow: '0 4px 16px rgba(0,0,0,.04)' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
            <button onClick={() => router.push(`/help?order=${order?.id ?? ''}`)} style={{ ...S.helpBtn, marginTop: 0 }}>
              <span className="ms" style={{ fontSize: 19 }}>headset_mic</span>
              <span>Necesito ayuda con este pedido</span>
            </button>
            <button onClick={() => router.push(`/rate?order=${order?.id ?? ''}`)} style={{ ...S.rateBtn, marginTop: 0 }}>
              <span className="ms" style={{ fontSize: 19 }}>star</span>
              <span>Ya lo recibí, calificar</span>
            </button>
          </div>
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
    background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,.1)', zIndex: 500,
    border: 'none', cursor: 'pointer',
  },
  livePill: {
    position: 'absolute', top: 12, right: 16, zIndex: 500,
    display: 'flex', alignItems: 'center', gap: 7, height: 36, padding: '0 14px',
    borderRadius: 999, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em', color: '#0F172A',
  },
  mapCtrlBtn: {
    width: 40, height: 40, borderRadius: 12, background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
  },
  sheet: {
    flex: 1, overflowY: 'auto', background: 'var(--bg)',
    borderRadius: '32px 32px 0 0', marginTop: -32, position: 'relative',
    padding: '24px 20px 40px', minHeight: 0,
    boxShadow: '0 -10px 30px rgba(0,0,0,.08)', zIndex: 10,
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
    boxShadow: '0 4px 10px rgba(0,0,0,.05)', border: 'none', cursor: 'pointer',
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
    boxShadow: '0 4px 12px rgba(255,68,31,.3)', border: 'none', cursor: 'pointer',
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
    fontWeight: 700, fontSize: 14.5, marginTop: 24, cursor: 'pointer',
  },
  rateBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 54, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 14.5, marginTop: 12,
    boxShadow: '0 12px 28px rgba(255,68,31,.34)', border: 'none', cursor: 'pointer',
  },
  pushToggleBtn: {
    display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px',
    borderRadius: 12, background: 'rgba(255,68,31,0.08)', border: '1px solid rgba(255,68,31,0.2)',
    color: 'var(--primary)', fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
  },
  pushNotificationToast: {
    position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9999, width: '92%', maxWidth: 440, borderRadius: 18,
    background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.18)', padding: '14px 16px',
    display: 'flex', alignItems: 'flex-start', gap: 12,
    animation: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pushToastIcon: {
    width: 42, height: 42, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  closePushBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--muted)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorScreen: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  errorBtn: {
    marginTop: 20, height: 48, padding: '0 24px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14.5, border: 'none', cursor: 'pointer',
  },
};
