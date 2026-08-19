'use client';

/**
 * LOS ICONOS DE LAS PREGUNTAS DEL ARRANQUE
 *
 * Reemplazan a los emojis que había antes. Tres razones, en orden de
 * peso:
 *
 *   1. Los emojis los pinta el sistema operativo, no nosotros. En un
 *      Android viejo —el teléfono de medio Buenaventura— varios salen
 *      como un cuadrito ▯. Justo en la primera pantalla que ve
 *      alguien que está decidiendo si esto le sirve.
 *
 *   2. Cada plataforma los dibuja distinto. El mismo 🍔 es plano en
 *      Android, brillante en iPhone y otra cosa en Windows. La
 *      pantalla se veía de tres apps distintas según el aparato.
 *
 *   3. No se pueden colorear. Un emoji ignora el tema, así que en
 *      modo oscuro quedaban como estampillas pegadas encima.
 *
 * CÓMO ESTÁN HECHOS
 *
 * Una baldosa con degradado y luz arriba —eso da el volumen— y encima
 * un dibujo simple en blanco. Toda la personalidad la carga el color
 * de la baldosa: la pizzería es roja, la droguería azul, los licores
 * morados. Se reconocen por color antes de leer el nombre.
 *
 * Los que no son nichos usan un icono de Material Symbols sobre la
 * misma baldosa: la fuente ya está cargada, así que no cuesta nada, y
 * el conjunto se ve de la misma familia.
 */

/** [claro, oscuro] de cada baldosa */
const TONO = {
  comidas_rapidas: ['#FFD08A', '#F59E0B'],
  farmacia:        ['#8FD6FF', '#0E7490'],
  licores:         ['#C9A7FF', '#7C3AED'],
  turbo:           ['#FDE68A', '#D97706'],
  turapp:          ['#86EFAC', '#15803D'],

  // El resto de las preguntas
  neutro:          ['#B9C4D6', '#5B6B85'],
  bueno:           ['#8FE3B0', '#059669'],
  ojo:             ['#FFD08A', '#D97706'],
  frio:            ['#9DC9FF', '#2563EB'],
};

/**
 * El dibujo de cada nicho. Coordenadas sobre un lienzo de 44×44, con
 * el motivo centrado en un cuadro de 24 para que todos pesen igual.
 */
const DIBUJO = {
  // Papas fritas en su cono
  comidas_rapidas: (
    <>
      <path d="M15 20 h14 l-2.2 12.5 a2 2 0 0 1-2 1.7 h-5.6 a2 2 0 0 1-2-1.7z" fill="#fff" opacity=".95" />
      <rect x="17" y="10" width="3" height="11" rx="1.5" fill="#fff" opacity=".75" />
      <rect x="21" y="8" width="3" height="13" rx="1.5" fill="#fff" opacity=".9" />
      <rect x="25" y="11" width="3" height="10" rx="1.5" fill="#fff" opacity=".75" />
      <rect x="15" y="21" width="14" height="3" fill="#fff" opacity=".55" />
    </>
  ),
  // Cápsula
  farmacia: (
    <>
      <rect x="11" y="18" width="22" height="11" rx="5.5" fill="#fff" opacity=".95" transform="rotate(-35 22 23.5)" />
      <path d="M22 23.5 l-8 5.6" stroke={TONO.farmacia[1]} strokeWidth="2.2" transform="rotate(-35 22 23.5)" opacity=".9" />
      <circle cx="30" cy="31" r="4.5" fill="#fff" opacity=".7" />
      <path d="M30 28.6 v4.8 M27.6 31 h4.8" stroke={TONO.farmacia[1]} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  // Botella
  licores: (
    <>
      <path d="M19 9 h6 v6 l3.5 5 a5 5 0 0 1 .8 2.7 V32 a3 3 0 0 1-3 3 h-8.6 a3 3 0 0 1-3-3 V22.7 a5 5 0 0 1 .8-2.7 L19 15z" fill="#fff" opacity=".95" />
      <rect x="15" y="24" width="14" height="6" rx="1.5" fill={TONO.licores[1]} opacity=".8" />
      <rect x="19.5" y="7" width="5" height="3" rx="1" fill="#fff" opacity=".7" />
    </>
  ),
};

export default function IconoArranque({ id, ms, tono = 'neutro', size = 40 }) {
  const [claro, oscuro] = TONO[id] ?? TONO[tono] ?? TONO.neutro;
  const uid = `ia-${id ?? ms ?? 'x'}`;
  const dibujo = DIBUJO[id];

  return (
    <span
      style={{
        position: 'relative', flex: 'none',
        width: size, height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg viewBox="0 0 44 44" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`${uid}-t`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={claro} />
            <stop offset="100%" stopColor={oscuro} />
          </linearGradient>
          {/* La luz de arriba: es lo que le da el volumen a la baldosa */}
          <linearGradient id={`${uid}-l`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity=".34" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="44" height="44" rx="13" fill={`url(#${uid}-t)`} />
        <rect width="44" height="44" rx="13" fill={`url(#${uid}-l)`} />
        {dibujo}
      </svg>

      {/* Los que no son nichos usan la fuente de iconos, que ya está
          cargada. Va encima de la misma baldosa para que el conjunto
          se vea de la misma familia. */}
      {!dibujo && ms && (
        <span
          className="ms"
          style={{
            position: 'absolute', fontSize: size * 0.5, color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,.18)',
          }}
        >
          {ms}
        </span>
      )}
    </span>
  );
}
