'use client';

import { createContext, useContext } from 'react';

/** Estado que comparten todas las pantallas del repartidor */
export const RiderContext = createContext({
  courier: null,
  loading: true,
  error: null,
  active: null,
  online: false,
  setOnline: () => {},
  reloadActive: () => {},
  toast: () => {},
});

export const useRider = () => useContext(RiderContext);
