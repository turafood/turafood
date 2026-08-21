'use client';

import { useMemo, useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { cop } from '@/lib/format';
import { Cover } from './Media';

const MAX_EXTRAS = 3;

export default function ProductModal({ product, store, onClose }) {
  const addLine = useCartStore((s) => s.addLine);

  const [sizeId, setSizeId] = useState(null);
  const [extraIds, setExtraIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Inicializar tamaño obligatorio
  useEffect(() => {
    if (!product) return;
    const firstSize = (product.extras ?? []).find((e) => e.is_required);
    if (firstSize) setSizeId(firstSize.id);
  }, [product]);

  const sizes = useMemo(
    () => (product?.extras ?? []).filter((e) => e.is_required),
    [product],
  );

  const addons = useMemo(
    () => (product?.extras ?? []).filter((e) => !e.is_required),
    [product],
  );

  const selectedIds = useMemo(
    () => [sizeId, ...extraIds].filter(Boolean),
    [sizeId, extraIds],
  );

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const deltas = (product.extras ?? [])
      .filter((e) => selectedIds.includes(e.id))
      .reduce((sum, e) => sum + Number(e.price_delta), 0);
    return Number(product.price) + deltas;
  }, [product, selectedIds]);

  const totalPrice = unitPrice * qty;

  const toggleExtra = (extraId) => {
    setExtraIds((prev) => {
      if (prev.includes(extraId)) return prev.filter((x) => x !== extraId);
      if (prev.length >= MAX_EXTRAS) return prev;
      return [...prev, extraId];
    });
  };

  const handleAdd = () => {
    if (!product || !store) return;

    const chosen = (product.extras ?? [])
      .filter((e) => selectedIds.includes(e.id) && Number(e.price_delta) > 0)
      .map((e) => e.name);
    const opts = [...chosen, notes.trim()].filter(Boolean).join(' · ');

    addLine(
      {
        productId: product.id,
        name: product.name,
        unitPrice,
        basePrice: Number(product.price),
        comparePrice: product.compare_price ?? null,
        image_url: product.image_url,
        extraIds: selectedIds,
        notes: notes.trim(),
        opts,
        qty,
      },
      { id: store.id, name: store.name, image: store.cover_url },
    );

    setAdded(true);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  if (!product) return null;

  const off = product.compare_price
    ? `-${Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%`
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 110,
        background: 'rgba(15, 12, 9, 0.72)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 540, maxHeight: '90vh',
          background: 'var(--surface)', borderRadius: 28,
          border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', animation: 'scaleUp .22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Botón flotante cerrar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 10,
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
            color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'transform .15s ease',
          }}
          aria-label="Cerrar"
        >
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>

        {/* Scrollable Container */}
        <div className="sc" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* Portada del producto */}
          <div style={{ position: 'relative', width: '100%', height: 240, background: 'var(--surface2)' }}>
            <Cover src={product.image_url} alt={product.name} sizes="540px" style={{ width: '100%', height: '100%' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)',
            }} />
            {off && (
              <span style={{
                position: 'absolute', bottom: 16, left: 20, zIndex: 2,
                background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                color: '#fff', fontSize: 12, fontWeight: 800,
                padding: '5px 12px', borderRadius: 10,
                boxShadow: '0 4px 12px rgba(255,68,31,0.35)',
              }}>
                {off} DESCUENTO
              </span>
            )}
          </div>

          {/* Información Principal */}
          <div style={{ padding: '22px 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
              <span className="ms" style={{ fontSize: 16 }}>storefront</span>
              {store?.name}
            </div>

            <h2 style={{
              margin: '6px 0 0', fontFamily: 'var(--font-bricolage)',
              fontWeight: 800, fontSize: 22, color: 'var(--text)', letterSpacing: '-.02em',
            }}>
              {product.name}
            </h2>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>
                {cop(unitPrice)}
              </span>
              {product.compare_price && (
                <span style={{ fontSize: 14, color: 'var(--faint)', textDecoration: 'line-through' }}>
                  {cop(product.compare_price)}
                </span>
              )}
            </div>

            {product.description && (
              <p style={{ margin: '12px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                {product.description}
              </p>
            )}
          </div>

          {/* Tamaños / Opciones Obligatorias */}
          {sizes.length > 0 && (
            <div style={{ padding: '0 24px 18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Elige el tamaño
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', background: 'var(--primary-tint)', padding: '3px 8px', borderRadius: 99 }}>
                  OBLIGATORIO
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sizes.map((s) => {
                  const active = sizeId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSizeId(s.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 14,
                        border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary-tint)' : 'var(--surface2)',
                        cursor: 'pointer', transition: 'all .15s ease', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: active ? '5px solid var(--primary)' : '2px solid var(--faint)',
                          background: '#fff', display: 'inline-block',
                        }} />
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text)' }}>
                          {s.name}
                        </span>
                      </div>
                      {Number(s.price_delta) > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                          +{cop(s.price_delta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Acompañamientos / Extras Opcionales */}
          {addons.length > 0 && (
            <div style={{ padding: '0 24px 18px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Agrega acompañamientos
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                  Máx. {MAX_EXTRAS}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addons.map((a) => {
                  const active = extraIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => toggleExtra(a.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 14,
                        border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary-tint)' : 'var(--surface2)',
                        cursor: 'pointer', transition: 'all .15s ease', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 18, height: 18, borderRadius: 6,
                          background: active ? 'var(--primary)' : '#fff',
                          border: active ? 'none' : '2px solid var(--faint)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff',
                        }}>
                          {active && <span className="ms" style={{ fontSize: 14 }}>check</span>}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text)' }}>
                          {a.name}
                        </span>
                      </div>
                      {Number(a.price_delta) > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
                          +{cop(a.price_delta)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas para la cocina */}
          <div style={{ padding: '0 24px 24px' }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
              Instrucciones especiales
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Salsa aparte, sin cebolla, bien cocido..."
              style={{
                width: '100%', height: 44, borderRadius: 14,
                border: '1px solid var(--border)', background: 'var(--surface2)',
                padding: '0 16px', fontSize: 13.5, color: 'var(--text)', outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Footer con Contador de Cantidad y Botón de Agregar */}
        <div style={{
          padding: '16px 24px 20px',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          {/* Selector de Cantidad */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--surface2)', borderRadius: 99,
            padding: '4px 6px', border: '1px solid var(--border)', flex: 'none',
          }}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                opacity: qty <= 1 ? 0.35 : 1, color: 'var(--text)',
              }}
              aria-label="Disminuir cantidad"
            >
              <span className="ms" style={{ fontSize: 18 }}>remove</span>
            </button>
            <span style={{ width: 24, textAlign: 'center', fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => q + 1)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text)',
              }}
              aria-label="Aumentar cantidad"
            >
              <span className="ms" style={{ fontSize: 18 }}>add</span>
            </button>
          </div>

          {/* Botón de Agregar */}
          <button
            onClick={handleAdd}
            style={{
              flex: 1, height: 50, borderRadius: 16,
              background: added ? 'var(--green)' : 'linear-gradient(135deg, #FF441F 0%, #E2360F 100%)',
              color: '#fff', border: 'none', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 20px', boxShadow: '0 8px 24px rgba(255,68,31,0.25)',
              transition: 'all .2s ease',
            }}
          >
            <span>{added ? '¡Agregado!' : 'Agregar a la canasta'}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{cop(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
