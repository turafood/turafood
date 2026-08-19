'use client';

/**
 * "TE ESTAMOS ARMANDO EL PANEL"
 *
 * Va entre la última pregunta y el panel. Guardar las respuestas,
 * cargar el menú del nicho y sembrar las comandas toma dos o tres
 * segundos — y dos segundos con la pantalla congelada se leen como
 * que la app se colgó, justo después de que la persona nos dedicó
 * seis respuestas.
 *
 * POR QUÉ UNA OLLA Y NO UNA RUEDITA
 *
 * Una rueda de carga dice "espera". Una olla hirviendo con humo dice
 * "estamos cocinando lo tuyo". Es el mismo tiempo de espera y se
 * siente la mitad, porque hay algo que mirar y ese algo cuenta lo que
 * está pasando.
 *
 * Y se adapta al nicho: quien puso "pizzería" ve una pizza salir del
 * horno; quien puso "droguería" ve una caja armándose. Es el primer
 * momento en que la app le demuestra que sí registró lo que contestó.
 *
 * TODO ES SVG + CSS
 *
 * Sin librerías de animación ni GIFs. En un celular con red lenta —el
 * escenario real acá— bajar un GIF de 200 KB para tapar una espera de
 * dos segundos es cambiar una espera por otra más larga.
 *
 * Respeta `prefers-reduced-motion`: a quien le molesta el movimiento
 * se le muestra la escena quieta, no se le quita la información.
 */

import { useEffect, useState } from 'react';

/**
 * La escena según lo que vende. La clave es el nicho que eligió en la
 * primera pregunta.
 */
const ESCENAS = {
  pizzeria:        { emoji: '🍕', titulo: 'Calentando el horno',      color: '#FF7A4D' },
  hamburgueseria:  { emoji: '🍔', titulo: 'Armando tu parrilla',      color: '#FF7A4D' },
  comidas_rapidas: { emoji: '🍟', titulo: 'Prendiendo la freidora',   color: '#FFB020' },
  comida_mar:      { emoji: '🦐', titulo: 'Alistando la olla',        color: '#4A90E2' },
  asadero:         { emoji: '🍗', titulo: 'Prendiendo el asador',     color: '#E2360F' },
  cafeteria:       { emoji: '☕', titulo: 'Moliendo el café',         color: '#8B5A2B' },
  mercado:         { emoji: '🥬', titulo: 'Surtiendo los estantes',   color: '#25D366' },
  farmacia:        { emoji: '💊', titulo: 'Organizando tu inventario', color: '#4A90E2' },
  licores:         { emoji: '🍾', titulo: 'Enfriando la nevera',      color: '#9B6BE8' },
  sexshop:         { emoji: '🎁', titulo: 'Empacando con discreción', color: '#E8489B' },
  tienda:          { emoji: '🏬', titulo: 'Abriendo tu tienda',       color: '#FF7A4D' },
  // Repartidor
  repartidor:      { emoji: '🛵', titulo: 'Calentando el motor',      color: '#25D366' },
};

const POR_DEFECTO = { emoji: '🍽️', titulo: 'Preparando todo', color: '#FF7A4D' };

export default function PreparandoPanel({ nicho, pasos = [], listo }) {
  const [visto, setVisto] = useState(0);
  const escena = ESCENAS[nicho] ?? POR_DEFECTO;

  // Los pasos se van marcando solos cada 700 ms. No es mentira: son
  // los pasos que de verdad están corriendo detrás, solo que ninguno
  // avisa cuándo termina. Lo que se muestra es el orden real.
  useEffect(() => {
    if (visto >= pasos.length) return undefined;
    const id = setTimeout(() => setVisto((n) => n + 1), 700);
    return () => clearTimeout(id);
  }, [visto, pasos.length]);

  return (
    <div style={S.capa} role="status" aria-live="polite">
      <div style={S.centro}>

        {/* ---------------------------------------- la escena */}
        <div style={S.escena}>
          {/* El resplandor de abajo: la "hornilla" */}
          <span
            style={{ ...S.fuego, background: `radial-gradient(circle, ${escena.color}55, transparent 70%)` }}
            className="prep-fuego"
            aria-hidden="true"
          />

          {/* El humo. Tres hilos con retrasos distintos para que no
              suban en bloque, que se ve mecánico. */}
          <svg viewBox="0 0 120 90" style={S.humo} aria-hidden="true">
            {[
              { d: 'M42 78 C34 60 50 54 42 36 C36 22 48 14 44 4', delay: '0s' },
              { d: 'M60 78 C52 58 68 52 60 32 C54 18 66 10 62 0',  delay: '.9s' },
              { d: 'M78 78 C70 60 86 54 78 36 C72 22 84 14 80 4',  delay: '1.7s' },
            ].map((h, n) => (
              <path
                key={n}
                d={h.d}
                fill="none"
                stroke="rgba(255,255,255,.5)"
                strokeWidth="5"
                strokeLinecap="round"
                className="prep-humo"
                style={{ animationDelay: h.delay }}
              />
            ))}
          </svg>

          {/* La olla */}
          <svg viewBox="0 0 140 100" style={S.olla} aria-hidden="true">
            {/* asas */}
            <rect x="14" y="42" width="18" height="8" rx="4" fill="#3A3733" />
            <rect x="108" y="42" width="18" height="8" rx="4" fill="#3A3733" />
            {/* cuerpo */}
            <path d="M26 38 h88 l-7 44 a10 10 0 0 1-10 9 H43 a10 10 0 0 1-10-9z" fill="#4A4642" />
            <path d="M26 38 h88 l-2 12 H28z" fill="#5E5A55" />
            {/* el contenido, que burbujea */}
            <ellipse cx="70" cy="44" rx="40" ry="7" fill={escena.color} className="prep-caldo" />
          </svg>

          {/* Lo que vende, saliendo de la olla */}
          <span style={S.plato} className="prep-plato" aria-hidden="true">
            {escena.emoji}
          </span>
        </div>

        {/* ---------------------------------------- el texto */}
        <h2 style={S.titulo}>{escena.titulo}</h2>
        <p style={S.bajada}>Te estamos dejando el panel listo para trabajar.</p>

        {/* ---------------------------------------- los pasos */}
        <ol style={S.pasos}>
          {pasos.map((p, n) => {
            const hecho = n < visto;
            const actual = n === visto;
            return (
              <li key={p} style={{ ...S.paso, opacity: hecho || actual ? 1 : .38 }}>
                <span
                  style={{
                    ...S.marca,
                    background: hecho ? escena.color : 'rgba(255,255,255,.12)',
                    borderColor: actual ? escena.color : 'transparent',
                  }}
                >
                  {hecho && <span className="ms" style={{ fontSize: 13, color: '#fff' }}>check</span>}
                </span>
                <span style={{ fontWeight: actual ? 700 : 500 }}>{p}</span>
              </li>
            );
          })}
        </ol>

        {listo && (
          <p style={{ ...S.bajada, color: escena.color, fontWeight: 700, marginTop: 14 }}>
            Todo listo, entrando…
          </p>
        )}
      </div>
    </div>
  );
}

const S = {
  capa: {
    position: 'fixed', inset: 0, zIndex: 400,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    background: 'linear-gradient(160deg, #17140F 0%, #0B0A08 70%)',
    color: '#fff',
  },
  centro: {
    width: '100%', maxWidth: 340,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textAlign: 'center',
  },

  escena: {
    position: 'relative', width: 200, height: 190,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  fuego: {
    position: 'absolute', bottom: 4, left: '50%', marginLeft: -75,
    width: 150, height: 60, borderRadius: '50%',
  },
  humo: {
    position: 'absolute', top: 0, left: '50%', marginLeft: -60,
    width: 120, height: 90, overflow: 'visible',
  },
  olla: { position: 'relative', width: 168, marginBottom: 6 },
  plato: {
    position: 'absolute', top: 52, left: '50%', marginLeft: -22,
    fontSize: 44, lineHeight: 1,
  },

  titulo: {
    margin: '18px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 21, letterSpacing: '-.02em',
  },
  bajada: {
    margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55,
    color: 'rgba(255,255,255,.55)',
  },

  pasos: {
    listStyle: 'none', margin: '22px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 11,
    width: '100%', textAlign: 'left',
  },
  paso: {
    display: 'flex', alignItems: 'center', gap: 11,
    fontSize: 13.5, transition: 'opacity .3s ease',
  },
  marca: {
    width: 22, height: 22, borderRadius: '50%', flex: 'none',
    border: '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .3s ease, border-color .3s ease',
  },
};
