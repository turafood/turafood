'use client';

/**
 * LAS MARCAS DE CADA MEDIO DE PAGO
 *
 * SOBRE LOS LOGOS: esto NO son los logos de Nequi, Daviplata ni
 * WhatsApp. Son iconos propios pintados con los colores de cada marca.
 *
 * La diferencia importa. Un logo es una marca registrada: copiarlo a
 * mano en SVG es reproducirlo, y eso necesita permiso de cada empresa
 * — permiso que además viene con reglas de uso (tamaños mínimos,
 * espacio libre alrededor, fondos permitidos) que nadie va a respetar
 * si el logo está dibujado a mano dentro del código.
 *
 * El color sí es libre y es lo que la gente reconoce primero: el verde
 * de WhatsApp y el morado oscuro de Nequi se identifican antes de leer
 * el nombre. Con el color de la marca más el nombre escrito al lado,
 * nadie se confunde.
 *
 * SI SE QUIEREN LOS LOGOS DE VERDAD: se bajan de la sala de prensa de
 * cada una, se guardan en `public/marcas/` y se cambia el `<svg>` por
 * un `<Image>`. La estructura de acá abajo ya queda lista para eso.
 */

/* Colores oficiales de cada marca. Son datos públicos, no la marca. */
const COLOR = {
  whatsapp: { fondo: '#25D366', tinta: '#fff' },
  nequi:    { fondo: '#1E0F3C', tinta: '#FF2D78' },
  daviplata:{ fondo: '#E4002B', tinta: '#fff' },
  efectivo: { fondo: '#0B7A48', tinta: '#fff' },
  tarjeta:  { fondo: '#1B4F8F', tinta: '#fff' },
};

/** El cuadrado redondeado que hace de base, con luz arriba */
function Base({ id, color, children }) {
  return (
    <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity=".22" />
          <stop offset="100%" stopColor="#000" stopOpacity=".14" />
        </linearGradient>
      </defs>
      <rect width="44" height="44" rx="13" fill={color.fondo} />
      <rect width="44" height="44" rx="13" fill={`url(#${id}-b)`} />
      {children}
    </svg>
  );
}

/** Burbuja de chat con auricular: el gesto de "mensajería", no el logo */
export function IconoWhatsapp() {
  const c = COLOR.whatsapp;
  return (
    <Base id="ip-wa" color={c}>
      <path
        d="M22 11c-6.1 0-11 4.6-11 10.3 0 2 .6 3.9 1.7 5.5L11 33l6.5-1.6c1.4.7 3 1.1 4.5 1.1 6.1 0 11-4.6 11-10.3S28.1 11 22 11z"
        fill={c.tinta}
      />
      <path
        d="M18.6 17.4c-.3-.6-.5-.6-.8-.6h-.6c-.2 0-.6.1-.9.4-.3.4-1.1 1.1-1.1 2.6s1.1 3 1.3 3.2c.2.2 2.2 3.4 5.4 4.7 2.7 1 3.2.8 3.8.8.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4l-2.1-1c-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.3.3-.6.1-.3-.1-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-.9-2z"
        fill={c.fondo}
      />
    </Base>
  );
}

/** Transferencia: dos flechas que se cruzan */
export function IconoTransferencia() {
  const c = COLOR.nequi;
  return (
    <Base id="ip-tr" color={c}>
      <path d="M15 18h13l-3.2-3.2" stroke={c.tinta} strokeWidth="2.6"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M29 26H16l3.2 3.2" stroke="#4DD6E3" strokeWidth="2.6"
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Base>
  );
}

/** Efectivo: un billete */
export function IconoEfectivo() {
  const c = COLOR.efectivo;
  return (
    <Base id="ip-ef" color={c}>
      <rect x="10" y="15" width="24" height="14" rx="3" fill={c.tinta} opacity=".95" />
      <circle cx="22" cy="22" r="4" fill={c.fondo} />
      <circle cx="14.5" cy="22" r="1.3" fill={c.fondo} opacity=".5" />
      <circle cx="29.5" cy="22" r="1.3" fill={c.fondo} opacity=".5" />
    </Base>
  );
}

/** Tarjeta: plástico con banda */
export function IconoTarjeta() {
  const c = COLOR.tarjeta;
  return (
    <Base id="ip-ta" color={c}>
      <rect x="10" y="14" width="24" height="16" rx="3.5" fill={c.tinta} opacity=".95" />
      <rect x="10" y="18.5" width="24" height="3.5" fill={c.fondo} />
      <rect x="13" y="25" width="7" height="2.2" rx="1.1" fill={c.fondo} opacity=".55" />
    </Base>
  );
}

/** Punto de color de cada billetera, para las filas de adentro */
export function PuntoMarca({ marca }) {
  const c = COLOR[marca] ?? COLOR.nequi;
  return (
    <span
      aria-hidden="true"
      style={{
        width: 26, height: 26, borderRadius: 9, flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: c.fondo, color: c.tinta,
        fontSize: 12, fontWeight: 800, letterSpacing: '-.02em',
      }}
    >
      {marca === 'nequi' ? 'N' : 'D'}
    </span>
  );
}
