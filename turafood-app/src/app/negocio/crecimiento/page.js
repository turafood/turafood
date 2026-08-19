'use client';

/**
 * GROWTH PARTNER
 *
 * La app de TuraFood es gratis y va a seguir siéndolo. Esta pantalla
 * no vende la app: vende el paquete de tecnología que se alquila
 * aparte —agente de voz, reservas, correos, sitio web, campañas— y
 * que la persona puede tomar o no sin perder nada.
 *
 * ESE ORDEN NO ES CASUAL
 *
 * Lo primero que se lee es que lo gratis sigue gratis. Una página de
 * precios que arranca vendiendo hace que la persona lea todo con la
 * guardia arriba; una que arranca diciendo "esto no te lo vamos a
 * quitar" se lee distinto.
 *
 * Después la comparativa, que es la pieza que convence, y solo
 * entonces las tarjetas. Quien llegó hasta ahí ya sabe qué le
 * conviene: las tarjetas son para confirmar, no para decidir.
 *
 * Y al final las condiciones, completas y a la vista. Si la persona
 * se va a enterar después de que la pauta va aparte, mejor que se
 * entere ahora.
 *
 * MÓVIL PRIMERO: una columna, tarjetas apiladas, la del año arriba.
 * En escritorio las tres en fila. Eso vive en globals.css, porque un
 * estilo en línea le gana a cualquier media query.
 */

import { useState } from 'react';
import Link from 'next/link';
import { cop } from '@/lib/format';
import Comparativa from './Comparativa';
import { PLANES, CONDICIONES } from './planes';

export default function GrowthPartnerPage() {
  const [abierto, setAbierto] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ---------------------------------------------- promesa */}
      <section style={S.promesa}>
        <span style={S.promesaIcono} aria-hidden="true">🤝</span>
        <div>
          <h2 style={S.promesaTitulo}>La app seguirá siendo gratis</h2>
          <p style={S.promesaTexto}>
            Sin comisión por pedido, sin tarjeta, sin plazo. Lo de abajo es
            aparte: tecnología que te alquilamos si quieres crecer más
            rápido. Si no la tomas, tu negocio sigue igual de completo.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------- la cuenta */}
      <Comparativa />

      {/* ---------------------------------------------- los planes */}
      <section className="planes-grid" style={S.grid}>
        {PLANES.map((p) => (
          <article
            key={p.id}
            style={{
              ...S.plan,
              ...(p.destacado ? S.planTop : null),
            }}
          >
            {p.sello && <span style={S.sello}>{p.sello}</span>}

            <header>
              <h3 style={{ ...S.planNombre, color: p.destacado ? '#fff' : 'var(--text)' }}>
                {p.nombre}
              </h3>
              <p style={{ ...S.planGancho, color: p.destacado ? 'rgba(255,255,255,.6)' : 'var(--muted)' }}>
                {p.gancho}
              </p>
            </header>

            <div style={S.precioBloque}>
              <span style={{ ...S.precio, color: p.destacado ? '#fff' : 'var(--text)' }}>
                {p.precioTexto}
              </span>
              {p.porMes && (
                <span style={{ ...S.porMes, color: p.destacado ? '#FFB57A' : 'var(--primary)' }}>
                  {cop(p.porMes)} al mes
                </span>
              )}
              <span style={{ ...S.planDetalle, color: p.destacado ? 'rgba(255,255,255,.5)' : 'var(--muted)' }}>
                {p.detalle}
              </span>
            </div>

            <button
              disabled={p.id === 'gratis'}
              style={{
                ...S.cta,
                background: p.id === 'gratis'
                  ? 'transparent'
                  : p.destacado ? 'linear-gradient(120deg,#FFB57A,#FF7A4D)' : 'var(--primary)',
                color: p.id === 'gratis' ? 'var(--muted)' : '#fff',
                border: p.id === 'gratis' ? '1.5px solid var(--border)' : 'none',
                cursor: p.id === 'gratis' ? 'default' : 'pointer',
              }}
            >
              {p.cta}
            </button>

            <ul style={S.lista}>
              {p.incluye.map((it) => (
                <li
                  key={it.texto}
                  style={{
                    ...S.item,
                    opacity: it.si ? 1 : .42,
                    color: p.destacado ? 'rgba(255,255,255,.86)' : 'var(--text)',
                    fontWeight: it.fuerte ? 700 : 500,
                  }}
                >
                  <span
                    className="ms"
                    style={{
                      fontSize: 17, flex: 'none',
                      color: it.si
                        ? (p.destacado ? '#7BE8B0' : 'var(--green)')
                        : (p.destacado ? 'rgba(255,255,255,.3)' : 'var(--faint)'),
                    }}
                  >
                    {it.si ? 'check_circle' : 'cancel'}
                  </span>

                  {/* Lo que tiene pantalla propia se vuelve enlace. Es
                      la única puerta a esas pantallas desde que esta
                      página dejó de ser el hub de servicios. */}
                  {it.ver ? (
                    <Link
                      href={it.ver}
                      style={{
                        ...S.itemLink,
                        color: p.destacado ? '#FFB57A' : 'var(--primary)',
                      }}
                    >
                      {it.texto}
                      <span className="ms" style={{ fontSize: 14 }}>arrow_outward</span>
                    </Link>
                  ) : (
                    it.texto
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      {/* ---------------------------------------------- condiciones */}
      <section style={S.condiciones}>
        <button
          onClick={() => setAbierto((v) => (v ? null : 'cond'))}
          style={S.condBoton}
        >
          <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>gavel</span>
          <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>
            Lo que tienes que saber antes de decidir
          </span>
          <span
            className="ms"
            style={{ fontSize: 20, color: 'var(--faint)', transform: abierto ? 'rotate(180deg)' : 'none' }}
          >
            expand_more
          </span>
        </button>

        {abierto && (
          <ul style={S.condLista}>
            {CONDICIONES.map((c) => (
              <li key={c} style={S.condItem}>
                <span style={S.punto} aria-hidden="true" />
                {c}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const S = {
  promesa: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: 18, borderRadius: 20,
    background: 'color-mix(in srgb, var(--green) 9%, var(--surface))',
    border: '1px solid color-mix(in srgb, var(--green) 26%, transparent)',
  },
  promesaIcono: { fontSize: 28, lineHeight: 1, flex: 'none' },
  promesaTitulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17, letterSpacing: '-.01em', color: 'var(--text)',
  },
  promesaTexto: {
    margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--muted)',
  },

  grid: { display: 'grid', gap: 14 },

  plan: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', gap: 16,
    padding: 22, borderRadius: 24,
    background: 'var(--surface)', border: '1.5px solid var(--border)',
  },
  planTop: {
    background: 'linear-gradient(158deg, #241F1A 0%, #14110F 72%)',
    border: '1.5px solid rgba(255,181,122,.34)',
    boxShadow: '0 18px 44px rgba(20,16,10,.24)',
  },
  sello: {
    position: 'absolute', top: -10, left: 22,
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em',
    padding: '5px 11px', borderRadius: 999,
    background: 'linear-gradient(120deg,#FFB57A,#FF7A4D)', color: '#fff',
    boxShadow: '0 4px 12px rgba(255,122,77,.4)',
  },
  planNombre: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 18, letterSpacing: '-.015em',
  },
  planGancho: { margin: '5px 0 0', fontSize: 12.5, lineHeight: 1.45 },

  precioBloque: { display: 'flex', flexDirection: 'column', gap: 4 },
  precio: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 34, lineHeight: 1, letterSpacing: '-.03em',
  },
  porMes: { fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em' },
  planDetalle: { fontSize: 11.8, lineHeight: 1.5, marginTop: 2 },

  cta: {
    height: 48, borderRadius: 999,
    fontSize: 14.5, fontWeight: 800, letterSpacing: '-.01em',
  },

  lista: {
    listStyle: 'none', margin: 0, padding: 0,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 9,
    fontSize: 12.8, lineHeight: 1.45,
  },
  itemLink: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    textDecoration: 'none', fontWeight: 700,
  },

  condiciones: {
    borderRadius: 18, background: 'var(--surface)',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  condBoton: {
    display: 'flex', alignItems: 'center', gap: 11,
    width: '100%', padding: 16, background: 'none',
  },
  condLista: {
    listStyle: 'none', margin: 0, padding: '0 16px 16px',
    display: 'flex', flexDirection: 'column', gap: 11,
  },
  condItem: {
    display: 'flex', gap: 10, fontSize: 12.5, lineHeight: 1.6,
    color: 'var(--muted)',
  },
  punto: {
    width: 5, height: 5, borderRadius: '50%', flex: 'none',
    background: 'var(--primary)', marginTop: 7,
  },
};
