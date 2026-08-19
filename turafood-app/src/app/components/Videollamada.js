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
const ESPACIO = '30min';
const ENLACE = 'turafood/30min';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ------------------------------------------ qué va a pasar */}
      <section style={S.aviso}>
        <span style={S.avisoIcono}>
          <span className="ms" style={{ fontSize: 22 }}>videocam</span>
        </span>
        <div>
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
          ['lock_open', 'Se te quita el tope de 20 pedidos al día'],
          ['campaign', 'Quedas habilitado para los espacios publicitarios de la app'],
          ['handshake', 'Accedes a los servicios del equipo a precios de la ciudad'],
        ].map(([icono, texto]) => (
          <li key={texto} style={S.beneficio}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--green)', flex: 'none' }}>
              {icono}
            </span>
            {texto}
          </li>
        ))}
      </ul>

      {/* ------------------------------------------ el calendario */}
      <div style={S.marco}>
        {estado === 'cargando' && (
          <div style={S.esqueleto} aria-hidden="true">
            <span className="sk" style={{ height: 26, width: 180, borderRadius: 9 }} />
            <div style={S.rejilla}>
              {Array.from({ length: 28 }).map((_, n) => (
                <span key={n} className="sk" style={{ aspectRatio: '1', borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}

        {estado === 'falla' && (
          <div style={S.falla}>
            <span className="ms" style={{ fontSize: 30, color: 'var(--muted)' }}>wifi_off</span>
            <p style={S.fallaTexto}>
              No pudimos abrir el calendario. Escríbenos por WhatsApp y
              coordinamos la videollamada de una vez.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP_EQUIPO}?text=${encodeURIComponent('Hola, quiero agendar la videollamada para verificar mi negocio en TuraFood.')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={S.fallaBoton}
            >
              <span className="ms" style={{ fontSize: 19 }}>chat</span>
              Agendar por WhatsApp
            </a>
          </div>
        )}

        {/* Siempre montado: el embed necesita el nodo para escribir
            dentro, aunque todavía no haya cargado. */}
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
        <span className="ms" style={{ fontSize: 15 }}>shield</span>
        La llamada es privada y solo la ve el equipo de TuraFood. No pedimos
        contraseñas ni datos bancarios en la llamada.
      </p>
    </div>
  );
}

const S = {
  aviso: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: 18, borderRadius: 20,
    background: 'var(--primary-tint)',
    border: '1px solid color-mix(in srgb, var(--primary) 24%, transparent)',
  },
  avisoIcono: {
    width: 46, height: 46, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--primary)', color: '#fff',
  },
  avisoTitulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16.5, letterSpacing: '-.01em', color: 'var(--text)',
  },
  avisoTexto: {
    margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)',
  },

  beneficios: {
    listStyle: 'none', margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  beneficio: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: 13, lineHeight: 1.45, color: 'var(--text)', fontWeight: 600,
  },

  marco: {
    borderRadius: 20, overflow: 'hidden',
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  esqueleto: {
    padding: 20, display: 'flex', flexDirection: 'column', gap: 16,
  },
  rejilla: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7,
  },

  falla: {
    padding: '32px 22px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 12, textAlign: 'center',
  },
  fallaTexto: {
    margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--muted)', maxWidth: 320,
  },
  fallaBoton: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    height: 46, padding: '0 22px', borderRadius: 999,
    background: '#25D366', color: '#fff', textDecoration: 'none',
    fontSize: 14.5, fontWeight: 800,
  },

  pie: {
    display: 'flex', alignItems: 'center', gap: 8, margin: 0,
    fontSize: 11.8, lineHeight: 1.5, color: 'var(--muted)',
  },
};
