'use client';

/**
 * INICIO DEL CLIENTE
 *
 * Conversión 1:1 de las pantallas `isHome` (móvil, línea 212) e
 * `isDeskHome` (escritorio, línea 137) de
 * "TuraFood PWA - V2 - 13-08-2026/TuraFood - Cliente.dc.html".
 *
 * Regla de este archivo: NO inventar contenido ni medidas. Cada valor
 * (px, color, copy, orden de secciones) sale del mockup. Los datos
 * variables salen de `lib/data`; los fijos, de `lib/seed`.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusinesses, getFavorites, toggleFavorite } from '@/lib/data';
import {
  DESK_VERTICALS, STRIP_VERTICALS, HOME_BANNERS, HOME_PROMOS,
} from '@/lib/seed';
import { cop, feeLabel, etaLabel } from '@/lib/format';
import { useSearchOverlay } from '../components/SearchOverlay';
import { useAi } from '../components/AiOverlay';
import { Cover, Icon3D } from '../components/Media';

export default function HomePage() {
  const router = useRouter();

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favs, setFavs] = useState([]);
  const [banner, setBanner] = useState(0);
  const [query, setQuery] = useState('');

  const cartCount = useCartStore((s) => s.getTotalItems());
  const addLine = useCartStore((s) => s.addLine);
  const openSearch = useSearchOverlay((s) => s.openSearch);
  const openAi = useAi((s) => s.openAi);
  const hasCart = cartCount > 0;

  const addrShort = 'Cra 3 # 4-45, Centro';

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getBusinesses();
        if (alive) setStores(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Favoritos: base de datos si hay sesión, navegador si no
  useEffect(() => {
    let alive = true;
    getFavorites()
      .then((ids) => { if (alive) setFavs(ids); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const toggleFav = async (id) => {
    const wasFav = favs.includes(id);
    setFavs((p) => (wasFav ? p.filter((x) => x !== id) : [...p, id]));
    try {
      await toggleFavorite(id);
    } catch {
      setFavs((p) => (wasFav ? [...p, id] : p.filter((x) => x !== id)));
    }
  };

  // "Pide de nuevo" son los tres primeros negocios, como en el mockup
  const again = stores.slice(0, 3);

  const deskResults = query.trim()
    ? stores.filter(
      (s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        (s.category ?? '').toLowerCase().includes(query.toLowerCase()),
    )
    : [];

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        {/* ============================================================
            CABECERA ESCRITORIA — isDeskHome
            ============================================================ */}
        <div className="desktop-only" style={S.deskHeader}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>
            <span style={S.deskLogo}>
              <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>shopping_bag</span>
            </span>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, letterSpacing: '-.03em' }}>
              TuraFood
            </span>
          </span>

          <button onClick={() => router.push('/account/addresses')} style={S.deskAddr}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>location_on</span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 10, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
                ENTREGAR EN
              </span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 1 }}>{addrShort}</span>
            </span>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>expand_more</span>
          </button>

          <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
            <div style={S.deskSearch}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca restaurantes, tiendas o platos"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14, minWidth: 0 }}
              />
            </div>
            {query.trim().length > 0 && (
              <div style={S.deskResults}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', padding: '0 8px 8px' }}>
                  RESULTADOS
                </div>
                {deskResults.map((s) => (
                  <button key={s.id} onClick={() => router.push(`/store/${s.id}`)} style={S.deskResultRow}>
                    <Cover src={s.cover_url} alt={s.name} radius={12} sizes="48px" style={{ width: 48, height: 48, flex: 'none' }} />
                    <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                      <span className="tr1" style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>{s.name}</span>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{s.category}</span>
                    </span>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
                  </button>
                ))}
                {deskResults.length === 0 && (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                    No se encontraron resultados para &quot;{query}&quot;
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={openAi} style={S.aiBtn}>
            <span className="ms ms-fill" style={{ fontSize: 20, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Tura IA</span>
          </button>

          <button onClick={() => router.push('/account')} style={S.deskCircle}>
            <span className="ms" style={{ fontSize: 21 }}>person</span>
          </button>
        </div>

        {/* Verticales de escritorio: emoji, no imagen.
            El `display` lo pone la clase .desktop-only, no un inline. */}
        <div className="desktop-only" style={{ padding: '26px 48px 0', gap: 14 }}>
          {DESK_VERTICALS.map((v) => (
            <button
              key={v.id}
              onClick={() => router.push(`/list?v=${v.go === 'market' ? 'market' : 'restaurant'}`)}
              className="md3-card"
              style={{ ...S.deskVertical, background: v.bg }}
            >
              <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 44, lineHeight: 1 }}>{v.emoji}</span>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, letterSpacing: '-.02em', color: v.fg }}>
                {v.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, marginTop: 3, color: v.fg, opacity: .75 }}>
                {v.hint}
              </span>
            </button>
          ))}
        </div>

        {/* ============================================================
            CABECERA MÓVIL — isHome
            ============================================================ */}
        <div className="mobile-only" style={{ flex: 'none', background: 'var(--bg)', padding: '4px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <button onClick={() => router.push('/account/addresses')} style={S.addrBtn}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em' }}>
                BUENAVENTURA
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 15, maxWidth: '100%' }}>
                <span className="tr1">{addrShort}</span>
                <span className="ms" style={{ fontSize: 19, color: 'var(--muted)', flex: 'none' }}>expand_more</span>
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
              <button onClick={() => router.push('/notifications')} style={S.iconBtn}>
                <span className="ms" style={{ fontSize: 20 }}>notifications</span>
              </button>
              <button onClick={() => router.push('/cart')} style={{ ...S.iconBtn, position: 'relative' }}>
                <span className="ms" style={{ fontSize: 20 }}>shopping_bag</span>
                {hasCart && <span style={S.cartBadge}>{cartCount}</span>}
              </button>
            </div>
          </div>

          {/* Abre el buscador encima, sin cambiar de ruta */}
          <button onClick={openSearch} style={S.searchBtn}>
            <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>search</span>
            <span style={{ flex: 1, fontSize: 14.5, color: 'var(--faint)', fontWeight: 500, textAlign: 'left' }}>
              Busca &quot;encocado de jaiba&quot;
            </span>
          </button>
        </div>

        {/* ============================================================
            CONTENIDO
            ============================================================ */}
        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 108px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 20 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* ============================================================
              SLIDER PRO
              Unificado: Combina categorías destacadas y promos
              ============================================================ */}
          <div className="mobile-only" style={{ padding: '16px 0 0' }}>
            <div
              className="hs"
              style={{
                display: 'flex', gap: 14, padding: '0 20px 20px',
                scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                overflowX: 'auto',
              }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const index = Math.round(el.scrollLeft / (el.clientWidth * 0.85));
                setBanner(index);
              }}
            >
              {[
                {
                  id: 'f1',
                  image: '/images/food-fork.jpg',
                  badge: 'TOP RESTAURANTE',
                  title: 'Marisquería El Faro',
                  subtitle: 'El mejor encocado de la semana',
                  action: () => router.push('/store/b0000000-0000-4000-8000-000000000003'),
                },
                {
                  id: 'f2',
                  image: '/images/burger.jpg',
                  badge: 'OFERTA LIMITADA',
                  title: 'Hasta 40% OFF',
                  subtitle: 'En tus hamburguesas favoritas',
                  action: () => router.push('/offers'),
                },
                {
                  id: 'f3',
                  image: '/images/steak-ribeye.jpg',
                  badge: 'NUEVO',
                  title: 'Asadero El Puerto',
                  subtitle: 'Disfruta las mejores picadas',
                  action: () => router.push('/store/b0000000-0000-4000-8000-000000000001'),
                },
                {
                  id: 'f4',
                  image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop',
                  badge: 'LICORES Y MÁS',
                  title: 'Zona de Licores',
                  subtitle: 'Bebidas frías para tu noche',
                  action: () => router.push('/list?v=liquor'),
                },
              ].map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={slide.action}
                  style={{
                    flex: 'none',
                    width: '85vw',
                    maxWidth: 340,
                    height: 190,
                    borderRadius: 24,
                    overflow: 'hidden',
                    position: 'relative',
                    scrollSnapAlign: 'center',
                    padding: 0,
                    textAlign: 'left',
                    boxShadow: '0 16px 32px -10px rgba(0,0,0,0.15)',
                    background: 'var(--surface2)',
                    border: 'none',
                  }}
                >
                  <Cover src={slide.image} alt={slide.title} sizes="400px" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
                  <div style={{
                    position: 'absolute', inset: 0, zIndex: 2,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(20,16,10,0.85) 100%)',
                  }} />
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3,
                    padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <span style={{
                      alignSelf: 'flex-start',
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '.08em',
                      padding: '5px 12px',
                      borderRadius: 99,
                      textTransform: 'uppercase',
                      border: '1px solid rgba(255,255,255,0.15)'
                    }}>
                      {slide.badge}
                    </span>
                    <span style={{ color: '#fff', fontSize: 24, fontWeight: 800, lineHeight: 1.1, fontFamily: 'var(--font-bricolage)', letterSpacing: '-.02em', marginTop: 2 }}>
                      {slide.title}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>
                      {slide.subtitle}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {/* Indicadores */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -6 }}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  style={{
                    width: i === banner ? 20 : 6, height: 6, borderRadius: 99,
                    background: i === banner ? 'var(--primary)' : 'var(--border)',
                    transition: 'all .3s cubic-bezier(.25,.8,.25,1)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ============================================================
              ICONOS 3D (Restaurados)
              ============================================================ */}
          <div className="mobile-only" style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px' }}>
              <button onClick={() => router.push('/list?v=restaurant')} style={{ ...S.bigVertical, background: '#FDF0EA' }}>
                <Icon3D src="/images/ic-restaurantes.png" alt="" sizes="200px" style={S.bigVerticalImg} />
                <span style={{ fontSize: 20, fontWeight: 500, color: '#A8412A', letterSpacing: '-.01em', position: 'relative' }}>Restaurantes</span>
              </button>
              <button onClick={() => router.push('/list?v=market')} style={{ ...S.bigVertical, background: '#DCF2EA' }}>
                <Icon3D src="/images/ic-mercado.png" alt="" sizes="200px" style={S.bigVerticalImg} />
                <span style={{ fontSize: 20, fontWeight: 500, color: '#0E7A52', letterSpacing: '-.01em', position: 'relative' }}>Mercado</span>
              </button>
            </div>
          </div>

          {/* Tira de verticales (móvil) */}
          <div className="mobile-only">
            <div className="hs" style={{ display: 'flex', gap: 10, padding: '12px 20px 4px' }}>
            {STRIP_VERTICALS.map((v) => (
              <button
                key={v.id}
                onClick={() => (v.external
                  ? window.open(v.external, '_blank', 'noopener,noreferrer')
                  : router.push(`/list?v=${v.id}`))}
                style={S.stripVertical}
              >
                <Icon3D src={v.img} alt="" sizes="104px" style={S.stripVerticalImg} />
                {v.badge && <span style={S.stripBadge}>{v.badge}</span>}
                <span style={{ fontSize: 13.5, color: 'var(--text)', position: 'relative', textAlign: 'center', lineHeight: 1.15 }}>
                  {v.label}
                </span>
              </button>
            ))}
            </div>
          </div>

          {/* Pide de nuevo */}
          <div style={{ marginTop: 14, padding: '0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={S.h2}>Pide de nuevo</span>
              <button onClick={() => router.push('/account/orders')} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary)' }}>
                Ver todos
              </button>
            </div>
          </div>
          <div className="hs" style={{ display: 'flex', gap: 13, padding: '12px 20px 0' }}>
            {loading
              ? [0, 1, 2].map((i) => <div key={i} style={{ ...S.skeleton, width: 198, height: 160 }} />)
              : again.map((s) => (
                <button key={s.id} onClick={() => router.push(`/store/${s.id}`)} style={{ flex: 'none', width: 198, textAlign: 'left', padding: 0 }}>
                  <Cover src={s.cover_url} alt={s.name} radius={18} sizes="200px" style={{ height: 118 }}>
                    {Number(s.delivery_fee) === 0 && <span style={S.freeShip}>ENVÍO GRATIS</span>}
                  </Cover>
                  <div className="tr1" style={{ fontWeight: 700, fontSize: 14.5, marginTop: 9 }}>{s.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                    <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                    {s.rating}
                    <span style={{ color: 'var(--faint)' }}>·</span>
                    {etaLabel(s.prep_time_min)}
                  </div>
                </button>
              ))}
          </div>

          {/* Promos irresistibles */}
          <div style={{ marginTop: 24, padding: '0 20px' }}>
            <span style={S.h2}>Promos irresistibles</span>
          </div>
          <div className="hs" style={{ display: 'flex', gap: 13, padding: '12px 20px 0' }}>
            {HOME_PROMOS.map((p) => (
              <div key={p.id} style={{ flex: 'none', width: 158 }}>
                <Cover src={p.image_url} alt={p.name} radius={18} sizes="160px" style={{ height: 158 }}>
                  <button
                    onClick={() => addLine(
                      {
                        productId: p.id, name: p.name, unitPrice: p.price,
                        basePrice: p.price, comparePrice: p.was,
                        image_url: p.image_url, extraIds: [], notes: '', opts: '', qty: 1,
                      },
                      { id: p.businessId ?? p.id, name: p.store, image: p.image_url },
                    )}
                    style={S.addBtn}
                    aria-label={`Agregar ${p.name}`}
                  >
                    <span className="ms" style={{ fontSize: 22 }}>add</span>
                  </button>
                </Cover>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 9 }}>
                  <span style={{ fontWeight: 800, fontSize: 15.5 }}>{cop(p.price)}</span>
                  <span style={S.offTag}>{p.off}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--faint)', textDecoration: 'line-through' }}>{cop(p.was)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.3, marginTop: 4, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                  <span className="ms" style={{ fontSize: 13 }}>schedule</span>
                  {p.eta} · {p.store}
                </div>
              </div>
            ))}
          </div>

          {/* Lo mejor de Buenaventura */}
          <div style={{ marginTop: 26, padding: '0 20px' }}>
            <span style={S.h2}>Lo mejor de Buenaventura</span>
          </div>
          <div className="resp-grid" style={{ padding: '12px 20px 0' }}>
            {loading
              ? [0, 1, 2, 3].map((i) => <div key={i} style={{ ...S.skeleton, height: 100 }} />)
              : stores.map((s) => (
                // El botón de favorito NO puede ir dentro del botón de la fila:
                // un <button> dentro de otro es HTML inválido y rompe la
                // hidratación. Va como hermano, posicionado sobre la esquina.
                <div key={s.id} style={S.storeRow}>
                  <button
                    onClick={() => router.push(`/store/${s.id}`)}
                    style={S.storeRowMain}
                  >
                    <Cover src={s.cover_url} alt={s.name} radius={14} sizes="80px" style={{ flex: 'none', width: 78, height: 78 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 26 }}>
                        <span className="tr1" style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                      </div>
                      <div className="tr1" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.category}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text)' }}>
                          <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                          {s.rating}
                        </span>
                        <span style={{ color: 'var(--faint)' }}>·</span>
                        <span>{etaLabel(s.prep_time_min)}</span>
                        <span style={{ color: 'var(--faint)' }}>·</span>
                        <span>{feeLabel(s.delivery_fee)}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => toggleFav(s.id)}
                    style={S.favBtn}
                    aria-label={favs.includes(s.id) ? `Quitar ${s.name} de favoritos` : `Guardar ${s.name} en favoritos`}
                  >
                    <span
                      className={`ms ${favs.includes(s.id) ? 'ms-fill' : ''}`}
                      style={{ fontSize: 19, color: favs.includes(s.id) ? 'var(--primary)' : 'var(--faint)' }}
                    >
                      favorite
                    </span>
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* El botón flotante de Tura IA lo provee AppShell en toda la app */}
      </div>
    </>
  );
}

/* ------------------------------------------------------------
   Helpers y estilos — valores literales del mockup
   ------------------------------------------------------------ */

const S = {
  // Botón flotante de Tura IA, encima de la barra inferior.
  // OJO: sin `display` aquí — lo decide la clase .mobile-only.
  aiFab: {
    position: 'absolute', right: 16, bottom: 92, zIndex: 60,
    height: 42, padding: '0 16px', borderRadius: 999,
    background: 'linear-gradient(135deg,#2A2620,#17140F)', color: '#fff',
    boxShadow: '0 8px 24px rgba(20,16,10,.32)',
  },

  // Escritorio
  deskHeader: {
    flex: 'none', alignItems: 'center', gap: 22, padding: '18px 48px',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
  },
  deskLogo: {
    width: 38, height: 38, borderRadius: 12,
    background: 'linear-gradient(150deg,#FF7A3D,#FF441F)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,68,31,.3)',
  },
  deskAddr: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 9, height: 44,
    padding: '0 16px', borderRadius: 14, background: 'var(--bg)',
    border: '1px solid var(--border)',
  },
  deskSearch: {
    display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 16px',
    borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0,
  },
  deskResults: {
    position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
    background: 'var(--surface)', borderRadius: 20, boxShadow: 'var(--shadow)',
    padding: 12, zIndex: 100, maxHeight: 400, overflowY: 'auto',
  },
  deskResultRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 8px', borderRadius: 12, background: 'transparent',
  },
  deskVertical: {
    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    height: 150, borderRadius: 20, padding: 16, textAlign: 'left',
    position: 'relative', overflow: 'hidden',
  },
  deskCircle: {
    flex: 'none', width: 44, height: 44, borderRadius: '50%',
    background: 'var(--bg)', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  aiBtn: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 44,
    padding: '0 18px 0 14px', borderRadius: 999,
    background: 'linear-gradient(135deg,#2A2620,#17140F)', color: '#fff',
  },

  // Móvil
  addrBtn: {
    display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1,
    textAlign: 'left', padding: 0,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19,
    padding: '0 4px', borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 10.5, fontWeight: 800, display: 'flex',
    alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)',
  },
  searchBtn: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 13,
    height: 50, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: '0 15px', boxShadow: 'var(--shadowSm)', textAlign: 'left',
  },
  bigVertical: {
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    height: 170, borderRadius: 22, padding: 14, textAlign: 'left',
    position: 'relative', overflow: 'hidden',
  },
  bigVerticalImg: {
    position: 'absolute', left: 0, right: 0, top: 6, height: 104,
    backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
  },
  stripVertical: {
    flex: 'none', width: 104, height: 106, borderRadius: 18, background: 'var(--surface2)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
    padding: '0 8px 11px', position: 'relative', overflow: 'hidden',
  },
  stripVerticalImg: {
    position: 'absolute', left: 0, right: 0, top: 8, height: 62,
    backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
  },
  stripBadge: {
    position: 'absolute', top: 6, right: 6, zIndex: 2,
    background: 'var(--primary)', color: '#fff',
    fontSize: 8.5, fontWeight: 800, letterSpacing: '.04em',
    padding: '2px 5px', borderRadius: 5,
  },
  banner: {
    flex: 'none', width: 302, minHeight: 158, borderRadius: 22, padding: 18,
    position: 'relative', overflow: 'hidden', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
  },
  bannerBubble: {
    position: 'absolute', right: -30, top: -30, width: 140, height: 140,
    borderRadius: '50%', background: 'rgba(255,255,255,.12)',
  },
  bannerTitle: {
    position: 'relative', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 23, lineHeight: 1.08, marginTop: 7, maxWidth: 215, color: '#fff',
    textWrap: 'balance',
  },
  bannerCode: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff',
    fontWeight: 800, fontSize: 11.5, padding: '8px 12px', borderRadius: 999,
  },
  h2: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20, letterSpacing: '-.01em',
  },
  freeShip: {
    position: 'absolute', left: 8, bottom: 8, background: 'var(--amber)',
    color: '#17140F', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
  },
  addBtn: {
    position: 'absolute', right: 8, top: 8, width: 34, height: 34, borderRadius: '50%',
    background: 'var(--primary)', color: '#fff', display: 'flex',
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(255,68,31,.4)',
  },
  offTag: {
    background: '#FFE9A3', fontSize: 10.5, fontWeight: 800, padding: '2px 5px', borderRadius: 5,
  },
  storeRow: {
    position: 'relative', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 18, padding: 11,
    boxShadow: 'var(--shadowSm)',
  },
  storeRowMain: {
    display: 'flex', gap: 12, alignItems: 'center',
    width: '100%', textAlign: 'left', background: 'none',
  },
  favBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  skeleton: {
    borderRadius: 18, background: 'var(--surface2)',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '0 20px 12px',
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
