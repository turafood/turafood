'use client';

/**
 * ARMAZÓN DE LA APP DEL REPARTIDOR
 * Conversión del marco del mockup del Repartidor: columna de celular,
 * barra de pestañas flotante (línea 821), botón de Tura IA (línea 754)
 * y avisos (línea 834).
 *
 * Además es quien reporta la ubicación mientras hay una entrega en
 * curso: el cliente ve moverse el punto en su seguimiento.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  getMyCourier, getActiveOrder, setCourierStatus, pushLocation,
} from '@/lib/repartidor';
import { RiderContext } from './RiderContext';
import TuraIARider from './TuraIARider';
import ProgresoCuenta from '../components/ProgresoCuenta';

const TABS = [
  { label: 'Inicio', icon: 'home', href: '/repartidor' },
  { label: 'Ganancias', icon: 'payments', href: '/repartidor/ganancias' },
  { label: 'Entregas', icon: 'receipt_long', href: '/repartidor/entregas' },
  { label: 'Cuenta', icon: 'person', href: '/repartidor/cuenta' },
];

/** Pantallas a pantalla completa: sin pestañas ni botón de IA */
const FULLSCREEN = ['/repartidor/activo', '/repartidor/chat', '/repartidor/entrega'];

export default function RiderShell({ children }) {
  const path = usePathname();

  const [courier, setCourier] = useState(null);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  /**
   * Lo que le falta para quedar activo. Cada paso se decide mirando el
   * dato, no una casilla que alguien marca a mano.
   */
  const pasosRepartidor = [
    {
      id: 'datos', icono: 'badge',
      titulo: 'Completa tus datos',
      detalle: 'Tu nombre y tu celular, para que el cliente sepa quién llega',
      href: '/repartidor/cuenta',
      cta: 'Completar',
      hecho: Boolean(courier?.profile?.full_name && courier?.profile?.phone),
    },
    {
      id: 'vehiculo', icono: 'two_wheeler',
      titulo: 'Registra tu vehículo',
      detalle: 'Moto, bici o carro — y la placa si aplica',
      href: '/repartidor/cuenta',
      cta: 'Registrar',
      hecho: Boolean(courier?.vehicle_type && courier?.plate),
    },
    {
      id: 'documentos', icono: 'verified_user',
      titulo: 'Sube tus documentos',
      detalle: 'Cédula, licencia, SOAT y tecnomecánica',
      href: '/repartidor/cuenta',
      cta: 'Subirlos',
      hecho: courier?.approval_status === 'active',
    },
  ];

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => setToastMsg(''), 2200);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = await getMyCourier();
        if (!alive) return;
        setCourier(c);
        if (c) setActive(await getActiveOrder(c.id));
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const reloadActive = useCallback(async () => {
    if (!courier) return;
    try {
      setActive(await getActiveOrder(courier.id));
    } catch (err) {
      setError(err.message);
    }
  }, [courier]);

  const online = courier?.status === 'online';

  const setOnline = useCallback(async (next) => {
    if (!courier) return;
    setCourier((c) => ({ ...c, status: next ? 'online' : 'offline' }));
    try {
      await setCourierStatus(courier.id, next ? 'online' : 'offline');
      toast(next ? 'Estás en línea' : 'Te desconectaste');
    } catch (err) {
      setCourier((c) => ({ ...c, status: next ? 'offline' : 'online' }));
      setError(err.message);
    }
  }, [courier, toast]);

  /**
   * Ubicación en vivo mientras hay una entrega. Se apaga sola al
   * terminar: no tiene sentido seguir a alguien que no está repartiendo.
   */
  useEffect(() => {
    if (!courier || !active || typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        pushLocation(courier.id, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
      },
      () => {},   // sin permiso de ubicación la app sigue funcionando
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [courier, active]);

  const fullscreen = useMemo(() => FULLSCREEN.includes(path), [path]);

  const ctx = { courier, loading, error, active, online, setOnline, reloadActive, toast };

  return (
    <RiderContext.Provider value={ctx}>
      <div className="rider-frame">
        {error && !fullscreen && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {!fullscreen && (
          <div style={{ padding: '0 20px' }}>
            <ProgresoCuenta
              titulo="Termina de activar tu cuenta"
              verificado={courier?.approval_status === 'active'}
              pasos={pasosRepartidor}
            />
          </div>
        )}

        {children}

        {!fullscreen && !aiOpen && (
          <button onClick={() => setAiOpen(true)} style={S.aiFab}>
            <span className="ms ms-fill" style={{ fontSize: 21, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em' }}>Tura IA</span>
          </button>
        )}

        <TuraIARider open={aiOpen} onClose={() => setAiOpen(false)} />

        {!fullscreen && (
          <nav style={S.tabsWrap}>
            <div style={S.tabs}>
              {TABS.map((t) => {
                const on = t.href === '/repartidor'
                  ? path === '/repartidor'
                  : path.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    style={{
                      ...S.tab,
                      background: on ? '#FDF0EA' : 'transparent',
                      color: on ? 'var(--primary)' : 'var(--muted)',
                    }}
                  >
                    <span className={`ms${on ? ' ms-fill' : ''}`} style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700 }}>{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {toastMsg && (
          <div style={S.toast}>
            <span className="ms" style={{ fontSize: 20, color: 'var(--green)' }}>check_circle</span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{toastMsg}</span>
          </div>
        )}
      </div>
    </RiderContext.Provider>
  );
}

const S = {
  error: {
    display: 'flex', alignItems: 'center', gap: 9, margin: '12px 20px 0', padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  aiFab: {
    position: 'absolute', right: 16, bottom: 104, zIndex: 70,
    display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 18px 0 15px',
    borderRadius: 999, background: 'linear-gradient(135deg,#2A2620,#17140F)', color: '#fff',
    boxShadow: '0 12px 30px rgba(20,16,10,.34)', animation: 'pop .3s ease',
  },
  tabsWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    display: 'flex', alignItems: 'center', padding: '8px 14px 20px',
    pointerEvents: 'none', zIndex: 80,
  },
  tabs: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 60, borderRadius: 999, background: 'rgba(255,255,255,.9)',
    backdropFilter: 'blur(16px)', border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)', padding: '0 6px', pointerEvents: 'auto',
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 2, height: 48, borderRadius: 999, textDecoration: 'none',
  },
  toast: {
    position: 'absolute', left: 20, right: 20, bottom: 96, zIndex: 110,
    display: 'flex', alignItems: 'center', gap: 10, background: '#17140F', color: '#fff',
    borderRadius: 15, padding: '14px 16px', boxShadow: '0 16px 40px rgba(0,0,0,.3)',
    animation: 'up .25s ease',
  },
};
