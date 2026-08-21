'use client';

/**
 * OFERTAS
 * Conversión de `isOffers` (línea 1299) del mockup del cliente.
 *
 * Muestra los cupones vigentes y los sitios que tienen promoción activa.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBusinesses, getCoupons } from '@/lib/data';
import { cop, etaLabel, feeLabel } from '@/lib/format';
import { Cover } from '../components/Media';

/** Cómo se lee un cupón en la tarjeta */
function couponHeadline(c) {
  if (c.discount_type === 'percent') return `${c.discount_value}% OFF`;
  if (c.discount_type === 'fixed') return `${cop(c.discount_value)} OFF`;
  return 'ENVÍO GRATIS';
}

const CARD_BG = [
  'linear-gradient(135deg,#FF7A3D,#E2360F)',
  'linear-gradient(135deg,#2ECB84,#0B8E54)',
  'linear-gradient(135deg,#3A332A,#17140F)',
];

export default function OffersPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cps, biz] = await Promise.all([getCoupons(), getBusinesses()]);
        if (!alive) return;
        setCoupons(cps);
        setStores(biz.filter((s) => s.offer_label));
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, el código sigue visible
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>
        <div style={{ width: '100%', maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px 0 0' }}>

          <div style={{ flex: 'none', padding: '0 20px 10px' }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
              Ofertas
            </span>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              Cupones y promociones activas en Buenaventura
            </div>
          </div>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 108px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 132, borderRadius: 22, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {/* Cupones */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {coupons.map((c, i) => (
              <div key={c.code} style={{ ...S.couponCard, background: CARD_BG[i % CARD_BG.length] }}>
                <div style={S.bubble} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.9)' }}>
                    CUPÓN
                  </div>
                  <div style={S.couponHeadline}>{couponHeadline(c)}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 6, lineHeight: 1.4, maxWidth: 240 }}>
                    {c.description}
                  </div>
                  {c.min_order > 0 && (
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.65)', marginTop: 6 }}>
                      Pedido mínimo {cop(c.min_order)}
                    </div>
                  )}

                  <button onClick={() => copy(c.code)} style={S.copyBtn}>
                    <span className="ms" style={{ fontSize: 15 }}>
                      {copied === c.code ? 'check' : 'content_copy'}
                    </span>
                    {copied === c.code ? 'Copiado' : c.code}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sitios con promoción */}
          {stores.length > 0 && (
            <>
              <div style={{ ...S.sectionTitle, marginTop: 26 }}>Sitios con promoción</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stores.map((s) => (
                  <button key={s.id} onClick={() => router.push(`/store/${s.id}`)} style={S.storeRow}>
                    <Cover src={s.cover_url} alt={s.name} radius={14} sizes="80px" style={{ width: 74, height: 74, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="tr1" style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                      <div className="tr1" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.category}</div>
                      <span style={S.offerPill}>
                        <span className="ms" style={{ fontSize: 13 }}>sell</span>
                        {s.offer_label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                        <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                        {s.rating}
                        <span style={{ color: 'var(--faint)' }}>·</span>
                        {etaLabel(s.prep_time_min)}
                        <span style={{ color: 'var(--faint)' }}>·</span>
                        {feeLabel(s.delivery_fee)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  sectionTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginBottom: 12,
  },
  couponCard: {
    position: 'relative', overflow: 'hidden', borderRadius: 22, padding: 18, color: '#fff',
  },
  bubble: {
    position: 'absolute', right: -30, top: -30, width: 140, height: 140,
    borderRadius: '50%', background: 'rgba(255,255,255,.12)',
  },
  couponHeadline: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26,
    lineHeight: 1.08, marginTop: 7,
  },
  copyBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
    background: '#fff', color: 'var(--text)', fontWeight: 800, fontSize: 12,
    padding: '9px 14px', borderRadius: 999, letterSpacing: '.04em',
  },
  storeRow: {
    display: 'flex', gap: 12, alignItems: 'center', width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 11, textAlign: 'left', boxShadow: 'var(--shadowSm)',
  },
  offerPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6,
    background: 'var(--amber)', color: '#17140F',
    fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
