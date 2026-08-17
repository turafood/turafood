'use client';

/**
 * PROMOCIONES Y CUPONES
 * Conversión de `isPromos` (línea 529) y del modal `promoModal`
 * (línea 927) del mockup de Negocios.
 *
 * Cada promoción es una fila de `coupons` con `business_id`: aplica
 * solo en esta tienda. El descuento lo asume el negocio.
 */

import { useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { getCoupons, createCoupon, setCouponActive } from '@/lib/negocio';
import { useBiz } from '../BizContext';

const TYPES = [
  { value: 'percent', label: 'Descuento %', icon: 'percent' },
  { value: 'fixed', label: 'Monto fijo', icon: 'redeem' },
  { value: 'free_delivery', label: 'Envío gratis', icon: 'two_wheeler' },
];

const LOOK = {
  percent: { icon: 'redeem', bg: '#FFF1EC', fg: 'var(--primary)' },
  fixed: { icon: 'local_activity', bg: '#EAF1FF', fg: 'var(--blue)' },
  free_delivery: { icon: 'two_wheeler', bg: '#E6F6EE', fg: '#0B8E54' },
};

const describe = (c) => {
  if (c.discount_type === 'free_delivery') {
    return c.min_order > 0 ? `Envío gratis desde ${cop(c.min_order)}` : 'Envío gratis';
  }
  if (c.discount_type === 'fixed') return `${cop(c.discount_value)} de descuento`;
  return `${c.discount_value}% de descuento${c.max_discount ? ` · tope ${cop(c.max_discount)}` : ''}`;
};

const until = (iso) => (iso
  ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  : 'Sin límite');

export default function PromocionesPage() {
  const { business, toast } = useBiz();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);

  const [form, setForm] = useState({
    discount_type: 'percent', discount_value: '20', code: '',
    max_discount: '', min_order: '', valid_until: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getCoupons(business.id);
        if (alive) setCoupons(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const toggle = async (c) => {
    const next = !c.is_active;
    setCoupons((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: next } : x)));
    try {
      await setCouponActive(c.id, next);
      toast(next ? 'Promoción activada' : 'Promoción pausada');
    } catch (err) {
      setCoupons((list) => list.map((x) => (x.id === c.id ? { ...x, is_active: !next } : x)));
      setError(err.message);
    }
  };

  const publish = async () => {
    const code = form.code.trim().toUpperCase();
    if (!code) { setError('Ponle un código a la promoción.'); return; }

    setSaving(true);
    setError(null);
    try {
      const row = await createCoupon(business.id, {
        code,
        description: describeForm(form),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value) || 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        min_order: form.min_order ? Number(form.min_order) : 0,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        is_active: true,
      });
      setCoupons((list) => [row, ...list]);
      setModal(false);
      setForm({ discount_type: 'percent', discount_value: '20', code: '', max_discount: '', min_order: '', valid_until: '' });
      toast('Promoción publicada');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 16 }}>
        {coupons.map((c) => {
          const look = LOOK[c.discount_type] ?? LOOK.percent;
          return (
            <div key={c.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...S.icon, background: look.bg }}>
                  <span className="ms" style={{ fontSize: 20, color: look.fg }}>{look.icon}</span>
                </span>
                <span
                  style={{
                    ...S.pill,
                    background: c.is_active ? '#E6F6EE' : 'var(--surface2)',
                    color: c.is_active ? '#0B7A48' : 'var(--muted)',
                  }}
                >
                  {c.is_active ? 'ACTIVA' : 'PAUSADA'}
                </span>
              </div>

              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 17, marginTop: 14 }}>
                {c.code}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}>
                {c.description || describe(c)}
              </div>

              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div>
                  <div style={S.metaLabel}>USOS</div>
                  <div style={S.metaValue}>{c.uses_count ?? 0}</div>
                </div>
                <div>
                  <div style={S.metaLabel}>DESCUENTO</div>
                  <div style={S.metaValue}>
                    {c.discount_type === 'percent' ? `${c.discount_value}%`
                      : c.discount_type === 'fixed' ? cop(c.discount_value) : 'Envío'}
                  </div>
                </div>
                <div>
                  <div style={S.metaLabel}>VIGENCIA</div>
                  <div style={S.metaValue}>{until(c.valid_until)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={() => toggle(c)} style={S.action}>
                  {c.is_active ? 'Pausar' : 'Activar'}
                </button>
              </div>
            </div>
          );
        })}

        <button onClick={() => setModal(true)} style={S.newCard}>
          <span style={S.newIcon}>
            <span className="ms" style={{ fontSize: 24, color: 'var(--primary)' }}>add</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Crear promoción</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 190, textAlign: 'center', lineHeight: 1.45 }}>
            Descuentos, monto fijo o envío gratis para tus clientes
          </span>
        </button>
      </div>

      {!loading && coupons.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>
          Todavía no tienes promociones. La primera te toma menos de un minuto.
        </div>
      )}

      {/* Modal de creación */}
      {modal && (
        <div onClick={() => setModal(false)} style={S.scrim}>
          <div onClick={(e) => e.stopPropagation()} className="anim-pop" style={S.modal}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>
                  Crear promoción
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Se publica en la app en menos de 5 minutos.
                </div>
              </div>
              <button onClick={() => setModal(false)} style={S.modalClose} aria-label="Cerrar">
                <span className="ms" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginTop: 22 }}>
              Tipo de promoción
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {TYPES.map((t) => {
                const on = form.discount_type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setForm((f) => ({ ...f, discount_type: t.value }))}
                    style={{
                      ...S.typeBtn,
                      border: on ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                      background: on ? '#FFF9F7' : 'var(--surface)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 21, flex: 'none', color: on ? 'var(--primary)' : 'var(--muted)' }}>
                      {t.icon}
                    </span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, textAlign: 'left' }}>{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
              {form.discount_type !== 'free_delivery' && (
                <Field
                  label={form.discount_type === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}
                  value={form.discount_value}
                  onChange={(v) => setForm((f) => ({ ...f, discount_value: v }))}
                  type="number"
                />
              )}
              <Field
                label="Código"
                value={form.code}
                onChange={(v) => setForm((f) => ({ ...f, code: v.toUpperCase() }))}
                placeholder="PUERTO20"
              />
              {form.discount_type === 'percent' && (
                <Field
                  label="Tope de descuento ($)"
                  value={form.max_discount}
                  onChange={(v) => setForm((f) => ({ ...f, max_discount: v }))}
                  type="number"
                  placeholder="Opcional"
                />
              )}
              <Field
                label="Pedido mínimo ($)"
                value={form.min_order}
                onChange={(v) => setForm((f) => ({ ...f, min_order: v }))}
                type="number"
                placeholder="Opcional"
              />
              <Field
                label="Vence"
                value={form.valid_until}
                onChange={(v) => setForm((f) => ({ ...f, valid_until: v }))}
                type="date"
              />
            </div>

            <div style={S.notice}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>info</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                El descuento lo asume tu negocio. TuraFood no cobra comisión sobre el valor
                descontado.
              </span>
            </div>

            <div style={{ display: 'flex', gap: 11, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={S.cancel}>Cancelar</button>
              <button onClick={publish} disabled={saving} style={S.publish}>
                {saving ? 'Publicando…' : 'Publicar promoción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function describeForm(f) {
  if (f.discount_type === 'free_delivery') {
    return f.min_order ? `Envío gratis desde ${cop(Number(f.min_order))}` : 'Envío gratis en toda la tienda';
  }
  if (f.discount_type === 'fixed') return `${cop(Number(f.discount_value))} de descuento`;
  return `${f.discount_value}% de descuento${f.max_discount ? ` · tope ${cop(Number(f.max_discount))}` : ''}`;
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={S.input}
      />
    </label>
  );
}

const S = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 18, boxShadow: 'var(--shadowSm)',
  },
  icon: {
    width: 38, height: 38, borderRadius: 11, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pill: { fontSize: 10.5, fontWeight: 800, padding: '5px 9px', borderRadius: 8, flex: 'none' },
  metaLabel: { fontSize: 11, color: 'var(--muted)', fontWeight: 700 },
  metaValue: { fontSize: 15, fontWeight: 800, marginTop: 3 },
  action: {
    flex: 1, height: 38, borderRadius: 11, border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 700,
  },
  newCard: {
    minHeight: 250, border: '1.5px dashed var(--faint)', borderRadius: 18,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: 20,
  },
  newIcon: {
    width: 48, height: 48, borderRadius: 14, background: '#FFF1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  scrim: {
    position: 'fixed', inset: 0, background: 'rgba(20,16,10,.42)',
    backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 20, zIndex: 80, overflowY: 'auto',
  },
  modal: {
    width: '100%', maxWidth: 520, background: 'var(--surface)', borderRadius: 22,
    padding: 26, boxShadow: '0 30px 80px rgba(0,0,0,.3)', margin: 'auto',
  },
  modalClose: {
    width: 36, height: 36, borderRadius: 11, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  typeBtn: {
    display: 'flex', alignItems: 'center', gap: 11, padding: 14, borderRadius: 14,
  },
  input: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 14px', fontSize: 16, outline: 'none',
  },
  notice: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16,
    background: 'var(--bg)', borderRadius: 13, padding: 13,
  },
  cancel: {
    flex: 'none', height: 48, padding: '0 20px', borderRadius: 14,
    border: '1px solid var(--border)', fontSize: 14, fontWeight: 700,
  },
  publish: {
    flex: 1, height: 48, borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontSize: 14.5, fontWeight: 700,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
