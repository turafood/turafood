'use client';

/**
 * ACTIVIDAD — pedidos activos y entregados, al estilo de Uber
 *
 *   · «En curso» arriba: tarjeta con el mapa del punto de entrega, estado y rastreo.
 *   · «Anteriores»: lista con miniatura del mapa, negocio, fecha · total, la dirección
 *     de entrega y «Volver a pedir».
 *
 * Todo sale de la capa de datos (`getOrders`); la miniatura se arma con el mosaico de
 * OpenStreetMap del punto de entrega (`delivery_location`), sin llamar a ninguna API.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getOrders } from '@/lib/data';
import { cop, ORDER_STATUS } from '@/lib/format';
import { Cover } from '../../components/Media';

const LIVE = ['pending', 'accepted', 'preparing', 'ready', 'courier_assigned', 'picked_up', 'delivering'];

/** `delivery_location` llega como GeoJSON o como EWKB en hexadecimal según la configuración de PostgREST */
function puntoDe(loc) {
  try {
    if (!loc) return null;
    if (typeof loc === 'object' && Array.isArray(loc.coordinates)) return { lng: loc.coordinates[0], lat: loc.coordinates[1] };
    if (typeof loc === 'string' && /^[0-9a-f]{42,50}$/i.test(loc)) {
      const buf = new DataView(new Uint8Array(loc.match(/../g).map((h) => parseInt(h, 16))).buffer);
      const hasSrid = (buf.getUint32(1, true) & 0x20000000) !== 0;
      const o = hasSrid ? 9 : 5;
      return { lng: buf.getFloat64(o, true), lat: buf.getFloat64(o + 8, true) };
    }
  } catch { /* sin coordenadas */ }
  return null;
}

/** Mosaico de OpenStreetMap que contiene el punto */
function mosaico({ lat, lng }, z = 16) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const r = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

const fechaCorta = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
  const hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dia} · ${hora}`;
};

function Miniatura({ o, size, radius = 14 }) {
  const p = puntoDe(o.delivery_location);
  const base = { width: size, height: size, borderRadius: radius, flex: 'none', position: 'relative', overflow: 'hidden', background: 'var(--surface2)' };
  if (p) {
    return (
      <div style={{ ...base, backgroundImage: `url(${mosaico(p)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden="true">
        <span style={{ position: 'absolute', left: '50%', top: '50%', width: 12, height: 12, margin: '-6px 0 0 -6px', borderRadius: '50%', background: '#111', border: '3px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,.4)' }} />
      </div>
    );
  }
  return (
    <Cover src={o.business?.cover_url} alt={o.business?.name ?? ''} radius={radius} sizes={`${size}px`} style={{ width: size, height: size, flex: 'none' }} />
  );
}

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

  const enCurso = orders.filter((o) => LIVE.includes(o.status));
  const anteriores = orders.filter((o) => !LIVE.includes(o.status));

  const volver = () => {
    if (typeof window !== 'undefined' && window.history.length > 1 && document.referrer.includes(window.location.host)) router.back();
    else router.push('/account');
  };

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--surface)', minHeight: 0 }}>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        <div style={{ flex: 'none', padding: '16px 20px 4px' }}>
          <button onClick={volver} style={S.back} aria-label="Volver"><span className="ms" style={{ fontSize: 22 }}>arrow_back</span></button>
          <h1 style={S.h1}>Actividad</h1>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '8px 0 108px', minHeight: 0 }}>
          {error && (
            <div style={S.errorBox}><span className="ms" style={{ fontSize: 18 }}>error</span><span>{error}</span></div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ height: 88, borderRadius: 16, background: 'var(--surface2)' }} />)}
            </div>
          )}

          {!loading && orders.length === 0 && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '56px 24px' }}>
              <span style={S.emptyIcon}><span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>receipt_long</span></span>
              <div style={{ fontWeight: 800, fontSize: 19, marginTop: 16 }}>Todavía no tienes pedidos</div>
              <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>Cuando hagas tu primer pedido, lo verás aquí.</div>
              <button onClick={() => router.push('/')} style={S.cta}>Ver sitios abiertos</button>
            </div>
          )}

          {enCurso.length > 0 && (
            <section>
              <h2 style={S.sec}>En curso</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
                {enCurso.map((o) => {
                  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
                  return (
                    <article key={o.id} style={S.card}>
                      <Miniatura o={o} size="100%" radius={0} />
                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="tr1" style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>{o.business?.name ?? 'Negocio'}</div>
                          <span style={S.estado}>{st.label}</span>
                        </div>
                        {o.delivery_address && <div className="tr1" style={S.dir}>{o.delivery_address}</div>}
                        <button onClick={() => router.push(`/tracking?order=${o.id}`)} style={S.negro}>
                          <span className="ms" style={{ fontSize: 19 }}>near_me</span> Rastrear pedido
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {anteriores.length > 0 && (
            <section>
              <h2 style={S.sec}>Anteriores</h2>
              <div>
                {anteriores.map((o) => {
                  const cancelado = ['cancelled', 'rejected'].includes(o.status);
                  return (
                    <article key={o.id} style={S.fila}>
                      <Miniatura o={o} size={72} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tr1" style={{ fontWeight: 800, fontSize: 16.5 }}>{o.business?.name ?? 'Negocio'}</div>
                        <div className="tr1" style={{ fontSize: 14, color: 'var(--muted)', marginTop: 3 }}>
                          {fechaCorta(o.created_at)} · {cop(o.total)}{cancelado ? ' · Cancelado' : ''}
                        </div>
                        {o.delivery_address && <div className="tr1" style={{ fontSize: 13, color: 'var(--faint)', marginTop: 2 }}>{o.delivery_address}</div>}
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={() => router.push(`/store/${o.business_id}`)} style={S.pildora}>
                            <span className="ms" style={{ fontSize: 17 }}>replay</span> Volver a pedir
                          </button>
                          {o.status === 'delivered' && (
                            <button onClick={() => router.push(`/rate?order=${o.id}`)} style={{ ...S.pildora, background: 'transparent', border: '1px solid var(--border)' }}>
                              <span className="ms" style={{ fontSize: 17 }}>star</span> Calificar
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  back: { width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', display: 'grid', placeItems: 'center' },
  h1: { margin: '14px 0 0', fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', color: 'var(--text)' },
  sec: { margin: '22px 20px 12px', fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  estado: { fontSize: 12, fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--text)', flex: 'none' },
  dir: { fontSize: 13.5, color: 'var(--muted)', marginTop: 4 },
  negro: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48,
    borderRadius: 12, background: 'var(--primary)', color: 'var(--onPrimary)', fontSize: 15, fontWeight: 800, marginTop: 14,
  },
  fila: { display: 'flex', gap: 14, padding: '14px 20px', borderTop: '1px solid var(--border)' },
  pildora: {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px',
    borderRadius: 999, background: 'var(--surface2)', fontSize: 14, fontWeight: 700, color: 'var(--text)',
  },
  emptyIcon: { width: 66, height: 66, borderRadius: '50%', background: 'var(--surface2)', display: 'grid', placeItems: 'center' },
  cta: { height: 48, padding: '0 26px', borderRadius: 999, background: 'var(--primary)', color: 'var(--onPrimary)', fontWeight: 800, fontSize: 15, marginTop: 18 },
  errorBox: { display: 'flex', alignItems: 'center', gap: 9, margin: '0 20px 14px', padding: '12px 14px', borderRadius: 14, background: '#FDECE8', color: '#9B2C16', fontSize: 13, fontWeight: 600 },
};
