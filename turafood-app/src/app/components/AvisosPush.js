'use client';

/**
 * AVISOS DE PEDIDOS (PUSH)
 *
 * Tarjeta que invita a activar las notificaciones en este dispositivo. Para
 * un negocio es lo que evita perder pedidos con la app cerrada; para un
 * repartidor, enterarse de cada asignación.
 *
 * El permiso del navegador se pide SOLO al tocar el botón (pedirlo al abrir
 * la app hace que la gente diga "No" por reflejo, y un "No" casi no se
 * deshace). Si ya hay permiso, vuelve a registrar el dispositivo en silencio
 * por si cambió de usuario.
 */

import { useEffect, useState } from 'react';
import {
  pushSupported, pushPermission, activarPush, renovarPush, esIOSNoInstalada,
} from '@/lib/push';

const CLAVE_DESCARTE = 'turafood-avisos-descartado';
const DIAS_SIN_INSISTIR = 7;

function descartadoReciente() {
  try {
    const t = Number(localStorage.getItem(CLAVE_DESCARTE) || 0);
    return Date.now() - t < DIAS_SIN_INSISTIR * 86400000;
  } catch {
    return false;
  }
}

export default function AvisosPush({ app }) {
  // 'oculto' | 'invitar' | 'bloqueado' | 'instalar-ios' | 'listo'
  const [estado, setEstado] = useState('oculto');
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (esIOSNoInstalada()) {
      setEstado(descartadoReciente() ? 'oculto' : 'instalar-ios');
      return;
    }
    if (!pushSupported()) return;
    const permiso = pushPermission();
    if (permiso === 'granted') {
      renovarPush(app);
      setEstado('oculto');
    } else if (permiso === 'denied') {
      setEstado(descartadoReciente() ? 'oculto' : 'bloqueado');
    } else {
      setEstado(descartadoReciente() ? 'oculto' : 'invitar');
    }
  }, [app]);

  if (estado === 'oculto') return null;

  const descartar = () => {
    try { localStorage.setItem(CLAVE_DESCARTE, String(Date.now())); } catch { /* sin storage: no pasa nada */ }
    setEstado('oculto');
  };

  const activar = async () => {
    setTrabajando(true);
    setMensaje('');
    const r = await activarPush(app);
    setTrabajando(false);
    if (r.ok) {
      setEstado('listo');
      setTimeout(() => setEstado('oculto'), 3500);
    } else if (r.motivo === 'denegado') {
      setEstado('bloqueado');
    } else if (r.motivo === 'sin-sesion') {
      setMensaje('Inicia sesión para activar los avisos.');
    } else if (r.motivo === 'cerrado') {
      setMensaje('Cuando quieras, vuelve a tocar el botón.');
    } else {
      setMensaje('No pudimos activarlos. Inténtalo de nuevo en un momento.');
    }
  };

  const esNegocio = app === 'negocio';
  const textos = {
    invitar: {
      icono: 'notifications_active',
      titulo: esNegocio ? 'Que no se te pase ningún pedido' : 'Entérate al instante de tus entregas',
      cuerpo: esNegocio
        ? 'Activa los avisos y te sonamos cuando entre un pedido, aunque la app esté cerrada.'
        : 'Activa los avisos y te sonamos cuando te asignen un pedido, aunque la app esté cerrada.',
    },
    bloqueado: {
      icono: 'notifications',
      titulo: 'Los avisos están bloqueados',
      cuerpo: 'Para recibirlos, permite las notificaciones de TuraFood en la configuración del navegador y recarga la página.',
    },
    'instalar-ios': {
      icono: 'storefront',
      titulo: 'Instala la app para recibir avisos',
      cuerpo: 'En iPhone los avisos solo funcionan con la app instalada: toca Compartir y luego "Añadir a pantalla de inicio".',
    },
    listo: {
      icono: 'check_circle',
      titulo: '¡Avisos activados!',
      cuerpo: 'Te avisaremos en este dispositivo.',
    },
  }[estado];

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        margin: '12px 0', padding: '12px 14px',
        background: estado === 'listo' ? 'var(--green-tint)' : 'var(--amber-tint)',
        border: '1px solid var(--border)', borderRadius: 14,
      }}
    >
      <span className="ms ms-fill" style={{ fontSize: 24, color: estado === 'listo' ? 'var(--green)' : 'var(--amber)' }}>
        {textos.icono}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{textos.titulo}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
          {mensaje || textos.cuerpo}
        </div>
      </div>
      {estado === 'invitar' && (
        <button
          onClick={activar}
          disabled={trabajando}
          style={{
            flexShrink: 0, padding: '9px 14px', borderRadius: 10, border: 'none',
            background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700,
            opacity: trabajando ? 0.6 : 1, cursor: trabajando ? 'wait' : 'pointer',
          }}
        >
          {trabajando ? 'Activando…' : 'Activar'}
        </button>
      )}
      {estado !== 'listo' && (
        <button
          onClick={descartar}
          aria-label="Ahora no"
          style={{ flexShrink: 0, background: 'none', border: 'none', color: 'var(--muted)', padding: 4, cursor: 'pointer' }}
        >
          <span className="ms" style={{ fontSize: 20 }}>close</span>
        </button>
      )}
    </div>
  );
}
