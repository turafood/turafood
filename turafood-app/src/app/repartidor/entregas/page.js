'use client';

/**
 * ENTREGAS
 * Conversión de `isHistory` (línea 662) del mockup del Repartidor.
 */

import { useEffect, useMemo, useState } from 'react';
import { cop, relativeTime } from '@/lib/format';
import { getDeliveries } from '@/lib/repartidor';
import { useRider } from '../RiderContext';

/** "Hoy", "Ayer" o "sabado 16 de agosto" — nadie lee una fecha ISO */
function dayLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const norm = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

export default function EntregasPage() {
  const { courier } = useRider();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courier) return undefined;
    let alive = true;
    (async () => {
      try {
        const data = await getDeliveries(courier.id, 100);
        if (alive) setRows(data);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [courier]);

  const q = norm(query.trim());
  const shown = rows.filter((d) => !q
    || norm(d.business?.name).includes(q)
    || norm(d.order_number).includes(q)
    || norm(d.delivery_address).includes(q));

  /**
   * Agrupadas por dia, con el total de cada uno.
   *
   * Una lista corrida de dos meses de entregas no se puede leer: para
   * saber cuanto se hizo el sabado habria que ir sumando de a una. El
   * encabezado del dia responde esa pregunta de una, que es la que
   * casi siempre trae a alguien a esta pantalla.
   */
  const grouped = useMemo(() => {
    const map = new Map();

    shown.forEach((d) => {
      const key = String(d.delivered_at ?? d.created_at).slice(0, 10);
      const g = map.get(key) ?? { key, date: new Date(d.delivered_at ?? d.created_at), items: [], total: 0, tips: 0 };
      g.items.push(d);
      g.total += Number(d.courier_earnings ?? 0);
      g.tips += Number(d.tip ?? 0);
      map.set(key, g);
    });

    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [shown]);

  return (
    <>
      <header style={S.header}>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
          Entregas
        </span>
        <div style={S.search}>
          <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tienda, dirección o número"
            style={S.input}
          />
          {query && (
            <button onClick={() => setQuery('')} style={S.clear} aria-label="Limpiar">
              <span className="ms" style={{ fontSize: 15, color: 'var(--muted)' }}>close</span>
            </button>
          )}
        </div>
      </header>

      <div className="sc" style={S.scroll}>
        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {grouped.map((g) => (
        <section key={g.key} style={{ marginBottom: 22 }}>
          <div style={S.dayHead}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.dayLabel}>{dayLabel(g.date)}</span>
              <span style={S.dayCount}>
                {g.items.length} {g.items.length === 1 ? 'entrega' : 'entregas'}
                {g.tips > 0 ? ` · ${cop(g.tips)} en propinas` : ''}
              </span>
            </span>
            <span style={S.dayTotal}>{cop(g.total)}</span>
          </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {g.items.map((d) => {
            const tip = Number(d.tip ?? 0);
            return (
              <article key={d.id} style={S.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      ...S.thumb,
                      backgroundImage: d.business?.cover_url ? `url('${d.business.cover_url}')` : 'none',
                      background: d.business?.cover_url ? undefined : 'var(--surface2)',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
                      {d.business?.name ?? 'Negocio'}
                    </span>
                    <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      #{d.order_number} · {relativeTime(d.delivered_at)}
                    </span>
                  </span>
                  <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, flex: 'none' }}>
                    {cop(d.courier_earnings ?? 0)}
                  </span>
                </div>

                <div style={S.meta}>
                  <span style={S.metaItem}>
                    <span className="ms" style={{ fontSize: 14 }}>receipt_long</span>
                    {cop(d.total)}
                  </span>
                  {tip > 0 && (
                    <span style={{ ...S.metaItem, color: '#0B7A48' }}>
                      <span className="ms" style={{ fontSize: 14 }}>volunteer_activism</span>
                      {cop(tip)}
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  <span className="tr1" style={{ ...S.metaItem, maxWidth: '55%' }}>
                    <span className="ms" style={{ fontSize: 14 }}>location_on</span>
                    {d.delivery_address ?? 'Buenaventura'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
        </section>
        ))}

        {!loading && shown.length === 0 && (
          <div style={S.empty}>
            <span style={S.emptyIcon}>
              <span className="ms" style={{ fontSize: 26, color: 'var(--faint)' }}>
                {rows.length ? 'search_off' : 'two_wheeler'}
              </span>
            </span>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>
              {rows.length ? 'Sin entregas que coincidan' : 'Todavía no tienes entregas'}
            </div>
            {!rows.length && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
                Conéctate desde Inicio y toma tu primer pedido.
              </div>
            )}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 4 }}>
              {/* Esqueleto con la forma de lo que viene: el salto de
                  "cargando" a "listo" se siente mucho menor si la caja
                  ya estaba donde va a quedar. */}
              <span className="sk" style={{ display: 'block', height: 92, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 92, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 92, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 92, borderRadius: 16 }} />
            </div>
        )}
      </div>
    </>
  );
}

const S = {
  dayHead: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '0 2px 10px',
  },
  dayLabel: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 15, letterSpacing: '-.01em', textTransform: 'capitalize',
  },
  dayCount: {
    display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2,
  },
  dayTotal: {
    flex: 'none', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16, letterSpacing: '-.02em',
  },
  header: { flex: 'none', padding: '18px 20px 10px' },
  search: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, height: 46,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: '0 13px',
  },
  input: { flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 16, minWidth: 0 },
  clear: {
    width: 22, height: 22, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '8px 20px 108px', minHeight: 0 },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 15, boxShadow: 'var(--shadowSm)',
  },
  thumb: {
    width: 42, height: 42, borderRadius: 12, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  meta: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 12,
    borderTop: '1px solid var(--border)', fontSize: 11.5, color: 'var(--muted)', fontWeight: 700,
  },
  metaItem: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '52px 20px', textAlign: 'center',
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 16, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
