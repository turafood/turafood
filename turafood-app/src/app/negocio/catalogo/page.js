'use client';

/**
 * MENÚ Y PRODUCTOS
 * Conversión de `isCatalog` (línea 424) del mockup de Negocios.
 *
 * El interruptor de cada fila escribe `products.is_available`: es lo que
 * hace que el plato deje de aparecer en la app del cliente.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import { getCatalog, setProductAvailability } from '@/lib/negocio';
import { useBiz } from '../BizContext';

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function CatalogoPage() {
  const { business, toast } = useBiz();
  const [products, setProducts] = useState([]);
  const [cat, setCat] = useState('Todos');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getCatalog(business.id);
        if (alive) setProducts(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.category?.name).filter(Boolean)));
    return ['Todos', ...names];
  }, [products]);

  const q = norm(query.trim());
  const shown = products.filter((p) => {
    const byCat = cat === 'Todos' || p.category?.name === cat;
    const byText = !q || norm(p.name).includes(q) || norm(p.description).includes(q);
    return byCat && byText;
  });

  const soldMax = Math.max(...products.map((p) => p.sold ?? 0), 1);

  const toggle = async (product) => {
    const next = !product.is_available;
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_available: next } : p)));
    try {
      await setProductAvailability(product.id, next);
      toast(next ? `${product.name} disponible` : `${product.name} agotado`);
    } catch (err) {
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_available: !next } : p)));
      setError(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* Categorías */}
      <aside style={S.cats}>
        <div style={S.catsLabel}>CATEGORÍAS</div>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{ ...S.catBtn, background: c === cat ? 'var(--surface2)' : 'transparent' }}
          >
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, textAlign: 'left' }}>{c}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
              {c === 'Todos' ? products.length : products.filter((p) => p.category?.name === c).length}
            </span>
          </button>
        ))}
      </aside>

      {/* Tabla */}
      <section style={S.table}>
        <div style={S.tableHead}>
          <div style={S.search}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto"
              style={S.searchInput}
            />
            {query && (
              <button onClick={() => setQuery('')} style={S.clear} aria-label="Limpiar búsqueda">
                <span className="ms" style={{ fontSize: 14, color: 'var(--muted)' }}>close</span>
              </button>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
            {shown.length} productos · {shown.filter((p) => !p.is_available).length} agotados
          </span>
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <div style={{ ...S.row, ...S.headRow }}>
            <span>PRODUCTO</span>
            <span>PRECIO</span>
            <span>RENDIMIENTO</span>
            <span>DISPONIBLE</span>
            <span style={{ textAlign: 'right' }}>ACCIONES</span>
          </div>

          {shown.map((p) => (
            <div
              key={p.id}
              style={{ ...S.row, background: p.is_available ? 'transparent' : 'var(--bg)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <span
                  style={{
                    ...S.thumb,
                    backgroundImage: p.image_url ? `url('${p.image_url}')` : 'none',
                    background: p.image_url ? undefined : 'var(--surface2)',
                  }}
                >
                  {!p.is_available && (
                    <span style={S.thumbOff}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>visibility_off</span>
                    </span>
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="tr1" style={{ fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                    {(p.sold ?? 0) >= 200 && <span style={S.top}>TOP</span>}
                  </span>
                  <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    {p.description}
                  </span>
                </span>
              </div>

              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>{cop(p.price)}</div>
                {p.compare_price && (
                  <div style={{ fontSize: 11, color: 'var(--faint)', textDecoration: 'line-through' }}>
                    {cop(p.compare_price)}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                  {p.sold ?? 0} vendidos
                </div>
                <div style={S.perfTrack}>
                  <div
                    style={{
                      height: '100%', borderRadius: 99,
                      width: `${Math.max(4, ((p.sold ?? 0) / soldMax) * 100)}%`,
                      background: (p.sold ?? 0) >= 200
                        ? 'linear-gradient(90deg,#FF7A3D,#FF441F)'
                        : 'var(--faint)',
                    }}
                  />
                </div>
              </div>

              <div>
                <button
                  onClick={() => toggle(p)}
                  aria-label={p.is_available ? `Agotar ${p.name}` : `Activar ${p.name}`}
                  style={{
                    ...S.switchTrack,
                    background: p.is_available ? 'var(--green)' : 'var(--faint)',
                  }}
                >
                  <span
                    style={{
                      ...S.switchKnob,
                      transform: p.is_available ? 'translateX(18px)' : 'none',
                    }}
                  />
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button style={S.iconBtn} aria-label={`Editar ${p.name}`}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>edit</span>
                </button>
              </div>
            </div>
          ))}

          {!loading && shown.length === 0 && (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>
                  {products.length ? 'search_off' : 'restaurant_menu'}
                </span>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                {products.length ? 'Ningún producto coincide' : 'Tu menú está vacío'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {products.length
                  ? 'Prueba con otro nombre o cambia de categoría.'
                  : 'Agrega tus platos para que aparezcan en la app de clientes.'}
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Cargando catálogo…
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const GRID = 'minmax(0,2.4fr) 116px 130px 108px 92px';

const S = {
  cats: {
    flex: 'none', width: 226, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 14, boxShadow: 'var(--shadowSm)',
  },
  catsLabel: {
    fontSize: 11, fontWeight: 800, color: 'var(--muted)',
    letterSpacing: '.08em', padding: '2px 8px 10px',
  },
  catBtn: {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', height: 38,
    padding: '0 10px', borderRadius: 11, marginBottom: 2,
  },
  table: {
    flex: 1, minWidth: 320, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, boxShadow: 'var(--shadowSm)', overflow: 'hidden',
  },
  tableHead: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
    borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
  },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, flex: 1, height: 40,
    background: 'var(--bg)', borderRadius: 12, padding: '0 13px', maxWidth: 320, minWidth: 180,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'none',
    fontSize: 16, minWidth: 0,
  },
  clear: {
    width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  row: {
    display: 'grid', gridTemplateColumns: GRID, gap: 12, minWidth: 760,
    alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid var(--border)',
  },
  headRow: {
    background: 'var(--bg)', fontSize: 11, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.05em',
  },
  thumb: {
    width: 44, height: 44, borderRadius: 12, flex: 'none', position: 'relative',
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  thumbOff: {
    position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(255,255,255,.68)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  top: {
    flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 6px',
    borderRadius: 5, background: '#FFF0CC', color: '#A8730B',
  },
  perfTrack: {
    height: 5, borderRadius: 99, background: 'var(--surface2)', marginTop: 6, overflow: 'hidden',
  },
  switchTrack: { width: 42, height: 24, borderRadius: 99, padding: 2, display: 'flex' },
  switchKnob: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    transition: 'transform .18s ease',
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
    padding: '56px 20px', textAlign: 'center',
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 14, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, margin: '14px 18px', padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
