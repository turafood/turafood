'use client';

/**
 * Estado que comparten todas las pantallas del negocio: la ficha del
 * negocio, los pedidos vivos (que alimentan los contadores del menú) y
 * el avisador de abajo.
 */

import { createContext, useContext } from 'react';

export const BizContext = createContext({
  business: null,
  loading: true,
  error: null,
  orders: [],
  newCount: 0,
  pendingReviews: 0,
  setPendingReviews: () => {},
  reloadOrders: () => {},
  refreshBusiness: () => {},
  toast: () => {},
});

export const useBiz = () => useContext(BizContext);
