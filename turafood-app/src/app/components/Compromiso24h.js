'use client';

/**
 * "TE RESPONDEMOS ANTES DE LAS 24 HORAS"
 *
 * Una promesa con reloj. La promesa sola —"activamos rápido"— no vale
 * nada porque la dice todo el mundo; con un contador corriendo a la
 * vista, se vuelve verificable.
 *
 * POR QUÉ UN CONTADOR Y NO UN "EN REVISIÓN"
 *
 * "En revisión" no dice nada: puede ser una hora o una semana, y el
 * dueño se queda mirando la pantalla sin saber si tiene que insistir.
 * Un reloj que baja responde la única pregunta que importa —¿cuándo
 * sabré?— sin que tenga que escribirle a nadie.
 *
 * Y ES UN COMPROMISO, NO UN ADORNO
 *
 * Si el contador llega a cero sin respuesta, la pantalla lo dice y
 * ofrece escribir por WhatsApp. Un contador que se vence y sigue
 * sonriendo es peor que no tenerlo: enseña que la promesa era falsa.
 */

import { useEffect, useState } from 'react';

const HORAS = 24;
const WHATSAPP_EQUIPO = '573137594713';

/** Cuánto falta, en partes ya listas para pintar */
function restante(desde) {
  if (!desde) return null;
  const fin = new Date(desde).getTime() + HORAS * 3600 * 1000;
  const ms = fin - Date.now();
  if (ms <= 0) return { vencido: true, h: 0, m: 0, pct: 100 };

  return {
    vencido: false,
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    pct: Math.min(100, Math.round((1 - ms / (HORAS * 3600000)) * 100)),
  };
}

export default function Compromiso24h({ desde, aprobado }) {
  const [t, setT] = useState(() => restante(desde));

  useEffect(() => {
    if (!desde || aprobado) return undefined;
    setT(restante(desde));
    // Cada 30 s: los minutos se mueven, y refrescar cada segundo para
    // ver bajar un número que cambia cada 60 es gastar batería.
    const id = setInterval(() => setT(restante(desde)), 30000);
    return () => clearInterval(id);
  }, [desde, aprobado]);

  /* ---------------------------------------------- ya quedó activo */
  if (aprobado) {
    return (
      <div style={{ ...S.caja, ...S.cajaOk }}>
        <span style={{ ...S.icono, background: 'var(--green)' }}>
          <span className="ms" style={{ fontSize: 22, color: '#fff' }}>verified</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={S.titulo}>Tu negocio está activo</span>
          <span style={S.texto}>Sin topes. Puedes recibir todos los pedidos que quieras.</span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- todavía no empieza */
  if (!t) {
    return (
      <div style={S.caja}>
        <span style={{ ...S.icono, background: 'var(--primary)' }}>
          <span className="ms" style={{ fontSize: 22, color: '#fff' }}>bolt</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={S.titulo}>Activamos en menos de 24 horas</span>
          <span style={S.texto}>
            Apenas agendes tu videollamada empieza a correr el reloj. Nunca
            te dejamos esperando más de un día.
          </span>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- se venció */
  if (t.vencido) {
    return (
      <div style={{ ...S.caja, ...S.cajaTarde }}>
        <span style={{ ...S.icono, background: '#E2360F' }}>
          <span className="ms" style={{ fontSize: 22, color: '#fff' }}>schedule</span>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={S.titulo}>Se nos pasaron las 24 horas</span>
          <span style={S.texto}>
            Prometimos responderte en un día y no lo cumplimos. Escríbenos y
            lo resolvemos ya mismo.
          </span>
          <a
            href={`https://wa.me/${WHATSAPP_EQUIPO}?text=${encodeURIComponent('Hola, pasaron las 24 horas y todavía no me han activado el negocio en TuraFood.')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={S.boton}
          >
            <span className="ms" style={{ fontSize: 17 }}>chat</span>
            Escribirle al equipo
          </a>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------- corriendo */
  return (
    <div style={S.caja}>
      {/* El anillo: se llena a medida que pasa el tiempo */}
      <span style={S.anillo}>
        <svg width="52" height="52" viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="var(--inkLine)" strokeWidth="5" />
          <circle
            cx="26" cy="26" r="22" fill="none"
            stroke="var(--primary)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 22}
            strokeDashoffset={2 * Math.PI * 22 * (1 - t.pct / 100)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span style={S.anilloTexto}>
          {t.h > 0 ? `${t.h}h` : `${t.m}m`}
        </span>
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={S.titulo}>Te respondemos antes de 24 horas</span>
        <span style={S.texto}>
          Quedan <b style={{ color: 'var(--onInk)' }}>
            {t.h > 0 && `${t.h} ${t.h === 1 ? 'hora' : 'horas'}`}
            {t.h > 0 && t.m > 0 && ' y '}
            {t.m > 0 && `${t.m} ${t.m === 1 ? 'minuto' : 'minutos'}`}
          </b>{' '}
          del plazo que nos comprometimos. Mientras tanto puedes seguir
          vendiendo con el tope de 20 pedidos.
        </span>
      </div>
    </div>
  );
}

const S = {
  caja: {
    display: 'flex', alignItems: 'flex-start', gap: 14,
    padding: 18, borderRadius: 20,
    background: 'linear-gradient(140deg, var(--ink) 0%, var(--ink2) 74%)',
    color: 'var(--onInk)',
    border: '1px solid var(--inkLine)',
  },
  cajaOk: {
    background: 'color-mix(in srgb, var(--green) 12%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)',
    color: 'var(--text)',
  },
  cajaTarde: {
    background: 'linear-gradient(140deg, #3A1712 0%, #1F0C09 74%)',
  },

  icono: {
    width: 46, height: 46, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  anillo: {
    position: 'relative', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  anilloTexto: {
    position: 'absolute', fontSize: 13, fontWeight: 800,
    letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
  },

  titulo: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 15.5, letterSpacing: '-.01em',
  },
  texto: {
    display: 'block', marginTop: 6, fontSize: 12.8, lineHeight: 1.6,
    color: 'var(--inkSoft)',
  },
  boton: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12,
    height: 40, padding: '0 18px', borderRadius: 999,
    background: '#25D366', color: '#fff', textDecoration: 'none',
    fontSize: 13.5, fontWeight: 800,
  },
};
