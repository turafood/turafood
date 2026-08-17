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
 * Va en verde, no en el naranja de la marca: el naranja está en todos
 * los botones de "agregar", y esta barra no agrega nada — te saca de
 * la tienda para pagar. Un color distinto evita que se toque por
 * inercia.
 *
 * Se esconde cuando hay una hoja abierta encima: se pisaba con el
 * formulario de dirección justo sobre los campos.
 */

import { usePathname, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useHydrated } from '@/lib/useHydrated';
import { cop } from '@/lib/format';
import { useDialogOpen } from '@/lib/useDialogOpen';

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
  const dialogOpen = useDialogOpen();

  // El carrito vive en localStorage: hasta que el navegador no monte,
  // no lo pintamos. Si no, el HTML del servidor no coincide.
  if (!hydrated || count === 0) return null;
  if (pathname === '/') return null;                                  // onboarding
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  if (dialogOpen) return null;

  return (
    <button
      onClick={() => router.push('/cart')}
      style={styles.pill}
      aria-label={`Ir a comprar, ${count} ${count === 1 ? 'producto' : 'productos'}, total ${cop(subtotal)}`}
    >
      <span style={styles.badge}>{count}</span>

      <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 800, lineHeight: 1.15 }}>
          Ir a comprar
        </span>
        <span
          className="tr1"
          style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.8)', marginTop: 2 }}
        >
          {businessName || `${count} ${count === 1 ? 'producto' : 'productos'} listos`}
        </span>
      </span>

      <span style={styles.total}>
        {cop(subtotal)}
        <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
      </span>
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
    // Verde y no el naranja de la marca a propósito: el naranja está en
    // todos los botones de "agregar", y esta barra no agrega nada — te
    // saca de la tienda para ir a pagar. Un color distinto evita que se
    // toque por inercia.
    background: 'linear-gradient(96deg, #12B972 0%, #0E9E5F 100%)',
    color: '#fff',
    boxShadow: '0 12px 30px rgba(14,158,95,.42), inset 0 1px 0 rgba(255,255,255,.22)',
    animation: 'up .22s ease both',
  },
  badge: {
    flex: 'none',
    minWidth: 28,
    height: 28,
    borderRadius: 10,
    background: 'rgba(255,255,255,.24)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13.5,
    fontWeight: 800,
  },
  total: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    flex: 'none',
    fontWeight: 800,
    fontSize: 15.5,
  },
};
