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
import { anotarVarios } from '@/lib/eventos';
import { getBusiness, getAddresses, getCoupons, placeOrder, saveAddress } from '@/lib/data';
import AddressSheet from '../components/AddressSheet';
import { quote, validateCoupon } from '@/lib/pricing';
import { payForOrder, PAYMENT_METHODS } from '@/services/payment';
import { cop, deliveryWindow } from '@/lib/format';
import PaymentSheet from '../components/PaymentSheet';
import ScheduleSheet from '../components/ScheduleSheet';
import { Cover } from '../components/Media';

const metodosDelNegocio = (store) => {
  const permitidos = store?.payment_methods?.length
    ? store.payment_methods
    : ['cash', 'nequi', 'daviplata', 'whatsapp'];
  return PAYMENT_METHODS.filter((m) => permitidos.includes(m.id));
};

const TIPS = [
  { label: 'Sin propina', value: 0 },
  { label: '$2.000', value: 2000 },
  { label: '$3.000', value: 3000 },
  { label: '$5.000', value: 5000 },
];

export default function CheckoutPage() {
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const businessId = useCartStore((s) => s.businessId);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const toOrderItems = useCartStore((s) => s.toOrderItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);

  const [wizardStep, setWizardStep] = useState(2); // 1: Canasta, 2: Entrega, 3: Pago
  const [store, setStore] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressOpen, setAddressOpen] = useState(false);
  const [coupons, setCoupons] = useState([]);

  const [mode, setMode] = useState('delivery');
  // Arranca vacío y se elige cuando llega la ficha del negocio: poner
  // 'nequi' por defecto mostraba un medio que el negocio podía no tener.
  const [payMethod, setPayMethod] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [tip, setTip] = useState(2000);
  const [when, setWhen] = useState('asap');
  const [schedule, setSchedule] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponMsg, setCouponMsg] = useState(null);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);

  // Llegaron hasta acá con estos productos. Lo que pase después
  // -que compren o que se vayan- lo dice el evento 'purchase'.
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
        setCoupons(cps);
      } catch (err) {
        if (alive) setError(err.message);
      }
    })();
    return () => { alive = false; };
  }, [businessId]);

  // Los medios de este negocio, y el primero como elegido. El orden de
  // PAYMENT_METHODS pone primero los de pago en línea, así que si el
  // negocio los tiene, esos quedan por defecto.
  const metodos = metodosDelNegocio(store);

  useEffect(() => {
    if (!store) return;
    setPayMethod((actual) => {
      const validos = metodosDelNegocio(store).map((m) => m.id);
      return validos.includes(actual) ? actual : (validos[0] ?? 'cash');
    });
  }, [store]);

  const address = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;

  const t = quote({
    subtotal,
    deliveryFee: store?.delivery_fee ?? 0,
    mode,
    tip,
    coupon,
  });

  const applyCoupon = () => {
    const res = validateCoupon(couponInput, coupons, subtotal);
    setCoupon(res.coupon);
    setCouponMsg(res.message ? { text: res.message, ok: res.ok } : null);
  };

  const handlePlaceOrder = async () => {
    setError(null);

    if (mode === 'delivery' && !address) {
      setError('Agrega una dirección de entrega antes de continuar.');
      return;
    }

    setPlacing(true);
    try {
      // 1. El servidor crea el pedido y calcula el total real
      const order = await placeOrder({
        businessId,
        items: toOrderItems(),
        mode,
        addressId: address?.id ?? null,
        tip,
        couponCode: coupon?.code ?? null,
        paymentMethod: payMethod,
      });

      // 2. El servicio decide: efectivo va directo a seguimiento;
      //    pago en línea crea el intento y abre la pasarela.
      //    El monto lo pone el servidor y el webhook lo revalida.
      // Los productos con su nombre y precio, para la comanda de
      // WhatsApp. Se toman ANTES de vaciar el carrito.
      const productos = items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        opts: i.opts,
        notes: i.notes,
      }));

      const { redirectTo, whatsappUrl } = await payForOrder(order, {
        method: payMethod,
        businessName: store?.name,
        items: productos,
        whatsappPhone: '+573026886449', // Forzado por ahora, como solicitó el usuario
      });

      // Si el usuario cancela en la pasarela, el pedido queda pendiente
      // y lo puede retomar desde Mis pedidos.
      // De `items`, no de `productos`: ese ya viene mapeado para la
      // comanda de WhatsApp y no lleva el id del producto.
      anotarVarios(items.map((i) => i.productId), 'purchase');
      clearCart();

      // WhatsApp se abre con `window.open` y no con un <a>: el navegador
      // lo cuenta como emergente si pasa mucho tiempo desde el clic, así
      // que va primero, apenas vuelve el pedido.
      //
      // `_blank` para que el seguimiento quede abierto atrás: si mandar
      // el mensaje reemplazara la página, la persona sale de WhatsApp y
      // no encuentra su pedido.
      if (whatsappUrl) {
        window.open(whatsappUrl, '_blank', 'noopener');
      }

      if (redirectTo) {
        router.push(redirectTo);
        return;
      }
      setPlacing(false);
    } catch (err) {
      // Los mensajes de place_order ya vienen en español y son para el usuario
      setError(err.message);
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <>
        <div style={S.empty}>
          <span className="ms" style={{ fontSize: 44, color: 'var(--faint)' }}>receipt_long</span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, marginTop: 14 }}>
            No hay nada que confirmar
          </div>
          <button onClick={() => router.push('/home')} style={S.emptyBtn}>Ver restaurantes</button>
        </div>
      </>
    );
  }

  /**
   * Lo que impide seguir, dicho en el propio boton.
   *
   * Un boton apagado sin explicacion es la peor pantalla posible: la
   * persona toca, no pasa nada, y se va. Si falta la direccion, el
   * boton dice que falta la direccion.
   */
  const falta = mode === 'delivery' && !address
    ? 'Falta tu direccion'
    : when === 'scheduled' && !schedule
      ? 'Elige la hora de entrega'
      : null;

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>
        {/* Encabezado y Pasos Centrados y Expandidos en Desktop */}
        <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '20px 24px 0' }}>
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

            {/* Wizard Steps Header */}
            <div style={{ ...S.steps, margin: 0, padding: '8px 18px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
              {[
                { id: 1, label: 'Canasta' },
                { id: 2, label: 'Confirmar' },
                { id: 3, label: 'Pagar' },
              ].map((st, i) => {
                const done = wizardStep > st.id;
                const now = wizardStep === st.id;
                return (
                  <span key={st.label} style={{ display: 'contents' }}>
                    <button
                      onClick={() => setWizardStep(st.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 8px', borderRadius: 8, transition: 'background .15s' }}
                    >
                      <span
                        style={{
                          ...S.stepDot,
                          background: done ? 'var(--green)' : now ? 'var(--text)' : 'var(--surface2)',
                          color: done || now ? '#fff' : 'var(--faint)',
                        }}
                      >
                        {done
                          ? <span className="ms" style={{ fontSize: 13 }}>check</span>
                          : st.id}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: now ? 800 : 600,
                          color: now ? 'var(--text)' : 'var(--muted)',
                        }}
                      >
                        {st.label}
                      </span>
                    </button>
                    {i < 2 && <span style={S.stepLine} />}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================
            VISTA DESKTOP EXPANDIDA: WIZARD 2 COLUMNAS
            ============================================================ */}
        <div className="desktop-only sc" style={{ flex: 1, overflowY: 'auto', padding: '12px 24px 60px', minHeight: 0, width: '100%', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 24, alignItems: 'start' }}>
            
            {/* COLUMNA IZQUIERDA: PASO ACTIVO DEL WIZARD */}
            <div>
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ ...S.card, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
                        Paso 1: Revisa tu Canasta
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', background: 'var(--surface2)', padding: '4px 10px', borderRadius: 8 }}>
                        {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {items.map((it) => (
                        <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                          {it.image && (
                            <Cover src={it.image} alt={it.productName} radius={14} sizes="56px" style={{ width: 56, height: 56, flex: 'none' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: 15 }}>{it.name}</div>
                            {it.opts && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{it.opts}</div>}
                            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                              {cop((it.unitPrice || it.basePrice || it.price || 0) * it.qty)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', borderRadius: 99, padding: '4px 8px' }}>
                            <button onClick={() => (it.qty === 1 ? removeLine(it.id) : updateQty(it.id, it.qty - 1))} style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <span className="ms" style={{ fontSize: 16 }}>{it.qty === 1 ? 'delete' : 'remove'}</span>
                            </button>
                            <span style={{ fontSize: 14, fontWeight: 800, width: 22, textAlign: 'center' }}>{it.qty}</span>
                            <button onClick={() => updateQty(it.id, it.qty + 1)} style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <span className="ms" style={{ fontSize: 16 }}>add</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setWizardStep(2)}
                    style={{
                      width: '100%', height: 54, borderRadius: 16,
                      background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                      color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      boxShadow: '0 8px 24px rgba(255,68,31,0.25)',
                    }}
                  >
                    <span>Continuar a Dirección y Entrega</span>
                    <span className="ms" style={{ fontSize: 20 }}>arrow_forward</span>
                  </button>
                </div>
              )}

              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ ...S.card, padding: 24 }}>
                    <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, marginBottom: 18 }}>
                      Paso 2: Entrega y Dirección
                    </div>

                    {/* Domicilio / Recoger */}
                    <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 14, padding: 5, gap: 6, marginBottom: 20 }}>
                      {[
                        { id: 'delivery', label: 'Domicilio en Buenaventura', icon: 'electric_moped' },
                        { id: 'pickup', label: 'Recoger en Tienda', icon: 'storefront' },
                      ].map((m) => {
                        const active = mode === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            style={{
                              flex: 1, height: 46, borderRadius: 11, fontSize: 14, fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              background: active ? 'var(--text)' : 'transparent',
                              color: active ? '#fff' : 'var(--muted)',
                              cursor: 'pointer', transition: 'all .15s',
                            }}
                          >
                            <span className="ms" style={{ fontSize: 20 }}>{m.icon}</span>
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dirección de Entrega Inline sin Overlays */}
                    {mode === 'delivery' && (
                      <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: 20, border: '1px solid var(--border)', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,68,31,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>location_on</span>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>DIRECCIÓN DE ENTREGA EN BUENAVENTURA</div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                                {address?.address ?? 'Escribe tu dirección o elige un barrio'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Input de dirección directa */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                          <div style={{ position: 'relative', flex: 1 }}>
                            <span className="ms" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, color: 'var(--muted)' }}>search</span>
                            <input
                              value={address?.address ?? ''}
                              onChange={(e) => setAddress({ id: 'custom', address: e.target.value, detail: address?.detail ?? '' })}
                              placeholder="Ej. Carrera 3 # 4-58, Centro, Buenaventura"
                              style={{
                                width: '100%', height: 46, borderRadius: 12, padding: '0 14px 0 42px',
                                border: '1px solid var(--border)', background: 'var(--surface)',
                                fontSize: 14, color: 'var(--text)', outline: 'none', fontWeight: 600,
                              }}
                            />
                          </div>
                          <button
                            onClick={() => {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  () => setAddress({ id: 'gps', address: 'Buenaventura, Valle del Cauca (Ubicación Actual)', detail: 'Ubicación GPS' }),
                                  () => setAddress({ id: 'center', address: 'Centro, Buenaventura', detail: '' })
                                );
                              }
                            }}
                            style={{
                              padding: '0 16px', height: 46, borderRadius: 12, background: 'var(--surface)',
                              border: '1px solid var(--border)', fontSize: 13, fontWeight: 800, color: 'var(--primary)',
                              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 'none',
                            }}
                          >
                            <span className="ms" style={{ fontSize: 18 }}>my_location</span>
                            <span>Mi ubicación</span>
                          </button>
                        </div>

                        {/* Chips de Barrios Populares de Buenaventura */}
                        <div>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
                            Barrios populares de Buenaventura:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {['Centro', 'Pueblo Nuevo', 'La Independencia', 'El Jorge', 'Juan XXIII', 'Bellavista', 'San Luis'].map((b) => (
                              <button
                                key={b}
                                onClick={() => setAddress({ id: b.toLowerCase(), address: `${b}, Buenaventura`, detail: '' })}
                                style={{
                                  padding: '6px 12px', borderRadius: 99, fontSize: 12.5, fontWeight: 700,
                                  background: address?.address?.includes(b) ? 'var(--text)' : 'var(--surface)',
                                  color: address?.address?.includes(b) ? '#fff' : 'var(--text)',
                                  border: '1px solid var(--border)', cursor: 'pointer', transition: 'all .15s',
                                }}
                              >
                                📍 {b}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Instrucciones de entrega */}
                    <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: 18, border: '1px solid var(--border)', marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>edit_note</span>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Indicaciones para el repartidor (Opcional)</span>
                      </div>
                      <input
                        value={address?.detail ?? ''}
                        onChange={(e) => setAddress(prev => ({ ...(prev || { id: 'custom', address: 'Buenaventura' }), detail: e.target.value }))}
                        placeholder="Ej. Casa de rejas blancas, timbre 201, dejar en recepción..."
                        style={{
                          width: '100%', height: 44, borderRadius: 12, padding: '0 14px',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          fontSize: 13.5, color: 'var(--text)', outline: 'none',
                        }}
                      />
                    </div>

                    {/* Hora de entrega */}
                    <div style={{ background: 'var(--surface2)', borderRadius: 16, padding: 18, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>schedule</span>
                          <span style={{ fontWeight: 800, fontSize: 15.5 }}>
                            {when === 'asap' ? `Entrega Estimada: Hoy, ${deliveryWindow(store?.prep_time_min ?? 20)}` : schedule?.label ?? 'Programado'}
                          </span>
                        </div>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: 'var(--green)', background: '#E6F6EE', padding: '4px 10px', borderRadius: 999 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                          En vivo
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        {[
                          { id: 'asap', label: 'Lo antes posible' },
                          { id: 'scheduled', label: 'Programar para más tarde' },
                        ].map((w) => {
                          const active = when === w.id;
                          return (
                            <button
                              key={w.id}
                              onClick={() => (w.id === 'scheduled' ? setScheduleOpen(true) : setWhen('asap'))}
                              style={{
                                flex: 1, height: 42, borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                                border: active ? '1.5px solid var(--text)' : '1px solid var(--border)',
                                background: active ? 'var(--text)' : 'var(--surface)',
                                color: active ? '#fff' : 'var(--muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {w.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <button
                      onClick={() => setWizardStep(1)}
                      style={{
                        flex: 1, height: 54, borderRadius: 16,
                        background: 'var(--surface)', color: 'var(--text)',
                        border: '1px solid var(--border)', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                      <span>Volver a Canasta</span>
                    </button>
                    <button
                      onClick={() => setWizardStep(3)}
                      style={{
                        flex: 1.4, height: 54, borderRadius: 16,
                        background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                        color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 24px rgba(255,68,31,0.25)',
                      }}
                    >
                      <span>Continuar al Pago</span>
                      <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Método de pago */}
                  <div style={{ ...S.card, padding: 24 }}>
                    <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, marginBottom: 16 }}>
                      Paso 3: Método de Pago & Descuentos
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {metodos.map((m) => {
                        const on = payMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setPayMethod(m.id)}
                            style={{
                              ...S.payOption,
                              padding: '14px 18px',
                              background: on ? '#FFF1EC' : 'var(--surface2)',
                              border: on ? '2px solid var(--primary)' : '1px solid var(--border)',
                              borderRadius: 16,
                              cursor: 'pointer',
                            }}
                          >
                            <span className="ms" style={{ fontSize: 24, color: on ? 'var(--primary)' : 'var(--muted)', flex: 'none' }}>{m.icon}</span>
                            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                              <div style={{ fontWeight: 800, fontSize: 14.5, color: on ? 'var(--primary)' : 'var(--text)' }}>{m.label}</div>
                              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.hint}</div>
                            </span>
                            <span className="ms ms-fill" style={{ fontSize: 22, color: on ? 'var(--primary)' : 'var(--border)' }}>
                              {on ? 'radio_button_checked' : 'radio_button_unchecked'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Propina */}
                  <div style={{ ...S.card, padding: 22 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>Propina para el repartidor</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      {TIPS.map((tp) => (
                        <button
                          key={tp.label}
                          onClick={() => setTip(tp.value)}
                          style={{
                            flex: 1, height: 46, borderRadius: 14, fontSize: 14, fontWeight: 800,
                            background: tip === tp.value ? 'var(--text)' : 'var(--surface2)',
                            color: tip === tp.value ? '#fff' : 'var(--text)',
                            border: tip === tp.value ? 'none' : '1px solid var(--border)',
                            cursor: 'pointer',
                          }}
                        >
                          {tp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cupón */}
                  <div style={{ ...S.card, padding: 22 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>local_activity</span>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>Cupón o código de descuento</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Ej. TURA15"
                        style={S.couponInput}
                      />
                      <button onClick={applyCoupon} style={S.couponBtn}>Aplicar</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 16 }}>
                    <button
                      onClick={() => setWizardStep(2)}
                      style={{
                        flex: 1, height: 54, borderRadius: 16,
                        background: 'var(--surface)', color: 'var(--text)',
                        border: '1px solid var(--border)', fontSize: 15, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                      <span>Volver a Entrega</span>
                    </button>

                    <button
                      onClick={() => handlePlaceOrder(payMethod)}
                      disabled={placing || Boolean(falta)}
                      style={{
                        flex: 1.6, height: 54, borderRadius: 16,
                        background: 'linear-gradient(135deg, #25D366, #128C7E)',
                        color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 24px rgba(37,211,102,0.3)',
                        opacity: falta ? 0.55 : 1,
                      }}
                    >
                      <span className="ms ms-fill" style={{ fontSize: 20 }}>chat</span>
                      <span>{falta ?? `Confirmar y Enviar por WhatsApp · ${cop(t.total)}`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COLUMNA DERECHA: RESUMEN EN VIVO DEL PEDIDO */}
            <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...S.card, padding: 24, boxShadow: '0 12px 36px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  {store?.cover_url && (
                    <Cover src={store.cover_url} alt={store.name} radius={12} sizes="48px" style={{ width: 48, height: 48, flex: 'none' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>RESUMEN DEL PEDIDO</div>
                    <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, marginTop: 2 }}>{store?.name}</div>
                  </div>
                </div>

                {/* Lista compacta de items en el resumen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  {items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 6, color: 'var(--muted)' }}>
                          {it.qty}x
                        </span>
                        <span className="tr1" style={{ fontWeight: 700, color: 'var(--text)' }}>{it.name}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--text)', flex: 'none' }}>
                        {cop((it.unitPrice || it.basePrice || it.price || 0) * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                  <Row label="Subtotal productos" value={cop(t.subtotal)} />
                  {mode === 'delivery' && (
                    <Row label="Envío a domicilio" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
                  )}
                  <Row label="Tarifa de servicio" value={cop(t.service)} />
                  {t.tip > 0 && <Row label="Propina repartidor" value={cop(t.tip)} />}
                  {t.discount > 0 && <Row label="Descuento cupón" value={`− ${cop(t.discount)}`} green />}
                  
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginTop: 10, padding: '14px 16px', borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(255,68,31,0.06), rgba(255,68,31,0.02))',
                    border: '1px solid rgba(255,68,31,0.15)',
                  }}>
                    <span style={{ fontSize: 15.5, fontWeight: 800 }}>Total a pagar</span>
                    <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-bricolage)', color: 'var(--primary)' }}>
                      {cop(t.total)}
                    </span>
                  </div>
                </div>

                {wizardStep === 1 && (
                  <button
                    onClick={() => setWizardStep(2)}
                    style={{
                      width: '100%', height: 48, borderRadius: 14,
                      background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                      color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <span>Continuar a Dirección</span>
                    <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                )}

                {wizardStep === 2 && (
                  <button
                    onClick={() => setWizardStep(3)}
                    style={{
                      width: '100%', height: 48, borderRadius: 14,
                      background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                      color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <span>Continuar al Pago</span>
                    <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                )}

                {wizardStep === 3 && (
                  <button
                    onClick={() => handlePlaceOrder(payMethod)}
                    disabled={placing || Boolean(falta)}
                    style={{
                      width: '100%', height: 48, borderRadius: 14,
                      background: 'linear-gradient(135deg, #25D366, #128C7E)',
                      color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: falta ? 0.55 : 1,
                      boxShadow: '0 4px 16px rgba(37,211,102,0.25)',
                    }}
                  >
                    <span className="ms ms-fill" style={{ fontSize: 18 }}>chat</span>
                    <span>{falta ?? 'Confirmar por WhatsApp'}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--border)' }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--green)' }}>shield</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Pago 100% protegido y respaldado por <b>Tura Food AI</b>.
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================
            VISTA MÓVIL: FLUJO CONTINUO ORIGINAL 100% INTOCADO
            ============================================================ */}
        <div className="mobile-only sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 130px', minHeight: 0 }}>
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
                        border: active ? '1.5px solid var(--text)' : '1px solid var(--border)',
                        background: active ? 'var(--text)' : 'transparent',
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
                      background: active ? 'var(--text)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--text)',
                      border: active ? 'none' : '1px solid var(--border)',
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
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total a pagar</div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22 }}>
              {cop(t.total)}
            </div>
          </div>
          <button
            onClick={() => setPaySheetOpen(true)}
            disabled={placing || Boolean(falta)}
            style={{ ...S.placeBtn, opacity: falta ? 0.55 : 1 }}
          >
            {falta ?? 'Hacer pedido'}
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
    background: '#FFF6F2', fontSize: 12, fontWeight: 800,
    color: 'var(--primary)', whiteSpace: 'nowrap',
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)',
    borderTop: '1px solid rgba(0,0,0,0.05)', padding: '14px 20px 20px',
    display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 -4px 24px rgba(0,0,0,0.02)',
  },
  placeBtn: {
    flex: 1, height: 56, borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15.5, boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
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
