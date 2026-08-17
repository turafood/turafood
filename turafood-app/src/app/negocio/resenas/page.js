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

const AVATAR_BG = [
  { bg: '#FFF1EC', color: '#E2360F' },
  { bg: '#EAF1FF', color: '#2E6BFF' },
  { bg: '#E6F6EE', color: '#0B8E54' },
  { bg: '#F3ECFF', color: '#6B2FD6' },
  { bg: '#FFF7E6', color: '#A8730B' },
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function ResenasPage() {
  const { business, setPendingReviews, toast } = useBiz();
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

  const pending = reviews.filter((r) => !r.business_reply).length;

  useEffect(() => { setPendingReviews(pending); }, [pending, setPendingReviews]);

  const filters = [
    { label: 'Todas', match: () => true },
    { label: `Sin responder · ${pending}`, match: (r) => !r.business_reply },
    { label: 'Críticas (1–2★)', match: (r) => r.rating <= 2 },
    { label: 'Positivas (4–5★)', match: (r) => r.rating >= 4 },
  ];

  const shown = reviews.filter(filters[filter].match);

  const stats = useMemo(() => {
    const n = reviews.length;
    const sum = reviews.reduce((a, r) => a + Number(r.rating ?? 0), 0);
    const avg = n ? sum / n : 0;
    const counts = [5, 4, 3, 2, 1].map((k) => reviews.filter((r) => r.rating === k).length);
    const replied = reviews.filter((r) => r.business_reply).length;
    return {
      n, avg, counts,
      rate: n ? Math.round((replied / n) * 100) : 100,
      recommend: n ? Math.round((reviews.filter((r) => r.rating >= 4).length / n) * 100) : 0,
    };
  }, [reviews]);

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

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, alignItems: 'start' }}>
        <section style={S.card}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
            <div style={{ flex: 'none' }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 46, letterSpacing: '-.03em', lineHeight: 1 }}>
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
                          width: `${Math.max(pct, 2)}%`,
                          background: n >= 4 ? 'var(--green)' : n === 3 ? 'var(--amber)' : 'var(--primary)',
                        }}
                      />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--faint)', width: 32, textAlign: 'right' }}>
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
            { label: 'Tasa de respuesta', value: `${stats.rate}%`, icon: 'forum', bg: '#EAF1FF', fg: '#2E6BFF' },
            { label: 'Sin responder', value: String(pending), icon: 'mark_email_unread', bg: '#FFF1EC', fg: '#E2360F' },
            { label: 'Recomendarían', value: `${stats.recommend}%`, icon: 'thumb_up', bg: '#FFF7E6', fg: '#A8730B' },
            { label: 'Calificación', value: stats.avg.toFixed(1).replace('.', ','), icon: 'star', bg: '#E6F6EE', fg: '#0B8E54' },
          ].map((k) => (
            <div key={k.label} style={S.card}>
              <span style={{ ...S.kpiIcon, background: k.bg }}>
                <span className="ms" style={{ fontSize: 19, color: k.fg }}>{k.icon}</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em', marginTop: 12 }}>
                {k.value}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginTop: 3 }}>{k.label}</div>
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
            <span style={{ ...S.googleCardIcon, background: '#EAF1FF' }}>
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
            <span style={{ ...S.googleCardIcon, background: '#E6F6EE' }}>
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
            ? { label: 'NECESITA ATENCIÓN', bg: '#FFF1EC', color: '#E2360F' }
            : r.rating === 3
              ? { label: 'NEUTRAL', bg: '#FFF7E6', color: '#A8730B' }
              : { label: 'POSITIVA', bg: '#E6F6EE', color: '#0B7A48' };
          const draft = drafts[r.id] ?? '';

          return (
            <article key={r.id} style={S.card}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ ...S.avatar, background: av.bg, color: av.color }}>
                  {initials(r.customer?.full_name)}
                </span>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{r.customer?.full_name ?? 'Cliente'}</span>
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
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>
            {reviews.length
              ? 'No tienes reseñas pendientes en este filtro.'
              : 'Aparecen aquí cuando tus clientes califiquen sus pedidos.'}
          </div>
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          Cargando reseñas…
        </div>
      )}
    </>
  );
}

const S = {
  google: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)', marginTop: 20,
  },
  googleIcon: {
    width: 50, height: 50, borderRadius: 16, background: '#EAF1FF', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  googleGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
    gap: 12, marginTop: 18,
  },
  googleCard: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 15,
    background: 'var(--bg)', border: '1px solid var(--border)',
    textDecoration: 'none', color: 'var(--text)', minWidth: 0,
  },
  googleCardIcon: {
    width: 40, height: 40, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  googleCardTitle: { display: 'block', fontSize: 13.5, fontWeight: 700 },
  googleCardText: {
    display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 20, boxShadow: 'var(--shadowSm)',
  },
  kpiIcon: {
    width: 34, height: 34, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  distTrack: {
    flex: 1, height: 7, borderRadius: 99, background: 'var(--surface2)', overflow: 'hidden',
  },
  chip: { height: 38, padding: '0 16px', borderRadius: 999, fontSize: 12.5, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  avatar: {
    width: 42, height: 42, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 14,
  },
  plus: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.05em', padding: '3px 8px',
    borderRadius: 7, background: '#F3ECFF', color: '#6B2FD6',
  },
  tag: {
    flex: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.05em',
    padding: '5px 10px', borderRadius: 8,
  },
  reviewChip: {
    height: 28, display: 'inline-flex', alignItems: 'center', padding: '0 11px',
    borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)',
    fontSize: 11.5, fontWeight: 700, color: 'var(--muted)',
  },
  reply: {
    display: 'flex', gap: 12, marginTop: 16, padding: '14px 16px',
    background: 'var(--bg)', borderRadius: 14, borderLeft: '3px solid var(--primary)',
  },
  replyInput: {
    flex: 1, minWidth: 200, height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 15px', fontSize: 16, outline: 'none',
  },
  sendBtn: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 7, height: 46,
    padding: '0 20px', borderRadius: 999, fontWeight: 700, fontSize: 13,
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
