'use client';

/**
 * CANASTA Y CHECKOUT UNIFICADOS (SUPER CHECKOUT)
 * Redirige instantáneamente al Super Checkout unificado de 2 columnas.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RouteSkeleton from '../components/RouteSkeleton';

export default function CartPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/checkout');
  }, [router]);

  return <RouteSkeleton rows={4} height={60} />;
}
