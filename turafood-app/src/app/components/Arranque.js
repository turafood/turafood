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

// Las fotografías premium para cada paso (subidas por el usuario)
const FONDOS_PASOS = [
  '/burger_new.png',
  '/steak_board.png',
  '/tomahawk.png',
  '/lamb_chops.png',
  '/meat_fork.png',
  '/burger_new.png',
];

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

  const bgImg = FONDOS_PASOS[Math.min(i + 1, FONDOS_PASOS.length - 1)];

  return (
    <div 
      style={{
        ...S.velo,
        background: 'rgba(20, 16, 9, 0.85)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }} 
      className="anim-fade"
    >
      <section
        style={S.hoja}
        className="arranque-hoja anim-slideup"
        role="dialog"
        aria-modal="true"
        aria-label="Configura tu panel"
      >

        {/* ---------------------------------------- barra de arriba */}
        <header style={S.cabecera}>
          <div style={S.cabeceraFila}>
            <span style={S.paso}>
              Paso {i + 1} de {preguntas.length}
            </span>
            <button onClick={onSaltar} style={S.saltar} disabled={guardando}>
              Saltar
            </button>
          </div>
          
          <div style={S.barra}>
            <span style={{ ...S.barraRelleno, width: `${pct}%` }} />
          </div>
        </header>

        {/* ---------------------------------------- la pregunta */}
        <div id="arranque-scroll" style={S.cuerpo}>
          
          {/* Imagen ilustrativa incrustada con máscara suave en las puntas */}
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 20, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '100%', height: 180,
              background: `url("${bgImg}") center/cover`,
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              opacity: 0.95
            }} />
          </div>

          <h2 style={{ ...S.titulo, color: '#fff', textAlign: 'center' }}>
            {paso.titulo.split(' ').map((word, i, arr) => {
              if (i === arr.length - 1 && paso.id === '__tema') {
                 return <span key={i} className="tf-serif tf-gold-text">{word}</span>;
              }
              return word + ' ';
            })}
          </h2>
          {paso.bajada && <p style={{ ...S.bajada, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{paso.bajada}</p>}

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
                      borderColor: on ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                      background: on ? 'rgba(232,199,102,0.08)' : 'rgba(255,255,255,0.03)',
                      boxShadow: on ? '0 6px 20px rgba(184,145,47,0.2)' : 'none',
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
              gridTemplateColumns: paso.columnas === 2
                ? 'repeat(auto-fill, minmax(148px, 1fr))'
                : '1fr',
            }}
          >
            {paso.opciones.map((o) => {
              const activo = paso.multiple
                ? (valor || []).includes(o.id)
                : valor === o.id;

              return (
                <button
                  key={o.id}
                  onClick={() => elegir(o.id)}
                  className="arranque-opcion tf-card"
                  style={{
                    ...S.opcion,
                    background: activo ? 'rgba(232,199,102,0.1)' : 'rgba(255,255,255,0.03)',
                    borderColor: activo ? 'var(--gold)' : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 16, flex: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: activo ? 'linear-gradient(145deg, #F6E4A6, #B8912F)' : 'rgba(255,255,255,0.05)',
                    color: activo ? '#1a1206' : '#fff',
                    boxShadow: activo ? '0 8px 20px rgba(184,145,47,0.3)' : 'none'
                  }}>
                    <IconoArranque icon={o.icon} size={24} />
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <span style={{ ...S.opcionLabel, color: '#fff' }}>{o.label}</span>
                    {o.detalle && <span style={{ ...S.opcionDetalle, color: 'rgba(255,255,255,0.6)' }}>{o.detalle}</span>}
                  </div>
                  <div style={{
                    ...S.marca,
                    background: activo ? 'var(--gold)' : 'transparent',
                    borderColor: activo ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                    boxShadow: activo ? '0 0 0 4px rgba(232,199,102,0.2)' : 'none'
                  }}>
                    {activo && <span className="ms" style={{ fontSize: 18, color: '#1a1206', fontWeight: 800 }}>check</span>}
                  </div>
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
            <button
              onClick={() => setI((n) => n - 1)}
              style={{ ...S.atras, opacity: i === 0 ? 0 : 1, pointerEvents: i === 0 ? 'none' : 'auto' }}
              aria-label="Pregunta anterior"
            >
              <span className="ms">arrow_back</span>
            </button>

            <button
              onClick={avanzar}
              disabled={guardando || (!contestada && !paso.tema)}
              className="arranque-avanzar tf-3d-gold"
              style={{
                ...S.avanzar,
                opacity: (!contestada && !paso.tema) ? 0.5 : 1,
                background: 'linear-gradient(135deg, #F6E4A6, #B8912F)',
                color: '#1a1206'
              }}
            >
              {guardando ? (
                <span className="pro-pulse">Guardando…</span>
              ) : (
                <>
                  {ultimo ? 'Todo listo' : 'Siguiente'}
                  <span className="ms" style={{ fontSize: 22, fontWeight: 800 }}>
                    {ultimo ? 'check' : 'arrow_forward'}
                  </span>
                </>
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
  temas: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 24 },
  temaCard: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
    padding: '14px 10px', borderRadius: 20,
    border: '1px solid var(--border)', background: 'var(--surface)',
    transition: 'all .3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  temaMuestra: {
    width: '100%', height: 56, borderRadius: 12,
    display: 'flex', flexDirection: 'column', gap: 6,
    padding: 10, overflow: 'hidden',
    border: '1px solid rgba(128,128,128,.12)',
  },
  temaBarra: { height: 8, borderRadius: 4, width: '46%' },
  temaLinea: { height: 5, borderRadius: 3 },
  temaNombre: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 600, color: 'var(--text)',
  },
  temaCheck: {
    position: 'absolute', top: -8, right: -8,
    fontSize: 20, color: 'var(--text)',
    background: 'var(--bg)', borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  temaNota: {
    margin: '20px 0 0', fontSize: 13, lineHeight: 1.5,
    color: 'var(--muted)', textAlign: 'center',
  },

  velo: {
    position: 'fixed', inset: 0, zIndex: 300,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.75) url("https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2000&auto=format&fit=crop") no-repeat center center / cover',
    backgroundBlendMode: 'multiply',
    backdropFilter: 'blur(15px)', WebkitBackdropFilter: 'blur(15px)',
    padding: 20,
  },

  hoja: {
    position: 'relative',
    width: '100%', maxWidth: 540,
    maxHeight: '90dvh',
    display: 'flex', flexDirection: 'column',
    background: '#141009',
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },

  cabecera: { flex: 'none', padding: '24px 32px 0' },
  cabeceraFila: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  barra: {
    height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    background: 'var(--gold)',
    transition: 'width .6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  paso: {
    fontSize: 12, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
  },
  saltar: {
    fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
    background: 'none', padding: '4px 0', border: 'none',
    transition: 'color .2s', cursor: 'pointer',
  },

  cuerpo: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    padding: '28px 32px 16px',
    WebkitOverflowScrolling: 'touch',
  },
  titulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 32, lineHeight: 1.15, letterSpacing: '-.03em', color: 'var(--text)',
  },
  bajada: {
    margin: '12px 0 0', fontSize: 15, lineHeight: 1.5, color: 'var(--muted)',
  },

  opciones: {
    display: 'grid', gap: 14, marginTop: 32,
  },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 18,
    minHeight: 76, padding: '16px 20px',
    borderRadius: 20, border: '1px solid var(--border)',
    background: 'var(--surface2)',
    textAlign: 'left', cursor: 'pointer',
    transition: 'all .3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  opcionLabel: {
    display: 'block', fontSize: 17, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--text)',
  },
  opcionDetalle: {
    display: 'block', marginTop: 4, fontSize: 13.5, lineHeight: 1.4, color: 'var(--muted)',
  },
  marca: {
    width: 26, height: 26, flex: 'none',
    border: '2px solid var(--border)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .3s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  pie: {
    flex: 'none', display: 'flex', gap: 16, alignItems: 'center',
    padding: '24px 32px 32px',
    background: 'transparent',
  },
  atras: {
    width: 60, height: 60, borderRadius: 20, flex: 'none',
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
    color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .3s, transform .2s',
  },
  avanzar: {
    flex: 1, height: 60, borderRadius: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    background: 'linear-gradient(135deg, var(--primary), #FF7B3B)', border: 'none', cursor: 'pointer',
    color: '#fff',
    fontSize: 17, fontWeight: 700, letterSpacing: '-.01em',
    boxShadow: '0 8px 30px rgba(255,68,31,0.3)',
    transition: 'all .4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
