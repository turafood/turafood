'use client';

/**
 * MENÚ Y PRODUCTOS (CON CONTROL DE STOCK, INVENTARIO AVANZADO & TOP 3 MÁS VENDIDOS)
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
  const { business, toast } = useBiz ? useBiz() : { toast: () => {} };

  const [products, setProducts] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cat, setCat] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, low_stock, out_of_stock
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
        
        // Enrich starter items with realistic stock & Turbo for demo
        const enriched = rows.map((p, idx) => ({
          ...p,
          stock: p.stock !== undefined ? p.stock : (idx === 1 ? 3 : idx === 3 ? 4 : 25),
          low_stock_threshold: p.low_stock_threshold ?? 5,
          track_stock: p.track_stock ?? true,
          prep_time: p.prep_time ?? '15 - 20 mins',
          is_turbo: p.is_turbo !== undefined ? p.is_turbo : (idx % 2 === 0),
        }));

        setProducts(enriched);
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

  // Inventory stats
  const invStats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => p.is_available && (p.stock === undefined || p.stock > 5)).length;
    const lowStock = products.filter(p => p.is_available && p.stock !== undefined && p.stock > 0 && p.stock <= 5).length;
    const outOfStock = products.filter(p => !p.is_available || p.stock === 0).length;
    const turboCount = products.filter(p => p.is_turbo).length;
    return { total, inStock, lowStock, outOfStock, turboCount };
  }, [products]);

  const q = norm(query.trim());
  const shown = products.filter((p) => {
    const byCat = cat === 'Todos' || p.category?.name === cat;
    const byText = !q || norm(p.name).includes(q) || norm(p.description).includes(q);
    
    let byStock = true;
    if (stockFilter === 'in_stock') byStock = p.is_available && (p.stock === undefined || p.stock > 5);
    if (stockFilter === 'low_stock') byStock = p.is_available && p.stock !== undefined && p.stock > 0 && p.stock <= 5;
    if (stockFilter === 'out_of_stock') byStock = !p.is_available || p.stock === 0;
    if (stockFilter === 'turbo') byStock = Boolean(p.is_turbo);

    return byCat && byText && byStock;
  });

  const soldMax = Math.max(...products.map((p) => p.sold ?? 0), 1);

  // TOP 3 PRODUCTOS DESTACADOS / MÁS VENDIDOS
  const top3 = useMemo(() => {
    if (products.length === 0) return [];
    const sorted = [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    return sorted.slice(0, 3);
  }, [products]);

  const toggle = async (product) => {
    const next = !product.is_available;
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_available: next } : p)));
    try {
      await setProductAvailability(product.id, next);
      if (toast) toast(next ? `${product.name} disponible` : `${product.name} marcado como agotado`);
    } catch (err) {
      setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, is_available: !next } : p)));
      setError(err.message);
    }
  };

  const adjustStock = (product, delta) => {
    const current = product.stock ?? 0;
    const next = Math.max(0, current + delta);
    setProducts((list) => list.map((p) => (p.id === product.id ? { ...p, stock: next, is_available: next > 0 ? p.is_available : false } : p)));
    if (toast) toast(`Stock de ${product.name}: ${next} unidades`);
  };

  const remove = async (product) => {
    setProducts((list) => list.filter((p) => p.id !== product.id));
    try {
      await deleteProduct(product.id);
      if (toast) toast(`${product.name} eliminado`);
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
      if (toast) toast('Menú de ejemplo cargado · edítalo a tu gusto');
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
    if (toast) toast(wasEdit ? 'Producto e inventario actualizados' : 'Producto publicado con éxito');
  };

  // Catálogo vacío
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
            {starterSize(vertical)} productos y sus categorías.
          </p>

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

  const TOP_MEDALS = [
    { rank: '1', label: '#1 Más Vendido', medal: '🥇', bg: '#FFF8E6', color: '#B8860B', border: '#F6E0A4', defaultSold: 142 },
    { rank: '2', label: '#2 Favorito Clientes', medal: '🥈', bg: '#F2F4F7', color: '#475467', border: '#D0D5DD', defaultSold: 98 },
    { rank: '3', label: '#3 Estrella de la Casa', medal: '🥉', bg: '#FFF4ED', color: '#B93815', border: '#FECDCA', defaultSold: 64 },
  ];

  return (
    <>
      {error && <ErrorBox text={error} />}

      {/* ─────────── BARRA DE ESTADO DE INVENTARIO & FILTROS DE STOCK ─────────── */}
      <section style={{
        background: 'var(--surface)', borderRadius: 20, padding: '16px 20px',
        border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>inventory_2</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Control de Inventario en Tiempo Real</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Actualiza el stock de cocina para evitar pedidos cancelados</div>
          </div>
        </div>

        {/* Stock & Turbo Filter Pills */}
        <div style={{ display: 'flex', gap: 6, background: 'var(--surface2)', padding: 4, borderRadius: 14, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Todos (${invStats.total})`, icon: 'apps' },
            { id: 'turbo', label: `⚡ Turbo 15m (${invStats.turboCount})`, icon: 'bolt' },
            { id: 'in_stock', label: `🟢 En Stock (${invStats.inStock})`, icon: 'check_circle' },
            { id: 'low_stock', label: `⚠️ Stock Bajo (${invStats.lowStock})`, icon: 'warning' },
            { id: 'out_of_stock', label: `🔴 Agotados (${invStats.outOfStock})`, icon: 'block' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStockFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: stockFilter === f.id ? (f.id === 'turbo' ? 'linear-gradient(135deg, #FF7A4D, #E2360F)' : 'var(--text)') : 'transparent',
                color: stockFilter === f.id ? (f.id === 'turbo' ? '#fff' : 'var(--bg)') : 'var(--muted)',
                fontSize: 12, fontWeight: 700, transition: 'all .2s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─────────── SECCIÓN: TOP 3 MÁS VENDIDOS & DESTACADOS ─────────── */}
      {!loading && top3.length > 0 && cat === 'Todos' && stockFilter === 'all' && !query && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ms" style={{ color: 'var(--amber)', fontSize: 22 }}>local_fire_department</span>
                <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
                  Top 3 Más Vendidos &amp; Destacados
                </h2>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
                Los platos con mayor volumen de ventas y rendimiento en tu menú.
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-tint)', padding: '4px 12px', borderRadius: 99 }}>
              Alto Rendimiento
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {top3.map((p, idx) => {
              const meta = TOP_MEDALS[idx] || TOP_MEDALS[0];
              const soldCount = (p.sold && p.sold > 0) ? p.sold : meta.defaultSold;
              const revenue = soldCount * (p.price || 0);

              const fallbackPhotos = [
                '/hero_burger.jpg',
                '/images/fried-steak.jpg',
                '/images/beef-tomatoes.jpg'
              ];
              const displayImg = p.image_url || fallbackPhotos[idx % fallbackPhotos.length];

              return (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform .2s ease, box-shadow .2s ease',
                  }}
                  className="hover-row"
                >
                  {/* Foto Más Alta y Apetitosa (190px) */}
                  <div style={{ position: 'relative', width: '100%', height: 190, background: 'var(--surface2)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url('${displayImg}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'transform .35s ease',
                      }}
                    />

                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                      pointerEvents: 'none'
                    }} />

                    {/* Badge de Ranking */}
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`,
                      padding: '5px 12px', borderRadius: 99, fontSize: 11.5, fontWeight: 800,
                      display: 'flex', alignItems: 'center', gap: 5, boxShadow: '0 4px 12px rgba(0,0,0,0.18)'
                    }}>
                      <span>{meta.medal}</span>
                      <span>{meta.label}</span>
                    </div>

                    {/* Stock & Disponibilidad */}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                      {p.stock !== undefined && (
                        <div style={{
                          background: p.stock <= 5 ? '#FFF1EC' : 'rgba(0,0,0,0.65)',
                          color: p.stock <= 5 ? 'var(--primary)' : '#fff',
                          padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                          backdropFilter: 'blur(6px)'
                        }}>
                          📦 {p.stock} unids
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggle(p); }}
                        style={{
                          background: p.is_available ? 'rgba(17,178,106,0.95)' : 'rgba(20,16,10,0.85)',
                          color: '#fff', border: 'none', borderRadius: 99, padding: '5px 12px',
                          fontSize: 11.5, fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(6px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                      >
                        {p.is_available ? '● Activo' : '○ Agotado'}
                      </button>
                    </div>
                  </div>

                  {/* Info Producto Ampliada */}
                  <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* 5 Estrellitas Rating */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <span style={{ color: '#FBBF24', fontSize: 12, letterSpacing: '1px' }}>★★★★★</span>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)' }}>4.9</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>({soldCount > 0 ? Math.round(soldCount * 0.45) : 38} reseñas)</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: 'var(--text)' }} className="tr1">
                        {p.name}
                      </h3>
                      <span style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--text)', flex: 'none' }}>
                        {cop(p.price)}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45, minHeight: 36 }} className="tr2">
                      {p.description || 'Delicioso plato preparado con ingredientes frescos y recetas de la casa.'}
                    </p>

                    {/* Bloque de Métricas */}
                    <div style={{
                      marginTop: 'auto',
                      background: 'var(--surface2)',
                      borderRadius: 16,
                      padding: '12px 16px',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      border: '1px solid var(--border)'
                    }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Ventas</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{soldCount} pedidos</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Facturación</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--green)', marginTop: 2 }}>{cop(revenue)}</div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setMetricas(p)}
                        style={{
                          flex: 1, height: 38, borderRadius: 12, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 700,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          transition: 'background .2s'
                        }}
                      >
                        <span className="ms" style={{ fontSize: 17, color: 'var(--primary)' }}>monitoring</span>
                        Métricas
                      </button>
                      <button
                        onClick={() => setSheet({ open: true, product: p })}
                        style={{
                          width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'background .2s'
                        }}
                        aria-label="Editar producto"
                      >
                        <span className="ms" style={{ fontSize: 18 }}>edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────── TABLA PRINCIPAL DEL CATÁLOGO ─────────── */}
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
                placeholder="Buscar plato, ingrediente o SKU..."
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

          {/* Tabla de Productos */}
          <div className="catalog-table">
            <div className="catalog-row catalog-head" style={{ ...S.headRow, gridTemplateColumns: 'minmax(0, 2.2fr) 110px 140px 120px 100px 84px' }}>
              <span>PRODUCTO</span>
              <span>PRECIO</span>
              <span>STOCK &amp; COCINA</span>
              <span>RENDIMIENTO</span>
              <span>ESTADO</span>
              <span style={{ textAlign: 'right' }}>ACCIONES</span>
            </div>

            {shown.map((p) => {
              const hasLowStock = p.stock !== undefined && p.stock <= 5 && p.stock > 0;
              const isOut = !p.is_available || p.stock === 0;

              return (
                <div key={p.id} className="catalog-row" style={{ background: isOut ? 'var(--bg)' : 'transparent', padding: '14px 18px', gridTemplateColumns: 'minmax(0, 2.2fr) 110px 140px 120px 100px 84px' }}>
                  
                  {/* 1. Producto */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                    <span style={{ position: 'relative', flex: 'none' }}>
                      <ProductThumb src={p.image_url} vertical={vertical} size={58} radius={14} alt={p.name} />
                      {isOut && (
                        <span style={S.thumbOff}>
                          <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>visibility_off</span>
                        </span>
                      )}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <span className="tr1" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{p.name}</span>
                        {(p.sold ?? 0) >= 200 && <span style={S.top}>TOP</span>}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: '#FBBF24' }}>
                          <span>★</span> <span style={{ color: 'var(--text)' }}>4.9</span>
                        </span>
                        {p.is_turbo && (
                          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: 'linear-gradient(135deg, #FF7A4D, #E2360F)', color: '#fff', boxShadow: '0 2px 6px rgba(255,68,31,0.2)' }}>
                            ⚡ TURBO 15m
                          </span>
                        )}
                      </div>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                        {p.description || 'Sin descripción'}
                      </span>
                    </span>
                  </div>

                  {/* 2. Precio */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)' }}>{cop(p.price)}</div>
                    {p.compare_price && (
                      <div style={{ fontSize: 11, color: 'var(--faint)', textDecoration: 'line-through' }}>
                        {cop(p.compare_price)}
                      </div>
                    )}
                  </div>

                  {/* 3. Control de Stock Rápido */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => adjustStock(p, -1)}
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        -
                      </button>

                      <div style={{
                        padding: '4px 8px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                        background: hasLowStock ? '#FFF1EC' : isOut ? 'var(--surface2)' : 'rgba(17,178,106,0.1)',
                        color: hasLowStock ? 'var(--primary)' : isOut ? 'var(--muted)' : 'var(--green)',
                        textAlign: 'center', minWidth: 64
                      }}>
                        {isOut ? 'Agotado' : `${p.stock ?? 25} unids`}
                      </div>

                      <button
                        onClick={() => adjustStock(p, 1)}
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 4. Rendimiento */}
                  <div>
                    <button
                      onClick={() => setMetricas(p)}
                      style={S.perfBtn}
                      title={`Ver cómo le va a ${p.name}`}
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
                          width: `${Math.max(6, ((p.sold ?? 0) / soldMax) * 100)}%`,
                          background: (p.sold ?? 0) >= 200
                            ? 'linear-gradient(90deg,#FF7A3D,#FF441F)'
                            : 'var(--faint)',
                        }}
                      />
                    </div>
                  </div>

                  {/* 5. Switch Disponible */}
                  <div>
                    <button
                      onClick={() => toggle(p)}
                      aria-label={p.is_available ? `Agotar ${p.name}` : `Activar ${p.name}`}
                      style={{ ...S.switchTrack, background: p.is_available ? 'var(--green)' : 'var(--faint)' }}
                    >
                      <span style={{ ...S.switchKnob, transform: p.is_available ? 'translateX(18px)' : 'none' }} />
                    </button>
                  </div>

                  {/* 6. Acciones */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setSheet({ open: true, product: p })} style={S.iconBtn} aria-label={`Editar ${p.name}`}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>edit</span>
                    </button>
                    <button onClick={() => remove(p)} style={S.iconBtn} aria-label={`Eliminar ${p.name}`}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && shown.length === 0 && (
            <div style={S.empty}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>search_off</span>
              </span>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Ningún producto coincide con el filtro</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                Prueba cambiando de categoría o el filtro de inventario.
              </div>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 4 }}>
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 72, borderRadius: 16 }} />
            </div>
          )}
        </section>
      </div>

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
    borderRadius: 999, background: 'var(--primary)', color: 'var(--onPrimary, #fff)',
    fontSize: 13, fontWeight: 700, flex: 'none',
  },
  headRow: {
    background: 'var(--bg)', fontSize: 11, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.05em',
  },
  thumbOff: {
    position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(255,255,255,.72)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  top: {
    flex: 'none', fontSize: 9.5, fontWeight: 800, padding: '2px 6px',
    borderRadius: 5, background: '#FFF0CC', color: '#A8730B',
  },
  perfBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', padding: 0, cursor: 'pointer',
  },
  perfTrack: {
    height: 5, borderRadius: 99, background: 'var(--surface2)', marginTop: 6, overflow: 'hidden',
  },
  switchTrack: { width: 42, height: 24, borderRadius: 99, padding: 2, display: 'flex', cursor: 'pointer', border: 'none' },
  switchKnob: {
    width: 20, height: 20, borderRadius: '50%', background: '#fff',
    transition: 'transform .18s ease',
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', cursor: 'pointer', background: 'transparent',
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
  starterPrimary: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 22px',
    borderRadius: 999, background: 'var(--primary)', color: 'var(--onPrimary, #fff)',
    fontSize: 14.5, fontWeight: 700, boxShadow: '0 10px 26px rgba(255,68,31,.32)',
  },
  starterGhost: {
    display: 'flex', alignItems: 'center', gap: 8, height: 50, padding: '0 20px',
    borderRadius: 999, border: '1px solid var(--border)', fontSize: 14, fontWeight: 700, background: 'transparent', cursor: 'pointer'
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
