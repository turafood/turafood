'use client';

/**
 * AGREGAR DIRECCIÓN
 *
 * Tres pasos que se sienten como uno:
 *   1. escribes y aparecen sugerencias reales (Photon / OpenStreetMap);
 *   2. eliges una y el mapa se centra ahí, con el pin arrastrable
 *      por si la fachada no coincide;
 *   3. le pones nombre y el detalle (torre, apartamento, referencia).
 *
 * Sin API key ni cuenta: Photon y los tiles de CARTO son gratuitos.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  searchAddress, reverseGeocode, BUENAVENTURA_CENTER, isInCoverage, MAP_BOUNDS,
} from '@/lib/geocoding';
import { cargarLeafletCss } from '@/lib/leafletCss';

const LABELS = [
  { id: 'Casa', icon: 'home' },
  { id: 'Trabajo', icon: 'work' },
  { id: 'Otro', icon: 'location_on' },
];

export default function AddressSheet({ open, onClose, onSave }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);

  const [label, setLabel] = useState('Casa');
  const [detail, setDetail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const [moving, setMoving] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const abortRef = useRef(null);
  // Evita que setView dispare el reverse-geocode del moveend
  const skipNextMove = useRef(false);

  // Reiniciar al abrir
  useEffect(() => {
    cargarLeafletCss();
    if (open) return;
    setQuery(''); setResults([]); setPicked(null);
    setDetail(''); setLabel('Casa'); setError(null);
  }, [open]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && open && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  // Búsqueda con debounce y cancelación de la petición anterior
  useEffect(() => {
    if (!open || query.trim().length < 3) {
      setResults([]);
      return undefined;
    }

    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      try {
        const found = await searchAddress(query, controller.signal);
        setResults(found);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => clearTimeout(id);
  }, [query, open]);

  /**
   * Monta el mapa con el patrón de pin centrado: el pin queda fijo en
   * el centro y el usuario mueve el mapa debajo. Es más preciso en
   * pantallas pequeñas que arrastrar un marcador con el dedo, y es lo
   * que usan las apps de reparto.
   */
  const placePin = useCallback((lat, lng) => {
    const L = window.L;
    if (!L || !mapEl.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current, {
        zoomControl: false,
        attributionControl: true,
        // El mapa no se sale de Buenaventura
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        minZoom: 12,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
      }).addTo(mapRef.current);

      // Al terminar de mover, resolvemos qué hay bajo el pin central
      mapRef.current.on('moveend', async () => {
        if (skipNextMove.current) { skipNextMove.current = false; return; }

        const c = mapRef.current.getCenter();
        setMoving(false);
        setPicked((prev) => (prev ? { ...prev, lat: c.lat, lng: c.lng } : prev));

        const found = await reverseGeocode(c.lat, c.lng);
        if (found) {
          setPicked((prev) => (prev ? {
            ...prev, label: found.label, detail: found.detail, lat: c.lat, lng: c.lng,
          } : prev));
        }
      });

      mapRef.current.on('movestart', () => setMoving(true));
    }

    const map = mapRef.current;
    skipNextMove.current = true;
    // Zoom 18: se ve la manzana y la fachada
    map.setView([lat, lng], 18);

    setTimeout(() => map.invalidateSize(), 60);
  }, []);

  const zoomBy = (delta) => {
    skipNextMove.current = true;
    mapRef.current?.setZoom((mapRef.current.getZoom() ?? 18) + delta);
  };

  /** Centra el mapa en la ubicación del GPS */
  const centerOnMe = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite ubicarte automáticamente.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInCoverage(coords.latitude, coords.longitude)) {
          setError('Parece que no estás en Buenaventura. Busca la dirección a mano.');
          return;
        }
        mapRef.current?.setView([coords.latitude, coords.longitude], 18);
      },
      () => {
        setLocating(false);
        setError('No pudimos obtener tu ubicación. Revisa los permisos del navegador.');
      },
      { enableHighAccuracy: true, timeout: 9000 },
    );
  };

  useEffect(() => {
    if (leafletReady && picked) placePin(picked.lat, picked.lng);
  }, [leafletReady, picked?.id, placePin]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite ubicarte automáticamente.');
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const found = await reverseGeocode(coords.latitude, coords.longitude);
        setPicked({
          id: `me-${Date.now()}`,
          label: found?.label ?? 'Mi ubicación actual',
          detail: found?.detail ?? '',
          lat: coords.latitude,
          lng: coords.longitude,
          inCoverage: isInCoverage(coords.latitude, coords.longitude),
        });
        setResults([]);
      },
      () => setError('No pudimos obtener tu ubicación. Búscala escribiendo la dirección.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        label,
        address: picked.label,
        detail: detail.trim(),
        neighborhood: picked.detail || null,
        lat: picked.lat,
        lng: picked.lng,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div style={S.backdrop} onClick={() => !saving && onClose()}>
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        onLoad={() => setLeafletReady(true)}
      />

      <div style={S.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Agregar dirección">

        <div style={S.header}>
          <button onClick={onClose} style={S.closeBtn} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20 }}>
            {picked ? 'Confirma tu dirección' : 'Agregar dirección'}
          </span>
        </div>

        {/* Paso 1: buscar */}
        {!picked && (
          <>
            <div style={{ padding: '14px 20px 0' }}>
              <div style={S.field}>
                <span className="ms" style={{ fontSize: 21, color: 'var(--muted)' }}>search</span>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ej. Carrera 3 # 4-58, Centro"
                  aria-label="Buscar dirección"
                  style={S.input}
                />
                {searching && (
                  <span className="ms" style={{ fontSize: 18, color: 'var(--faint)', animation: 'spin 1s linear infinite' }}>
                    progress_activity
                  </span>
                )}
              </div>

              <button onClick={useMyLocation} style={S.locateBtn}>
                <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>my_location</span>
                Usar mi ubicación actual
              </button>
            </div>

            <div className="sc" style={S.results}>
              {query.trim().length > 0 && query.trim().length < 3 && (
                <div style={S.hint}>Escribe al menos 3 letras.</div>
              )}

              {query.trim().length >= 3 && !searching && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '36px 20px' }}>
                  <span className="ms" style={{ fontSize: 30, color: 'var(--faint)' }}>location_off</span>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 10 }}>
                    No encontramos esa dirección
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45 }}>
                    Prueba con el nombre del barrio, o ubícala en el mapa con tu
                    ubicación actual.
                  </div>
                </div>
              )}

              {results.map((r) => (
                <button key={r.id} onClick={() => { setPicked(r); setResults([]); }} style={S.result}>
                  <span style={S.resultIcon}>
                    <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>location_on</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>
                      {r.label}
                    </span>
                    {r.detail && (
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                        {r.detail}
                      </span>
                    )}
                  </span>
                  {!r.inCoverage && <span style={S.farTag}>Fuera de cobertura</span>}
                </button>
              ))}

              {query.trim().length === 0 && (
                <div style={S.hint}>
                  Escribe tu dirección y te mostramos coincidencias reales de
                  Buenaventura mientras tecleas.
                </div>
              )}
            </div>
          </>
        )}

        {/* Paso 2: confirmar sobre el mapa */}
        {picked && (
          <>
            <div style={S.mapWrap}>
              <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />

              {/* Pin fijo en el centro: el usuario mueve el mapa debajo */}
              <div style={S.centerPin} aria-hidden="true">
                <span style={{ ...S.pinHead, transform: moving ? 'translateY(-6px)' : 'none' }}>
                  <span className="ms ms-fill" style={{ fontSize: 20, color: '#fff' }}>home</span>
                </span>
                <span style={{ ...S.pinShadow, opacity: moving ? .25 : .5 }} />
              </div>

              {/* Zoom */}
              <div style={S.zoomBox}>
                <button onClick={() => zoomBy(1)} style={S.zoomBtn} aria-label="Acercar">
                  <span className="ms" style={{ fontSize: 20 }}>add</span>
                </button>
                <span style={S.zoomDivider} />
                <button onClick={() => zoomBy(-1)} style={S.zoomBtn} aria-label="Alejar">
                  <span className="ms" style={{ fontSize: 20 }}>remove</span>
                </button>
              </div>

              {/* GPS */}
              <button onClick={centerOnMe} style={S.gpsBtn} aria-label="Centrar en mi ubicación">
                <span
                  className="ms"
                  style={{
                    fontSize: 21, color: 'var(--primary)',
                    animation: locating ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {locating ? 'progress_activity' : 'my_location'}
                </span>
              </button>

              <div style={S.mapHint}>
                <span className="ms" style={{ fontSize: 15 }}>drag_pan</span>
                {moving ? 'Suelta para ubicar aquí' : 'Mueve el mapa para ajustar el punto'}
              </div>
            </div>

            <div className="sc" style={S.form}>
              <div style={S.pickedCard}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)', flex: 'none' }}>location_on</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{picked.label}</span>
                  {picked.detail && (
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {picked.detail}
                    </span>
                  )}
                </span>
                <button onClick={() => setPicked(null)} style={S.changeBtn}>Cambiar</button>
              </div>

              {!picked.inCoverage && (
                <div style={S.warn}>
                  <span className="ms" style={{ fontSize: 17 }}>warning</span>
                  Esta dirección está fuera de Buenaventura. Puede que no haya
                  cobertura de domicilios.
                </div>
              )}

              <label style={S.label}>¿QUÉ LUGAR ES?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {LABELS.map((l) => {
                  const on = label === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLabel(l.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        height: 44, borderRadius: 13, fontSize: 13, fontWeight: 700,
                        background: on ? 'var(--text)' : 'var(--surface)',
                        color: on ? '#fff' : 'var(--text)',
                        border: on ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      <span className="ms" style={{ fontSize: 18 }}>{l.icon}</span>
                      {l.id}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="detalle" style={{ ...S.label, marginTop: 16 }}>
                TORRE, APARTAMENTO O REFERENCIA
              </label>
              <input
                id="detalle"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Ej. Torre B, apto 402. Portón negro."
                style={S.detailInput}
              />

              {error && (
                <div style={S.error}>
                  <span className="ms" style={{ fontSize: 17 }}>error</span>
                  {error}
                </div>
              )}
            </div>

            <div style={S.footer}>
              <button onClick={save} disabled={saving} style={S.saveBtn}>
                {saving ? 'Guardando…' : 'Guardar dirección'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'absolute', inset: 0, zIndex: 350,
    background: 'rgba(20,16,10,.46)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'flex-end',
    animation: 'fade .16s ease both',
  },
  sheet: {
    width: '100%', height: '92%', display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', borderRadius: '26px 26px 0 0',
    animation: 'slideup .28s cubic-bezier(.32,.72,0,1) both', overflow: 'hidden',
  },
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12,
    padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  field: {
    display: 'flex', alignItems: 'center', gap: 10, height: 50,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: '0 14px',
  },
  input: {
    flex: 1, minWidth: 0, border: 'none', outline: 'none',
    background: 'none', fontSize: 14.5,
  },
  locateBtn: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 10,
    height: 42, padding: '0 14px', borderRadius: 999,
    background: '#FFF1EC', color: 'var(--primary)', fontSize: 13, fontWeight: 800,
  },
  results: {
    flex: 1, overflowY: 'auto', padding: '12px 20px 20px',
    display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0,
  },
  result: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 12,
  },
  resultIcon: {
    width: 36, height: 36, borderRadius: 11, background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  farTag: {
    fontSize: 9.5, fontWeight: 800, color: 'var(--muted)',
    background: 'var(--surface2)', padding: '4px 7px', borderRadius: 6, flex: 'none',
  },
  hint: {
    fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5,
    padding: '20px 4px', textAlign: 'center',
  },
  mapWrap: {
    flex: 'none', position: 'relative', height: 260, background: 'var(--surface2)',
  },
  centerPin: {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -100%)', zIndex: 480,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    pointerEvents: 'none',
  },
  pinHead: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '3px solid #fff', boxShadow: '0 6px 16px rgba(255,68,31,.4)',
    transition: 'transform .18s cubic-bezier(.32,.72,0,1)',
  },
  pinShadow: {
    width: 10, height: 5, borderRadius: '50%', background: 'rgba(20,16,10,.5)',
    marginTop: 4, transition: 'opacity .18s ease',
  },
  zoomBox: {
    position: 'absolute', right: 12, top: 12, zIndex: 500,
    display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,.96)', borderRadius: 12,
    boxShadow: 'var(--shadowSm)', overflow: 'hidden',
  },
  zoomBtn: {
    width: 38, height: 38, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomDivider: {
    height: 1, background: 'var(--border)',
  },
  gpsBtn: {
    position: 'absolute', right: 12, bottom: 52, zIndex: 500,
    width: 42, height: 42, borderRadius: '50%',
    background: 'rgba(255,255,255,.96)', boxShadow: 'var(--shadowSm)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  mapHint: {
    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
    zIndex: 500, display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,.95)', borderRadius: 999,
    padding: '7px 13px', fontSize: 11.5, fontWeight: 700,
    boxShadow: 'var(--shadowSm)', whiteSpace: 'nowrap',
  },
  form: {
    flex: 1, overflowY: 'auto', padding: '16px 20px 8px', minHeight: 0,
  },
  pickedCard: {
    display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 15, padding: 13,
  },
  changeBtn: {
    flex: 'none', height: 32, padding: '0 12px', borderRadius: 999,
    background: 'var(--surface2)', fontSize: 12, fontWeight: 800,
  },
  warn: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
    background: '#FFF7E6', color: '#7A5405',
    padding: '11px 13px', borderRadius: 12, fontSize: 12, fontWeight: 600, lineHeight: 1.4,
  },
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.06em', marginBottom: 8,
  },
  detailInput: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 14px', fontSize: 14, outline: 'none',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
    background: '#FFF0ED', color: 'var(--primary)',
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 600,
  },
  footer: {
    flex: 'none', padding: '12px 20px 22px',
    borderTop: '1px solid var(--border)', background: 'var(--surface)',
  },
  saveBtn: {
    width: '100%', height: 54, borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 15,
    boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
};
