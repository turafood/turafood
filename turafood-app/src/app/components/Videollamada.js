'use client';

/**
 * AGENDAR LA VIDEOLLAMADA DE VERIFICACIÓN
 *
 * Es el último paso de la verificación. Ya no se piden papeles: se
 * agenda una llamada corta con el equipo, y en esa llamada se decide
 * si se le levantan los topes.
 *
 * POR QUÉ NO SE NOMBRA LA HERRAMIENTA
 *
 * El calendario lo pone un proveedor externo, pero eso es asunto
 * nuestro, no del dueño del restaurante. Para él esto es "agendar una
 * llamada con TuraFood" — nombrar la marca del calendario solo agrega
 * una palabra que no conoce y una duda ("¿y esos quiénes son?") justo
 * cuando está a punto de terminar.
 *
 * Por eso en toda la pantalla se dice "videollamada segura con el
 * equipo de TuraFood" y en ningún lado aparece el nombre del
 * proveedor.
 *
 * CÓMO CARGA
 *
 * El script del calendario pesa y viene de afuera. Se inyecta solo
 * cuando esta pantalla aparece de verdad —no al cargar el panel— y
 * una sola vez aunque se entre y se salga varias veces.
 *
 * Mientras llega, se muestra un esqueleto con la forma de un
 * calendario. Si no llega —sin red, o el proveedor caído— aparece un
 * botón de WhatsApp: quedarse sin agendar por un script que no cargó
 * sería perder al negocio en el último paso.
 */

import { useEffect, useRef, useState } from 'react';

const WHATSAPP_EQUIPO = '573137594713';
const ORIGEN = 'https://app.cal.com';
// El evento real del equipo. `ESPACIO` es solo el nombre interno con
// el que el embed guarda su instancia; `ENLACE` es el que importa.
const ESPACIO = 'reunion';
const ENLACE = 'turafood/reunion';

/** Para no volver a inyectar el script si ya está */
let scriptPedido = false;

export default function Videollamada({ tema = 'light' }) {
  const contenedor = useRef(null);
  const [estado, setEstado] = useState('cargando');   // cargando | listo | falla

  useEffect(() => {
    let vivo = true;
    const limite = setTimeout(() => {
      // Doce segundos es más de lo que cualquiera espera mirando un
      // recuadro vacío. Pasado eso, se ofrece la salida por WhatsApp.
      if (vivo && estado === 'cargando') setEstado('falla');
    }, 12000);

    const arrancar = () => {
      if (!vivo || !window.Cal) return;
      try {
        window.Cal('init', ESPACIO, { origin: ORIGEN });
        window.Cal.ns[ESPACIO]('inline', {
          elementOrSelector: contenedor.current,
          config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true' },
          calLink: ENLACE,
        });
        window.Cal.ns[ESPACIO]('ui', {
          cssVarsPerTheme: {
            light: { 'cal-brand': '#FF441F' },
            dark: { 'cal-brand': '#30c578' },
          },
          hideEventTypeDetails: false,
          layout: 'month_view',
        });
        setEstado('listo');
      } catch {
        setEstado('falla');
      }
    };

    if (window.Cal) {
      arrancar();
    } else if (!scriptPedido) {
      scriptPedido = true;
      const s = document.createElement('script');
      s.src = `${ORIGEN}/embed/embed.js`;
      s.async = true;
      s.onload = () => {
        // El embed espera encontrar `Cal` como cola de comandos
        if (!window.Cal) { setEstado('falla'); return; }
        arrancar();
      };
      s.onerror = () => { scriptPedido = false; setEstado('falla'); };
      document.head.appendChild(s);
    } else {
      // Otro montaje ya lo pidió; se espera a que aparezca
      const esperar = setInterval(() => {
        if (window.Cal) { clearInterval(esperar); arrancar(); }
      }, 200);
      return () => { vivo = false; clearInterval(esperar); clearTimeout(limite); };
    }

    return () => { vivo = false; clearTimeout(limite); };
    // `estado` a propósito fuera: solo se monta una vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ------------------------------------------ qué va a pasar */}
      <section style={S.aviso}>
        <div style={S.avisoGlow} />
        <span style={S.avisoIcono}>
          <span className="ms" style={{ fontSize: 24 }}>videocam</span>
        </span>
        <div style={{ position: 'relative' }}>
          <h3 style={S.avisoTitulo}>Una videollamada corta y quedas listo</h3>
          <p style={S.avisoTexto}>
            Nos vemos 30 minutos con el equipo de TuraFood. Es una llamada
            segura, uno a uno: conocemos tu negocio, resolvemos tus dudas y
            ahí mismo decidimos si te levantamos el tope de 20 pedidos
            diarios.
          </p>
        </div>
      </section>

      {/* ------------------------------------------ qué se gana */}
      <ul style={S.beneficios}>
        {[
          ['lock_open', 'Se te quita el tope de 20 pedidos al día', '#86EFAC'],
          ['campaign', 'Quedas habilitado para los espacios publicitarios de la app', '#93C5FD'],
          ['handshake', 'Accedes a los servicios del equipo a precios de la ciudad', '#FDBA74'],
        ].map(([icono, texto, color]) => (
          <li key={texto} style={S.beneficio}>
            <span style={{ ...S.beneIcon, color, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
              <span className="ms" style={{ fontSize: 18 }}>{icono}</span>
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{texto}</span>
          </li>
        ))}
      </ul>

      {/* ------------------------------------------ el calendario */}
      <div style={S.marco}>
        {estado === 'cargando' && (
          <div style={S.esqueleto} aria-hidden="true">
            <span className="sk" style={{ height: 26, width: 180, borderRadius: 9, background: 'var(--border)' }} />
            <div style={S.rejilla}>
              {Array.from({ length: 28 }).map((_, n) => (
                <span key={n} className="sk" style={{ aspectRatio: '1', borderRadius: 12, background: 'var(--border)' }} />
              ))}
            </div>
          </div>
        )}

        {estado === 'falla' && (
          <div style={S.falla}>
            <span className="ms" style={{ fontSize: 36, color: 'var(--primary)', textShadow: '0 0 20px rgba(255,68,31,0.4)' }}>wifi_off</span>
            <p style={S.fallaTexto}>
              El calendario está tardando en cargar. Puedes intentarlo de nuevo o escribirnos por WhatsApp y coordinamos la videollamada de una vez.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              <a
                href={`https://wa.me/${WHATSAPP_EQUIPO}?text=${encodeURIComponent('Hola, quiero agendar la videollamada para verificar mi negocio en TuraFood.')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={S.fallaBoton}
              >
                <span className="ms" style={{ fontSize: 20 }}>chat</span>
                Agendar por WhatsApp
              </a>
              <button onClick={() => window.location.reload()} style={S.fallaRetry}>
                Reintentar carga
              </button>
            </div>
            
            {/* IFRAME DE RESPALDO: Si el script falló, igual inyectamos el iframe nativo por si acaso. */}
            <div style={{ marginTop: 30, width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 30 }}>
               <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>O intenta usar el calendario básico:</p>
               <iframe 
                 src={`https://cal.com/${ENLACE}?theme=${tema}`} 
                 style={{ width: '100%', height: 600, border: 'none', borderRadius: 16, background: 'var(--surface)' }} 
               />
            </div>
          </div>
        )}

        <div
          ref={contenedor}
          style={{
            width: '100%',
            minHeight: estado === 'listo' ? 620 : 0,
            height: estado === 'listo' ? 'auto' : 0,
            overflow: 'hidden',
          }}
        />
      </div>

      <p style={S.pie}>
        <span className="ms" style={{ fontSize: 16, color: 'var(--muted)' }}>shield</span>
        La llamada es privada y solo la ve el equipo de TuraFood. No pedimos
        contraseñas ni datos bancarios en la llamada.
      </p>
    </div>
  );
}

const S = {
  aviso: {
    position: 'relative', overflow: 'hidden',
    display: 'flex', gap: 16, alignItems: 'flex-start',
    padding: 24, borderRadius: 24,
    background: 'var(--primary-tint)',
    border: '1px solid rgba(255,68,31,0.15)',
  },
  avisoGlow: {
    position: 'absolute', top: -50, left: -50, width: 150, height: 150,
    background: 'radial-gradient(circle, rgba(255,68,31,0.1), transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  avisoIcono: {
    width: 52, height: 52, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--primary) 0%, #D83A1A 100%)', color: '#fff',
    boxShadow: '0 8px 24px rgba(255,68,31,0.3)', position: 'relative',
  },
  avisoTitulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, letterSpacing: '-.01em', color: 'var(--text)',
  },
  avisoTexto: {
    margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text)', opacity: 0.8,
  },

  beneficios: {
    listStyle: 'none', margin: '8px 0', padding: 0,
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12,
  },
  beneficio: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    padding: 16, borderRadius: 18, transition: 'all 0.3s',
  },
  beneIcon: {
    width: 36, height: 36, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none'
  },

  marco: {
    borderRadius: 24, overflow: 'hidden',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow)',
  },
  esqueleto: {
    padding: 24, display: 'flex', flexDirection: 'column', gap: 20,
  },
  rejilla: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8,
  },

  falla: {
    padding: '40px 24px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 16, textAlign: 'center',
  },
  fallaTexto: {
    margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--muted)', maxWidth: 400,
  },
  fallaBoton: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    height: 50, padding: '0 24px', borderRadius: 999,
    background: 'linear-gradient(135deg, #25D366 0%, #1DA851 100%)', color: '#fff', textDecoration: 'none',
    fontSize: 15, fontWeight: 800, boxShadow: '0 8px 24px rgba(37, 211, 102, 0.3)',
    transition: 'transform 0.2s',
  },
  fallaRetry: {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    height: 50, padding: '0 24px', borderRadius: 999,
    background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)',
    fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s',
  },

  pie: {
    display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 0',
    fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)',
  },
};
