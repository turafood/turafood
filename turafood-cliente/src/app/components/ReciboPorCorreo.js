'use client';

/**
 * "RECIBO POR CORREO": quien pidió sin cuenta deja su correo y, al entregarse
 * el pedido, le llega el detalle de lo que pidió (como Rappi o Uber).
 */

import { useEffect, useState } from 'react';
import { getRecibo, pedirRecibo } from '@/lib/recibo';

export default function ReciboPorCorreo({ orderId, compacto = false }) {
  const [recibo, setRecibo] = useState(undefined);   // undefined = cargando
  const [editando, setEditando] = useState(false);
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (!orderId) return undefined;
    let vivo = true;
    getRecibo(orderId).then((r) => { if (vivo) setRecibo(r); }).catch(() => { if (vivo) setRecibo(null); });
    return () => { vivo = false; };
  }, [orderId]);

  if (!orderId || recibo === undefined) return null;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setTrabajando(true);
    try {
      const r = await pedirRecibo(orderId, correo);
      if (!r?.ok) { setError(r?.mensaje ?? 'No se pudo guardar el correo.'); return; }
      setRecibo({ email: r.email, sent_at: r.enviado_ahora ? new Date().toISOString() : null });
      setEditando(false);
      setCorreo('');
    } catch (err) {
      setError(err.message);
    } finally {
      setTrabajando(false);
    }
  };

  const yaEnviado = Boolean(recibo?.sent_at);

  return (
    <section style={{ ...S.tarjeta, padding: compacto ? 14 : 18 }} aria-live="polite">
      {recibo && !editando ? (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ ...S.icono, background: 'var(--green)' }}>
            <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>mark_email_read</span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.titulo}>{yaEnviado ? 'Recibo enviado' : 'Te enviaremos el recibo'}</div>
            <div style={{ ...S.texto, overflowWrap: 'anywhere' }}>
              {yaEnviado ? `Lo mandamos a ${recibo.email}.` : `A ${recibo.email}, cuando llegue tu pedido.`}
            </div>
          </div>
          {!yaEnviado && <button onClick={() => { setEditando(true); setCorreo(recibo.email); }} style={S.enlace}>Cambiar</button>}
        </div>
      ) : (
        <form onSubmit={enviar}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={S.icono}><span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>receipt_long</span></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.titulo}>¿Quieres tu recibo por correo?</div>
              <div style={S.texto}>Te llega el detalle de lo que pediste cuando te entreguen.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="email" inputMode="email" autoComplete="email" required
              value={correo} onChange={(e) => setCorreo(e.target.value)}
              placeholder="tucorreo@gmail.com" aria-label="Tu correo"
              style={S.campo}
            />
            <button type="submit" disabled={trabajando || !correo.trim()} style={{ ...S.boton, opacity: trabajando || !correo.trim() ? 0.6 : 1 }}>
              {trabajando ? 'Guardando…' : 'Enviármelo'}
            </button>
          </div>
          {error && <div role="alert" style={S.error}>{error}</div>}
          {editando && <button type="button" onClick={() => { setEditando(false); setError(''); }} style={{ ...S.enlace, marginTop: 8 }}>Cancelar</button>}
        </form>
      )}
    </section>
  );
}

const S = {
  tarjeta: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, boxShadow: '0 4px 16px rgba(0,0,0,.04)' },
  icono: { width: 42, height: 42, borderRadius: 13, background: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 15, color: 'var(--text)' },
  texto: { fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 },
  campo: { flex: 1, minWidth: 0, height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 12px', fontSize: 15 },
  boton: { height: 44, padding: '0 16px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', flex: 'none' },
  enlace: { background: 'none', border: 'none', padding: 0, color: 'var(--primary)', fontWeight: 800, fontSize: 13, cursor: 'pointer', flex: 'none' },
  error: { marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' },
};
