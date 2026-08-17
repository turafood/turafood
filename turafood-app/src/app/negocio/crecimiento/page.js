'use client';

/**
 * CRECIMIENTO
 *
 * Los servicios con los que TuraFood ayuda al negocio a posicionarse:
 * ficha de Google, campañas y agente de voz. Cada uno recoge en un
 * asistente lo que el equipo necesita para montarlo a mano.
 *
 * Ninguno se activa solo, y la pantalla lo dice. La app es la puerta;
 * el trabajo lo hace el equipo.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SERVICES, EXTRA_SERVICES, BUNDLE, SLUG } from '@/lib/serviciosConfig';
import { cop } from '@/lib/format';
import { getServiceRequests, SERVICE_STATUS } from '@/lib/servicios';
import { useBiz } from '../BizContext';

export default function CrecimientoPage() {
  const { business } = useBiz();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    getServiceRequests(business.id)
      .then((rows) => { if (alive) setRequests(rows); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [business]);

  const byKind = Object.fromEntries(requests.map((r) => [r.kind, r]));

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Encabezado */}
      <section style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: 'relative', maxWidth: 560 }}>
          <span style={S.kicker}>GROWTH PARTNER · TURAFOOD</span>
          <h1 style={S.heroTitle}>Que te encuentren, no solo que te pidan.</h1>
          <p style={S.heroText}>
            La app es gratis y lo seguirá siendo. Esto es lo otro: que aparezcas de
            primero en Google, que ninguna llamada se pierda y que las reservas se
            confirmen solas. Lo tomas suelto o todo junto.
          </p>
        </div>
      </section>

      {/* Puerta a la sección de Google: Ficha + Ads viven juntos allí */}
      <Link href="/negocio/crecimiento/google" style={S.googleBanner}>
        <span style={S.googleDot}>
          <span className="ms" style={{ fontSize: 24, color: '#2E6BFF' }}>travel_explore</span>
        </span>
        <span style={{ flex: 1, minWidth: 180 }}>
          <span style={S.googleTag}>GOOGLE GROWTH AI</span>
          <span style={S.googleTitle}>Tu negocio en Google, de punta a punta</span>
          <span style={S.googleText}>
            La ficha que sale en Maps y las campañas que te ponen de primero,
            explicadas sin tecnicismos y armadas por nosotros.
          </span>
        </span>
        <span className="ms" style={{ fontSize: 20, color: '#2E6BFF', flex: 'none' }}>arrow_forward</span>
      </Link>

      {/* Servicios con asistente */}
      <div style={S.grid}>
        {SERVICES.map((s) => {
          const req = byKind[s.kind];
          const st = SERVICE_STATUS[req?.status];
          return (
            <Link key={s.kind} href={`/negocio/crecimiento/${SLUG[s.kind]}`} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...S.icon, background: s.tint }}>
                  <span className="ms" style={{ fontSize: 24, color: s.accent }}>{s.icon}</span>
                </span>
                {req && st && (
                  <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
                )}
              </div>

              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                {s.title}
              </div>
              <p style={S.cardText}>{s.blurb}</p>

              <span style={{ ...S.cta, color: s.accent }}>
                {req?.status === 'draft' ? 'Continuar donde iba'
                  : req ? 'Ver mi solicitud'
                    : 'Conocer y empezar'}
                <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* El pack */}
      <section style={S.bundle}>
        <div style={S.bundleGlow} />
        <div style={{ position: 'relative', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <span style={S.bundleTag}>TODO JUNTO</span>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', marginTop: 12 }}>
              {BUNDLE.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 32, letterSpacing: '-.03em' }}>
                {cop(BUNDLE.price)}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', fontWeight: 700 }}>{BUNDLE.period}</span>
            </div>
            <div style={{ fontSize: 12.5, color: '#7BE0AE', fontWeight: 700, marginTop: 6 }}>
              {BUNDLE.saving}
            </div>
          </div>

          <ul style={S.bundleList}>
            {BUNDLE.includes.map((i) => (
              <li key={i} style={S.bundleItem}>
                <span className="ms" style={{ fontSize: 17, color: '#7BE0AE', flex: 'none' }}>check_circle</span>
                {i}
              </li>
            ))}
          </ul>
        </div>

        <div style={S.bundleFoot}>
          <span className="ms" style={{ fontSize: 18, color: 'rgba(255,255,255,.6)', flex: 'none' }}>info</span>
          <span style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(255,255,255,.65)' }}>
            Configura cada servicio arriba y al final elige el plan. Si terminas
            tomando varios, te armamos un solo precio con este descuento.
          </span>
        </div>
      </section>

      {/* Lo que hacemos además */}
      <section style={{ ...S.panel, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ ...S.icon, background: 'var(--surface2)' }}>
            <span className="ms" style={{ fontSize: 24, color: 'var(--text)' }}>rocket_launch</span>
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
              ¿Necesitas algo más grande?
            </div>
            <p style={{ ...S.cardText, marginTop: 6 }}>
              El mismo equipo que construyó TuraFood puede montarte otras cosas. Si algo
              de esto te sirve, escríbenos y lo hablamos sin compromiso.
            </p>
          </div>
        </div>

        <div style={S.extras}>
          {EXTRA_SERVICES.map((e) => (
            <div key={e.id} style={S.extra}>
              <span style={{ ...S.extraIcon, background: e.tint }}>
                <span className="ms" style={{ fontSize: 20, color: e.accent }}>{e.icon}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{e.title}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>
                  {e.blurb}
                </span>
              </span>
            </div>
          ))}
        </div>

        <a
          href="https://wa.me/573137594713?text=Hola,%20quiero%20saber%20de%20los%20servicios%20de%20TuraFood"
          target="_blank"
          rel="noopener noreferrer"
          className="md3-btn"
          style={S.contact}
        >
          <span className="ms" style={{ fontSize: 19 }}>chat</span>
          Hablar con el equipo
        </a>
      </section>

      {loading && (
        <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
          Cargando tus solicitudes…
        </div>
      )}
    </div>
  );
}

const S = {
  bundle: {
    position: 'relative', overflow: 'hidden', borderRadius: 22, padding: 24,
    background: 'linear-gradient(140deg,#241F1A 0%,#12100D 70%)', color: '#fff',
    marginTop: 18, boxShadow: '0 14px 36px rgba(20,16,10,.2)',
  },
  bundleGlow: {
    position: 'absolute', left: -50, bottom: -80, width: 240, height: 240, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(17,178,106,.28),rgba(17,178,106,0) 70%)',
  },
  bundleTag: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.08em', padding: '5px 10px',
    borderRadius: 6, background: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.8)',
  },
  bundleList: {
    listStyle: 'none', margin: 0, padding: 0, flex: 1, minWidth: 240,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  bundleItem: {
    display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13,
    lineHeight: 1.45, color: 'rgba(255,255,255,.88)',
  },
  bundleFoot: {
    position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10,
    marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)',
  },
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 28,
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 66%)', color: '#fff',
    boxShadow: '0 16px 40px rgba(20,16,10,.2)', marginBottom: 18,
  },
  heroGlow: {
    position: 'absolute', right: -60, top: -70, width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(255,68,31,.34),rgba(255,68,31,0) 70%)',
  },
  kicker: {
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)',
  },
  heroTitle: {
    margin: '10px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 28, lineHeight: 1.12, letterSpacing: '-.03em', textWrap: 'balance',
  },
  heroText: {
    margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.7)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16,
  },
  googleBanner: {
    display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap',
    padding: 18, borderRadius: 22, marginBottom: 16, textDecoration: 'none',
    background: 'linear-gradient(120deg, rgba(46,107,255,.14) 0%, rgba(46,107,255,.05) 100%)',
    border: '1px solid rgba(46,107,255,.3)', color: 'var(--text)',
  },
  googleDot: {
    width: 48, height: 48, borderRadius: 15, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(46,107,255,.16)',
  },
  googleTag: {
    display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: '#2E6BFF',
  },
  googleTitle: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17, letterSpacing: '-.02em', marginTop: 5,
  },
  googleText: {
    display: 'block', fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-soft)', marginTop: 5,
  },
  card: {
    display: 'block', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 20, boxShadow: 'var(--shadowSm)',
    textDecoration: 'none', color: 'var(--text)',
  },
  icon: {
    width: 50, height: 50, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pill: { fontSize: 10, fontWeight: 800, padding: '5px 9px', borderRadius: 7 },
  cardText: {
    margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55,
  },
  cta: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
    fontSize: 13, fontWeight: 800,
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)',
  },
  extras: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
    gap: 12, marginTop: 18,
  },
  extra: {
    display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14,
    borderRadius: 15, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0,
  },
  extraIcon: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  contact: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px',
    borderRadius: 999, background: 'var(--text)', color: 'var(--surface)',
    fontSize: 13.5, fontWeight: 700, textDecoration: 'none', marginTop: 18,
  },
};
