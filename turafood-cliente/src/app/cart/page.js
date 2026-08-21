'use client';

/**
 * CANASTA
 * Conversión 1:1 de `isCart` (línea 700) del mockup del cliente.
 *
 * Detalle del diseño que conviene respetar: el botón de restar cambia a
 * ícono de basura cuando la cantidad es 1 (`c.decIcon` en el mockup),
 * porque ahí la acción deja de ser "restar" y pasa a ser "eliminar".
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusiness, getMenu } from '@/lib/data';
import { quote } from '@/lib/pricing';
import { cop } from '@/lib/format';
export default function CartPage() {
  const router = useRouter();

  const items = useCartStore((s) => s.items);
  const businessId = useCartStore((s) => s.businessId);
  const businessName = useCartStore((s) => s.businessName);
  const businessImage = useCartStore((s) => s.businessImage);
  const subtotal = useCartStore((s) => s.getSubtotal());
  const updateQty = useCartStore((s) => s.updateQty);
  const removeLine = useCartStore((s) => s.removeLine);
  const clearCart = useCartStore((s) => s.clearCart);
  const addLine = useCartStore((s) => s.addLine);

  const [store, setStore] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [turbo, setTurbo] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    let alive = true;
    (async () => {
      try {
        const [biz, menu] = await Promise.all([getBusiness(businessId), getMenu(businessId)]);
        if (!alive) return;
        setStore(biz);

        // "Comprado frecuentemente con": platos baratos que no estén ya en la canasta
        const inCart = new Set(items.map((i) => i.productId));
        const cheap = menu
          .flatMap((g) => g.products)
          .filter((p) => !inCart.has(p.id))
          .sort((a, b) => a.price - b.price)
          .slice(0, 3);
        setSuggested(cheap);
      } catch {
        // El cross-selling es accesorio: si falla, la canasta sigue usable
      }
    })();
    return () => { alive = false; };
  }, [businessId, items]);

  const minOrder = Number(store?.min_order ?? 0);
  const meetsMin = subtotal >= minOrder;

  const t = quote({
    subtotal,
    deliveryFee: store?.delivery_fee ?? 0,
    mode: 'delivery',
    tip: 0,
  });

  const turaTotal = t.total + (turbo ? 2500 : 0);
  
  // Cálculo de Ahorro Fake vs "Otras apps" (Uber/DiDi)
  const otherSubtotal = subtotal * 1.18; // 18% más caro en app
  const otherDelivery = (store?.delivery_fee ?? 0) + 2500; // Envío más caro
  const otherService = 3900; // Tarifa de servicio alta
  const otherTotal = otherSubtotal + otherDelivery + otherService;
  const ahorro = otherTotal - turaTotal;

  // Canasta vacía
  if (items.length === 0) {
    return (
      <>
        <div style={S.empty}>
          <span className="ms" style={{ fontSize: 44, color: 'var(--faint)' }}>shopping_bag</span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, marginTop: 14 }}>
            Tu canasta está vacía
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 260, lineHeight: 1.5 }}>
            Explora los sitios abiertos del puerto y arma tu pedido.
          </div>
          <button onClick={() => router.push('/home')} style={S.emptyBtn}>Ver restaurantes</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

        {/* ============================================================
            VISTA DESKTOP EXPANDIDA: 2 COLUMNAS (CANASTA + RESUMEN)
            ============================================================ */}
        <div className="desktop-only" style={{ width: '100%', maxWidth: 960, margin: '0 auto', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
                <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
              </button>
              <div>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
                  Tu Canasta
                </span>
                <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>
                  {businessName}
                </div>
              </div>
            </div>
            <button onClick={clearCart} style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              Vaciar canasta
            </button>
          </div>
        </div>

        <div className="desktop-only sc" style={{ flex: 1, flexDirection: 'column', overflowY: 'auto', padding: '12px 24px 60px', minHeight: 0, width: '100%', maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.45fr 1fr', gap: 24, alignItems: 'start', width: '100%' }}>
            
            {/* COLUMNA IZQUIERDA: PRODUCTOS Y MEJORAS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ ...S.card, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
                    Productos ({items.length})
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                    {businessName}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {items.map((c) => {
                    const isLast = c.qty === 1;
                    return (
                      <div key={c.lineId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ ...bg(c.image_url), flex: 'none', width: 64, height: 64, borderRadius: 14 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{c.name}</div>
                          {c.opts && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{c.opts}</div>}
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 4 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{cop(c.unitPrice * c.qty)}</span>
                            {c.comparePrice && (
                              <span style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'line-through' }}>
                                {cop(c.comparePrice * c.qty)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={S.stepper}>
                          <button
                            onClick={() => (isLast ? removeLine(c.lineId) : updateQty(c.lineId, c.qty - 1))}
                            style={S.stepBtn}
                            aria-label={isLast ? `Eliminar ${c.name}` : `Quitar uno de ${c.name}`}
                          >
                            <span className="ms" style={{ fontSize: 18, color: isLast ? 'var(--primary)' : 'var(--text)' }}>
                              {isLast ? 'delete' : 'remove'}
                            </span>
                          </button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{c.qty}</span>
                          <button
                            onClick={() => updateQty(c.lineId, c.qty + 1)}
                            style={S.stepBtn}
                            aria-label={`Agregar uno de ${c.name}`}
                          >
                            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cross-selling PRO */}
              {suggested.length > 0 && (
                <div style={{ ...S.card, padding: 22 }}>
                  <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, marginBottom: 14 }}>
                    Completa tu pedido con estos favoritos
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {suggested.map((p) => (
                      <div key={p.id} style={{ ...S.suggestCard, width: 'auto', height: 130 }}>
                        <div style={{ ...bg(p.image_url), position: 'absolute', inset: 0, borderRadius: 16 }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.85) 100%)', borderRadius: 16 }} />
                        <button
                          onClick={() => addLine(
                            {
                              productId: p.id, name: p.name, unitPrice: Number(p.price),
                              basePrice: Number(p.price), comparePrice: p.compare_price ?? null,
                              image_url: p.image_url, extraIds: [], notes: '', opts: '', qty: 1,
                            },
                            { id: store.id, name: store.name, image: store.cover_url },
                          )}
                          style={S.suggestAdd}
                          aria-label={`Agregar ${p.name}`}
                        >
                          <span className="ms" style={{ fontSize: 18, color: '#fff' }}>add</span>
                        </button>
                        <div style={{ position: 'relative', zIndex: 2, padding: 12, marginTop: 'auto' }}>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: '#fff' }}>{cop(p.price)}</div>
                          <div className="tr1" style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>{p.name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upsell Turbo */}
              <button onClick={() => setTurbo(!turbo)} style={{ ...S.turboCard, ...(turbo ? S.turboCardActive : {}), padding: '16px 20px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={turbo ? S.turboIconActive : S.turboIcon}>
                    <span className="ms ms-fill" style={{ fontSize: 24, color: turbo ? '#fff' : 'var(--amber)' }}>bolt</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: turbo ? '#fff' : 'var(--text)' }}>
                      Prioridad Turbo
                    </div>
                    <div style={{ fontSize: 12, color: turbo ? 'rgba(255,255,255,0.8)' : 'var(--muted)', marginTop: 2 }}>
                      Prepáralo y envíalo primero
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: turbo ? '#fff' : 'var(--text)' }}>
                  + $2.500
                </div>
              </button>

              {/* Bloque de Ahorro */}
              <div style={{ ...S.savingsCard, padding: '18px 22px' }}>
                <div style={S.savingsGlow} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: '50%', width: 46, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                    <span className="ms" style={{ fontSize: 26, color: '#10B981' }}>savings</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                      Mes de Lanzamiento TuraFood
                    </div>
                    <div style={{ fontSize: 16.5, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                      Estás ahorrando {cop(ahorro > 0 ? ahorro : 0)}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                      En otras apps pagarías {cop(otherTotal)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: RESUMEN DEL PEDIDO */}
            <div style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ ...S.card, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  {businessImage && (
                    <div style={{ ...bg(businessImage), width: 44, height: 44, borderRadius: 12, flex: 'none' }} />
                  )}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>RESUMEN DE COMPRA</div>
                    <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, marginTop: 2 }}>{businessName}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
                  <Row label="Subtotal productos" value={cop(t.subtotal)} />
                  <Row label="Envío estimado" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
                  <Row label="Tarifa de servicio" value={cop(t.service)} />
                  {turbo && <Row label="Prioridad Turbo" value="$2.500" />}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 14, borderTop: '2px solid var(--border)' }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>Total</span>
                    <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-bricolage)', color: 'var(--primary)' }}>
                      {cop(turaTotal)}
                    </span>
                  </div>
                </div>

                {/* Banner de mínimo de compra */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12,
                  background: meetsMin ? '#E6F6EE' : '#FFF7E6', marginBottom: 16,
                }}>
                  <span className="ms" style={{ fontSize: 18, color: meetsMin ? 'var(--green)' : '#A8730B' }}>
                    {meetsMin ? 'check_circle' : 'info'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meetsMin ? '#0B7A48' : '#7A5405' }}>
                    {meetsMin
                      ? 'Completaste el mínimo de compra'
                      : `Te faltan ${cop(minOrder - subtotal)} para el mínimo`}
                  </span>
                </div>

                <button
                  onClick={() => router.push('/checkout')}
                  disabled={!meetsMin}
                  style={{
                    width: '100%', height: 52, borderRadius: 16,
                    background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                    color: '#fff', fontSize: 15.5, fontWeight: 800, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(255,68,31,0.25)',
                    opacity: meetsMin ? 1 : 0.55,
                  }}
                >
                  <span>Ir al Checkout</span>
                  <span className="ms" style={{ fontSize: 20 }}>arrow_forward</span>
                </button>
              </div>

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
            VISTA MÓVIL: FLUJO CONTINUO ORIGINAL
            ============================================================ */}
        <div className="mobile-only" style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
            <div style={{ ...bg(businessImage), width: 30, height: 30, borderRadius: '50%', flex: 'none' }} />
            <span className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18 }}>
              {businessName}
            </span>
          </div>
        </div>

        <div className="mobile-only sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 190px', minHeight: 0 }}>
          {items.map((c) => {
            const isLast = c.qty === 1;
            return (
              <div key={c.lineId} style={S.line}>
                <div style={{ ...bg(c.image_url), flex: 'none', width: 62, height: 62, borderRadius: 13 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>{c.name}</div>
                  {c.opts && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{c.opts}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 5 }}>
                    <span style={{ fontWeight: 800, fontSize: 14.5 }}>{cop(c.unitPrice * c.qty)}</span>
                    {c.comparePrice && (
                      <>
                        <span style={S.offTag}>
                          -{Math.round(((c.comparePrice - c.basePrice) / c.comparePrice) * 100)}%
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--faint)', textDecoration: 'line-through' }}>
                          {cop(c.comparePrice * c.qty)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div style={S.stepper}>
                  <button
                    onClick={() => (isLast ? removeLine(c.lineId) : updateQty(c.lineId, c.qty - 1))}
                    style={S.stepBtn}
                    aria-label={isLast ? `Eliminar ${c.name}` : `Quitar uno de ${c.name}`}
                  >
                    <span
                      className="ms"
                      style={{ fontSize: 18, color: isLast ? 'var(--primary)' : 'var(--text)' }}
                    >
                      {isLast ? 'delete' : 'remove'}
                    </span>
                  </button>
                  <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 800, fontSize: 14 }}>{c.qty}</span>
                  <button
                    onClick={() => updateQty(c.lineId, c.qty + 1)}
                    style={S.stepBtn}
                    aria-label={`Agregar uno de ${c.name}`}
                  >
                    <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>add</span>
                  </button>
                </div>
              </div>
            );
          })}

          <button onClick={clearCart} style={S.clearBtn}>Vaciar canasta</button>

          {suggested.length > 0 && (
            <div style={S.suggestBlock}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16 }}>
                Comprado frecuentemente con
              </div>
              <div className="hs" style={{ display: 'flex', gap: 12, margin: '14px -20px 0', padding: '0 20px', paddingBottom: 10 }}>
                {suggested.map((p) => (
                  <div key={p.id} style={S.suggestCard}>
                    <div style={{ ...bg(p.image_url), position: 'absolute', inset: 0, borderRadius: 16 }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 20%, rgba(0,0,0,0.85) 100%)', borderRadius: 16 }} />
                    <button
                      onClick={() => addLine(
                        {
                          productId: p.id, name: p.name, unitPrice: Number(p.price),
                          basePrice: Number(p.price), comparePrice: p.compare_price ?? null,
                          image_url: p.image_url, extraIds: [], notes: '', opts: '', qty: 1,
                        },
                        { id: store.id, name: store.name, image: store.cover_url },
                      )}
                      style={S.suggestAdd}
                      aria-label={`Agregar ${p.name}`}
                    >
                      <span className="ms" style={{ fontSize: 18, color: '#fff' }}>add</span>
                    </button>
                    <div style={{ position: 'relative', zIndex: 2, padding: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{cop(p.price)}</div>
                      <div className="tr1" style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => setTurbo(!turbo)} style={{...S.turboCard, ...(turbo ? S.turboCardActive : {})}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={turbo ? S.turboIconActive : S.turboIcon}>
                <span className="ms ms-fill" style={{ fontSize: 24, color: turbo ? '#fff' : 'var(--amber)' }}>bolt</span>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: turbo ? '#fff' : 'var(--text)' }}>
                  Prioridad Turbo
                </div>
                <div style={{ fontSize: 12, color: turbo ? 'rgba(255,255,255,0.8)' : 'var(--muted)', marginTop: 2 }}>
                  Prepáralo y envíalo primero
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: turbo ? '#fff' : 'var(--text)' }}>
              + $2.500
            </div>
          </button>

          <div style={S.savingsCard}>
            <div style={S.savingsGlow} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="ms" style={{ fontSize: 24, color: '#10B981' }}>savings</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Mes de Lanzamiento TuraFood
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                  Estás ahorrando {cop(ahorro > 0 ? ahorro : 0)}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  En otras apps pagarías {cop(otherTotal)}
                </div>
              </div>
            </div>
          </div>

          <div style={S.totalsCard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Row label="Subtotal" value={cop(t.subtotal)} />
              <Row label="Envío" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
              <Row label="Tarifa de servicio" value={cop(t.service)} />
              {turbo && <Row label="Prioridad Turbo" value="$2.500" />}
            </div>
          </div>
        </div>

        <div className="mobile-only" style={S.bottom}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, margin: '0 -20px',
            padding: '10px 20px', background: meetsMin ? '#E6F6EE' : '#FFF7E6',
          }}>
            <span className="ms" style={{ fontSize: 19, color: meetsMin ? 'var(--green)' : '#A8730B' }}>
              {meetsMin ? 'check_circle' : 'info'}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: meetsMin ? '#0B7A48' : '#7A5405' }}>
              {meetsMin
                ? 'Completaste el mínimo de compra'
                : `Te faltan ${cop(minOrder - subtotal)} para el mínimo`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 14 }}>
            <div style={{ flex: 'none' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Total</div>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22 }}>
                {cop(turaTotal)}
              </div>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              disabled={!meetsMin}
              style={{ ...S.continueBtn, opacity: meetsMin ? 1 : 0.5 }}
            >
              Continuar
            </button>
          </div>
        </div>
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

const bg = (url) => ({
  backgroundImage: url ? `url('${url}')` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: 'var(--surface2)',
});

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  line: {
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '14px 0', borderBottom: '1px solid var(--border)',
  },
  offTag: {
    background: '#FFE9A3', fontSize: 10, fontWeight: 800, padding: '2px 5px', borderRadius: 5,
  },
  stepper: {
    display: 'flex', alignItems: 'center', gap: 2, flex: 'none', height: 38,
    borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 4px',
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    display: 'block', width: '100%', textAlign: 'center', padding: '18px 0',
    color: 'var(--primary)', fontWeight: 700, fontSize: 14,
  },
  suggestBlock: {
    margin: '12px 0 0', padding: '20px', background: 'var(--surface2)', borderRadius: 24,
  },
  suggestCard: {
    flex: 'none', width: 140, height: 120, position: 'relative', borderRadius: 16,
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden',
  },
  suggestAdd: {
    position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3,
    border: '1px solid rgba(255,255,255,0.3)',
  },
  turboCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '16px', width: '100%', transition: 'all .2s ease',
  },
  turboCardActive: {
    background: 'linear-gradient(135deg, #FF6B00 0%, #FF441F 100%)',
    borderColor: 'transparent',
    boxShadow: '0 8px 24px rgba(255,107,0,0.3)',
  },
  turboIcon: {
    width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  turboIconActive: {
    width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  savingsCard: {
    position: 'relative', marginTop: 16, borderRadius: 20, padding: '20px',
    background: '#1A1D1A', overflow: 'hidden', border: '1px solid #10B98130',
    boxShadow: '0 8px 24px rgba(16,185,129,0.1)',
  },
  savingsGlow: {
    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
    background: 'rgba(16,185,129,0.4)', filter: 'blur(40px)', borderRadius: '50%',
  },
  totalsCard: {
    marginTop: 16, background: 'var(--surface)', border: 'none',
    borderRadius: 20, padding: '20px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)',
    borderTop: '1px solid var(--border)', padding: '0 20px 20px',
  },
  continueBtn: {
    flex: 1, height: 56, borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15.5, boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  emptyBtn: {
    marginTop: 22, height: 52, padding: '0 28px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 15,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
};
