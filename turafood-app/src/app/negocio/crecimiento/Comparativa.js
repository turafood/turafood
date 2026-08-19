'use client';

/**
 * LA COMPARATIVA: DOS BARRAS Y UN NÚMERO
 *
 * Es la pieza que tiene que hacer todo el trabajo de la página.
 *
 * POR QUÉ EN PLATA Y NO EN PORCENTAJE
 *
 * "-74%" se lee y se olvida. "Te ahorras $2.578.000" se queda, porque
 * es una cifra que la persona puede imaginar en su bolsillo — es un
 * año de arriendo del local, o una nevera y un congelador.
 *
 * POR QUÉ DOS BARRAS Y NO UNA TABLA
 *
 * La diferencia entre $3.468.000 y $890.000 en una tabla son dos
 * líneas de texto que hay que restar mentalmente. En dos barras, una
 * mide casi cuatro veces la otra y no hay nada que calcular: se ve.
 *
 * Las barras crecen al entrar en pantalla y no al cargar. Si crecen
 * mientras la persona todavía está leyendo lo de arriba, se pierde el
 * único momento en que el movimiento significa algo.
 */

import { useEffect, useRef, useState } from 'react';
import { cop } from '@/lib/format';
import { PLAN_ANCLA, anualPorMeses, ahorro, porMes, descuento } from './planes';

export default function Comparativa() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Si el navegador no lo soporta, se muestran crecidas de una: la
    // información importa más que la animación.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const total = anualPorMeses(PLAN_ANCLA);
  const pctAnual = Math.round((PLAN_ANCLA.anio / total) * 100);

  return (
    <section ref={ref} style={S.caja}>
      <span style={S.brillo} aria-hidden="true" />

      <header style={{ position: 'relative' }}>
        <span style={S.etiqueta}>LA CUENTA, SIN VUELTAS</span>
        <h3 style={S.titulo}>
          Un año de Tura Growth cuesta
          <br />
          la cuarta parte de pagarlo mes a mes.
        </h3>
        <p style={S.bajada}>
          Es la misma tecnología, los mismos doce meses. Lo único que cambia
          es cuándo pagas.
        </p>
      </header>

      {/* -------------------------------------------- las dos barras */}
      <div style={S.barras}>
        <Barra
          etiqueta="Pagando mes a mes"
          sub={`12 pagos de ${cop(PLAN_ANCLA.mes)}`}
          monto={total}
          ancho={visible ? 100 : 0}
          color="rgba(255,255,255,.18)"
          borde="rgba(255,255,255,.28)"
          tinta="rgba(255,255,255,.72)"
        />
        <Barra
          etiqueta="Pagando el año de una"
          sub="1 solo pago"
          monto={PLAN_ANCLA.anio}
          ancho={visible ? pctAnual : 0}
          color="linear-gradient(90deg, #FFB57A, #FF7A4D)"
          borde="transparent"
          tinta="#fff"
          fuerte
        />
      </div>

      {/* -------------------------------------------- el número */}
      <div style={S.ahorro}>
        <span style={S.ahorroLabel}>TE QUEDAS CON</span>
        <span style={S.ahorroCifra}>{cop(ahorro(PLAN_ANCLA))}</span>
        <span style={S.ahorroTexto}>
          en el bolsillo — el {descuento(PLAN_ANCLA)}% de lo que pagarías
          mes a mes, por la misma tecnología.
        </span>
      </div>

      {/* -------------------------------------------- por mes */}
      <div style={S.mensuales}>
        <div style={S.mensual}>
          <span style={S.mensualLabel}>Mes a mes</span>
          <span style={S.mensualCifra}>{cop(PLAN_ANCLA.mes)}</span>
          <span style={S.mensualPie}>al mes</span>
        </div>

        <span className="ms" style={S.flecha}>arrow_forward</span>

        <div style={{ ...S.mensual, ...S.mensualBueno }}>
          <span style={{ ...S.mensualLabel, color: '#FFB57A' }}>El año</span>
          <span style={{ ...S.mensualCifra, color: '#fff' }}>
            {cop(porMes(PLAN_ANCLA))}
          </span>
          <span style={S.mensualPie}>al mes</span>
        </div>
      </div>

      <p style={S.pie}>
        Menos de lo que te cuesta un domicilio y medio al día.
      </p>
    </section>
  );
}

function Barra({ etiqueta, sub, monto, ancho, color, borde, tinta, fuerte }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={S.barraCabecera}>
        <span style={{ ...S.barraEtiqueta, color: tinta }}>
          {etiqueta}
          <span style={S.barraSub}>{sub}</span>
        </span>
        <span style={{ ...S.barraMonto, color: tinta, fontSize: fuerte ? 21 : 17 }}>
          {cop(monto)}
        </span>
      </div>

      <div style={S.pista}>
        <span
          style={{
            ...S.relleno,
            width: `${ancho}%`,
            background: color,
            border: `1px solid ${borde}`,
          }}
        />
      </div>
    </div>
  );
}

const S = {
  caja: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 26, padding: 24,
    background: 'linear-gradient(150deg, var(--ink) 0%, var(--ink2) 70%)',
    color: 'var(--onInk)',
  },
  brillo: {
    position: 'absolute', right: -80, top: -110, width: 280, height: 280,
    borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(255,122,77,.28), transparent 70%)',
  },

  etiqueta: {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: '#FFB57A',
  },
  titulo: {
    margin: '10px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 23, lineHeight: 1.22, letterSpacing: '-.025em',
  },
  bajada: {
    margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.6,
    color: 'var(--inkSoft)',
  },

  barras: { position: 'relative', marginTop: 26 },
  barraCabecera: {
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    gap: 12, marginBottom: 8,
  },
  barraEtiqueta: { fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 },
  barraSub: {
    display: 'block', marginTop: 2, fontSize: 11,
    fontWeight: 500, color: 'rgba(255,255,255,.42)',
  },
  barraMonto: {
    fontWeight: 800, letterSpacing: '-.02em', flex: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  pista: {
    height: 30, borderRadius: 10, overflow: 'hidden',
    background: 'rgba(255,255,255,.06)',
  },
  relleno: {
    display: 'block', height: '100%', borderRadius: 10,
    transition: 'width 1.1s cubic-bezier(.2,0,0,1)',
  },

  ahorro: {
    position: 'relative', marginTop: 8, padding: '18px 20px',
    borderRadius: 18, textAlign: 'center',
    background: 'rgba(255,122,77,.13)',
    border: '1px dashed rgba(255,181,122,.45)',
  },
  ahorroLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    letterSpacing: '.1em', color: '#FFB57A',
  },
  ahorroCifra: {
    display: 'block', marginTop: 6,
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 38, lineHeight: 1, letterSpacing: '-.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  ahorroTexto: {
    display: 'block', marginTop: 8, fontSize: 12.5, lineHeight: 1.5,
    color: 'var(--inkSoft)',
  },

  mensuales: {
    position: 'relative', display: 'flex', alignItems: 'center',
    gap: 12, marginTop: 20,
  },
  mensual: {
    flex: 1, padding: '14px 12px', borderRadius: 16, textAlign: 'center',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid var(--inkLine)',
  },
  mensualBueno: {
    background: 'rgba(255,122,77,.16)',
    border: '1px solid rgba(255,181,122,.4)',
  },
  mensualLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    letterSpacing: '.08em', color: 'rgba(255,255,255,.5)',
  },
  mensualCifra: {
    display: 'block', marginTop: 6, fontWeight: 800, fontSize: 20,
    letterSpacing: '-.02em', color: 'rgba(255,255,255,.8)',
    fontVariantNumeric: 'tabular-nums',
  },
  mensualPie: {
    display: 'block', marginTop: 2, fontSize: 11,
    color: 'rgba(255,255,255,.4)',
  },
  flecha: {
    fontSize: 20, color: 'rgba(255,255,255,.3)', flex: 'none',
  },

  pie: {
    position: 'relative', margin: '18px 0 0', textAlign: 'center',
    fontSize: 12.5, color: 'var(--inkSoft)',
  },
};
