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

        {/* Cabecera con el negocio */}
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
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

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 190px', minHeight: 0 }}>

          {/* Líneas */}
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

          {/* Cross-selling */}
          {suggested.length > 0 && (
            <div style={S.suggestBlock}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 17 }}>
                Comprado frecuentemente con
              </div>
              <div className="hs" style={{ display: 'flex', gap: 12, margin: '12px -20px 0', padding: '0 20px' }}>
                {suggested.map((p) => (
                  <div key={p.id} style={{ flex: 'none', width: 132 }}>
                    <div style={{ ...bg(p.image_url), position: 'relative', height: 110, borderRadius: 15 }}>
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
                        <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>add</span>
                      </button>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 13.5, marginTop: 7 }}>{cop(p.price)}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.3, marginTop: 2 }}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Totales */}
          <div style={S.totalsCard}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Row label="Subtotal" value={cop(t.subtotal)} />
              <Row label="Envío" value={t.delivery === 0 ? 'Gratis' : cop(t.delivery)} green={t.delivery === 0} />
              <Row label="Tarifa de servicio" value={cop(t.service)} />
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div style={S.bottom}>
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
                {cop(t.total)}
              </div>
            </div>
            <button
              onClick={() => router.push('/checkout')}
              disabled={!meetsMin}
              style={S.continueBtn}
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
    margin: '6px -20px 0', padding: '18px 20px', background: 'var(--surface2)',
  },
  suggestAdd: {
    position: 'absolute', right: 6, top: 6, width: 30, height: 30, borderRadius: '50%',
    background: 'var(--surface)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', boxShadow: 'var(--shadowSm)',
  },
  totalsCard: {
    marginTop: 20, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 16,
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
