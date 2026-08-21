'use client';

/**
 * FORMULARIO DE PRODUCTO PRO (FIGMA STYLE + 1-CLIC CHIPS + 5 ESTRELLAS + TURBO)
 */

import { useEffect, useState, useMemo } from 'react';
import PerformanceOverlay from '../components/PerformanceOverlay';
import { cop } from '@/lib/format';
import { saveProduct, createCategory } from '@/lib/negocio';
import { ProductThumb } from '../../components/Vertical3D';
import PhotoUploader from './PhotoUploader';

const EMPTY = {
  name: '', description: '', price: '18000', compare_price: '',
  category_id: '', images: [],
  track_stock: true, stock: '25', low_stock_threshold: '5',
  auto_out_of_stock: true, prep_time: '15 - 20 mins', sku: '',
  is_turbo: false, rating: 4.9, reviews_count: 48,
};

const TIME_PRESETS = [
  { label: '⚡ 5-10 min (Turbo)', value: '5 - 10 mins', turbo: true },
  { label: '⏱️ 15-20 min (Rápido)', value: '15 - 20 mins', turbo: false },
  { label: '🍳 25-35 min (Gourmet)', value: '25 - 35 mins', turbo: false },
  { label: '🔥 40+ min (Horno)', value: '40+ mins', turbo: false },
];

const STOCK_PRESETS = ['10', '25', '50', '100'];

const AI_DESCRIPTION_TEMPLATES = [
  {
    label: '✨ Sugerencia IA',
    text: 'Preparado al momento con ingredientes frescos de la más alta calidad, sazón tradicional y el toque secreto de la casa.',
  },
  {
    label: '🥩 Resaltar Frescura',
    text: 'Corte premium seleccionado, sellado a la plancha con mantequilla de hierbas finas y acompañado de guarnición artesanal.',
  },
  {
    label: '🔥 Especialidad Chef',
    text: 'Nuestra receta insignia más solicitada. Porción generosa, textura crujiente y una explosión de sabor inolvidable.',
  },
];

export default function ProductSheet({
  open, product, categories, businessId, vertical, onClose, onSaved, onCategoryCreated,
}) {
  const [showPerf, setShowPerf] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAddingCategory(false);
    setNewCategory('');
    setForm(product
      ? {
        name: product.name ?? '',
        description: product.description ?? '',
        price: String(product.price ?? '18000'),
        compare_price: product.compare_price ? String(product.compare_price) : '',
        category_id: product.category_id ?? (categories[0]?.id ?? ''),
        images: product.images?.length ? product.images : (product.image_url ? [product.image_url] : []),
        track_stock: product.track_stock ?? true,
        stock: String(product.stock ?? 25),
        low_stock_threshold: String(product.low_stock_threshold ?? 5),
        auto_out_of_stock: product.auto_out_of_stock ?? true,
        prep_time: product.prep_time ?? '15 - 20 mins',
        sku: product.sku ?? `PLATO-${Math.floor(100 + Math.random() * 900)}`,
        is_turbo: product.is_turbo ?? false,
        rating: product.rating ?? 4.9,
        reviews_count: product.reviews_count ?? 48,
      }
      : {
        ...EMPTY,
        category_id: categories[0]?.id ?? '',
        sku: `PLATO-${Math.floor(100 + Math.random() * 900)}`,
      });
    setStep(1);
  }, [open, product, categories]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setBusy(true);
    try {
      const row = await createCategory(businessId, name);
      onCategoryCreated(row);
      set('category_id', row.id);
      setNewCategory('');
      setAddingCategory(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const applyDiscountPreset = (percent) => {
    const curPrice = Number(form.price) || 0;
    if (curPrice <= 0) return;
    if (percent === 0) {
      set('compare_price', '');
    } else {
      const original = Math.round(curPrice / (1 - percent / 100));
      set('compare_price', String(original));
    }
  };

  const generateRandomSku = () => {
    const prefix = (form.name.slice(0, 3) || 'TURA').toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    set('sku', `${prefix}-${rand}`);
  };

  const submit = async (e) => {
    e?.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Ponle un nombre al producto.'); return; }
    if (!Number(form.price)) { setError('El precio tiene que ser mayor que cero.'); return; }
    if (form.compare_price && Number(form.compare_price) <= Number(form.price)) {
      setError('El precio tachado tiene que ser mayor que el precio de venta.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        stock: form.track_stock ? Number(form.stock || 0) : null,
        low_stock_threshold: Number(form.low_stock_threshold || 5),
        id: product?.id,
      };
      const saved = await saveProduct(businessId, payload);
      onSaved(saved, Boolean(product));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    setError(null);
    if (step === 1 && !form.name.trim()) { setError('Ponle un nombre al producto para continuar.'); return; }
    if (step === 2 && !Number(form.price)) { setError('El precio tiene que ser mayor que cero para continuar.'); return; }
    if (step === 2 && form.compare_price && Number(form.compare_price) <= Number(form.price)) {
      setError('El precio tachado tiene que ser mayor que el precio de venta.');
      return;
    }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 1));
  };

  const price = Number(form.price) || 0;
  const compare = Number(form.compare_price) || 0;
  const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;
  const stockNum = Number(form.stock) || 0;
  const lowStockThreshold = Number(form.low_stock_threshold) || 5;
  const isLowStock = form.track_stock && stockNum > 0 && stockNum <= lowStockThreshold;

  // Lógica de Salud del Producto
  const health = useMemo(() => {
    let score = 10;
    let tips = [];
    
    if (form.name.trim().length > 3) score += 15;
    else tips.push('Escribe un nombre claro y apetitoso.');

    if (form.category_id) score += 10;
    if (price > 0) score += 10;

    if (form.description.trim().length > 10) score += 20;
    else tips.push('Usa una de las descripciones automáticas para convencer al cliente.');

    if (form.images.length > 0) score += 20;
    else tips.push('Selecciona una foto gourmet de la galería de 1 clic.');

    if (compare > price) score += 10;
    else tips.push('Añade un descuento de 1 clic para destacar como oferta.');

    if (form.track_stock) score += 15;

    return { score: Math.min(score, 100), tips };
  }, [form, price, compare]);

  const hColor = health.score > 80 ? '#0B8E54' : health.score > 50 ? '#A8730B' : 'var(--primary)';
  const hBg = health.score > 80 ? '#E6F6EE' : health.score > 50 ? '#FFF7E6' : '#FFF1EC';

  if (!open) return null;

  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop sheet" style={S.sheet}>
        
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div style={S.leftPanel}>
          <header style={S.header}>
            <div>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.02em', color: 'var(--text)' }}>
                {product ? 'Editar producto' : 'Nuevo producto'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                Paso {step} de {TOTAL_STEPS} · Selecciona opciones de 1 clic para configurar rápido
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {product && (
                <button
                  type="button"
                  onClick={() => setShowPerf(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
                    borderRadius: 99, background: 'linear-gradient(135deg, #2A2620, #17140F)',
                    color: '#D99A15', fontSize: 12, fontWeight: 700, border: '1px solid rgba(217, 154, 21, 0.3)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer'
                  }}
                >
                  <span className="ms" style={{ fontSize: 15 }}>bar_chart</span>
                  Rendimiento
                </button>
              )}
              <button onClick={onClose} style={{ ...S.close, display: 'none' }} className="mobile-only" aria-label="Cerrar">
                <span className="ms">close</span>
              </button>
            </div>
          </header>

          {/* Stepper Tabs (Figma Style) */}
          <div style={{ padding: '0 28px', display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              { num: 1, label: '1. Básico' },
              { num: 2, label: '2. Precios & Tiempos' },
              { num: 3, label: '3. Stock' },
              { num: 4, label: '4. Fotos' },
            ].map(s => (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: step === s.num ? 'var(--text)' : 'var(--surface2)',
                  color: step === s.num ? 'var(--surface)' : 'var(--muted)',
                  fontSize: 11.5, fontWeight: 800, transition: 'all .2s'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (step === TOTAL_STEPS) submit(); else goNext(); }} className="sc" style={S.body}>
            
            {/* ─────────── PASO 1: BÁSICO ─────────── */}
            {step === 1 && (
              <div className="anim-pop" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={S.sectionTitle}>1. Información Básica del Plato</div>
                
                <div>
                  <span style={S.label}>Nombre del Plato / Producto</span>
                  <input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ej. Hamburguesa Doble Queso Artesanal"
                    autoFocus
                    style={S.input}
                  />

                  {/* Sugerencias Rápidas de 1 Clic */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', alignSelf: 'center' }}>Sugerencias:</span>
                    {['Hamburguesa Especial', 'Pizza Artesanal', 'Corte Ribeye 400g', 'Salchipapa Mixta', 'Limonada de Coco'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => set('name', sug)}
                        style={{ padding: '3px 9px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 11, fontWeight: 700, color: 'var(--text)', cursor: 'pointer' }}
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <span style={S.label}>Categoría en el Menú</span>
                  {addingCategory ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                        placeholder="Nombre de la categoría"
                        autoFocus
                        style={{ ...S.input, flex: 1 }}
                      />
                      <button type="button" onClick={addCategory} disabled={busy} style={S.smallBtn}>Crear</button>
                      <button type="button" onClick={() => setAddingCategory(false)} style={S.smallGhost}>Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => set('category_id', c.id)}
                          style={{ ...S.chip, ...(form.category_id === c.id ? S.chipOn : S.chipOff) }}
                        >
                          {c.name}
                        </button>
                      ))}
                      <button type="button" onClick={() => setAddingCategory(true)} style={S.chipAdd}>
                        <span className="ms" style={{ fontSize: 16 }}>add</span>
                        Nueva
                      </button>
                    </div>
                  )}
                </div>

                {/* Descripción Asistida por IA */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={S.label}>Descripción Persuasiva</span>
                    <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Asistente IA
                    </span>
                  </div>

                  <textarea
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Describe los ingredientes, la preparación y por qué es delicioso..."
                    rows={3}
                    style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.45 }}
                  />

                  {/* 1-Click AI Description Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {AI_DESCRIPTION_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.label}
                        type="button"
                        onClick={() => set('description', tmpl.text)}
                        style={{
                          padding: '5px 10px', borderRadius: 99, border: '1px solid rgba(232,199,102,0.3)',
                          background: 'rgba(232,199,102,0.06)', fontSize: 11, fontWeight: 700, color: 'var(--text)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                        }}
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─────────── PASO 2: PRECIOS & TIEMPOS DE COCINA ─────────── */}
            {step === 2 && (
              <div className="anim-pop" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={S.sectionTitle}>2. Precios &amp; Tiempos de Preparación</div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <span style={S.label}>Precio Final al Cliente</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => set('price', e.target.value)}
                      placeholder="18000"
                      autoFocus
                      style={S.input}
                    />
                  </div>
                  <div>
                    <span style={S.label}>Precio Tachado (Oferta)</span>
                    <input
                      type="number"
                      value={form.compare_price}
                      onChange={(e) => set('compare_price', e.target.value)}
                      placeholder="24000"
                      style={S.input}
                    />
                  </div>
                </div>

                {/* Descuentos de 1 Clic */}
                <div>
                  <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>
                    Aplicar Oferta en 1 Clic:
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Sin Oferta', pct: 0 },
                      { label: '🏷️ -10%', pct: 10 },
                      { label: '🏷️ -20%', pct: 20 },
                      { label: '🏷️ -30%', pct: 30 },
                      { label: '🏷️ -50%', pct: 50 },
                    ].map(disc => (
                      <button
                        key={disc.pct}
                        type="button"
                        onClick={() => applyDiscountPreset(disc.pct)}
                        style={{
                          padding: '6px 12px', borderRadius: 10, border: '1px solid var(--border)',
                          background: 'var(--surface2)', fontSize: 12, fontWeight: 700, color: 'var(--text)',
                          cursor: 'pointer'
                        }}
                      >
                        {disc.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tiempo de Cocina (1-Clic Chips) */}
                <div>
                  <span style={S.label}>Tiempo Estimado de Preparación</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                    {TIME_PRESETS.map((t) => {
                      const isSel = form.prep_time === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => {
                            set('prep_time', t.value);
                            if (t.turbo) set('is_turbo', true);
                          }}
                          style={{
                            padding: '10px 12px', borderRadius: 12, textAlign: 'left',
                            border: isSel ? '2px solid var(--primary)' : '1px solid var(--border)',
                            background: isSel ? 'var(--primary-tint)' : 'var(--surface2)',
                            color: isSel ? 'var(--primary)' : 'var(--text)',
                            fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                          }}
                        >
                          <span>{t.label}</span>
                          {isSel && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SKU */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <span style={S.label}>Código SKU / Identificador</span>
                    <input
                      value={form.sku}
                      onChange={(e) => set('sku', e.target.value)}
                      placeholder="Ej: BURG-042"
                      style={S.input}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomSku}
                    style={{ ...S.smallGhost, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <span className="ms" style={{ fontSize: 16 }}>autorenew</span>
                    Generar
                  </button>
                </div>
              </div>
            )}

            {/* ─────────── PASO 3: GESTIÓN DE STOCK & INVENTARIO ─────────── */}
            {step === 3 && (
              <div className="anim-pop" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={S.sectionTitle}>3. Gestión de Stock &amp; Inventario</div>
                
                {/* Switch Control de Stock */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '16px 20px', borderRadius: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: form.track_stock ? 'var(--primary-tint)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="ms" style={{ color: form.track_stock ? 'var(--primary)' : 'var(--muted)', fontSize: 20 }}>inventory_2</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Controlar Unidades en Inventario</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Lleva el conteo de existencias en cocina</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => set('track_stock', !form.track_stock)}
                    style={{
                      width: 48, height: 28, borderRadius: 99, padding: 3, border: 'none', cursor: 'pointer',
                      background: form.track_stock ? 'var(--green)' : 'var(--border)', transition: 'background .3s', flex: 'none'
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: form.track_stock ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .3s' }} />
                  </button>
                </div>

                {form.track_stock ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Stepper + Presets de Stock de 1 Clic */}
                    <div>
                      <span style={S.label}>Unidades Disponibles en Cocina</span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <button
                          type="button"
                          onClick={() => set('stock', String(Math.max(0, (Number(form.stock) || 0) - 1)))}
                          style={{ width: 48, height: 48, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 20, fontWeight: 900, color: 'var(--text)', cursor: 'pointer' }}
                        >
                          -
                        </button>

                        <input
                          type="number"
                          value={form.stock}
                          onChange={(e) => set('stock', e.target.value)}
                          style={{ ...S.input, flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 900 }}
                        />

                        <button
                          type="button"
                          onClick={() => set('stock', String((Number(form.stock) || 0) + 1))}
                          style={{ width: 48, height: 48, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 20, fontWeight: 900, color: 'var(--text)', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>

                      {/* Presets de Stock */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {STOCK_PRESETS.map((unids) => (
                          <button
                            key={unids}
                            type="button"
                            onClick={() => set('stock', unids)}
                            style={{
                              flex: 1, padding: '6px 0', borderRadius: 10, border: '1px solid var(--border)',
                              background: form.stock === unids ? 'var(--text)' : 'var(--surface2)',
                              color: form.stock === unids ? 'var(--surface)' : 'var(--text)',
                              fontSize: 12, fontWeight: 800, cursor: 'pointer'
                            }}
                          >
                            {unids} unids
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Umbral de Alerta */}
                    <div>
                      <span style={S.label}>Alerta de Stock Bajo (Umbral)</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { label: '🚨 3 unidades', val: '3' },
                          { label: '⚠️ 5 unidades', val: '5' },
                          { label: '🔔 10 unidades', val: '10' },
                        ].map((u) => (
                          <button
                            key={u.val}
                            type="button"
                            onClick={() => set('low_stock_threshold', u.val)}
                            style={{
                              flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid var(--border)',
                              background: form.low_stock_threshold === u.val ? 'var(--primary-tint)' : 'var(--surface2)',
                              color: form.low_stock_threshold === u.val ? 'var(--primary)' : 'var(--text)',
                              fontSize: 12, fontWeight: 800, cursor: 'pointer'
                            }}
                          >
                            {u.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto-Agotar Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <input
                        type="checkbox"
                        id="autoOutOfStock"
                        checked={form.auto_out_of_stock}
                        onChange={(e) => set('auto_out_of_stock', e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <label htmlFor="autoOutOfStock" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>
                        Pausar automáticamente en la app del cliente cuando el stock llegue a 0
                      </label>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface2)', borderRadius: 16, border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13 }}>
                    <span className="ms" style={{ fontSize: 24, color: 'var(--muted)', marginBottom: 6 }}>all_inclusive</span>
                    <div>Stock ilimitado activado. El producto siempre estará disponible.</div>
                  </div>
                )}

                {/* Switch Tura Turbo ⚡ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(232,199,102,0.06))', padding: '16px 20px', borderRadius: 16, border: '1px solid rgba(255,107,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: form.is_turbo ? '#FF7A4D' : 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="ms" style={{ color: form.is_turbo ? '#fff' : 'var(--muted)', fontSize: 20 }}>bolt</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Habilitar para Tura Turbo ⚡ (&lt; 15 min)</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Plato apto para despacho express ultra-rápido</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => set('is_turbo', !form.is_turbo)}
                    style={{
                      width: 48, height: 28, borderRadius: 99, padding: 3, border: 'none', cursor: 'pointer',
                      background: form.is_turbo ? '#FF7A4D' : 'var(--border)', transition: 'background .3s', flex: 'none'
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', transform: form.is_turbo ? 'translateX(20px)' : 'translateX(0)', transition: 'transform .3s' }} />
                  </button>
                </div>
              </div>
            )}

            {/* ─────────── PASO 4: FOTOS ─────────── */}
            {step === 4 && (
              <div className="anim-pop">
                <div style={S.sectionTitle}>4. Fotografías del Plato (Galería 1 Clic)</div>
                <PhotoUploader
                  businessId={businessId}
                  images={form.images}
                  onChange={(images) => set('images', images)}
                  onError={setError}
                />
              </div>
            )}

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
                <span>{error}</span>
              </div>
            )}
          </form>

          <footer style={S.footer}>
            {step === 1 ? (
              <button type="button" onClick={onClose} style={S.cancel}>Cancelar</button>
            ) : (
              <button type="button" onClick={goBack} style={S.cancel}>Atrás</button>
            )}
            
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={goNext} className="md3-btn" style={S.save}>
                Siguiente
              </button>
            ) : (
              <button onClick={submit} disabled={busy} className="md3-btn" style={S.save}>
                {busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Publicar producto'}
              </button>
            )}
          </footer>
        </div>

        {/* PANEL DERECHO: TURA IA & VISTA PREVIA CLIENTE (CON 5 ESTRELLAS) */}
        <div style={S.rightPanel} className="desktop-only">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={onClose} style={S.close} aria-label="Cerrar">
              <span className="ms" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Salud IA */}
          <div style={S.iaCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={S.iaBadge}><span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Tura IA</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Salud del producto</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-bricolage)', color: hColor, lineHeight: 1 }}>
                {health.score}<span style={{ fontSize: 16 }}>%</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, background: hBg, padding: '3px 8px', borderRadius: 6, color: hColor }}>
                {health.score === 100 ? '¡Optimizado!' : 'Mejorable'}
              </span>
            </div>

            <div style={S.track}>
              <div style={{ height: '100%', width: `${health.score}%`, background: hColor, borderRadius: 99, transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {health.score === 100 ? (
                <div style={S.iaTip}>
                  <span className="ms" style={{ color: '#0B8E54', fontSize: 16 }}>verified</span>
                  ¡Excelente! Tienes un producto nivel PRO con stock configurado listo para vender.
                </div>
              ) : (
                health.tips.map((tip, i) => (
                  <div key={i} style={S.iaTip}>
                    <span className="ms" style={{ color: 'var(--primary)', fontSize: 16 }}>lightbulb</span>
                    {tip}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Vista Previa del Cliente con Estrellitas 5 ⭐ */}
          <div style={{ marginTop: 24, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: 12 }}>
              VISTA PREVIA DEL CLIENTE
            </span>
            
            <div style={S.preview}>
              <ProductThumb src={form.images[0] || '/burger_hero_pro.png'} vertical={vertical} size={70} radius={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                
                {/* 5 Estrellitas Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <span style={{ color: '#FBBF24', fontSize: 12, letterSpacing: '1px' }}>★★★★★</span>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--text)' }}>4.9</span>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>({form.reviews_count ?? 48})</span>
                </div>

                <div className="tr1" style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>
                  {form.name || 'Nombre del producto'}
                </div>
                <div className="tr2" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>
                  {form.description || 'La descripción persuasiva aumentará tus ventas.'}
                </div>

                {/* Stock Scarcity & Turbo Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {isLowStock && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF1EC', color: 'var(--primary)', padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>
                      <span className="ms" style={{ fontSize: 12 }}>local_fire_department</span> ¡Solo quedan {stockNum}!
                    </div>
                  )}

                  {form.is_turbo && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg, #FF7A4D, #E2360F)', color: '#fff', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, boxShadow: '0 4px 10px rgba(255,68,31,0.25)' }}>
                      <span className="ms" style={{ fontSize: 12 }}>bolt</span> ⚡ TURBO 15 MIN
                    </div>
                  )}
                </div>

                {form.prep_time && (
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="ms" style={{ fontSize: 13 }}>timer</span> {form.prep_time}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontWeight: 900, fontSize: 15.5, color: 'var(--text)' }}>{cop(price)}</span>
                  {compare > price && (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--faint)', textDecoration: 'line-through' }}>
                        {cop(compare)}
                      </span>
                      <span style={S.discount}>-{discount}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {showPerf && (
        <PerformanceOverlay product={product} onClose={() => setShowPerf(false)} />
      )}
    </div>
  );
}

const S = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(10,10,10,.65)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 920, maxHeight: '92dvh', background: 'var(--surface)',
    borderRadius: 28, display: 'flex', flexDirection: 'row', overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,0.08)',
  },
  leftPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
    background: 'var(--surface)',
  },
  rightPanel: {
    width: 340, background: 'var(--surface2)', borderLeft: '1px solid var(--border)',
    padding: 24, display: 'flex', flexDirection: 'column', flex: 'none',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12, padding: '24px 28px 16px',
    borderBottom: '1px solid var(--border)',
  },
  close: {
    width: 36, height: 36, borderRadius: 12, background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    cursor: 'pointer', border: '1px solid var(--border)', color: 'var(--text)',
  },
  body: { flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: 0 },
  
  sectionTitle: {
    fontSize: 13, fontWeight: 800, color: 'var(--text)', 
    borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16,
    letterSpacing: '.02em',
  },

  iaCard: {
    background: 'var(--surface)', 
    borderRadius: 20, padding: 20,
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadowSm)',
  },
  iaBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--text)',
    color: 'var(--surface)', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
    letterSpacing: '.05em',
  },
  track: {
    height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden',
  },
  iaTip: {
    display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, 
    color: 'var(--muted)', lineHeight: 1.4, background: 'var(--surface2)',
    padding: 10, borderRadius: 12, border: '1px solid var(--border)'
  },

  preview: {
    display: 'flex', gap: 13, alignItems: 'flex-start', padding: 18,
    borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: 'var(--shadowSm)',
  },
  discount: {
    fontSize: 10.5, fontWeight: 800, padding: '3px 7px',
    borderRadius: 6, background: '#FFF1EC', color: 'var(--primary)',
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  input: {
    width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface2)', padding: '0 16px', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)',
  },
  chip: { height: 38, padding: '0 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  chipOn: { background: 'var(--text)', color: 'var(--surface)', border: 'none' },
  chipOff: { background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' },
  chipAdd: {
    display: 'flex', alignItems: 'center', gap: 5, height: 38, padding: '0 14px',
    borderRadius: 12, border: '1px dashed var(--border)', color: 'var(--primary)',
    fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent',
  },
  smallBtn: {
    height: 48, padding: '0 18px', borderRadius: 14, background: 'var(--text)',
    color: 'var(--surface)', fontSize: 13, fontWeight: 700, flex: 'none', cursor: 'pointer', border: 'none',
  },
  smallGhost: {
    height: 48, padding: '0 16px', borderRadius: 14, border: '1px solid var(--border)',
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', flex: 'none', cursor: 'pointer', background: 'transparent',
  },
  footer: {
    flex: 'none', display: 'flex', gap: 12, padding: '16px 28px 24px',
    borderTop: '1px solid var(--border)', background: 'var(--surface)',
  },
  cancel: {
    flex: 'none', height: 50, padding: '0 24px', borderRadius: 16,
    border: '1px solid var(--border)', fontSize: 14.5, fontWeight: 700,
    background: 'transparent', color: 'var(--text)', cursor: 'pointer',
  },
  save: {
    flex: 1, height: 50, borderRadius: 16, background: 'var(--primary)',
    color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', border: 'none',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, padding: '14px 16px',
    borderRadius: 16, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45, marginTop: 20,
  },
};
