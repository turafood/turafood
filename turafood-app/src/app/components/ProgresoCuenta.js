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
      <button data-tour="progreso" onClick={() => plegar(false)} style={S.pildora} title="Continuar configuración" className="anim-slidedown">
        <span style={S.anillo}>
          <svg width="24" height="24" viewBox="0 0 22 22" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="11" cy="11" r="9" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="2.5" />
            <circle
              cx="11" cy="11" r="9" fill="none" stroke="var(--primary)" strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 9}
              strokeDashoffset={2 * Math.PI * 9 * (1 - hechos / total)}
            />
          </svg>
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.01em' }}>
          {hechos}/{total} completados
        </span>
        <span className="ms" style={{ fontSize: 20 }}>expand_more</span>
      </button>
    );
  }

  /* -------------------------------------------------- desplegado */
  return (
    <>
      <style>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .bounce-icon { animation: bounce-subtle 2s ease-in-out infinite; }
        .anim-slideup { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slidedown { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <section data-tour="progreso" style={S.caja} className="anim-slideup">
        <span style={S.brillo} />

        <header style={S.cabecera}>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={S.titulo}>{titulo || 'Desbloquea todo tu potencial 🚀'}</span>
            <span style={S.bajada}>
              ¡Genial! Has completado {hechos} de {total} pasos. Estás muy cerca.
            </span>
          </span>
          <button onClick={() => plegar(true)} style={S.plegarBtn} aria-label="Ocultar para ver el panel">
            <span style={{ fontSize: 12, fontWeight: 600 }}>Ver panel</span>
            <span className="ms bounce-icon" style={{ fontSize: 18 }}>keyboard_arrow_up</span>
          </button>
        </header>

        <div style={S.barra}>
          <span style={{ ...S.relleno, width: `${pct}%` }} />
        </div>

        <ol style={S.lista}>
          {pasos.map((p) => {
            const esSiguiente = p === siguiente;
            return (
              <li key={p.id} style={{ ...S.paso, opacity: p.hecho ? 0.5 : 1 }}>
                <span
                  style={{
                    ...S.marca,
                    background: p.hecho ? 'var(--green)' : esSiguiente ? 'var(--primary)' : 'rgba(255,255,255,.08)',
                    color: p.hecho ? '#fff' : esSiguiente ? '#fff' : 'rgba(255,255,255,.3)',
                    boxShadow: esSiguiente ? '0 4px 12px rgba(255,68,31,.3)' : 'none',
                    border: esSiguiente ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {p.hecho
                    ? <span className="ms" style={{ fontSize: 14 }}>check</span>
                    : <span className="ms" style={{ fontSize: 15 }}>{p.icono}</span>}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ ...S.pasoTitulo, textDecoration: p.hecho ? 'line-through' : 'none', color: esSiguiente ? '#fff' : 'inherit' }}>
                    {p.titulo}
                  </span>
                  {esSiguiente && p.detalle && (
                    <span style={S.pasoDetalle}>{p.detalle}</span>
                  )}
                </span>

                {esSiguiente && (
                  <Link href={p.href} style={S.ir}>
                    {p.cta ?? 'Completar ahora'}
                    <span className="ms" style={{ fontSize: 16 }}>arrow_forward</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>

        <div style={S.pieContenedor}>
          <p style={S.pie}>
            💡 <strong>¡Ya puedes empezar a generar ingresos!</strong> Tienes un límite de 20 pedidos diarios. Termina estos pasos a tu ritmo para eliminar el límite y crecer sin frenos.
          </p>
        </div>
      </section>
    </>
  );
}

const S = {
  caja: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 24, padding: '24px 28px', marginBottom: 24,
    background: 'rgba(18, 18, 18, 0.65)',
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,.08)',
    color: '#fff',
    boxShadow: '0 20px 50px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  brillo: {
    position: 'absolute', right: -100, top: -100, width: 300, height: 300,
    borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,68,31,.12), transparent 60%)',
  },
  cabecera: {
    position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between',
  },
  titulo: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, letterSpacing: '-.02em', color: '#fff',
  },
  bajada: {
    display: 'block', fontSize: 13.5, color: 'rgba(255,255,255,.6)', marginTop: 4,
  },
  plegarBtn: {
    display: 'flex', alignItems: 'center', gap: 6, flex: 'none',
    padding: '8px 14px', borderRadius: 999,
    background: 'rgba(255,255,255,.05)', color: '#fff',
    border: '1px solid rgba(255,255,255,.08)',
    transition: 'all .2s',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },

  barra: {
    position: 'relative', height: 4, borderRadius: 99, marginTop: 22,
    background: 'rgba(255,255,255,.06)', overflow: 'hidden',
  },
  relleno: {
    display: 'block', height: '100%', borderRadius: 99,
    background: 'var(--primary)',
    transition: 'width .6s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 0 10px var(--primary)',
  },

  lista: {
    position: 'relative', listStyle: 'none', margin: '24px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 16,
  },
  paso: { display: 'flex', alignItems: 'center', gap: 16, transition: 'all .3s ease' },
  marca: {
    width: 32, height: 32, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all .3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  pasoTitulo: { display: 'block', fontSize: 15, fontWeight: 700, letterSpacing: '-.01em' },
  pasoDetalle: {
    display: 'block', fontSize: 13, color: 'rgba(255,255,255,.5)',
    marginTop: 3, lineHeight: 1.4,
  },
  ir: {
    display: 'inline-flex', alignItems: 'center', gap: 6, flex: 'none',
    height: 38, padding: '0 18px', borderRadius: 999,
    background: '#fff', color: '#000',
    fontSize: 13.5, fontWeight: 800, textDecoration: 'none',
    boxShadow: '0 4px 16px rgba(255,255,255,0.2)',
    transition: 'transform .2s, box-shadow .2s',
  },

  pieContenedor: {
    margin: '24px 0 0', paddingTop: 20,
    borderTop: '1px solid rgba(255,255,255,.06)',
  },
  pie: {
    fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.6)',
    margin: 0,
  },

  pildora: {
    display: 'inline-flex', alignItems: 'center', gap: 12,
    padding: '8px 16px 8px 10px', borderRadius: 999, marginBottom: 24,
    background: 'rgba(18, 18, 18, 0.65)',
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,.08)', color: '#fff',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'all .3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'pointer',
  },
  anillo: { display: 'flex', flex: 'none' },
};
