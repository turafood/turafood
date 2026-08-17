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
    <div style={S.backdrop} role="dialog" aria-modal="true" aria-label="Buscar">
      <div style={S.panel}>

        <div style={S.header}>
          <button onClick={close} style={S.backBtn} aria-label="Cerrar buscador">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <div style={S.field}>
            <span className="ms" style={{ fontSize: 21, color: 'var(--muted)' }}>search</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca platos o restaurantes"
              aria-label="Buscar"
              style={S.input}
            />
            {hasQuery && (
              <button onClick={() => setQuery('')} aria-label="Limpiar">
                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>cancel</span>
              </button>
            )}
          </div>
        </div>

        <div className="sc" style={S.body}>
          {!hasQuery && (
            <>
              <div style={S.sectionTitle}>Sugerencias</div>
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
              <div style={S.sectionTitle}>Sitios</div>
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
              <div style={{ ...S.sectionTitle, marginTop: 20 }}>Platos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.products.map((p) => (
                  <button key={p.id} onClick={() => go(`/product/${p.id}`)} style={S.row}>
                    <Cover src={p.image_url} alt={p.name} radius={12} sizes="56px" style={{ width: 54, height: 54, flex: 'none' }} />
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 13, marginTop: 3 }}>{cop(p.price)}</span>
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
                Prueba con otra palabra.
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
    position: 'absolute', inset: 0, zIndex: 300,
    background: 'rgba(20,16,10,.28)', backdropFilter: 'blur(3px)',
    animation: 'fade .16s ease both',
  },
  panel: {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', animation: 'slideup .24s cubic-bezier(.32,.72,0,1) both',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
    padding: '56px 16px 12px',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  field: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: 48,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: '0 14px', minWidth: 0,
  },
  input: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none',
    background: 'none', fontSize: 14.5,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '4px 16px 28px', minHeight: 0,
  },
  sectionTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16,
    marginBottom: 10, marginTop: 6,
  },
  chip: {
    height: 36, padding: '0 14px', borderRadius: 999, background: 'var(--surface)',
    border: '1px solid var(--border)', fontSize: 13, fontWeight: 700,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: 10, boxShadow: 'var(--shadowSm)',
  },
};
