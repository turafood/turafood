'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusiness, getMenu } from '@/lib/data';
import { cop, etaLabel, feeLabel } from '@/lib/format';
import { Cover } from './Media';

export default function FastViewModal({ storeId, initialStore, onClose }) {
  const router = useRouter();
  const addLine = useCartStore((s) => s.addLine);

  const [store, setStore] = useState(initialStore || null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedItem, setAddedItem] = useState(null);

  useEffect(() => {
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

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 120,
        background: 'rgba(12, 10, 8, 0.72)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 580, maxHeight: '90vh',
          background: 'var(--surface)', borderRadius: 28,
          border: '1px solid var(--border)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
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
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
          aria-label="Cerrar"
        >
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>

        {/* Scrollable Body */}
        <div className="sc" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Header Banner */}
          <div style={{ position: 'relative', width: '100%', height: 180, background: 'var(--surface2)' }}>
            {store?.cover_url && (
              <Cover src={store.cover_url} alt={store.name} sizes="580px" style={{ width: '100%', height: '100%' }} />
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(15,12,9,0.85) 100%)',
            }} />
            <div style={{
              position: 'absolute', bottom: 16, left: 22, right: 22, zIndex: 2,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            }}>
              <div>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                  color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em',
                  padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase',
                }}>
                  ⚡ VISTA RÁPIDA · FAST VIEW
                </span>
                <h2 style={{
                  margin: '6px 0 0', fontFamily: 'var(--font-bricolage)',
                  fontWeight: 800, fontSize: 24, color: '#fff', letterSpacing: '-.02em',
                }}>
                  {store?.name}
                </h2>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {store?.category} · Buenaventura
                </div>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.95)', padding: '4px 10px',
                borderRadius: 12, fontWeight: 800, fontSize: 13, color: '#17140F',
              }}>
                <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>star</span>
                {store?.rating ?? '4.8'}
              </div>
            </div>
          </div>

          {/* Fila de Métricas Rápidas & Promo */}
          <div style={{ padding: '16px 22px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="ms" style={{ fontSize: 16 }}>schedule</span>
                {etaLabel(store?.prep_time_min)}
              </span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: Number(store?.delivery_fee) === 0 ? 'var(--green)' : 'var(--text)' }}>
                <span className="ms" style={{ fontSize: 16 }}>two_wheeler</span>
                {feeLabel(store?.delivery_fee)}
              </span>
            </div>

            <span style={{
              background: '#FFF4D6', color: '#8F5E00', fontSize: 11.5, fontWeight: 800,
              padding: '4px 10px', borderRadius: 8, border: '1px solid #F5DE9C',
            }}>
              15% OFF con TURA15
            </span>
          </div>

          {/* Lista de Platos para Pedido Rápido */}
          <div style={{ padding: '18px 22px 24px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 14,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: 'var(--text)',
                textTransform: 'uppercase', letterSpacing: '.05em',
              }}>
                Platos más pedidos
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                Agrega con 1 clic
              </span>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ height: 76, borderRadius: 16, background: 'var(--surface2)' }} />
                ))}
              </div>
            ) : featuredProducts.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                Explora el menú completo para ver todos los productos.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {featuredProducts.map((p) => {
                  const off = p.compare_price
                    ? `-${Math.round(((p.compare_price - p.price) / p.compare_price) * 100)}%`
                    : null;
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
                        <Cover src={p.image_url} alt={p.name} radius={12} sizes="64px" style={{ width: 64, height: 64, flex: 'none' }} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }} className="tr1">
                          {p.name}
                        </div>
                        {p.description && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }} className="tr1">
                            {p.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                            {cop(p.price)}
                          </span>
                          {off && (
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--primary)' }}>
                              {off}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        style={{
                          height: 38, padding: '0 16px', borderRadius: 999,
                          background: isJustAdded ? 'var(--green)' : 'linear-gradient(135deg, #FF441F, #E2360F)',
                          color: '#fff', fontSize: 12.5, fontWeight: 800,
                          border: 'none', cursor: 'pointer', flex: 'none',
                          display: 'flex', alignItems: 'center', gap: 6,
                          boxShadow: '0 4px 12px rgba(255,68,31,0.25)',
                          transition: 'all .2s ease',
                        }}
                      >
                        <span className="ms" style={{ fontSize: 16 }}>{isJustAdded ? 'check' : 'add'}</span>
                        <span>{isJustAdded ? '¡Agregado!' : 'Agregar'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 22px', borderTop: '1px solid var(--border)',
          background: 'var(--bg)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={() => {
              onClose();
              router.push(`/store/${store?.id || storeId}`);
            }}
            style={{
              flex: 1, height: 46, borderRadius: 14,
              background: 'var(--surface2)', color: 'var(--text)',
              border: '1px solid var(--border)', fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span>Ver menú completo</span>
            <span className="ms" style={{ fontSize: 17 }}>arrow_forward</span>
          </button>

          <button
            onClick={() => {
              onClose();
              router.push('/checkout');
            }}
            style={{
              flex: 1, height: 46, borderRadius: 14,
              background: 'linear-gradient(135deg, #1C1917, #12100E)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.15)', fontSize: 13.5, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            }}
          >
            <span className="ms ms-fill" style={{ fontSize: 17, color: 'var(--amber)' }}>shopping_bag</span>
            <span>Ir a Pagar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
