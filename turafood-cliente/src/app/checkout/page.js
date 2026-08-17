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
import { getBusiness, getAddresses, getCoupons, placeOrder } from '@/lib/data';
import { quote, validateCoupon } from '@/lib/pricing';
import { payForOrder, PAYMENT_METHODS } from '@/services/payment';
import { cop, deliveryWindow } from '@/lib/format';
import PaymentSheet from '../components/PaymentSheet';
import ScheduleSheet from '../components/ScheduleSheet';
// Los métodos los define el servicio de pagos, no esta pantalla
const PAY_METHODS = PAYMENT_METHODS;

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

  const [store, setStore] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [coupons, setCoupons] = useState([]);

  const [mode, setMode] = useState('delivery');
  const [payMethod, setPayMethod] = useState('nequi');
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
      const { redirectTo } = await payForOrder(order, {
        method: payMethod,
        businessName: store?.name,
      });

      // Si el usuario cancela en la pasarela, el pedido queda pendiente
      // y lo puede retomar desde Mis pedidos.
      clearCart();

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

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.push('/cart')} style={S.backBtn} aria-label="Volver a la canasta">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
            Confirmar pedido
          </span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 130px', minHeight: 0 }}>

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
              <button onClick={() => router.push('/account/addresses')} style={S.cardRow}>
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
                {PAY_METHODS.find((m) => m.id === payMethod)?.icon ?? 'account_balance_wallet'}
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <span style={S.rowLabel}>MÉTODO DE PAGO</span>
                <span style={S.rowValue}>
                  {PAY_METHODS.find((m) => m.id === payMethod)?.label}
                </span>
                <span style={S.rowHint}>
                  {payMethod === 'cash' ? 'Pagas al recibir' : 'Pago en línea seguro'}
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
                {PAY_METHODS.map((m) => {
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

            <div style={{ padding: 15 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>schedule</span>
                <span style={{ flex: 1 }}>
                  <span style={S.rowLabel}>ENTREGA</span>
                  <span style={S.rowValue}>
                    Hoy, {deliveryWindow(store?.prep_time_min ?? 25)}
                  </span>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {[
                  { id: 'asap', label: 'Lo antes posible' },
                  { id: 'scheduled', label: schedule ? `${schedule.dayLabel}, ${schedule.label}` : 'Programar' },
                ].map((w) => {
                  const active = when === w.id;
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        if (w.id === 'scheduled') {
                          setScheduleOpen(true);
                          return;
                        }
                        setWhen('asap');
                        setSchedule(null);
                      }}
                      style={{
                        flex: 1, height: 40, borderRadius: 12, fontSize: 12.5, fontWeight: 700,
                        background: active ? 'var(--text)' : 'var(--surface2)',
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
              <Row label="Subtotal" value={cop(t.subtotal)} />
              {mode === 'delivery' && (
                <Row label="Envío" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
              )}
              <Row label="Tarifa de servicio" value={cop(t.service)} />
              {t.tip > 0 && <Row label="Propina" value={cop(t.tip)} />}
              {t.discount > 0 && <Row label="Descuento" value={`− ${cop(t.discount)}`} green />}
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

        <div style={S.bottom}>
          <div style={{ flex: 'none' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total a pagar</div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22 }}>
              {cop(t.total)}
            </div>
          </div>
          <button onClick={() => setPaySheetOpen(true)} disabled={placing} style={S.placeBtn}>
            Hacer pedido
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
      </div>
    </>
  );
}

function Row({ label, value, green }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13.5 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, color: green ? 'var(--green)' : 'var(--text)' }}>{value}</span>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    marginTop: 18, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, overflow: 'hidden',
  },
  cardRow: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: 15, textAlign: 'left', borderBottom: '1px solid var(--border)',
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
    borderTop: '1px solid var(--border)', padding: '14px 20px 20px',
    display: 'flex', alignItems: 'center', gap: 14,
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
