'use client';

/**
 * TURA SOCIAL — SUITE DE REDES
 *
 * Todo lo del negocio en redes desde un solo lugar: las cuentas
 * conectadas, lo que se publicó y lo que está en cola.
 *
 * Las cuentas no se conectan solas: el negocio deja su usuario y el
 * equipo hace el enlace. Se dice en la pantalla; una tarjeta que diga
 * "conectar" y no conecte nada es peor que no tenerla.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PLATFORMS, PLATFORM_ORDER, ACCOUNT_STATUS, POST_STATUS,
  getAccounts, getPosts, getThreads, requestAccount, removeAccount, deletePost,
} from '@/lib/redes';
import { relativeTime } from '@/lib/format';
import { useBiz } from '../BizContext';

export default function RedesPage() {
  const { business, toast } = useBiz();

  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [handle, setHandle] = useState('');

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const [a, p, t] = await Promise.all([
          getAccounts(business.id),
          getPosts(business.id),
          getThreads(business.id).catch(() => []),
        ]);
        if (!alive) return;
        setAccounts(a); setPosts(p); setThreads(t);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const byPlatform = Object.fromEntries(accounts.map((a) => [a.platform, a]));
  const connectedCount = accounts.filter((a) => a.status === 'connected').length;
  const unread = threads.reduce((a, t) => a + (t.unread_count ?? 0), 0);

  const stats = useMemo(() => {
    const published = posts.filter((p) => p.status === 'published');
    return {
      published: published.length,
      queued: posts.filter((p) => ['scheduled', 'queued'].includes(p.status)).length,
      reach: published.reduce((a, p) => a + (p.views ?? 0), 0),
      engagement: published.reduce((a, p) => a + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0),
    };
  }, [posts]);

  const connect = async (platform) => {
    if (!handle.trim()) { setError('Escribe tu usuario en esa red.'); return; }
    setError(null);
    try {
      await requestAccount(business.id, platform, handle.trim());
      setAccounts(await getAccounts(business.id));
      setConnecting(null);
      setHandle('');
      toast('Cuenta registrada · la conectamos y te avisamos');
    } catch (err) {
      setError(err.message);
    }
  };

  const disconnect = async (platform) => {
    await removeAccount(business.id, platform);
    setAccounts(await getAccounts(business.id));
    toast('Cuenta quitada');
  };

  const remove = async (post) => {
    setPosts((l) => l.filter((p) => p.id !== post.id));
    try {
      await deletePost(post.id);
      toast('Publicación eliminada');
    } catch (err) {
      setError(err.message);
      setPosts(await getPosts(business.id));
    }
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Encabezado */}
      <section style={S.hero}>
        <div style={S.heroGlow} />
        <div style={{ position: 'relative', display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <span style={S.kicker}>TURA SOCIAL · SUITE DE REDES</span>
            <h1 style={S.heroTitle}>Arma tus posts aquí. Nosotros los publicamos.</h1>
            <p style={S.heroText}>
              Conecta tus cuentas una sola vez, escribe con la ayuda de Tura IA y mira
              cómo va a quedar antes de publicar. Lo demás lo hacemos nosotros.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              <Link href="/negocio/redes/crear" className="md3-btn" style={S.heroBtn}>
                <span className="ms" style={{ fontSize: 19 }}>add</span>
                Crear publicación
              </Link>
              <Link href="/negocio/redes/inbox" style={S.heroGhost}>
                <span className="ms" style={{ fontSize: 19 }}>forum</span>
                Bandeja
                {unread > 0 && <span style={S.heroBadge}>{unread}</span>}
              </Link>
            </div>
          </div>

          <div style={S.heroStats}>
            {[
              { label: 'CUENTAS', value: String(connectedCount) },
              { label: 'PUBLICADAS', value: String(stats.published) },
              { label: 'EN COLA', value: String(stats.queued) },
              { label: 'INTERACCIONES', value: stats.engagement.toLocaleString('es-CO') },
            ].map((s) => (
              <div key={s.label}>
                <div style={S.heroStatLabel}>{s.label}</div>
                <div style={S.heroStatValue}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div style={S.error}>
          <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Cuentas */}
      <section style={{ ...S.panel, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={S.panelTitle}>Tus cuentas</h2>
            <p style={S.panelSub}>Conectadas una vez, sirven para todo lo que publiques después.</p>
          </div>
        </div>

        <div style={S.accountGrid}>
          {PLATFORM_ORDER.map((p) => {
            const meta = PLATFORMS[p];
            const acc = byPlatform[p];
            const st = ACCOUNT_STATUS[acc?.status];
            const isOpen = connecting === p;

            return (
              <div key={p} style={{ ...S.account, borderColor: acc ? meta.color : 'var(--border)' }}>
                <span style={{ ...S.accountIcon, background: meta.tint }}>
                  <span className="ms" style={{ fontSize: 22, color: meta.color }}>{meta.icon}</span>
                </span>

                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 12 }}>{meta.label}</div>

                {acc ? (
                  <>
                    <div className="tr1" style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                      {acc.account_handle || acc.account_name || '—'}
                    </div>
                    <span style={{ ...S.accountState, background: st.bg, color: st.color }}>
                      <span className="ms" style={{ fontSize: 13 }}>{st.icon}</span>
                      {st.label}
                    </span>
                    <button onClick={() => disconnect(p)} style={S.accountRemove}>Quitar</button>
                  </>
                ) : isOpen ? (
                  <div style={{ marginTop: 10 }}>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') connect(p); }}
                      placeholder="@tunegocio"
                      autoFocus
                      style={S.accountInput}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button onClick={() => connect(p)} style={{ ...S.accountBtn, background: meta.color, color: '#fff' }}>
                        Enviar
                      </button>
                      <button onClick={() => { setConnecting(null); setHandle(''); }} style={S.accountCancel}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConnecting(p); setHandle(''); }}
                    style={{ ...S.accountBtn, marginTop: 12, border: '1px solid var(--border)' }}
                  >
                    <span className="ms" style={{ fontSize: 16 }}>add_link</span>
                    Conectar
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div style={S.honest}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>info</span>
          <span style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}>
            Al registrar una cuenta nos dices cuál es; el enlace con la red lo hacemos
            nosotros y te avisamos cuando quede lista. Nunca te pedimos tu contraseña.
          </span>
        </div>
      </section>

      {/* Publicaciones */}
      <section style={{ ...S.panel, marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={S.panelTitle}>Tus publicaciones</h2>
            <p style={S.panelSub}>Lo que salió y lo que está en cola.</p>
          </div>
          <Link href="/negocio/redes/crear" style={S.newPost}>
            <span className="ms" style={{ fontSize: 18 }}>add</span>
            Nueva
          </Link>
        </div>

        {posts.length === 0 && !loading ? (
          <div style={S.empty}>
            <span style={S.emptyIcon}>
              <span className="ms" style={{ fontSize: 26, color: 'var(--faint)' }}>campaign</span>
            </span>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12 }}>Todavía no has publicado</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5, maxWidth: 320 }}>
              La primera es la más difícil. Toma una foto de tu plato estrella y en dos
              minutos la tienes lista.
            </div>
            <Link href="/negocio/redes/crear" className="md3-btn" style={S.emptyBtn}>
              Crear la primera
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {posts.map((post) => {
              const st = POST_STATUS[post.status] ?? POST_STATUS.draft;
              return (
                <article key={post.id} style={S.post}>
                  <span
                    style={{
                      ...S.postThumb,
                      backgroundImage: post.images?.[0] ? `url('${post.images[0]}')` : undefined,
                      background: post.images?.[0] ? undefined : 'var(--surface2)',
                    }}
                  >
                    {!post.images?.[0] && (
                      <span className="ms" style={{ fontSize: 22, color: 'var(--faint)' }}>text_snippet</span>
                    )}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      {(post.platforms ?? []).map((p) => (
                        <span key={p} style={{ ...S.postPlatform, background: PLATFORMS[p]?.tint, color: PLATFORMS[p]?.color }}>
                          <span className="ms" style={{ fontSize: 13 }}>{PLATFORMS[p]?.icon}</span>
                          {PLATFORMS[p]?.label}
                        </span>
                      ))}
                      <span style={{ ...S.postState, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>

                    <p className="tr2" style={S.postText}>{post.content || 'Sin texto'}</p>

                    <div style={S.postMeta}>
                      <span suppressHydrationWarning>
                        {post.published_at
                          ? `Publicada ${relativeTime(post.published_at).toLowerCase()}`
                          : post.scheduled_at
                            ? `Sale ${new Date(post.scheduled_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}`
                            : 'Sin programar'}
                      </span>
                      {post.status === 'published' && (
                        <>
                          <span style={S.postStat}>
                            <span className="ms" style={{ fontSize: 14 }}>favorite</span>{post.likes ?? 0}
                          </span>
                          <span style={S.postStat}>
                            <span className="ms" style={{ fontSize: 14 }}>chat_bubble</span>{post.comments ?? 0}
                          </span>
                          <span style={S.postStat}>
                            <span className="ms" style={{ fontSize: 14 }}>visibility</span>
                            {(post.views ?? 0).toLocaleString('es-CO')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <button onClick={() => remove(post)} style={S.postRemove} aria-label="Eliminar publicación">
                    <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>delete</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {loading && (
          <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Cargando…
          </div>
        )}
      </section>
    </div>
  );
}

const S = {
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 24, padding: 28,
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 66%)', color: '#fff',
    boxShadow: '0 16px 40px rgba(20,16,10,.2)',
  },
  heroGlow: {
    position: 'absolute', right: -60, top: -70, width: 260, height: 260, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(107,47,214,.34),rgba(107,47,214,0) 70%)',
  },
  kicker: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' },
  heroTitle: {
    margin: '10px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 27, lineHeight: 1.12, letterSpacing: '-.03em', textWrap: 'balance',
  },
  heroText: { margin: '10px 0 0', fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.7)' },
  heroBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px',
    borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 14, fontWeight: 700, textDecoration: 'none',
  },
  heroGhost: {
    display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 18px',
    borderRadius: 999, border: '1px solid rgba(255,255,255,.22)',
    color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
  },
  heroBadge: {
    minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99, background: 'var(--primary)',
    fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  heroStats: {
    position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(80px,1fr))',
    gap: 16, flex: 'none',
  },
  heroStatLabel: { fontSize: 9.5, fontWeight: 800, letterSpacing: '.07em', color: 'rgba(255,255,255,.45)' },
  heroStatValue: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, marginTop: 3,
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)',
  },
  panelTitle: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
  },
  panelSub: { margin: '4px 0 0', fontSize: 12.5, color: 'var(--muted)' },
  accountGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))',
    gap: 12, marginTop: 18,
  },
  account: {
    border: '1.5px solid', borderRadius: 16, padding: 16, background: 'var(--surface)',
    minWidth: 0,
  },
  accountIcon: {
    width: 44, height: 44, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  accountState: {
    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
    fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 7,
  },
  accountRemove: {
    display: 'block', marginTop: 10, fontSize: 11.5, fontWeight: 700, color: 'var(--muted)',
  },
  accountBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', height: 36, borderRadius: 10, fontSize: 12.5, fontWeight: 700,
  },
  accountCancel: {
    flex: 'none', height: 36, padding: '0 12px', borderRadius: 10,
    border: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--muted)',
  },
  accountInput: {
    width: '100%', height: 38, borderRadius: 10, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 11px', fontSize: 16, outline: 'none',
  },
  honest: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 18,
    padding: 13, borderRadius: 14, background: 'var(--bg)',
  },
  newPost: {
    display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
    borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 13, fontWeight: 700, textDecoration: 'none', flex: 'none',
  },
  post: {
    display: 'flex', gap: 14, alignItems: 'flex-start', padding: 14,
    borderRadius: 16, background: 'var(--bg)', border: '1px solid var(--border)',
  },
  postThumb: {
    width: 62, height: 62, borderRadius: 13, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  postPlatform: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6,
  },
  postState: { fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6 },
  postText: {
    margin: '7px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5,
  },
  postMeta: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 9, flexWrap: 'wrap',
    fontSize: 11.5, color: 'var(--faint)', fontWeight: 700,
  },
  postStat: { display: 'flex', alignItems: 'center', gap: 4 },
  postRemove: {
    width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '46px 20px',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyBtn: {
    display: 'flex', alignItems: 'center', height: 44, padding: '0 20px', borderRadius: 999,
    background: 'var(--primary)', color: '#fff', fontSize: 13.5, fontWeight: 700,
    textDecoration: 'none', marginTop: 18,
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
