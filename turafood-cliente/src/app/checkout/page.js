'use client';

/**
 * CONFIRMAR PEDIDO — EXPERIENCIA TURA SOFA / TURA MUEBLES 1:1
 * 
 * Rediseño exhaustivo mobile-first y desktop fiel al sistema de diseño
 * de Tura Sofa (PWA Screenshots y Handoff):
 * - Stepper limpio: (1) Contacto · (2) Entrega · (3) Pago
 * - Paneles con tarjetas de radio, badges "RECOMENDADO", microcopia clara
 * - Resumen unificado con líneas mini, desglose y doble acción:
 *   1) Confirmar pedido directo (App / Supabase)
 *   2) Pedir por WhatsApp con comanda formateada
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useThemeStore } from '@/store/useThemeStore';
import { anotarVarios } from '@/lib/eventos';
import { getBusiness, getAddresses, getCoupons, placeOrder, saveAddress } from '@/lib/data';
import { detectarUbicacionGPS } from '@/lib/geocoding';
import AddressSheet from '../components/AddressSheet';
import VerificarCelular from '../components/VerificarCelular';
import { necesitaVerificar, tieneVerificacion, correoDeLaCuenta } from '@/lib/cuenta';
import { invalidate } from '@/lib/cache';
import { normalizarCelularCO } from '@/lib/direcciones.mjs';
import { quote, validateCoupon } from '@/lib/pricing';
import { cop, deliveryWindow } from '@/lib/format';
import { comandaWhatsapp, linkWhatsapp } from '@/lib/comandaWhatsapp';
import PaymentSheet from '../components/PaymentSheet';
import ScheduleSheet from '../components/ScheduleSheet';
import { Cover } from '../components/Media';

const TIPS = [
  { label: 'Sin propina', value: 0, emoji: '🚫' },
  { label: '$1.000', value: 1000, emoji: '💚' },
  { label: '$2.000', value: 2000, emoji: '⭐', popular: true },
  { label: '$3.000', value: 3000, emoji: '🙌' },
  { label: '$5.000', value: 5000, emoji: '🚀' },
];

function WhatsAppIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flex: 'none' }}>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15c-1.49 0-2.94-.4-4.22-1.16l-.3-.18-3.13.82.84-3.05-.2-.32a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.188 8.188 0 012.42 5.83c0 4.55-3.7 8.26-8.23 8.26zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.06 0 1.21.89 2.39 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z" />
    </svg>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const items = useCartStore((s) => s.items);
  const businessId = useCartStore((s) => s.businessId);
  const businessName = useCartStore((s) => s.businessName);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const [store, setStore] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [deliveryInstructionsText, setDeliveryInstructionsText] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addressOpen, setAddressOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const n = localStorage.getItem('turafood_customer_name');
        const p = localStorage.getItem('turafood_customer_phone');
        if (n) setCustomerName(n);
        if (p) setCustomerPhone(p);
      } catch {}
    }
  }, []);

  const [mode, setMode] = useState('delivery'); // 'delivery' | 'pickup'
  const [payMethod, setPayMethod] = useState('cash'); // 'cash' | 'nequi'
  const [tip, setTip] = useState(2000);
  const [when, setWhen] = useState('asap'); // 'asap' | 'scheduled'
  const [schedule, setSchedule] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const [turbo, setTurbo] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [verificarOpen, setVerificarOpen] = useState(false);
  const verificado = useRef(false);
  const [celularVerificado, setCelularVerificado] = useState(false);
  const [correoGuardado, setCorreoGuardado] = useState('');
  const [gpsDetecting, setGpsDetecting] = useState(false);

  const handleQuickGps = async () => {
    setGpsDetecting(true);
    setError(null);
    try {
      const res = await detectarUbicacionGPS();
      const nueva = await saveAddress({
        label: 'Casa',
        address: res.label || res.address,
        neighborhood: res.neighborhood,
        lat: res.lat,
        lng: res.lng,
        isDefault: true,
      });
      setAddresses([nueva, ...addresses.filter((a) => a.id !== nueva.id)]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('turafood:address-changed', { detail: nueva }));
        if ('vibrate' in navigator) navigator.vibrate([30, 60]);
      }
    } catch (err) {
      setError(err.message || 'No se pudo obtener la ubicación GPS.');
      setAddressOpen(true);
    } finally {
      setGpsDetecting(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    tieneVerificacion().then((v) => { if (vivo) setCelularVerificado(v); }).catch(() => {});
    // El correo se precarga (de la última vez o de la cuenta): solo ahorra escribir, no verifica nada
    Promise.resolve(correoDeLaCuenta()).then((c) => {
      if (!vivo) return;
      let g = c;
      try { g = g || localStorage.getItem('turafood_customer_email') || ''; } catch { /* sin almacenamiento */ }
      setCorreoGuardado(g);
    }).catch(() => {});
    return () => { vivo = false; };
  }, []);

  const metodoPendiente = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (items.length) anotarVarios(items.map((i) => i.productId), 'checkout');
  }, [items]);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    (async () => {
      try {
        const [biz, addrs, cps] = await Promise.all([
          getBusiness(businessId), getAddresses(), getCoupons(),
        ]);
        if (!alive) return;
        setStore(biz);
        setAddresses(addrs);
        if (addrs?.length && addrs[0].detail) setDeliveryInstructionsText(addrs[0].detail);
        setCoupons(cps);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => { alive = false; };
  }, [businessId]);

  const address = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
  const deliveryAddressText = address?.address ?? '';
  const faltaDireccion = mode === 'delivery' && !address?.id;
  const celularDigits = customerPhone.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
  const celularOk = celularDigits.length === 10 || Boolean(normalizarCelularCO(customerPhone));
  const nameOk = customerName.trim().length >= 3;
  const dataOk = nameOk && celularOk;
  const addrOk = mode === 'pickup' || Boolean(address?.id);

  const t = quote({
    subtotal,
    deliveryFee: store?.delivery_fee ?? 0,
    mode,
    tip,
    coupon,
  });

  const turaTotal = t.total + (turbo ? 2500 : 0);

  const falta = items.length === 0
    ? 'Canasta vacía'
    : (!nameOk || !customerPhone.trim())
      ? 'Completa tu nombre y celular'
      : !celularOk
        ? 'Revisa tu celular (10 dígitos, ej. 300 123 4567)'
        : faltaDireccion
          ? 'Agrega la dirección de entrega'
          : null;

  const applyCoupon = () => {
    const res = validateCoupon(couponInput, coupons, subtotal);
    setCoupon(res.coupon);
    setCouponMsg(res.message ? { text: res.message, ok: res.ok } : null);
  };

  const alVerificar = async ({ cambioDeUsuario }) => {
    verificado.current = true;
    setCelularVerificado(true);
    setVerificarOpen(false);
    setPlacing(true);
    let nueva;
    try {
      if (cambioDeUsuario) {
        invalidate('direcciones');
        if (mode === 'delivery' && address?.lat != null && address?.lng != null) {
          nueva = await saveAddress({
            label: address.label || 'Casa', address: address.address, detail: address.detail,
            neighborhood: address.neighborhood, lat: address.lat, lng: address.lng, isDefault: true,
          });
        }
        setAddresses(await getAddresses());
      }
    } catch (err) {
      setError(err.message);
      setPlacing(false);
      return;
    }
    await handlePlaceOrder(metodoPendiente.current, nueva ? { address: nueva } : {});
  };

  const handlePlaceOrder = async (overrideMethod, opts = {}) => {
    const methodToUse = overrideMethod || payMethod || 'cash';
    setError(null);

    const addr = opts.address ?? address;
    const addrText = addr?.address ?? deliveryAddressText;

    if (opts.address ? false : faltaDireccion) {
      setError('Agrega dónde te entregamos antes de continuar.');
      setAddressOpen(true);
      return;
    }

    if (!nameOk || !celularOk) {
      setError('Por favor completa tu nombre y número de celular.');
      return;
    }

    setPlacing(true);
    try {
      if (!verificado.current && celularOk && await necesitaVerificar()) {
        metodoPendiente.current = methodToUse;
        setPlacing(false);
        setVerificarOpen(true);
        return;
      }

      const finalCustomerName = customerName.trim() || 'Cliente Tura Food';
      const finalCustomerPhone = normalizarCelularCO(customerPhone) || customerPhone.trim();
      const clienteLabel = finalCustomerPhone ? `${finalCustomerName} (${finalCustomerPhone})` : finalCustomerName;

      const order = await placeOrder({
        businessId,
        items: items.map((i) => ({
          product_id: i.productId,
          productId: i.productId,
          name: i.name,
          quantity: i.qty,
          qty: i.qty,
          unit_price: i.unitPrice || i.basePrice || i.price || 0,
          unitPrice: i.unitPrice || i.basePrice || i.price || 0,
          extra_ids: i.extraIds ?? [],
          opts: i.opts || '',
          notes: i.notes || null,
        })),
        mode,
        addressId: addr?.id ?? null,
        deliveryAddress: addrText,
        deliveryInstructions: deliveryInstructionsText,
        tip: t.tip,
        couponCode: coupon?.code ?? null,
        paymentMethod: methodToUse,
        subtotal: t.subtotal,
        deliveryFee: t.delivery,
        serviceFee: t.service,
        discount: t.discount,
        total: t.total,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
      });

      const productos = items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice || i.basePrice || i.price || 0,
        opts: i.opts || '',
        notes: i.notes || '',
      }));

      const targetPhone = store?.whatsapp_phone || store?.phone || '';
      const comandaText = comandaWhatsapp(
        {
          ...order,
          order_number: order?.order_number || `TS-${String(order?.id || '').slice(0, 5)}`,
          subtotal: t.subtotal,
          delivery_fee: t.delivery,
          service_fee: t.service,
          tip: t.tip,
          discount: t.discount,
          total: t.total,
          mode,
          delivery_address: addrText,
          delivery_instructions: deliveryInstructionsText,
          payment_method: methodToUse,
        },
        productos,
        {
          negocio: store?.name,
          cliente: clienteLabel,
          numeroPago: store?.payment_details?.nequi || store?.phone || '',
        }
      );

      const whatsappUrl = linkWhatsapp(targetPhone, comandaText);

      if (typeof window !== 'undefined') {
        try {
          if (customerName.trim()) localStorage.setItem('turafood_customer_name', customerName.trim());
          if (customerPhone.trim()) localStorage.setItem('turafood_customer_phone', customerPhone.trim());
          localStorage.setItem('turafood_last_whatsapp_url', whatsappUrl);
          localStorage.setItem('turafood_last_comanda_text', comandaText);
          localStorage.setItem('turafood_active_order', JSON.stringify(order));
          localStorage.setItem('turafood_last_order', JSON.stringify(order));
          window.dispatchEvent(new CustomEvent('turafood:active-order', { detail: order }));
          window.dispatchEvent(new CustomEvent('turafood:order-status', { detail: order }));
        } catch {}
      }

      anotarVarios(items.map((i) => i.productId), 'purchase');
      clearCart();

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([40, 60, 40]); } catch {}
      }

      router.push(`/tracking?order=${order?.id || 'current'}`);

      if (overrideMethod === 'whatsapp' && whatsappUrl && typeof window !== 'undefined') {
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 200);
      }
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  const handleWhatsAppDirect = () => {
    handlePlaceOrder('whatsapp');
  };

  // Estado Canasta Vacía estilo Tura Sofa
  if (items.length === 0) {
    let lastOrder = null;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('turafood_active_order') || localStorage.getItem('turafood_last_order');
        if (cached) lastOrder = JSON.parse(cached);
      } catch {}
    }

    return (
      <div className="v-checkout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65vh', textAlign: 'center' }}>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
          <button
            className="co-back"
            onClick={() => {
              const target = store?.slug || store?.id || businessId;
              if (target) {
                router.push(`/store/${target}`);
              } else if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes(window.location.host)) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            aria-label="Volver"
          >
            <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
            <span>{businessId ? 'Volver a la tienda' : 'Volver al inicio'}</span>
          </button>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--surface2)', display: 'grid', placeItems: 'center', color: 'var(--primary)', marginBottom: 16 }}>
          <span className="ms ms-fill" style={{ fontSize: 32 }}>
            {lastOrder ? 'receipt_long' : 'shopping_bag'}
          </span>
        </div>
        <h1 className="co-title">
          {lastOrder ? '¡Pedido en preparación!' : 'Tu canasta está vacía'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 14.5, maxWidth: 360, margin: '6px 0 24px', lineHeight: 1.5 }}>
          {lastOrder
            ? `Tu pedido #${lastOrder.order_number || ''} está registrado y puedes seguir la ruta del repartidor por GPS.`
            : 'Explora nuestros restaurantes en Buenaventura y elige tus platos favoritos.'}
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {lastOrder && (
            <button
              onClick={() => router.push(`/tracking?order=${lastOrder.id || 'current'}`)}
              className="co-btn-brand"
              style={{ padding: '0 24px', width: 'auto' }}
            >
              <span className="ms ms-fill" style={{ fontSize: 18 }}>near_me</span>
              <span>Ver Pedido y GPS en Vivo</span>
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="co-btn-wa"
            style={{ padding: '0 24px', width: 'auto' }}
          >
            Ver restaurantes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="v-checkout">
      {/* Botón Volver y Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <button
          className="co-back"
          onClick={() => {
            const target = store?.slug || store?.id || businessId;
            if (target) {
              router.push(`/store/${target}`);
            } else if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes(window.location.host)) {
              router.back();
            } else {
              router.push('/');
            }
          }}
          aria-label="Volver a la tienda"
        >
          <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
          <span>Volver a la tienda</span>
        </button>

        <button
          onClick={toggleTheme}
          style={{
            height: 38, width: 38, borderRadius: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: theme === 'dark' ? '#FFB800' : 'var(--text)',
            boxShadow: 'var(--shadowSm)',
          }}
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          aria-label="Cambiar tema"
        >
          <span className="ms" style={{ fontSize: 19 }}>
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>

      <h1 className="co-title">Finalizar pedido</h1>
      {store?.name && (
        <div style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 600, marginTop: -2, marginBottom: 12 }}>
          {store.name}
        </div>
      )}

      {/* Stepper Pro 1:1 de Tura Sofa: ❶ Entrega — ❷ Pago — 3 Confirmación */}
      <ol className="co-stepper">
        <li className={dataOk && addrOk ? 'on done' : 'on'}>
          <span className="st-n">
            {dataOk && addrOk ? <span className="ms ms-fill" style={{ fontSize: 14 }}>check</span> : 1}
          </span>
          <span>Entrega</span>
        </li>
        <li className={dataOk && addrOk ? 'on' : ''}>
          <span className="st-n">2</span>
          <span>Pago</span>
        </li>
        <li>
          <span className="st-n">3</span>
          <span>Confirmación</span>
        </li>
      </ol>

      {/* Layout Principal: Dos columnas en Desktop, flujo continuo en Móvil */}
      <div className="co-layout">
        
        {/* COLUMNA PRINCIPAL */}
        <div className="co-main">

          {/* ========================================================
              PANEL 1: DATOS DE ENTREGA Y CONTACTO (Minimalista & PRO)
              ======================================================== */}
          <section className="co-panel">
            <header className="ckp-h" style={{ marginBottom: 16 }}>
              <span className={'ckp-n' + (dataOk && addrOk ? ' ok' : '')}>
                {dataOk && addrOk ? <span className="ms ms-fill" style={{ fontSize: 18 }}>check</span> : 1}
              </span>
              <div className="ckp-h-text">
                <h2>Datos de entrega</h2>
                <p>Indica la dirección y tus datos de contacto en Buenaventura.</p>
              </div>
            </header>

            {/* Selector de Modo: Domicilio vs Recoger */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'var(--surface2)', padding: 4, borderRadius: 14, marginBottom: 14 }}>
              {[
                { id: 'delivery', label: 'A Domicilio', icon: 'electric_moped' },
                { id: 'pickup', label: 'Recoger en local', icon: 'storefront' },
              ].map((m) => {
                const on = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    style={{
                      height: 40, borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      background: on ? 'var(--text)' : 'transparent',
                      color: on ? 'var(--bg)' : 'var(--muted)',
                      transition: 'all .15s ease',
                      boxShadow: on ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {mode === 'delivery' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Selector de Dirección ULTRA PRO con GPS en 1 Toque y Mapa */}
                {!address?.address ? (
                  <div
                    style={{
                      padding: '16px', borderRadius: 18,
                      background: 'var(--surface2)',
                      border: '1.5px solid rgba(255,68,31,0.22)',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="gps-radar-wrap">
                        {gpsDetecting && (
                          <>
                            <div className="gps-radar-wave" />
                            <div className="gps-radar-wave" />
                          </>
                        )}
                        <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--primary)' }}>
                          {gpsDetecting ? 'radar' : 'my_location'}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>
                          {gpsDetecting ? 'Detectando satélites en Buenaventura...' : 'Ubicar automáticamente por GPS'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {gpsDetecting ? 'Calculando coordenadas de alta precisión...' : 'Detecta tu dirección en 1 toque sin escribir nada'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 8 }}>
                      <button
                        type="button"
                        onClick={handleQuickGps}
                        disabled={gpsDetecting}
                        style={{
                          height: 42, borderRadius: 12, border: 'none',
                          background: 'var(--text)', color: 'var(--bg)',
                          fontSize: 13, fontWeight: 800, display: 'flex',
                          alignItems: 'center', justifyContent: 'center', gap: 7,
                          cursor: 'pointer', transition: 'all .15s ease',
                        }}
                      >
                        <span className="ms ms-fill" style={{ fontSize: 17, color: 'var(--amber)' }}>bolt</span>
                        <span>{gpsDetecting ? 'Localizando...' : 'Detectar con GPS'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddressOpen(true)}
                        style={{
                          height: 42, borderRadius: 12,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          color: 'var(--text)', fontSize: 13, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          cursor: 'pointer',
                        }}
                      >
                        <span className="ms" style={{ fontSize: 18 }}>map</span>
                        <span>Elegir en mapa</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px 16px', borderRadius: 18,
                      background: 'var(--surface2)',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 12, background: 'var(--surface)', display: 'grid', placeItems: 'center', flex: 'none', color: 'var(--primary)', border: '1px solid var(--border)' }}>
                        <span className="ms ms-fill" style={{ fontSize: 20 }}>location_on</span>
                        <span className="gps-live-dot" />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {address.address}
                        </div>
                        {address.neighborhood && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                            Barrio: {address.neighborhood}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
                      <button
                        type="button"
                        onClick={handleQuickGps}
                        disabled={gpsDetecting}
                        title="Actualizar GPS en 1 toque"
                        style={{
                          height: 34, padding: '0 10px', borderRadius: 999,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          fontSize: 12, fontWeight: 800, color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                        }}
                      >
                        <span className="ms ms-fill" style={{ fontSize: 15, animation: gpsDetecting ? 'spin 1s linear infinite' : 'none' }}>
                          {gpsDetecting ? 'progress_activity' : 'my_location'}
                        </span>
                        <span>GPS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAddressOpen(true)}
                        style={{
                          height: 34, padding: '0 12px', borderRadius: 999,
                          background: 'var(--text)', border: 'none',
                          fontSize: 12, fontWeight: 800, color: 'var(--bg)',
                          cursor: 'pointer',
                        }}
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Notas / Referencia */}
                <label className="co-tf">
                  <input
                    type="text"
                    className="co-tf-input"
                    placeholder=" "
                    value={deliveryInstructionsText}
                    onChange={(e) => setDeliveryInstructionsText(e.target.value)}
                  />
                  <span className="co-tf-label">Punto de referencia o notas (opcional)</span>
                </label>
              </div>
            ) : (
              <div style={{
                padding: '14px 16px', borderRadius: 16, background: 'var(--surface2)',
                border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6,
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ms ms-fill" style={{ fontSize: 18, color: 'var(--primary)' }}>storefront</span>
                  <span style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>{store?.name || businessName}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                  📍 {store?.address || 'Restaurante en Buenaventura, Valle del Cauca.'}
                </div>
              </div>
            )}

            {/* Horario de Entrega: Chips Limpios */}
            <div style={{ margin: '14px 0 16px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Horario de entrega
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setWhen('asap')}
                  style={{
                    padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: when === 'asap' ? 'var(--text)' : 'var(--surface2)',
                    color: when === 'asap' ? 'var(--bg)' : 'var(--text)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'all .15s ease',
                  }}
                >
                  <span className="ms ms-fill" style={{ fontSize: 18, color: when === 'asap' ? 'var(--bg)' : 'var(--primary)' }}>bolt</span>
                  <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div>Lo antes posible</div>
                    <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{deliveryWindow(store?.prep_time_min ?? 25)}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setScheduleOpen(true); setWhen('scheduled'); }}
                  style={{
                    padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: when === 'scheduled' ? 'var(--text)' : 'var(--surface2)',
                    color: when === 'scheduled' ? 'var(--bg)' : 'var(--text)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                    transition: 'all .15s ease',
                  }}
                >
                  <span className="ms" style={{ fontSize: 18, color: when === 'scheduled' ? 'var(--bg)' : 'var(--primary)' }}>event</span>
                  <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                    <div>Programar</div>
                    <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{schedule?.label ?? 'Elegir hora'}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Campos de Contacto */}
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Contacto para el pedido
              </div>
              <div className="co-fgrid">
                <label className={'co-tf' + (!nameOk && customerName.length > 0 ? ' bad' : '')}>
                  <input
                    type="text"
                    className="co-tf-input"
                    placeholder=" "
                    autoComplete="name"
                    value={customerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerName(val);
                      try { localStorage.setItem('turafood_customer_name', val); } catch {}
                    }}
                  />
                  <span className="co-tf-label">Nombre completo</span>
                </label>

                <label className={'co-tf' + (!celularOk && customerPhone.length > 0 ? ' bad' : '')}>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="co-tf-input"
                    placeholder=" "
                    autoComplete="tel-national"
                    value={customerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerPhone(val);
                      try { localStorage.setItem('turafood_customer_phone', val); } catch {}
                    }}
                  />
                  <span className="co-tf-label">
                    {celularVerificado ? '✓ Cuenta verificada · Celular (WhatsApp)' : 'Celular (WhatsApp)'}
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* ========================================================
              PANEL 2: FORMA DE PAGO (Limpio y directo)
              ======================================================== */}
          <section className="co-panel">
            <header className="ckp-h" style={{ marginBottom: 16 }}>
              <span className="ckp-n ok">2</span>
              <div className="ckp-h-text">
                <h2>Forma de pago</h2>
                <p>Selecciona tu método de pago preferido.</p>
              </div>
            </header>

            <div className="co-pays">
              <button
                type="button"
                className={'co-pay' + (payMethod === 'cash' ? ' on' : '')}
                onClick={() => setPayMethod('cash')}
              >
                <span className="co-radio" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>
                      Contra entrega (Efectivo)
                    </b>
                    <em className="co-tag">RECOMENDADO</em>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    Pagas en efectivo al repartidor al recibir tu pedido.
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5, color: 'var(--text)', flex: 'none' }}>
                  {cop(turaTotal)}
                </div>
              </button>

              <button
                type="button"
                className={'co-pay' + (payMethod === 'nequi' ? ' on' : '')}
                onClick={() => setPayMethod('nequi')}
              >
                <span className="co-radio" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>
                      Nequi Directo
                    </b>
                    <em className="co-tag" style={{ background: 'rgba(125, 37, 232, 0.12)', color: '#7D25E8' }}>
                      TRANSFERENCIA DIRECTA
                    </em>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    Transfiere directo al Nequi del restaurante tras la confirmación.
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5, color: 'var(--text)', flex: 'none' }}>
                  {cop(turaTotal)}
                </div>
              </button>
            </div>

            {payMethod === 'nequi' && (
              <div style={{
                padding: '16px 18px', borderRadius: 20,
                background: 'var(--surface2)', border: '1.5px dashed var(--border)',
                display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>account_balance</span>
                  <span>Transfiere {cop(turaTotal)} a esta cuenta</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, fontSize: 13 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Banco / App</div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>Nequi</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Número de Cuenta</div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: 2, fontFamily: 'monospace', fontSize: 14 }}>
                      {store?.payment_details?.nequi || store?.phone || '313 759 4713'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Titular</div>
                    <div style={{ fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{store?.name || 'TuraFood'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const num = store?.payment_details?.nequi || store?.phone || '3137594713';
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(num.replace(/\D/g, ''));
                    }
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2500);
                  }}
                  style={{
                    height: 38, borderRadius: 12, background: 'var(--surface)',
                    border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 800,
                    color: copiado ? 'var(--green)' : 'var(--text)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                  }}
                >
                  <span className="ms" style={{ fontSize: 16 }}>{copiado ? 'check' : 'content_copy'}</span>
                  <span>{copiado ? '¡Número copiado!' : 'Copiar número Nequi'}</span>
                </button>
              </div>
            )}
          </section>

        </div>


        {/* COLUMNA LATERAL (RESUMEN DE COMPRA — MOBILE FIRST TURA SOFA + RAPPI) */}
        <aside className="co-side">
          <section className="co-panel" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
            
            {/* Header del Resumen con Logo del Restaurante */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              {store?.cover_url && (
                <Cover src={store.cover_url} alt={store.name} radius={12} sizes="48px" style={{ width: 44, height: 44, flex: 'none' }} />
              )}
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  Resumen de compra
                </div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16, marginTop: 1, color: 'var(--text)' }}>
                  {store?.name || businessName}
                </div>
              </div>
            </div>

            {/* Líneas de productos Mobile-First estilo Tura Sofa con MD3 Stepper */}
            <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 14px', display: 'flex', flexDirection: 'column' }}>
              {items.map((it, idx) => {
                const lId = it.lineId || it.productId || it.id || `item-${idx}`;
                const unitPrice = it.unitPrice || it.basePrice || it.price || 0;
                const lineTotal = unitPrice * it.qty;
                return (
                  <li key={lId} className="co-prod-item">
                    <Cover
                      src={it.image_url || it.image}
                      alt={it.name}
                      radius={14}
                      sizes="56px"
                      style={{ width: 54, height: 54, flex: 'none' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                        {it.name}
                      </div>
                      {it.opts && (
                        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                          {it.opts}
                        </div>
                      )}
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                        {cop(lineTotal)}
                        {it.qty > 1 && (
                          <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--muted)', marginLeft: 4 }}>
                            ({cop(unitPrice)} c/u)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Material Design 3 Pill Stepper */}
                    <div className="md3-stepper">
                      <button
                        type="button"
                        className={'md3-stepper-btn' + (it.qty === 1 ? ' danger' : '')}
                        onClick={() => (it.qty === 1 ? removeLine(lId) : updateQty(lId, it.qty - 1))}
                        aria-label={it.qty === 1 ? 'Eliminar' : 'Restar'}
                      >
                        <span className="ms" style={{ fontSize: 15 }}>
                          {it.qty === 1 ? 'delete' : 'remove'}
                        </span>
                      </button>
                      <span className="md3-stepper-val">{it.qty}</span>
                      <button
                        type="button"
                        className="md3-stepper-btn"
                        onClick={() => updateQty(lId, it.qty + 1)}
                        aria-label="Sumar"
                      >
                        <span className="ms" style={{ fontSize: 15 }}>add</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Toggle de Prioridad Turbo con Switch MD3 */}
            <div
              onClick={() => setTurbo(!turbo)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 16, cursor: 'pointer',
                background: turbo ? 'rgba(255,68,31,0.06)' : 'var(--surface2)',
                border: turbo ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                transition: 'all .15s ease',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ms ms-fill" style={{ fontSize: 20, color: turbo ? 'var(--primary)' : 'var(--amber)' }}>bolt</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Prioridad Turbo</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Despacho preferencial en Buenaventura</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary)' }}>+ $2.500</span>
                <div className={'md3-switch' + (turbo ? ' on' : '')}>
                  <div className="md3-switch-thumb" />
                </div>
              </div>
            </div>

            {/* Selector de Propina Estilo Rappi (Material Design 3 Chips) */}
            <div className="rappi-tip-box" style={{ marginBottom: 12 }}>
              <div className="rappi-tip-header">
                <div className="rappi-tip-title">
                  <span>Propina para el repartidor</span>
                </div>
                <span className="rappi-tip-sub">100% para el repartidor</span>
              </div>

              <div className="rappi-tip-chips">
                {TIPS.map((tp) => {
                  const on = tip === tp.value;
                  return (
                    <button
                      key={tp.label}
                      type="button"
                      onClick={() => setTip(tp.value)}
                      className={'rappi-chip' + (on ? ' on' : '')}
                    >
                      {tp.emoji && <span>{tp.emoji}</span>}
                      <span>{tp.label}</span>
                      {tp.popular && (
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: 'uppercase',
                          background: on ? 'rgba(255,255,255,0.25)' : 'var(--primarySoft)',
                          color: on ? '#fff' : 'var(--primary)',
                          padding: '2px 5px', borderRadius: 99, marginLeft: 2,
                        }}>
                          Top
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {tip > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11.5, fontWeight: 700, color: 'var(--green)',
                  paddingTop: 2,
                }}>
                  <span className="ms ms-fill" style={{ fontSize: 15 }}>volunteer_activism</span>
                  <span>¡Muchas gracias! Tu propina va directa al repartidor.</span>
                </div>
              )}
            </div>

            {/* Input de Cupón */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Cupón de descuento..."
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  style={{
                    flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface2)', padding: '0 12px', fontSize: 13, fontWeight: 700,
                    textTransform: 'uppercase', color: 'var(--text)', outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  style={{
                    padding: '0 16px', height: 42, borderRadius: 12, background: 'var(--text)',
                    color: 'var(--bg)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Aplicar
                </button>
              </div>
              {couponMsg && (
                <div style={{ fontSize: 12, fontWeight: 700, color: couponMsg.ok ? 'var(--green)' : '#EF4444', marginTop: 6 }}>
                  {couponMsg.text}
                </div>
              )}
            </div>

            {/* Desglose de Costos estilo Tura Sofa */}
            <div className="co-sum">
              <div className="co-sum-r">
                <span>Subtotal productos</span>
                <span>{cop(t.subtotal)}</span>
              </div>
              {mode === 'delivery' && (
                <div className={'co-sum-r' + (t.delivery === 0 ? ' green' : '')}>
                  <span>Envío estimado</span>
                  <span>{t.delivery === 0 ? 'Gratis' : cop(t.delivery)}</span>
                </div>
              )}
              <div className="co-sum-r">
                <span>Tarifa de servicio</span>
                <span>{cop(t.service)}</span>
              </div>
              {turbo && (
                <div className="co-sum-r">
                  <span>Prioridad Turbo (⚡)</span>
                  <span>{cop(2500)}</span>
                </div>
              )}
              {t.tip > 0 && (
                <div className="co-sum-r">
                  <span>Propina repartidor</span>
                  <span>{cop(t.tip)}</span>
                </div>
              )}
              {t.discount > 0 && (
                <div className="co-sum-r green">
                  <span>Descuento cupón</span>
                  <span>− {cop(t.discount)}</span>
                </div>
              )}
              <div className="co-sum-r total">
                <span>Total</span>
                <span>{cop(turaTotal)}</span>
              </div>
            </div>

            {/* Bloque Split de Pago (1:1 Tura Sofa - Dos Tarjetas Lado a Lado) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '4px 0 8px' }}>
              <div style={{
                padding: '14px 16px', borderRadius: 18,
                background: payMethod === 'nequi' ? 'var(--text)' : 'var(--surface2)',
                color: payMethod === 'nequi' ? 'var(--bg)' : 'var(--text)',
                display: 'flex', flexDirection: 'column', gap: 2,
                transition: 'all .2s ease',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                  {payMethod === 'nequi' ? 'Pagas por Nequi' : 'Pagas hoy'}
                </span>
                <b style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>
                  {payMethod === 'nequi' ? cop(turaTotal) : '$0'}
                </b>
              </div>

              <div style={{
                padding: '14px 16px', borderRadius: 18,
                background: payMethod === 'cash' ? 'var(--text)' : 'var(--surface2)',
                color: payMethod === 'cash' ? 'var(--bg)' : 'var(--text)',
                display: 'flex', flexDirection: 'column', gap: 2,
                transition: 'all .2s ease',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                  {payMethod === 'cash' ? 'Pagas al recibir' : 'Al recibir'}
                </span>
                <b style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>
                  {payMethod === 'cash' ? cop(turaTotal) : '$0'}
                </b>
              </div>
            </div>

            {/* Mensaje de Error si hay validación pendiente */}
            {error && (
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: 12.5, fontWeight: 700, marginBottom: 8 }}>
                {error}
              </div>
            )}

            {/* Botón Principal de Confirmación */}
            <button
              type="button"
              className="co-btn-brand"
              onClick={() => handlePlaceOrder(payMethod)}
              disabled={placing || Boolean(falta && !faltaDireccion)}
            >
              <span>{placing ? 'Enviando Pedido...' : (falta ?? 'Confirmar pedido')}</span>
              <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>

            {/* Botón Alternativo de WhatsApp */}
            <button
              type="button"
              className="co-btn-wa"
              onClick={handleWhatsAppDirect}
              disabled={placing}
            >
              <WhatsAppIcon size={19} color="#25D366" />
              <span>Pedir por WhatsApp · {cop(turaTotal)}</span>
            </button>

            <p className="co-fine">
              🔒 Verificamos tu pedido y te confirmamos por notificación y WhatsApp. Al confirmar autorizas la gestión de tu orden.
            </p>
          </section>
        </aside>

      </div>

      {/* Barra Flotante Inferior en Pantallas Móviles */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
          background: 'var(--surface)', borderTop: '1px solid var(--border)',
          padding: '12px 18px calc(14px + env(safe-area-inset-bottom, 0px))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>Total</div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>
            {cop(turaTotal)}
          </div>
        </div>

        <button
          type="button"
          className="co-btn-brand"
          onClick={() => handlePlaceOrder(payMethod)}
          disabled={placing || Boolean(falta && !faltaDireccion)}
          style={{ flex: 1, height: 48, fontSize: 14.5 }}
        >
          <span>{placing ? 'Enviando...' : (falta ?? 'Confirmar pedido')}</span>
          <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
        </button>
      </div>

      {/* Modal de Hojas Secundarias: Dirección, Horario, Verificación SMS */}
      <AddressSheet
        open={addressOpen}
        onClose={() => setAddressOpen(false)}
        recientes={addresses.filter((a) => a.lat != null && a.lng != null)}
        onSave={async (payload) => {
          const nueva = await saveAddress({ ...payload, isDefault: true });
          setAddresses([{ ...nueva, is_default: true }, ...addresses.map(a => ({ ...a, is_default: false }))]);
          setAddressOpen(false);
        }}
      />

      <ScheduleSheet
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSelect={(slot) => { setSchedule(slot); setWhen('scheduled'); }}
        address={address?.address}
        business={store}
        selected={schedule}
      />

      {verificarOpen && (
        <VerificarCelular
          celular={customerPhone}
          correoInicial={correoGuardado}
          onVerificado={alVerificar}
          onCerrar={() => setVerificarOpen(false)}
          onCambiarNumero={() => {
            setVerificarOpen(false);
            setTimeout(() => document.querySelector('input[type="tel"]')?.focus(), 80);
          }}
        />
      )}

      <PaymentSheet
        open={paySheetOpen}
        onClose={() => !placing && setPaySheetOpen(false)}
        onConfirm={handlePlaceOrder}
        totals={t}
        businessName={store?.name}
        method={payMethod}
        onMethodChange={setPayMethod}
        methods={[
          { id: 'cash', label: 'Efectivo al recibir', subtitle: 'Pagas contraentrega en efectivo al repartidor' },
          { id: 'nequi', label: 'Nequi Directo', subtitle: 'Transfiere directo al Nequi del restaurante' },
        ]}
        payDetails={store?.payment_details}
        busy={placing}
        error={error}
      />
    </div>
  );
}
