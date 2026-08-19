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
import Recorrido from '../components/Recorrido';
import { PASOS_REPARTIDOR } from '../components/recorridos';

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

  /** Mismo cálculo que en Inicio: el nivel sale de las entregas hechas */
  const entregas = courier?.total_deliveries ?? 0;
  const nivel = entregas >= 1000 ? { nombre: 'Nivel Platino', tope: 1000, piso: 1000 }
    : entregas >= 500 ? { nombre: 'Nivel Oro', tope: 1000, piso: 500 }
      : entregas >= 150 ? { nombre: 'Nivel Plata', tope: 500, piso: 150 }
        : { nombre: 'Nivel Bronce', tope: 150, piso: 0 };
  const nivelPct = nivel.tope === nivel.piso
    ? 100
    : Math.min(100, Math.round(((entregas - nivel.piso) / (nivel.tope - nivel.piso)) * 100));

  const ctx = { courier, loading, error, active, online, setOnline, reloadActive, toast };

  return (
    <RiderContext.Provider value={ctx}>
      {/* Barra lateral de escritorio. En el mockup (línea 107) el
          repartidor en tablet no usa la píldora flotante: la
          navegación se va al lado y el contenido gana todo el alto. */}
      {!fullscreen && (
        <aside data-tour="nav" className="rider-side">
          <div style={S.sideBrand}>
            <span style={S.sideLogo}>
              <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>two_wheeler</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.sideName}>Tura Repartidor</span>
              <span style={S.sideCity}>Buenaventura</span>
            </span>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {TABS.map((t) => {
              const on = path === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="rider-side-item"
                  style={on ? S.sideItemOn : S.sideItemOff}
                >
                  <span
                    className="ms"
                    style={{ fontSize: 21, fontVariationSettings: on ? "'FILL' 1" : undefined }}
                  >
                    {t.icon}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{t.label}</span>
                </Link>
              );
            })}
          </nav>

          <div style={{ flex: 1 }} />

          <div style={S.sideTier}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={S.sideTierIcon}>
                <span className="ms" style={{ fontSize: 18, color: '#A8730B' }}>workspace_premium</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{nivel.nombre}</span>
                <span style={S.sideTierMeta}>{entregas} / {nivel.tope}</span>
              </span>
            </div>
            <div style={S.sideTierTrack}>
              <span style={{ ...S.sideTierFill, width: `${nivelPct}%` }} />
            </div>
          </div>

          <button onClick={() => setAiOpen(true)} style={S.sideAi}>
            <span className="ms ms-fill" style={{ fontSize: 20, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>Tura IA</span>
          </button>
        </aside>
      )}

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

        <Recorrido id="repartidor" pasos={PASOS_REPARTIDOR} />

        {children}

        {!fullscreen && !aiOpen && (
          <button onClick={() => setAiOpen(true)} style={S.aiFab}>
            <span className="ms ms-fill" style={{ fontSize: 21, color: 'var(--amber)' }}>auto_awesome</span>
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em' }}>Tura IA</span>
          </button>
        )}

        <TuraIARider open={aiOpen} onClose={() => setAiOpen(false)} />

        {!fullscreen && (
          <nav data-tour="nav-movil" className="rider-tabs" style={S.tabsWrap}>
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
  sideBrand: { display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 20px' },
  sideLogo: {
    width: 40, height: 40, borderRadius: 13, flex: 'none',
    background: 'linear-gradient(150deg,#FF7A3D,#FF441F)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(255,68,31,.3)',
  },
  sideName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16, letterSpacing: '-.02em',
  },
  sideCity: {
    display: 'block', fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginTop: 1,
  },
  sideItemOn: { background: '#FFF1EC', color: 'var(--primary)' },
  sideItemOff: { color: 'var(--muted)' },
  sideTier: {
    borderRadius: 18, padding: 15, color: '#fff',
    background: 'linear-gradient(145deg,#241F1A,#12100D)',
  },
  sideTierIcon: {
    width: 32, height: 32, borderRadius: 10, flex: 'none',
    background: 'linear-gradient(140deg,#FFF0CC,#F7DFA6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sideTierMeta: {
    display: 'block', fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 1,
  },
  sideTierTrack: {
    height: 7, borderRadius: 99, marginTop: 12, overflow: 'hidden',
    background: 'rgba(255,255,255,.14)',
  },
  sideTierFill: {
    display: 'block', height: '100%', borderRadius: 99,
    background: 'linear-gradient(90deg,#F0C97A,#D99A15)',
    transition: 'width .4s cubic-bezier(.2,0,0,1)',
  },
  sideAi: {
    display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 14px',
    borderRadius: 999, marginTop: 12,
    background: 'var(--bg)', border: '1px solid var(--border)',
  },
  tabsWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    display: 'flex', alignItems: 'center', padding: '8px 14px 20px',
    pointerEvents: 'none', zIndex: 80,
  },
  tabs: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    height: 60, borderRadius: 999,
    // El blanco iba escrito a mano y en tema oscuro dejaba una barra
    // blanca sobre fondo negro. color-mix mantiene la transparencia
    // del mockup pero sobre la superficie que toque.
    background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
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
