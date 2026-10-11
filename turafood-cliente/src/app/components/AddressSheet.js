'use client';

/**
 * ¿DÓNDE TE ENTREGAMOS?
 *
 * Una sola pantalla, sin pasos:
 *   1. Escribes (aunque sea "cra 3 # 4-58") y aparecen sugerencias reales.
 *   2. El mapa se centra solo y el pin queda fijo en medio: si la fachada no
 *      coincide, mueves el mapa debajo del pin.
 *   3. Escribes el apto/referencia y tocas "Entregar aquí".
 *
 * Reglas que no se negocian (y por qué):
 *   · Nunca se guarda un punto inventado. Si la dirección escrita no existe
 *     en el mapa, el pin queda en el barrio y el botón no se habilita hasta
 *     que la persona mueva el mapa hasta su puerta. Antes se guardaba el
 *     centro de la ciudad y el repartidor recibía un punto equivocado.
 *   · Solo Buenaventura: la cobertura se valida aquí y otra vez en la base.
 *   · Si ya pidió antes, sus direcciones aparecen primero.
 *
 * Sin llaves ni cuentas: Photon (OpenStreetMap) y mosaicos de CARTO.
 * Leaflet va empaquetado con la app (antes se cargaba desde unpkg.com).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  searchAddress, reverseGeocode, puntoDeTexto, BUENAVENTURA_BARRIOS, MAP_BOUNDS,
} from '@/lib/geocoding';
import { CENTRO, enCobertura } from '@/lib/direcciones.mjs';

const ETIQUETAS = [
  { id: 'Casa', icon: 'home' },
  { id: 'Trabajo', icon: 'work' },
  { id: 'Otro', icon: 'location_on' },
];

const ICONO_ETIQUETA = { Casa: 'home', Trabajo: 'work', Otro: 'location_on' };

export default function AddressSheet({ open, onClose, onSave, recientes = [] }) {
  const [texto, setTexto] = useState('');
  const [punto, setPunto] = useState(null);          // { lat, lng } | null
  const [exacta, setExacta] = useState(false);       // Photon conoce el número de puerta
  const [pinTocado, setPinTocado] = useState(false); // la persona confirmó el punto en el mapa
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
  const [bloqueado, setBloqueado] = useState(false); // en táctil el mapa espera un toque

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const editado = useRef(false);     // la persona escribió: el mapa ya no le pisa el texto
  const silencioso = useRef(false);  // el mapa se movió por código, no por la persona
  const usuarioMovio = useRef(false);
  const seq = useRef(0);
  const abortRef = useRef(null);
  const tactil = useRef(false);

  // ---- reinicio al cerrar ----
  useEffect(() => {
    if (open) return;
    setTexto(''); setPunto(null); setExacta(false); setPinTocado(false); setBarrio(null);
    setSugs([]); setLista(false); setDetalle(''); setEtiqueta('Casa'); setAviso(null);
    editado.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, guardando, onClose]);

  // ---- el mapa (Leaflet empaquetado, se carga solo al abrir) ----
  useEffect(() => {
    if (!open) return undefined;
    let vivo = true;
    tactil.current = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
    setBloqueado(tactil.current);

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
        attributionControl: true,
        maxBounds: MAP_BOUNDS,
        maxBoundsViscosity: 0.9,
        dragging: !tactil.current,
        touchZoom: !tactil.current,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
      }).addTo(m);

      m.on('dragstart', () => { usuarioMovio.current = true; });
      m.on('moveend', () => {
        if (silencioso.current) { silencioso.current = false; return; }
        if (!usuarioMovio.current) return;       // un zoom no cambia dónde vive la persona
        usuarioMovio.current = false;
        const c = m.getCenter();
        setPunto({ lat: c.lat, lng: c.lng });
        setPinTocado(true);
        setAviso(null);
        if (!enCobertura(c.lat, c.lng)) setAviso({ tipo: 'error', texto: 'Ese punto queda fuera de la zona de entrega.' });
        else void reversaAlTexto(c.lat, c.lng);
      });

      mapRef.current = m;
      setTimeout(() => m.invalidateSize(), 80);
      if (punto) { silencioso.current = true; m.setView([punto.lat, punto.lng], 17); }
    })();

    return () => { vivo = false; mapRef.current?.remove(); mapRef.current = null; };
    // El mapa se crea una vez por apertura; `punto` solo se lee para centrarlo al nacer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const volar = useCallback((lat, lng, zoom = 17) => {
    const m = mapRef.current;
    if (!m) return;
    silencioso.current = true;
    m.setView([lat, lng], zoom, { animate: true });
  }, []);

  /** El pin se movió: pone la dirección más cercana en el texto, salvo que la persona ya escribió la suya */
  const reversaAlTexto = useCallback(async (lat, lng) => {
    if (editado.current) return;
    const mi = ++seq.current;
    const r = await reverseGeocode(lat, lng);
    if (mi !== seq.current || editado.current) return;
    if (r) { setTexto(r.label); setBarrio(r.neighborhood ?? null); setExacta(true); }
  }, []);

  // ---- sugerencias mientras escribe ----
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
    }, 260);
    return () => clearTimeout(id);
  }, [texto, lista, open]);

  const elegir = (s) => {
    editado.current = false;
    abortRef.current?.abort();
    setTexto(s.label);
    setBarrio(s.neighborhood ?? null);
    setPunto({ lat: s.lat, lng: s.lng });
    setExacta(Boolean(s.exacta));
    setPinTocado(false);
    setSugs([]); setLista(false); setSel(-1);
    setAviso(s.exacta
      ? null
      : { tipo: 'info', texto: 'Ubicamos tu zona. Mueve el mapa hasta tu puerta para que el repartidor te encuentre.' });
    volar(s.lat, s.lng, s.exacta ? 18 : 16);
  };

  const elegirReciente = (a) => {
    editado.current = false;
    setTexto(a.address);
    setBarrio(a.neighborhood ?? null);
    setPunto({ lat: a.lat, lng: a.lng });
    setExacta(true); setPinTocado(true);
    setDetalle(a.detail ?? '');
    if (ETIQUETAS.some((e) => e.id === a.label)) setEtiqueta(a.label);
    setSugs([]); setLista(false); setAviso(null);
    volar(a.lat, a.lng, 18);
  };

  /** "Usar lo que escribí": busca el punto del texto; si no hay, pide mover el mapa */
  const usarTexto = async () => {
    const q = texto.trim();
    if (q.length < 4) return;
    setLista(false); setBuscando(true);
    const r = await puntoDeTexto(q).catch(() => null);
    setBuscando(false);
    editado.current = true;
    if (!r) {
      setPunto(null); setExacta(false); setPinTocado(false);
      setAviso({ tipo: 'info', texto: 'No encontramos esa dirección en el mapa. Mueve el mapa hasta tu puerta y la guardamos así.' });
      return;
    }
    setBarrio(r.neighborhood ?? null);
    setPunto({ lat: r.lat, lng: r.lng });
    setExacta(!r.aproximado);
    setPinTocado(false);
    setAviso(r.aproximado
      ? { tipo: 'info', texto: 'Ubicamos tu zona, no tu puerta. Mueve el mapa hasta donde vives y guardamos tu dirección.' }
      : null);
    volar(r.lat, r.lng, r.aproximado ? 16 : 18);
  };

  const usarGps = () => {
    if (!navigator.geolocation) { setAviso({ tipo: 'error', texto: 'Tu navegador no permite ubicarte automáticamente.' }); return; }
    setLocalizando(true); setAviso(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false);
        const { latitude: lat, longitude: lng } = coords;
        if (!enCobertura(lat, lng)) {
          setAviso({ tipo: 'error', texto: 'Parece que no estás en Buenaventura. Escribe la dirección donde quieres recibir.' });
          return;
        }
        editado.current = false;
        setPunto({ lat, lng }); setExacta(true); setPinTocado(true); setLista(false);
        volar(lat, lng, 18);
        void reversaAlTexto(lat, lng);
      },
      (err) => {
        setLocalizando(false);
        setAviso({
          tipo: 'error',
          texto: err.code === 1
            ? 'No tenemos permiso para ver tu ubicación. Escribe tu dirección o activa el permiso en el navegador.'
            : 'No pudimos ubicarte. Escribe tu dirección.',
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
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

  const desbloquear = () => {
    setBloqueado(false);
    mapRef.current?.dragging.enable();
    mapRef.current?.touchZoom.enable();
  };

  const fuera = Boolean(punto) && !enCobertura(punto.lat, punto.lng);
  const listo = texto.trim().length >= 4 && Boolean(punto) && !fuera && (exacta || pinTocado);

  const guardar = async () => {
    if (!listo || guardando) {
      setAviso({
        tipo: 'error',
        texto: !punto ? 'Elige una sugerencia o mueve el mapa hasta tu puerta.'
          : fuera ? 'Ese punto queda fuera de la zona de entrega.'
            : texto.trim().length < 4 ? 'Escribe tu dirección.'
              : 'Mueve el mapa hasta tu puerta para confirmar el punto.',
      });
      return;
    }
    setGuardando(true); setAviso(null);
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

  const mostrarRecientes = texto.trim().length === 0 && recientes.length > 0;
  const hayExacta = sugs.some((s) => s.exacta);
  const barriosRapidos = useMemo(
    () => BUENAVENTURA_BARRIOS.filter((b) => ['Centro', 'Pueblo Nuevo', 'La Independencia', 'El Jorge', 'Juan XXIII', 'Bellavista'].includes(b.name)),
    [],
  );

  if (!open) return null;

  return (
    <div style={S.fondo} onClick={() => !guardando && onClose()}>
      <div style={S.hoja} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="¿Dónde te entregamos?">

        <div style={S.cabecera}>
          <div>
            <div style={S.titulo}>¿Dónde te entregamos?</div>
            <div style={S.sub}>Solo en Buenaventura</div>
          </div>
          <button onClick={onClose} style={S.cerrar} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="sc" style={S.cuerpo}>
          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <div style={{ ...S.campo, borderColor: lista ? 'var(--primary)' : 'var(--border)' }}>
              <span className="ms" style={{ fontSize: 21, color: 'var(--muted)' }}>search</span>
              <input
                autoFocus={recientes.length === 0}
                value={texto}
                role="combobox"
                aria-expanded={lista && sugs.length > 0}
                aria-autocomplete="list"
                aria-controls="dir-lista"
                autoComplete="street-address"
                enterKeyHint="search"
                placeholder="Ej. Cra 3 # 4-58, Centro"
                aria-label="Buscar dirección"
                onChange={(e) => { editado.current = true; setTexto(e.target.value); setLista(true); setPinTocado(false); }}
                onFocus={() => setLista(true)}
                onKeyDown={alTeclear}
                style={S.input}
              />
              {buscando && <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', animation: 'spin 1s linear infinite' }}>progress_activity</span>}
              {texto && !buscando && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setTexto(''); setSugs([]); editado.current = true; setLista(true); setPunto(null); setExacta(false); setPinTocado(false); setAviso(null); }}
                  aria-label="Borrar" style={S.borrar}
                >
                  <span className="ms" style={{ fontSize: 18 }}>cancel</span>
                </button>
              )}
            </div>

            {lista && texto.trim().length >= 2 && (
              <div id="dir-lista" role="listbox" style={S.lista}>
                {sugs.map((s, i) => (
                  <button
                    key={s.id} role="option" aria-selected={i === sel}
                    onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSel(i)} onClick={() => elegir(s)}
                    style={{ ...S.opcion, background: i === sel ? 'var(--surface2)' : 'transparent' }}
                  >
                    <span style={S.opcionIcono}>
                      <span className="ms" style={{ fontSize: 19, color: s.barrio ? 'var(--amber)' : 'var(--primary)' }}>
                        {s.barrio ? 'holiday_village' : 'location_on'}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{s.detail}</span>
                    </span>
                  </button>
                ))}
                {texto.trim().length >= 4 && !hayExacta && (
                  <button onMouseDown={(e) => e.preventDefault()} onClick={usarTexto} style={{ ...S.opcion, ...S.usarTexto }}>
                    <span style={{ ...S.opcionIcono, background: 'var(--primary)' }}>
                      <span className="ms" style={{ fontSize: 19, color: '#fff' }}>edit_location</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>Usar lo que escribí</span>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>&quot;{texto.trim()}&quot;</span>
                    </span>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>arrow_forward</span>
                  </button>
                )}
                {!buscando && sugs.length === 0 && texto.trim().length < 4 && (
                  <div style={S.vacio}>Sigue escribiendo: calle, carrera o barrio.</div>
                )}
              </div>
            )}
          </div>

          {/* GPS */}
          <button onClick={usarGps} disabled={localizando} style={S.gps}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--primary)', animation: localizando ? 'spin 1s linear infinite' : 'none' }}>
              {localizando ? 'progress_activity' : 'my_location'}
            </span>
            {localizando ? 'Buscándote…' : 'Usar mi ubicación actual'}
          </button>

          {/* Recientes */}
          {mostrarRecientes && (
            <div style={{ marginTop: 14 }}>
              <div style={S.rotulo}>Tus direcciones</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recientes.slice(0, 3).map((a) => (
                  <button key={a.id} onClick={() => elegirReciente(a)} style={S.reciente}>
                    <span style={S.opcionIcono}>
                      <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>{ICONO_ETIQUETA[a.label] ?? 'location_on'}</span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{a.address}</span>
                      <span className="tr1" style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                        {[a.label, a.detail].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barrios rápidos (solo si aún no hay punto) */}
          {!punto && texto.trim().length === 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={S.rotulo}>Barrios</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {barriosRapidos.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => elegir({
                      id: `barrio-${b.name}`, label: b.name, detail: b.detail, neighborhood: b.name,
                      lat: b.lat, lng: b.lng, exacta: false, barrio: true,
                    })}
                    style={S.chip}
                  >
                    <span className="ms" style={{ fontSize: 14, color: 'var(--primary)' }}>location_on</span>{b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mapa */}
          <div style={{ ...S.mapa, borderColor: fuera ? 'var(--primary)' : 'var(--border)' }}>
            <div ref={mapEl} style={{ position: 'absolute', inset: 0 }} />
            <div style={S.pin} aria-hidden="true">
              <span style={S.pinCabeza}><span className="ms ms-fill" style={{ fontSize: 20, color: '#fff' }}>home</span></span>
              <span style={S.pinSombra} />
            </div>
            {bloqueado && (
              <button onClick={desbloquear} style={S.bloqueo}>
                <span>Toca para mover el mapa</span>
              </button>
            )}
            <div style={S.pista}>
              <span className="ms" style={{ fontSize: 15 }}>drag_pan</span>
              {punto ? 'Mueve el mapa para ajustar el punto' : 'Elige una dirección o mueve el mapa'}
            </div>
          </div>

          {aviso && (
            <div role={aviso.tipo === 'error' ? 'alert' : 'status'} style={aviso.tipo === 'error' ? S.error : S.info}>
              <span className="ms" style={{ fontSize: 17 }}>{aviso.tipo === 'error' ? 'error' : 'info'}</span>
              <span style={{ flex: 1 }}>
                {aviso.texto}
                {aviso.tipo === 'info' && punto && !exacta && !pinTocado && !fuera && (
                  // Si el pin ya está sobre su casa, no hace falta arrastrar nada
                  <button onClick={() => { setPinTocado(true); setAviso(null); }} style={S.pinBien}>
                    El pin está bien
                  </button>
                )}
              </span>
            </div>
          )}

          {/* Detalle y tipo */}
          <label htmlFor="dir-detalle" style={S.rotuloCampo}>Apto, torre o referencia</label>
          <input
            id="dir-detalle"
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            placeholder="Ej. Torre B, apto 402 · portón negro frente a la tienda"
            autoComplete="address-line2"
            style={S.detalle}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {ETIQUETAS.map((l) => {
              const on = etiqueta === l.id;
              return (
                <button
                  key={l.id} onClick={() => setEtiqueta(l.id)} aria-pressed={on}
                  style={{
                    ...S.etiqueta,
                    background: on ? 'var(--text)' : 'var(--surface)',
                    color: on ? 'var(--bg)' : 'var(--text)',
                    border: on ? '1px solid transparent' : '1px solid var(--border)',
                  }}
                >
                  <span className="ms" style={{ fontSize: 18 }}>{l.icon}</span>{l.id}
                </button>
              );
            })}
          </div>
        </div>

        <div style={S.pie}>
          <button onClick={guardar} disabled={guardando} style={{ ...S.boton, opacity: listo ? 1 : 0.55 }}>
            {guardando ? 'Guardando…' : listo ? 'Entregar aquí' : 'Confirma el punto en el mapa'}
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  fondo: {
    position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(20,16,10,.5)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fade .16s ease both',
  },
  hoja: {
    width: '100%', maxWidth: 520, height: '92vh', maxHeight: 760, display: 'flex', flexDirection: 'column',
    background: 'var(--bg)', borderRadius: 24, boxShadow: '0 24px 60px rgba(0,0,0,.25)',
    animation: 'pop .24s cubic-bezier(.32,.72,0,1) both', overflow: 'hidden',
  },
  cabecera: {
    flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '18px 20px 14px', borderBottom: '1px solid var(--border)',
  },
  titulo: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21, letterSpacing: '-.02em' },
  sub: { fontSize: 12.5, color: 'var(--muted)', marginTop: 2 },
  cerrar: {
    width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 20px 8px' },
  campo: {
    display: 'flex', alignItems: 'center', gap: 10, height: 52, background: 'var(--surface)',
    border: '1.5px solid var(--border)', borderRadius: 16, padding: '0 14px', transition: 'border-color .15s',
  },
  input: { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'none', fontSize: 16 },
  borrar: { flex: 'none', color: 'var(--muted)', display: 'flex', padding: 2 },
  lista: {
    position: 'absolute', left: 0, right: 0, top: 58, zIndex: 700, maxHeight: 320, overflowY: 'auto',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    boxShadow: '0 16px 40px rgba(20,16,10,.18)', padding: 6,
  },
  opcion: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 10px', borderRadius: 12 },
  usarTexto: { background: 'rgba(255,68,31,.06)', border: '1px solid rgba(255,68,31,.22)', marginTop: 4 },
  opcionIcono: {
    width: 36, height: 36, borderRadius: 11, background: 'var(--surface2)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  vacio: { padding: '12px 10px', fontSize: 12.5, color: 'var(--muted)' },
  gps: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, height: 42, padding: '0 14px',
    borderRadius: 999, background: 'var(--primary-tint)', color: 'var(--primary)', fontSize: 13, fontWeight: 800,
  },
  rotulo: { fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 },
  reciente: {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 14, padding: 11,
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 99,
    background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 700,
  },
  mapa: {
    position: 'relative', height: 230, marginTop: 14, borderRadius: 18, overflow: 'hidden',
    background: 'var(--surface2)', border: '1.5px solid var(--border)', isolation: 'isolate',
  },
  pin: {
    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -100%)', zIndex: 450,
    display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
  },
  pinCabeza: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', border: '3px solid #fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(255,68,31,.4)',
  },
  pinSombra: { width: 10, height: 5, borderRadius: '50%', background: 'rgba(20,16,10,.5)', marginTop: 4 },
  bloqueo: {
    position: 'absolute', inset: 0, zIndex: 480, background: 'rgba(20,16,10,.12)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 12,
    fontSize: 12.5, fontWeight: 800, color: 'var(--text)',
  },
  pista: {
    position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 470, pointerEvents: 'none',
    display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.95)', color: '#17140F',
    borderRadius: 999, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(20,16,10,.15)',
  },
  info: {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, background: 'var(--amber-tint)',
    border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 12, fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, background: 'var(--primary-tint)',
    color: 'var(--primary)', padding: '10px 12px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, lineHeight: 1.4,
  },
  pinBien: {
    display: 'block', marginTop: 8, padding: '6px 12px', borderRadius: 999, background: 'var(--text)',
    color: 'var(--bg)', fontSize: 12, fontWeight: 800,
  },
  rotuloCampo: { display: 'block', marginTop: 16, marginBottom: 8, fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' },
  detalle: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)',
    padding: '0 14px', fontSize: 16, outline: 'none',
  },
  etiqueta: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42,
    borderRadius: 12, fontSize: 13, fontWeight: 700,
  },
  pie: { flex: 'none', padding: '12px 20px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' },
  boton: {
    width: '100%', height: 54, borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontWeight: 800, fontSize: 15, boxShadow: '0 10px 24px rgba(255,68,31,.3)', transition: 'opacity .15s',
  },
};
