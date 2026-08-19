'use client';

/**
 * EL ARRANQUE: SEIS TOQUES Y EL PANEL QUEDA A SU MEDIDA
 *
 * Aparece apenas la persona elige "Tengo un negocio" o "Quiero
 * repartir", antes de entrar al panel.
 *
 * POR QUÉ UNA HOJA Y NO UNA PANTALLA COMPLETA
 *
 * Sube desde abajo y deja ver el panel detrás, medio velado. Es a
 * propósito: la persona ve que YA ESTÁ ADENTRO y que esto es un paso
 * corto, no otro formulario antes de poder entrar. Una pantalla
 * completa se siente como un registro más — justo lo que quitamos.
 *
 * Y se puede saltar en cualquier momento. Quien no quiera contestar
 * entra igual; solo pierde que le armemos el panel a su medida.
 *
 * MÓVIL PRIMERO, DE VERDAD
 *
 *   · En celular la hoja ocupa hasta el 92% del alto y las opciones
 *     van en una columna, con 56px de alto mínimo — el pulgar no
 *     acierta en menos.
 *   · En escritorio se convierte en una tarjeta centrada de 560px.
 *   · El botón de avanzar vive pegado abajo, dentro del área segura
 *     del iPhone, y nunca se va con el scroll.
 *
 * NADA DE ESCRIBIR
 *
 * Todas las respuestas son de tocar. En un celular, la diferencia
 * entre tocar y escribir es la diferencia entre contestar y cerrar.
 *
 * ICONOS, NO EMOJIS
 *
 * Los emojis los pinta el sistema operativo: en un Android viejo
 * varios salen como un cuadrito, cada plataforma los dibuja distinto y
 * ninguno respeta el tema. Ver `IconoArranque`.
 */

import { useEffect, useMemo, useState } from 'react';
import IconoArranque from './IconoArranque';
import { TEMAS, TEMA_INFO, useTheme } from '@/lib/prefs';

/**
 * El último paso no es una pregunta: es enseñarle que puede cambiar
 * el aspecto. Nadie descubre solo un botón de tema en una barra
 * superior llena de iconos, y quien trabaja de noche en una cocina
 * agradece el oscuro. El del puerto lo agradecen todos.
 *
 * Va de último a propósito: es lo único que no configura nada del
 * negocio, así que quien salte antes no se pierde nada importante.
 */
const PASO_TEMA = {
  id: '__tema',
  titulo: 'Una última cosa: ¿cómo lo quieres ver?',
  bajada: 'Lo cambias cuando quieras desde el botón de arriba.',
  tema: true,
};

export default function Arranque({ preguntas: base, onListo, onSaltar, guardando }) {
  const [i, setI] = useState(0);
  const [resp, setResp] = useState({});
  const { theme, setTheme } = useTheme();

  const preguntas = useMemo(() => [...base, PASO_TEMA], [base]);

  const paso = preguntas[i];
  const ultimo = i === preguntas.length - 1;
  const valor = resp[paso.id];

  // Contestada: en las de varias, con una alcanza
  // El del tema siempre está contestado: ya hay uno puesto.
  const contestada = paso.tema
    ? true
    : paso.multiple ? Array.isArray(valor) && valor.length > 0 : Boolean(valor);

  // Escape para salir. Quien lo busca sabe lo que hace.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onSaltar?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSaltar, guardando]);

  // Al cambiar de pregunta, arriba del todo. Si no, la segunda
  // pregunta aparece a media altura y se ve rota.
  useEffect(() => {
    document.getElementById('arranque-scroll')?.scrollTo({ top: 0 });
  }, [i]);

  const elegir = (opcion) => {
    setResp((p) => {
      if (!paso.multiple) return { ...p, [paso.id]: opcion };
      const ya = Array.isArray(p[paso.id]) ? p[paso.id] : [];
      return {
        ...p,
        [paso.id]: ya.includes(opcion) ? ya.filter((x) => x !== opcion) : [...ya, opcion],
      };
    });

    // En las de una sola opción se avanza solo. Ahorra un toque por
    // pregunta, que en seis preguntas son seis toques menos.
    if (!paso.multiple && !ultimo) {
      setTimeout(() => setI((n) => n + 1), 260);
    }
  };

  const avanzar = () => {
    if (ultimo) onListo?.(resp);   // `__tema` nunca entra a `resp`
    else setI((n) => n + 1);
  };

  const pct = useMemo(
    () => Math.round(((i + (contestada ? 1 : 0)) / preguntas.length) * 100),
    [i, contestada, preguntas.length],
  );

  return (
    <div style={S.velo} className="anim-fade">
      <section
        style={S.hoja}
        className="arranque-hoja anim-slideup"
        role="dialog"
        aria-modal="true"
        aria-label="Configura tu panel"
      >

        {/* ---------------------------------------- barra de arriba */}
        <header style={S.cabecera}>
          <div style={S.barra}>
            <span style={{ ...S.barraRelleno, width: `${pct}%` }} />
          </div>

          <div style={S.cabeceraFila}>
            <span style={S.paso}>
              Paso {i + 1} de {preguntas.length}
            </span>
            <button onClick={onSaltar} style={S.saltar} disabled={guardando}>
              Saltar
            </button>
          </div>
        </header>

        {/* ---------------------------------------- la pregunta */}
        <div id="arranque-scroll" style={S.cuerpo}>
          <h2 style={S.titulo}>{paso.titulo}</h2>
          {paso.bajada && <p style={S.bajada}>{paso.bajada}</p>}

          {/* El paso del tema: tres muestras que se ven como se va a
              ver la app, no tres nombres. Se aplica al tocar, así que
              la prueba es la pantalla misma. */}
          {paso.tema ? (
            <div style={S.temas}>
              {TEMAS.map((t) => {
                const on = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    aria-pressed={on}
                    style={{
                      ...S.temaCard,
                      borderColor: on ? 'var(--primary)' : 'var(--border)',
                      boxShadow: on ? '0 6px 20px color-mix(in srgb, var(--primary) 22%, transparent)' : 'none',
                    }}
                  >
                    <span style={{ ...S.temaMuestra, ...MUESTRA[t] }}>
                      <span style={{ ...S.temaBarra, background: MUESTRA[t].acento }} />
                      <span style={{ ...S.temaLinea, background: MUESTRA[t].linea, width: '62%' }} />
                      <span style={{ ...S.temaLinea, background: MUESTRA[t].linea, width: '40%' }} />
                    </span>

                    <span style={S.temaNombre}>
                      <span className="ms" style={{ fontSize: 16 }}>{TEMA_INFO[t].icono}</span>
                      {TEMA_INFO[t].nombre}
                    </span>

                    {on && (
                      <span className="ms" style={S.temaCheck}>check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
          <div
            style={{
              ...S.opciones,
              // Los nichos son once: en dos columnas se ven de un
              // vistazo en vez de obligar a un scroll largo.
              gridTemplateColumns: paso.columnas === 2
                ? 'repeat(auto-fill, minmax(148px, 1fr))'
                : '1fr',
            }}
          >
            {paso.opciones.map((o) => {
              const on = paso.multiple
                ? Array.isArray(valor) && valor.includes(o.id)
                : valor === o.id;

              return (
                <button
                  key={o.id}
                  onClick={() => elegir(o.id)}
                  aria-pressed={on}
                  style={{
                    ...S.opcion,
                    borderColor: on ? 'var(--primary)' : 'var(--border)',
                    background: on ? 'var(--primary-tint)' : 'var(--surface)',
                    boxShadow: on ? '0 4px 16px rgba(226,54,15,.14)' : 'none',
                  }}
                >
                  <IconoArranque id={o.id} ms={o.ms} tono={o.tono} size={40} />

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ ...S.opcionLabel, color: on ? 'var(--primary)' : 'var(--text)' }}>
                      {o.label}
                    </span>
                    {o.detalle && <span style={S.opcionDetalle}>{o.detalle}</span>}
                  </span>

                  {/* Cuadrito en las de varias, círculo en las de una:
                      la forma dice cuántas se pueden marcar antes de
                      que alguien lo averigüe tocando. */}
                  <span
                    style={{
                      ...S.marca,
                      borderRadius: paso.multiple ? 7 : '50%',
                      borderColor: on ? 'var(--primary)' : 'var(--border)',
                      background: on ? 'var(--primary)' : 'transparent',
                    }}
                  >
                    {on && (
                      <span className="ms" style={{ fontSize: 15, color: '#fff' }}>check</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {paso.tema && (
            <p style={S.temaNota}>
              El del puerto lleva los colores de la bandera de Buenaventura.
            </p>
          )}
        </div>

        {/* ---------------------------------------- pie fijo */}
        <footer style={S.pie}>
          {i > 0 && (
            <button
              onClick={() => setI((n) => n - 1)}
              style={S.atras}
              disabled={guardando}
              aria-label="Anterior"
            >
              <span className="ms" style={{ fontSize: 20 }}>arrow_back</span>
            </button>
          )}

          <button
            onClick={avanzar}
            disabled={!contestada || guardando}
            style={{ ...S.avanzar, opacity: contestada && !guardando ? 1 : .45 }}
          >
            {guardando
              ? 'Armando tu panel…'
              : ultimo ? 'Entrar a mi panel' : 'Siguiente'}
            {!guardando && (
              <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

/**
 * Cómo se ve cada tema en la muestra. Son los mismos colores reales
 * de `globals.css`, escritos acá porque la muestra tiene que pintar
 * un tema que NO es el que está puesto — no puede leer las variables.
 */
const MUESTRA = {
  light:  { background: '#F6F5F2', acento: '#FF441F', linea: 'rgba(23,20,15,.18)' },
  dark:   { background: '#131110', acento: '#FF441F', linea: 'rgba(255,255,255,.22)' },
  puerto: { background: '#FFFDF5', acento: '#009739', linea: 'rgba(0,151,57,.24)' },
};

const S = {
  temas: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 18 },
  temaCard: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
    padding: '13px 8px', borderRadius: 18,
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    transition: 'border-color .22s cubic-bezier(.2,0,0,1), box-shadow .28s cubic-bezier(.2,0,0,1)',
  },
  temaMuestra: {
    width: '100%', height: 54, borderRadius: 11,
    display: 'flex', flexDirection: 'column', gap: 5,
    padding: 9, overflow: 'hidden',
    border: '1px solid rgba(128,128,128,.18)',
  },
  temaBarra: { height: 8, borderRadius: 4, width: '46%' },
  temaLinea: { height: 5, borderRadius: 3 },
  temaNombre: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12.5, fontWeight: 700, color: 'var(--text)',
  },
  temaCheck: {
    position: 'absolute', top: 8, right: 8,
    fontSize: 18, color: 'var(--primary)',
  },
  temaNota: {
    margin: '14px 0 0', fontSize: 12, lineHeight: 1.5,
    color: 'var(--muted)', textAlign: 'center',
  },

  velo: {
    position: 'fixed', inset: 0, zIndex: 300,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(12,10,9,.55)',
    backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
  },

  /**
   * En celular: pegada abajo, hasta 92% del alto.
   * En escritorio: centrada. El resto de la responsividad vive en
   * globals.css (`.arranque-hoja`), porque un estilo en línea le gana
   * a cualquier media query.
   */
  hoja: {
    position: 'relative',
    width: '100%', maxWidth: 560,
    maxHeight: '92dvh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--surface)',
    borderRadius: '26px 26px 0 0',
    boxShadow: '0 -20px 60px rgba(12,10,9,.32)',
    overflow: 'hidden',
  },

  cabecera: { flex: 'none', padding: '14px 18px 0' },
  barra: {
    height: 4, borderRadius: 99, background: 'var(--border)', overflow: 'hidden',
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    background: 'linear-gradient(90deg, #FFB57A, var(--primary))',
    transition: 'width .35s cubic-bezier(.2,0,0,1)',
  },
  cabeceraFila: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 11,
  },
  paso: {
    fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: 'var(--muted)',
  },
  saltar: {
    fontSize: 12.5, fontWeight: 700, color: 'var(--muted)',
    background: 'none', padding: '6px 4px',
  },

  cuerpo: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    padding: '16px 18px 8px',
    WebkitOverflowScrolling: 'touch',
  },
  titulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 22, lineHeight: 1.2, letterSpacing: '-.02em', color: 'var(--text)',
  },
  bajada: {
    margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--muted)',
  },

  opciones: {
    display: 'grid', gap: 10, marginTop: 18,
  },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 13,
    // 62 en vez de 56: con el icono adentro, 56 apretaba. El pulgar
    // acierta sin mirar a partir de 56, así que sobra margen.
    minHeight: 62, padding: '11px 14px',
    borderRadius: 18, border: '1.5px solid var(--border)',
    textAlign: 'left',
    // Curva larga y salida suave: el botón se siente pesado, no
    // elástico. Es lo que separa "premium" de "app de plantilla".
    transition: 'border-color .22s cubic-bezier(.2,0,0,1), background .22s cubic-bezier(.2,0,0,1), box-shadow .28s cubic-bezier(.2,0,0,1), transform .18s cubic-bezier(.2,0,0,1)',
  },
  opcionLabel: {
    display: 'block', fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em',
  },
  opcionDetalle: {
    display: 'block', marginTop: 2, fontSize: 11.8, lineHeight: 1.4,
    color: 'var(--muted)',
  },
  marca: {
    width: 22, height: 22, flex: 'none',
    border: '2px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .16s ease, border-color .16s ease',
  },

  pie: {
    flex: 'none', display: 'flex', gap: 10, alignItems: 'center',
    padding: '12px 18px',
    // El área segura del iPhone: sin esto el botón queda debajo de la
    // barra del gesto y no se puede tocar.
    paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  atras: {
    width: 48, height: 52, borderRadius: 15, flex: 'none',
    border: '1.5px solid var(--border)', background: 'var(--surface)',
    color: 'var(--text)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  avanzar: {
    flex: 1, height: 54, borderRadius: 17,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    // Degradado en vez de color plano, y una sombra del mismo color
    // debajo: el botón se despega de la hoja en vez de estar pintado
    // sobre ella.
    background: 'linear-gradient(135deg, var(--primary) 0%, var(--primaryDark) 100%)',
    color: '#fff',
    fontSize: 15.5, fontWeight: 800, letterSpacing: '-.01em',
    boxShadow: '0 6px 18px color-mix(in srgb, var(--primary) 34%, transparent)',
    transition: 'opacity .22s cubic-bezier(.2,0,0,1), box-shadow .22s cubic-bezier(.2,0,0,1)',
  },
};
