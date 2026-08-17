'use client';

/**
 * PANTALLA DE PRODUCTO
 * Conversión 1:1 de `isProduct` (línea 639) del mockup del cliente.
 *
 * El diseño la trata como pantalla completa (no modal): portada 264px,
 * hoja superpuesta, grupo de tamaño OBLIGATORIO con radio, grupo de
 * acompañamientos con checkbox y tope de 3, nota libre, y barra inferior
 * con selector de cantidad + botón "Agregar $X".
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getProduct, getBusiness } from '@/lib/data';
import { cop } from '@/lib/format';
const MAX_EXTRAS = 3;

export default function ProductPage() {
  const router = useRouter();
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sizeId, setSizeId] = useState(null);
  const [extraIds, setExtraIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);

  const addLine = useCartStore((s) => s.addLine);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await getProduct(id);
        if (!alive) return;
        if (!p) {
          setError('Este plato ya no está disponible.');
          return;
        }
        setProduct(p);

        // El tamaño es obligatorio: se preselecciona el primero, como el mockup
        const firstSize = (p.extras ?? []).find((e) => e.is_required);
        if (firstSize) setSizeId(firstSize.id);

        const biz = await getBusiness(p.business_id);
        if (alive) setStore(biz);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // El mockup separa "Elige el tamaño" (requerido) de "Agrega acompañamientos"
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

  const toggleExtra = (extraId) => {
    setExtraIds((prev) => {
      if (prev.includes(extraId)) return prev.filter((x) => x !== extraId);
      if (prev.length >= MAX_EXTRAS) return prev;   // tope del diseño
      return [...prev, extraId];
    });
  };

  const handleAdd = () => {
    if (!product || !store) return;

    // Resumen de opciones para mostrarlo en el carrito ("Sin cebolla")
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

    router.push('/cart');
  };

  if (error) {
    return (
      <>
        <div style={S.errorScreen}>
          <span className="ms" style={{ fontSize: 40, color: 'var(--faint)' }}>restaurant</span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 12 }}>
            No pudimos abrir el plato
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>{error}</div>
          <button onClick={() => router.back()} style={S.errorBtn}>Volver</button>
        </div>
      </>
    );
  }

  const off = product?.compare_price
    ? `-${Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%`
    : null;

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', paddingBottom: 120, marginTop: -44, minHeight: 0 }}>

          {/* Portada */}
          <div style={{ position: 'relative', height: 264, ...bg(product?.image_url) }}>
            <button onClick={() => router.back()} style={S.closeBtn} aria-label="Cerrar">
              <span className="ms" style={{ fontSize: 21 }}>close</span>
            </button>
          </div>

          <div style={S.sheet}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', lineHeight: 1.15 }}>
              {loading ? 'Cargando…' : product?.name}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 7 }}>
              {product?.description}
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24 }}>
                {cop(unitPrice)}
              </span>
              {off && (
                <>
                  <span style={S.offTagBig}>{off}</span>
                  <span style={{ fontSize: 13, color: 'var(--faint)', textDecoration: 'line-through' }}>
                    {cop(product.compare_price)}
                  </span>
                </>
              )}
            </div>

            {/* Tamaño — obligatorio */}
            {sizes.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: 15.5 }}>Elige el tamaño</span>
                  <span style={S.requiredTag}>OBLIGATORIO</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 11 }}>
                  {sizes.map((o) => {
                    const active = sizeId === o.id;
                    return (
                      <button
                        key={o.id}
                        onClick={() => setSizeId(o.id)}
                        style={{
                          ...S.optionRow,
                          border: active ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                        }}
                      >
                        <span style={{
                          ...S.radio,
                          background: active ? 'var(--primary)' : 'transparent',
                          border: active ? 'none' : '2px solid var(--faint)',
                        }}>
                          {active && <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#fff' }} />}
                        </span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>{o.name}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--muted)' }}>
                          {Number(o.price_delta) === 0 ? 'Incluido' : `+ ${cop(o.price_delta)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Acompañamientos */}
            {addons.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 800, fontSize: 15.5 }}>Agrega acompañamientos</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
                    Máx. {MAX_EXTRAS}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 11 }}>
                  {addons.map((o) => {
                    const active = extraIds.includes(o.id);
                    const blocked = !active && extraIds.length >= MAX_EXTRAS;
                    return (
                      <button
                        key={o.id}
                        onClick={() => toggleExtra(o.id)}
                        disabled={blocked}
                        style={{
                          ...S.optionRow,
                          border: active ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                          opacity: blocked ? .45 : 1,
                        }}
                      >
                        <span style={{
                          ...S.checkbox,
                          background: active ? 'var(--primary)' : 'transparent',
                          border: active ? 'none' : '2px solid var(--faint)',
                        }}>
                          {active && <span className="ms" style={{ fontSize: 16, color: '#fff' }}>check</span>}
                        </span>
                        <span style={{ flex: 1, fontWeight: 700, fontSize: 14.5 }}>{o.name}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--muted)' }}>
                          + {cop(o.price_delta)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nota */}
            <div style={{ marginTop: 22 }}>
              <label htmlFor="nota" style={{ fontWeight: 800, fontSize: 15.5 }}>
                Nota para el restaurante
              </label>
              <input
                id="nota"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. sin cebolla, salsa aparte"
                style={S.noteInput}
              />
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div style={S.bottomBar}>
          <div style={S.qtyBox}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={S.qtyBtn}
              aria-label="Quitar uno"
            >
              <span className="ms" style={{ fontSize: 20 }}>remove</span>
            </button>
            <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} style={S.qtyBtn} aria-label="Agregar uno">
              <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span>
            </button>
          </div>
          <button onClick={handleAdd} disabled={loading || !product} style={S.addBtn}>
            Agregar {cop(unitPrice * qty)}
          </button>
        </div>
      </div>
    </>
  );
}

const bg = (url) => ({
  backgroundImage: url ? `url('${url}')` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: 'var(--surface2)',
});

const S = {
  closeBtn: {
    position: 'absolute', top: 52, left: 16, width: 38, height: 38, borderRadius: '50%',
    background: 'rgba(255,255,255,.92)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  sheet: {
    background: 'var(--bg)', borderRadius: '28px 28px 0 0', marginTop: -24,
    position: 'relative', padding: 20,
  },
  offTagBig: {
    background: '#FFE9A3', fontSize: 11.5, fontWeight: 800, padding: '3px 6px', borderRadius: 6,
  },
  requiredTag: {
    fontSize: 11, fontWeight: 800, color: 'var(--primary)',
    background: '#FFF1EC', padding: '4px 8px', borderRadius: 7,
  },
  optionRow: {
    display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)',
    borderRadius: 15, padding: 14, textAlign: 'left', width: '100%',
  },
  radio: {
    width: 22, height: 22, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  noteInput: {
    width: '100%', marginTop: 11, height: 52, borderRadius: 15,
    border: '1px solid var(--border)', background: 'var(--surface)',
    padding: '0 15px', fontSize: 14, outline: 'none',
  },
  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex',
    alignItems: 'center', gap: 12, padding: '14px 20px 20px',
    background: 'var(--surface)', borderTop: '1px solid var(--border)',
  },
  qtyBox: {
    display: 'flex', alignItems: 'center', gap: 4, flex: 'none', height: 52,
    borderRadius: 16, border: '1px solid var(--border)', padding: '0 6px',
  },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 16, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15, boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  errorScreen: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  errorBtn: {
    marginTop: 20, height: 48, padding: '0 24px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 14.5,
  },
};
