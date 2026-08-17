'use client';

/**
 * AGREGAR MÉTODO DE PAGO
 *
 * Guarda billeteras (Nequi, Daviplata), que son un número de celular.
 *
 * Las tarjetas NO se capturan aquí a propósito: pedir número y CVV en
 * un formulario propio obliga a cumplir PCI-DSS y a custodiar datos que
 * no queremos tener. Con el Checkout Estándar de ePayco la tarjeta se
 * digita en SU formulario, en SU dominio, y nosotros nunca la vemos.
 *
 * Así que para tarjeta esta hoja explica dónde se agrega, en vez de
 * fingir un formulario que no podría guardar nada.
 */

import { useEffect, useState } from 'react';
import CardForm from './CardForm';

const OPTIONS = [
  {
    id: 'nequi',
    label: 'Nequi',
    hint: 'Con tu número de celular',
    icon: 'account_balance_wallet',
    color: '#6C2BD9',
    savable: true,
  },
  {
    id: 'daviplata',
    label: 'Daviplata',
    hint: 'Con tu número de celular',
    icon: 'account_balance',
    color: '#E2001A',
    savable: true,
  },
  {
    id: 'card',
    label: 'Tarjeta débito o crédito',
    hint: 'Visa, Mastercard, Amex',
    icon: 'credit_card',
    color: 'var(--blue)',
    savable: true,
    isCard: true,
  },
  {
    id: 'pse',
    label: 'PSE · Débito bancario',
    hint: 'Desde tu banco',
    icon: 'account_balance',
    color: '#0B7A48',
    savable: false,
  },
];

export default function AddPaymentSheet({ open, onClose, onSave }) {
  const [step, setStep] = useState('choose');
  const [kind, setKind] = useState(null);
  const [phone, setPhone] = useState('');
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) return;
    setStep('choose'); setKind(null); setPhone(''); setAlias(''); setError(null);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const option = OPTIONS.find((o) => o.id === kind);

  const pick = (o) => {
    setKind(o.id);
    setError(null);
    if (o.isCard) setStep('card');
    else setStep(o.savable ? 'wallet' : 'external');
  };

  const save = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('Escribe los 10 dígitos de tu celular.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ kind, phone: digits, alias: alias.trim() || null });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  /** Formatea 3161234567 → 316 123 4567 mientras se escribe */
  const onPhoneChange = (value) => {
    const d = value.replace(/\D/g, '').slice(0, 10);
    const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
    setPhone(parts.join(' '));
  };

  return (
    <div style={S.backdrop} onClick={() => !saving && onClose()}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Agregar método de pago">

        <div style={S.grabber} />

        <div style={S.header}>
          {step !== 'choose' && (
            <button onClick={() => setStep('choose')} style={S.backBtn} aria-label="Volver">
              <span className="ms" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
            </button>
          )}
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20 }}>
            {step === 'choose' ? 'Agregar método de pago' : option?.label}
          </span>
        </div>

        {/* Paso 1: elegir */}
        {step === 'choose' && (
          <div style={{ padding: '6px 20px 26px' }}>
            {OPTIONS.map((o) => (
              <button key={o.id} onClick={() => pick(o)} style={S.option}>
                <span style={{ ...S.optionIcon, background: `${o.color}18` }}>
                  <span className="ms" style={{ fontSize: 21, color: o.color }}>{o.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                    {o.hint}
                  </span>
                </span>
                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
              </button>
            ))}
          </div>
        )}

        {/* Paso 2a: billetera con celular */}
        {step === 'wallet' && (
          <div style={{ padding: '10px 20px 26px' }}>
            <div style={{ ...S.brandCard, background: `${option.color}12` }}>
              <span style={{ ...S.optionIcon, background: option.color }}>
                <span className="ms" style={{ fontSize: 22, color: '#fff' }}>{option.icon}</span>
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 15 }}>{option.label}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  Se cobra al confirmar cada pedido
                </span>
              </span>
            </div>

            <label htmlFor="cel" style={S.label}>NÚMERO DE CELULAR</label>
            <div style={S.phoneWrap}>
              <span style={S.prefix}>+57</span>
              <input
                id="cel"
                inputMode="numeric"
                autoFocus
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="316 123 4567"
                style={S.phoneInput}
              />
            </div>

            <label htmlFor="alias" style={{ ...S.label, marginTop: 16 }}>
              NOMBRE PARA IDENTIFICARLO (OPCIONAL)
            </label>
            <input
              id="alias"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej. Mi Nequi personal"
              style={S.input}
            />

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 17 }}>error</span>
                {error}
              </div>
            )}

            <div style={S.trust}>
              <span className="ms" style={{ fontSize: 17, color: 'var(--green)', flex: 'none' }}>lock</span>
              <span>
                Guardamos solo tu número para agilizar el cobro. No pedimos clave
                ni acceso a tu cuenta.
              </span>
            </div>

            <button onClick={save} disabled={saving} style={S.saveBtn}>
              {saving ? 'Guardando…' : 'Guardar método'}
            </button>
          </div>
        )}

        {/* Paso 2b: tarjeta */}
        {step === 'card' && (
          <CardForm
            onCancel={() => setStep('choose')}
            onSave={async (safeCard) => {
              await onSave(safeCard);
              onClose();
            }}
          />
        )}

        {/* Paso 2c: PSE se agrega en la pasarela */}
        {step === 'external' && (
          <div style={{ padding: '10px 20px 26px' }}>
            <div style={S.explainIcon}>
              <span className="ms" style={{ fontSize: 34, color: 'var(--primary)' }}>
                {option.icon}
              </span>
            </div>

            <div style={S.explainTitle}>
              Tu {option.id === 'card' ? 'tarjeta' : 'banco'} se agrega al pagar
            </div>

            <p style={S.explainBody}>
              Por seguridad, los datos de {option.id === 'card' ? 'tu tarjeta' : 'tu banco'} se
              digitan dentro del formulario cifrado de ePayco, no en Tura Shop.
              Nosotros nunca vemos ni guardamos esa información.
            </p>

            <div style={S.steps}>
              {[
                'Arma tu pedido y ve al checkout',
                `Elige ${option.id === 'card' ? 'Tarjeta' : 'PSE'} como método`,
                'Completa los datos en la ventana de ePayco',
              ].map((t, i) => (
                <div key={t} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: i === 2 ? 'none' : '1px solid var(--border)' }}>
                  <span style={S.stepDot}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13.5, lineHeight: 1.45 }}>{t}</span>
                </div>
              ))}
            </div>

            <div style={S.trust}>
              <span className="ms" style={{ fontSize: 17, color: 'var(--green)', flex: 'none' }}>verified_user</span>
              <span>
                Este es el mismo estándar que usan las tiendas grandes: la
                pasarela custodia los datos, el comercio no.
              </span>
            </div>

            <button onClick={onClose} style={S.saveBtn}>Entendido</button>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'absolute', inset: 0, zIndex: 350,
    background: 'rgba(20,16,10,.46)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fade .16s ease both',
  },
  sheet: {
    width: '100%', maxHeight: '90%', overflowY: 'auto',
    background: 'var(--bg)', borderRadius: '26px 26px 0 0',
    animation: 'slideup .28s cubic-bezier(.32,.72,0,1) both',
  },
  grabber: {
    width: 42, height: 4, borderRadius: 99, background: 'var(--faint)',
    margin: '12px auto 10px',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 11, padding: '6px 20px 14px',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  option: {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: 'var(--shadowSm)',
  },
  optionIcon: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  brandCard: {
    display: 'flex', alignItems: 'center', gap: 13,
    borderRadius: 16, padding: 14, marginBottom: 20,
  },
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.06em', marginBottom: 8,
  },
  phoneWrap: {
    display: 'flex', alignItems: 'center', height: 52,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, overflow: 'hidden',
  },
  prefix: {
    padding: '0 13px', fontSize: 14.5, fontWeight: 800, color: 'var(--muted)',
    borderRight: '1px solid var(--border)', height: '100%',
    display: 'flex', alignItems: 'center', flex: 'none',
  },
  phoneInput: {
    flex: 1, minWidth: 0, height: '100%', border: 'none', outline: 'none',
    background: 'none', padding: '0 14px', fontSize: 16, fontWeight: 700,
    letterSpacing: '.04em',
  },
  input: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 14px', fontSize: 14, outline: 'none',
  },
  trust: {
    display: 'flex', gap: 9, margin: '16px 0 18px',
    fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
  },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 15,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
  explainIcon: {
    width: 76, height: 76, borderRadius: '50%', background: '#FFF1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '6px auto 0',
  },
  explainTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    textAlign: 'center', marginTop: 16, letterSpacing: '-.02em',
  },
  explainBody: {
    fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5,
    textAlign: 'center', marginTop: 8,
  },
  steps: {
    marginTop: 20, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 16, padding: '4px 16px',
  },
  stepDot: {
    width: 24, height: 24, borderRadius: '50%', flex: 'none',
    background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12.5, fontWeight: 800,
  },
};
