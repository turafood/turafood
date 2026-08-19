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
  hamburgueseria:  ['#FFB57A', '#E2360F'],
  pizzeria:        ['#FF8A5C', '#C2410C'],
  comida_mar:      ['#8ECBFF', '#2E6BFF'],
  asadero:         ['#FF9A6C', '#B91C1C'],
  cafeteria:       ['#C9A27A', '#7C4A1E'],
  mercado:         ['#8FE3B0', '#059669'],
  farmacia:        ['#8FD6FF', '#0E7490'],
  licores:         ['#C9A7FF', '#7C3AED'],
  sexshop:         ['#FFA6D2', '#DB2777'],
  tienda:          ['#FFC49A', '#EA580C'],

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
  // Hamburguesa de tres pisos
  hamburgueseria: (
    <>
      <path d="M13 20 a9 6 0 0 1 18 0z" fill="#fff" opacity=".95" />
      <rect x="12.5" y="21" width="19" height="3.4" rx="1.7" fill="#fff" opacity=".6" />
      <rect x="12.5" y="25.4" width="19" height="3.6" rx="1.8" fill="#fff" opacity=".85" />
      <path d="M13 30 h18 a5 5 0 0 1-5 4 H18 a5 5 0 0 1-5-4z" fill="#fff" opacity=".95" />
      <circle cx="19" cy="17" r="1" fill="#fff" opacity=".5" />
      <circle cx="25" cy="16" r="1" fill="#fff" opacity=".5" />
    </>
  ),
  // Porción de pizza
  pizzeria: (
    <>
      <path d="M22 9 l10 24 a26 26 0 0 1-20 0z" fill="#fff" opacity=".95" />
      <path d="M12 33 a26 26 0 0 0 20 0 l-1.6-4 a21 21 0 0 1-16.8 0z" fill="#fff" opacity=".6" />
      <circle cx="22" cy="20" r="2" fill={TONO.pizzeria[1]} />
      <circle cx="18" cy="27" r="1.7" fill={TONO.pizzeria[1]} />
      <circle cx="26" cy="27" r="1.7" fill={TONO.pizzeria[1]} />
    </>
  ),
  // Camarón
  comida_mar: (
    <>
      <path d="M14 18 q10-5 16 2 q4 7-2 11 q-8 5-14-2 q-3-4 0-8z" fill="#fff" opacity=".95" />
      <path d="M18 31 q3 4 8 3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".7" />
      <circle cx="17" cy="21" r="1.5" fill={TONO.comida_mar[1]} />
      <path d="M13 17 l-3-3 M13 19 l-4-1" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />
    </>
  ),
  // Muslo de pollo
  asadero: (
    <>
      <path d="M27 11 a7 7 0 0 1 5 11 q-3 3-7 3 l-6 6 a3 3 0 0 1-5-4 l6-6 q0-4 3-7 a7 7 0 0 1 4-3z" fill="#fff" opacity=".95" />
      <rect x="12" y="28" width="4" height="7" rx="2" fill="#fff" opacity=".7" transform="rotate(45 14 31)" />
    </>
  ),
  // Taza con vapor
  cafeteria: (
    <>
      <path d="M13 19 h15 v9 a6 6 0 0 1-6 6 h-3 a6 6 0 0 1-6-6z" fill="#fff" opacity=".95" />
      <path d="M28 21 h2.5 a3.5 3.5 0 0 1 0 7 H28" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      <path d="M17 15 q2-3 0-5 M22 15 q2-3 0-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".65" />
    </>
  ),
  // Bolsa de mercado con una hoja
  mercado: (
    <>
      <path d="M13 17 h18 l-1.6 16 a3 3 0 0 1-3 2.6 H17.6 a3 3 0 0 1-3-2.6z" fill="#fff" opacity=".95" />
      <path d="M18 17 v-2.5 a4 4 0 0 1 8 0 V17" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      <path d="M22 22 q5 1 4 7 q-6 0-4-7z" fill={TONO.mercado[1]} opacity=".85" />
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
  // Regalo
  sexshop: (
    <>
      <rect x="12" y="20" width="20" height="15" rx="2.5" fill="#fff" opacity=".95" />
      <rect x="11" y="16" width="22" height="5" rx="2" fill="#fff" opacity=".8" />
      <rect x="20.5" y="16" width="3" height="19" fill={TONO.sexshop[1]} opacity=".8" />
      <path d="M22 16 q-5-6-7-2 q-1 3 7 2z M22 16 q5-6 7-2 q1 3-7 2z" fill="#fff" opacity=".85" />
    </>
  ),
  // Fachada
  tienda: (
    <>
      <path d="M11 20 l3-6 h16 l3 6z" fill="#fff" opacity=".85" />
      <rect x="13" y="20" width="18" height="15" rx="2" fill="#fff" opacity=".95" />
      <rect x="19" y="25" width="6" height="10" rx="1.5" fill={TONO.tienda[1]} opacity=".8" />
      <rect x="15" y="24" width="3" height="3" rx="1" fill={TONO.tienda[1]} opacity=".5" />
      <rect x="26" y="24" width="3" height="3" rx="1" fill={TONO.tienda[1]} opacity=".5" />
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
