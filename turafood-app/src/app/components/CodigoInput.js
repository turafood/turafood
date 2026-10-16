'use client';

/**
 * CASILLAS DEL CÓDIGO (6 dígitos)
 *
 * El patrón de las apps modernas de código: una casilla por dígito, el cursor salta
 * solo, se puede pegar el código completo (también desde el correo o el SMS) y al
 * escribir el sexto dígito se avisa con `onCompleto`. En iPhone y Android el teclado
 * ofrece el código recibido por SMS (autocomplete="one-time-code").
 *
 * Es controlado: `valor` es un texto de hasta 6 dígitos.
 */

import { useEffect, useRef } from 'react';

const LARGO = 6;

export default function CodigoInput({ valor, onChange, onCompleto, deshabilitado = false, error = false, autoFoco = true, oscuro = false }) {
  const refs = useRef([]);

  useEffect(() => { if (autoFoco) refs.current[0]?.focus(); }, [autoFoco]);

  const poner = (texto) => {
    const limpio = String(texto).replace(/\D/g, '').slice(0, LARGO);
    onChange(limpio);
    if (limpio.length === LARGO) onCompleto?.(limpio);
    return limpio;
  };

  const alEscribir = (i, e) => {
    const dig = e.target.value.replace(/\D/g, '');
    if (!dig) return;
    // Si pegan o el teclado autocompleta varios dígitos de una vez
    if (dig.length > 1) { const l = poner(dig); refs.current[Math.min(l.length, LARGO - 1)]?.focus(); return; }
    const nuevo = (valor.slice(0, i) + dig + valor.slice(i + 1)).slice(0, LARGO);
    poner(nuevo);
    refs.current[Math.min(i + 1, LARGO - 1)]?.focus();
  };

  const alTecla = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (valor[i]) onChange(valor.slice(0, i) + valor.slice(i + 1));
      else if (i > 0) { onChange(valor.slice(0, i - 1) + valor.slice(i)); refs.current[i - 1]?.focus(); }
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < LARGO - 1) refs.current[i + 1]?.focus();
  };

  const alPegar = (e) => {
    e.preventDefault();
    const l = poner(e.clipboardData.getData('text'));
    refs.current[Math.min(l.length, LARGO - 1)]?.focus();
  };

  return (
    <div role="group" aria-label="Código de verificación de 6 dígitos" style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {Array.from({ length: LARGO }, (_, i) => {
        const lleno = Boolean(valor[i]);
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={valor[i] ?? ''}
            onChange={(e) => alEscribir(i, e)}
            onKeyDown={(e) => alTecla(i, e)}
            onPaste={alPegar}
            onFocus={(e) => e.target.select()}
            disabled={deshabilitado}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? LARGO : 1}
            aria-label={`Dígito ${i + 1}`}
            style={{
              width: 'clamp(40px, 12.5vw, 52px)', height: 60, borderRadius: 14, textAlign: 'center',
              fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-bricolage, inherit)', color: oscuro ? '#fff' : 'var(--text)',
              background: oscuro ? (lleno ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)') : (lleno ? 'var(--surface)' : 'var(--surface2)'),
              border: `2px solid ${error ? 'var(--primary)' : lleno ? (oscuro ? 'rgba(255,255,255,.7)' : 'var(--text)') : (oscuro ? 'rgba(255,255,255,.16)' : 'var(--border)')}`,
              outline: 'none', transition: 'border-color .15s, background .15s, transform .15s',
              opacity: deshabilitado ? 0.6 : 1, caretColor: 'var(--primary)',
            }}
          />
        );
      })}
    </div>
  );
}
