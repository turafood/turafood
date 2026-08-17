'use client';

/**
 * LISTADO POR VERTICAL
 * Conversión 1:1 de `isList` (línea 416) del mockup del cliente.
 *
 * Recibe la vertical por query (`/list?v=restaurant`). Los chips de
 * orden y filtro operan sobre los datos ya cargados, como en el mockup.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBusinesses } from '@/lib/data';
import { SORTS, FILTERS } from '@/lib/seed';
import { feeLabel, etaLabel, kmLabel } from '@/lib/format';
import { Cover } from '../components/Media';
import { useSearchOverlay } from '../components/SearchOverlay';

const VERTICAL_TITLE = {
  restaurant: 'Restaurantes',
  market: 'Mercado',
  pharmacy: 'Farmacia',
  liquor: 'Licores',
  store: 'Tiendas',
  turbo: 'Turbo',
  boat: 'Reservar Lancha',
  soat: 'SOAT',
};

/**
 * Tipos de cocina. Usan fotos circulares de platos reales en vez de
 * iconos planos: se ven mejor y no dependen de un set de iconos 3D que
 * no tenemos. `match` filtra por la categoría del negocio.
 */
const CUISINES = [
  { id: 'todos', label: 'Todos', img: null, icon: 'restaurant', bg: '#FFF1EC', fg: '#B32A0D' },
  { id: 'mar', label: 'Comida de mar', img: '/images/food-fork.jpg', match: /marisco|encocado|ceviche|pescado|mar/i },
  { id: 'asados', label: 'Asados', img: '/images/steak-ribeye.jpg', match: /asado|parrilla|carne|costilla/i },
  { id: 'rapida', label: 'Comida rápida', img: '/images/burger.jpg', match: /hamburguesa|alita|rápida|rapida|fritos/i },
  { id: 'criolla', label: 'Criolla', img: '/images/fried-steak.jpg', match: /criolla|picada|típic|tipic/i },
  { id: 'postres', label: 'Postres', img: '/images/steak-rustic.jpg', match: /postre|dulce|cocada/i },
];

export default function ListPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ListPage />
    </Suspense>
  );
}

function ListPage() {
  const router = useRouter();
  const params = useSearchParams();
  const vertical = params.get('v') ?? 'restaurant';

  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState('recommended');
  const [active, setActive] = useState([]);
  const [cuisine, setCuisine] = useState('todos');
  const openSearch = useSearchOverlay((s) => s.openSearch);

  const title = VERTICAL_TITLE[vertical] ?? 'Sitios';

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        // 'turbo' y 'soat' no son verticales de negocio en la base:
        // se resuelven como filtros sobre el catálogo general.
        const v = ['turbo', 'soat'].includes(vertical) ? undefined : vertical;
        const rows = await getBusinesses({ vertical: v });
        if (alive) setStores(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [vertical]);

  const shown = useMemo(() => {
    let rows = [...stores];

    if (vertical === 'turbo') rows = rows.filter((s) => s.prep_time_min < 30);

    // Tipo de cocina: se resuelve contra la categoría del negocio
    const picked = CUISINES.find((c) => c.id === cuisine);
    if (picked?.match) {
      rows = rows.filter((s) => picked.match.test(s.category ?? ''));
    }

    active.forEach((f) => {
      if (f === 'free_ship') rows = rows.filter((s) => Number(s.delivery_fee) === 0);
      if (f === 'turbo') rows = rows.filter((s) => s.prep_time_min < 30);
      if (f === 'rating45') rows = rows.filter((s) => Number(s.rating) >= 4.5);
      if (f === 'promo') rows = rows.filter((s) => Boolean(s.offer_label));
    });

    const by = {
      fastest: (a, b) => a.prep_time_min - b.prep_time_min,
      rating: (a, b) => b.rating - a.rating,
      cheapest: (a, b) => a.delivery_fee - b.delivery_fee,
      closest: (a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99),
      recommended: (a, b) => b.rating - a.rating,
    };
    return rows.sort(by[sort] ?? by.recommended);
  }, [stores, active, sort, vertical, cuisine]);

  const toggleFilter = (id) =>
    setActive((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // La reserva de lanchas todavía no está construida
  if (vertical === 'boat') {
    return (
      <>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>
          <Header title={title} onBack={() => router.back()} onSearch={openSearch} />
          <div style={S.soon}>
            <span style={S.soonIcon}>
              <span className="ms" style={{ fontSize: 34, color: 'var(--primary)' }}>directions_boat</span>
            </span>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, marginTop: 16 }}>
              Reserva tu lancha
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8, lineHeight: 1.55, maxWidth: 280 }}>
              Vas a poder elegir playa, escoger tu lancha, pagar y recibir tu
              ticket. Estamos armando esta parte.
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginTop: 26 }}>
              DESTINOS QUE VAMOS A CUBRIR
            </div>
            <div className="hs" style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: '100%' }}>
              {['Juanchaco', 'Ladrilleros', 'La Barra', 'Pianguita', 'La Bocana'].map((b) => (
                <span key={b} style={S.beachChip}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', background: 'var(--bg)', padding: '0 20px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
              <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
            </button>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>{title}</span>
          </div>

          <button onClick={openSearch} style={S.searchBtn}>
            <span className="ms" style={{ fontSize: 21, color: 'var(--muted)' }}>search</span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--faint)', fontWeight: 500, textAlign: 'left' }}>
              Buscar en {title}
            </span>
          </button>

          {/* Chips: orden + filtros */}
          <div className="hs" style={{ display: 'flex', gap: 8, margin: '12px -20px 0', padding: '0 20px' }}>
            {SORTS.map((s) => {
              const on = sort === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSort(s.id)}
                  style={{ ...S.chip, background: on ? 'var(--text)' : 'var(--surface)', color: on ? '#fff' : 'var(--text)', border: on ? 'none' : '1px solid var(--border)' }}
                >
                  <span className="ms" style={{ fontSize: 16 }}>{s.icon}</span>
                  {s.label}
                </button>
              );
            })}
            {FILTERS.map((f) => {
              const on = active.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  style={{ ...S.chip, background: on ? 'var(--primary)' : 'var(--surface)', color: on ? '#fff' : 'var(--text)', border: on ? 'none' : '1px solid var(--border)' }}
                >
                  <span className="ms" style={{ fontSize: 16 }}>{f.icon}</span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 108px', minHeight: 0 }}>

          {/* Tipos de cocina — fotos circulares de platos reales */}
          <div className="hs" style={{ display: 'flex', gap: 16, margin: '0 -20px 4px', padding: '0 20px 4px' }}>
            {CUISINES.map((c) => {
              const on = cuisine === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCuisine(c.id)}
                  style={{ flex: 'none', width: 74, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: 0 }}
                >
                  <span style={{ ...S.cuisineDot, border: on ? '2.5px solid var(--primary)' : '2.5px solid transparent' }}>
                    {c.img ? (
                      <Cover src={c.img} alt="" radius={999} sizes="60px" style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <span style={{ ...S.cuisineFallback, background: c.bg }}>
                        <span className="ms ms-fill" style={{ fontSize: 26, color: c.fg }}>{c.icon}</span>
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 11.5, fontWeight: on ? 800 : 700, textAlign: 'center', lineHeight: 1.2,
                    color: on ? 'var(--primary)' : 'var(--text)',
                  }}>
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
              {loading ? 'Cargando…' : `${shown.length} sitios abiertos cerca de ti`}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>
              {SORTS.find((s) => s.id === sort)?.label}
            </span>
          </div>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {loading
              ? [0, 1, 2].map((i) => <div key={i} style={{ height: 220, borderRadius: 20, background: 'var(--surface2)' }} />)
              : shown.map((s) => (
                <button key={s.id} onClick={() => router.push(`/store/${s.id}`)} style={S.card}>
                  <Cover src={s.cover_url} alt={s.name} sizes="(max-width:900px) 100vw, 400px" style={{ height: 146 }}>
                    {s.badge && (
                      <span style={S.badge}>
                        <span className="ms" style={{ fontSize: 14, color: 'var(--primary)' }}>bolt</span>
                        {s.badge}
                      </span>
                    )}
                    {s.offer_label && <span style={S.offer}>{s.offer_label}</span>}
                  </Cover>
                  <div style={{ padding: '12px 14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span className="tr1" style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 800, flex: 'none' }}>
                        <span className="ms ms-fill" style={{ fontSize: 15, color: 'var(--amber)' }}>star</span>
                        {s.rating}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{s.category}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                      <span>{etaLabel(s.prep_time_min)}</span>
                      <span style={{ color: 'var(--faint)' }}>·</span>
                      <span>{feeLabel(s.delivery_fee)}</span>
                      {s.distance_km != null && (
                        <>
                          <span style={{ color: 'var(--faint)' }}>·</span>
                          <span>{kmLabel(s.distance_km)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
          </div>

          {!loading && shown.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '52px 24px' }}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>filter_alt_off</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                Ningún sitio con esos filtros
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                Prueba quitando alguno para ver más opciones cerca de ti.
              </div>
              <button onClick={() => setActive([])} style={S.clearBtn}>Quitar filtros</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Header({ title, onBack, onSearch }) {
  return (
    <div style={{ flex: 'none', background: 'var(--bg)', padding: '0 20px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={S.backBtn} aria-label="Volver">
          <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
        </button>
        <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>{title}</span>
      </div>
      <button onClick={onSearch} style={S.searchBtn}>
        <span className="ms" style={{ fontSize: 21, color: 'var(--muted)' }}>search</span>
        <span style={{ flex: 1, fontSize: 14, color: 'var(--faint)', fontWeight: 500, textAlign: 'left' }}>
          Buscar en {title}
        </span>
      </button>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  searchBtn: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 12,
    height: 48, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: '0 14px', textAlign: 'left',
  },
  chip: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 5, height: 36,
    padding: '0 13px', borderRadius: 999, fontSize: 13, fontWeight: 700,
  },
  cuisineDot: {
    width: 62, height: 62, borderRadius: '50%', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: 'var(--shadowSm)', transition: 'border-color .18s ease',
  },
  cuisineFallback: {
    width: '100%', height: '100%', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    textAlign: 'left', padding: 0, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden',
    boxShadow: 'var(--shadowSm)', width: '100%',
  },
  badge: {
    position: 'absolute', left: 10, top: 10, display: 'flex', alignItems: 'center', gap: 5,
    background: 'var(--surface)', fontSize: 11, fontWeight: 800,
    padding: '5px 9px', borderRadius: 9, zIndex: 2,
  },
  offer: {
    position: 'absolute', left: 10, bottom: 10, background: 'var(--amber)',
    color: '#17140F', fontSize: 10.5, fontWeight: 800,
    padding: '4px 8px', borderRadius: 8, zIndex: 2,
  },
  emptyIcon: {
    width: 66, height: 66, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  clearBtn: {
    height: 44, padding: '0 22px', borderRadius: 999, background: 'var(--text)',
    color: '#fff', fontWeight: 700, fontSize: 13.5, marginTop: 18,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  soon: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', textAlign: 'center', padding: '24px 24px 120px',
  },
  soonIcon: {
    width: 78, height: 78, borderRadius: '50%', background: '#FFF1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  beachChip: {
    flex: 'none', height: 32, padding: '0 13px', borderRadius: 999,
    background: 'var(--surface)', border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center',
    whiteSpace: 'nowrap',
  },
};
