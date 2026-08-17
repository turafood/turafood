'use client';

/**
 * CARRITO FLOTANTE
 *
 * Píldora fija sobre la barra inferior con la cantidad y el total,
 * al estilo del "View Cart" de Rappi. Aparece en cualquier pantalla
 * apenas hay algo en la canasta y desaparece en las pantallas donde
 * estorbaría (la canasta misma, el checkout y el producto, que ya
 * tienen su propia barra de acción).
 *
 * Mantiene la estética de Tura: color primario, radio 999 y la
 * sombra naranja del sistema de diseño, no el verde de Rappi.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/lib/useHydrated';
import { cop } from '@/lib/format';

/**
 * Rutas donde no se pinta:
 *   · las que ya tienen su propia barra inferior de acción;
 *   · el onboarding y el login, donde quedaba flotando encima del
 *     formulario sin nada que ver con lo que la persona está haciendo
 *     (pasa al entrar por "Explorar sin registrarme" y volver a la
 *     pantalla de acceso con el carrito ya lleno).
 */
const HIDDEN_ON = ['/cart', '/checkout', '/product', '/tracking', '/rate', '/auth'];

export default function FloatingCart() {
  const router = useRouter();
  const pathname = usePathname();

  const count = useCartStore((s) => s.getTotalItems());
  const subtotal = useCartStore((s) => s.getSubtotal());
  const businessName = useCartStore((s) => s.businessName);
  const hydrated = useHydrated();

  // El carrito vive en localStorage: hasta que el navegador no monte,
  // no lo pintamos. Si no, el HTML del servidor no coincide.
  if (!hydrated || count === 0) return null;
  if (pathname === '/') return null;                                  // onboarding
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <button
      onClick={() => router.push('/cart')}
      style={styles.pill}
      aria-label={`Ver canasta, ${count} ${count === 1 ? 'producto' : 'productos'}, total ${cop(subtotal)}`}
    >
      <span style={styles.badge}>{count}</span>

      <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, lineHeight: 1.15 }}>
          Ver canasta
        </span>
        {businessName && (
          <span
            className="tr1"
            style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 1 }}
          >
            {businessName}
          </span>
        )}
      </span>

      <span style={{ fontWeight: 800, fontSize: 15.5, flex: 'none' }}>{cop(subtotal)}</span>
    </button>
  );
}

const styles = {
  pill: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 84,
    zIndex: 70,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    height: 58,
    padding: '0 18px',
    borderRadius: 999,
    background: 'var(--primary)',
    color: '#fff',
    boxShadow: '0 12px 28px rgba(255,68,31,.38)',
    animation: 'up .22s ease both',
  },
  badge: {
    flex: 'none',
    minWidth: 26,
    height: 26,
    borderRadius: 9,
    background: 'rgba(255,255,255,.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
  },
};
