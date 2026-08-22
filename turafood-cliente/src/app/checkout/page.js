'use client';

/**
 * CONFIRMAR PEDIDO
 * Conversión 1:1 de `isCheckout` (línea 887) del mockup del cliente.
 *
 * El pedido se crea con `placeOrder()`, que llama al RPC del servidor:
 * aquí solo se manda QUÉ se pide, nunca CUÁNTO cuesta. El total que se
 * ve es una estimación para pantalla; el que vale lo devuelve el servidor.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useThemeStore } from '@/store/useThemeStore';
import { anotarVarios } from '@/lib/eventos';
import { getBusiness, getAddresses, getCoupons, placeOrder, saveAddress } from '@/lib/data';
import AddressSheet from '../components/AddressSheet';
import { quote, validateCoupon } from '@/lib/pricing';
import { payForOrder, PAYMENT_METHODS } from '@/services/payment';
import { cop, deliveryWindow } from '@/lib/format';
import { comandaWhatsapp, linkWhatsapp } from '@/lib/comandaWhatsapp';
import PaymentSheet from '../components/PaymentSheet';
import ScheduleSheet from '../components/ScheduleSheet';
import { Cover } from '../components/Media';

const ALL_PAYMENT_METHODS = [
  {
    id: 'cash',
    label: 'Efectivo al recibir',
    subtitle: 'Pagas contraentrega en efectivo al repartidor al recibir tu pedido',
    icon: 'payments',
    iconColor: '#FF9800',
    iconBg: 'rgba(255, 152, 0, 0.12)',
    badge: 'Sin recargos',
    badgeColor: '#FF9800',
  },
  {
    id: 'nequi',
    label: 'Nequi Directo',
    subtitle: 'Transfiere directo al Nequi del restaurante tras su confirmación previa',
    icon: 'account_balance_wallet',
    iconColor: '#7D25E8',
    iconBg: 'rgba(125, 37, 232, 0.12)',
    badge: 'Transferencia 0%',
    badgeColor: '#7D25E8',
  },
];

const metodosDelNegocio = (store) => ALL_PAYMENT_METHODS;

const TIPS = [
  { label: '0', value: 0 },
  { label: '1k', value: 1000 },
  { label: '2k', value: 2000 },
  { label: '3k', value: 3000 },
  { label: '5k', value: 5000 },
];

export default function CheckoutPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const items = useCartStore((s) => s.items);
  const businessId = useCartStore((s) => s.businessId);
  const businessName = useCartStore((s) => s.businessName);
  const businessImage = useCartStore((s) => s.businessImage);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const toOrderItems = useCartStore((s) => s.toOrderItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const [wizardStep, setWizardStep] = useState(1); // 1: Pedido y Entrega, 2: Método de Pago
  const [store, setStore] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [deliveryAddressText, setDeliveryAddressText] = useState('Carrera 3 # 4-58, Centro, Buenaventura');
  const [deliveryInstructionsText, setDeliveryInstructionsText] = useState('');
  const [addressOpen, setAddressOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);

  const [mode, setMode] = useState('delivery');
  const [payMethod, setPayMethod] = useState('cash');
  const [payOpen, setPayOpen] = useState(false);
  const [tip, setTip] = useState(2000);
  const [when, setWhen] = useState('asap');
  const [schedule, setSchedule] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);

  const [turbo, setTurbo] = useState(false);
  const [placing, setPlacing] = useState(false);
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
        if (addrs?.length && addrs[0].address) {
          setDeliveryAddressText(addrs[0].address);
          if (addrs[0].detail) setDeliveryInstructionsText(addrs[0].detail);
        }
        setCoupons(cps);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => { alive = false; };
  }, [businessId]);

  const metodos = ALL_PAYMENT_METHODS;

  const address = addresses.find((a) => a.is_default) ?? addresses[0] ?? { id: 'default', address: deliveryAddressText, detail: deliveryInstructionsText };

  const setAddress = (addr) => {
    if (addr.address) setDeliveryAddressText(addr.address);
    if (addr.detail !== undefined) setDeliveryInstructionsText(addr.detail);
    setAddresses((prev) => {
      const existing = prev.filter((a) => a.id !== addr.id);
      return [{ ...addr, is_default: true }, ...existing.map((a) => ({ ...a, is_default: false }))];
    });
  };

  const t = quote({
    subtotal,
    deliveryFee: store?.delivery_fee ?? 0,
    mode,
    tip,
    coupon,
  });

  const turaTotal = t.total + (turbo ? 2500 : 0);
  const otherSubtotal = subtotal * 1.18;
  const otherDelivery = (store?.delivery_fee ?? 0) + 2500;
  const otherService = 3900;
  const otherTotal = otherSubtotal + otherDelivery + otherService;
  const ahorro = Math.max(0, Math.round(otherTotal - turaTotal));

  const falta = items.length === 0
    ? 'Canasta vacía'
    : (mode === 'delivery' && !deliveryAddressText.trim())
      ? 'Ingresa tu dirección'
      : null;

function WhatsAppIcon({ size = 20, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flex: 'none' }}>
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.969.54 1.861.855 2.796.855 3.18 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766zm0 10.428c-.838 0-1.637-.238-2.327-.67l-.167-.105-1.733.454.463-1.689-.115-.183c-.477-.759-.728-1.558-.727-2.469.001-2.568 2.09-4.657 4.607-4.657 2.518 0 4.607 2.089 4.607 4.657 0 2.568-2.09 4.657-4.607 4.657zm2.531-3.486c-.139-.069-.823-.406-.95-.452-.128-.046-.221-.069-.315.069-.093.139-.361.452-.443.545-.081.093-.163.104-.302.035-.139-.069-.587-.216-1.118-.689-.413-.368-.692-.823-.773-.962-.081-.139-.009-.214.061-.283.063-.063.139-.163.209-.244.069-.081.093-.139.139-.232.046-.093.023-.174-.012-.244-.035-.069-.315-.758-.431-1.039-.113-.273-.228-.236-.314-.24l-.268-.005c-.093 0-.244.035-.372.174-.128.139-.488.476-.488 1.16 0 .684.499 1.345.569 1.438.069.093.982 1.5 2.378 2.103.332.143.591.229.793.293.333.106.637.091.877.055.267-.04.823-.336.939-.661.116-.325.116-.603.081-.661-.035-.058-.128-.093-.267-.162z"/>
      <path d="M12.004 2c-5.523 0-10 4.477-10 10 0 1.769.459 3.49 1.332 5.006l-1.336 4.877 5.002-1.312c1.472.803 3.134 1.229 4.824 1.229 5.522 0 10-4.477 10-10s-4.478-10-10.002-10zm0 18.25c-1.503 0-2.977-.406-4.264-1.174l-.306-.182-3.167.83.845-3.088-.199-.317c-.843-1.343-1.288-2.903-1.288-4.519 0-4.549 3.701-8.25 8.252-8.25 4.551 0 8.252 3.701 8.252 8.25s-3.701 8.25-8.252 8.25z"/>
    </svg>
  );
}

  const applyCoupon = () => {
    const res = validateCoupon(couponInput, coupons, subtotal);
    setCoupon(res.coupon);
    setCouponMsg(res.message ? { text: res.message, ok: res.ok } : null);
  };

  const handlePlaceOrder = async (overrideMethod) => {
    const methodToUse = overrideMethod || payMethod || 'cash';
    setError(null);

    if (mode === 'delivery' && !deliveryAddressText.trim()) {
      setError('Agrega una dirección de entrega antes de continuar.');
      return;
    }

    setPlacing(true);
    try {
      // 1. El servidor o la base de datos crea y persiste el pedido real
      const order = await placeOrder({
        businessId,
        items: toOrderItems(),
        mode,
        addressId: address?.id ?? null,
        deliveryAddress: deliveryAddressText,
        deliveryInstructions: deliveryInstructionsText,
        tip: t.tip,
        couponCode: coupon?.code ?? null,
        paymentMethod: methodToUse,
        subtotal: t.subtotal,
        deliveryFee: t.delivery,
        serviceFee: t.service,
        discount: t.discount,
        total: t.total,
      });

      const productos = items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice || i.basePrice || i.price || 0,
        opts: i.opts || '',
        notes: i.notes || '',
      }));

      const targetPhone = store?.whatsapp_phone || store?.phone || '+573026886449';
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
          delivery_address: deliveryAddressText,
          delivery_instructions: deliveryInstructionsText,
          payment_method: methodToUse,
        },
        productos,
        {
          negocio: store?.name,
          cliente: 'Cliente Tura Food',
          numeroPago: store?.nequi_phone || store?.phone || '',
        }
      );

      const whatsappUrl = linkWhatsapp(targetPhone, comandaText);

      // Guardar comanda, orden activa y enlace de WhatsApp para que en /tracking siempre esté disponible
      if (typeof window !== 'undefined') {
        try {
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

      // Vibración háptica suave en móvil
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([40, 60, 40]); } catch {}
      }

      // 2. Navegar de inmediato a la pantalla de tracking con el ticket generado
      router.push(`/tracking?order=${order?.id || 'current'}`);

      // 3. Abrir WhatsApp por defecto en nueva ventana
      if (whatsappUrl && typeof window !== 'undefined') {
        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 200);
      }
    } catch (err) {
      setError(err.message);
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    let lastOrder = null;
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('turafood_active_order') || localStorage.getItem('turafood_last_order');
        if (cached) lastOrder = JSON.parse(cached);
      } catch {}
    }

    return (
      <>
        <div style={S.empty}>
          <span className="ms ms-fill" style={{ fontSize: 48, color: 'var(--primary)' }}>
            {lastOrder ? 'receipt_long' : 'shopping_basket'}
          </span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, marginTop: 14 }}>
            {lastOrder ? '¡Pedido en curso!' : 'No hay productos en la canasta'}
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 300, textAlign: 'center' }}>
            {lastOrder
              ? `Tu pedido #${lastOrder.order_number || ''} está registrado. Puedes ver tu pedido y mapa GPS en tiempo real.`
              : 'Explora nuestros restaurantes en Buenaventura y agrega deliciosos platos.'}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
            {lastOrder && (
              <button
                onClick={() => router.push(`/tracking?order=${lastOrder.id || 'current'}`)}
                style={{ ...S.emptyBtn, background: 'var(--primary)', color: '#fff', border: 'none' }}
              >
                <span className="ms ms-fill" style={{ fontSize: 18 }}>near_me</span>
                <span>Ver Pedido y GPS</span>
              </button>
            )}
            <button onClick={() => router.push('/home')} style={S.emptyBtn}>
              Ver restaurantes
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>
        {/* Encabezado y Pasos Centrados y Expandidos en Desktop */}
        <div className="desktop-only" style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => router.push('/cart')} style={S.backBtn} aria-label="Volver a la canasta">
                <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
              </button>
              <div>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
                  Confirmar pedido
                </span>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                  {store?.name ?? 'Cargando negocio…'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            </div>
          </div>
        </div>

        {/* ============================================================
            VISTA DESKTOP EXPANDIDA: 1 SOLO CHECKOUT DIRECTO (2 COLUMNAS)
            ============================================================ */}
        <div className="desktop-only sc" style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 60px', minHeight: 0, width: '100%', maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* COLUMNA IZQUIERDA: INFORMACIÓN ESENCIAL COMPLETA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* 1. SECCIÓN: PRODUCTOS EN TU CANASTA */}
              <div style={{ ...S.card, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>shopping_bag</span>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
                      Productos ({items.length})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{store?.name || businessName}</span>
                    <button
                      onClick={() => clearCart()}
                      style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                      title="Vaciar toda la canasta"
                    >
                      Vaciar
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <Cover
                        src={it.image_url || it.image}
                        alt={it.name}
                        radius={14}
                        sizes="58px"
                        style={{ width: 56, height: 56, flex: 'none' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{it.name}</div>
                        {it.opts && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{it.opts}</div>}
                        <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--text)', marginTop: 4, fontFamily: 'var(--font-bricolage)' }}>
                          {cop((it.unitPrice || it.basePrice || it.price || 0) * it.qty)}
                        </div>
                      </div>

                      {/* Selector de cantidad interactivo estilo Canasta */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', borderRadius: 99, padding: '3px 6px', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => (it.qty === 1 ? removeLine(it.id) : updateQty(it.id, it.qty - 1))}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: it.qty === 1 ? '#EF4444' : 'var(--text)' }}
                          aria-label={it.qty === 1 ? 'Eliminar' : 'Restar'}
                        >
                          <span className="ms" style={{ fontSize: 17 }}>{it.qty === 1 ? 'delete' : 'remove'}</span>
                        </button>
                        <span style={{ fontSize: 13.5, fontWeight: 800, minWidth: 20, textAlign: 'center', color: 'var(--text)' }}>{it.qty}</span>
                        <button
                          onClick={() => updateQty(it.id, it.qty + 1)}
                          style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--primary)' }}
                          aria-label="Sumar"
                        >
                          <span className="ms" style={{ fontSize: 17 }}>add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. PRIORIDAD TURBO INTERACTIVA */}
              <div
                onClick={() => setTurbo(!turbo)}
                style={{
                  ...S.card,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: turbo ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                  background: turbo ? 'rgba(255,68,31,0.04)' : 'var(--surface)',
                  transition: 'all .18s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 12,
                    background: turbo ? 'linear-gradient(135deg, #FF441F, #E2360F)' : 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: turbo ? '#fff' : 'var(--amber)', flex: 'none',
                  }}>
                    <span className="ms ms-fill" style={{ fontSize: 20 }}>bolt</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>Prioridad Turbo</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Prepáralo y envíalo primero en Buenaventura</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--primary)' }}>+ $2.500</span>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: turbo ? '6px solid var(--primary)' : '2px solid var(--border)',
                    background: turbo ? '#fff' : 'transparent',
                    transition: 'all .15s ease',
                  }} />
                </div>
              </div>

              {/* 3. BANNER DE AHORRO TURAFOOD (OBSIDIAN VERDE ESMERALDA) */}
              <div style={{
                borderRadius: 20,
                background: 'linear-gradient(135deg, #0A1F18 0%, #05140F 100%)',
                border: '1px solid rgba(16,185,129,0.22)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'rgba(16,185,129,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--green)', flex: 'none',
                }}>
                  <span className="ms" style={{ fontSize: 24 }}>savings</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--green)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    MES DE LANZAMIENTO TURAFOOD
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginTop: 2 }}>
                    Estás ahorrando {cop(ahorro > 0 ? ahorro : 9342)}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
                    En otras apps pagarías {cop(turaTotal + (ahorro > 0 ? ahorro : 9342))}
                  </div>
                </div>
              </div>

              {/* 4. DIRECCIÓN DE ENTREGA Y DETALLE */}
              <div style={{ ...S.card, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>location_on</span>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5 }}>
                      Dirección de Entrega
                    </span>
                  </div>
                  <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 10, padding: 3, gap: 4 }}>
                    {[
                      { id: 'delivery', label: 'Domicilio', icon: 'electric_moped' },
                      { id: 'pickup', label: 'Recoger', icon: 'storefront' },
                    ].map((m) => {
                      const active = mode === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setMode(m.id)}
                          style={{
                            height: 28, padding: '0 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: active ? 'var(--primary)' : 'transparent',
                            color: active ? '#fff' : 'var(--muted)',
                            cursor: 'pointer', border: 'none', transition: 'all .15s',
                          }}
                        >
                          <span className="ms" style={{ fontSize: 15 }}>{m.icon}</span>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {mode === 'delivery' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span className="ms" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--muted)' }}>home</span>
                        <input
                          value={deliveryAddressText}
                          onChange={(e) => setDeliveryAddressText(e.target.value)}
                          placeholder="Dirección en Buenaventura (Ej. Carrera 3 # 4-58)"
                          style={{
                            width: '100%', height: 42, borderRadius: 12, padding: '0 12px 0 38px',
                            border: '1px solid var(--border)', background: 'var(--surface2)',
                            fontSize: 13.5, color: 'var(--text)', outline: 'none', fontWeight: 600,
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (navigator.geolocation) {
                            navigator.geolocation.getCurrentPosition(
                              () => setDeliveryAddressText('Buenaventura, Valle del Cauca (Ubicación Actual)'),
                              () => setDeliveryAddressText('Centro, Buenaventura')
                            );
                          }
                        }}
                        style={{
                          padding: '0 14px', height: 42, borderRadius: 12, background: 'var(--surface2)',
                          border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 800, color: 'var(--primary)',
                          display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', flex: 'none',
                        }}
                      >
                        <span className="ms" style={{ fontSize: 16 }}>my_location</span>
                        <span>GPS</span>
                      </button>
                    </div>

                    {/* Chips de Barrios Rápidos */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', flex: 'none' }}>Barrios:</span>
                      {['Centro', 'Pueblo Nuevo', 'La Independencia', 'Bellavista', 'El Cristal'].map((b) => {
                        const active = deliveryAddressText.includes(b);
                        return (
                          <button
                            key={b}
                            onClick={() => setDeliveryAddressText(`${b}, Buenaventura`)}
                            style={{
                              padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                              background: active ? 'var(--primary)' : 'var(--surface2)',
                              color: active ? '#fff' : 'var(--text)',
                              border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                              cursor: 'pointer', transition: 'all .15s', flex: 'none',
                            }}
                          >
                            📍 {b}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      value={deliveryInstructionsText}
                      onChange={(e) => setDeliveryInstructionsText(e.target.value)}
                      placeholder="Indicaciones para el repartidor (opcional, ej. casa blanca timbre 201)"
                      style={{
                        width: '100%', height: 38, borderRadius: 10, padding: '0 12px',
                        border: '1px solid var(--border)', background: 'var(--surface2)',
                        fontSize: 12.5, color: 'var(--text)', outline: 'none',
                      }}
                    />

                    {/* Hora estimada */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700 }}>
                        <span className="ms" style={{ fontSize: 17, color: 'var(--primary)' }}>schedule</span>
                        <span>{when === 'asap' ? `Hoy, ${deliveryWindow(store?.prep_time_min ?? 20)}` : schedule?.label ?? 'Programado'}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--green)', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 999 }}>En vivo</span>
                      </div>
                      <button
                        onClick={() => (when === 'asap' ? setScheduleOpen(true) : setWhen('asap'))}
                        style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        {when === 'asap' ? 'Programar hora' : 'Lo antes posible'}
                      </button>
                    </div>

                    {/* Propina para el Repartidor Minimalista */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                        <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>volunteer_activism</span>
                        <span>Propina repartidor</span>
                      </div>
                      <div style={{ display: 'flex', gap: 3, background: 'var(--surface2)', padding: 3, borderRadius: 10, border: '1px solid var(--border)' }}>
                        {TIPS.map((tp) => {
                          const active = tip === tp.value;
                          return (
                            <button
                              key={tp.label}
                              onClick={() => setTip(tp.value)}
                              style={{
                                padding: '4px 10px', borderRadius: 7, fontSize: 11.5, fontWeight: 800,
                                background: active ? 'var(--primary)' : 'transparent',
                                color: active ? '#fff' : 'var(--muted)',
                                border: 'none',
                                cursor: 'pointer', transition: 'all .12s ease',
                              }}
                            >
                              {tp.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>

            {/* COLUMNA DERECHA: RESUMEN DE COMPRA + CUPÓN + MÉTODO DE PAGO + BOTÓN WHATSAPP (STICKY) */}
            <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...S.card, padding: 22, boxShadow: '0 12px 36px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  {store?.cover_url && (
                    <Cover src={store.cover_url} alt={store.name} radius={12} sizes="48px" style={{ width: 48, height: 48, flex: 'none' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>RESUMEN DE COMPRA</div>
                    <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5, marginTop: 1 }}>{store?.name || businessName}</div>
                  </div>
                </div>

                {/* Desglose Financiero */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
                  <Row label="Subtotal productos" value={cop(t.subtotal)} />
                  {mode === 'delivery' && (
                    <Row label="Envío estimado" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
                  )}
                  <Row label="Tarifa de servicio" value={cop(t.service)} />
                  {turbo && <Row label="Prioridad Turbo (⚡)" value={cop(2500)} />}
                  {t.tip > 0 && <Row label="Propina repartidor" value={cop(t.tip)} />}
                  {t.discount > 0 && <Row label="Descuento cupón" value={`− ${cop(t.discount)}`} green />}
                </div>

                {/* Cupón Promocional Minimalista */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Código de cupón o descuento..."
                    style={{
                      ...S.couponInput, height: 34, fontSize: 12, padding: '0 10px',
                      borderRadius: 10, background: 'var(--surface2)', flex: 1,
                    }}
                  />
                  <button
                    onClick={applyCoupon}
                    style={{
                      ...S.couponBtn, height: 34, fontSize: 12, padding: '0 14px',
                      borderRadius: 10, flex: 'none',
                    }}
                  >
                    Aplicar
                  </button>
                </div>

                {/* MÉTODO DE PAGO INTEGRADO Y MINIMALISTA */}
                <div style={{
                  padding: '12px 14px', borderRadius: 14,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  marginBottom: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                      Método de Pago
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                      {payMethod === 'cash' ? '💵 Efectivo' : '🟣 Nequi'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { id: 'cash', label: 'Efectivo', icon: 'payments', iconColor: '#FF9800', badge: 'Al recibir' },
                      { id: 'nequi', label: 'Nequi', icon: 'account_balance_wallet', iconColor: '#7D25E8', badge: 'Directo' },
                    ].map((m) => {
                      const on = payMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setPayMethod(m.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 10,
                            background: on ? 'var(--surface)' : 'transparent',
                            border: on ? '2px solid var(--green)' : '1px solid var(--border)',
                            cursor: 'pointer', transition: 'all .15s ease',
                            boxShadow: on ? '0 2px 8px rgba(16,185,129,0.14)' : 'none',
                          }}
                        >
                          <span className="ms" style={{ fontSize: 18, color: m.iconColor, flex: 'none' }}>{m.icon}</span>
                          <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.2 }}>{m.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{m.badge}</div>
                          </div>
                          {on && <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--green)', flex: 'none' }}>check_circle</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Total Destacado en Grande */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 16px', borderRadius: 14, marginBottom: 12,
                  background: 'linear-gradient(135deg, rgba(37,211,102,0.08), rgba(37,211,102,0.02))',
                  border: '1px solid rgba(37,211,102,0.22)',
                }}>
                  <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>Total</span>
                  <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-bricolage)', color: 'var(--green)' }}>
                    {cop(turaTotal)}
                  </span>
                </div>

                {/* Badge de Compra Mínima */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, marginBottom: 14, border: '1px solid rgba(16,185,129,0.15)' }}>
                  <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--green)' }}>check_circle</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Completaste el mínimo de compra</span>
                </div>

                {/* Botón Principal VERDE WhatsApp */}
                <button
                  onClick={() => handlePlaceOrder(payMethod)}
                  disabled={placing || Boolean(falta)}
                  style={{
                    width: '100%', height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, #25D366 0%, #00A884 100%)',
                    color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    opacity: falta ? 0.55 : 1,
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(37,211,102,0.35)',
                    transition: 'all .15s ease',
                  }}
                >
                  <WhatsAppIcon size={21} />
                  <span>{placing ? 'Enviando Pedido...' : (falta ?? `Pedir por WhatsApp · ${cop(turaTotal)}`)}</span>
                </button>
              </div>

              {/* Insignia de Seguridad TuraFood */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--green)' }}>shield</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Pedido 100% protegido y respaldado por <b>Tura Food AI</b>.
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================
            VISTA MÓVIL: FLUJO CONTINUO ORIGINAL 100% INTOCADO
            ============================================================ */}
        <div className="mobile-only" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/cart')} style={S.backBtn} aria-label="Volver">
              <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18 }}>
                Confirmar pedido
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                {store?.name}
              </div>
            </div>
          </div>
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

        <div className="mobile-only sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 140px', minHeight: 0 }}>
          {/* Domicilio / Recoger */}
          <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 14, padding: 4, gap: 4 }}>
            {[
              { id: 'delivery', label: 'Domicilio', icon: 'electric_moped' },
              { id: 'pickup', label: 'Recoger', icon: 'storefront' },
            ].map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, height: 42, borderRadius: 11, fontSize: 13.5, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: active ? 'var(--text)' : 'transparent',
                    color: active ? '#fff' : 'var(--muted)',
                  }}
                >
                  <span className="ms" style={{ fontSize: 18 }}>{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Dirección / pago / entrega */}
          <div style={S.card}>
            {mode === 'delivery' && (
              <button onClick={() => setAddressOpen(true)} style={S.cardRow}>
                <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>location_on</span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={S.rowLabel}>DIRECCIÓN DE ENTREGA</span>
                  <span style={S.rowValue}>{address?.address ?? 'Agrega una dirección'}</span>
                  {address?.detail && <span style={S.rowHint}>{address.detail}</span>}
                </span>
                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
              </button>
            )}

            <button onClick={() => setPayOpen((v) => !v)} style={S.cardRow} aria-expanded={payOpen}>
              <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>
                {metodos.find((m) => m.id === payMethod)?.icon ?? 'payments'}
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={S.rowLabel}>MÉTODO DE PAGO</span>
                <span style={S.rowValue}>
                  {metodos.find((m) => m.id === payMethod)?.label ?? 'Elige cómo pagar'}
                </span>
                <span style={S.rowHint}>
                  {payMethod === 'cash' && 'Pagas al recibir'}
                  {payMethod === 'whatsapp' && 'Cierras el pago con el restaurante'}
                  {payMethod !== 'cash' && payMethod !== 'whatsapp' && 'Pago en línea seguro'}
                </span>
              </span>
              <span
                className="ms"
                style={{
                  fontSize: 22, color: 'var(--faint)',
                  transform: payOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform .18s ease',
                }}
              >
                expand_more
              </span>
            </button>

            {payOpen && (
              <div style={{ padding: '4px 15px 14px', borderBottom: '1px solid var(--border)' }}>
                {metodos.map((m) => {
                  const on = payMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => { setPayMethod(m.id); setPayOpen(false); }}
                      style={{
                        ...S.payOption,
                        background: on ? '#FFF1EC' : 'transparent',
                        border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                      }}
                    >
                      <span className="ms" style={{ fontSize: 20, color: on ? 'var(--primary)' : 'var(--muted)', flex: 'none' }}>
                        {m.icon}
                      </span>
                      <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 13.5 }}>{m.label}</span>
                      {on && <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>check_circle</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hora de entrega */}
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>schedule</span>
                <span style={{ fontWeight: 800, fontSize: 14.5 }}>
                  {when === 'asap'
                    ? `Hoy, ${deliveryWindow(store?.prep_time_min ?? 20)}`
                    : schedule?.label ?? 'Programado'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 7, marginTop: 11 }}>
                {[
                  { id: 'asap', label: 'Lo antes posible' },
                  { id: 'scheduled', label: 'Programar' },
                ].map((w) => {
                  const active = when === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => (w.id === 'scheduled' ? setScheduleOpen(true) : setWhen('asap'))}
                      style={{
                        flex: 1, height: 38, borderRadius: 9, fontSize: 12.5, fontWeight: 700,
                        border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary)' : 'transparent',
                        color: active ? '#fff' : 'var(--muted)',
                        padding: '0 10px',
                      }}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Propina */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5 }}>Propina para el repartidor</div>
            <div style={{ display: 'flex', gap: 9, marginTop: 11 }}>
              {TIPS.map((tp) => {
                const active = tip === tp.value;
                return (
                  <button
                    key={tp.label}
                    onClick={() => setTip(tp.value)}
                    style={{
                      flex: 1, height: 48, borderRadius: 14, fontSize: 13.5, fontWeight: 800,
                      background: active ? 'var(--primary)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--text)',
                      border: active ? 'none' : '1px solid var(--border)',
                      boxShadow: active ? '0 4px 12px rgba(255,68,31,0.25)' : 'none',
                    }}
                  >
                    {tp.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cupón */}
          <div style={{ ...S.card, padding: 16, marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>local_activity</span>
              <span style={{ fontWeight: 800, fontSize: 15.5 }}>Cupón o código</span>
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Ej. TURA20"
                style={S.couponInput}
                aria-label="Código de cupón"
              />
              <button onClick={applyCoupon} style={S.couponBtn}>Aplicar</button>
            </div>

            {couponMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, marginTop: 11,
                fontSize: 12.5, fontWeight: 700,
                color: couponMsg.ok ? 'var(--green)' : 'var(--primary)',
              }}>
                <span className="ms" style={{ fontSize: 17 }}>
                  {couponMsg.ok ? 'check_circle' : 'error'}
                </span>
                {couponMsg.text}
              </div>
            )}

            <div className="hs" style={{ display: 'flex', gap: 8, margin: '12px -16px 0', padding: '0 16px' }}>
              {coupons.slice(0, 2).map((c) => (
                <button
                  key={c.code}
                  onClick={() => { setCouponInput(c.code); setCoupon(c); setCouponMsg({ text: c.description, ok: true }); }}
                  style={S.couponChip}
                >
                  <span className="ms" style={{ fontSize: 15 }}>sell</span>
                  {c.code}
                  {c.discount_type === 'percent' ? ` · ${c.discount_value}% OFF` : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div style={{ ...S.card, padding: 16, marginTop: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Row
                label="Subtotal" value={cop(t.subtotal)}
                why="Lo que cuestan los productos en el negocio. Los precios los pone el negocio, no nosotros."
              />
              {mode === 'delivery' && (
                <Row
                  label="Envío" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0}
                  why={t.delivery === 0
                    ? 'Hoy el envío va por cuenta del negocio.'
                    : 'Va completo para el repartidor que te lo trae. Depende de la distancia hasta tu dirección.'}
                />
              )}
              <Row
                label="Tarifa de servicio" value={cop(t.service)}
                why="Es fija, no un porcentaje. Cubre el soporte, los pagos y que la app siga funcionando."
              />
              {t.tip > 0 && (
                <Row
                  label="Propina" value={cop(t.tip)}
                  why="Se la lleva completa el repartidor. Puedes cambiarla o quitarla arriba."
                />
              )}
              {t.discount > 0 && (
                <Row
                  label="Descuento" value={`− ${cop(t.discount)}`} green
                  why="Tu cupón aplicado."
                />
              )}
            </div>
          </div>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14, padding: '0 4px' }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>shield</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45 }}>
              Pago protegido por TuraFood. Si algo sale mal con tu pedido, te devolvemos el dinero.
            </span>
          </div>
        </div>

        <div className="mobile-only" style={S.bottom}>
          <div style={{ flex: 'none' }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>Total a pagar</div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>
              {cop(t.total)}
            </div>
          </div>
          <button
            onClick={() => handlePlaceOrder(payMethod)}
            disabled={placing || Boolean(falta)}
            style={{
              flex: 1, height: 50, borderRadius: 999,
              background: 'linear-gradient(135deg, #25D366 0%, #00A884 100%)',
              color: '#fff', fontWeight: 800, fontSize: 14.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(37,211,102,0.32)',
              opacity: falta ? 0.55 : 1,
            }}
          >
            <WhatsAppIcon size={19} />
            <span>{placing ? 'Enviando...' : (falta ?? 'Pedir por WhatsApp')}</span>
          </button>
        </div>

        {/* Hoja de pago: último paso nuestro antes de la pasarela */}
        <PaymentSheet
          open={paySheetOpen}
          onClose={() => !placing && setPaySheetOpen(false)}
          onConfirm={handlePlaceOrder}
          totals={t}
          businessName={store?.name}
          method={payMethod}
          onMethodChange={setPayMethod}
          methods={metodos}
          payDetails={store?.payment_details}
          busy={placing}
          error={error}
        />

        <ScheduleSheet
          open={scheduleOpen}
          onClose={() => setScheduleOpen(false)}
          onSelect={(slot) => { setSchedule(slot); setWhen('scheduled'); }}
          address={address?.address}
          business={store}
          selected={schedule}
        />

        <AddressSheet
          open={addressOpen}
          onClose={() => setAddressOpen(false)}
          onSave={async (payload) => {
            const nueva = await saveAddress({ ...payload, isDefault: true });
            // Replace old array so the new default is at the top
            setAddresses([{ ...nueva, is_default: true }, ...addresses.map(a => ({ ...a, is_default: false }))]);
            setAddressOpen(false);
          }}
        />
      </div>
    </>
  );
}

/**
 * Una linea de la cuenta.
 *
 * Con `why`, el nombre se vuelve tocable y explica de donde sale ese
 * cobro. La sospecha de que a uno le estan metiendo plata de mas es lo
 * que hace abandonar un carrito: contestarla antes de que la pregunten
 * cuesta un renglon.
 */
function Row({ label, value, green, why }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
        {why ? (
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              color: 'var(--muted)', fontWeight: 600, fontSize: 13.5,
            }}
          >
            {label}
            <span
              className="ms"
              style={{
                fontSize: 15, color: 'var(--faint)',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform .18s ease',
              }}
            >
              expand_more
            </span>
          </button>
        ) : (
          <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
        )}
        <span style={{ fontWeight: 700, color: green ? 'var(--green)' : 'var(--text)' }}>{value}</span>
      </div>

      {open && why && (
        <p className="anim-fade" style={S.why}>{why}</p>
      )}
    </div>
  );
}

const S = {
  steps: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 8,
    padding: '0 20px 14px',
  },
  stepDot: {
    width: 20, height: 20, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800,
  },
  stepLine: {
    flex: 1, height: 2, borderRadius: 99, background: 'var(--surface2)',
  },
  why: {
    margin: '7px 0 0', padding: '9px 11px', borderRadius: 11,
    background: 'var(--surface2)', fontSize: 11.5, lineHeight: 1.5,
    color: 'var(--muted)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    marginTop: 18, background: 'var(--surface)', border: 'none',
    borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  },
  cardRow: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    padding: '16px 20px', textAlign: 'left', borderBottom: '1px solid var(--surface2)',
  },
  rowLabel: {
    display: 'block', fontSize: 11.5, color: 'var(--muted)', fontWeight: 700,
  },
  rowValue: {
    display: 'block', fontWeight: 700, fontSize: 14.5, marginTop: 2,
  },
  rowHint: {
    display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1,
  },
  payOption: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
    height: 46, padding: '0 13px', borderRadius: 13, marginTop: 8,
  },
  couponInput: {
    flex: 1, height: 48, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 14, fontWeight: 700,
    letterSpacing: '.06em', textTransform: 'uppercase', outline: 'none', minWidth: 0,
  },
  couponBtn: {
    flex: 'none', height: 48, padding: '0 20px', borderRadius: 14,
    fontWeight: 700, fontSize: 13.5, background: 'var(--surface2)', color: 'var(--text)',
  },
  couponChip: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 6, height: 34,
    padding: '0 12px', borderRadius: 999, border: '1px dashed var(--primary)',
    background: 'var(--primarySoft)', fontSize: 12, fontWeight: 800,
    color: 'var(--primary)', whiteSpace: 'nowrap',
  },
  bottom: {
    position: 'fixed', left: 0, right: 0, bottom: 0, background: 'var(--surface)',
    borderTop: '1px solid var(--border)', padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
    maxWidth: 540, margin: '0 auto', zIndex: 40,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
  },
  placeBtn: {
    flex: 1, height: 56, borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15.5, boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 14,
    padding: '12px 14px', borderRadius: 14, background: 'var(--primarySoft)',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  emptyBtn: {
    marginTop: 22, height: 52, padding: '0 28px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15,
  },
};

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 18.15c-1.49 0-2.94-.4-4.22-1.16l-.3-.18-3.13.82.84-3.05-.2-.32a8.196 8.196 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.188 8.188 0 012.42 5.83c0 4.55-3.7 8.26-8.23 8.26zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43s.17-.25.25-.41c.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.84-.86 2.06 0 1.21.89 2.39 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.18-.47-.3z" />
    </svg>
  );
}
