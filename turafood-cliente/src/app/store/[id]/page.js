'use client';

/**
 * PANTALLA DE NEGOCIO
 * Conversión 1:1 de `isStore` (línea 569) del mockup del cliente.
 *
 * Estructura del diseño, en orden:
 *   portada 214px con degradado y botones flotantes
 *   → hoja con radio 28 superpuesta -24px
 *   → nombre + categoría · distancia
 *   → tres tarjetas (rating / entrega / envío)
 *   → aviso de cupón ámbar
 *   → chips de categoría sticky
 *   → lista de platos
 *   → barra "Ver canasta" fija abajo
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusiness, getMenu } from '@/lib/data';
import { cop, feeLabel, etaLabel, kmLabel } from '@/lib/format';
import ProductModal from '../../components/ProductModal';

export default function StorePage() {
  const router = useRouter();
  const { id } = useParams();

  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fav, setFav] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const sectionRefs = useRef({});

  const cartCount = useCartStore((s) => s.getTotalItems());
  const cartSubtotal = useCartStore((s) => s.getSubtotal());
  const cartBusinessId = useCartStore((s) => s.businessId);

  // La barra de canasta solo aparece si el carrito es de ESTE negocio
  const showCartBar = cartCount > 0 && cartBusinessId === store?.id;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [biz, groups] = await Promise.all([getBusiness(id), getMenu(id)]);
        if (!alive) return;
        if (!biz) {
          setError('Este negocio no existe o ya no está disponible.');
          return;
        }
        setStore(biz);
        setMenu(groups);
        setActiveCat(groups[0]?.id ?? null);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const activeGroup = useMemo(
    () => menu.find((g) => g.id === activeCat) ?? menu[0] ?? null,
    [menu, activeCat],
  );

  const scrollToCat = (catId) => {
    setActiveCat(catId);
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (error) {
    return (
      <>
        <div style={S.errorScreen}>
          <span className="ms" style={{ fontSize: 40, color: 'var(--faint)' }}>storefront</span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 12 }}>
            No pudimos abrir el negocio
          </div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6 }}>{error}</div>
          <button onClick={() => router.push('/home')} style={S.errorBtn}>Volver al inicio</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', paddingBottom: 112, marginTop: -44, minHeight: 0 }}>

          {/* Portada */}
          <div style={{ position: 'relative', height: 214, ...bg(store?.cover_url) }}>
            <div style={S.coverShade} />
            <div style={S.coverActions}>
              <button onClick={() => router.back()} style={S.roundBtn} aria-label="Volver">
                <span className="ms" style={{ fontSize: 21 }}>arrow_back_ios_new</span>
              </button>
              <div style={{ display: 'flex', gap: 9 }}>
                <button
                  onClick={() => setFav((f) => !f)}
                  style={S.roundBtn}
                  aria-label={fav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
                >
                  <span
                    className={`ms ${fav ? 'ms-fill' : ''}`}
                    style={{ fontSize: 21, color: fav ? 'var(--primary)' : 'var(--text)' }}
                  >
                    favorite
                  </span>
                </button>
                <button style={S.roundBtn} aria-label="Compartir">
                  <span className="ms" style={{ fontSize: 21 }}>ios_share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hoja con la ficha del negocio */}
          <div style={S.sheet}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
              {loading ? 'Cargando…' : store?.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {store?.category}
              {store?.distance_km != null && ` · ${kmLabel(store.distance_km)}`}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <div style={S.statCard}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontWeight: 800, fontSize: 14 }}>
                  <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>star</span>
                  {store?.rating ?? '—'}
                </div>
                <div style={S.statLabel}>
                  {store ? `${Number(store.reviews_count).toLocaleString('es-CO')} reseñas` : ''}
                </div>
              </div>
              <div style={S.statCard}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {store ? etaLabel(store.prep_time_min) : '—'}
                </div>
                <div style={S.statLabel}>Entrega</div>
              </div>
              <div style={S.statCard}>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>
                  {store ? feeLabel(store.delivery_fee) : '—'}
                </div>
                <div style={S.statLabel}>Envío</div>
              </div>
            </div>

            <div style={S.couponNotice}>
              <span className="ms" style={{ fontSize: 20, color: '#A8730B' }}>local_activity</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#7A5405', lineHeight: 1.35 }}>
                15% off en tu primer pedido con TURA15
              </span>
            </div>
          </div>

          {/* Chips de categoría (sticky) */}
          <div className="hs" style={S.catBar}>
            {menu.map((g) => {
              const active = activeGroup?.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => scrollToCat(g.id)}
                  style={{
                    flex: 'none', height: 34, padding: '0 14px', borderRadius: 999,
                    fontSize: 13, fontWeight: 700,
                    background: active ? 'var(--text)' : 'var(--surface)',
                    color: active ? '#fff' : 'var(--text)',
                    border: active ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {g.name}
                </button>
              );
            })}
          </div>

          {/* Menú */}
          <div style={{ padding: '14px 20px 0' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ height: 100, borderRadius: 15, background: 'var(--surface2)' }} />
                ))}
              </div>
            )}

            {menu.map((group) => (
              <section
                key={group.id}
                ref={(el) => { sectionRefs.current[group.id] = el; }}
                style={{ scrollMarginTop: 70 }}
              >
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                  {group.name}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
                  {group.products.map((m) => {
                    const off = m.compare_price
                      ? `-${Math.round(((m.compare_price - m.price) / m.compare_price) * 100)}%`
                      : null;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedProduct(m)}
                        style={S.menuRow}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 3 }}>
                            {m.description}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 15 }}>{cop(m.price)}</span>
                            {off && (
                              <>
                                <span style={S.offTag}>{off}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--faint)', textDecoration: 'line-through' }}>
                                  {cop(m.compare_price)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div style={{ position: 'relative', flex: 'none', width: 86, height: 86, borderRadius: 15, ...bg(m.image_url) }}>
                          <span style={S.addChip}>
                            <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>add</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Barra de canasta móvil */}
        {showCartBar && (
          <div style={S.cartBarWrap}>
            <button onClick={() => router.push('/cart')} style={S.cartBar}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 15 }}>
                <span style={S.cartCount}>{cartCount}</span>
                Ir a comprar
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 16 }}>
                {cop(cartSubtotal)}
                <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
              </span>
            </button>
          </div>
        )}

        {/* Modal de Producto Rápido & Personalización */}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            store={store}
            onClose={() => setSelectedProduct(null)}
          />
        )}
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
  coverShade: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 45%)',
  },
  coverActions: {
    position: 'absolute', top: 52, left: 16, right: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  roundBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,.92)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sheet: {
    background: 'var(--bg)', borderRadius: '28px 28px 0 0', marginTop: -24,
    position: 'relative', padding: '18px 20px 0',
  },
  statCard: {
    flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 10, textAlign: 'center',
  },
  statLabel: {
    fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginTop: 2,
  },
  couponNotice: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 12,
    background: '#FFF7E6', borderRadius: 14, padding: '11px 13px',
  },
  catBar: {
    position: 'sticky', top: 0, zIndex: 5, display: 'flex', gap: 8,
    background: 'var(--bg)', padding: '16px 20px 12px',
    borderBottom: '1px solid var(--border)',
  },
  menuRow: {
    display: 'flex', gap: 13, alignItems: 'center', textAlign: 'left',
    padding: '14px 0', borderBottom: '1px solid var(--border)', width: '100%',
  },
  offTag: {
    background: '#FFE9A3', fontSize: 10.5, fontWeight: 800, padding: '2px 5px', borderRadius: 5,
  },
  addChip: {
    position: 'absolute', right: -6, bottom: -6, width: 30, height: 30, borderRadius: '50%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadowSm)',
  },
  cartBarWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 20px 20px',
    background: 'linear-gradient(180deg,rgba(246,245,242,0),var(--bg) 40%)',
  },
  cartBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    // Verde, distinto del naranja de "agregar": esta barra no agrega
    // nada, te saca de la tienda para pagar.
    height: 58, borderRadius: 999, color: '#fff',
    background: 'linear-gradient(96deg, #12B972 0%, #0E9E5F 100%)',
    padding: '0 20px',
    boxShadow: '0 12px 30px rgba(14,158,95,.4), inset 0 1px 0 rgba(255,255,255,.22)',
  },
  cartCount: {
    minWidth: 24, height: 24, borderRadius: 8, background: 'rgba(255,255,255,.22)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800,
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
