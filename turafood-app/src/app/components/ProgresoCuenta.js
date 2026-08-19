'use client';

/**
 * LO QUE TE FALTA PARA QUEDAR ACTIVO
 *
 * Vive en el armazón, así que se ve en TODAS las pantallas del panel.
 * Es a propósito: quien entró a probar sin dar datos no va a ir solo a
 * buscar la pantalla de verificación. Si el recordatorio no está
 * delante, la cuenta se queda a medias para siempre.
 *
 * No es una alerta ni un regaño. Es una barra de progreso con el
 * siguiente paso a un toque, y se puede plegar. Quien ya sabe lo que
 * le falta no necesita que se lo repitan en grande cada pantalla.
 *
 * Los pasos salen de los datos reales —¿tiene nombre?, ¿tiene menú?,
 * ¿subió la cédula?— no de una lista que alguien marca a mano. Así no
 * puede quedar diciendo que falta algo que ya está.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Se recuerda plegado mientras dure la pestaña, no para siempre */
const CLAVE = 'turafood:progreso-plegado';

export default function ProgresoCuenta({ pasos, titulo, verificado }) {
  // Arranca desplegado, igual que en el servidor. Leer el
  // sessionStorage acá mismo haría que el primer render del navegador
  // no coincidiera con el HTML que llegó: React descarta la página y
  // la vuelve a pintar entera. Se lee un instante después.
  const [plegado, setPlegado] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLAVE) === '1') setPlegado(true);
    } catch { /* modo privado */ }
  }, []);

  // Cuenta lista: no hay nada que recordar
  if (verificado) return null;

  const hechos = pasos.filter((p) => p.hecho).length;
  const total = pasos.length;
  const pct = Math.round((hechos / total) * 100);
  const siguiente = pasos.find((p) => !p.hecho);

  if (!siguiente) return null;

  const plegar = (v) => {
    setPlegado(v);
    try { sessionStorage.setItem(CLAVE, v ? '1' : '0'); } catch { /* modo privado */ }
  };

  /* -------------------------------------------------- plegado */
  if (plegado) {
    return (
      <button data-tour="progreso" onClick={() => plegar(false)} style={S.pildora} title="Ver qué te falta">
        <span style={S.anillo}>
          <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" />
            <circle
              cx="11" cy="11" r="9" fill="none" stroke="#fff" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 9}
              strokeDashoffset={2 * Math.PI * 9 * (1 - hechos / total)}
            />
          </svg>
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>
          {hechos} de {total} listos
        </span>
        <span className="ms" style={{ fontSize: 18 }}>expand_more</span>
      </button>
    );
  }

  /* -------------------------------------------------- desplegado */
  return (
    <section data-tour="progreso" style={S.caja}>
      <span style={S.brillo} />

      <header style={S.cabecera}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={S.titulo}>{titulo}</span>
          <span style={S.bajada}>
            {hechos} de {total} pasos · te falta poco
          </span>
        </span>
        <button onClick={() => plegar(true)} style={S.plegar} aria-label="Plegar">
          <span className="ms" style={{ fontSize: 19 }}>expand_less</span>
        </button>
      </header>

      <div style={S.barra}>
        <span style={{ ...S.relleno, width: `${pct}%` }} />
      </div>

      <ol style={S.lista}>
        {pasos.map((p) => {
          const esSiguiente = p === siguiente;
          return (
            <li key={p.id} style={{ ...S.paso, opacity: p.hecho ? 0.6 : 1 }}>
              <span
                style={{
                  ...S.marca,
                  background: p.hecho ? 'var(--green)' : esSiguiente ? '#fff' : 'rgba(255,255,255,.14)',
                  color: p.hecho ? '#fff' : esSiguiente ? 'var(--ink)' : 'rgba(255,255,255,.5)',
                }}
              >
                {p.hecho
                  ? <span className="ms" style={{ fontSize: 14 }}>check</span>
                  : <span className="ms" style={{ fontSize: 15 }}>{p.icono}</span>}
              </span>

              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...S.pasoTitulo, textDecoration: p.hecho ? 'line-through' : 'none' }}>
                  {p.titulo}
                </span>
                {esSiguiente && p.detalle && (
                  <span style={S.pasoDetalle}>{p.detalle}</span>
                )}
              </span>

              {esSiguiente && (
                <Link href={p.href} style={S.ir}>
                  {p.cta ?? 'Hacerlo'}
                  <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      <p style={S.pie}>
        Mientras tanto puedes trabajar con un tope de 20 pedidos al día.
        Al terminar esto, se quita.
      </p>
    </section>
  );
}

const S = {
  caja: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 22, padding: 18, marginBottom: 18,
    background: 'linear-gradient(140deg, var(--ink) 0%, var(--ink2) 68%)',
    border: '1px solid rgba(255,255,255,.09)',
    color: '#fff',
    boxShadow: '0 14px 36px rgba(20,16,10,.22)',
  },
  brillo: {
    position: 'absolute', right: -60, top: -80, width: 200, height: 200,
    borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,122,77,.26), transparent 70%)',
  },
  cabecera: {
    position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  titulo: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16.5, letterSpacing: '-.01em',
  },
  bajada: {
    display: 'block', fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3,
  },
  plegar: {
    width: 30, height: 30, borderRadius: '50%', flex: 'none',
    background: 'rgba(255,255,255,.08)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  barra: {
    position: 'relative', height: 5, borderRadius: 99, marginTop: 14,
    background: 'rgba(255,255,255,.12)', overflow: 'hidden',
  },
  relleno: {
    display: 'block', height: '100%', borderRadius: 99,
    background: 'linear-gradient(90deg,#FFB57A,#FF7A4D)',
    transition: 'width .45s cubic-bezier(.2,0,0,1)',
  },

  lista: {
    position: 'relative', listStyle: 'none', margin: '16px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 11,
  },
  paso: { display: 'flex', alignItems: 'center', gap: 11 },
  marca: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .25s ease',
  },
  pasoTitulo: { display: 'block', fontSize: 13.5, fontWeight: 700 },
  pasoDetalle: {
    display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.5)',
    marginTop: 2, lineHeight: 1.4,
  },
  ir: {
    display: 'inline-flex', alignItems: 'center', gap: 5, flex: 'none',
    height: 32, padding: '0 13px', borderRadius: 999,
    background: '#fff', color: 'var(--ink)',
    fontSize: 12.5, fontWeight: 800, textDecoration: 'none',
  },

  pie: {
    position: 'relative', margin: '16px 0 0', paddingTop: 13,
    borderTop: '1px solid rgba(255,255,255,.09)',
    fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,.45)',
  },

  pildora: {
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '9px 14px', borderRadius: 999, marginBottom: 16,
    background: 'linear-gradient(120deg, var(--ink), var(--ink2))',
    border: '1px solid rgba(255,255,255,.1)', color: '#fff',
  },
  anillo: { display: 'flex', flex: 'none' },
};
