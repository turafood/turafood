'use client';

/**
 * FORMULARIO DE PRODUCTO
 *
 * Sirve para crear y para editar: la diferencia es si llega `product`.
 * Muestra la vista previa de cómo lo va a ver el cliente mientras se
 * escribe, que es la forma más rápida de entender qué se está armando.
 */

import { useEffect, useState } from 'react';
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
        // Los productos viejos traen solo `image_url`: se convierte en
        // una galería de una para que la pantalla no tenga dos caminos.
        images: product.images?.length
          ? product.images
          : (product.image_url ? [product.image_url] : []),
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

  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={(e) => e.stopPropagation()} className="anim-pop sheet" style={S.sheet}>
        <header style={S.header}>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' }}>
              {product ? 'Editar producto' : 'Nuevo producto'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>
              Los cambios se ven en la app de clientes al instante.
            </div>
          </div>
          <button onClick={onClose} style={S.close} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </header>

        <form onSubmit={submit} className="sc" style={S.body}>
          {/* Vista previa: lo que verá el cliente */}
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

          <Field label="Nombre" value={form.name} onChange={(v) => set('name', v)} placeholder="Ej. Hamburguesa clásica" autoFocus />

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={S.label}>Descripción</span>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Qué trae, para cuántas personas alcanza, cómo viene servido"
              rows={3}
              style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.45 }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="Precio" type="number" value={form.price}
              onChange={(v) => set('price', v)} placeholder="16000"
            />
            <Field
              label="Precio tachado (opcional)" type="number" value={form.compare_price}
              onChange={(v) => set('compare_price', v)} placeholder="20000"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <span style={S.label}>Categoría</span>
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
            {busy ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', autoFocus }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
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
    position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(20,16,10,.45)',
    backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 560, maxHeight: '92dvh', background: 'var(--surface)',
    borderRadius: 24, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(0,0,0,.3)',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 12, padding: '22px 22px 16px',
    borderBottom: '1px solid var(--border)',
  },
  close: {
    width: 36, height: 36, borderRadius: 11, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  body: { flex: 1, overflowY: 'auto', padding: 22, minHeight: 0 },
  preview: {
    display: 'flex', gap: 13, alignItems: 'flex-start', padding: 14,
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)',
    marginBottom: 18,
  },
  discount: {
    fontSize: 10.5, fontWeight: 800, padding: '2px 6px',
    borderRadius: 5, background: '#FFF1EC', color: 'var(--primary)',
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 },
  input: {
    width: '100%', height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
    fontFamily: 'inherit',
  },
  chip: { height: 36, padding: '0 13px', borderRadius: 10, fontSize: 12.5, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  chipAdd: {
    display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 13px',
    borderRadius: 10, border: '1px dashed var(--faint)', color: 'var(--primary)',
    fontSize: 12.5, fontWeight: 800,
  },
  smallBtn: {
    height: 46, padding: '0 16px', borderRadius: 12, background: 'var(--text)',
    color: '#fff', fontSize: 13, fontWeight: 700, flex: 'none',
  },
  smallGhost: {
    height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)',
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', flex: 'none',
  },
  footer: {
    flex: 'none', display: 'flex', gap: 11, padding: '16px 22px 20px',
    borderTop: '1px solid var(--border)',
  },
  cancel: {
    flex: 'none', height: 48, padding: '0 20px', borderRadius: 14,
    border: '1px solid var(--border)', fontSize: 14, fontWeight: 700,
  },
  save: {
    flex: 1, height: 48, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontSize: 14.5, fontWeight: 700,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
