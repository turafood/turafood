'use client';

/**
 * FAVORITOS PRO
 * 
 * Experiencia responsiva de alta gama adaptada tanto para Mobile First
 * como para Laptop / Desktop con grid interactivo, filtros y recomendaciones.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBusinesses, getFavorites, toggleFavorite } from '@/lib/data';
import { etaLabel, feeLabel } from '@/lib/format';
import { Cover } from '../components/Media';
import { useThemeStore } from '@/store/useThemeStore';

const POPULAR_RECOMMENDATIONS = [
  {
    id: 'b0000000-0000-4000-8000-000000000003',
    name: 'Marisquería El Faro',
    category: 'Mariscos & Pescados',
    rating: 4.9,
    prep_time_min: 20,
    delivery_fee: 0,
    cover_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    tag: '👑 #1 en Mariscos',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000001',
    name: 'Asadero El Puerto',
    category: 'Asados & Pollo',
    rating: 4.8,
    prep_time_min: 25,
    delivery_fee: 3500,
    cover_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=600&auto=format&fit=crop',
    tag: '🔥 Favorito Local',
  },
  {
    id: 'b0000000-0000-4000-8000-000000000002',
    name: 'Burger House Bahia',
    category: 'Hamburguesas & Grill',
    rating: 4.9,
    prep_time_min: 15,
    delivery_fee: 0,
    cover_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop',
    tag: '⚡ Entrega Rápida',
  },
];

export default function FavoritesPage() {
  const router = useRouter();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [stores, setStores] = useState([]);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    let alive = true;
    getFavorites()
      .then((ids) => { if (alive) setFavs(ids); })
      .catch(() => { if (alive) setFavs([]); });
    return () => { alive = false; };
  }, []);

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

  const handleToggleFavorite = async (id, e) => {
    if (e) e.stopPropagation();
    const isFav = favs.includes(id);
    if (isFav) {
      setFavs((p) => p.filter((f) => f !== id));
    } else {
      setFavs((p) => [...p, id]);
    }
    try {
      await toggleFavorite(id);
    } catch (err) {
      setError(err.message);
      if (isFav) setFavs((p) => [...p, id]);
      else setFavs((p) => p.filter((f) => f !== id));
    }
  };

  const savedStores = useMemo(() => {
    return stores.filter((s) => favs.includes(s.id));
  }, [stores, favs]);

  const filteredStores = useMemo(() => {
    let list = savedStores;
    if (selectedCategory !== 'all') {
      list = list.filter((s) => s.category?.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
    }
    return list;
  }, [savedStores, selectedCategory, searchQuery]);

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: '100vh' }}>
      
      {/* ============================================================
          CABECERA RESPONSIVA (DESKTOP + MOBILE)
          ============================================================ */}
      <div style={{
        width: '100%', maxWidth: 1040, margin: '0 auto',
        padding: '24px 20px 16px', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/home')}
              style={S.backBtn}
              aria-label="Volver al inicio"
            >
              <span className="ms" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', color: 'var(--text)' }}>
                  Mis Favoritos
                </span>
                <span style={{
                  background: 'rgba(255,68,31,0.12)', color: 'var(--primary)',
                  fontSize: 12, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
                }}>
                  {savedStores.length} {savedStores.length === 1 ? 'guardado' : 'guardados'}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Tus restaurantes y sitios preferidos de Buenaventura
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={toggleTheme}
              style={S.themeBtn}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label="Cambiar tema"
            >
              <span className="ms" style={{ fontSize: 20 }}>
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>
        </div>

        {/* Buscador interno y Filtros */}
        {savedStores.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
              <span className="ms" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--muted)' }}>
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en tus favoritos..."
                style={{
                  width: '100%', height: 42, borderRadius: 12, padding: '0 12px 0 38px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: 13.5, color: 'var(--text)', outline: 'none', fontWeight: 500,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <span className="ms" style={{ fontSize: 16, color: 'var(--muted)' }}>close</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'mariscos', label: 'Mariscos' },
                { id: 'asados', label: 'Asados' },
                { id: 'hamburguesas', label: 'Hamburguesas' },
              ].map((c) => {
                const active = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    style={{
                      padding: '8px 14px', borderRadius: 99, fontSize: 12.5, fontWeight: 700,
                      background: active ? 'var(--primary)' : 'var(--surface)',
                      color: active ? '#fff' : 'var(--text)',
                      border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          CONTENIDO: GRID DE FAVORITOS O ESTADO VACÍO PRO
          ============================================================ */}
      <div style={{
        width: '100%', maxWidth: 1040, margin: '0 auto',
        padding: '0 20px 80px', flex: 1, minHeight: 0,
      }}>
        {error && (
          <div style={S.errorBox}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ height: 180, borderRadius: 20, background: 'var(--surface2)' }} />
            ))}
          </div>
        )}

        {/* Estado Vacío con Recomendaciones */}
        {!loading && savedStores.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 16px' }}>
            <div style={S.emptyIconWrapper}>
              <span className="ms ms-fill" style={{ fontSize: 36, color: 'var(--primary)' }}>favorite</span>
            </div>
            
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, marginTop: 16 }}>
              Aún no tienes favoritos guardados
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 6, maxWidth: 380, lineHeight: 1.5 }}>
              Toca el corazón ❤️ en cualquier restaurante o plato para tenerlo a la mano siempre que quieras pedir.
            </div>

            {/* Recomendados de Buenaventura */}
            <div style={{ width: '100%', maxWidth: 840, marginTop: 36 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14, textAlign: 'left' }}>
                ⭐ Restaurantes Populares en Buenaventura
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                {POPULAR_RECOMMENDATIONS.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push(`/store/${r.id}`)}
                    style={S.recommendCard}
                  >
                    <div style={{ position: 'relative', height: 120, width: '100%', overflow: 'hidden' }}>
                      <Cover src={r.cover_url} alt={r.name} radius={0} sizes="300px" style={{ width: '100%', height: '100%' }} />
                      <span style={S.recommendTag}>{r.tag}</span>
                      <button
                        onClick={(e) => handleToggleFavorite(r.id, e)}
                        style={S.cardFavBtn}
                        aria-label="Agregar a favoritos"
                      >
                        <span className={`ms ${favs.includes(r.id) ? 'ms-fill' : ''}`} style={{ fontSize: 18, color: favs.includes(r.id) ? 'var(--primary)' : '#fff' }}>
                          favorite
                        </span>
                      </button>
                    </div>

                    <div style={{ padding: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.category}</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}>
                          <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                          {r.rating}
                        </span>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--green)' }}>
                          {r.delivery_fee === 0 ? 'Envío Gratis' : feeLabel(r.delivery_fee)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => router.push('/home')}
              style={S.exploreBtn}
            >
              <span className="ms" style={{ fontSize: 20 }}>restaurant</span>
              <span>Explorar Todos los Restaurantes</span>
            </button>
          </div>
        )}

        {/* Grid de Favoritos Guardados */}
        {!loading && filteredStores.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredStores.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/store/${s.id}`)}
                style={S.storeCard}
              >
                <div style={{ position: 'relative', height: 140, width: '100%', overflow: 'hidden' }}>
                  <Cover src={s.cover_url} alt={s.name} radius={0} sizes="400px" style={{ width: '100%', height: '100%' }} />
                  <div style={S.storeOverlayGradient} />
                  <button
                    onClick={(e) => handleToggleFavorite(s.id, e)}
                    style={S.cardFavBtn}
                    aria-label={`Quitar ${s.name} de favoritos`}
                  >
                    <span className="ms ms-fill" style={{ fontSize: 20, color: 'var(--primary)' }}>
                      favorite
                    </span>
                  </button>
                  <span style={S.categoryBadge}>{s.category || 'Restaurante'}</span>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{s.name}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.address || 'Buenaventura, Valle'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, fontWeight: 700 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text)' }}>
                      <span className="ms ms-fill" style={{ fontSize: 15, color: 'var(--amber)' }}>star</span>
                      {s.rating || '5.0'}
                    </span>
                    <span style={{ color: 'var(--faint)' }}>•</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
                      <span className="ms" style={{ fontSize: 15 }}>schedule</span>
                      {etaLabel(s.prep_time_min || 20)}
                    </span>
                    <span style={{ color: 'var(--faint)' }}>•</span>
                    <span style={{ color: s.delivery_fee === 0 ? 'var(--green)' : 'var(--muted)' }}>
                      {s.delivery_fee === 0 ? 'Envío Gratis' : feeLabel(s.delivery_fee)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sin resultados de búsqueda */}
        {!loading && savedStores.length > 0 && filteredStores.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 16px' }}>
            <span className="ms" style={{ fontSize: 36, color: 'var(--faint)' }}>search_off</span>
            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 12 }}>No encontramos coincidencias</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Prueba buscando con otro término o categoría</div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', color: 'var(--text)',
    boxShadow: 'var(--shadowSm)',
  },
  themeBtn: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', color: 'var(--text)',
    boxShadow: 'var(--shadowSm)',
  },
  emptyIconWrapper: {
    width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,68,31,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(255,68,31,0.12)',
  },
  exploreBtn: {
    marginTop: 28, height: 48, padding: '0 24px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 14,
    display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none',
    cursor: 'pointer', boxShadow: '0 8px 24px rgba(255,68,31,0.28)',
  },
  recommendCard: {
    background: 'var(--surface)', borderRadius: 18, overflow: 'hidden',
    border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
    boxShadow: 'var(--shadowSm)', transition: 'transform .15s ease, box-shadow .15s ease',
  },
  recommendTag: {
    position: 'absolute', bottom: 8, left: 8, background: 'rgba(0,0,0,0.75)',
    color: '#fff', fontSize: 10.5, fontWeight: 800, padding: '3px 8px',
    borderRadius: 6, backdropFilter: 'blur(4px)',
  },
  storeCard: {
    background: 'var(--surface)', borderRadius: 20, overflow: 'hidden',
    border: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
    boxShadow: 'var(--shadowSm)', transition: 'all .15s ease',
  },
  storeOverlayGradient: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 60%)',
  },
  categoryBadge: {
    position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)',
    color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px',
    borderRadius: 8, backdropFilter: 'blur(4px)',
  },
  cardFavBtn: {
    position: 'absolute', top: 10, right: 10, width: 34, height: 34,
    borderRadius: '50%', background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', border: 'none', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 2,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16,
    padding: '12px 14px', borderRadius: 14, background: 'var(--primarySoft)',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
