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
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useThemeStore } from '@/store/useThemeStore';
import { getBusiness, getMenu } from '@/lib/data';
import { cop, feeLabel, etaLabel, kmLabel } from '@/lib/format';
import ProductModal from '../../components/ProductModal';

export default function StorePage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { id } = useParams();
  const searchParams = useSearchParams();
  const productIdFromUrl = searchParams.get('product');

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

  const handleProductClick = (m) => {
    // Solo popup en desktop/laptop; en mobile flujo de pantallas /product/[id]
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSelectedProduct(m);
    } else {
      router.push(`/product/${m.id}`);
    }
  };

  useEffect(() => {
    if (productIdFromUrl && menu.length > 0) {
      for (const g of menu) {
        const found = g.products.find((p) => p.id === productIdFromUrl);
        if (found) {
          setSelectedProduct(found);
          break;
        }
      }
    }
  }, [productIdFromUrl, menu]);

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

          {/* Contenedor Centrado para Desktop y Fluido en Mobile */}
          <div className="store-page-container">

            {/* Portada */}
            <div style={{
              position: 'relative', height: 240, ...bg(store?.cover_url),
              borderRadius: '0 0 24px 24px', overflow: 'hidden', marginTop: 44,
            }}>
              <div style={S.coverShade} />
              <div style={S.coverActions}>
                <button onClick={() => router.back()} style={S.roundBtn} aria-label="Volver">
                  <span className="ms" style={{ fontSize: 21 }}>arrow_back_ios_new</span>
                </button>
                <div style={{ display: 'flex', gap: 9 }}>
                  <button
                    onClick={toggleTheme}
                    style={S.roundBtn}
                    aria-label="Cambiar tema"
                    title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  >
                    <span className="ms" style={{ fontSize: 20, color: theme === 'dark' ? '#FFB800' : 'var(--text)' }}>
                      {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                    </span>
                  </button>
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
            <div style={{
              ...S.sheet,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 24,
              boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
              marginTop: -20,
              padding: '24px 24px 18px',
            }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
                {loading ? 'Cargando…' : store?.name}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
                {store?.category}
                {store?.distance_km != null && ` · ${kmLabel(store.distance_km)}`}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <div style={S.statCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 800, fontSize: 15 }}>
                    <span className="ms ms-fill" style={{ fontSize: 17, color: 'var(--amber)' }}>star</span>
                    {store?.rating ?? '—'}
                  </div>
                  <div style={S.statLabel}>
                    {store ? `${Number(store.reviews_count).toLocaleString('es-CO')} reseñas` : ''}
                  </div>
                </div>
                <div style={S.statCard}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {store ? etaLabel(store.prep_time_min) : '—'}
                  </div>
                  <div style={S.statLabel}>Entrega</div>
                </div>
                <div style={S.statCard}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--green)' }}>
                    {store ? feeLabel(store.delivery_fee) : '—'}
                  </div>
                  <div style={S.statLabel}>Envío</div>
                </div>
              </div>

              <div style={S.couponNotice}>
                <span className="ms" style={{ fontSize: 20, color: '#A8730B' }}>local_activity</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#7A5405', lineHeight: 1.35 }}>
                  15% off en tu primer pedido con TURA15
                </span>
              </div>
            </div>

            {/* Chips de categoría (sticky) */}
            <div className="hs" style={{ ...S.catBar, background: 'var(--bg)', borderRadius: 16, marginTop: 12, padding: '12px 0' }}>
              {menu.map((g) => {
                const active = activeGroup?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => scrollToCat(g.id)}
                    style={{
                      flex: 'none', height: 36, padding: '0 16px', borderRadius: 999,
                      fontSize: 13.5, fontWeight: 700,
                      background: active ? 'var(--text)' : 'var(--surface)',
                      color: active ? 'var(--bg)' : 'var(--text)',
                      border: active ? 'none' : '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>

            {/* Menú con Grilla Responsiva para Desktop */}
            <div style={{ padding: '18px 0 0' }}>
              {loading && (
                <div className="store-products-grid">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ height: 110, borderRadius: 20, background: 'var(--surface2)' }} />
                  ))}
                </div>
              )}

              {menu.map((group) => (
                <section
                  key={group.id}
                  ref={(el) => { sectionRefs.current[group.id] = el; }}
                  style={{ scrollMarginTop: 70, marginBottom: 28 }}
                >
                  <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, marginBottom: 14 }}>
                    {group.name}
                  </div>
                  <div className="store-products-grid">
                    {group.products.map((m) => {
                      const off = m.compare_price
                        ? `-${Math.round(((m.compare_price - m.price) / m.compare_price) * 100)}%`
                        : null;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleProductClick(m)}
                          className="store-dish-card"
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15.5 }}>{m.name}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, marginTop: 4 }}>
                              {m.description}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 10 }}>
                              <span style={{ fontWeight: 800, fontSize: 16 }}>{cop(m.price)}</span>
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
                          <div style={{ position: 'relative', flex: 'none', width: 90, height: 90, borderRadius: 16, ...bg(m.image_url) }}>
                            <span style={S.addChip}>
                              <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span>
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
        </div>

        {/* Barra de canasta móvil */}
        {showCartBar && (
          <div style={S.cartBarWrap}>
            <button onClick={() => router.push('/cart')} style={S.cartBar}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 15 }}>
                <span style={S.cartCount}>{cartCount}</span>
                Ver canasta de compra
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
  actionBtn: {
    width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.92)',
    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(0,0,0,.15)', border: 'none', cursor: 'pointer',
  },
  sheet: {
    position: 'relative', marginTop: -24, borderRadius: '28px 28px 0 0',
    background: 'var(--bg)', padding: '22px 20px 100px',
  },
  deskWrap: {
    maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px',
  },
  deskGrid: {
    display: 'grid', gridTemplateColumns: '1fr', gap: 28,
  },
  pill: {
    padding: '12px 14px', borderRadius: 16, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10,
  },
  pillIcon: {
    width: 36, height: 36, borderRadius: 10, background: 'rgba(255,68,31,.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  couponBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
    borderRadius: 14, background: 'var(--amberSoft)', border: '1px solid rgba(255,176,32,.25)',
    color: '#A8730B', fontSize: 13, fontWeight: 700,
  },
  catBar: {
    display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 0',
    position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)',
  },
  catChip: {
    flex: 'none', padding: '7px 16px', borderRadius: 999, fontSize: 13,
    fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .15s',
  },
  dishCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)',
    textAlign: 'left', cursor: 'pointer', transition: 'all .15s ease',
  },
  dishCover: {
    width: 88, height: 88, borderRadius: 14, backgroundSize: 'cover',
    backgroundPosition: 'center', flex: 'none', position: 'relative',
    backgroundColor: 'var(--surface2)',
  },
  addMini: {
    position: 'absolute', right: -6, bottom: -6, width: 30, height: 30, borderRadius: '50%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadowSm)',
  },
  statCard: {
    flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 10, textAlign: 'center',
  },
  statLabel: {
    fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginTop: 2,
  },
  cartBarWrap: {
    position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 20px calc(14px + env(safe-area-inset-bottom, 0px))',
    maxWidth: 540, margin: '0 auto', zIndex: 40,
    background: 'linear-gradient(180deg, transparent 0%, var(--bg) 35%)',
  },
  cartBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    height: 56, borderRadius: 999, color: '#fff',
    background: 'linear-gradient(96deg, #12B972 0%, #0E9E5F 100%)',
    padding: '0 20px', border: 'none', cursor: 'pointer',
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
