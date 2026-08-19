'use client';

/**
 * LAS ILUSTRACIONES DEL RECORRIDO
 *
 * Cada paso del onboarding lleva una pieza que muestra de qué está
 * hablando. Un tarjetón con solo texto se lee como un términos y
 * condiciones; con una imagen arriba se lee como que alguien se tomó
 * el trabajo.
 *
 * SON SVG ESCRITOS A MANO, NO ARCHIVOS
 *
 * Y es a propósito:
 *
 *   · No pesan nada ni salen a la red. El onboarding aparece en el
 *     primer segundo del panel — justo cuando el celular todavía está
 *     bajando el resto. Una imagen de 80 KB ahí se ve llegar.
 *
 *   · Se pintan con las variables del tema, así que en modo oscuro no
 *     quedan como una estampilla blanca pegada encima.
 *
 *   · El volumen sale de gradientes, no de sombras falsas: una cara
 *     iluminada arriba, otra en sombra abajo, y un brillo especular
 *     corto. Es lo mismo que hace un icono 3D de verdad, sin el peso
 *     de un render.
 *
 * Todas viven en un lienzo de 120×120 y se dibujan en isométrico
 * suave — no perspectiva completa, que a este tamaño se lee sucia.
 */

const G = {
  // Naranja de marca, de claro arriba a quemado abajo
  naranja: ['#FFB57A', '#FF7A4D', '#E2360F'],
  // Verde de "esto está funcionando"
  verde: ['#7BE8B0', '#25D366', '#0B7A48'],
  // Azul frío para lo que es información
  azul: ['#9DC9FF', '#4A90E2', '#1B4F8F'],
  // Morado para la IA
  morado: ['#D9B8FF', '#9B6BE8', '#5B2E9E'],
};

/** Define los degradados una sola vez por pieza */
function Degradados({ id, tonos }) {
  const [claro, medio, oscuro] = tonos;
  return (
    <defs>
      <linearGradient id={`${id}-cara`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={claro} />
        <stop offset="55%" stopColor={medio} />
        <stop offset="100%" stopColor={oscuro} />
      </linearGradient>
      <linearGradient id={`${id}-canto`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={medio} />
        <stop offset="100%" stopColor={oscuro} />
      </linearGradient>
      <radialGradient id={`${id}-brillo`} cx="30%" cy="22%" r="55%">
        <stop offset="0%" stopColor="#fff" stopOpacity=".72" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-piso`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={oscuro} stopOpacity=".28" />
        <stop offset="100%" stopColor={oscuro} stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** La sombra que apoya la pieza en el piso. Sin esto todo flota. */
const Piso = ({ id }) => (
  <ellipse cx="60" cy="103" rx="34" ry="7" fill={`url(#${id}-piso)`} />
);

/* ============================================================
   LAS PIEZAS
   ============================================================ */

/** Tu panel: una tarjeta con una gráfica que sube */
function Panel({ id }) {
  return (
    <>
      <Degradados id={id} tonos={G.naranja} />
      <Piso id={id} />
      {/* cuerpo */}
      <rect x="24" y="26" width="72" height="62" rx="11" fill={`url(#${id}-cara)`} />
      {/* canto inferior, que le da el grosor */}
      <path d="M24 78 h72 v-1 a11 11 0 0 1-11 11 H35 a11 11 0 0 1-11-11z" fill={`url(#${id}-canto)`} opacity=".55" />
      {/* barras */}
      <rect x="35" y="60" width="9" height="16" rx="3" fill="#fff" opacity=".55" />
      <rect x="49" y="52" width="9" height="24" rx="3" fill="#fff" opacity=".72" />
      <rect x="63" y="43" width="9" height="33" rx="3" fill="#fff" opacity=".9" />
      <rect x="77" y="49" width="9" height="27" rx="3" fill="#fff" opacity=".72" />
      {/* barra de título */}
      <rect x="35" y="35" width="30" height="5" rx="2.5" fill="#fff" opacity=".78" />
      <rect x="35" y="43" width="18" height="4" rx="2" fill="#fff" opacity=".45" />
      <rect x="24" y="26" width="72" height="62" rx="11" fill={`url(#${id}-brillo)`} />
    </>
  );
}

/** Todo vive acá: el menú lateral */
function Menu({ id }) {
  return (
    <>
      <Degradados id={id} tonos={G.azul} />
      <Piso id={id} />
      <rect x="22" y="24" width="76" height="66" rx="11" fill={`url(#${id}-cara)`} opacity=".28" />
      {/* la columna del menú, en primer plano */}
      <rect x="22" y="24" width="30" height="66" rx="11" fill={`url(#${id}-cara)`} />
      {[34, 46, 58, 70].map((y, n) => (
        <g key={y}>
          <circle cx="31" cy={y + 2} r="3" fill="#fff" opacity={n === 0 ? '.95' : '.5'} />
          <rect x="38" y={y} width={n === 0 ? 9 : 7} height="4" rx="2" fill="#fff" opacity={n === 0 ? '.95' : '.45'} />
        </g>
      ))}
      {/* contenido a la derecha, insinuado */}
      <rect x="60" y="34" width="28" height="5" rx="2.5" fill={G.azul[1]} opacity=".55" />
      <rect x="60" y="45" width="20" height="4" rx="2" fill={G.azul[1]} opacity=".32" />
      <rect x="60" y="56" width="30" height="22" rx="6" fill={G.azul[1]} opacity=".22" />
      <rect x="22" y="24" width="30" height="66" rx="11" fill={`url(#${id}-brillo)`} />
    </>
  );
}

/** El tablero de comandas: cuatro columnas con tarjetas */
function Comandas({ id }) {
  // x de la columna y alturas de las tarjetas que lleva
  const cols = [
    { x: 20, tarjetas: [14, 10] },
    { x: 44, tarjetas: [18] },
    { x: 68, tarjetas: [12, 14] },
    { x: 92, tarjetas: [10] },
  ];

  return (
    <>
      <Degradados id={id} tonos={G.naranja} />
      <Piso id={id} />

      {cols.map((c, n) => {
        // Se apilan de arriba hacia abajo, 5px de aire entre una y otra
        let y = 30;
        const rects = c.tarjetas.map((alto, k) => {
          const r = (
            <rect
              key={k}
              x={c.x + 1} y={y} width="14" height={alto} rx="4"
              fill={`url(#${id}-cara)`}
              opacity={k === 0 ? 1 : 0.7}
            />
          );
          y += alto + 5;
          return r;
        });

        return (
          <g key={c.x}>
            <rect
              x={c.x - 2} y="24" width="20" height="66" rx="7"
              fill={G.naranja[1]} opacity={n === 0 ? 0.22 : 0.13}
            />
            {rects}
          </g>
        );
      })}

      {/* La flecha que dice "esto se mueve de izquierda a derecha" */}
      <path d="M40 98 h40" stroke={G.naranja[2]} strokeWidth="2.5"
            strokeLinecap="round" opacity=".45" />
      <path d="M76 94 l5 4 -5 4" stroke={G.naranja[2]} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".45" />
    </>
  );
}

/** Lo que te falta: un anillo de progreso */
function Progreso({ id }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <>
      <Degradados id={id} tonos={G.verde} />
      <Piso id={id} />
      <circle cx="60" cy="56" r={r} fill="none" stroke={G.verde[0]} strokeWidth="13" opacity=".28" />
      <circle
        cx="60" cy="56" r={r} fill="none"
        stroke={`url(#${id}-canto)`} strokeWidth="13" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * 0.35}
        transform="rotate(-90 60 56)"
      />
      <circle cx="60" cy="56" r="19" fill={`url(#${id}-cara)`} />
      <path d="M52 56 l6 6 11-13" stroke="#fff" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="60" cy="56" r="19" fill={`url(#${id}-brillo)`} />
    </>
  );
}

/** Tura IA: una esfera con destellos */
function IA({ id }) {
  return (
    <>
      <Degradados id={id} tonos={G.morado} />
      <Piso id={id} />
      <circle cx="60" cy="56" r="30" fill={`url(#${id}-cara)`} />
      <circle cx="60" cy="56" r="30" fill={`url(#${id}-brillo)`} />
      {/* el destello de cuatro puntas, el gesto universal de "IA" */}
      <path d="M60 40 c2.5 9 4.5 11 13.5 13.5 -9 2.5-11 4.5-13.5 13.5 -2.5-9-4.5-11-13.5-13.5 9-2.5 11-4.5 13.5-13.5z"
            fill="#fff" opacity=".95" />
      <path d="M79 36 c1.2 4.3 2.2 5.3 6.5 6.5 -4.3 1.2-5.3 2.2-6.5 6.5 -1.2-4.3-2.2-5.3-6.5-6.5 4.3-1.2 5.3-2.2 6.5-6.5z"
            fill="#fff" opacity=".7" />
      <path d="M40 66 c1 3.4 1.8 4.2 5.2 5.2 -3.4 1-4.2 1.8-5.2 5.2 -1-3.4-1.8-4.2-5.2-5.2 3.4-1 4.2-1.8 5.2-5.2z"
            fill="#fff" opacity=".55" />
    </>
  );
}

/** Bienvenida: la fachada de una tienda */
function Tienda({ id }) {
  return (
    <>
      <Degradados id={id} tonos={G.naranja} />
      <Piso id={id} />
      {/* cuerpo */}
      <rect x="28" y="46" width="64" height="46" rx="8" fill={`url(#${id}-cara)`} />
      {/* toldo, a franjas */}
      <path d="M24 46 l7-16 h58 l7 16z" fill={`url(#${id}-canto)`} />
      {[0, 1, 2, 3].map((n) => (
        <path key={n} d={`M${31 + n * 16} 30 l-3.5 16 h9 l3-16z`} fill="#fff" opacity=".28" />
      ))}
      {/* puerta y ventana */}
      <rect x="52" y="64" width="16" height="28" rx="4" fill="#fff" opacity=".85" />
      <rect x="35" y="60" width="12" height="12" rx="3" fill="#fff" opacity=".55" />
      <rect x="73" y="60" width="12" height="12" rx="3" fill="#fff" opacity=".55" />
      <rect x="28" y="46" width="64" height="46" rx="8" fill={`url(#${id}-brillo)`} />
    </>
  );
}

/** Repartidor: casco y flecha de ruta */
function Ruta({ id }) {
  return (
    <>
      <Degradados id={id} tonos={G.verde} />
      <Piso id={id} />
      {/* la ruta */}
      <path d="M26 84 C26 58 52 66 58 48 C63 33 82 34 92 34"
            stroke={G.verde[0]} strokeWidth="7" strokeLinecap="round"
            fill="none" opacity=".38" strokeDasharray="1 13" />
      {/* pin de destino */}
      <path d="M88 20 a13 13 0 0 1 13 13 c0 9-13 21-13 21 s-13-12-13-21 a13 13 0 0 1 13-13z"
            fill={`url(#${id}-cara)`} transform="translate(-4,0)" />
      <circle cx="84" cy="33" r="5" fill="#fff" opacity=".9" />
      {/* casco */}
      <circle cx="34" cy="76" r="16" fill={`url(#${id}-cara)`} />
      <path d="M18 78 a16 16 0 0 1 32 0z" fill="#fff" opacity=".22" />
      <rect x="20" y="74" width="28" height="7" rx="3.5" fill="#fff" opacity=".85" />
      <circle cx="34" cy="76" r="16" fill={`url(#${id}-brillo)`} />
    </>
  );
}

const PIEZAS = {
  panel: Panel,
  menu: Menu,
  comandas: Comandas,
  progreso: Progreso,
  ia: IA,
  tienda: Tienda,
  ruta: Ruta,
};

/**
 * @param {string} arte  cuál pieza dibujar
 * @param {number} size  lado en píxeles
 */
export default function ArteRecorrido({ arte, size = 108 }) {
  const Pieza = PIEZAS[arte];
  if (!Pieza) return null;

  // El id tiene que ser único por pieza: dos SVG con degradados del
  // mismo id en la misma página hacen que el segundo use los del
  // primero, y sale todo del color equivocado.
  const id = `ta-${arte}`;

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <Pieza id={id} />
    </svg>
  );
}
