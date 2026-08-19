'use client';

/**
 * EL RECORRIDO
 *
 * Un panel con doce secciones no se explica con un texto de
 * bienvenida: nadie lo lee, y quien lo lee no se acuerda. Se explica
 * señalando.
 *
 * Esto oscurece la pantalla, deja iluminado UN elemento y pone al lado
 * una tarjeta de vidrio diciendo qué es y para qué sirve. Un paso a la
 * vez, con la posibilidad de salirse en cualquier momento.
 *
 * Tres decisiones que importan:
 *
 *   · El foco se calcula del elemento real (`getBoundingClientRect`),
 *     no de coordenadas escritas a mano. Si mañana la barra lateral
 *     cambia de ancho, el recorrido sigue apuntando bien.
 *
 *   · Si el elemento de un paso no está en pantalla, ese paso se
 *     salta solo. Señalar un vacío es peor que no señalar nada.
 *
 *   · Se recuerda terminado en `localStorage`. Un recorrido que vuelve
 *     a salir cada vez deja de ser ayuda y pasa a ser un obstáculo.
 */

import { useCallback, useEffect, useState } from 'react';

const CLAVE = 'turafood:recorrido';

/** Aire alrededor del elemento iluminado */
const MARGEN = 8;

export default function Recorrido({ id, pasos, autoIniciar = true }) {
  const [abierto, setAbierto] = useState(false);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState(null);

  const clave = `${CLAVE}:${id}`;

  /* ---------------------------------------------------------- abrir */
  useEffect(() => {
    if (!autoIniciar) return undefined;
    let hecho = false;
    try { hecho = localStorage.getItem(clave) === '1'; } catch { /* modo privado */ }
    if (hecho) return undefined;

    // Un respiro antes de arrancar: si sale encima de una pantalla que
    // todavía se está pintando, el foco queda en el lugar equivocado.
    const t = setTimeout(() => setAbierto(true), 700);
    return () => clearTimeout(t);
  }, [clave, autoIniciar]);

  /* ------------------------------------------------- medir el objetivo */
  const medir = useCallback(() => {
    const paso = pasos[i];
    if (!paso) return;

    if (!paso.selector) { setCaja(null); return; }

    const el = document.querySelector(paso.selector);
    if (!el) { setCaja(null); return; }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    setCaja({
      top: r.top - MARGEN,
      left: r.left - MARGEN,
      width: r.width + MARGEN * 2,
      height: r.height + MARGEN * 2,
    });
  }, [i, pasos]);

  useEffect(() => {
    if (!abierto) return undefined;
    medir();
    // Un respiro más, por si el scroll movió las cosas
    const t = setTimeout(medir, 320);

    window.addEventListener('resize', medir);
    window.addEventListener('scroll', medir, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', medir);
      window.removeEventListener('scroll', medir, true);
    };
  }, [abierto, medir]);

  /* ---------------------------------------------------------- teclado */
  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowRight' || e.key === 'Enter') siguiente();
      if (e.key === 'ArrowLeft') anterior();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cerrar = () => {
    setAbierto(false);
    try { localStorage.setItem(clave, '1'); } catch { /* modo privado */ }
  };

  const siguiente = () => {
    if (i >= pasos.length - 1) { cerrar(); return; }
    setI(i + 1);
  };

  const anterior = () => setI(Math.max(i - 1, 0));

  if (!abierto || !pasos.length) return null;

  const paso = pasos[i];
  const ultimo = i === pasos.length - 1;

  /* -------------------------------------------- dónde va la tarjeta */
  const tarjeta = (() => {
    if (!caja) {
      // Sin objetivo: centrada. Sirve para el paso de bienvenida.
      return { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
    }

    const anchoTarjeta = 320;
    const altoAprox = 190;
    const margen = 14;

    const cabeAbajo = caja.top + caja.height + altoAprox + margen < window.innerHeight;
    const top = cabeAbajo
      ? caja.top + caja.height + margen
      : Math.max(caja.top - altoAprox - margen, margen);

    // Alineada al elemento, pero sin salirse de la pantalla
    const left = Math.min(
      Math.max(caja.left, margen),
      window.innerWidth - anchoTarjeta - margen,
    );

    return { top, left };
  })();

  return (
    <div style={S.capa} role="dialog" aria-label="Recorrido guiado">
      {/* El velo con el hueco. Es una sola caja con una sombra enorme:
          así el hueco queda nítido y sin cortar nada del contenido. */}
      {caja ? (
        <div style={{ ...S.foco, ...caja }} />
      ) : (
        <div style={S.veloPlano} onClick={cerrar} />
      )}

      <div style={{ ...S.tarjeta, ...tarjeta }} className="anim-pop">
        <div style={S.contador}>
          {i + 1} de {pasos.length}
        </div>

        <div style={S.titulo}>{paso.titulo}</div>
        <p style={S.texto}>{paso.texto}</p>

        <div style={S.puntos}>
          {pasos.map((_, n) => (
            <span
              key={n}
              style={{
                ...S.punto,
                width: n === i ? 18 : 6,
                background: n <= i ? 'var(--primary)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        <div style={S.acciones}>
          <button onClick={cerrar} style={S.saltar}>
            {ultimo ? 'Cerrar' : 'Saltar'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {i > 0 && (
              <button onClick={anterior} style={S.atras} aria-label="Anterior">
                <span className="ms" style={{ fontSize: 19 }}>arrow_back</span>
              </button>
            )}
            <button onClick={siguiente} style={S.siguiente}>
              {ultimo ? 'Entendido' : 'Siguiente'}
              {!ultimo && <span className="ms" style={{ fontSize: 17 }}>arrow_forward</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Para volver a verlo desde Ayuda o soporte */
export function reiniciarRecorrido(id) {
  try { localStorage.removeItem(`${CLAVE}:${id}`); } catch { /* modo privado */ }
}

const S = {
  capa: {
    position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none',
  },
  veloPlano: {
    position: 'absolute', inset: 0, pointerEvents: 'auto',
    background: 'rgba(12,10,9,.62)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
  },
  /**
   * El hueco. `box-shadow` con un radio gigantesco pinta todo lo de
   * afuera y deja limpio lo de adentro — mucho más nítido que recortar
   * con máscaras, y funciona en cualquier navegador.
   */
  foco: {
    position: 'absolute',
    borderRadius: 18,
    boxShadow: '0 0 0 9999px rgba(12,10,9,.62), 0 0 0 2px rgba(255,255,255,.55) inset',
    transition: 'top .34s cubic-bezier(.2,0,0,1), left .34s cubic-bezier(.2,0,0,1), width .34s, height .34s',
    pointerEvents: 'none',
  },

  tarjeta: {
    position: 'absolute',
    width: 320, maxWidth: 'calc(100vw - 28px)',
    pointerEvents: 'auto',
    padding: 18, borderRadius: 22,
    // Vidrio: la superficie con transparencia y desenfoque fuerte, más
    // un borde claro arriba que simula el canto de un cristal.
    background: 'color-mix(in srgb, var(--surface) 82%, transparent)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    border: '1px solid color-mix(in srgb, var(--text) 12%, transparent)',
    boxShadow: '0 24px 60px rgba(12,10,9,.34), inset 0 1px 0 rgba(255,255,255,.5)',
    transition: 'top .34s cubic-bezier(.2,0,0,1), left .34s cubic-bezier(.2,0,0,1)',
  },
  contador: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: 'var(--faint)',
  },
  titulo: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17, letterSpacing: '-.02em', marginTop: 6,
  },
  texto: {
    margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)',
  },
  puntos: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 16 },
  punto: {
    height: 6, borderRadius: 99,
    transition: 'width .3s ease, background .3s ease',
  },
  acciones: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, marginTop: 16,
  },
  saltar: {
    fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', padding: '8px 4px',
  },
  atras: {
    width: 38, height: 38, borderRadius: 999, flex: 'none',
    border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  siguiente: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 38, padding: '0 16px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700,
  },
};
