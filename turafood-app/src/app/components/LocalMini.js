'use client';

/**
 * EL LOCALITO DE LA BARRA
 *
 * Donde va la foto del negocio, mientras no haya foto.
 *
 * Antes era un cuadrado gris plano —`background: var(--faint)`— que
 * es exactamente el hueco que se ve cuando algo está sin terminar. Y
 * la mayoría de los negocios nuevos no suben foto en los primeros
 * días, así que ese gris es lo primero que ven cada vez que abren.
 *
 * Ahora es una fachada en volumen, con el toldo del color de su
 * nicho: una pizzería lo ve rojo, una droguería azul, una licorería
 * morado. No reemplaza la foto —cuando la suban, manda la foto— pero
 * mientras tanto el rincón se ve armado en vez de vacío.
 *
 * Es SVG, así que a 44px o a 96px se ve igual de nítido, y pesa
 * menos que el atributo `style` que tenía antes.
 */

/** El toldo toma el color del nicho. Si no hay nicho, el de la marca. */
const TOLDO = {
  comidas_rapidas: ['#FFD08A', '#F59E0B'],
  farmacia:        ['#8FD6FF', '#0E7490'],
  licores:         ['#C9A7FF', '#7C3AED'],
  turbo:           ['#FDE68A', '#D97706'],
  turapp:          ['#86EFAC', '#15803D'],
};

const POR_DEFECTO = ['#FFB57A', '#FF7A4D'];

export default function LocalMini({ nicho, size = 44, radius = 12 }) {
  const [claro, oscuro] = TOLDO[nicho] ?? POR_DEFECTO;

  // Un id por nicho: dos SVG con degradados del mismo id en la misma
  // página hacen que el segundo use los del primero.
  const id = `lm-${nicho ?? 'def'}`;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', borderRadius: radius, flex: 'none' }}
    >
      <defs>
        <linearGradient id={`${id}-cielo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={claro} stopOpacity=".28" />
          <stop offset="100%" stopColor={oscuro} stopOpacity=".10" />
        </linearGradient>
        <linearGradient id={`${id}-toldo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={claro} />
          <stop offset="100%" stopColor={oscuro} />
        </linearGradient>
        <linearGradient id={`${id}-muro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset="100%" stopColor="#E9E3DC" stopOpacity=".95" />
        </linearGradient>
      </defs>

      {/* el fondo, tintado con el color del nicho */}
      <rect width="64" height="64" rx={radius} fill={`url(#${id}-cielo)`} />

      {/* el muro */}
      <path d="M14 30 h36 v22 a2 2 0 0 1-2 2 H16 a2 2 0 0 1-2-2z" fill={`url(#${id}-muro)`} />

      {/* el toldo, con su vuelo */}
      <path d="M11 30 l4-9 h34 l4 9z" fill={`url(#${id}-toldo)`} />
      {/* las franjas del toldo, que es lo que lo hace leer como toldo */}
      {[0, 1, 2, 3].map((n) => (
        <path
          key={n}
          d={`M${15 + n * 9.6} 21 l-2 9 h5.4 l1.8-9z`}
          fill="#fff"
          opacity=".34"
        />
      ))}

      {/* la puerta y las vitrinas */}
      <rect x="27" y="38" width="10" height="16" rx="2" fill={oscuro} opacity=".78" />
      <rect x="18" y="36" width="6" height="6" rx="1.5" fill={oscuro} opacity=".34" />
      <rect x="40" y="36" width="6" height="6" rx="1.5" fill={oscuro} opacity=".34" />

      {/* el brillo del vidrio, arriba a la izquierda */}
      <path d="M14 30 h36 v3 H14z" fill="#fff" opacity=".5" />
    </svg>
  );
}
