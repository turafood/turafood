'use client';

/**
 * MIS PEDIDOS
 * Conversión de `isOrders` (línea 1465) del mockup del cliente.
 *
 * Ya no es una lista fija: sale de la capa de datos. El pedido en curso
 * lleva a seguimiento; los cerrados ofrecen repetir.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrders } from '@/lib/data';
import { cop, relativeTime, ORDER_STATUS } from '@/lib/format';
import { Cover } from '../../components/Media';

const LIVE = ['pending', 'accepted', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'delivering'];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getOrders();
        if (alive) setOrders(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>Mis pedidos</span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 108px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 150, borderRadius: 20, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '52px 24px' }}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>receipt_long</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                Todavía no tienes pedidos
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                Cuando hagas tu primer pedido, aquí lo vas a ver.
              </div>
              <button onClick={() => router.push('/home')} style={S.cta}>Ver sitios abiertos</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {orders.map((o) => {
              const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
              const isLive = LIVE.includes(o.status);
              const count = (o.items ?? []).reduce((n, i) => n + i.quantity, 0);

              return (
                <article key={o.id} style={S.card}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Cover
                      src={o.business?.cover_url}
                      alt={o.business?.name ?? ''}
                      radius={13}
                      sizes="56px"
                      style={{ width: 54, height: 54, flex: 'none' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
                        PEDIDO #{o.order_number}
                      </div>
                      <div className="tr1" style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                        {o.business?.name ?? 'Negocio'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                        {relativeTime(o.created_at)}
                      </div>
                    </div>
                    <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>

                  <div style={S.divider} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--muted)', fontWeight: 600 }}>
                      {count} {count === 1 ? 'producto' : 'productos'}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{cop(o.total)}</span>
                  </div>

                  {isLive ? (
                    <button onClick={() => router.push(`/tracking?order=${o.id}`)} style={S.trackBtn}>
                      <span className="ms" style={{ fontSize: 18 }}>near_me</span>
                      Rastrear pedido
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
                      <button
                        onClick={() => router.push(`/store/${o.business_id}`)}
                        style={S.repeatBtn}
                      >
                        Volver a pedir
                      </button>
                      {o.status === 'delivered' && (
                        <button
                          onClick={() => router.push(`/rate?order=${o.id}`)}
                          style={S.rateBtn}
                        >
                          <span className="ms" style={{ fontSize: 17 }}>star</span>
                          Calificar
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 16, boxShadow: 'var(--shadowSm)',
  },
  divider: {
    borderTop: '1px dashed var(--border)', margin: '14px 0',
  },
  pill: {
    fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 8, flex: 'none',
  },
  trackBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 46, borderRadius: 13, background: 'var(--primary)',
    color: '#fff', fontSize: 14, fontWeight: 800, marginTop: 14,
  },
  repeatBtn: {
    flex: 1, height: 46, borderRadius: 13, background: 'var(--surface2)',
    fontSize: 14, fontWeight: 800,
  },
  rateBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: 13, border: '1px solid var(--border)',
    fontSize: 14, fontWeight: 800,
  },
  emptyIcon: {
    width: 66, height: 66, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cta: {
    height: 46, padding: '0 24px', borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 14, marginTop: 18,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
