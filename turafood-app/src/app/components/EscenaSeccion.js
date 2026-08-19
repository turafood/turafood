'use client';

/**
 * LAS ESCENAS DE LAS CABECERAS
 *
 * Gente, no iconos. Un icono de una moto dice "reparto"; alguien en
 * una moto con una caja al hombro dice "así se ve tu negocio
 * funcionando". Es la diferencia entre una pantalla de sistema y una
 * pantalla de producto.
 *
 * POR QUÉ DIBUJADAS Y NO FOTOS
 *
 * No hay fotos de personas del puerto, y una de banco de imágenes se
 * nota a un kilómetro: una modelo sonriendo en una cocina que no es
 * la suya hace ver la app menos seria, no más. Además pesarían, y la
 * app se abre con datos móviles.
 *
 * Las figuras son deliberadamente simples —sin rostro, sin tono de
 * piel definido— y eso también es a propósito: quien las mira se
 * pone a sí mismo ahí. Una cara concreta excluye a todo el que no se
 * parece a ella.
 *
 * El volumen sale de degradados, como el resto de las ilustraciones
 * de la app, para que todo se vea de la misma mano.
 */

/* Cada escena manda su propia paleta; el fondo lo pone la cabecera */
const P = {
  piel:   '#C89B7B',
  ropa1:  '#FF7A4D',
  ropa2:  '#4A90E2',
  ropa3:  '#25D366',
  pelo:   '#2B2118',
};

function Defs({ id, tono }) {
  return (
    <defs>
      <linearGradient id={`${id}-a`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={tono} stopOpacity="1" />
        <stop offset="100%" stopColor={tono} stopOpacity=".62" />
      </linearGradient>
      <radialGradient id={`${id}-luz`} cx="35%" cy="25%" r="60%">
        <stop offset="0%" stopColor="#fff" stopOpacity=".28" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Una figura de pie, vista de frente. `x` es su centro. */
function Persona({ id, x, escala = 1, ropa = P.ropa1, brazoAlto }) {
  const s = escala;
  return (
    <g transform={`translate(${x} 0) scale(${s})`}>
      {/* piernas */}
      <rect x="-9" y="52" width="7" height="26" rx="3.5" fill={P.pelo} opacity=".85" />
      <rect x="2" y="52" width="7" height="26" rx="3.5" fill={P.pelo} opacity=".7" />
      {/* torso */}
      <path d="M-13 24 q13-6 26 0 l3 32 q-16 5-32 0z" fill={`url(#${id}-a)`} />
      {/* brazos */}
      <rect x="-19" y="27" width="6.5" height="24" rx="3.2" fill={ropa} opacity=".8" />
      {brazoAlto ? (
        <rect x="13" y="8" width="6.5" height="22" rx="3.2" fill={ropa} opacity=".8" transform="rotate(18 16 19)" />
      ) : (
        <rect x="13" y="27" width="6.5" height="24" rx="3.2" fill={ropa} opacity=".8" />
      )}
      {/* cuello y cabeza */}
      <rect x="-3" y="17" width="6" height="9" rx="3" fill={P.piel} />
      <circle cx="0" cy="10" r="10" fill={P.piel} />
      <path d="M-10 8 a10 10 0 0 1 20 0 q-10-6-20 0z" fill={P.pelo} />
    </g>
  );
}

/* ============================================================
   LAS ESCENAS
   ============================================================ */

/** Reparto: alguien en moto con la caja al hombro */
function Reparto({ id }) {
  return (
    <>
      <Defs id={id} tono={P.ropa3} />
      {/* la moto */}
      <circle cx="34" cy="86" r="13" fill="none" stroke={P.pelo} strokeWidth="4" opacity=".9" />
      <circle cx="96" cy="86" r="13" fill="none" stroke={P.pelo} strokeWidth="4" opacity=".9" />
      <path d="M34 86 h24 l10-18 h20 l8 18" fill="none" stroke={P.ropa3} strokeWidth="5"
            strokeLinecap="round" strokeLinejoin="round" />
      <rect x="52" y="60" width="22" height="8" rx="3" fill={P.ropa3} opacity=".7" />
      {/* la caja térmica */}
      <rect x="24" y="44" width="26" height="24" rx="5" fill={P.ropa1} />
      <rect x="24" y="44" width="26" height="24" rx="5" fill={`url(#${id}-luz)`} />
      <rect x="31" y="52" width="12" height="3" rx="1.5" fill="#fff" opacity=".7" />
      {/* quien maneja */}
      <Persona id={id} x={76} escala={0.72} ropa={P.ropa3} />
    </>
  );
}

/** Atender: alguien detrás del mostrador entregando un pedido */
function Mostrador({ id }) {
  return (
    <>
      <Defs id={id} tono={P.ropa1} />
      {/* el mostrador */}
      <rect x="14" y="66" width="104" height="30" rx="5" fill={P.pelo} opacity=".55" />
      <rect x="14" y="66" width="104" height="7" rx="3.5" fill={P.ropa1} opacity=".6" />
      {/* quien atiende, del otro lado */}
      <Persona id={id} x={44} escala={0.78} ropa={P.ropa1} brazoAlto />
      {/* quien recibe */}
      <Persona id={id} x={94} escala={0.7} ropa={P.ropa2} />
      {/* la bolsa que pasa de una mano a otra */}
      <rect x="62" y="48" width="18" height="20" rx="3" fill={P.ropa1} />
      <path d="M66 48 v-5 a5 5 0 0 1 10 0 v5" fill="none" stroke={P.ropa1} strokeWidth="2.5" />
      <rect x="62" y="48" width="18" height="20" rx="3" fill={`url(#${id}-luz)`} />
    </>
  );
}

/** La plata: alguien mirando cómo suben sus números */
function Plata({ id }) {
  return (
    <>
      <Defs id={id} tono={P.ropa2} />
      {/* el tablero */}
      <rect x="46" y="18" width="76" height="54" rx="8" fill={P.ropa2} opacity=".22" />
      <path d="M56 60 l14-14 12 9 18-22" fill="none" stroke="#4ADE80" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="100" cy="33" r="4.5" fill="#4ADE80" />
      {[0, 1, 2].map((n) => (
        <rect key={n} x={56 + n * 8} y={64} width="4" height="4" rx="2" fill="#fff" opacity=".3" />
      ))}
      {/* quien mira */}
      <Persona id={id} x={26} escala={0.82} ropa={P.ropa2} brazoAlto />
    </>
  );
}

/** Crecer: alguien señalando algo que sube */
function Crecer({ id }) {
  return (
    <>
      <Defs id={id} tono={P.ropa1} />
      {/* las barras que suben */}
      {[
        { x: 62, h: 22 },
        { x: 80, h: 36 },
        { x: 98, h: 54 },
      ].map((b) => (
        <rect key={b.x} x={b.x} y={90 - b.h} width="13" height={b.h} rx="4"
              fill={`url(#${id}-a)`} />
      ))}
      {/* la flecha */}
      <path d="M60 40 l50-16" stroke="#FFB57A" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M104 20 l8 3 -4 8" fill="none" stroke="#FFB57A" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" />
      {/* quien señala */}
      <Persona id={id} x={32} escala={0.84} ropa={P.ropa1} brazoAlto />
    </>
  );
}

/** Cobrar: dos manos y un celular con el pago */
function Cobrar({ id }) {
  return (
    <>
      <Defs id={id} tono={P.ropa3} />
      {/* el celular */}
      <rect x="52" y="20" width="40" height="66" rx="8" fill={P.pelo} opacity=".7" />
      <rect x="56" y="26" width="32" height="54" rx="5" fill={P.ropa3} opacity=".28" />
      <circle cx="72" cy="48" r="13" fill={`url(#${id}-a)`} />
      <path d="M66 48 l4.5 4.5 8-9" stroke="#fff" strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="61" y="66" width="22" height="4" rx="2" fill="#fff" opacity=".45" />
      {/* quien cobra */}
      <Persona id={id} x={26} escala={0.8} ropa={P.ropa3} brazoAlto />
      {/* las monedas que caen */}
      {[{ x: 104, y: 34 }, { x: 112, y: 52 }, { x: 102, y: 66 }].map((c) => (
        <circle key={c.y} cx={c.x} cy={c.y} r="6" fill="#FFB020" opacity=".85" />
      ))}
    </>
  );
}

const ESCENAS = {
  reparto: Reparto,
  mostrador: Mostrador,
  plata: Plata,
  crecer: Crecer,
  cobrar: Cobrar,
};

export default function EscenaSeccion({ nombre, size = 132 }) {
  const Pieza = ESCENAS[nombre] ?? Mostrador;
  const id = `es-${nombre ?? 'def'}`;

  return (
    <svg
      viewBox="0 0 132 104"
      width={size}
      height={size * 0.79}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <Pieza id={id} />
    </svg>
  );
}
