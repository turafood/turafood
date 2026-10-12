'use client';

/**
 * ¿DÓNDE TE ENTREGAMOS? — RAPPI & UBER EATS STYLE
 *
 * Experiencia ultra profesional en dos vistas integradas:
 *   1. Vista 'search' (Estilo Rappi):
 *      - Hero Card GPS con radar en vivo (1 toque).
 *      - Buscador Spotlight con sugerencias en tiempo real.
 *      - Direcciones guardadas / recientes para elegir en 1 clic.
 *      - Chips de acceso rápido a barrios populares de Buenaventura.
 *      - Acceso directo a ubicar en el mapa.
 *   2. Vista 'map' (Estilo Uber Pinpoint):
 *      - Mapa interactivo sin marcas de agua (OpenStreetMap oficial).
 *      - Pin central interactivo con física de elevación (bounce) al arrastrar.
 *      - Badge flotante con dirección geocodificada en tiempo real.
 *      - Botón FAB flotante para re-centrar con GPS.
 *      - Apto/referencia y selector de etiquetas (Casa, Trabajo, Otro).
 *      - Botón de confirmación vibrante y directo.
 *
 * Sin saltos de pantalla (overflow locked en body, cero autoFocus forzado).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  searchAddress, reverseGeocode, puntoDeTexto, BUENAVENTURA_BARRIOS, MAP_BOUNDS,
  detectarUbicacionGPS,
} from '@/lib/geocoding';
import { CENTRO, enCobertura } from '@/lib/direcciones.mjs';

const ETIQUETAS = [
  { id: 'Casa', icon: 'home', label: 'Casa' },
  { id: 'Trabajo', icon: 'work', label: 'Trabajo' },
  { id: 'Otro', icon: 'location_on', label: 'Otro' },
];

const ICONO_ETIQUETA = { Casa: 'home', Trabajo: 'work', Otro: 'location_on' };

const BARRIOS_POPULARES = [
  { name: 'Centro', emoji: '🏖️', detail: 'Comuna 1 · Centro comercial' },
  { name: 'Bellavista', emoji: '🌴', detail: 'Comuna 7 · Zona residencial' },
  { name: 'Pueblo Nuevo', emoji: '🚢', detail: 'Comuna 1 · Muelle y Galería' },
  { name: 'Juan XXIII', emoji: '🛍️', detail: 'Comuna 6 · Zona residencial' },
  { name: 'El Jorge', emoji: '🏟️', detail: 'Comuna 4 · Av. Simón Bolívar' },
  { name: 'La Independencia', emoji: '🏙️', detail: 'Comuna 10 · Vía principal' },
  { name: 'San Luis', emoji: '🏘️', detail: 'Comuna 7 · Carrera 54' },
  { name: 'Nayita', emoji: '🌊', detail: 'Comuna 1 · Frente al malecón' },
];

export default function AddressSheet({ open, onClose, onSave, recientes = [], autoGps = false }) {
  // Pestaña activa: 'search' (Rappi) o 'map' (Uber)
  const [tab, setTab] = useState('search');
  const [texto, setTexto] = useState('');
  const [punto, setPunto] = useState(null);          // { lat, lng } | null
  const [exacta, setExacta] = useState(false);
  const [pinTocado, setPinTocado] = useState(false);
  const [barrio, setBarrio] = useState(null);
  const [sugs, setSugs] = useState([]);
  const [lista, setLista] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [sel, setSel] = useState(-1);
  const [detalle, setDetalle] = useState('');
  const [etiqueta, setEtiqueta] = useState('Casa');
  const [aviso, setAviso] = useState(null);          // { tipo: 'info'|'error', texto }
  const [guardando, setGuardando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const cuerpoRef = useRef(null);
  const editado = useRef(false);
  const silencioso = useRef(false);
  const usuarioMovio = useRef(false);
  const seq = useRef(0);
  const abortRef = useRef(null);

  // Bloquear el scroll del body mientras el modal está abierto para evitar saltos
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Reinicio al cerrar
  useEffect(() => {
    if (open) {
      if (cuerpoRef.current) {
        cuerpoRef.current.scrollTop = 0;
      }
      return;
    }
    setTab('search');
    setTexto(''); setPunto(null); setExacta(false); setPinTocado(false); setBarrio(null);
    setSugs([]); setLista(false); setDetalle(''); setEtiqueta('Casa'); setAviso(null);
    setIsDragging(false);
    editado.current = false;
  }, [open]);

  // Tecla Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, guardando, onClose]);

  // Inicializar Leaflet con OpenStreetMap oficial (100% libre de marcas de agua)
  useEffect(() => {
    if (!open) return undefined;
    let vivo = true;

    (async () => {
      const [{ default: L }] = await Promise.all([
        import('leaflet'),
        import('leaflet/dist/leaflet.css'),
      ]);
      if (!vivo || !mapEl.current || mapRef.current) return;

      const m = L.map(mapEl.current, {
        center: [CENTRO.lat, CENTRO.lng],
        zoom: 14,
        minZoom: 12,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        dragging: true,
        touchZoom: true,
      });

      // Mosaico OpenStreetMap Oficial (sin API key, sin marcas de agua)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(m);

      m.on('dragstart', () => {
        usuarioMovio.current = true;
        setIsDragging(true);
      });

      m.on('dragend', () => {
        setIsDragging(false);
      });

      m.on('moveend', () => {
        setIsDragging(false);
        if (silencioso.current) { silencioso.current = false; return; }
        if (!usuarioMovio.current) return;
        usuarioMovio.current = false;
        const c = m.getCenter();
        setPunto({ lat: c.lat, lng: c.lng });
        setPinTocado(true);
        setAviso(null);
        if (!enCobertura(c.lat, c.lng)) {
          setAviso({ tipo: 'error', texto: 'Ese punto queda fuera del perímetro de entrega en Buenaventura.' });
        } else {
          void reversaAlTexto(c.lat, c.lng);
        }
      });

      mapRef.current = m;
      setTimeout(() => m.invalidateSize(), 100);
      if (punto) {
        silencioso.current = true;
        m.setView([punto.lat, punto.lng], 17);
      }
      if (autoGps) {
        void usarGps();
      }
    })();

    return () => {
      vivo = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Al cambiar a la pestaña 'map', invalidar tamaño para renderizar perfectamente los tiles
  useEffect(() => {
    if (tab === 'map' && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 80);
    }
  }, [tab]);

  const volar = useCallback((lat, lng, zoom = 17) => {
    const m = mapRef.current;
    if (!m) return;
    silencioso.current = true;
    m.setView([lat, lng], zoom, { animate: true });
  }, []);

  const reversaAlTexto = useCallback(async (lat, lng) => {
    if (editado.current) return;
    const mi = ++seq.current;
    const r = await reverseGeocode(lat, lng);
    if (mi !== seq.current || editado.current) return;
    if (r) {
      setTexto(r.label);
      setBarrio(r.neighborhood ?? null);
      setExacta(true);
    }
  }, []);

  // Búsqueda en vivo (Photon)
  useEffect(() => {
    const q = texto.trim();
    if (!open || !lista || q.length < 2) { setSugs([]); return undefined; }

    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;
      setBuscando(true);
      try {
        const r = await searchAddress(q, ctl.signal);
        setSugs(r);
        setSel(-1);
      } catch (e) {
        if (e?.name !== 'AbortError') setSugs([]);
      } finally {
        if (abortRef.current === ctl) setBuscando(false);
      }
    }, 240);
    return () => clearTimeout(id);
  }, [texto, lista, open]);

  // Elegir sugerencia -> abre el mapa directamente para confirmar
  const elegir = (s) => {
    editado.current = false;
    abortRef.current?.abort();
    setTexto(s.label);
    setBarrio(s.neighborhood ?? null);
    setPunto({ lat: s.lat, lng: s.lng });
    setExacta(Boolean(s.exacta));
    setPinTocado(true);
    setSugs([]);
    setLista(false);
    setSel(-1);
    setAviso(null);
    setTab('map');
    volar(s.lat, s.lng, s.exacta ? 18 : 16);
  };

  // Elegir dirección reciente -> confirmación directa o precarga
  const elegirReciente = async (a) => {
    editado.current = false;
    setTexto(a.address);
    setBarrio(a.neighborhood ?? null);
    setPunto({ lat: a.lat, lng: a.lng });
    setExacta(true);
    setPinTocado(true);
    setDetalle(a.detail ?? '');
    if (ETIQUETAS.some((e) => e.id === a.label)) setEtiqueta(a.label);
    setSugs([]);
    setLista(false);
    setAviso(null);

    // Selección inmediata de 1 clic (Rappi style)
    try {
      await onSave({
        label: a.label || 'Casa',
        address: a.address,
        detail: a.detail || '',
        neighborhood: a.neighborhood,
        lat: a.lat,
        lng: a.lng,
      });
      onClose();
    } catch {
      setTab('map');
      volar(a.lat, a.lng, 18);
    }
  };

  // Elegir barrio popular de Buenaventura
  const elegirBarrio = (b) => {
    const data = BUENAVENTURA_BARRIOS.find((x) => x.name.toLowerCase() === b.name.toLowerCase());
    const lat = data?.lat ?? CENTRO.lat;
    const lng = data?.lng ?? CENTRO.lng;
    setTexto(`Barrio ${b.name}, Buenaventura`);
    setBarrio(b.name);
    setPunto({ lat, lng });
    setExacta(true);
    setPinTocado(true);
    setLista(false);
    setAviso(null);
    setTab('map');
    volar(lat, lng, 16);
  };

  const usarTexto = async () => {
    const q = texto.trim();
    if (q.length < 3) return;
    setLista(false);
    setBuscando(true);
    const r = await puntoDeTexto(q).catch(() => null);
    setBuscando(false);
    editado.current = true;
    if (!r) {
      setPunto(CENTRO);
      setExacta(false);
      setPinTocado(false);
      setTab('map');
      setAviso({ tipo: 'info', texto: 'Mueve el mapa hasta tu puerta para fijar las coordenadas exactas.' });
      volar(CENTRO.lat, CENTRO.lng, 15);
      return;
    }
    setBarrio(r.neighborhood ?? null);
    setPunto({ lat: r.lat, lng: r.lng });
    setExacta(!r.aproximado);
    setPinTocado(true);
    setTab('map');
    volar(r.lat, r.lng, r.aproximado ? 16 : 18);
  };

  // Hero 1-Tap GPS (Radar Satelital)
  const usarGps = async () => {
    setLocalizando(true);
    setAviso(null);
    try {
      const r = await detectarUbicacionGPS();
      setLocalizando(false);
      editado.current = false;
      setPunto({ lat: r.lat, lng: r.lng });
      setTexto(r.label);
      setBarrio(r.neighborhood ?? null);
      setExacta(true);
      setPinTocado(true);
      setLista(false);
      setTab('map');
      volar(r.lat, r.lng, 18);
      if (!enCobertura(r.lat, r.lng)) {
        setAviso({ tipo: 'error', texto: 'Parece que estás fuera del perímetro de entrega en Buenaventura.' });
      }
    } catch (err) {
      setLocalizando(false);
      setAviso({
        tipo: 'error',
        texto: err.message || 'No pudimos acceder a tu GPS. Elige tu barrio en la lista o busca tu calle.',
      });
    }
  };

  const alTeclear = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((i) => Math.min(i + 1, sugs.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (sel >= 0 && sugs[sel]) elegir(sugs[sel]);
      else if (sugs.length === 1) elegir(sugs[0]);
      else void usarTexto();
    }
  };

  const fuera = Boolean(punto) && !enCobertura(punto.lat, punto.lng);
  const listo = (texto.trim().length >= 3 || Boolean(barrio)) && Boolean(punto) && !fuera;

  const guardar = async () => {
    if (!listo || guardando) {
      setAviso({
        tipo: 'error',
        texto: !punto ? 'Ubica el punto de entrega en el mapa.'
          : fuera ? 'Ese punto queda fuera del perímetro de entrega en Buenaventura.'
            : 'Escribe tu dirección o confirma el punto en el mapa.',
      });
      return;
    }
    setGuardando(true);
    setAviso(null);
    try {
      await onSave({
        label: etiqueta,
        address: texto.trim(),
        detail: detalle.trim(),
        neighborhood: barrio,
        lat: punto.lat,
        lng: punto.lng,
      });
      onClose();
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message || 'No pudimos guardar la dirección. Inténtalo de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  const hayExacta = sugs.some((s) => s.exacta);

  if (!open || !mounted) return null;

  const modalEl = (
    <div style={S.fondo} onClick={() => !guardando && onClose()}>
      <div
        style={S.hoja}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="¿Dónde te entregamos?"
      >
        {/* Cabecera Estilo Rappi/Uber con Segmented Controls */}
        <div style={S.cabecera}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <div style={S.titulo}>¿Dónde te entregamos?</div>
              <div style={S.sub}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
                  Buenaventura activa · Entregas rápidas
                </span>
              </div>
            </div>
            <button onClick={onClose} style={S.cerrar} aria-label="Cerrar modal">
              <span className="ms" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>

          {/* Segmented Control de Pestañas (Rappi Buscar vs Uber Mapa) */}
          <div className="addr-segmented-control" style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setTab('search')}
              className={`addr-tab-item ${tab === 'search' ? 'active' : ''}`}
            >
              <span className="ms" style={{ fontSize: 18, color: tab === 'search' ? 'var(--primary)' : 'inherit' }}>
                search
              </span>
              <span>Buscar y Recientes</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('map')}
              className={`addr-tab-item ${tab === 'map' ? 'active' : ''}`}
            >
              <span className="ms" style={{ fontSize: 18, color: tab === 'map' ? 'var(--primary)' : 'inherit' }}>
                map
              </span>
              <span>Ubicar en Mapa</span>
              {punto && (
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)',
                  display: 'inline-block', marginLeft: 2,
                }} />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================
            TAB 1: BUSCADOR & RECIENTES (RAPPI SUPER-APP STYLE)
            ============================================================ */}
        <div
          ref={cuerpoRef}
          className="sc"
          style={{
            ...S.cuerpo,
            display: tab === 'search' ? 'block' : 'none',
          }}
        >
          {/* BOTÓN HERO 1-TAP GPS (RADAR EN VIVO) */}
          <button
            type="button"
            onClick={usarGps}
            disabled={localizando}
            className="addr-gps-hero-btn"
            style={{ marginBottom: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="gps-radar-wrap">
                {localizando && (
                  <>
                    <div className="gps-radar-wave" />
                    <div className="gps-radar-wave" />
                  </>
                )}
                <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--primary)' }}>
                  {localizando ? 'radar' : 'my_location'}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                  {localizando ? 'Detectando satélites en Buenaventura...' : 'Usar mi ubicación actual con GPS'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                  {localizando ? 'Conectando antena de alta precisión...' : 'Detección automática en 1 toque'}
                </div>
              </div>
            </div>
            <span className="ms" style={{ fontSize: 20, color: 'var(--primary)', flex: 'none' }}>
              {localizando ? 'progress_activity' : 'arrow_forward'}
            </span>
          </button>

          {/* BUSCADOR SPOTLIGHT */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ ...S.campo, borderColor: lista ? 'var(--primary)' : 'var(--border)' }}>
              <span className="ms" style={{ fontSize: 21, color: 'var(--primary)' }}>search</span>
              <input
                value={texto}
                role="combobox"
                aria-expanded={lista && sugs.length > 0}
                aria-autocomplete="list"
                aria-controls="dir-lista"
                autoComplete="street-address"
                enterKeyHint="search"
                placeholder="Escribe tu calle, carrera o barrio..."
                aria-label="Buscar dirección"
                onChange={(e) => {
                  editado.current = true;
                  setTexto(e.target.value);
                  setLista(true);
                  setPinTocado(false);
                }}
                onFocus={() => setLista(true)}
                onKeyDown={alTeclear}
                style={S.input}
              />
              {buscando && (
                <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', animation: 'spin 1s linear infinite' }}>
                  progress_activity
                </span>
              )}
              {texto && !buscando && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setTexto('');
                    setSugs([]);
                    editado.current = true;
                    setLista(true);
                    setPunto(null);
                    setExacta(false);
                    setPinTocado(false);
                    setAviso(null);
                  }}
                  aria-label="Borrar búsqueda"
                  style={S.borrar}
                >
                  <span className="ms" style={{ fontSize: 18 }}>cancel</span>
                </button>
              )}
            </div>

            {/* Dropdown de Sugerencias */}
            {lista && texto.trim().length >= 2 && (
              <div id="dir-lista" role="listbox" style={S.lista}>
                {sugs.map((s, i) => (
                  <button
                    key={s.id}
                    role="option"
                    aria-selected={i === sel}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => elegir(s)}
                    style={{ ...S.opcion, background: i === sel ? 'var(--surface2)' : 'transparent' }}
                  >
                    <span style={S.opcionIcono}>
                      <span className="ms" style={{ fontSize: 19, color: s.barrio ? 'var(--amber)' : 'var(--primary)' }}>
                        {s.barrio ? 'holiday_village' : 'location_on'}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 13.5 }}>{s.label}</span>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{s.detail}</span>
                    </span>
                    <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>north_east</span>
                  </button>
                ))}

                {texto.trim().length >= 3 && !hayExacta && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={usarTexto}
                    style={{ ...S.opcion, ...S.usarTexto }}
                  >
                    <span style={{ ...S.opcionIcono, background: 'var(--primary)' }}>
                      <span className="ms" style={{ fontSize: 19, color: '#fff' }}>edit_location</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>
                        Fijar en el mapa esta dirección
                      </span>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>
                        &quot;{texto.trim()}&quot;
                      </span>
                    </span>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>arrow_forward</span>
                  </button>
                )}

                {!buscando && sugs.length === 0 && texto.trim().length < 4 && (
                  <div style={S.vacio}>Escribe tu calle, avenida o barrio en Buenaventura...</div>
                )}
              </div>
            )}
          </div>

          {/* ACCIÓN DIRECTA: ELEGIR EN EL MAPA */}
          <button
            type="button"
            onClick={() => setTab('map')}
            className="addr-map-quick-card"
            style={{ marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,.06)',
              }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>map</span>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                  Elegir punto en el mapa interactivo
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  Mueve el pin directamente sobre el techo de tu casa o local
                </div>
              </div>
            </div>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>chevron_right</span>
          </button>

          {/* DIRECCIONES RECIENTES / GUARDADAS */}
          {recientes.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={S.rotulo}>Tus Direcciones Frecuentes (1 clic para elegir)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recientes.slice(0, 3).map((a) => (
                  <button
                    key={a.id || a.address}
                    type="button"
                    onClick={() => elegirReciente(a)}
                    className="addr-saved-item"
                  >
                    <span style={S.opcionIcono}>
                      <span className="ms" style={{ fontSize: 19, color: 'var(--primary)' }}>
                        {ICONO_ETIQUETA[a.label] ?? 'location_on'}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                          {a.label || 'Dirección'}
                        </span>
                        {a.neighborhood && (
                          <span style={{
                            fontSize: 10.5, fontWeight: 700, padding: '2px 7px',
                            borderRadius: 6, background: 'var(--surface2)', color: 'var(--muted)',
                          }}>
                            {a.neighborhood}
                          </span>
                        )}
                      </div>
                      <span className="tr1" style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                        {a.address} {a.detail ? `· ${a.detail}` : ''}
                      </span>
                    </span>
                    <span className="ms" style={{ fontSize: 18, color: 'var(--green)' }}>check_circle</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BARRIOS POPULARES DE BUENAVENTURA */}
          <div>
            <div style={S.rotulo}>Barrios Populares de Buenaventura</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {BARRIOS_POPULARES.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => elegirBarrio(b)}
                  className="addr-barrio-chip"
                >
                  <span style={{ fontSize: 14 }}>{b.emoji}</span>
                  <span>{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================
            TAB 2: MAPA INTERACTIVO (UBER PINPOINT STYLE)
            ============================================================ */}
        <div
          style={{
            ...S.cuerpoMapa,
            display: tab === 'map' ? 'flex' : 'none',
          }}
        >
          {/* Contenedor del Mapa con Pin Central Flotante */}
          <div style={S.mapaContainer}>
            <div ref={mapEl} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />

            {/* Badge Flotante Superior: Dirección Geocodificada en Vivo */}
            <div className="uber-map-badge">
              <span className="gps-live-dot" style={{ position: 'static', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 800, color: '#17140f',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {texto || 'Mueve el mapa para ubicar tu puerta'}
                </div>
                {barrio && (
                  <div style={{ fontSize: 11, color: '#666', marginTop: 1 }}>
                    Barrio {barrio} · Buenaventura
                  </div>
                )}
              </div>
            </div>

            {/* Pin Central con Animación Uber Bounce */}
            <div className={`uber-pin-marker ${isDragging ? 'dragging' : ''}`} aria-hidden="true">
              <div className="uber-pin-head">
                <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>
                  {etiqueta === 'Trabajo' ? 'work' : etiqueta === 'Otro' ? 'location_on' : 'home'}
                </span>
              </div>
              <div className="uber-pin-shadow" />
            </div>

            {/* Botón FAB Flotante para Re-centrar con GPS */}
            <button
              type="button"
              onClick={usarGps}
              disabled={localizando}
              className="uber-map-recenter-fab"
              title="Centrar en mi ubicación actual GPS"
              aria-label="Re-centrar GPS"
            >
              <span className="ms" style={{ fontSize: 22 }}>
                {localizando ? 'progress_activity' : 'my_location'}
              </span>
            </button>
          </div>

          {/* Panel Inferior de Ajustes y Confirmación */}
          <div style={S.panelAjustes}>
            {aviso && (
              <div role={aviso.tipo === 'error' ? 'alert' : 'status'} style={aviso.tipo === 'error' ? S.error : S.info}>
                <span className="ms" style={{ fontSize: 18 }}>{aviso.tipo === 'error' ? 'error' : 'info'}</span>
                <span style={{ flex: 1 }}>{aviso.texto}</span>
              </div>
            )}

            {/* Input Referencia / Apto */}
            <div style={{ marginTop: 10 }}>
              <label htmlFor="dir-detalle" style={S.rotuloCampo}>
                Apto, Torre, Portón o Referencia de entrega
              </label>
              <input
                id="dir-detalle"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                placeholder="Ej. Casa de 2 pisos portón blanco, apto 301, frente a la panadería"
                autoComplete="address-line2"
                style={S.detalle}
              />
            </div>

            {/* Selector de Etiquetas (Casa / Trabajo / Otro) */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {ETIQUETAS.map((l) => {
                const on = etiqueta === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setEtiqueta(l.id)}
                    aria-pressed={on}
                    style={{
                      ...S.etiqueta,
                      background: on ? 'var(--text)' : 'var(--surface2)',
                      color: on ? 'var(--bg)' : 'var(--text)',
                      border: on ? '1.5px solid var(--text)' : '1px solid var(--border)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>{l.icon}</span>
                    <span>{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================
            PIE DE PÁGINA: BOTÓN PRINCIPAL
            ============================================================ */}
        <div style={S.pie}>
          {tab === 'search' ? (
            <button
              type="button"
              onClick={() => {
                if (punto) setTab('map');
                else void usarGps();
              }}
              style={S.boton}
            >
              <span className="ms" style={{ fontSize: 20 }}>map</span>
              <span>{punto ? 'Continuar y Confirmar en el Mapa' : 'Ubicar en el Mapa'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={guardar}
              disabled={guardando || fuera}
              style={{
                ...S.boton,
                opacity: listo && !fuera ? 1 : 0.65,
                background: fuera ? 'var(--muted)' : 'linear-gradient(135deg, #FF441F, #E2360F)',
              }}
            >
              <span className="ms ms-fill" style={{ fontSize: 20 }}>
                {guardando ? 'progress_activity' : 'check_circle'}
              </span>
              <span>
                {guardando
                  ? 'Guardando dirección...'
                  : fuera
                    ? 'Punto fuera de cobertura'
                    : 'Confirmar y Entregar Aquí'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalEl, document.body);
}

const S = {
  fondo: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(15, 12, 8, 0.62)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    animation: 'fade .18s ease both',
  },
  hoja: {
    width: '100%',
    maxWidth: 500,
    maxHeight: 'calc(100dvh - 28px)',
    height: 'min(620px, calc(100dvh - 28px))',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg)',
    borderRadius: 24,
    boxShadow: '0 24px 64px rgba(0,0,0,.32)',
    animation: 'pop .22s cubic-bezier(.16, 1, 0.3, 1) both',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  cabecera: {
    flex: 'none',
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 18px 8px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  titulo: {
    fontFamily: 'var(--font-bricolage)',
    fontWeight: 800,
    fontSize: 19,
    letterSpacing: '-.02em',
    color: 'var(--text)',
  },
  sub: {
    fontSize: 12,
    color: 'var(--muted)',
    marginTop: 2,
    fontWeight: 600,
  },
  cerrar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease',
  },
  cuerpo: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    padding: '14px 18px',
  },
  cuerpoMapa: {
    flex: 1,
    minHeight: 0,
    flexDirection: 'column',
    overflowY: 'auto',
  },
  mapaContainer: {
    height: 230,
    minHeight: 200,
    flex: 'none',
    position: 'relative',
    background: 'var(--surface2)',
    overflow: 'hidden',
  },
  panelAjustes: {
    flex: 'none',
    padding: '10px 18px 12px',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
  },
  campo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    height: 50,
    background: 'var(--surface)',
    border: '1.5px solid var(--border)',
    borderRadius: 16,
    padding: '0 14px',
    transition: 'border-color .15s, box-shadow .15s',
  },
  input: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'none',
    fontSize: 15,
    color: 'var(--text)',
  },
  borrar: {
    flex: 'none',
    color: 'var(--muted)',
    display: 'flex',
    padding: 2,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  lista: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 56,
    zIndex: 700,
    maxHeight: 280,
    overflowY: 'auto',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    boxShadow: '0 16px 40px rgba(0,0,0,.22)',
    padding: 6,
  },
  opcion: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    padding: '9px 11px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text)',
    transition: 'background .15s',
  },
  usarTexto: {
    background: 'rgba(255,68,31,.06)',
    border: '1px solid rgba(255,68,31,.25)',
    marginTop: 4,
  },
  opcionIcono: {
    width: 36,
    height: 36,
    borderRadius: 11,
    background: 'var(--surface2)',
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: {
    padding: '12px 10px',
    fontSize: 12.5,
    color: 'var(--muted)',
    textAlign: 'center',
  },
  rotulo: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--muted)',
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rotuloCampo: {
    display: 'block',
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--muted)',
    letterSpacing: '.06em',
    textTransform: 'uppercase',
  },
  detalle: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    padding: '0 14px',
    fontSize: 14,
    color: 'var(--text)',
    outline: 'none',
  },
  etiqueta: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all .15s ease',
  },
  pie: {
    flex: 'none',
    padding: '12px 20px 16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  boton: {
    width: '100%',
    height: 50,
    borderRadius: 999,
    background: 'linear-gradient(135deg, #FF441F, #E2360F)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 15,
    boxShadow: '0 8px 24px rgba(255,68,31,.32)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'transform .15s ease, opacity .15s ease',
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    background: 'var(--amber-tint)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    background: 'var(--primary-tint)',
    color: 'var(--primary)',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 700,
  },
};
