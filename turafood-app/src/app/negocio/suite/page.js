'use client';

/**
 * TURA BUSINESS SUITE — la portada
 *
 * La app de pedidos es gratis. Esto es lo que se cobra, así que esta
 * pantalla tiene un trabajo comercial: explicar qué hace cada pieza
 * antes de hablar de plata. Los precios viven en /negocio/crecimiento,
 * un clic más adentro, y no aquí.
 *
 * El fondo oscuro es a propósito: el resto del panel es claro y
 * operativo. Cuando alguien entra aquí está en otro modo —está
 * decidiendo en qué invertir, no despachando pedidos— y el cambio de
 * temperatura ayuda a marcarlo.
 *
 * Cada tarjeta dice lo que ESTÁ funcionando hoy, leído de la base. Si
 * no hay nada conectado lo dice; no finge estados.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBiz } from '../BizContext';
import { getServiceRequests } from '@/lib/servicios';
import { SLUG } from '@/lib/serviciosConfig';

/**
 * Los tres pilares. El orden es el del embudo: primero que te
 * encuentren (Google), luego que te sigan (redes), luego que la
 * operación no se caiga (servicios).
 */
const PILLARS = [
  {
    id: 'google',
    tag: 'GOOGLE ADS AI',
    title: 'Que te encuentren de primero',
    text:
      'Tu ficha en Maps y en el buscador, y campañas que te ponen arriba cuando alguien busca lo que vendes. Búsqueda, Maps, YouTube, Display y Máximo rendimiento.',
    bullets: [
      'Ficha reclamada y verificada a tu nombre',
      'Campañas en YouTube y en el buscador',
      'La cuenta de Google queda a tu nombre',
    ],
    href: '/negocio/crecimiento/google',
    cta: 'Ver Google Ads AI',
    accent: '#4C8DFF',
    glow: 'rgba(76,141,255,.22)',
    icon: 'travel_explore',
    kinds: ['gmb', 'google_ads'],
  },
  {
    id: 'redes',
    tag: 'REDES SOCIALES AI',
    title: 'Que publiques sin pensarlo',
    text:
      'Escribes una vez y Tura IA lo adapta a cada red con su tono y su formato. Ves el post como va a quedar antes de publicarlo, y los mensajes de todas tus cuentas llegan a una sola bandeja.',
    bullets: [
      'Vista previa real por red antes de publicar',
      'Bandeja única de mensajes y comentarios',
      'Tura IA reescribe según la red y el tono',
    ],
    href: '/negocio/redes',
    cta: 'Abrir Redes Sociales AI',
    accent: '#E0A83C',
    glow: 'rgba(224,168,60,.2)',
    icon: 'share',
    kinds: [],
  },
  {
    id: 'servicios',
    tag: 'SERVICIOS Y PLANES',
    title: 'Que la operación no dependa de ti',
    text:
      'Un agente de voz que contesta la línea y toma pedidos, reservas con recordatorio automático, sitio web y apps a la medida. Lo tomas suelto o todo junto en un pack.',
    bullets: [
      'Agente de voz que contesta 24/7',
      'Reservas con recordatorio por WhatsApp',
      'Sitio web y app con tu marca',
    ],
    href: '/negocio/crecimiento',
    cta: 'Ver servicios y precios',
    accent: '#FF7A4D',
    glow: 'rgba(255,122,77,.22)',
    icon: 'rocket_launch',
    kinds: ['voice_agent', 'booking', 'website', 'custom_app'],
  },
];

/** Lo que se responde antes de que lo pregunten */
const FAQ = [
  {
    q: '¿Necesito saber de tecnología?',
    a: 'No. Nosotros montamos la ficha, las campañas y las automatizaciones. Tú apruebas y miras los resultados desde este mismo panel.',
  },
  {
    q: '¿Lo que invierto en Google se lo quedan ustedes?',
    a: 'No. La cuenta de Google Ads queda a tu nombre y con tu tarjeta: ves cada peso y puedes pausar cuando quieras. Nosotros cobramos aparte por armarla y vigilarla.',
  },
  {
    q: '¿Puedo tomar solo una cosa?',
    a: 'Sí. Cada servicio se contrata suelto. El pack existe porque sale más barato junto, no porque haya que llevarlo todo.',
  },
  {
    q: '¿Y si quiero cancelar?',
    a: 'Cancelas cuando quieras, sin permanencia. Lo que ya está a tu nombre —la ficha de Google, tu dominio— se queda contigo.',
  },
];

export default function SuitePage() {
  const { business } = useBiz();
  const [requests, setRequests] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!business) return;
    getServiceRequests(business.id).then(setRequests).catch(() => {});
  }, [business]);

  const activeKinds = new Set(
    requests.filter((r) => ['in_progress', 'active'].includes(r.status)).map((r) => r.kind),
  );
  const activeCount = activeKinds.size;

  return (
    <div style={{ maxWidth: 1020 }}>
      {/* Portada */}
      <section style={S.hero}>
        <span style={S.heroGlowA} />
        <span style={S.heroGlowB} />

        <div style={{ position: 'relative', maxWidth: 620 }}>
          <span style={S.kicker}>
            <span style={S.kickerDot} />
            TURA BUSINESS SUITE
          </span>

          <h1 style={S.heroTitle}>
            No es una agencia.
            <br />
            Es tu <em style={S.em}>infraestructura de crecimiento</em>.
          </h1>

          <p style={S.heroText}>
            La app de pedidos es gratis y lo seguirá siendo. Esto es lo otro:
            que aparezcas de primero en Google, que publiques sin pensarlo y
            que ninguna llamada se pierda. Sin agencias, sin contratos largos.
          </p>

          <div style={S.heroActions}>
            <Link href="/negocio/crecimiento" style={S.heroPrimary}>
              Ver servicios y precios
              <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
            </Link>
            <a
              href="https://wa.me/573137594713?text=Hola,%20quiero%20saber%20de%20Tura%20Business%20Suite"
              target="_blank"
              rel="noopener noreferrer"
              style={S.heroGhost}
            >
              <span className="ms" style={{ fontSize: 18 }}>chat</span>
              Hablar con alguien
            </a>
          </div>

          <div style={S.heroStats}>
            <Stat value="24/7" label="Agente de voz contestando" />
            <Stat value="1" label="Bandeja para todas tus redes" />
            <Stat
              value={activeCount > 0 ? String(activeCount) : '—'}
              label={activeCount > 0 ? 'Servicios tuyos funcionando' : 'Todavía no tienes nada activo'}
            />
          </div>
        </div>
      </section>

      {/* Los tres pilares */}
      <div style={S.pillars}>
        {PILLARS.map((p) => {
          const mine = p.kinds.filter((k) => activeKinds.has(k));
          return (
            <article key={p.id} style={S.card}>
              <span style={{ ...S.cardGlow, background: `radial-gradient(circle, ${p.glow}, transparent 70%)` }} />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ ...S.cardIcon, background: `${p.accent}1F` }}>
                    <span className="ms" style={{ fontSize: 22, color: p.accent }}>{p.icon}</span>
                  </span>
                  {mine.length > 0 && (
                    <span style={S.activePill}>
                      <span className="ms" style={{ fontSize: 13 }}>check_circle</span>
                      {mine.length === 1 ? 'Activo' : `${mine.length} activos`}
                    </span>
                  )}
                </div>

                <div style={{ ...S.cardTag, color: p.accent }}>{p.tag}</div>
                <h2 style={S.cardTitle}>{p.title}</h2>
                <p style={S.cardText}>{p.text}</p>

                <ul style={S.bullets}>
                  {p.bullets.map((b) => (
                    <li key={b} style={S.bullet}>
                      <span className="ms" style={{ fontSize: 16, color: p.accent, flex: 'none' }}>check</span>
                      {b}
                    </li>
                  ))}
                </ul>

                <Link href={p.href} style={{ ...S.cardCta, color: p.accent, borderColor: `${p.accent}44` }}>
                  {p.cta}
                  <span className="ms" style={{ fontSize: 17 }}>arrow_forward</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {/* Lo que ya tienes montado */}
      {requests.length > 0 && (
        <section style={S.mine}>
          <div style={S.sectionTitle}>Lo tuyo, ahora mismo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
            {requests.slice(0, 5).map((r) => {
              const st = REQUEST_STATE[r.status] ?? REQUEST_STATE.draft;
              return (
                <Link key={r.id} href={`/negocio/crecimiento/${SLUG[r.kind] ?? ''}`} style={S.mineRow}>
                  <span style={{ ...S.mineDot, background: st.color }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={S.mineName}>{KIND_LABEL[r.kind] ?? r.kind}</span>
                    <span style={S.mineNote}>{st.note}</span>
                  </span>
                  <span style={{ ...S.mineTag, background: st.bg, color: st.color }}>{st.label}</span>
                  <span className="ms" style={{ fontSize: 18, color: 'rgba(255,255,255,.35)', flex: 'none' }}>
                    chevron_right
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Preguntas */}
      <section style={S.faq}>
        <div style={S.sectionTitle}>Lo que todo el mundo pregunta</div>
        <div style={{ marginTop: 14 }}>
          {FAQ.map((f, i) => {
            const on = open === i;
            return (
              <div key={f.q} style={S.faqItem}>
                <button onClick={() => setOpen(on ? null : i)} style={S.faqQ}>
                  <span style={{ flex: 1, textAlign: 'left' }}>{f.q}</span>
                  <span
                    className="ms"
                    style={{
                      fontSize: 20, flex: 'none', color: 'rgba(255,255,255,.5)',
                      transform: on ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease',
                    }}
                  >
                    expand_more
                  </span>
                </button>
                {on && <p style={S.faqA} className="anim-fade">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Cierre */}
      <section style={S.closing}>
        <span style={S.closingGlow} />
        <div style={{ position: 'relative' }}>
          <div style={S.closingTitle}>Tu competencia ya está en Google.</div>
          <p style={S.closingText}>
            Empieza por lo que más te duela hoy. No hay que llevarlo todo, ni firmar nada largo.
          </p>
          <Link href="/negocio/crecimiento" style={S.closingBtn}>
            Ver servicios y precios
            <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={S.statValue}>{value}</div>
      <div style={S.statLabel}>{label}</div>
    </div>
  );
}

const KIND_LABEL = {
  gmb: 'Ficha de Google', google_ads: 'Campañas en Google',
  voice_agent: 'Agente de voz', booking: 'Reservas',
  website: 'Sitio web', custom_app: 'App a la medida', other: 'Otro servicio',
};

const REQUEST_STATE = {
  draft:       { label: 'BORRADOR', color: '#B6AFA4', bg: 'rgba(255,255,255,.08)', note: 'Lo dejaste a medias, puedes seguir donde ibas' },
  submitted:   { label: 'ENVIADO',  color: '#FFC96B', bg: 'rgba(255,201,107,.14)', note: 'Lo estamos revisando' },
  in_progress: { label: 'MONTANDO', color: '#7FB2FF', bg: 'rgba(127,178,255,.14)', note: 'Nuestro equipo lo está armando' },
  active:      { label: 'ACTIVO',   color: '#7BE0AE', bg: 'rgba(123,224,174,.14)', note: 'Funcionando' },
  rejected:    { label: 'RECHAZADO',color: '#FF9B80', bg: 'rgba(255,155,128,.14)', note: 'Mira el motivo adentro' },
  cancelled:   { label: 'CANCELADO',color: '#B6AFA4', bg: 'rgba(255,255,255,.08)', note: 'Cancelado' },
};

const S = {
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 30, padding: '38px 30px 34px',
    background: 'linear-gradient(150deg, #221C17 0%, #100E0C 62%)',
    color: '#fff', boxShadow: '0 24px 60px rgba(20,16,10,.24)',
  },
  heroGlowA: {
    position: 'absolute', right: -90, top: -130, width: 380, height: 380, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,122,77,.3), transparent 68%)', filter: 'blur(10px)',
  },
  heroGlowB: {
    position: 'absolute', left: -120, bottom: -160, width: 340, height: 340, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(224,168,60,.18), transparent 70%)', filter: 'blur(10px)',
  },
  kicker: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 13px',
    borderRadius: 999, background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.14)',
    fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: 'rgba(255,255,255,.75)',
  },
  kickerDot: {
    width: 7, height: 7, borderRadius: '50%', background: '#7BE0AE',
    boxShadow: '0 0 0 3px rgba(123,224,174,.2)',
  },
  heroTitle: {
    margin: '20px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 'clamp(28px, 4.6vw, 42px)', lineHeight: 1.1, letterSpacing: '-.035em',
    textWrap: 'balance',
  },
  em: {
    fontStyle: 'italic',
    background: 'linear-gradient(96deg,#FFB57A,#FF7A4D)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  },
  heroText: {
    margin: '16px 0 0', maxWidth: 520, fontSize: 14.5, lineHeight: 1.65,
    color: 'rgba(255,255,255,.66)',
  },
  heroActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 },
  heroPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px',
    borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
    boxShadow: '0 12px 28px rgba(255,68,31,.36)',
  },
  heroGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px',
    borderRadius: 999, background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.16)', color: '#fff',
    fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
  },
  heroStats: {
    display: 'flex', gap: 30, flexWrap: 'wrap', marginTop: 30,
    paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.1)',
  },
  statValue: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.03em',
    background: 'linear-gradient(96deg,#FFD9A0,#FFB57A)',
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
  },
  statLabel: { fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 4, maxWidth: 180 },

  pillars: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
    gap: 16, marginTop: 16,
  },
  card: {
    position: 'relative', overflow: 'hidden', borderRadius: 26, padding: 22,
    background: 'linear-gradient(160deg, #1E1A16 0%, #131110 70%)',
    border: '1px solid rgba(255,255,255,.09)', color: '#fff',
    boxShadow: '0 16px 44px rgba(20,16,10,.2)',
  },
  cardGlow: {
    position: 'absolute', right: -70, top: -90, width: 240, height: 240,
    borderRadius: '50%', pointerEvents: 'none',
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 15, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  activePill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
    borderRadius: 999, background: 'rgba(123,224,174,.14)', color: '#7BE0AE',
    fontSize: 10.5, fontWeight: 800,
  },
  cardTag: { fontSize: 10, fontWeight: 800, letterSpacing: '.11em', marginTop: 18 },
  cardTitle: {
    margin: '8px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 19, lineHeight: 1.2, letterSpacing: '-.02em',
  },
  cardText: {
    margin: '10px 0 0', fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,.6)',
  },
  bullets: {
    listStyle: 'none', margin: '16px 0 0', padding: '15px 0 0',
    borderTop: '1px solid rgba(255,255,255,.09)',
    display: 'flex', flexDirection: 'column', gap: 9,
  },
  bullet: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,.78)',
  },
  cardCta: {
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 17px',
    borderRadius: 999, border: '1px solid', marginTop: 18,
    fontSize: 13, fontWeight: 700, textDecoration: 'none',
  },

  sectionTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
    letterSpacing: '-.02em', color: '#fff',
  },
  mine: {
    marginTop: 16, padding: 22, borderRadius: 26,
    background: 'linear-gradient(160deg, #1E1A16 0%, #131110 70%)',
    border: '1px solid rgba(255,255,255,.09)',
  },
  mineRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16,
    background: 'rgba(255,255,255,.04)', textDecoration: 'none', color: '#fff',
  },
  mineDot: { width: 8, height: 8, borderRadius: '50%', flex: 'none' },
  mineName: { display: 'block', fontSize: 13.5, fontWeight: 700 },
  mineNote: { display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 2 },
  mineTag: {
    flex: 'none', height: 22, padding: '0 9px', borderRadius: 999,
    fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center',
  },

  faq: {
    marginTop: 16, padding: 22, borderRadius: 26,
    background: 'linear-gradient(160deg, #1E1A16 0%, #131110 70%)',
    border: '1px solid rgba(255,255,255,.09)',
  },
  faqItem: { borderBottom: '1px solid rgba(255,255,255,.08)' },
  faqQ: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '15px 0', color: '#fff', fontSize: 14, fontWeight: 700,
  },
  faqA: {
    margin: '0 0 16px', fontSize: 13, lineHeight: 1.65,
    color: 'rgba(255,255,255,.62)', maxWidth: 640,
  },

  closing: {
    position: 'relative', overflow: 'hidden', marginTop: 16,
    borderRadius: 26, padding: '30px 26px', textAlign: 'center',
    background: 'linear-gradient(120deg,#FF5A2B,#FF441F)', color: '#fff',
  },
  closingGlow: {
    position: 'absolute', left: -60, top: -80, width: 260, height: 260, borderRadius: '50%',
    background: 'rgba(255,255,255,.12)',
  },
  closingTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 'clamp(21px,3vw,28px)', letterSpacing: '-.03em',
  },
  closingText: {
    margin: '10px auto 0', maxWidth: 460, fontSize: 13.5,
    lineHeight: 1.6, color: 'rgba(255,255,255,.86)',
  },
  closingBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 48, padding: '0 24px',
    borderRadius: 999, marginTop: 20, background: '#fff', color: 'var(--ink)',
    fontSize: 14.5, fontWeight: 700, textDecoration: 'none',
  },
};
