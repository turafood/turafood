'use client';

/**
 * FAVORITOS
 * Conversión de `isFav` (línea 1339) del mockup del cliente.
 *
 * Los favoritos se guardan en el navegador. Cuando exista la tabla
 * `favorites` en Supabase, solo cambia el origen de los datos; la
 * pantalla no se toca.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBusinesses, getFavorites, toggleFavorite } from '@/lib/data';
import { etaLabel, feeLabel } from '@/lib/format';
import { Cover } from '../components/Media';

export default function FavoritesPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Los favoritos salen de la base cuando hay sesión; si no, del navegador
  useEffect(() => {
    let alive = true;
    getFavorites()
      .then((ids) => { if (alive) setFavs(ids); })
      .catch(() => { if (alive) setFavs([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getBusinesses();
        if (alive) setStores(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const remove = async (id) => {
    setFavs((p) => p.filter((f) => f !== id));   // respuesta inmediata
    try {
      await toggleFavorite(id);
    } catch (err) {
      setError(err.message);
      setFavs((p) => [...p, id]);                // se revierte si falla
    }
  };

  const saved = stores.filter((s) => favs.includes(s.id));

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>
      <div style={{ width: '100%', maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px 0 0' }}>

          <div style={{ flex: 'none', padding: '0 20px 10px' }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
              Favoritos
            </span>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              {saved.length > 0
                ? `${saved.length} ${saved.length === 1 ? 'sitio guardado' : 'sitios guardados'}`
                : 'Los sitios que guardes aparecen aquí'}
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
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 100, borderRadius: 18, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {!loading && saved.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '52px 24px' }}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>favorite</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                Todavía no guardas nada
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>
                Toca el corazón en cualquier sitio del inicio y lo vas a encontrar acá.
              </div>
              <button onClick={() => router.push('/home')} style={S.cta}>Ver sitios abiertos</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {saved.map((s) => (
              <div key={s.id} style={S.row}>
                <button onClick={() => router.push(`/store/${s.id}`)} style={S.rowMain}>
                  <Cover src={s.cover_url} alt={s.name} radius={14} sizes="80px" style={{ width: 78, height: 78, flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tr1" style={{ fontWeight: 700, fontSize: 15, paddingRight: 26 }}>{s.name}</div>
                    <div className="tr1" style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.category}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text)' }}>
                        <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
                        {s.rating}
                      </span>
                      <span style={{ color: 'var(--faint)' }}>·</span>
                      <span>{etaLabel(s.prep_time_min)}</span>
                      <span style={{ color: 'var(--faint)' }}>·</span>
                      <span>{feeLabel(s.delivery_fee)}</span>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => remove(s.id)}
                  style={S.favBtn}
                  aria-label={`Quitar ${s.name} de favoritos`}
                >
                  <span className="ms ms-fill" style={{ fontSize: 19, color: 'var(--primary)' }}>favorite</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  row: {
    position: 'relative', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 18, padding: 11,
    boxShadow: 'var(--shadowSm)',
  },
  rowMain: {
    display: 'flex', gap: 12, alignItems: 'center',
    width: '100%', textAlign: 'left', background: 'none',
  },
  favBtn: {
    position: 'absolute', top: 12, right: 12, width: 30, height: 30,
    borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 2,
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
