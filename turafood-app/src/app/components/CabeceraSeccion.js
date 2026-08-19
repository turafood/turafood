'use client';

/**
 * LA CABECERA DE CADA SECCIÓN
 *
 * Una franja delgada arriba de la pantalla, con una escena y una
 * frase. Existe porque un panel de puras tablas y switches se siente
 * una hoja de cálculo, y el dueño de un asadero no abrió esto para
 * usar una hoja de cálculo.
 *
 * SOBRE LAS FOTOS DE PERSONAS
 *
 * Se pidieron imágenes con gente. No las hay: en `public/images` solo
 * hay fotos de comida, y no se pueden inventar ni descargar personas
 * — una foto de banco de imágenes con una modelo sonriendo delante de
 * un mostrador que no es el suyo se nota, y hace ver la app menos
 * seria, no más.
 *
 * Así que la escena se dibuja: figuras humanas simples en SVG, con el
 * volumen y los degradados del resto de la app. Un repartidor en su
 * moto, una pareja pidiendo, alguien atendiendo el mostrador. Se ven
 * como parte del producto y no como una foto pegada encima.
 *
 * Cuando haya fotos de verdad —del puerto, de negocios reales— esto
 * acepta una: se le pasa `foto` y usa esa en vez del dibujo.
 *
 * SUTIL, NO PROTAGONISTA
 *
 * 132px de alto en celular. La escena vive a la derecha y difuminada
 * contra el fondo, para que el texto siempre gane. Si compite con lo
 * que hay debajo, estorba.
 */

import EscenaSeccion from './EscenaSeccion';

export default function CabeceraSeccion({
  escena,
  titulo,
  texto,
  etiqueta,
  foto,
  accion,
}) {
  return (
    <section
      className="cabecera-seccion"
      style={{
        ...S.caja,
        // Con foto real, la foto manda y el texto va sobre un velo.
        ...(foto ? { backgroundImage: `url('${foto}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : null),
      }}
    >
      {foto && <span style={S.velo} aria-hidden="true" />}

      <span style={S.brillo} aria-hidden="true" />

      <div style={S.texto}>
        {etiqueta && <span style={S.etiqueta}>{etiqueta}</span>}
        <h2 style={S.titulo}>{titulo}</h2>
        {texto && <p style={S.bajada}>{texto}</p>}
        {accion}
      </div>

      {!foto && (
        <span className="cabecera-escena" style={S.escena} aria-hidden="true">
          <EscenaSeccion nombre={escena} />
        </span>
      )}
    </section>
  );
}

const S = {
  caja: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 24, padding: 20,
    minHeight: 132,
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'linear-gradient(140deg, var(--ink) 0%, var(--ink2) 74%)',
    color: 'var(--onInk)',
  },
  velo: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(100deg, var(--ink) 12%, color-mix(in srgb, var(--ink) 62%, transparent) 58%, transparent 100%)',
  },
  brillo: {
    position: 'absolute', right: -60, top: -80, width: 220, height: 220,
    borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, color-mix(in srgb, var(--primary) 30%, transparent), transparent 70%)',
  },

  texto: { position: 'relative', flex: 1, minWidth: 0 },
  etiqueta: {
    display: 'block', fontSize: 10, fontWeight: 800,
    letterSpacing: '.1em', color: 'var(--primary)', marginBottom: 7,
  },
  titulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, lineHeight: 1.22, letterSpacing: '-.02em',
  },
  bajada: {
    margin: '7px 0 0', fontSize: 13, lineHeight: 1.55,
    color: 'var(--inkSoft)', maxWidth: 460,
  },

  escena: {
    position: 'relative', flex: 'none',
    display: 'flex', alignItems: 'flex-end',
  },
};
