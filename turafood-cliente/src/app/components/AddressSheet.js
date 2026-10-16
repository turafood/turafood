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

const POPULARES = ['Centro', 'Bellavista', 'Pueblo Nuevo', 'Juan XXIII', 'El Jorge', 'La Independencia', 'San Luis', 'Nayita'];

/** Fila de lista al estilo Uber: icono en círculo gris, título, subtítulo y línea fina */
function Fila({ icono, titulo, sub, onClick, activo = false, acento = false, derecha }) {
  return (
    <button type="button" className="as-fila" data-activo={activo} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <span className={`as-fila-ico ${acento ? 'acento' : ''}`}><span className="ms" style={{ fontSize: 21 }}>{icono}</span></span>
      <span className="as-fila-txt">
        <span className="as-fila-t">{titulo}</span>
        {sub && <span className="as-fila-s">{sub}</span>}
      </span>
      {derecha}
    </button>
  );
}

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
  const [verTodos, setVerTodos] = useState(false);

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
    setIsDragging(false); setVerTodos(false);
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
        zoom: 13,
        minZoom: 11,
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

      // Toda la ciudad a la vista y cada barrio rotulado (se ocultan al acercar para no tapar las calles)
      if (!punto) m.fitBounds(MAP_BOUNDS, { animate: false });
      const rotulos = L.layerGroup(BUENAVENTURA_BARRIOS.map((br) => L.marker([br.lat, br.lng], {
        interactive: false, keyboard: false,
        icon: L.divIcon({ className: 'as-barrio-label', html: '<span>' + br.name + '</span>', iconSize: [0, 0] }),
      })));
      const pintarRotulos = () => {
        const z = m.getZoom();
        if (z >= 13 && z <= 16) { if (!m.hasLayer(rotulos)) rotulos.addTo(m); } else m.removeLayer(rotulos);
      };
      m.on('zoomend', pintarRotulos);
      pintarRotulos();

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
  const consulta = texto.trim().length >= 2 && lista;
  const populares = POPULARES.map((n) => BUENAVENTURA_BARRIOS.find((b) => b.name === n)).filter(Boolean);
  const todos = useMemo(
    () => [...BUENAVENTURA_BARRIOS].sort((x, y) => x.name.localeCompare(y.name, 'es')),
    [],
  );
  const barriosVisibles = verTodos ? todos : populares;

  if (!open || !mounted) return null;

  const modalEl = (
    <div className="as-fondo" onClick={() => !guardando && onClose()}>
      <style>{CSS}</style>
      <div className="as-hoja" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="¿Dónde te entregamos?">

        {/* ============ LISTA: planear la entrega ============ */}
        <div className="as-vista" style={{ display: tab === 'search' ? 'flex' : 'none' }}>
          <header className="as-top">
            <button type="button" className="as-circulo" onClick={onClose} aria-label="Cerrar"><span className="ms">arrow_back</span></button>
            <h2 className="as-h">¿Dónde te entregamos?</h2>
          </header>

          <div className="as-ruta">
            <div className="as-riel" aria-hidden="true"><i className="d" /><i className="l" /><i className="c" /></div>
            <div className="as-ruta-filas">
              <div className="as-ruta-fila">
                <span className="as-ruta-r">Ciudad</span>
                <span className="as-ruta-v">Buenaventura, Valle del Cauca</span>
              </div>
              <div className="as-ruta-fila">
                <label className="as-ruta-r" htmlFor="as-q">Dirección de entrega</label>
                <div className="as-ruta-in">
                  <input
                    id="as-q" value={texto} role="combobox" aria-expanded={consulta && sugs.length > 0} aria-autocomplete="list"
                    aria-controls="dir-lista" autoComplete="street-address" enterKeyHint="search"
                    placeholder="Calle 5 # 3-12, carrera o barrio"
                    onChange={(e) => { editado.current = true; setTexto(e.target.value); setLista(true); setPinTocado(false); }}
                    onFocus={() => setLista(true)} onKeyDown={alTeclear}
                  />
                  {buscando && <span className="ms as-spin" style={{ fontSize: 18 }}>progress_activity</span>}
                  {texto && !buscando && (
                    <button type="button" className="as-x" aria-label="Borrar" onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setTexto(''); setSugs([]); editado.current = true; setLista(true); setPunto(null); setExacta(false); setPinTocado(false); setAviso(null); }}>
                      <span className="ms" style={{ fontSize: 18 }}>close</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {aviso && tab === 'search' && (
            <div className={`as-aviso ${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
              <span className="ms" style={{ fontSize: 18 }}>{aviso.tipo === 'error' ? 'error' : 'info'}</span><span>{aviso.texto}</span>
            </div>
          )}

          <div className="as-lista sc" id="dir-lista" role="listbox" ref={cuerpoRef}>
            {consulta ? (
              <>
                {sugs.map((s, i) => (
                  <Fila
                    key={s.id} activo={i === sel} onClick={() => elegir(s)}
                    icono={s.icon || (s.hito ? 'storefront' : s.barrio ? 'location_on' : s.via ? 'map' : 'location_on')}
                    titulo={s.label} sub={s.detail}
                  />
                ))}
                {texto.trim().length >= 3 && !hayExacta && (
                  <Fila acento icono="location_on" titulo={`Fijar «${texto.trim()}» en el mapa`} sub="Ajusta el pin hasta tu puerta" onClick={usarTexto} />
                )}
                {!buscando && sugs.length === 0 && texto.trim().length < 4 && (
                  <p className="as-vacio">Escribe tu calle, carrera o barrio. Ej: «Cra 3 # 7-25», «Calle 5 con 3» o «Bellavista».</p>
                )}
              </>
            ) : (
              <>
                <h3 className="as-sec">Selecciona un lugar</h3>
                <Fila
                  acento icono={localizando ? 'progress_activity' : 'my_location'}
                  titulo={localizando ? 'Buscando tu ubicación…' : 'Usar mi ubicación actual'}
                  sub="Con el GPS de tu celular, en un toque" onClick={usarGps}
                />
                <Fila icono="map" titulo="Fijar en el mapa" sub="Mueve el pin hasta la puerta de tu casa o local"
                  onClick={() => { setTab('map'); if (!punto) volar(CENTRO.lat, CENTRO.lng, 14); }} />

                {recientes.length > 0 && (
                  <>
                    <h3 className="as-sec">Tus lugares</h3>
                    {recientes.slice(0, 4).map((a) => (
                      <Fila
                        key={a.id || a.address} icono={ICONO_ETIQUETA[a.label] ?? 'history'}
                        titulo={a.label && a.label !== 'Otro' ? a.label : a.address.split(',')[0]}
                        sub={[a.address, a.detail].filter(Boolean).join(' · ')} onClick={() => elegirReciente(a)}
                      />
                    ))}
                  </>
                )}

                <h3 className="as-sec">{verTodos ? `Todos los barrios (${todos.length})` : 'Barrios de Buenaventura'}</h3>
                {barriosVisibles.map((b) => (
                  <Fila key={b.name} icono="location_on" titulo={b.name} sub={b.detail} onClick={() => elegirBarrio(b)} />
                ))}
                <button type="button" className="as-mas" onClick={() => setVerTodos((v) => !v)}>
                  {verTodos ? 'Ver menos' : `Ver los ${todos.length} barrios`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ============ MAPA: fijar el punto ============ */}
        <div className="as-vista" style={{ display: tab === 'map' ? 'flex' : 'none' }}>
          <div className="as-mapa">
            <div ref={mapEl} className="as-mapa-lienzo" />

            <button type="button" className="as-circulo as-flota" onClick={() => setTab('search')} aria-label="Volver a la lista"><span className="ms">arrow_back</span></button>
            <div className="as-pildora">
              <span className="as-pildora-sub">{barrio ? `Barrio ${barrio}` : 'Buenaventura'}</span>
              <span className="as-pildora-t">{texto || 'Mueve el mapa hasta tu puerta'}</span>
            </div>

            <div className={`uber-pin-marker ${isDragging ? 'dragging' : ''}`} aria-hidden="true">
              <div className="uber-pin-head">
                <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>
                  {etiqueta === 'Trabajo' ? 'work' : etiqueta === 'Otro' ? 'location_on' : 'home'}
                </span>
              </div>
              <div className="uber-pin-shadow" />
            </div>

            <button type="button" onClick={usarGps} disabled={localizando} className="as-circulo as-gps" aria-label="Centrar en mi ubicación">
              <span className="ms">{localizando ? 'progress_activity' : 'my_location'}</span>
            </button>
          </div>

          <div className="as-tarjeta">
            {aviso && tab === 'map' && (
              <div className={`as-aviso ${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>
                <span className="ms" style={{ fontSize: 18 }}>{aviso.tipo === 'error' ? 'error' : 'info'}</span><span>{aviso.texto}</span>
              </div>
            )}
            <label htmlFor="dir-detalle" className="as-rot">Apto, torre, portón o referencia</label>
            <input
              id="dir-detalle" className="as-detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej. Portón blanco, apto 301, frente a la panadería" autoComplete="address-line2"
            />
            <div className="as-chips" role="group" aria-label="Tipo de lugar">
              {ETIQUETAS.map((l) => (
                <button key={l.id} type="button" aria-pressed={etiqueta === l.id} data-on={etiqueta === l.id} onClick={() => setEtiqueta(l.id)}>
                  <span className="ms" style={{ fontSize: 18 }}>{l.icon}</span>{l.label}
                </button>
              ))}
            </div>
            <button type="button" className="as-ok" onClick={guardar} disabled={guardando || fuera || !punto}>
              {guardando ? 'Guardando…' : fuera ? 'Punto fuera de cobertura' : 'Confirmar dirección'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalEl, document.body);
}

const CSS = `
.as-fondo{position:fixed;inset:0;z-index:9999;background:rgba(10,20,17,.55);display:flex;align-items:flex-end;justify-content:center;animation:fade .18s ease both}
.as-hoja{width:100%;height:100dvh;display:flex;flex-direction:column;background:var(--surface);color:var(--text);overflow:hidden;animation:tfsubir .28s cubic-bezier(.2,0,0,1) both}
@media (min-width:640px){.as-fondo{align-items:center;padding:24px}.as-hoja{max-width:480px;height:min(740px,calc(100dvh - 48px));border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.35)}}
.as-vista{flex:1;min-height:0;flex-direction:column}
.as-top{display:flex;align-items:center;gap:12px;padding:14px 16px 6px}
.as-h{margin:0;font-weight:800;font-size:20px;letter-spacing:-.02em}
.as-circulo{width:40px;height:40px;border-radius:50%;border:none;background:var(--surface2);color:var(--text);display:grid;place-items:center;cursor:pointer;flex:none}
.as-circulo .ms{font-size:22px}
.as-ruta{margin:10px 16px 4px;display:flex;gap:12px;border:2px solid var(--text);border-radius:16px;padding:6px 14px 6px 12px;background:var(--surface)}
.as-riel{display:flex;flex-direction:column;align-items:center;padding:20px 0 20px;flex:none}
.as-riel .d{width:10px;height:10px;border-radius:50%;background:var(--text)}
.as-riel .l{width:2px;flex:1;background:var(--text);margin:4px 0;min-height:22px}
.as-riel .c{width:10px;height:10px;background:var(--text)}
.as-ruta-filas{flex:1;min-width:0}
.as-ruta-fila{padding:9px 0;display:flex;flex-direction:column;gap:2px}
.as-ruta-fila+.as-ruta-fila{border-top:1px solid var(--border)}
.as-ruta-r{font-size:12px;font-weight:700;color:var(--muted)}
.as-ruta-v{font-size:15.5px;font-weight:600}
.as-ruta-in{display:flex;align-items:center;gap:8px}
.as-ruta-in input{flex:1;min-width:0;border:none;outline:none;background:none;font:inherit;font-size:15.5px;font-weight:600;color:var(--text);padding:0}
.as-ruta-in input::placeholder{color:var(--faint);font-weight:500}
.as-x{border:none;background:var(--surface2);border-radius:50%;width:24px;height:24px;display:grid;place-items:center;color:var(--muted);cursor:pointer}
.as-lista{flex:1;min-height:0;overflow-y:auto;padding:4px 0 24px}
.as-sec{margin:18px 16px 4px;font-size:13px;font-weight:800;letter-spacing:.02em;color:var(--muted)}
.as-fila{display:flex;align-items:center;gap:14px;width:100%;padding:12px 16px;border:none;background:transparent;text-align:left;cursor:pointer;color:var(--text);position:relative}
.as-fila:hover,.as-fila[data-activo="true"]{background:var(--surface2)}
.as-fila+.as-fila::before{content:'';position:absolute;top:0;left:70px;right:0;height:1px;background:var(--border)}
.as-fila-ico{width:40px;height:40px;border-radius:50%;background:var(--surface2);display:grid;place-items:center;flex:none;color:var(--text)}
.as-fila-ico.acento{background:color-mix(in srgb,var(--primary) 12%,var(--surface));color:var(--primary)}
.as-fila-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.as-fila-t{font-size:15.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.as-fila-s{font-size:13.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.as-mas{margin:10px 16px 0;height:44px;width:calc(100% - 32px);border-radius:12px;border:1px solid var(--border);background:transparent;color:var(--text);font-weight:700;font-size:14px;cursor:pointer}
.as-vacio{margin:18px 20px;font-size:13.5px;line-height:1.5;color:var(--muted)}
.as-aviso{display:flex;gap:8px;align-items:flex-start;margin:10px 16px 0;padding:10px 12px;border-radius:12px;font-size:13px;font-weight:600;line-height:1.4}
.as-aviso.error{background:#FDECE8;color:#9B2C16}
.as-aviso.info{background:color-mix(in srgb,var(--amber) 22%,var(--surface));color:var(--text)}
.as-spin{animation:spin 1s linear infinite;color:var(--muted)}
.as-mapa{position:relative;flex:1;min-height:0;background:var(--surface2)}
.as-mapa-lienzo{position:absolute;inset:0}
.as-flota{position:absolute;top:14px;left:14px;z-index:800;background:var(--surface);box-shadow:0 2px 10px rgba(0,0,0,.2)}
.as-gps{position:absolute;right:14px;bottom:30px;z-index:800;background:var(--surface);box-shadow:0 2px 10px rgba(0,0,0,.2)}
.as-pildora{position:absolute;top:14px;left:64px;right:14px;z-index:800;background:var(--surface);border-radius:999px;padding:7px 16px;box-shadow:0 2px 10px rgba(0,0,0,.2);display:flex;flex-direction:column;min-height:40px;justify-content:center;min-width:0}
.as-pildora-sub{font-size:11px;font-weight:700;color:var(--muted);line-height:1.2}
.as-pildora-t{font-size:14px;font-weight:800;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.as-tarjeta{flex:none;margin-top:-18px;position:relative;z-index:900;background:var(--surface);border-radius:20px 20px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -6px 24px rgba(0,0,0,.12)}
.as-rot{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px}
.as-detalle{width:100%;height:46px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);padding:0 14px;font:inherit;font-size:14.5px;color:var(--text);outline:none}
.as-detalle:focus{border-color:var(--primary)}
.as-chips{display:flex;gap:8px;margin-top:12px}
.as-chips button{flex:1;height:42px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--text);font-weight:700;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
.as-chips button[data-on="true"]{background:var(--text);color:var(--surface);border-color:var(--text)}
.as-ok{width:100%;height:52px;margin-top:14px;border:none;border-radius:14px;background:var(--text);color:var(--surface);font-weight:800;font-size:16px;cursor:pointer}
.as-ok:disabled{opacity:.45;cursor:not-allowed}
.as-barrio-label{background:none;border:none}
.as-barrio-label span{display:block;transform:translate(-50%,-50%);white-space:nowrap;font:700 11px/1 system-ui,sans-serif;color:#1a1a1a;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 4px #fff,0 0 4px #fff;pointer-events:none}
`;
