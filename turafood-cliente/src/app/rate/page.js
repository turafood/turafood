'use client';

/**
 * CALIFICAR PEDIDO
 * Conversión 1:1 de `isRate` (línea 1158) del mockup del cliente.
 *
 * El botón de enviar queda inactivo hasta elegir estrellas, tal como
 * en el diseño ("Elige una calificación").
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { getOrder, submitReview } from '@/lib/data';
import { cop } from '@/lib/format';
import RouteSkeleton from '../components/RouteSkeleton';
import { useThemeStore } from '@/store/useThemeStore';

const TAGS = [
  'Comida caliente', 'Llegó rápido', 'Bien empacado',
  'Pedido completo', 'Buen trato', 'Precio justo',
];

const TIPS = [
  { label: 'No', value: 0 },
  { label: '$2.000', value: 2000 },
  { label: '$3.000', value: 3000 },
  { label: '$5.000', value: 5000 },
];

const STAR_LABEL = {
  1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: '¡Excelente!',
};

export default function RatePageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={3} />}>
      <RatePage />
    </Suspense>
  );
}

function RatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('order');

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const [order, setOrder] = useState(null);
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState([]);
  const [courierUp, setCourierUp] = useState(null);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getOrder(orderId);
        if (alive) setOrder(data);
      } catch {
        // Si no carga el pedido, igual se puede calificar
      }
    })();
    return () => { alive = false; };
  }, [orderId]);

  const toggleTag = (t) =>
    setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const handleSend = async () => {
    if (!stars || !order) return;
    setSubmitting(true);
    try {
      await submitReview({
        order_id: order.id,
        business_id: order.business_id,
        courier_id: order.courier?.id || null,
        stars,
        tags,
        courierUp,
        comment,
        tip,
      });
      setSent(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div style={S.done}>
        <div style={{ position: 'relative', width: 140, height: 140, marginBottom: 12 }}>
          <Image src="/images/ic-tiendas.png" alt="¡Listo!" fill style={{ objectFit: 'contain' }} unoptimized />
        </div>
        <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, marginTop: 18 }}>
          ¡Gracias por calificar!
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5, maxWidth: 320 }}>
          Tu opinión ayuda a premiar a los mejores restaurantes y repartidores de Buenaventura.
        </div>
        <button onClick={() => router.push('/home')} style={S.doneBtn}>Volver al inicio</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: '100vh', overflowY: 'auto' }}>
      
      {/* Contenedor Centrado Elegante */}
      <div style={{ width: '100%', maxWidth: 640, margin: '0 auto', padding: '16px 20px 48px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        
        {/* Barra Superior con Botón Volver y Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <button
            onClick={() => router.push('/home')}
            style={S.topBtn}
            aria-label="Cerrar"
            title="Volver al inicio"
          >
            <span className="ms" style={{ fontSize: 20 }}>arrow_back</span>
          </button>

          <button
            onClick={toggleTheme}
            style={S.topBtn}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label="Cambiar tema"
          >
            <span className="ms" style={{ fontSize: 20, color: theme === 'dark' ? '#FFB800' : 'var(--text)' }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        {/* Tarjeta Principal Centrada */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 28,
          border: '1px solid var(--border)',
          padding: '32px 28px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}>

          {/* Encabezado con Icono */}
          <div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 48, height: 48, flex: 'none' }}>
                <Image src="/images/ic-restaurantes.png" alt="Restaurante" fill style={{ objectFit: 'contain' }} unoptimized />
              </div>
              <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em', lineHeight: 1.2, margin: 0 }}>
                ¿Cómo estuvo tu pedido de {order?.business?.name ?? 'Burger House Bahia'}?
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.4 }}>
              Tu calificación es anónima y ayuda a mejorar el servicio en Buenaventura.
            </p>
          </div>

          {/* Estrellas */}
          <div style={{ background: 'var(--surface2)', borderRadius: 20, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <span
                    className={`ms ${n <= stars ? 'ms-fill' : ''}`}
                    style={{ fontSize: 44, color: n <= stars ? 'var(--amber)' : 'var(--faint)', transition: 'transform .15s ease, color .2s ease' }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 800, color: stars ? 'var(--green)' : 'var(--muted)' }}>
              {stars ? STAR_LABEL[stars] : 'Toca una estrella para calificar'}
            </div>
          </div>

          {/* Qué salió bien */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 10 }}>¿Qué salió bien?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleTag(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, height: 38,
                      padding: '0 14px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                      background: on ? 'var(--text)' : 'var(--surface2)',
                      color: on ? 'var(--surface)' : 'var(--text)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all .2s ease',
                    }}
                  >
                    {on && <span className="ms" style={{ fontSize: 15 }}>check</span>}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repartidor */}
          <div style={S.courierCard}>
            <div style={S.avatar}>
              <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>person</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' }}>
                TU REPARTIDOR OFICIAL
              </div>
              <div style={{ fontWeight: 800, fontSize: 14.5, marginTop: 2 }}>Yeison Mosquera</div>
            </div>
            <button
              onClick={() => setCourierUp(true)}
              style={{ ...S.thumb, background: courierUp === true ? 'var(--green)' : 'var(--surface2)', border: 'none', cursor: 'pointer' }}
              aria-label="Buen servicio del repartidor"
            >
              <span className="ms" style={{ fontSize: 19, color: courierUp === true ? '#fff' : 'var(--muted)' }}>thumb_up</span>
            </button>
            <button
              onClick={() => setCourierUp(false)}
              style={{ ...S.thumb, background: courierUp === false ? 'var(--primary)' : 'var(--surface2)', border: 'none', cursor: 'pointer' }}
              aria-label="Mal servicio del repartidor"
            >
              <span className="ms" style={{ fontSize: 19, color: courierUp === false ? '#fff' : 'var(--muted)' }}>thumb_down</span>
            </button>
          </div>

          {/* Propina extra */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 10 }}>Deja una propina voluntaria</div>
            <div style={{ display: 'flex', gap: 9 }}>
              {TIPS.map((t) => {
                const on = tip === t.value;
                return (
                  <button
                    key={t.label}
                    onClick={() => setTip(t.value)}
                    style={{
                      flex: 1, height: 44, borderRadius: 14, fontSize: 13.5, fontWeight: 800,
                      background: on ? 'var(--text)' : 'var(--surface2)',
                      color: on ? 'var(--surface)' : 'var(--text)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comentario */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos más de tu experiencia (opcional)..."
            rows={3}
            style={S.textarea}
            aria-label="Comentario"
          />

          {/* Botón Enviar */}
          <button
            onClick={handleSend}
            disabled={stars === 0 || submitting}
            style={{
              ...S.submitBtn,
              background: stars ? 'var(--primary)' : 'var(--surface2)',
              color: stars ? '#fff' : 'var(--faint)',
              boxShadow: stars ? '0 10px 24px rgba(255,68,31,.3)' : 'none',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Enviando...' : (stars ? `Enviar calificación${tip ? ` y propina de ${cop(tip)}` : ''}` : 'Elige una calificación')}
          </button>

          <button onClick={() => router.push('/home')} style={S.laterBtn}>Ahora no</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  topBtn: {
    width: 40, height: 40, borderRadius: 12, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadowSm)',
  },
  courierCard: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 22,
    background: 'var(--surface)', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
    borderRadius: 20, padding: 13,
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  thumb: {
    width: 38, height: 38, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  textarea: {
    width: '100%', marginTop: 18, padding: '13px 15px', borderRadius: 18,
    border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', background: 'var(--surface)',
    fontSize: 14, resize: 'vertical', outline: 'none',
  },
  submitBtn: {
    width: '100%', height: 56, borderRadius: 999, fontWeight: 800,
    fontSize: 15.5, marginTop: 18,
  },
  laterBtn: {
    width: '100%', height: 44, fontWeight: 700, fontSize: 13.5,
    color: 'var(--muted)', marginTop: 8,
  },
  done: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 32, textAlign: 'center', background: 'var(--bg)',
  },
  doneBtn: {
    marginTop: 24, height: 56, padding: '0 32px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 15.5,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
};
