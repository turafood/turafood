'use client';

/**
 * LA RAÍZ: NO HAY PUERTA
 *
 * Antes esto era un onboarding de cuatro pasos —bienvenida, términos,
 * celular, código— antes de dejar ver una sola hamburguesa. Quien
 * llega a turafood.com no viene a registrarse, viene a ver qué hay de
 * comer.
 *
 * Ahora entra derecho al catálogo. La cuenta se pide más adelante, y
 * solo cuando hace falta: al guardar una dirección o al hacer el
 * pedido. Y ni siquiera ahí es un muro — la sesión se abre sola sin
 * pedirle nada (ver src/lib/sesion.js).
 *
 * `replace` y no `push` a propósito: así el botón de atrás del
 * navegador no lo devuelve a una pantalla que no vio.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RaizPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  // Un instante, mientras el navegador cambia de ruta. Con la forma de
  // lo que viene, no un spinner: el salto se siente menor.
  return (
    <div style={S.wrap} aria-busy="true" aria-label="Abriendo TuraFood">
      <span className="sk" style={{ ...S.bar, width: '55%', height: 26 }} />
      <span className="sk" style={{ ...S.bar, width: '35%', height: 15 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="sk" style={{ display: 'block', height: 104, borderRadius: 18 }} />
        ))}
      </div>
    </div>
  );
}

const S = {
  wrap: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: 20, background: 'var(--bg)', minHeight: '100dvh',
  },
  bar: { display: 'block', borderRadius: 9, marginBottom: 10 },
};
