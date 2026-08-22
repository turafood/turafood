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

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { getBusinesses, getFavorites, toggleFavorite, search } from '@/lib/data';
import {
  DESK_VERTICALS, STRIP_VERTICALS, HOME_BANNERS, HOME_PROMOS,
} from '@/lib/seed';
import { cop, feeLabel, etaLabel } from '@/lib/format';
import { useSearchOverlay } from '../components/SearchOverlay';
import { useAi } from '../components/AiOverlay';
import { Cover, Icon3D } from '../components/Media';
import FastViewModal from '../components/FastViewModal';
import { useThemeStore } from '@/store/useThemeStore';

const TOP_SELLING_MONTH = [
  {
    id: 'top-1',
    productId: 'prod-encocado-jaiba',
    businessId: 'b0000000-0000-4000-8000-000000000003',
    businessName: 'Marisquería El Faro',
    businessCover: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop',
    name: 'Encocado de Jaiba Real',
    price: 32000,
    rating: '5.0',
    reviewsCount: 148,
    image_url: '/images/food-fork.jpg',
    badge: '🔥 #1 MÁS VENDIDO',
    badgeBg: 'linear-gradient(135deg, #FF441F, #E2360F)',
    prepTime: '15-25 min',
    avatars: ['👩🏾', '👨🏽', '👱🏾‍♀️'],
  },
  {
    id: 'top-2',
    productId: 'prod-picada-puerto',
    businessId: 'b0000000-0000-4000-8000-000000000001',
    businessName: 'Asadero El Puerto',
    businessCover: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=400&auto=format&fit=crop',
    name: 'Picada Especial del Puerto',
    price: 38000,
    rating: '5.0',
    reviewsCount: 112,
    image_url: '/images/steak-ribeye.jpg',
    badge: '⭐ FAVORITO LOCAL',
    badgeBg: 'linear-gradient(135deg, #FFB020, #D98200)',
    prepTime: '20-30 min',
    avatars: ['👨🏿', '👩🏽', '👨🏾'],
  },
  {
    id: 'top-3',
    productId: 'prod-burger-doble',
    businessId: 'b0000000-0000-4000-8000-000000000002',
    businessName: 'Burger House Tura',
    businessCover: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400&auto=format&fit=crop',
    name: 'Burger Doble Criolla Turín',
    price: 24500,
    rating: '4.9',
    reviewsCount: 96,
    image_url: '/images/burger.jpg',
    badge: '⚡ SÚPER PROMO',
    badgeBg: 'linear-gradient(135deg, #11B26A, #08874E)',
    prepTime: '15-20 min',
    avatars: ['👱🏾', '👩🏾', '🧑🏽'],
  },
  {
    id: 'top-4',
    productId: 'prod-pargo-rojo',
    businessId: 'b0000000-0000-4000-8000-000000000004',
    businessName: 'El Rincón Marino',
    businessCover: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?q=80&w=400&auto=format&fit=crop',
    name: 'Pargo Rojo con Patacón',
    price: 35000,
    rating: '5.0',
    reviewsCount: 84,
    image_url: '/images/food-fork.jpg',
    badge: '👑 PACÍFICO TOP',
    badgeBg: 'linear-gradient(135deg, #7D25E8, #5B14B3)',
    prepTime: '25-35 min',
    avatars: ['👩🏿', '👨🏽', '👧🏾'],
  },
];

export default function HomePage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favs, setFavs] = useState([]);
  const [banner, setBanner] = useState(0);
  const [query, setQuery] = useState('');
  const [fastViewStore, setFastViewStore] = useState(null);
  const sliderRef = useRef(null);

  const cartCount = useCartStore((s) => s.getTotalItems());
  const addLine = useCartStore((s) => s.addLine);
  const openSearch = useSearchOverlay((s) => s.openSearch);
  const openAi = useAi((s) => s.openAi);
  const hasCart = cartCount > 0;

  const addrShort = 'Cra 3 # 4-45, Centro';

  const [topSellingIndex, setTopSellingIndex] = useState(0);
  const topSellingSliderRef = useRef(null);

  // Auto-slide suave para productos destacados en móvil
  useEffect(() => {
    const timer = setInterval(() => {
      setTopSellingIndex((prev) => {
        const next = (prev + 1) % TOP_SELLING_MONTH.length;
        if (topSellingSliderRef.current) {
          const cardWidth = 265;
          topSellingSliderRef.current.scrollTo({
            left: next * (cardWidth + 16),
            behavior: 'smooth',
          });
        }
        return next;
      });
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setBanner((prev) => {
        const next = (prev + 1) % 4;
        if (sliderRef.current) {
          const cardWidth = sliderRef.current.clientWidth * 0.85;
          sliderRef.current.scrollTo({
            left: next * (cardWidth + 14),
            behavior: 'smooth',
          });
        }
        return next;
      });
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (idx) => {
    setBanner(idx);
    if (sliderRef.current) {
      const cardWidth = sliderRef.current.clientWidth * 0.85;
      sliderRef.current.scrollTo({
        left: idx * (cardWidth + 14),
        behavior: 'smooth',
      });
    }
  };

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

  const [deskSearchRes, setDeskSearchRes] = useState({ businesses: [], products: [] });
  const [deskSearching, setDeskSearching] = useState(false);
  const [deskFocused, setDeskFocused] = useState(false);
  const searchBoxRef = useRef(null);

  // Búsqueda AJAX en tiempo real con debounce
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setDeskSearchRes({ businesses: [], products: [] });
      setDeskSearching(false);
      return;
    }

    let alive = true;
    setDeskSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await search(term);
        if (alive) setDeskSearchRes(res);
      } catch {
        // Silencioso para no romper UI
      } finally {
        if (alive) setDeskSearching(false);
      }
    }, 120);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDeskFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSearchQuery = query.trim().length > 0;
  const showSearchDropdown = deskFocused || hasSearchQuery;
  const searchIsEmpty = hasSearchQuery && !deskSearching
    && deskSearchRes.businesses.length === 0 && deskSearchRes.products.length === 0;

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, width: '100%' }}>
        {/* ============================================================
            CABECERA ESCRITORIA — isDeskHome (SEAMLESS EDGE-TO-EDGE & AJAX SEARCH)
            ============================================================ */}
        <div className="desktop-only" style={S.deskHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', cursor: 'pointer' }} onClick={() => router.push('/home')}>
            <span style={{
              width: 40, height: 40, borderRadius: 13, background: 'linear-gradient(135deg, #FF441F 0%, #E2360F 100%)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
              boxShadow: '0 6px 18px rgba(255,68,31,.35)',
            }}>
              <span style={{ fontSize: 21, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-bricolage)' }}>t</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.03em', color: 'var(--text)' }}>
                Tura Food
              </span>
              <span style={{
                fontSize: 12, fontWeight: 900, fontStyle: 'italic',
                color: 'var(--primary)', letterSpacing: '.02em',
              }}>
                AI
              </span>
            </div>
          </div>

          <button onClick={() => router.push('/account/addresses')} style={S.deskAddr}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>location_on</span>
            <span style={{ textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 9.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>
                ENTREGAR EN
              </span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginTop: 1, color: 'var(--text)' }}>{addrShort}</span>
            </span>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>expand_more</span>
          </button>

          {/* BUSCADOR FLOTANTE SPOTLIGHT PRO */}
          <div style={{ flex: 1, position: 'relative', minWidth: 0, maxWidth: 640 }}>
            <div
              onClick={openSearch}
              style={{
                ...S.deskSearch,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all .2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>search</span>
                <span style={{ fontSize: 14.5, color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Busca cualquier plato, producto o restaurante en Buenaventura...
                </span>
              </div>
              <kbd style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontWeight: 700,
                color: 'var(--muted)', fontFamily: 'inherit',
              }}>/</kbd>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            style={{
              height: 42, width: 42, borderRadius: 14,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: theme === 'dark' ? '#FFB800' : 'var(--text)',
              boxShadow: 'var(--shadowSm)', flex: 'none',
            }}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            <span className="ms" style={{ fontSize: 20 }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          <button onClick={openAi} style={S.aiBtn}>
            <span className="ms ms-fill" style={{ fontSize: 18, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Tura IA</span>
          </button>
        </div>

        {/* ============================================================
            1. HERO BANNER ONBOARDING HORIZONTAL (ESTILO APP.TURAFOOD.COM - SEAMLESS OBSIDIAN)
            ============================================================ */}
        <div className="desktop-only" style={{ padding: '24px 48px 0', width: '100%' }}>
          <div style={{
            width: '100%',
            borderRadius: 28,
            background: 'linear-gradient(135deg, #0A0A0A 0%, #050505 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '36px 46px',
            position: 'relative',
            gap: 40,
            minHeight: 280,
          }}>
            {/* Fondo con brillo sutil naranja cálido */}
            <div style={{
              position: 'absolute', top: -80, left: -80, width: 300, height: 300,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,68,31,0.16) 0%, transparent 70%)',
              filter: 'blur(45px)', pointerEvents: 'none',
            }} />

            {/* Columna Izquierda: Contenido & Llamado a la Acción */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Pills superiores */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 12, fontWeight: 800,
                  padding: '5px 14px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 7,
                  backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s infinite' }} />
                  La plataforma de IA para tu Negocio
                </span>
                <span style={{
                  background: 'linear-gradient(135deg, #FF441F, #E2360F)', color: '#fff', fontSize: 11.5,
                  fontWeight: 800, padding: '4px 10px', borderRadius: 8, letterSpacing: '.04em',
                }}>
                  Tura Food AI
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '.04em' }}>
                  MKT PARA NEGOCIOS LOCALES
                </span>
              </div>

              {/* Badges de beneficio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{
                  background: 'rgba(255,184,0,0.12)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)',
                  fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
                }}>
                  🔥 Más pedidos & ventas
                </span>
                <span style={{
                  background: 'rgba(17,178,106,0.12)', color: 'var(--green)', border: '1px solid rgba(17,178,106,0.25)',
                  fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
                }}>
                  ⚡ 0% Comisiones
                </span>
                <span style={{
                  background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)',
                  fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 8,
                }}>
                  co Buenaventura
                </span>
              </div>

              {/* Título Principal */}
              <h2 style={{
                margin: '2px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
                fontSize: 32, letterSpacing: '-.025em', color: '#fff', lineHeight: 1.18,
              }}>
                Tu competencia ya está online. <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>¿Y tú?</span>
              </h2>

              <p style={{ margin: 0, fontSize: 14.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, maxWidth: 560 }}>
                Crea tu cuenta gratis hoy y ten tu negocio digital funcionando en minutos, con pedidos directos a WhatsApp.
              </p>

              {/* Plazas y Urgencia */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  background: 'rgba(255,68,31,0.1)', border: '1px solid rgba(255,68,31,0.2)',
                  color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF441F' }} />
                  Solo quedan <strong style={{ color: '#FFB800' }}>49 plazas</strong> de 100
                </span>
                <span style={{
                  background: 'rgba(17,178,106,0.1)', border: '1px solid rgba(17,178,106,0.25)',
                  color: 'var(--green)', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 99,
                }}>
                  SIEMPRE GRATIS
                </span>
              </div>

              {/* Botón Card de Inscribir Negocio en app.turafood.com */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 4 }}>
                <button
                  onClick={() => window.open('https://app.turafood.com', '_blank')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 22px', borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(255,68,31,0.14), rgba(255,68,31,0.04))',
                    border: '1px solid rgba(255,68,31,0.35)',
                    cursor: 'pointer', transition: 'all .2s ease',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'rgba(255,68,31,0.35)'; }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(255,68,31,0.4)', flex: 'none',
                  }}>
                    <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>storefront</span>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>Inscribir mi Negocio</span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: 'rgba(255,184,0,0.2)', color: '#FFB800', padding: '2px 6px', borderRadius: 6 }}>GRATIS</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                      Inscribe tu restaurante o tienda en <b>app.turafood.com</b>
                    </div>
                  </div>
                  <span className="ms" style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', marginLeft: 8 }}>arrow_forward</span>
                </button>

                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                  PA&apos; TURÍN CON AMOR ❤️ · ★★★★★ 4.9 · 100% de la venta para ti
                </span>
              </div>
            </div>

            {/* Columna Derecha: Chica Afro Cartoon 100% Integrada y Fundida (MÁS GRANDE & PRO) */}
            <div style={{
              position: 'relative', width: 440, height: 320,
              flex: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <video
                src="/turafood-ai-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'contain',
                  background: 'transparent',
                  transform: 'scale(1.22)',
                  transformOrigin: 'center right',
                  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 58%, transparent 96%)',
                  maskImage: 'radial-gradient(circle at 50% 50%, black 58%, transparent 96%)',
                  filter: 'drop-shadow(0 12px 36px rgba(0,0,0,0.7))',
                }}
              />
            </div>
          </div>
        </div>

        {/* ============================================================
            2. VERTICALES DE ESCRITORIO: 4 BENTO CARDS DEBAJO DEL BANNER
            ============================================================ */}
        <div className="desktop-only" style={{ padding: '24px 48px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {DESK_VERTICALS.map((v) => (
            <button
              key={v.id}
              onClick={() => router.push(`/list?v=${v.go === 'market' ? 'market' : 'restaurant'}`)}
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                height: 115, padding: '18px 22px', borderRadius: 22,
                background: v.bg, border: `1px solid ${v.border || 'transparent'}`,
                position: 'relative', overflow: 'hidden', textAlign: 'left',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.06)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.02)'; }}
            >
              <span style={{ position: 'absolute', right: 16, top: 14, fontSize: 38, lineHeight: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))' }}>{v.emoji}</span>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, letterSpacing: '-.02em', color: v.fg }}>
                {v.label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, marginTop: 2, color: v.fg, opacity: .8 }}>
                {v.hint}
              </span>
            </button>
          ))}
        </div>

        {/* ============================================================
            SECCIÓN PRINCIPAL ESCRITORIO: ABIERTOS AHORA CERCA DE TI
            ============================================================ */}
        <div className="desktop-only" style={{ padding: '32px 48px 60px', flexDirection: 'column', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, width: '100%' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text)' }}>
                Abiertos ahora cerca de ti
              </h2>
            </div>
            <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
              6 sitios abiertos cerca de ti
            </span>
          </div>

          {/* Filter Chips Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4, width: '100%', marginBottom: 22 }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              <span className="ms" style={{ fontSize: 16 }}>tune</span> Filtros
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              Recomendado <span className="ms" style={{ fontSize: 16 }}>expand_more</span>
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>two_wheeler</span> Envío gratis
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>bolt</span> Turbo
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>star</span> 4.5+
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}>
              <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>sell</span> Con promo
            </button>
          </div>

          {/* Grilla 3 columnas de Restaurantes (Desktop Exact Match) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, width: '100%' }}>
            {loading
              ? [0, 1, 2, 3, 4, 5].map((i) => <div key={i} style={{ ...S.skeleton, height: 260, borderRadius: 20 }} />)
              : stores.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setFastViewStore(s)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    borderRadius: 20, background: 'var(--surface)',
                    border: '1px solid var(--border)', overflow: 'hidden',
                    cursor: 'pointer', transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    position: 'relative',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.08)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.03)'; }}
                >
                  <div style={{ position: 'relative', height: 160, width: '100%' }}>
                    <Cover src={s.cover_url} alt={s.name} radius={0} sizes="400px" style={{ width: '100%', height: '100%' }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(s.id);
                      }}
                      style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 10,
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', cursor: 'pointer',
                      }}
                      aria-label="Guardar en favoritos"
                    >
                      <span className={`ms ${favs.includes(s.id) ? 'ms-fill' : ''}`} style={{ fontSize: 20, color: favs.includes(s.id) ? 'var(--primary)' : 'var(--muted)' }}>
                        favorite
                      </span>
                    </button>
                    {Number(s.delivery_fee) === 0 && (
                      <span style={{
                        position: 'absolute', bottom: 12, left: 12,
                        background: 'var(--green)', color: '#fff', fontSize: 10.5, fontWeight: 800,
                        padding: '4px 8px', borderRadius: 6, letterSpacing: '.04em',
                      }}>
                        ENVÍO GRATIS
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                        {s.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,184,0,0.12)', padding: '3px 8px', borderRadius: 8 }}>
                        <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>{s.rating}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
                      <span>{s.category}</span>
                      <span>·</span>
                      <span>{etaLabel(s.prep_time_min)}</span>
                      <span>·</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span className="ms" style={{ fontSize: 14 }}>two_wheeler</span>
                        {feeLabel(s.delivery_fee)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ============================================================
            CONTENIDO EXCLUSIVO PARA MÓVIL
            ============================================================ */}
        <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ flex: 'none', background: 'var(--bg)', padding: '4px 20px 12px' }}>
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
                <button
                  onClick={toggleTheme}
                  style={S.iconBtn}
                  aria-label="Cambiar tema claro/oscuro"
                  title="Cambiar tema claro/oscuro"
                >
                  <span className="ms" style={{ fontSize: 20, color: theme === 'dark' ? '#FFB800' : 'var(--text)' }}>
                    {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                  </span>
                </button>
                <button onClick={() => router.push('/notifications')} style={S.iconBtn}>
                  <span className="ms" style={{ fontSize: 20 }}>notifications</span>
                </button>
                <button onClick={() => router.push('/cart')} style={{ ...S.iconBtn, position: 'relative' }}>
                  <span className="ms" style={{ fontSize: 20 }}>shopping_bag</span>
                  {hasCart && <span style={S.cartBadge}>{cartCount}</span>}
                </button>
              </div>
            </div>

            <button onClick={openSearch} style={S.searchBtn}>
              <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>search</span>
              <span style={{ flex: 1, fontSize: 14.5, color: 'var(--faint)', fontWeight: 500, textAlign: 'left' }}>
                Busca &quot;encocado de jaiba&quot;
              </span>
            </button>
          </div>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 108px', minHeight: 0 }}>
            {/* 1. CATEGORÍAS EN MOBILE: 3D CARDS (ADAPTADAS A DARK / LIGHT) */}
            <div style={{ padding: '8px 0 4px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '0 20px' }}>
                <button
                  onClick={() => router.push('/list?v=restaurant')}
                  style={{
                    ...S.bigVertical,
                    background: theme === 'dark'
                      ? 'linear-gradient(145deg, rgba(255,107,0,0.16) 0%, rgba(255,68,31,0.06) 100%)'
                      : 'linear-gradient(145deg, #FFF4EE 0%, #FEEFE8 100%)',
                    border: theme === 'dark'
                      ? '1px solid rgba(255,107,0,0.28)'
                      : '1px solid rgba(255,107,0,0.12)',
                    boxShadow: theme === 'dark'
                      ? '0 8px 24px rgba(255,68,31,0.12)'
                      : '0 6px 20px rgba(255,68,31,0.06)',
                  }}
                >
                  <Icon3D src="/images/ic-restaurantes.png" alt="" sizes="200px" style={S.bigVerticalImg} />
                  <span style={{
                    fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', position: 'relative',
                    color: theme === 'dark' ? '#FF8A50' : '#A8412A',
                  }}>
                    Restaurantes
                  </span>
                </button>

                <button
                  onClick={() => router.push('/list?v=market')}
                  style={{
                    ...S.bigVertical,
                    background: theme === 'dark'
                      ? 'linear-gradient(145deg, rgba(16,185,129,0.16) 0%, rgba(5,150,105,0.06) 100%)'
                      : 'linear-gradient(145deg, #EEFBF4 0%, #E6F6EE 100%)',
                    border: theme === 'dark'
                      ? '1px solid rgba(16,185,129,0.28)'
                      : '1px solid rgba(16,185,129,0.12)',
                    boxShadow: theme === 'dark'
                      ? '0 8px 24px rgba(16,185,129,0.12)'
                      : '0 6px 20px rgba(16,185,129,0.06)',
                  }}
                >
                  <Icon3D src="/images/ic-mercado.png" alt="" sizes="200px" style={S.bigVerticalImg} />
                  <span style={{
                    fontSize: 20, fontWeight: 800, letterSpacing: '-.01em', position: 'relative',
                    color: theme === 'dark' ? '#34D399' : '#0E7A52',
                  }}>
                    Mercado
                  </span>
                </button>
              </div>
            </div>

            {/* 2. CATEGORÍAS EN MOBILE: TIRA DE ICONOS */}
            <div className="hs" style={{ display: 'flex', gap: 11, padding: '16px 20px 8px' }}>
              {STRIP_VERTICALS.map((v) => (
                <button key={v.id} onClick={() => (v.external ? window.open(v.external, '_blank', 'noopener,noreferrer') : router.push(`/list?v=${v.id}`))} style={S.stripVertical}>
                  <Icon3D src={v.img} alt="" sizes="104px" style={S.stripVerticalImg} />
                  {v.badge && <span style={S.stripBadge}>{v.badge}</span>}
                  <span style={{ fontSize: 13.5, color: 'var(--text)', position: 'relative', textAlign: 'center', lineHeight: 1.15 }}>{v.label}</span>
                </button>
              ))}
            </div>

            {/* 3. HERO ONBOARDING BANNER MÓVIL (AVATAR CHICA AFRO CARTOON CON VIDEO) */}
            <div style={{ padding: '20px 18px 14px' }}>
              <div style={{
                borderRadius: 24,
                background: 'linear-gradient(135deg, #0A0A0A 0%, #050505 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
                padding: '20px 18px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 12,
              }}>
                {/* Glow sutil */}
                <div style={{
                  position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
                  width: 200, height: 200, borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,68,31,0.18) 0%, transparent 70%)',
                  filter: 'blur(30px)', pointerEvents: 'none',
                }} />

                {/* Pill Superior */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{
                    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 11, fontWeight: 800,
                    padding: '4px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                    La plataforma de IA para tu Negocio
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, #FF441F, #E2360F)', color: '#fff', fontSize: 10.5,
                    fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '.04em',
                  }}>
                    Tura Food AI
                  </span>
                </div>

                {/* Video Chica Afro Cartoon Fundida con el fondo */}
                <div style={{
                  position: 'relative', width: '100%', height: 180,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'transparent',
                }}>
                  <video
                    src="/turafood-ai-video.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{
                      width: '100%', height: '100%', objectFit: 'contain',
                      WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 50%, transparent 95%)',
                      maskImage: 'radial-gradient(circle at 50% 50%, black 50%, transparent 95%)',
                      filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
                    }}
                  />
                </div>

                {/* Beneficio Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <span style={{
                    background: 'rgba(255,184,0,0.12)', color: '#FFB800', border: '1px solid rgba(255,184,0,0.25)',
                    fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  }}>
                    🔥 Más ventas
                  </span>
                  <span style={{
                    background: 'rgba(17,178,106,0.12)', color: 'var(--green)', border: '1px solid rgba(17,178,106,0.25)',
                    fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  }}>
                    ⚡ 0% Comisiones
                  </span>
                  <span style={{
                    background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)',
                    fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  }}>
                    co Buenaventura
                  </span>
                </div>

                {/* Título & Subtítulo */}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
                    color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2,
                  }}>
                    Tu competencia ya está online. <span style={{ color: 'var(--amber)', fontStyle: 'italic' }}>¿Y tú?</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 1.4 }}>
                    Crea tu cuenta gratis hoy y ten tu negocio digital funcionando en minutos.
                  </div>
                </div>

                {/* Botón Card CTA Inscribir Negocio en app.turafood.com */}
                <button
                  onClick={() => window.open('https://app.turafood.com', '_blank')}
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    background: 'linear-gradient(135deg, #FF441F, #E2360F)',
                    color: '#fff', fontSize: 13.5, fontWeight: 800, border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(255,68,31,0.35)', marginTop: 4,
                  }}
                >
                  <span className="ms" style={{ fontSize: 18 }}>storefront</span>
                  <span>Inscribir mi Negocio</span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, background: 'rgba(0,0,0,0.25)', padding: '2px 6px', borderRadius: 6 }}>GRATIS</span>
                  <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                </button>
              </div>
            </div>

            {/* 5. SECCIÓN PRO: PRODUCTOS PREMIUM MÁS VENDIDOS (MÁS GRANDES + AUTO-SLIDE + AVISO ANIMADO) */}
            <div style={{ marginTop: 22, padding: '0 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19.5, color: 'var(--text)', letterSpacing: '-.02em' }}>
                      🔥 Los más vendidos del mes
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, background: 'rgba(255,68,31,0.12)', color: 'var(--primary)',
                      padding: '2px 8px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 3,
                    }}>
                      <span className="ms ms-fill" style={{ fontSize: 12, color: 'var(--amber)' }}>star</span>
                      5.0
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 500 }}>
                    Platos estrella de Buenaventura · Compra directa al negocio
                  </div>
                </div>

                {/* AVISO ANIMADO DE SLIDE / DESLIZAMIENTO */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, rgba(255,68,31,0.12) 0%, rgba(255,184,0,0.14) 100%)',
                  border: '1px solid rgba(255,68,31,0.25)',
                  color: 'var(--primary)', padding: '4px 10px', borderRadius: 99,
                  fontSize: 11, fontWeight: 800,
                  animation: 'pulseGlow 2.5s infinite ease-in-out',
                }}>
                  <span className="ms ms-fill" style={{ fontSize: 13, animation: 'swipeHand 1.5s infinite ease-in-out' }}>
                    swipe
                  </span>
                  <span>Desliza para ver más</span>
                  <span className="ms" style={{ fontSize: 13, animation: 'pointRight 1.2s infinite ease-in-out' }}>
                    arrow_forward
                  </span>
                </div>
              </div>
            </div>

            {/* CARRUSEL DE PRODUCTOS PREMIUM CON AUTO-SLIDE */}
            <div
              ref={topSellingSliderRef}
              className="hs"
              style={{
                display: 'flex', gap: 16, padding: '14px 20px 8px',
                scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                overflowX: 'auto', scrollBehavior: 'smooth',
              }}
            >
              {TOP_SELLING_MONTH.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/store/${item.businessId}`)}
                  style={{
                    flex: 'none',
                    width: 260,
                    borderRadius: 24,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.07)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    scrollSnapAlign: 'start',
                    transition: 'transform .2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(0,0,0,0.12)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.07)'; }}
                >
                  {/* Foto del Producto con Badges Material 3 */}
                  <div style={{ position: 'relative', height: 165, width: '100%', overflow: 'hidden' }}>
                    <Cover
                      src={item.image_url}
                      alt={item.name}
                      radius={0}
                      sizes="280px"
                      style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 100%)' }} />

                    {/* Tag Top Pacífico o Promo */}
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6, zIndex: 2 }}>
                      <span style={{
                        background: item.badgeBg, color: '#fff', fontSize: 10.5, fontWeight: 800,
                        padding: '4px 10px', borderRadius: 99, letterSpacing: '.04em',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                      }}>
                        {item.badge}
                      </span>
                    </div>

                    {/* Rating 5.0 */}
                    <div style={{
                      position: 'absolute', top: 12, right: 12, zIndex: 2,
                      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                      color: '#fff', fontSize: 11.5, fontWeight: 800,
                      padding: '3px 8px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <span className="ms ms-fill" style={{ fontSize: 13, color: 'var(--amber)' }}>star</span>
                      <span>{item.rating}</span>
                    </div>
                  </div>

                  {/* Detalle del Producto */}
                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div className="tr2" style={{
                      fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16,
                      color: 'var(--text)', lineHeight: 1.25,
                    }}>
                      {item.name}
                    </div>

                    {/* Fila de Reviews con Avatares y Tiempo */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {item.avatars.map((av, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: 13, marginLeft: idx > 0 ? -5 : 0,
                                background: 'var(--surface2)', borderRadius: '50%',
                                width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                border: '1.5px solid var(--surface)',
                              }}
                            >
                              {av}
                            </span>
                          ))}
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700 }}>
                          +{item.reviewsCount} reviews
                        </span>
                      </div>

                      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span className="ms" style={{ fontSize: 14 }}>schedule</span>
                        {item.prepTime}
                      </span>
                    </div>

                    {/* Fila de Precio y Botón Verde Sutil "Pedir / Comprar Ya" */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--muted)', display: 'block', letterSpacing: '.04em' }}>PRECIO</span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-bricolage)' }}>
                          {cop(item.price)}
                        </span>
                      </div>

                      {/* Botón Sutil Verde para Compra Rápida Directa */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addLine(
                            {
                              productId: item.productId,
                              name: item.name,
                              unitPrice: item.price,
                              basePrice: item.price,
                              comparePrice: null,
                              image_url: item.image_url,
                              extraIds: [],
                              notes: '',
                              opts: '',
                              qty: 1,
                            },
                            {
                              id: item.businessId,
                              name: item.businessName,
                              image: item.image_url,
                            }
                          );
                          router.push('/cart');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '9px 15px',
                          borderRadius: 13,
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 800,
                          fontSize: 13,
                          boxShadow: '0 4px 14px rgba(16,185,129,0.32)',
                          transition: 'all .15s ease',
                        }}
                      >
                        <span className="ms ms-fill" style={{ fontSize: 16 }}>bolt</span>
                        <span>Pedir</span>
                      </button>
                    </div>
                  </div>

                  {/* Mini Business Footer: Enlace directo al restaurante */}
                  <div style={{
                    marginTop: 'auto',
                    padding: '10px 15px',
                    background: 'var(--surface2)',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>storefront</span>
                      <span className="tr1" style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                        {item.businessName}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                      Ver menú <span className="ms" style={{ fontSize: 14 }}>arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 4. SLIDER DE TOP RESTAURANTES Y PROMOS DESTACADAS (MÁS ALTO + ESPACIADO FRESCO) */}
            <div style={{ padding: '32px 0 4px' }}>
              <div
                ref={sliderRef}
                className="hs"
                style={{
                  display: 'flex', gap: 16, padding: '0 20px 18px',
                  scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                  overflowX: 'auto', scrollBehavior: 'smooth',
                }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const index = Math.round(el.scrollLeft / (el.clientWidth * 0.85));
                  setBanner(index);
                }}
              >
                {[
                  { id: 'f1', image: '/images/food-fork.jpg', badge: '⭐ 4.9 · TOP RESTAURANTE', title: 'Marisquería El Faro', subtitle: 'Pescados y mariscos del Pacífico', action: () => router.push('/store/b0000000-0000-4000-8000-000000000003') },
                  { id: 'f2', image: '/images/steak-ribeye.jpg', badge: '⭐ 4.8 · TOP ASADOS', title: 'Asadero El Puerto', subtitle: 'Disfruta las mejores picadas y carnes', action: () => router.push('/store/b0000000-0000-4000-8000-000000000001') },
                  { id: 'f3', image: '/images/burger.jpg', badge: '🔥 40% OFF · TOP BURGERS', title: 'Burger House Bahia', subtitle: 'Hamburguesas artesanales premium', action: () => router.push('/store/b0000000-0000-4000-8000-000000000002') },
                  { id: 'f4', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', badge: '⚡ TURBO · LICORES', title: 'Licores la 15', subtitle: 'Bebidas frías directo a tu puerta', action: () => router.push('/store/b0000000-0000-4000-8000-000000000004') },
                ].map((slide) => (
                  <button
                    key={slide.id}
                    onClick={slide.action}
                    style={{
                      flex: 'none', width: '84vw', maxWidth: 330, height: 172,
                      borderRadius: 24, overflow: 'hidden', position: 'relative',
                      scrollSnapAlign: 'center', padding: 0, textAlign: 'left',
                      boxShadow: '0 12px 28px -6px rgba(0,0,0,0.22)', background: 'var(--surface2)', border: 'none',
                    }}
                  >
                    <Cover src={slide.image} alt={slide.title} sizes="380px" style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(15,12,8,0.92) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.24)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '.06em', padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.18)' }}>{slide.badge}</span>
                      <span style={{ color: '#fff', fontSize: 20, fontWeight: 800, lineHeight: 1.15, fontFamily: 'var(--font-bricolage)', letterSpacing: '-.02em', marginTop: 2 }}>{slide.title}</span>
                      <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12.5, fontWeight: 500 }}>{slide.subtitle}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: -4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <button key={i} onClick={() => goToSlide(i)} aria-label={`Ir al slide ${i + 1}`} style={{ width: i === banner ? 22 : 6, height: 6, borderRadius: 99, background: i === banner ? 'var(--primary)' : 'var(--border)', border: 'none', padding: 0, cursor: 'pointer', transition: 'all .3s cubic-bezier(.25,.8,.25,1)' }} />
                ))}
              </div>
            </div>

            {/* Promos irresistibles Móvil */}
            <div style={{ marginTop: 34, padding: '0 20px' }}>
              <span style={S.h2}>Promos irresistibles</span>
            </div>
            <div className="hs" style={{ display: 'flex', gap: 14, padding: '14px 20px 0' }}>
              {HOME_PROMOS.map((p) => (
                <div key={p.id} style={{ flex: 'none', width: 158 }}>
                  <Cover src={p.image_url} alt={p.name} radius={18} sizes="160px" style={{ height: 158 }}>
                    <button onClick={() => addLine({ productId: p.id, name: p.name, unitPrice: p.price, basePrice: p.price, comparePrice: p.was, image_url: p.image_url, extraIds: [], notes: '', opts: '', qty: 1 }, { id: p.businessId ?? p.id, name: p.store, image: p.image_url })} style={S.addBtn} aria-label={`Agregar ${p.name}`}>
                      <span className="ms" style={{ fontSize: 22 }}>add</span>
                    </button>
                  </Cover>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 9 }}>
                    <span style={{ fontWeight: 800, fontSize: 15.5 }}>{cop(p.price)}</span>
                    <span style={S.offTag}>{p.off}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.3, marginTop: 4, color: 'var(--text)' }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal de Vista Rápida de Restaurante y Platos (Desktop Fast View) */}
        {fastViewStore && (
          <FastViewModal
            initialStore={fastViewStore}
            storeId={fastViewStore.id}
            onClose={() => setFastViewStore(null)}
          />
        )}

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
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    padding: '14px 44px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    width: '100%',
    boxShadow: '0 2px 14px rgba(0,0,0,0.03)',
  },
  deskLogo: {
    width: 40, height: 40, borderRadius: 13,
    background: 'linear-gradient(150deg,#FF7A3D,#FF441F)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(255,68,31,.35)',
  },
  deskAddr: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 9, height: 44,
    padding: '0 16px', borderRadius: 14, background: 'var(--bg)',
    border: '1px solid var(--border)', cursor: 'pointer',
  },
  deskSearch: {
    display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px',
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0,
  },
  deskResults: {
    position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0,
    background: 'var(--surface)', borderRadius: 22,
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
    padding: '18px 16px', zIndex: 120, maxHeight: 500, overflowY: 'auto',
  },
  deskResultRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 14, background: 'var(--surface2)',
    border: '1px solid transparent', cursor: 'pointer', textAlign: 'left',
    transition: 'all .15s ease',
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
