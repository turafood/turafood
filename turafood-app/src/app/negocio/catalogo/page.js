'use client';

/**
 * MENÚ Y PRODUCTOS
 *
 * Además de listar, aquí se crea, se edita y se agota. El interruptor
 * de cada fila escribe `products.is_available`: es lo que hace que el
 * plato deje de aparecer en la app del cliente.
 *
 * Si el catálogo está vacío no se muestra una tabla en blanco: se
 * ofrece cargar un menú de arranque acorde a la vertical del negocio,
 * porque editar algo existente cuesta mucho menos que crear de cero.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop } from '@/lib/format';
import {
  getCatalog, getCategories, setProductAvailability, deleteProduct,
} from '@/lib/negocio';
import { STARTER_MENUS, starterSize, loadStarterMenu } from '@/lib/menuDemo';
import Vertical3D, { ProductThumb } from '../../components/Vertical3D';
import { useBiz } from '../BizContext';
import MetricasProducto from './MetricasProducto';
import ProductSheet from './ProductSheet';

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function CatalogoPage() {
  const { business, toast } = useBiz();

  const [products, setProducts] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState('Todos');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [sheet, setSheet] = useState({ open: false, product: null });
  const [seeding, setSeeding] = useState(false);

  const vertical = business?.vertical ?? 'restaurant';

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const [rows, cats] = await Promise.all([
          getCatalog(business.id),
          getCategories(business.id),
        ]);
        if (!alive) return;
        setProducts(rows);
        setCategories(cats);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const catNames = useMemo(() => {
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
  const outOfStock = products.filter((p) => !p.is_available).length;

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

  const remove = async (product) => {
    setProducts((list) => list.filter((p) => p.id !== product.id));
    try {
      await deleteProduct(product.id);
      toast(`${product.name} eliminado`);
    } catch (err) {
      setError(err.message);
      setProducts(await getCatalog(business.id));
    }
  };

  const seed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await loadStarterMenu(business.id, vertical);
      const [rows, cats] = await Promise.all([
        getCatalog(business.id),
        getCategories(business.id),
      ]);
      setProducts(rows);
      setCategories(cats);
      toast('Menú de ejemplo cargado · edítalo a tu gusto');
    } catch (err) {
      setError(err.message);
    } finally {
      setSeeding(false);
    }
  };

  const onSaved = (saved, wasEdit) => {
    setProducts((list) => (wasEdit
      ? list.map((p) => (p.id === saved.id ? { ...p, ...saved } : p))
      : [saved, ...list]));
    setSheet({ open: false, product: null });
    toast(wasEdit ? 'Producto actualizado' : 'Producto creado');
  };

  // Catálogo vacío: lo importante es dar el primer empujón
  if (!loading && products.length === 0) {
    const menu = STARTER_MENUS[vertical] ?? STARTER_MENUS.restaurant;
    return (
      <>
        {error && <ErrorBox text={error} />}
        <section style={S.starter}>
          <Vertical3D vertical={vertical} size={96} />
          <h2 style={S.starterTitle}>Tu carta está vacía</h2>
          <p style={S.starterText}>
            Podemos dejarte cargado un menú de ejemplo de <b>{menu.label.toLowerCase()}</b> con{' '}
            {starterSize(vertical)} productos y sus categorías. Después cambias nombres,
            precios y fotos: editar es mucho más rápido que empezar de cero.
          </p>

          <div style={S.starterPreview}>
            {menu.categories.slice(0, 4).map((c) => (
              <span key={c.name} style={S.starterChip}>
                {c.name}
                <span style={{ color: 'var(--faint)', fontWeight: 700 }}>{c.products.length}</span>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 11, flexWrap: 'wrap', justifyContent: 'center', marginTop: 22 }}>
            <button onClick={seed} disabled={seeding} className="md3-btn" style={S.starterPrimary}>
              <span className="ms" style={{ fontSize: 19 }}>auto_awesome</span>
              {seeding ? 'Cargando…' : 'Cargar menú de ejemplo'}
            </button>
            <button onClick={() => setSheet({ open: true, product: null })} style={S.starterGhost}>
              <span className="ms" style={{ fontSize: 19 }}>add</span>
              Crear el primero a mano
            </button>
          </div>
        </section>

      <ProductSheet
          open={sheet.open}
          product={sheet.product}
          categories={categories}
          businessId={business?.id}
          vertical={vertical}
          onClose={() => setSheet({ open: false, product: null })}
          onSaved={onSaved}
          onCategoryCreated={(c) => setCategories((list) => [...list, c])}
        />
      </>
    );
  }

  return (
    <>
      {error && <ErrorBox text={error} />}

      <div className="catalog">
        {/* Categorías */}
        <aside className="catalog-cats" style={S.cats}>
          <div style={S.catsLabel}>CATEGORÍAS</div>
          <div className="catalog-cats-list">
            {catNames.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{ ...S.catBtn, background: c === cat ? 'var(--surface2)' : 'transparent' }}
              >
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{c}</span>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)' }}>
                  {c === 'Todos' ? products.length : products.filter((p) => p.category?.name === c).length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Lista */}
        <section style={S.panel}>
          <div style={S.panelHead}>
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

            <span className="catalog-count" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 }}>
              {shown.length} productos
              {outOfStock > 0 && ` · ${outOfStock} agotados`}
            </span>

            <button
              onClick={() => setSheet({ open: true, product: null })}
              className="md3-btn"
              style={S.addBtn}
            >
              <span className="ms" style={{ fontSize: 18 }}>add</span>
              Nuevo
            </button>
          </div>

          {/* Escritorio: tabla. Celular: tarjetas. */}
          <div className="catalog-table">
            <div className="catalog-row catalog-head" style={S.headRow}>
              <span>PRODUCTO</span><span>PRECIO</span><span>RENDIMIENTO</span>
              <span>DISPONIBLE</span><span style={{ textAlign: 'right' }}>ACCIONES</span>
            </div>

            {shown.map((p) => (
              <div key={p.id} className="catalog-row" style={{ background: p.is_available ? 'transparent' : 'var(--bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <span style={{ position: 'relative', flex: 'none' }}>
                    <ProductThumb src={p.image_url} vertical={vertical} size={44} alt={p.name} />
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
                  {/* La celda entera abre las metricas. Antes solo
                      decia "0 vendidos" y no llevaba a ningun lado —
                      un dato muerto en la fila mas visible. */}
                  <button
                    onClick={() => setMetricas(p)}
                    style={S.perfBtn}
                    title={`Ver como le va a ${p.name}`}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                      {p.sold ?? 0} vendidos
                    </span>
                    <span className="ms" style={{ fontSize: 15, color: 'var(--primary)' }}>
                      monitoring
                    </span>
                  </button>
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
                    style={{ ...S.switchTrack, background: p.is_available ? 'var(--green)' : 'var(--faint)' }}
                  >
                    <span style={{ ...S.switchKnob, transform: p.is_available ? 'translateX(18px)' : 'none' }} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => setSheet({ open: true, product: p })} style={S.iconBtn} aria-label={`Editar ${p.name}`}>
                    <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>edit</span>
                  </button>
                  <button onClick={() => remove(p)} style={S.iconBtn} aria-label={`Eliminar ${p.name}`}>
                    <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && shown.length === 0 && (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>search_off</span>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ningún producto coincide</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                Prueba con otro nombre o cambia de categoría.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 4 }}>
              {/* Esqueleto con la forma de lo que viene: el salto de
                  "cargando" a "listo" se siente mucho menor si la caja
                  ya estaba donde va a quedar. */}
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
            </div>
          )}
        </section>
      </div>

      {/* Las metricas del producto. Va acá y no dentro de la rama
          de "catalogo vacio": ahi solo aparecia cuando no habia
          ningun producto, que es justo cuando no hay nada que
          medir. */}
      {metricas && (
        <MetricasProducto producto={metricas} onClose={() => setMetricas(null)} />
      )}

      <ProductSheet
        open={sheet.open}
        product={sheet.product}
        categories={categories}
        businessId={business?.id}
        vertical={vertical}
        onClose={() => setSheet({ open: false, product: null })}
        onSaved={onSaved}
        onCategoryCreated={(c) => setCategories((list) => [...list, c])}
      />
    </>
  );
}

function ErrorBox({ text }) {
  return (
    <div style={S.error}>
      <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
      <span>{text}</span>
    </div>
  );
}

const S = {
  cats: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 14, boxShadow: 'var(--shadowSm)',
  },
  catsLabel: {
    fontSize: 11, fontWeight: 800, color: 'var(--muted)',
    letterSpacing: '.08em', padding: '2px 8px 10px',
  },
  catBtn: {
    display: 'flex', alignItems: 'center', gap: 9, width: '100%', height: 38,
    padding: '0 10px', borderRadius: 11, marginBottom: 2, flex: 'none',
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, boxShadow: 'var(--shadowSm)', overflow: 'hidden', minWidth: 0,
  },
  panelHead: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px',
    borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
  },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, flex: 1, height: 42,
    background: 'var(--bg)', borderRadius: 12, padding: '0 13px', minWidth: 160,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 16, minWidth: 0,
  },
  clear: {
    width: 20, height: 20, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', gap: 6, height: 42, padding: '0 16px',
    borderRadius: 999, background: 'var(--primary)', color: 'var(--text)',
    fontSize: 13, fontWeight: 700, flex: 'none',
  },
  headRow: {
    background: 'var(--bg)', fontSize: 11, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.05em',
  },
  thumbOff: {
    position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(255,255,255,.68)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  top: {
    flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 6px',
    borderRadius: 5, background: '#FFF0CC', color: '#A8730B',
  },
  perfBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', padding: 0,
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
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
    padding: '56px 20px', textAlign: 'center',
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 14, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  starter: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '48px 24px', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 22, boxShadow: 'var(--shadowSm)',
  },
  starterTitle: {
    margin: '18px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.02em',
  },
  starterText: {
    margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', maxWidth: 470,
  },
  starterPreview: {
    display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20,
  },
  starterChip: {
    display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 13px',
    borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 700,
  },
  starterPrimary: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 22px',
    borderRadius: 999, background: 'var(--primary)', color: 'var(--text)',
    fontSize: 14.5, fontWeight: 700, boxShadow: '0 10px 26px rgba(255,68,31,.32)',
  },
  starterGhost: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 20px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 14, fontWeight: 700,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
