'use client';

/**
 * RESEÑAS DE CLIENTES
 * Conversión de `isReviews` (línea 655) del mockup de Negocios.
 *
 * Responder escribe por RPC: la base comprueba que la reseña sea de
 * este negocio y solo deja tocar la respuesta.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { relativeTime } from '@/lib/format';
import { getReviews, replyToReview } from '@/lib/negocio';
import { useBiz } from '../BizContext';
import HeaderHero from '../../components/HeaderHero';

const AVATAR_BG = [
  { bg: 'color-mix(in srgb, #E2360F 12%, transparent)', color: '#E2360F' },
  { bg: 'color-mix(in srgb, #2E6BFF 12%, transparent)', color: '#2E6BFF' },
  { bg: 'color-mix(in srgb, #0B8E54 12%, transparent)', color: '#0B8E54' },
  { bg: 'color-mix(in srgb, #6B2FD6 12%, transparent)', color: '#6B2FD6' },
  { bg: 'color-mix(in srgb, #A8730B 12%, transparent)', color: '#A8730B' },
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function ResenasPage() {
  const { business, setPendingReviews, toast, demoMode: simulatedMode } = useBiz();
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState(0);
  const [drafts, setDrafts] = useState({});
  const [sending, setSending] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const rows = await getReviews(business.id);
        if (alive) setReviews(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  // Semilla de reseñas Google-style
  const seedReviews = useMemo(() => {
    const base = [
      {
        id: 's1', rating: 5, created_at: new Date(Date.now() - 86400000).toISOString(),
        customer: { full_name: 'Daniela Restrepo', tura_plus: true, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
        comment: '¡Increíble! La comida llegó caliente y el empaque es de primera. Definitivamente volveré a pedir.',
        business_reply: '¡Gracias Daniela! Nos encanta saber que disfrutaste la experiencia. Te esperamos pronto.', replied_at: new Date(Date.now() - 40000000).toISOString(),
        tags: ['Empaque excelente', 'Comida caliente']
      },
      {
        id: 's2', rating: 5, created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        customer: { full_name: 'Mateo Giraldo', tura_plus: false, avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026703d' },
        comment: 'El mejor sabor que he probado en mucho tiempo. 10/10.',
        tags: ['Sabor increíble']
      },
      {
        id: 's3', rating: 4, created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        customer: { full_name: 'Sofía Londoño', tura_plus: true, avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d' },
        comment: 'Muy rico todo, pero se demoró un poquito más de lo esperado en llegar.',
        tags: ['Buen sabor', 'Demora']
      },
      {
        id: 's4', rating: 5, created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        customer: { full_name: 'Carlos Mesa', tura_plus: false, avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d' },
        comment: 'Brutal. Las porciones son enormes por el precio.',
        tags: ['Buen precio']
      }
    ];
    // Generar volumen extra falso para simular 148 reseñas en los stats
    const filler = Array(144).fill(null).map((_, i) => ({
      id: `filler-${i}`,
      rating: Math.random() > 0.8 ? 4 : 5, // Mayoría 5 estrellas
      business_reply: Math.random() > 0.2 ? 'Gracias!' : null
    }));
    return [...base, ...filler];
  }, []);

  const actualReviews = simulatedMode ? seedReviews : reviews;
  const pending = actualReviews.filter((r) => !r.business_reply).length;

  useEffect(() => { setPendingReviews(pending); }, [pending, setPendingReviews]);

  const filters = [
    { label: 'Todas', match: () => true },
    { label: `Sin responder · ${pending}`, match: (r) => !r.business_reply },
    { label: 'Críticas (1–2★)', match: (r) => r.rating <= 2 },
    { label: 'Positivas (4–5★)', match: (r) => r.rating >= 4 },
  ];

  const shown = actualReviews.filter(filters[filter].match).filter(r => r.comment || r.id.startsWith('s'));

  const stats = useMemo(() => {
    const n = actualReviews.length;
    const sum = actualReviews.reduce((a, r) => a + Number(r.rating ?? 0), 0);
    const avg = n ? sum / n : 0;
    const counts = [5, 4, 3, 2, 1].map((k) => actualReviews.filter((r) => r.rating === k).length);
    const replied = actualReviews.filter((r) => r.business_reply).length;
    return {
      n, avg, counts,
      rate: n ? Math.round((replied / n) * 100) : 100,
      recommend: n ? Math.round((actualReviews.filter((r) => r.rating >= 4).length / n) * 100) : 0,
    };
  }, [actualReviews]);

  const send = async (review) => {
    const text = (drafts[review.id] ?? '').trim();
    if (!text) return;
    setSending(review.id);
    try {
      await replyToReview(review.id, text);
      setReviews((list) => list.map((r) => (
        r.id === review.id ? { ...r, business_reply: text, replied_at: new Date().toISOString() } : r
      )));
      setDrafts((d) => ({ ...d, [review.id]: '' }));
      toast('Respuesta publicada');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          <span>{error}</span>
        </div>
      )}

      <HeaderHero
        title="Gestión de reputación"
        subtitle="Construye confianza respondiendo a tus clientes. Una excelente calificación es el factor #1 para conseguir nuevos clientes orgánicamente en TuraFood."
        images={[
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1200&auto=format&fit=crop', // Restaurant vibe
          'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1200&auto=format&fit=crop'
        ]}
      />

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20, alignItems: 'start' }}>
        <section style={{ ...S.card, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ms" style={{ fontSize: 24, color: '#4285F4' }}>google</span>
              <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-bricolage)' }}>Resumen Google Style</span>
            </div>
            {simulatedMode && (
              <span style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                MODO DEMO
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 56, letterSpacing: '-.04em', lineHeight: 1 }}>
                {stats.avg.toFixed(1).replace('.', ',')}
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 6 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="ms ms-fill"
                    style={{ fontSize: 17, color: i < Math.round(stats.avg) ? 'var(--amber)' : 'var(--border)' }}
                  >
                    star
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, marginTop: 7 }}>
                {stats.n.toLocaleString('es-CO')} {stats.n === 1 ? 'reseña' : 'reseñas'}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[5, 4, 3, 2, 1].map((n, i) => {
                const pct = stats.n ? Math.round((stats.counts[i] / stats.n) * 100) : 0;
                return (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', width: 10, textAlign: 'right' }}>{n}</span>
                    <span className="ms ms-fill" style={{ fontSize: 13, color: 'var(--amber)' }}>star</span>
                    <span style={S.distTrack}>
                      <span
                        style={{
                          display: 'block', height: '100%', borderRadius: 99,
                          width: `${Math.max(pct, 0)}%`,
                          background: n >= 4 ? '#34A853' : n === 3 ? '#FBBC05' : '#EA4335',
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--faint)', width: 36, textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16 }}>
          {[
            { label: 'Tasa de respuesta', value: `${stats.rate}%`, icon: 'forum', bg: 'color-mix(in srgb, #2E6BFF 12%, transparent)', fg: '#2E6BFF' },
            { label: 'Sin responder', value: String(pending), icon: 'mark_email_unread', bg: 'color-mix(in srgb, #E2360F 12%, transparent)', fg: '#E2360F' },
            { label: 'Recomendarían', value: `${stats.recommend}%`, icon: 'thumb_up', bg: 'color-mix(in srgb, #A8730B 12%, transparent)', fg: '#A8730B' },
            { label: 'Calificación', value: stats.avg.toFixed(1).replace('.', ','), icon: 'star', bg: 'color-mix(in srgb, #0B8E54 12%, transparent)', fg: '#0B8E54' },
          ].map((k) => (
            <div key={k.label} style={S.card}>
              <span style={{ ...S.kpiIcon, background: k.bg }}>
                <span className="ms" style={{ fontSize: 21, color: k.fg }}>{k.icon}</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', marginTop: 14 }}>
                {k.value}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginTop: 4 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Herramientas de Google: la reputación no vive solo aquí */}
      <section style={S.google}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
          <span style={S.googleIcon}>
            <span className="ms" style={{ fontSize: 24, color: '#2E6BFF' }}>travel_explore</span>
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18 }}>
              Herramientas de Google
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
              Tu reputación no vive solo en TuraFood. La mayoría de la gente busca en
              Google antes de pedir, y ahí se ven otras reseñas. Nosotros te montamos la
              ficha y las campañas.
            </p>
          </div>
        </div>

        <div style={S.googleGrid}>
          <Link href="/negocio/crecimiento/google-negocio" style={S.googleCard}>
            <span style={{ ...S.googleCardIcon, background: 'color-mix(in srgb, #2E6BFF 12%, transparent)' }}>
              <span className="ms" style={{ fontSize: 21, color: '#2E6BFF' }}>storefront</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.googleCardTitle}>Ficha de Google</span>
              <span style={S.googleCardText}>
                Sales en Maps con tus horarios, tus fotos y tus reseñas.
              </span>
            </span>
            <span className="ms" style={{ fontSize: 20, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
          </Link>

          <Link href="/negocio/crecimiento/google-ads" style={S.googleCard}>
            <span style={{ ...S.googleCardIcon, background: 'color-mix(in srgb, #0B8E54 12%, transparent)' }}>
              <span className="ms" style={{ fontSize: 21, color: '#0B8E54' }}>campaign</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.googleCardTitle}>Campañas en Google</span>
              <span style={S.googleCardText}>
                Apareces de primero cuando busquen lo que vendes.
              </span>
            </span>
            <span className="ms" style={{ fontSize: 20, color: 'var(--faint)', flex: 'none' }}>chevron_right</span>
          </Link>
        </div>
      </section>

      {/* Filtros */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
        {filters.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setFilter(i)}
            style={{ ...S.chip, ...(i === filter ? S.chipOn : S.chipOff) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
        {shown.map((r, i) => {
          const av = AVATAR_BG[i % AVATAR_BG.length];
          const tag = r.rating <= 2
            ? { label: 'NECESITA ATENCIÓN', bg: 'color-mix(in srgb, #E2360F 12%, transparent)', color: '#E2360F' }
            : r.rating === 3
              ? { label: 'NEUTRAL', bg: 'color-mix(in srgb, #A8730B 12%, transparent)', color: '#A8730B' }
              : { label: 'POSITIVA', bg: 'color-mix(in srgb, #0B7A48 12%, transparent)', color: '#0B7A48' };
          const draft = drafts[r.id] ?? '';

          return (
            <article key={r.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                {r.customer?.avatar ? (
                  <img src={r.customer.avatar} alt="Avatar" style={{ ...S.avatar, border: 'none' }} />
                ) : (
                  <span style={{ ...S.avatar, background: av.bg, color: av.color }}>
                    {initials(r.customer?.full_name)}
                  </span>
                )}
                <span style={{ flex: 1, minWidth: 180 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 15.5 }}>{r.customer?.full_name ?? 'Cliente'}</span>
                    {r.customer?.tura_plus && <span style={S.plus}>TURA PLUS</span>}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 5 }}>
                    <span style={{ display: 'flex', gap: 1 }}>
                      {[0, 1, 2, 3, 4].map((k) => (
                        <span
                          key={k}
                          className="ms ms-fill"
                          style={{ fontSize: 15, color: k < r.rating ? 'var(--amber)' : 'var(--border)' }}
                        >
                          star
                        </span>
                      ))}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 700 }}>
                      {relativeTime(r.created_at)}
                      {r.order_number ? ` · Pedido #${r.order_number}` : ''}
                    </span>
                  </span>
                </span>
                <span style={{ ...S.tag, background: tag.bg, color: tag.color }}>{tag.label}</span>
              </div>

              {r.comment && (
                <div style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 14, textWrap: 'pretty' }}>
                  {r.comment}
                </div>
              )}

              {(r.tags ?? []).length > 0 && (
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 12 }}>
                  {r.tags.map((c) => <span key={c} style={S.reviewChip}>{c}</span>)}
                </div>
              )}

              {r.business_reply ? (
                <div style={S.reply}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--primary)', flex: 'none' }}>reply</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>
                      TU RESPUESTA · {relativeTime(r.replied_at) || 'Hace un momento'}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, marginTop: 5 }}>
                      {r.business_reply}
                    </span>
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                  <input
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') send(r); }}
                    placeholder={`Responde a ${String(r.customer?.full_name ?? '').split(' ')[0] || 'tu cliente'}…`}
                    style={S.replyInput}
                  />
                  <button
                    onClick={() => send(r)}
                    disabled={!draft.trim() || sending === r.id}
                    style={{
                      ...S.sendBtn,
                      background: draft.trim() ? 'var(--primary)' : 'var(--surface2)',
                      color: draft.trim() ? '#fff' : 'var(--faint)',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>send</span>
                    {sending === r.id ? 'Enviando…' : 'Responder'}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {!loading && shown.length === 0 && (
        <div style={S.empty}>
          <span style={S.emptyIcon}>
            <span className="ms" style={{ fontSize: 30, color: 'var(--green)' }}>task_alt</span>
          </span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 14 }}>
            {reviews.length ? 'Todo respondido' : 'Todavía no tienes reseñas'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, marginBottom: 14 }}>
            {reviews.length
              ? 'No tienes reseñas pendientes en este filtro.'
              : 'Aparecen aquí cuando tus clientes califiquen sus pedidos.'}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: 4 }}>
              {/* Esqueleto con la forma de lo que viene: el salto de
                  "cargando" a "listo" se siente mucho menor si la caja
                  ya estaba donde va a quedar. */}
              <span className="sk" style={{ display: 'block', height: 108, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 108, borderRadius: 16 }} />
              <span className="sk" style={{ display: 'block', height: 108, borderRadius: 16 }} />
            </div>
      )}
    </>
  );
}

const S = {
  google: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 24, padding: 32, boxShadow: 'var(--shadow)', marginTop: 24,
    color: 'var(--text)'
  },
  googleIcon: {
    width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(46,107,255,0.15) 0%, rgba(107,47,214,0.15) 100%)', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(46,107,255,0.2)'
  },
  googleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
    gap: 16, marginTop: 24,
  },
  googleCard: {
    display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 20,
    background: 'var(--surface2)', border: '1px solid var(--border)',
    textDecoration: 'none', color: 'var(--text)', minWidth: 0,
    transition: 'box-shadow 0.2s, transform 0.2s, background 0.2s',
  },
  googleCardIcon: {
    width: 48, height: 48, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  googleCardTitle: { display: 'block', fontSize: 15, fontWeight: 800, color: 'var(--text)' },
  googleCardText: {
    display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.45,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 24, padding: 24, boxShadow: 'var(--shadow)',
    color: 'var(--text)'
  },
  kpiIcon: {
    width: 38, height: 38, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  distTrack: {
    flex: 1, height: 8, borderRadius: 99, background: 'var(--surface2)', overflow: 'hidden',
    border: '1px solid var(--border)'
  },
  chip: { height: 40, padding: '0 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, transition: 'all 0.2s' },
  chipOn: { background: 'var(--text)', color: 'var(--bg)', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  avatar: {
    width: 46, height: 46, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 15, border: '1px solid var(--border)'
  },
  plus: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.05em', padding: '3px 8px',
    borderRadius: 7, background: 'color-mix(in srgb, #6B2FD6 15%, transparent)', color: '#6B2FD6',
  },
  tag: {
    flex: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.05em',
    padding: '5px 10px', borderRadius: 8,
  },
  reviewChip: {
    height: 30, display: 'inline-flex', alignItems: 'center', padding: '0 14px',
    borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--border)',
    fontSize: 12, fontWeight: 700, color: 'var(--text)',
  },
  reply: {
    display: 'flex', gap: 14, marginTop: 18, padding: '16px 18px',
    background: 'var(--surface2)', borderRadius: 16, borderLeft: '3px solid var(--primary)',
    boxShadow: 'var(--shadowSm)'
  },
  replyInput: {
    flex: 1, minWidth: 200, height: 48, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 16px', fontSize: 15.5, outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
  },
  sendBtn: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 48,
    padding: '0 22px', borderRadius: 999, fontWeight: 800, fontSize: 13.5,
    boxShadow: '0 2px 8px rgba(255,68,31,0.2)'
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '56px 24px', background: 'var(--surface)',
    border: '1px dashed var(--border)', borderRadius: 18, marginTop: 16,
  },
  emptyIcon: {
    width: 60, height: 60, borderRadius: '50%', background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
