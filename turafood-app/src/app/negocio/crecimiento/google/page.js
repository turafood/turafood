'use client';

/**
 * GOOGLE GROWTH AI
 *
 * La casa de los dos servicios de Google: el Perfil de Negocio y las
 * campañas. Están juntos porque se potencian — una ficha completa hace
 * que los anuncios de Maps rindan más, y los anuncios traen visitas que
 * dejan opiniones en la ficha.
 *
 * La estructura sigue la de la propia página de Google: primero qué
 * consigues, después los formatos, y al final los tres pasos. Es la que
 * la gente ya reconoce cuando busca el tema.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GMB, GOOGLE_ADS, AD_FORMATS, FAMILIES, SLUG } from '@/lib/serviciosConfig';
import { getServiceRequests, SERVICE_STATUS } from '@/lib/servicios';
import { useBiz } from '../../BizContext';

const STEPS = [
  {
    n: '1', title: 'Reclamamos tu negocio',
    body: 'Creamos o recuperamos tu ficha en la Búsqueda y en Maps, verificada a tu nombre.',
  },
  {
    n: '2', title: 'Llenamos la información',
    body: 'Horarios, menú con precios, fotos de tus platos y las formas de comprar que ofreces.',
  },
  {
    n: '3', title: 'La mantenemos viva',
    body: 'Publicamos novedades, respondemos opiniones y ajustamos las campañas cada semana.',
  },
];

export default function GoogleGrowthPage() {
  const { business } = useBiz();
  const [requests, setRequests] = useState([]);
  const family = FAMILIES.google;

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    getServiceRequests(business.id)
      .then((rows) => { if (alive) setRequests(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [business]);

  const byKind = Object.fromEntries(requests.map((r) => [r.kind, r]));

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link href="/negocio/crecimiento" style={S.back}>
        <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
        Volver a crecimiento
      </Link>

      {/* Portada */}
      <section style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: 'relative', maxWidth: 620 }}>
          <span style={S.kicker}>
            <span className="ms" style={{ fontSize: 15 }}>{family.icon}</span>
            {family.name}
          </span>
          <h1 style={S.heroTitle}>
            <span style={{ color: '#8AB4F8' }}>Destácate</span> en Google
            <br />y sé encontrado primero.
          </h1>
          <p style={S.heroText}>
            La mayoría de tus clientes te busca en Google antes de pedir. Dos cosas
            deciden si te encuentran: qué tan completa está tu ficha y si apareces
            arriba cuando buscan lo que vendes. Trabajamos las dos.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 22 }}>
            <Link href={`/negocio/crecimiento/${SLUG.gmb}`} className="md3-btn" style={S.heroBtn}>
              Empezar ahora
              <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
            </Link>
            <a
              href="https://wa.me/573137594713?text=Hola,%20quiero%20hablar%20de%20Google%20para%20mi%20negocio"
              target="_blank"
              rel="noopener noreferrer"
              style={S.heroGhost}
            >
              Comienza con un experto
            </a>
          </div>
        </div>
      </section>

      {/* Los dos servicios */}
      <div style={S.grid}>
        {[GMB, GOOGLE_ADS].map((s) => {
          const req = byKind[s.kind];
          const st = SERVICE_STATUS[req?.status];
          return (
            <Link key={s.kind} href={`/negocio/crecimiento/${SLUG[s.kind]}`} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...S.cardIcon, background: s.tint }}>
                  <span className="ms" style={{ fontSize: 26, color: s.accent }}>{s.icon}</span>
                </span>
                {req && st && (
                  <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
                )}
              </div>

              <h2 style={S.cardTitle}>{s.title}</h2>
              <p style={S.cardText}>{s.blurb}</p>

              <ul style={S.cardList}>
                {s.intro.bullets.slice(0, 3).map((b) => (
                  <li key={b} style={S.cardItem}>
                    <span className="ms" style={{ fontSize: 16, color: s.accent, flex: 'none' }}>check</span>
                    {b}
                  </li>
                ))}
              </ul>

              <span style={{ ...S.cardCta, color: s.accent }}>
                {req?.status === 'draft' ? 'Continuar donde iba' : req ? 'Ver mi solicitud' : s.intro.cta}
                <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
              </span>
            </Link>
          );
        })}
      </div>

      {/* Lo que aparece en tu ficha */}
      <section style={{ ...S.panel, marginTop: 18 }}>
        <h2 style={S.panelTitle}>Lo que va a ver quien te busque</h2>
        <p style={S.panelSub}>
          Así queda tu ficha cuando está completa. Cada bloque es una razón más para
          que te elijan a ti y no al de al lado.
        </p>

        <div style={S.features}>
          {[
            { icon: 'restaurant_menu', title: 'Tu menú y tus mejores platos', body: 'Fotos y precios dentro de Google, tomados de tu catálogo de TuraFood.' },
            { icon: 'two_wheeler', title: 'Formas de comprar', body: 'Consumo en el lugar, para llevar, domicilio o retiro en la puerta, con palomita verde.' },
            { icon: 'schedule', title: 'Información esencial', body: 'Horarios reales, teléfono y dirección. Lo que más se consulta antes de decidir.' },
            { icon: 'event_available', title: 'Reserva con Google', body: 'La gente reserva mesa desde el buscador, sin llamarte ni salir de Google.' },
            { icon: 'reviews', title: 'Opiniones respondidas', body: 'Contestamos todas. Google premia las fichas que responden y la gente lo nota.' },
            { icon: 'campaign', title: 'Novedades y ofertas', body: 'Publicaciones semanales que mantienen la ficha activa y suben tu posición.' },
          ].map((f) => (
            <div key={f.icon} style={S.feature}>
              <span style={S.featureIcon}>
                <span className="ms" style={{ fontSize: 21, color: '#2E6BFF' }}>{f.icon}</span>
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.title}</div>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formatos de campaña */}
      <section style={{ ...S.panel, marginTop: 18 }}>
        <h2 style={S.panelTitle}>Las formas de llegar con Google Ads</h2>
        <p style={S.panelSub}>
          No todas sirven para lo mismo. Elegimos contigo según lo que quieras que pase.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
          {AD_FORMATS.map((f) => (
            <div key={f.id} style={S.format}>
              <span style={S.formatIcon}>
                <span className="ms" style={{ fontSize: 20, color: '#0B8E54' }}>{f.icon}</span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{f.label}</div>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={S.adsNote}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>info</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}>
            La cuenta de Google Ads queda a tu nombre y con tu tarjeta: ves cada peso que
            se gasta y puedes pausar cuando quieras. Nosotros cobramos aparte por armarla
            y vigilarla.
          </span>
        </div>
      </section>

      {/* Los tres pasos */}
      <section style={{ ...S.panel, marginTop: 18, textAlign: 'center' }}>
        <h2 style={{ ...S.panelTitle, fontSize: 22 }}>Cómo lo hacemos</h2>
        <p style={{ ...S.panelSub, maxWidth: 440, margin: '6px auto 0' }}>
          Tres pasos. El primero lo haces tú en cinco minutos; los otros dos son
          nuestros.
        </p>

        <div style={S.steps}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ minWidth: 0 }}>
              <div style={S.stepNumber}>{s.n}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 12 }}>{s.title}</div>
              <p style={{ margin: '7px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <Link href={`/negocio/crecimiento/${SLUG.gmb}`} className="md3-btn" style={S.bottomCta}>
          Empezar por mi ficha de Google
          <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
        </Link>
      </section>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', textDecoration: 'none',
  },
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 30,
    background: 'linear-gradient(145deg,#1B2333 0%,#0E1219 68%)', color: '#fff',
    boxShadow: '0 16px 40px rgba(14,18,25,.22)',
  },
  heroGlow: {
    position: 'absolute', right: -70, top: -80, width: 300, height: 300, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(46,107,255,.38),rgba(46,107,255,0) 70%)',
  },
  kicker: {
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 12px',
    borderRadius: 999, background: 'rgba(255,255,255,.1)',
    fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.85)',
  },
  heroTitle: {
    margin: '16px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 32, lineHeight: 1.1, letterSpacing: '-.03em', textWrap: 'balance',
  },
  heroText: {
    margin: '12px 0 0', fontSize: 14.5, lineHeight: 1.65, color: 'rgba(255,255,255,.7)',
  },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px',
    borderRadius: 999, background: '#2E6BFF', color: '#fff',
    fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
    boxShadow: '0 10px 26px rgba(46,107,255,.36)',
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', height: 48, padding: '0 20px',
    borderRadius: 999, border: '1px solid rgba(255,255,255,.24)',
    color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))',
    gap: 16, marginTop: 18,
  },
  card: {
    display: 'block', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)',
    textDecoration: 'none', color: 'var(--text)',
  },
  cardIcon: {
    width: 56, height: 56, borderRadius: 18, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pill: { fontSize: 10, fontWeight: 800, padding: '5px 9px', borderRadius: 7 },
  cardTitle: {
    margin: '16px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 19, letterSpacing: '-.02em',
  },
  cardText: { margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 },
  cardList: {
    listStyle: 'none', margin: '14px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardItem: {
    display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, lineHeight: 1.45,
  },
  cardCta: {
    display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 18,
    fontSize: 13, fontWeight: 800,
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 24, boxShadow: 'var(--shadowSm)',
  },
  panelTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 20, letterSpacing: '-.02em',
  },
  panelSub: { margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 },
  features: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
    gap: 14, marginTop: 20,
  },
  feature: {
    display: 'flex', gap: 12, alignItems: 'flex-start', padding: 15,
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0,
  },
  featureIcon: {
    width: 40, height: 40, borderRadius: 13, background: '#EAF1FF', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  format: {
    display: 'flex', gap: 13, alignItems: 'flex-start', padding: 15,
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)',
  },
  formatIcon: {
    width: 40, height: 40, borderRadius: 13, background: '#E6F6EE', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  adsNote: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16,
    padding: 14, borderRadius: 14, background: 'var(--bg)',
  },
  steps: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
    gap: 22, marginTop: 26, textAlign: 'center',
  },
  stepNumber: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 40,
    color: '#2E6BFF', lineHeight: 1,
  },
  bottomCta: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 50, padding: '0 24px',
    borderRadius: 999, background: '#2E6BFF', color: '#fff',
    fontSize: 14.5, fontWeight: 700, textDecoration: 'none', marginTop: 28,
    boxShadow: '0 10px 26px rgba(46,107,255,.3)',
  },
};
