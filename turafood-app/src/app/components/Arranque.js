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
 */

import { useEffect, useMemo, useState } from 'react';

export default function Arranque({ preguntas, onListo, onSaltar, guardando }) {
  const [i, setI] = useState(0);
  const [resp, setResp] = useState({});

  const paso = preguntas[i];
  const ultimo = i === preguntas.length - 1;
  const valor = resp[paso.id];

  // Contestada: en las de varias, con una alcanza
  const contestada = paso.multiple ? Array.isArray(valor) && valor.length > 0 : Boolean(valor);

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
    if (ultimo) onListo?.(resp);
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
                  <span style={S.emoji} aria-hidden="true">{o.emoji}</span>

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

const S = {
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
    display: 'flex', alignItems: 'center', gap: 12,
    // 56 es el mínimo para que el pulgar acierte sin mirar
    minHeight: 56, padding: '12px 14px',
    borderRadius: 16, border: '1.5px solid var(--border)',
    textAlign: 'left',
    transition: 'border-color .16s ease, background .16s ease, box-shadow .16s ease',
  },
  emoji: {
    fontSize: 24, lineHeight: 1, flex: 'none',
    width: 30, textAlign: 'center',
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
    flex: 1, height: 52, borderRadius: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: 'var(--primary)', color: '#fff',
    fontSize: 15.5, fontWeight: 800, letterSpacing: '-.01em',
    transition: 'opacity .16s ease',
  },
};
