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
import CabeceraSeccion from '../../components/CabeceraSeccion';
import { CONDICIONES } from './planes';

export default function GrowthPartnerPage() {
  const [abierto, setAbierto] = useState(null);
  // Anual por defecto: es el que queremos vender y el que deja mejor
  // parada la comparativa de arriba.
  const [anual, setAnual] = useState(true);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={S.premiumHeader}>
        <div style={S.premiumBadge}>GROWTH PARTNER</div>
        <h1 style={S.premiumTitle}>Crece más rápido, si quieres</h1>
        <p style={S.premiumSubtitle}>
          La app de pedidos <b>seguirá siendo gratis por siempre</b>. Sin comisiones por venta.
          Lo de abajo es tecnología que te alquilamos aparte — la tomas o no, sin perder nada.
        </p>
      </div>

      {/* ---------------------------------------------- marcas locales (social proof) */}
      <div style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        background: '#0a0806 url(https://images.unsplash.com/photo-1544025162-817bf51323be?q=80&w=1200&auto=format&fit=crop) center/cover',
        padding: '64px 24px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Overlay oscuro para legibilidad */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,8,6,0.85) 0%, rgba(10,8,6,0.95) 100%)' }} />
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
            CON LA CONFIANZA DE RESTAURANTES DEL PACÍFICO
          </div>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.02em', color: '#fff', marginBottom: 48 }}>
            Marcas locales que ya venden <span className="tf-serif tf-gold-text" style={{ fontWeight: 400 }}>con Tura</span>
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '32px 64px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-.03em', lineHeight: 1 }}>120+</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>Restaurantes en el<br/>Pacífico</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-.03em', lineHeight: 1 }}>38K</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>Reservas<br/>gestionadas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-.03em', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                4.9 <span className="ms" style={{ fontSize: 28 }}>star</span>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>Calificación<br/>promedio</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--gold)', letterSpacing: '-.03em', lineHeight: 1 }}>24/7</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 8, fontWeight: 500, lineHeight: 1.4 }}>Voice AI<br/>siempre activo</div>
            </div>
          </div>
        </div>
      </div>


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
  premiumHeader: {
    padding: '40px 24px', borderRadius: 24,
    background: 'linear-gradient(135deg, rgba(20,20,20,0.9), rgba(10,10,10,1))',
    border: '1px solid rgba(255,255,255,0.05)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
  },
  premiumBadge: {
    display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 12px',
    borderRadius: 99, background: 'rgba(217, 154, 21, 0.1)', color: '#D99A15',
    border: '1px solid rgba(217, 154, 21, 0.2)', fontSize: 11, fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16,
  },
  premiumTitle: {
    fontFamily: 'var(--font-bricolage)', fontSize: 32, fontWeight: 800, color: '#fff',
    letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 12px 0'
  },
  premiumSubtitle: {
    fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 500, margin: 0
  },
  promesa: {
    display: 'none'
  },
  conmutador: {
    display: 'flex', gap: 4, padding: 4, borderRadius: 999,
    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
    alignSelf: 'center',
  },
  conmBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    height: 38, padding: '0 20px', borderRadius: 999,
    fontSize: 13.5, fontWeight: 700,
    transition: 'background .2s cubic-bezier(.2,0,0,1), color .2s ease',
  },
  ahorroTag: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em',
    padding: '3px 7px', borderRadius: 999,
    background: 'var(--green)', color: '#fff',
  },
  precioMes: {
    fontSize: 14, fontWeight: 600, letterSpacing: 0,
    color: 'var(--muted)', marginLeft: 3,
  },

  grid: { display: 'grid', gap: 14 },

  plan: {
    position: 'relative',
    display: 'flex', flexDirection: 'column', gap: 16,
    padding: 22, borderRadius: 24,
    background: 'var(--surface)', border: '1.5px solid var(--border)',
  },
  planTop: {
    background: 'linear-gradient(158deg, var(--ink) 0%, var(--ink2) 72%)',
    border: '1.5px solid rgba(255,181,122,.34)',
    padding: '3px',
    background: 'linear-gradient(135deg, rgba(217, 154, 21, 0.4), rgba(242, 211, 153, 0.1))',
    boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
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
