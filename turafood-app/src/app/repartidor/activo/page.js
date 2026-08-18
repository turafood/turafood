'use client';

/**
 * ENTREGA EN CURSO
 * Conversión de `isActive` (línea 448) del mockup del Repartidor:
 * mapa arriba, hoja con los tres pasos y deslizador para confirmar.
 *
 * Cada paso escribe en la base por RPC. El último no cierra la entrega:
 * lleva a la pantalla de confirmación, donde hay que poner el código
 * del cliente.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import { STEPS, stepIndex, advanceDelivery } from '@/lib/repartidor';
import TuraMap from '../../components/TuraMap';
import { useRider } from '../RiderContext';

const PAY_LABEL = {
  cash: 'Efectivo · cobrar al entregar',
  nequi: 'Nequi · ya pagado',
  daviplata: 'Daviplata · ya pagado',
  card: 'Tarjeta · ya pagado',
};

export default function ActivoPage() {
  const router = useRouter();
  const { active, loading, reloadActive, toast } = useRider();

  const [slideX, setSlideX] = useState(0);
  const [sliding, setSliding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);

  const trackRef = useRef(null);
  const rectRef = useRef(null);
  const startRef = useRef(0);

  // Nuestra posición, para pintarnos en el mapa
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;
    const watch = navigator.geolocation.watchPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, []);

  useEffect(() => {
    if (!loading && !active) router.replace('/repartidor');
  }, [loading, active, router]);

  if (!active) {
    return (
      <div style={S.loading}>
        {loading ? 'Cargando tu entrega…' : 'No tienes ninguna entrega en curso.'}
      </div>
    );
  }

  const idx = stepIndex(active.status);
  const step = STEPS[idx];

  const down = (e) => {
    if (!trackRef.current) return;
    rectRef.current = trackRef.current.getBoundingClientRect();
    startRef.current = e.clientX - slideX;
    setSliding(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura, igual funciona */ }
  };

  const move = (e) => {
    if (!sliding || !rectRef.current) return;
    const max = rectRef.current.width - 58;
    setSlideX(Math.max(0, Math.min(max, e.clientX - startRef.current)));
  };

  const up = async () => {
    if (!sliding) return;
    const max = rectRef.current ? rectRef.current.width - 58 : 1;
    const done = slideX >= max * 0.78;
    setSliding(false);
    setSlideX(0);
    if (done) await advance();
  };

  const advance = async () => {
    setError(null);
    // Último paso: la entrega se cierra con el código del cliente
    if (idx >= STEPS.length - 1) {
      router.push('/repartidor/entrega');
      return;
    }
    setBusy(true);
    try {
      await advanceDelivery(active.id, STEPS[idx + 1].status);
      await reloadActive();
      toast(step.btn);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Antes de recoger vamos al negocio; después, donde el cliente
  const goingToStore = idx < 2;
  const target = goingToStore ? active.business : { address: active.delivery_address };

  const points = [];
  if (me) points.push({ lat: me.lat, lng: me.lng, color: '#FF441F', badge: '', label: 'Tú' });

  return (
    <>
      <div style={{ position: 'relative', flex: 'none', height: 250 }}>
        <TuraMap points={points} height={250} radius={0} />
        <button onClick={() => router.push('/repartidor')} style={S.back} aria-label="Volver">
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <div style={S.orderPill}>
          <span className="ms" style={{ fontSize: 17, color: 'var(--primary)' }}>near_me</span>
          #{active.order_number}
        </div>
      </div>

      <div className="sc" style={S.sheet}>
        <div style={S.grabber} />

        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 5, borderRadius: 99,
                background: i <= idx ? 'var(--primary)' : 'var(--surface2)',
              }}
            />
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.05em', marginTop: 16 }}>
          {step.tag}
        </div>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 25, letterSpacing: '-.02em', marginTop: 5 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}>
          {goingToStore
            ? `${active.business?.name ?? 'Negocio'} · ${active.business?.address ?? ''}`
            : `${active.customer?.full_name ?? 'Cliente'} · ${active.delivery_address ?? ''}`}
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target.address ?? 'Buenaventura')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={S.actionBtn}
          >
            <span className="ms" style={{ fontSize: 19 }}>navigation</span>
            Navegar
          </a>
          <a
            href={`tel:${goingToStore ? (active.business?.phone ?? '') : (active.customer?.phone ?? '')}`}
            style={S.actionBtn}
          >
            <span className="ms" style={{ fontSize: 19 }}>call</span>
            Llamar
          </a>
          <button onClick={() => router.push('/repartidor/chat')} style={S.chatBtn} aria-label="Abrir chat">
            <span className="ms" style={{ fontSize: 19 }}>chat_bubble</span>
          </button>
        </div>

        {/* Detalle del pedido */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14.5 }}>Pedido #{active.order_number}</span>
            <span style={S.count}>
              {(active.items ?? []).reduce((a, i) => a + (i.quantity ?? 1), 0)} productos
            </span>
          </div>
          <div style={S.lines}>
            {(active.items ?? []).map((l) => (
              <div key={l.id ?? l.name} style={{ display: 'flex', gap: 9, fontSize: 13 }}>
                <span style={{ fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>{l.quantity}×</span>
                <span style={{ flex: 1, lineHeight: 1.35 }}>{l.name}</span>
              </div>
            ))}
          </div>
          <div style={S.totalRow}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>
              {PAY_LABEL[active.payment_method] ?? '—'}
            </span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{cop(active.total)}</span>
          </div>

          {active.payment_method === 'cash' && (
            <div style={S.cashNote}>
              <span className="ms" style={{ fontSize: 18, color: '#A8730B', flex: 'none' }}>payments</span>
              <span style={{ fontSize: 12, lineHeight: 1.45, color: '#7A5405' }}>
                Cobra {cop(active.total)} en efectivo al entregar. Lleva cambio.
              </span>
            </div>
          )}

          {active.delivery_instructions && (
            <div style={S.noteBox}>
              <span className="ms" style={{ fontSize: 15, color: '#A8730B', flex: 'none' }}>sticky_note_2</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.4, color: '#7A5405' }}>
                {active.delivery_instructions}
              </span>
            </div>
          )}
        </div>

        {/* Ganancia */}
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Tu ganancia por este pedido</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
            <EarnRow
              label="Tarifa base"
              value={cop(Number(active.courier_earnings ?? 0) - Number(active.tip ?? 0))}
            />
            <EarnRow label="Propina del cliente" value={cop(active.tip ?? 0)} />
            <div style={S.earnTotal}>
              <span>Total</span>
              <span>{cop(active.courier_earnings ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deslizador */}
      <div style={S.slideBar}>
        <div ref={trackRef} style={S.slideTrack}>
          <div
            style={{
              ...S.slideFill,
              width: slideX + 58,
              transition: sliding ? 'none' : 'width .24s cubic-bezier(.32,.72,0,1)',
            }}
          />
          <div style={{ ...S.slideLabel, color: slideX > 40 ? 'var(--muted)' : 'var(--text)' }}>
            <span className="ms" style={{ fontSize: 20 }}>{step.icon}</span>
            {busy ? 'Guardando…' : step.btn}
          </div>
          <div
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            style={{
              ...S.slideKnob,
              transform: `translateX(${slideX}px)`,
              transition: sliding ? 'none' : 'transform .24s cubic-bezier(.32,.72,0,1)',
            }}
          >
            <span className="ms" style={{ fontSize: 24, color: '#fff' }}>chevron_right</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.03em', marginTop: 9 }}>
          DESLIZA PARA CONFIRMAR
        </div>
      </div>
    </>
  );
}

function EarnRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const S = {
  loading: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 40, fontSize: 13.5, color: 'var(--muted)', textAlign: 'center',
  },
  back: {
    position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%',
    background: 'color-mix(in srgb, var(--surface) 95%, transparent)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', boxShadow: 'var(--shadowSm)', zIndex: 500,
  },
  orderPill: {
    position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 7,
    height: 38, padding: '0 14px', borderRadius: 999,
    background: 'color-mix(in srgb, var(--surface) 95%, transparent)',
    boxShadow: 'var(--shadowSm)', fontSize: 12.5, fontWeight: 800, zIndex: 500,
  },
  sheet: {
    flex: 1, overflowY: 'auto', background: 'var(--bg)', borderRadius: '28px 28px 0 0',
    marginTop: -24, position: 'relative', padding: '18px 20px 130px', minHeight: 0,
  },
  grabber: {
    width: 42, height: 4, borderRadius: 99, background: 'var(--faint)', margin: '0 auto 16px',
  },
  actionBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 15, background: 'var(--surface)', border: '1px solid var(--border)',
    fontWeight: 700, fontSize: 13.5, color: 'var(--text)', textDecoration: 'none',
  },
  chatBtn: {
    flex: 'none', width: 48, height: 48, borderRadius: 15, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 16, marginTop: 16, boxShadow: 'var(--shadowSm)',
  },
  count: {
    fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8,
    background: 'var(--surface2)', color: 'var(--muted)', flex: 'none',
  },
  lines: {
    display: 'flex', flexDirection: 'column', gap: 7, marginTop: 12,
    paddingTop: 12, borderTop: '1px solid var(--border)',
  },
  totalRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)',
  },
  cashNote: {
    display: 'flex', gap: 9, marginTop: 12, background: '#FFF7E6', borderRadius: 12, padding: 11,
  },
  noteBox: {
    display: 'flex', gap: 7, marginTop: 10, background: '#FFF7E6', borderRadius: 10, padding: '9px 10px',
  },
  earnTotal: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontWeight: 800, fontSize: 14.5, paddingTop: 9, borderTop: '1px solid var(--border)',
  },
  slideBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 60,
    background: 'var(--surface)', borderTop: '1px solid var(--border)',
    padding: '14px 20px 18px',
  },
  slideTrack: {
    position: 'relative', height: 58, borderRadius: 20, background: 'var(--surface2)',
    overflow: 'hidden', touchAction: 'none', userSelect: 'none',
  },
  slideFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 20, background: '#FDDCD2',
  },
  slideLabel: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 9, fontWeight: 700, fontSize: 15,
    pointerEvents: 'none', paddingLeft: 36,
  },
  slideKnob: {
    position: 'absolute', top: 5, left: 5, width: 48, height: 48, borderRadius: 16,
    background: 'var(--primary)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', boxShadow: '0 6px 18px rgba(255,68,31,.42)',
    cursor: 'grab', touchAction: 'none',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
