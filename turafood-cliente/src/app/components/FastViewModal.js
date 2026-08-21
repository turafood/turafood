'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusiness, getMenu } from '@/lib/data';
import { cop, etaLabel, feeLabel } from '@/lib/format';
import { Cover } from './Media';

export default function FastViewModal({ storeId, initialStore, onClose }) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);

  const [mounted, setMounted] = useState(false);
  const [store, setStore] = useState(initialStore || null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedItem, setAddedItem] = useState(null);

  useEffect(() => {
    setMounted(true);
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [biz, groups] = await Promise.all([
          initialStore ? Promise.resolve(initialStore) : getBusiness(storeId),
          getMenu(storeId),
        ]);
        if (!alive) return;
        setStore(biz);
        setMenu(groups || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [storeId, initialStore]);

  // Tomar los primeros 4 platos más destacados del negocio
  const featuredProducts = menu
    .flatMap((g) => g.products || [])
    .slice(0, 4);

  const handleQuickAdd = (p, e) => {
    e.stopPropagation();
    if (!store) return;

    addLine(
      {
        productId: p.id,
        name: p.name,
        unitPrice: Number(p.price),
        basePrice: Number(p.price),
        comparePrice: p.compare_price ?? null,
        image_url: p.image_url,
        extraIds: [],
        notes: '',
        opts: '',
        qty: 1,
      },
      { id: store.id, name: store.name, image: store.cover_url },
    );

    setAddedItem(p.id);
    setTimeout(() => {
      setAddedItem(null);
    }, 1200);
  };
  const cartSubtotal = useCartStore((s) => s.getSubtotal());
  const cartItems = useCartStore((s) => s.items);

  if (!mounted) return null;

  const modalEl = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 99999,
        background: 'rgba(10, 8, 6, 0.75)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 840, maxHeight: '88vh',
          background: 'var(--surface)', borderRadius: 24,
          border: '1px solid var(--border)', boxShadow: '0 28px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', animation: 'scaleUp .22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface2)',
            color: 'var(--text)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          aria-label="Cerrar"
        >
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>

        {/* CONTENEDOR 2 COLUMNAS EN DESKTOP */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          minHeight: 460, flex: 1, overflow: 'hidden',
        }}>
          {/* COLUMNA IZQUIERDA: HERO DEL RESTAURANTE */}
          <div style={{
            position: 'relative', minHeight: 240, background: 'var(--surface2)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            padding: 24, overflow: 'hidden',
          }}>
            {store?.cover_url && (
              <Cover src={store.cover_url} alt={store.name} sizes="420px" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(15,12,9,0.88) 100%)',
            }} />

            {/* Tag Superior */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.06em',
                padding: '5px 12px', borderRadius: 99, textTransform: 'uppercase',
              }}>
                ⚡ VISTA RÁPIDA
              </span>
            </div>

            {/* Info Inferior */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{
                  margin: 0, fontFamily: 'var(--font-bricolage)',
                  fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: '-.02em',
                }}>
                  {store?.name}
                </h2>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(255,255,255,0.95)', padding: '4px 10px',
                  borderRadius: 12, fontWeight: 800, fontSize: 13, color: '#17140F',
                }}>
                  <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>star</span>
                  {store?.rating ?? '4.8'}
                </div>
              </div>

              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                {store?.category} · Buenaventura
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="ms" style={{ fontSize: 16 }}>schedule</span>
                  {etaLabel(store?.prep_time_min)}
                </span>
                <span>·</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="ms" style={{ fontSize: 16 }}>two_wheeler</span>
                  {feeLabel(store?.delivery_fee)}
                </span>
              </div>

              <button
                onClick={() => { onClose(); router.push(`/store/${store.id}`); }}
                style={{
                  marginTop: 6, width: '100%', height: 42, borderRadius: 12,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                  color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.25)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <span>Ver Menú Completo</span>
                <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
              </button>
            </div>
          </div>

          {/* COLUMNA DERECHA: PLATOS MÁS PEDIDOS + COMPRA RÁPIDA */}
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh', background: 'var(--surface)' }}>
            <div style={{ padding: '20px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  PEDIDO RÁPIDO
                </span>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, marginTop: 2 }}>
                  Platos más pedidos
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                Agrega con 1 clic
              </span>
            </div>

            <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading ? (
                [0, 1, 2].map((i) => (
                  <div key={i} style={{ height: 76, borderRadius: 16, background: 'var(--surface2)' }} />
                ))
              ) : featuredProducts.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  Explora el menú completo para ver todos los productos.
                </div>
              ) : (
                featuredProducts.map((p) => {
                  const isJustAdded = addedItem === p.id;
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 14, padding: '12px 14px', borderRadius: 18,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        transition: 'all .15s ease',
                      }}
                    >
                      {p.image_url && (
                        <Cover src={p.image_url} alt={p.name} radius={12} sizes="54px" style={{ width: 54, height: 54, flex: 'none' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }} className="tr1">{p.name}</div>
                        {p.description && (
                          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }} className="tr1">{p.description}</div>
                        )}
                        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>
                          {cop(p.price)}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        style={{
                          height: 38, padding: '0 14px', borderRadius: 12,
                          background: isJustAdded ? 'var(--green)' : 'linear-gradient(135deg, #FF441F, #E2360F)',
                          color: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, flex: 'none',
                          boxShadow: isJustAdded ? '0 4px 12px rgba(17,178,106,0.3)' : '0 4px 12px rgba(255,68,31,0.25)',
                          transition: 'all .2s ease',
                        }}
                      >
                        <span className="ms" style={{ fontSize: 16 }}>{isJustAdded ? 'check' : 'add'}</span>
                        <span>{isJustAdded ? 'Listo' : 'Agregar'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra Inferior */}
            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => { onClose(); router.push('/cart'); }}
                style={{
                  flex: 1, height: 48, borderRadius: 14,
                  background: cartItems.length > 0 ? 'linear-gradient(135deg, #17140F, #221E18)' : 'var(--surface2)',
                  color: cartItems.length > 0 ? '#fff' : 'var(--text)',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span className="ms" style={{ fontSize: 18 }}>shopping_bag</span>
                <span>{cartItems.length > 0 ? `Ver Canasta (${cop(cartSubtotal)})` : 'Ver Canasta'}</span>
              </button>

              <button
                onClick={() => { onClose(); router.push('/checkout'); }}
                disabled={cartItems.length === 0}
                style={{
                  flex: 1.2, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: cartItems.length === 0 ? 0.5 : 1,
                  boxShadow: '0 4px 16px rgba(255,68,31,0.25)',
                }}
              >
                <span>Ir a Pagar</span>
                <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalEl, document.body);
}
