'use client';

/**
 * UBICACIÓN DEL NEGOCIO
 *
 * El negocio escribe su dirección (o la busca) y ajusta el pin en el mapa.
 * Ese punto es el que ve el cliente en el seguimiento y el que usa el
 * repartidor para llegar. La base valida que esté dentro de Buenaventura.
 *
 * Nunca se guarda un punto que la persona no haya visto: lo que queda es
 * lo que marca el pin al confirmar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchAddress, reverseGeocode, isInCoverage, BUENAVENTURA_CENTER } from '@/lib/geocoding';
import { fijarUbicacionNegocio } from '@/lib/negocio';

export default function UbicacionNegocio({ open, onClose, onSaved, inicial }) {
  const el = useRef(null);
  const mapa = useRef(null);
  const editada = useRef(false);        // si la persona escribió la dirección, no se pisa con la del pin
  const [consulta, setConsulta] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [punto, setPunto] = useState(null);
  const [direccion, setDireccion] = useState(inicial?.address ?? '');
  const [barrio, setBarrio] = useState(inicial?.neighborhood ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Mapa: se crea al abrir y se destruye al cerrar
  useEffect(() => {
    if (!open) return undefined;
    let vivo = true;
    let m = null;
    let temporizador;
    (async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
      if (!vivo || !el.current) return;
      const c = inicial?.lat != null ? { lat: inicial.lat, lng: inicial.lng } : BUENAVENTURA_CENTER;
      m = L.map(el.current, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(m);
      m.setView([c.lat, c.lng], inicial?.lat != null ? 17 : 14);
      mapa.current = m;
      setPunto(inicial?.lat != null ? c : null);
      m.on('moveend', () => {
        const p = m.getCenter();
        setPunto({ lat: p.lat, lng: p.lng });
      });
      temporizador = setTimeout(() => { if (mapa.current === m) m.invalidateSize(); }, 200);
    })();
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      m?.remove();
      mapa.current = null;
    };
    // el mapa se arma una vez por apertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sugerencias mientras escribe
  useEffect(() => {
    if (!open || consulta.trim().length < 3) return undefined;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      searchAddress(consulta, ctl.signal).then(setSugerencias).catch(() => {});
    }, 300);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [consulta, open]);

  // Al mover el pin, se propone la dirección de ese punto (si no escribió una a mano)
  useEffect(() => {
    if (!open || !punto || editada.current) return undefined;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      reverseGeocode(punto.lat, punto.lng, ctl.signal).then((r) => {
        if (!r || editada.current) return;
        setDireccion(r.label);
        if (r.neighborhood) setBarrio(r.neighborhood);
      });
    }, 500);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [punto, open]);

  const elegir = useCallback((s) => {
    editada.current = true;
    setDireccion(s.label);
    setBarrio(s.neighborhood ?? '');
    setConsulta('');
    setSugerencias([]);
    mapa.current?.setView([s.lat, s.lng], s.exacta ? 18 : 16);
  }, []);

  const guardar = async () => {
    setError(null);
    if (!punto) return setError('Mueve el mapa hasta que el pin quede sobre tu negocio.');
    if (!isInCoverage(punto.lat, punto.lng)) return setError('Ese punto queda fuera de la zona de entrega (Buenaventura).');
    if (direccion.trim().length < 4) return setError('Escribe la dirección de tu negocio.');
    setGuardando(true);
    try {
      const negocio = await fijarUbicacionNegocio({ lat: punto.lat, lng: punto.lng, address: direccion.trim(), neighborhood: barrio.trim() });
      onSaved?.(negocio);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Ubicación de tu negocio"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{ width: '100%', maxWidth: 560, maxHeight: '94vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: '24px 24px 0 0', padding: 20, boxShadow: '0 -12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, color: 'var(--text)' }}>Ubicación de tu negocio</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer' }}>
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <p style={{ margin: '6px 0 12px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Así te ve el cliente en el seguimiento y así llega tu repartidor. Busca tu calle o mueve el mapa hasta que el pin quede en tu puerta.
        </p>

        <div style={{ position: 'relative' }}>
          <input value={consulta} onChange={(e) => setConsulta(e.target.value)} placeholder="Busca tu calle o barrio (ej. Calle 2 # 3-10)"
            aria-label="Buscar dirección" style={campo} />
          {consulta.trim().length >= 3 && sugerencias.length > 0 && (
            <ul role="listbox" style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, top: 52, margin: 0, padding: 6, listStyle: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 12px 30px rgba(0,0,0,.18)' }}>
              {sugerencias.map((s) => (
                <li key={s.id}>
                  <button type="button" role="option" aria-selected="false" onClick={() => elegir(s)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 10, color: 'var(--text)' }}>
                    <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{s.label}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{s.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ position: 'relative', height: 280, marginTop: 12, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div ref={el} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
          {/* Pin fijo al centro: lo que marca es lo que se guarda */}
          <span className="ms" aria-hidden="true" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)', fontSize: 44, color: 'var(--primary)', zIndex: 500, pointerEvents: 'none', textShadow: '0 4px 10px rgba(0,0,0,.3)' }}>location_on</span>
        </div>

        <label style={{ display: 'block', marginTop: 14 }}>
          <span style={etiqueta}>Dirección de tu negocio</span>
          <input value={direccion} onChange={(e) => { editada.current = true; setDireccion(e.target.value); }} style={campo} />
        </label>
        <label style={{ display: 'block', marginTop: 10 }}>
          <span style={etiqueta}>Barrio</span>
          <input value={barrio} onChange={(e) => setBarrio(e.target.value)} style={campo} />
        </label>

        {error && <div role="alert" style={{ marginTop: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--primary)' }}>{error}</div>}

        <button onClick={guardar} disabled={guardando} style={{ marginTop: 16, width: '100%', height: 54, borderRadius: 16, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: guardando ? 0.7 : 1 }}>
          {guardando ? 'Guardando…' : 'Guardar ubicación'}
        </button>
      </div>
    </div>
  );
}

const campo = { width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 14px', fontSize: 15 };
const etiqueta = { display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 };
