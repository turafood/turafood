'use client';

/**
 * BUSCADOR GLOBAL
 *
 * Se abre encima de cualquier pantalla sin cambiar de ruta: el usuario
 * no pierde dónde estaba. Se controla con un store propio, así que
 * cualquier componente puede abrirlo con `openSearch()`.
 *
 * Atajos: Escape cierra, "/" abre desde teclado.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { create } from 'zustand';
import { search } from '@/lib/data';
import { cop, etaLabel, feeLabel } from '@/lib/format';
import { Cover } from './Media';

/** Store mínimo para abrir/cerrar desde cualquier parte */
export const useSearchOverlay = create((set) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
}));

const SUGGESTIONS = ['Encocado de jaiba', 'Hamburguesa', 'Picada', 'Ceviche', 'Limonada de coco'];

export default function SearchOverlay() {
  const router = useRouter();
  const open = useSearchOverlay((s) => s.open);
  const close = useSearchOverlay((s) => s.closeSearch);
  const openSearch = useSearchOverlay((s) => s.openSearch);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ businesses: [], products: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) close();
      if (e.key === '/' && !open && !/input|textarea/i.test(e.target.tagName)) {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, openSearch]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
    else { setQuery(''); setResults({ businesses: [], products: [] }); }
  }, [open]);

  // Búsqueda con debounce
  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults({ businesses: [], products: [] }); return; }

    let alive = true;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await search(term);
        if (alive) setResults(res);
      } catch {
        // El buscador no debe romper la pantalla de fondo
      } finally {
        if (alive) setLoading(false);
      }
    }, 200);

    return () => { alive = false; clearTimeout(id); };
  }, [query]);

  if (!open) return null;

  const go = (href) => { close(); router.push(href); };
  const hasQuery = query.trim().length > 0;
  const empty = hasQuery && !loading
    && results.businesses.length === 0 && results.products.length === 0;

  return (
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label="Buscar" onClick={close}>
      <div style={S.panel} onClick={(e) => e.stopPropagation()}>

        <div style={S.header}>
          <button onClick={close} style={S.backBtn} aria-label="Cerrar buscador">
            <span className="ms" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
          </button>
          <div style={S.field}>
            <span className="ms" style={{ fontSize: 21, color: 'var(--primary)' }}>search</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca platos o restaurantes en Buenaventura..."
              aria-label="Buscar"
              style={S.input}
            />
            {hasQuery && (
              <button onClick={() => setQuery('')} aria-label="Limpiar" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>cancel</span>
              </button>
            )}
          </div>
        </div>

        <div className="sc" style={S.body}>
          {!hasQuery && (
            <>
              <div style={S.sectionTitle}>Sugerencias Populares</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => setQuery(s)} style={S.chip}>{s}</button>
                ))}
              </div>
            </>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 70, borderRadius: 16, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {results.businesses.length > 0 && (
            <>
              <div style={S.sectionTitle}>Restaurantes y Tiendas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.businesses.map((s) => (
                  <button key={s.id} onClick={() => go(`/store/${s.id}`)} style={S.row}>
                    <Cover src={s.cover_url} alt={s.name} radius={12} sizes="56px" style={{ width: 54, height: 54, flex: 'none' }} />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{s.name}</span>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {etaLabel(s.prep_time_min)} · {feeLabel(s.delivery_fee)}
                      </span>
                    </span>
                    <span className="ms" style={{ fontSize: 19, color: 'var(--faint)' }}>chevron_right</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {results.products.length > 0 && (
            <>
              <div style={{ ...S.sectionTitle, marginTop: 20 }}>Platos y Menú</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.products.map((p) => (
                  <button key={p.id} onClick={() => go(`/product/${p.id}`)} style={S.row}>
                    <Cover src={p.image_url} alt={p.name} radius={12} sizes="56px" style={{ width: 54, height: 54, flex: 'none' }} />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 13, marginTop: 3, color: 'var(--primary)' }}>{cop(p.price)}</span>
                    </span>
                    <span className="ms" style={{ fontSize: 19, color: 'var(--faint)' }}>chevron_right</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {empty && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <span className="ms" style={{ fontSize: 30, color: 'var(--faint)' }}>search_off</span>
              <div style={{ fontWeight: 800, fontSize: 15, marginTop: 10 }}>Nada para &quot;{query}&quot;</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                Prueba con otra palabra o categoría.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '24px 16px',
    animation: 'fade .16s ease both',
  },
  panel: {
    width: '100%', maxWidth: 640, maxHeight: '88vh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--surface)', borderRadius: 24,
    border: '1px solid var(--border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    animation: 'slideup .24s cubic-bezier(.32,.72,0,1) both',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 16px 12px', borderBottom: '1px solid var(--border)',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--surface2)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flex: 'none', cursor: 'pointer', color: 'var(--text)',
  },
  field: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: 46,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '0 14px', minWidth: 0,
  },
  input: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none',
    background: 'none', fontSize: 14.5, color: 'var(--text)', fontWeight: 500,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0,
  },
  sectionTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 14.5,
    marginBottom: 10, marginTop: 6, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase',
  },
  chip: {
    height: 34, padding: '0 14px', borderRadius: 999, background: 'var(--surface2)',
    border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
    color: 'var(--text)', cursor: 'pointer', transition: 'all .15s ease',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 10, cursor: 'pointer', textAlign: 'left',
    transition: 'all .15s ease',
  },
};
