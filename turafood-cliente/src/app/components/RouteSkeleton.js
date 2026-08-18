'use client';

/**
 * ESQUELETO MIENTRAS RESUELVE LA RUTA
 *
 * Varias pantallas leen la URL con `useSearchParams`, que obliga a
 * envolverlas en un `Suspense`. El fallback era `null`: mientras React
 * resolvía el límite, la pantalla quedaba en blanco —sin cabecera, sin
 * nada— y en una conexión lenta eso se lee como que la app se cayó.
 *
 * Esto pone en su lugar la forma de lo que viene. No es fiel a cada
 * pantalla a propósito: una barra arriba y unos bloques abajo bastan
 * para que el ojo entienda que algo está llegando.
 */

export default function RouteSkeleton({ rows = 4, height = 96 }) {
  return (
    <div style={S.wrap} aria-busy="true" aria-label="Cargando">
      <span className="sk" style={{ ...S.bar, width: '52%' }} />
      <span className="sk" style={{ ...S.bar, width: '34%', height: 14 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
        {Array.from({ length: rows }, (_, i) => (
          <span key={i} className="sk" style={{ display: 'block', height, borderRadius: 18 }} />
        ))}
      </div>
    </div>
  );
}

const S = {
  wrap: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '20px', background: 'var(--bg)', minHeight: 0,
  },
  bar: {
    display: 'block', height: 22, borderRadius: 9, marginBottom: 10,
  },
};
