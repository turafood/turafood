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

/** [luz neon, borde] de cada baldosa */
const TONO = {
  comidas_rapidas: ['#F59E0B', 'rgba(245,158,11,0.3)'],
  farmacia:        ['#0EA5E9', 'rgba(14,165,233,0.3)'],
  licores:         ['#8B5CF6', 'rgba(139,92,246,0.3)'],
  turbo:           ['#F59E0B', 'rgba(245,158,11,0.3)'],
  turapp:          ['#10B981', 'rgba(16,185,129,0.3)'],

  // El resto de las preguntas
  neutro:          ['#94A3B8', 'rgba(148,163,184,0.3)'],
  bueno:           ['#10B981', 'rgba(16,185,129,0.3)'],
  ojo:             ['#F59E0B', 'rgba(245,158,11,0.3)'],
  frio:            ['#3B82F6', 'rgba(59,130,246,0.3)'],
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
            <stop offset="0%" stopColor={claro} stopOpacity="0.2" />
            <stop offset="100%" stopColor={claro} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        <rect width="44" height="44" rx="14" fill={`url(#${uid}-t)`} stroke={oscuro} strokeWidth="1.5" />
        {/* Glow sutil central */}
        <circle cx="22" cy="22" r="14" fill={claro} opacity="0.15" filter="blur(6px)" />
        
        {/* Hacemos que el dibujo tenga el color neon claro en vez de blanco opaco */}
        <g fill={claro} stroke={claro}>
          {dibujo}
        </g>
      </svg>

      {/* Los que no son nichos usan la fuente de iconos, que ya está
          cargada. Va encima de la misma baldosa para que el conjunto
          se vea de la misma familia. */}
      {!dibujo && ms && (
        <span
          className="ms"
          style={{
            position: 'absolute', fontSize: size * 0.55, color: claro,
            textShadow: `0 0 10px ${claro}88`,
          }}
        >
          {ms}
        </span>
      )}
    </span>
  );
}
