'use client';

/**
 * CONFIRMAR ENTREGA
 * Conversión de `isProof` (línea 560) del mockup del Repartidor.
 *
 * El código son los 4 últimos dígitos del número de pedido, que el
 * cliente tiene a la vista en su seguimiento. Quien lo valida es la
 * base (`complete_delivery`), no esta pantalla: aunque alguien tocara
 * el código en el navegador, la entrega no se cierra sin el correcto.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import { completeDelivery } from '@/lib/repartidor';
import { useRider } from '../RiderContext';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'];

export default function EntregaPage() {
  const router = useRouter();
  const { active, loading, reloadActive, toast } = useRider();

  const [pin, setPin] = useState('');
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && !active) router.replace('/repartidor');
  }, [loading, active, router]);

  if (!active) {
    return (
      <div style={S.loading}>
        {loading ? 'Cargando…' : 'No tienes ninguna entrega en curso.'}
      </div>
    );
  }

  const press = (k) => {
    setError(null);
    if (k === 'del') { setPin((p) => p.slice(0, -1)); return; }
    if (k === 'clr') { setPin(''); return; }
    setPin((p) => (p.length >= 4 ? p : p + k));
  };

  const confirm = async () => {
    if (pin.length < 4) return;
    setBusy(true);
    setError(null);
    try {
      await completeDelivery(active.id, pin);
      await reloadActive();
      toast(`Entregado · ganaste ${cop(active.courier_earnings ?? 0)}`);
      router.replace('/repartidor');
    } catch (err) {
      setError(err.message);
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header style={S.header}>
        <button onClick={() => router.push('/repartidor/activo')} style={S.back} aria-label="Volver">
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
          Confirmar entrega
        </span>
      </header>

      <div className="sc" style={S.scroll}>
        <div style={S.customerCard}>
          <span style={S.customerIcon}>
            <span className="ms" style={{ fontSize: 23 }}>person</span>
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 15 }}>
              {active.customer?.full_name ?? 'Cliente'}
            </span>
            <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {active.delivery_address ?? ''}
            </span>
          </span>
          <span style={{ flex: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', color: 'var(--muted)' }}>
            #{active.order_number}
          </span>
        </div>

        <div style={{ fontWeight: 800, fontSize: 15.5, marginTop: 22 }}>Código del cliente</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
          Pídele los 4 últimos dígitos del número de su pedido. Los tiene en la
          pantalla de seguimiento.
        </div>

        <div style={{ display: 'flex', gap: 11, marginTop: 14 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...S.pinBox,
                ...(error
                  ? { background: '#FFF1EC', border: '2px solid var(--primary)', color: 'var(--primary)' }
                  : pin[i]
                    ? { background: 'var(--surface)', border: '2px solid var(--text)' }
                    : { background: 'var(--surface2)', border: '2px solid transparent', color: 'var(--faint)' }),
              }}
            >
              {pin[i] ?? ''}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, fontSize: 12.5, fontWeight: 700, color: 'var(--primary)' }}>
            <span className="ms" style={{ fontSize: 17 }}>error</span>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 18 }}>
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Borrar' : k === 'clr' ? 'Limpiar' : k}
              style={{
                ...S.key,
                ...(k === 'del' || k === 'clr'
                  ? { background: 'var(--surface2)', color: 'var(--muted)' }
                  : { background: 'var(--surface)', border: '1px solid var(--border)' }),
              }}
            >
              {k === 'del'
                ? <span className="ms" style={{ fontSize: 24 }}>backspace</span>
                : k === 'clr' ? 'C' : k}
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 800, fontSize: 15.5, marginTop: 24 }}>Foto de la entrega</div>
        <button
          onClick={() => { setPhoto((p) => !p); if (!photo) toast('Foto marcada'); }}
          style={{
            ...S.photo,
            ...(photo
              ? { background: '#E6F6EE', border: '1px solid #B7E4CD' }
              : { background: 'var(--surface)', border: '1px dashed var(--border)' }),
          }}
        >
          <span
            style={{
              ...S.photoIcon,
              ...(photo ? { background: '#0B8E54', color: '#fff' } : { background: 'var(--surface2)', color: 'var(--muted)' }),
            }}
          >
            <span className="ms" style={{ fontSize: 24 }}>{photo ? 'check' : 'photo_camera'}</span>
          </span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>
              {photo ? 'Foto marcada' : 'Tomar foto del pedido entregado'}
            </span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {photo ? 'Solo tú y soporte pueden verla' : 'Opcional, pero te protege ante reclamos'}
            </span>
          </span>
          <span className="ms" style={{ fontSize: 20, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
        </button>
      </div>

      <div style={S.footer}>
        <button
          onClick={confirm}
          disabled={pin.length < 4 || busy}
          style={{
            ...S.confirm,
            ...(pin.length < 4
              ? { background: 'var(--surface2)', color: 'var(--faint)' }
              : { background: 'var(--green)', color: '#fff', boxShadow: '0 10px 24px rgba(11,142,84,.28)' }),
          }}
        >
          <span className="ms" style={{ fontSize: 21 }}>check_circle</span>
          {busy ? 'Confirmando…' : pin.length < 4 ? 'Ingresa el código de 4 dígitos' : 'Confirmar entrega'}
        </button>
      </div>
    </>
  );
}

const S = {
  loading: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, fontSize: 13.5, color: 'var(--muted)', textAlign: 'center',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 12px',
  },
  back: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '6px 20px 24px', minHeight: 0 },
  customerCard: {
    display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadowSm)',
  },
  customerIcon: {
    width: 44, height: 44, borderRadius: '50%', background: '#E6F6EE', color: '#0B8E54',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  pinBox: {
    flex: 1, height: 62, borderRadius: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26,
  },
  key: {
    height: 56, borderRadius: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontWeight: 700, fontSize: 22,
  },
  photo: {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
    marginTop: 12, padding: 16, borderRadius: 18,
  },
  photoIcon: {
    width: 46, height: 46, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    flex: 'none', background: 'var(--surface)', borderTop: '1px solid var(--border)',
    padding: '14px 20px 20px',
  },
  confirm: {
    width: '100%', height: 56, borderRadius: 18, fontWeight: 700, fontSize: 15.5,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
};
