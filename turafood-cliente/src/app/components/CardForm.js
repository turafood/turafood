'use client';

/**
 * AGREGAR TARJETA (simulación)
 *
 * Formulario completo con tarjeta visual que se llena al escribir.
 *
 * QUÉ ES REAL AQUÍ:
 *   · la detección de marca por BIN;
 *   · la validación Luhn, que atrapa números mal digitados;
 *   · la validación de vencimiento y de longitud de CVV.
 *
 * QUÉ NO ES REAL TODAVÍA:
 *   · no se cobra ni se tokeniza: al guardar solo quedan marca,
 *     últimos 4 y vencimiento. El número y el CVV se descartan en el
 *     mismo momento en que se pulsa Guardar, sin salir del navegador.
 *
 * Cuando se habilite la tokenización de ePayco, el único cambio es
 * mandar el número a su API y guardar el token que devuelve, en vez de
 * descartar. La interfaz no cambia.
 */

import { useMemo, useState } from 'react';
import {
  formatCardNumber, formatExpiry, detectBrand, validateCard,
  toSafeCard, onlyDigits, BRAND_STYLE,
} from '@/lib/card';

export default function CardForm({ onSave, onCancel }) {
  const [number, setNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [alias, setAlias] = useState('');
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const brand = useMemo(() => detectBrand(number), [number]);
  const style = BRAND_STYLE[brand.id] ?? BRAND_STYLE.other;

  const complete = onlyDigits(number).length >= 14
    && holder.trim().length > 4
    && onlyDigits(expiry).length === 4
    && onlyDigits(cvv).length >= 3;

  const save = async () => {
    const check = validateCard({ number, holder, expiry, cvv });
    if (!check.ok) {
      setError(check.message);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Aquí es donde el número desaparece: toSafeCard se queda solo
      // con marca, últimos 4 y vencimiento.
      const safe = toSafeCard({ number, holder, expiry });
      await onSave({ ...safe, alias: alias.trim() || null });

      // Limpieza explícita de lo sensible
      setNumber(''); setCvv('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '4px 20px 26px' }}>

      {/* Tarjeta visual */}
      <div style={{ ...S.card, background: style.bg }}>
        <div style={S.cardShine} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={S.chip} />
          <span style={S.brandLabel}>{style.label}</span>
        </div>

        <div style={S.cardNumber}>
          {formatCardNumber(number) || '•••• •••• •••• ••••'}
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ minWidth: 0 }}>
            <span style={S.cardLabel}>TITULAR</span>
            <span className="tr1" style={S.cardValue}>
              {holder.trim().toUpperCase() || 'NOMBRE Y APELLIDO'}
            </span>
          </span>
          <span style={{ flex: 'none', textAlign: 'right' }}>
            <span style={S.cardLabel}>VENCE</span>
            <span style={S.cardValue}>{formatExpiry(expiry) || 'MM/AA'}</span>
          </span>
        </div>

        {flipped && (
          <div style={S.cvvBadge}>
            CVV {onlyDigits(cvv) || '•'.repeat(brand.cvv)}
          </div>
        )}
      </div>

      {/* Campos */}
      <label htmlFor="num" style={S.label}>NÚMERO DE TARJETA</label>
      <input
        id="num"
        inputMode="numeric"
        autoComplete="off"
        value={formatCardNumber(number)}
        onChange={(e) => { setNumber(e.target.value); setError(null); }}
        placeholder="0000 0000 0000 0000"
        style={S.input}
      />

      <label htmlFor="tit" style={{ ...S.label, marginTop: 14 }}>NOMBRE DEL TITULAR</label>
      <input
        id="tit"
        autoComplete="off"
        value={holder}
        onChange={(e) => { setHolder(e.target.value); setError(null); }}
        placeholder="Como aparece en la tarjeta"
        style={S.input}
      />

      <div style={{ display: 'flex', gap: 11, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="ven" style={S.label}>VENCIMIENTO</label>
          <input
            id="ven"
            inputMode="numeric"
            autoComplete="off"
            value={formatExpiry(expiry)}
            onChange={(e) => { setExpiry(e.target.value); setError(null); }}
            onFocus={() => setFlipped(false)}
            placeholder="MM/AA"
            style={S.input}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="cvv" style={S.label}>CÓDIGO ({brand.cvv} díg.)</label>
          <input
            id="cvv"
            inputMode="numeric"
            autoComplete="off"
            value={onlyDigits(cvv).slice(0, brand.cvv)}
            onChange={(e) => { setCvv(e.target.value); setError(null); }}
            onFocus={() => setFlipped(true)}
            onBlur={() => setFlipped(false)}
            placeholder={'•'.repeat(brand.cvv)}
            style={S.input}
          />
        </div>
      </div>

      <label htmlFor="ali" style={{ ...S.label, marginTop: 14 }}>
        NOMBRE PARA IDENTIFICARLA (OPCIONAL)
      </label>
      <input
        id="ali"
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="Ej. Mi tarjeta del banco"
        style={S.input}
      />

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 17 }}>error</span>
          {error}
        </div>
      )}

      {/* Qué pasa de verdad con estos datos */}
      <div style={S.notice}>
        <span className="ms" style={{ fontSize: 18, color: 'var(--amber)', flex: 'none' }}>science</span>
        <span>
          <strong>Modo simulación.</strong> Guardamos solo la marca, los
          últimos 4 dígitos y el vencimiento. El número completo y el código
          se descartan y no salen de tu teléfono. Al pagar, los datos se
          digitan en el formulario seguro de ePayco.
        </span>
      </div>

      <button onClick={save} disabled={!complete || saving} style={{
        ...S.saveBtn,
        background: complete ? 'var(--primary)' : 'var(--surface2)',
        color: complete ? '#fff' : 'var(--faint)',
        boxShadow: complete ? '0 10px 24px rgba(255,68,31,.3)' : 'none',
      }}>
        {saving ? 'Guardando…' : 'Guardar tarjeta'}
      </button>

      <button onClick={onCancel} style={S.cancelBtn}>Cancelar</button>
    </div>
  );
}

const S = {
  card: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 18, padding: 20, minHeight: 186, color: '#fff',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    boxShadow: '0 14px 34px rgba(20,16,10,.28)',
    marginBottom: 22,
  },
  cardShine: {
    position: 'absolute', right: -50, top: -70, width: 190, height: 190,
    borderRadius: '50%', background: 'rgba(255,255,255,.09)',
  },
  chip: {
    width: 42, height: 32, borderRadius: 7,
    background: 'linear-gradient(135deg,#E8C87A,#B8912F)',
    boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.25)',
  },
  brandLabel: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 15, letterSpacing: '.06em', opacity: .95,
  },
  cardNumber: {
    position: 'relative', fontFamily: 'var(--font-bricolage)', fontWeight: 700,
    fontSize: 21, letterSpacing: '.09em', margin: '18px 0 6px',
  },
  cardLabel: {
    display: 'block', fontSize: 8.5, fontWeight: 800,
    letterSpacing: '.09em', color: 'rgba(255,255,255,.6)',
  },
  cardValue: {
    display: 'block', fontSize: 12.5, fontWeight: 700,
    letterSpacing: '.04em', marginTop: 3,
  },
  cvvBadge: {
    position: 'absolute', right: 20, top: 20,
    background: 'rgba(255,255,255,.16)', borderRadius: 8,
    padding: '6px 11px', fontSize: 12, fontWeight: 800, letterSpacing: '.08em',
  },
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.06em', marginBottom: 7,
  },
  input: {
    width: '100%', height: 50, borderRadius: 13,
    border: '1px solid var(--border)', background: 'var(--surface)',
    padding: '0 14px', fontSize: 15.5, fontWeight: 600,
    letterSpacing: '.03em', outline: 'none',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
  },
  notice: {
    display: 'flex', gap: 9, margin: '16px 0 18px',
    background: '#FFF7E6', borderRadius: 13, padding: 13,
    fontSize: 11.5, color: '#7A5405', lineHeight: 1.45,
  },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 999, fontWeight: 800, fontSize: 15,
  },
  cancelBtn: {
    width: '100%', height: 46, fontWeight: 700, fontSize: 13.5,
    color: 'var(--muted)', marginTop: 6,
  },
};
