'use client';

/**
 * FORMULARIO DE PRODUCTO PRO (WIZARD + IA)
 *
 * Se ha convertido en un modal de dos columnas:
 * Izquierda: Formulario paso a paso o seccionado.
 * Derecha: "Tura IA" evaluando la salud del producto en tiempo real para 
 * gamificar y motivar a subir mejores fotos y descripciones.
 */

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { supabaseUpload } from '@/lib/upload';
import PerformanceOverlay from '../components/PerformanceOverlay';
import { cop } from '@/lib/format';
import { saveProduct, createCategory } from '@/lib/negocio';
import { ProductThumb } from '../../components/Vertical3D';
import PhotoUploader from './PhotoUploader';

const EMPTY = {
  name: '', description: '', price: '', compare_price: '',
  category_id: '', images: [],
};

export default function ProductSheet({
  open, product, categories, businessId, vertical, onClose, onSaved, onCategoryCreated,
}) {
  const [showPerf, setShowPerf] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [newCategory, setNewCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setAddingCategory(false);
    setNewCategory('');
    setForm(product
      ? {
        name: product.name ?? '',
        description: product.description ?? '',
        price: String(product.price ?? ''),
        compare_price: product.compare_price ? String(product.compare_price) : '',
        category_id: product.category_id ?? '',
        images: product.images?.length ? product.images : (product.image_url ? [product.image_url] : []),
      }
      : { ...EMPTY, category_id: categories[0]?.id ?? '' });
  }, [open, product, categories]);

  if (!open) return null;

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

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) { setError('Ponle un nombre al producto.'); return; }
    if (!Number(form.price)) { setError('El precio tiene que ser mayor que cero.'); return; }
    if (form.compare_price && Number(form.compare_price) <= Number(form.price)) {
      setError('El precio tachado tiene que ser mayor que el precio de venta.');
      return;
    }

    setBusy(true);
    try {
      const saved = await saveProduct(businessId, { ...form, id: product?.id });
      onSaved(saved, Boolean(product));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const price = Number(form.price) || 0;
  const compare = Number(form.compare_price) || 0;
  const discount = compare > price ? Math.round(((compare - price) / compare) * 100) : 0;

  // Lógica de "Salud del Producto" (Gamificación IA)
  const health = useMemo(() => {
    let score = 10; // Base
    let tips = [];
    
    if (form.name.trim().length > 3) score += 15;
    else tips.push('Escribe un nombre claro y apetitoso.');

    if (form.category_id) score += 10;

    if (price > 0) score += 10;

    if (form.description.trim().length > 10) score += 25;
    else tips.push('Detalla los ingredientes. Los clientes dudan si no saben qué trae.');

    if (form.images.length > 0) score += 20;
    else tips.push('Sube una foto. Los productos con foto venden un 40% más.');

    if (compare > price) score += 10;
    else tips.push('Usa el precio tachado para crear un efecto de oferta irresistible.');

    return { score, tips };
  }, [form, price, compare]);

  const hColor = health.score > 80 ? '#0B8E54' : health.score > 50 ? '#A8730B' : 'var(--primary)';
  const hBg = health.score > 80 ? '#E6F6EE' : health.score > 50 ? '#FFF7E6' : '#FFF1EC';

  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop sheet" style={S.sheet}>
        
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div style={S.leftPanel}>
          <header style={S.header}>
            <div>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>
                {product ? 'Editar producto' : 'Nuevo producto'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
                Completa los datos para mejorar el ranking de tu producto.
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

          {showPerf && (
            <PerformanceOverlay product={product} onClose={() => setShowPerf(false)} />
          )}

          <form onSubmit={submit} className="sc" style={S.body}>
            <div style={S.sectionTitle}>1. Lo Básico</div>
            <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Ej. Hamburguesa Doble Queso" autoFocus />
            
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span style={S.label}>Descripción persuasiva</span>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Cuenta qué ingredientes trae, cómo se prepara y por qué es delicioso..."
                rows={3}
                style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.45 }}
              />
            </label>

            <div style={S.sectionTitle}>2. Precios y Categoría</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field
                label="Precio final" type="number" value={form.price}
                onChange={(v) => set('price', v)} placeholder="16000"
              />
              <Field
                label="Precio tachado (oferta)" type="number" value={form.compare_price}
                onChange={(v) => set('compare_price', v)} placeholder="20000"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <span style={S.label}>Categoría del menú</span>
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

            <div style={S.sectionTitle}>3. Fotografías</div>
            <PhotoUploader
              businessId={businessId}
              images={form.images}
              onChange={(images) => set('images', images)}
              onError={setError}
            />

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
                <span>{error}</span>
              </div>
            )}
          </form>

          <footer style={S.footer}>
            <button type="button" onClick={onClose} style={S.cancel}>Cancelar</button>
            <button onClick={submit} disabled={busy} className="md3-btn" style={S.save}>
              {busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Publicar producto'}
            </button>
          </footer>
        </div>

        {/* PANEL DERECHO: TURA IA Y SALUD */}
        <div style={S.rightPanel} className="desktop-only">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={onClose} style={S.close} aria-label="Cerrar">
              <span className="ms" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          <div style={S.iaCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={S.iaBadge}><span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Tura IA</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Salud del producto</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-bricolage)', color: hColor, lineHeight: 1 }}>
                {health.score}<span style={{ fontSize: 16 }}>%</span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', background: hBg, padding: '3px 8px', borderRadius: 6, color: hColor }}>
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
                  ¡Excelente! Tienes un producto nivel PRO listo para vender masivamente.
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

          <div style={{ marginTop: 24, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginBottom: 12 }}>
              VISTA PREVIA DEL CLIENTE
            </span>
            <div style={S.preview}>
              <ProductThumb src={form.images[0]} vertical={vertical} size={64} radius={14} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tr1" style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {form.name || 'Nombre del producto'}
                </div>
                <div className="tr2" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.4 }}>
                  {form.description || 'La descripción ayuda a que el cliente se decida.'}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 15 }}>{cop(price)}</span>
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
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', autoFocus }) {
  return (
    <label style={{ display: 'block', marginBottom: 20 }}>
      <span style={S.label}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={S.input}
      />
    </label>
  );
}

const S = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(10,10,10,.6)',
    backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 860, maxHeight: '92dvh', background: 'var(--surface)',
    borderRadius: 24, display: 'flex', flexDirection: 'row', overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,.4)',
  },
  leftPanel: {
    flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
    background: 'var(--surface)',
  },
  rightPanel: {
    width: 340, background: 'var(--bg)', borderLeft: '1px solid var(--border)',
    padding: 24, display: 'flex', flexDirection: 'column', flex: 'none',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12, padding: '24px 28px 16px',
    borderBottom: '1px solid var(--border)',
  },
  close: {
    width: 36, height: 36, borderRadius: 12, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    cursor: 'pointer', border: 'none', color: 'var(--text)',
  },
  body: { flex: 1, overflowY: 'auto', padding: '24px 28px', minHeight: 0 },
  
  sectionTitle: {
    fontSize: 13, fontWeight: 800, color: 'var(--text)', 
    borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 16,
    letterSpacing: '.02em',
  },

  iaCard: {
    background: 'var(--surface)', borderRadius: 18, padding: 20,
    border: '1px solid var(--primary)',
    boxShadow: '0 12px 30px rgba(255,68,31,0.08)',
  },
  iaBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--ink)',
    color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
    letterSpacing: '.05em',
  },
  track: {
    height: 8, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden',
  },
  iaTip: {
    display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, 
    color: 'var(--muted)', lineHeight: 1.4, background: 'var(--bg)',
    padding: 10, borderRadius: 12, border: '1px solid var(--border)'
  },

  preview: {
    display: 'flex', gap: 13, alignItems: 'flex-start', padding: 16,
    borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
  },
  discount: {
    fontSize: 10.5, fontWeight: 800, padding: '3px 7px',
    borderRadius: 6, background: '#FFF1EC', color: 'var(--primary)',
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 },
  input: {
    width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 16px', fontSize: 15, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  },
  chip: { height: 38, padding: '0 14px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
  chipOn: { background: 'var(--text)', color: '#fff', border: 'none' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  chipAdd: {
    display: 'flex', alignItems: 'center', gap: 5, height: 38, padding: '0 14px',
    borderRadius: 12, border: '1px dashed var(--faint)', color: 'var(--primary)',
    fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent',
  },
  smallBtn: {
    height: 48, padding: '0 18px', borderRadius: 14, background: 'var(--text)',
    color: '#fff', fontSize: 13, fontWeight: 700, flex: 'none', cursor: 'pointer', border: 'none',
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
