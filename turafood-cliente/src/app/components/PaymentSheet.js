'use client';

/**
 * HOJA DE PAGO
 *
 * El paso previo a abrir el modal de ePayco. El checkout de ePayco es
 * de ellos y no se puede maquillar, así que lo PRO se juega aquí: un
 * resumen limpio, método claro, señales de confianza y una transición
 * suave hacia la pasarela.
 *
 * Es la última pantalla nuestra antes de salir, y la primera impresión
 * de que el cobro es serio.
 */

import { useEffect, useState } from 'react';
import { PAYMENT_METHODS, isOnlineMethod } from '@/services/payment';
import { cop } from '@/lib/format';

export default function PaymentSheet({
  open,
  onClose,
  onConfirm,
  totals,
  businessName,
  method,
  onMethodChange,
  busy,
  error,
}) {
  const [showMethods, setShowMethods] = useState(false);

  useEffect(() => {
    if (!open) setShowMethods(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const selected = PAYMENT_METHODS.find((m) => m.id === method);
  const online = isOnlineMethod(method);

  return (
    <div style={S.backdrop} onClick={() => !busy && onClose()}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirmar pago">

        <div style={S.grabber} />

        <div style={{ padding: '4px 22px 0' }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.07em' }}>
            TOTAL A PAGAR
          </div>
          <div style={S.amount}>{cop(totals.total)}</div>
          {businessName && (
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              Pedido en {businessName}
            </div>
          )}
        </div>

        {/* Desglose */}
        <div style={S.breakdown}>
          <Row label="Productos" value={cop(totals.subtotal)} />
          {totals.delivery > 0 && <Row label="Envío" value={cop(totals.delivery)} />}
          {totals.delivery === 0 && <Row label="Envío" value="Gratis" green />}
          <Row label="Tarifa de servicio" value={cop(totals.service)} />
          {totals.tip > 0 && <Row label="Propina" value={cop(totals.tip)} />}
          {totals.discount > 0 && <Row label="Descuento" value={`− ${cop(totals.discount)}`} green />}
        </div>

        {/* Método */}
        <div style={{ padding: '0 22px' }}>
          <button onClick={() => setShowMethods((v) => !v)} style={S.methodBtn} disabled={busy}>
            <span style={S.methodIcon}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>
                {selected?.icon ?? 'credit_card'}
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>
                MÉTODO DE PAGO
              </span>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, marginTop: 2 }}>
                {selected?.label}
              </span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary)' }}>Cambiar</span>
          </button>

          {showMethods && (
            <div style={{ marginTop: 8 }}>
              {PAYMENT_METHODS.map((m) => {
                const on = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => { onMethodChange(m.id); setShowMethods(false); }}
                    style={{
                      ...S.methodOption,
                      background: on ? '#FFF1EC' : 'var(--bg)',
                      border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 20, color: on ? 'var(--primary)' : 'var(--muted)', flex: 'none' }}>
                      {m.icon}
                    </span>
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 13.5 }}>
                      {m.label}
                    </span>
                    {on && <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>check_circle</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 17 }}>error</span>
            {error}
          </div>
        )}

        {/* Confianza */}
        <div style={S.trust}>
          <span className="ms" style={{ fontSize: 17, color: 'var(--green)', flex: 'none' }}>lock</span>
          <span>
            {online
              ? 'Pago cifrado procesado por ePayco. Tus datos de tarjeta no pasan por TuraFood.'
              : 'Pagas en efectivo al recibir. Ten el monto listo para el repartidor.'}
          </span>
        </div>

        <div style={{ padding: '0 22px 26px' }}>
          <button onClick={onConfirm} disabled={busy} style={S.payBtn}>
            {busy ? (
              <>
                <span className="ms" style={{ fontSize: 19, animation: 'spin 1s linear infinite' }}>
                  progress_activity
                </span>
                Conectando con la pasarela…
              </>
            ) : (
              <>
                {online && <span className="ms" style={{ fontSize: 19 }}>lock</span>}
                {online ? `Pagar ${cop(totals.total)}` : `Confirmar pedido · ${cop(totals.total)}`}
              </>
            )}
          </button>

          <button onClick={onClose} disabled={busy} style={S.cancelBtn}>
            Volver
          </button>

          {online && (
            <div style={S.brands}>
              <span style={S.brand}>VISA</span>
              <span style={S.brand}>Mastercard</span>
              <span style={S.brand}>PSE</span>
              <span style={S.brand}>Nequi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, green }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, color: green ? 'var(--green)' : 'var(--text)' }}>{value}</span>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'absolute', inset: 0, zIndex: 340,
    background: 'rgba(20,16,10,.46)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fade .16s ease both',
  },
  sheet: {
    width: '100%', maxHeight: '92%', overflowY: 'auto',
    background: 'var(--bg)', borderRadius: '26px 26px 0 0',
    animation: 'slideup .28s cubic-bezier(.32,.72,0,1) both',
    boxShadow: '0 -14px 44px rgba(20,16,10,.24)',
  },
  grabber: {
    width: 42, height: 4, borderRadius: 99, background: 'var(--faint)',
    margin: '12px auto 14px',
  },
  amount: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38,
    letterSpacing: '-.03em', marginTop: 4, lineHeight: 1.05,
  },
  breakdown: {
    margin: '18px 22px', padding: 16,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10,
  },
  methodBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 14,
  },
  methodIcon: {
    width: 40, height: 40, borderRadius: 12, background: '#FFF1EC', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  methodOption: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
    height: 48, padding: '0 13px', borderRadius: 13, marginBottom: 7,
  },
  trust: {
    display: 'flex', gap: 9, margin: '16px 22px 18px',
    fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45,
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '14px 22px 0',
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
  },
  payBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 56, borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 15.5,
    boxShadow: '0 12px 28px rgba(255,68,31,.34)',
  },
  cancelBtn: {
    width: '100%', height: 46, fontWeight: 700, fontSize: 13.5,
    color: 'var(--muted)', marginTop: 8,
  },
  brands: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 6, flexWrap: 'wrap',
  },
  brand: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
    color: 'var(--faint)', border: '1px solid var(--border)',
    padding: '4px 8px', borderRadius: 6,
  },
};
