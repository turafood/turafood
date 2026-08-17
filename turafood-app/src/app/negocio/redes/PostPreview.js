'use client';

/**
 * VISTA PREVIA DE LA PUBLICACIÓN
 *
 * Dibuja cómo se va a ver el post en cada red mientras se escribe. Es
 * la parte que más importa: nadie publica con confianza algo que no ha
 * visto, y la misma frase se ve muy distinta en un feed de Facebook que
 * en una historia de Instagram.
 *
 * No busca ser un clon exacto de cada red. Busca que la persona
 * entienda dónde se corta el texto, qué tanto se ve la foto y cómo
 * queda el conjunto.
 */

import { PLATFORMS } from '@/lib/redes';

const initials = (name) =>
  String(name || 'T').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const today = () => new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

export default function PostPreview({ platform, kind, content, images, businessName, handle }) {
  const meta = PLATFORMS[platform] ?? PLATFORMS.facebook;
  const photo = images?.[0];

  // Las historias y los reels son verticales y el texto va encima
  if (kind === 'story' || kind === 'reel') {
    return (
      <div style={S.storyFrame}>
        <div
          style={{
            ...S.storyBg,
            backgroundImage: photo ? `url('${photo}')` : undefined,
            background: photo ? undefined : 'linear-gradient(150deg,#2A2620,#12100D)',
          }}
        />
        <div style={S.storyVeil} />

        <div style={S.storyBars}>
          <span style={{ ...S.storyBar, background: '#fff' }} />
          <span style={S.storyBar} />
          <span style={S.storyBar} />
        </div>

        <div style={S.storyHead}>
          <span style={{ ...S.avatar, width: 30, height: 30, fontSize: 11 }}>
            {initials(businessName)}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>
            {handle || businessName || 'tu negocio'}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.65)' }}>ahora</span>
        </div>

        {content ? (
          <div style={S.storyText}>{content}</div>
        ) : (
          <div style={{ ...S.storyText, color: 'rgba(255,255,255,.5)' }}>
            Escribe algo y lo verás aquí
          </div>
        )}

        {!photo && (
          <div style={S.storyHint}>
            <span className="ms" style={{ fontSize: 20 }}>add_photo_alternate</span>
            Las historias necesitan una foto vertical
          </div>
        )}
      </div>
    );
  }

  // X tiene su propia forma: avatar al lado, texto corto, sin cabecera
  if (platform === 'x') {
    const over = (content?.length ?? 0) > meta.limit;
    return (
      <div style={S.card}>
        <div style={{ display: 'flex', gap: 12, padding: 16 }}>
          <span style={S.avatar}>{initials(businessName)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{businessName || 'Tu negocio'}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{handle || '@tunegocio'}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>· ahora</span>
            </div>
            <div style={{ ...S.body, marginTop: 4, color: over ? 'var(--primary)' : 'var(--text)' }}>
              {content || 'Tu mensaje aparece aquí…'}
            </div>
            {photo && <div style={{ ...S.photo, marginTop: 12, aspectRatio: '16/9' }} data-bg>
              <span style={{ ...S.photoInner, backgroundImage: `url('${photo}')` }} />
            </div>}
            <div style={S.xActions}>
              {['chat_bubble', 'repeat', 'favorite_border', 'ios_share'].map((i) => (
                <span key={i} className="ms" style={{ fontSize: 17, color: 'var(--faint)' }}>{i}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Instagram: foto cuadrada arriba, texto abajo
  if (platform === 'instagram') {
    return (
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
          <span style={{ ...S.avatar, width: 34, height: 34, fontSize: 12 }}>
            {initials(businessName)}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>
              {handle || businessName || 'tunegocio'}
            </span>
            <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>Buenaventura</span>
          </span>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>more_horiz</span>
        </div>

        <div style={{ ...S.photo, aspectRatio: '1', borderRadius: 0 }}>
          {photo
            ? <span style={{ ...S.photoInner, backgroundImage: `url('${photo}')` }} />
            : <PhotoEmpty label="Instagram necesita una foto" />}
        </div>

        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 9 }}>
            <span className="ms" style={{ fontSize: 21 }}>favorite_border</span>
            <span className="ms" style={{ fontSize: 21 }}>chat_bubble_outline</span>
            <span className="ms" style={{ fontSize: 21 }}>send</span>
          </div>
          <div style={S.body}>
            <b>{handle || 'tunegocio'}</b>{' '}
            {content || 'Tu texto aparece aquí…'}
          </div>
        </div>
      </div>
    );
  }

  // Facebook y LinkedIn comparten forma: cabecera, texto, foto ancha
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14 }}>
        <span style={S.avatar}>{initials(businessName)}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="tr1" style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
            {businessName || 'Tu negocio'}
          </span>
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>
            {today()} · <span className="ms" style={{ fontSize: 12, verticalAlign: 'middle' }}>public</span>
          </span>
        </span>
        <span style={{ ...S.platformDot, background: meta.tint, color: meta.color }}>
          <span className="ms" style={{ fontSize: 15 }}>{meta.icon}</span>
        </span>
      </div>

      <div style={{ padding: '0 14px 12px' }}>
        <div style={S.body}>{content || 'Tu mensaje aparece aquí…'}</div>
      </div>

      <div style={{ ...S.photo, aspectRatio: '16/9', borderRadius: 0 }}>
        {photo
          ? <span style={{ ...S.photoInner, backgroundImage: `url('${photo}')` }} />
          : <PhotoEmpty label="Sin foto se ve el texto solo" />}
      </div>

      <div style={S.fbActions}>
        <span style={S.fbAction}>
          <span className="ms" style={{ fontSize: 18 }}>thumb_up</span> Me gusta
        </span>
        <span style={S.fbAction}>
          <span className="ms" style={{ fontSize: 18 }}>chat_bubble_outline</span> Comentar
        </span>
        <span style={S.fbAction}>
          <span className="ms" style={{ fontSize: 18 }}>share</span> Compartir
        </span>
      </div>
    </div>
  );
}

function PhotoEmpty({ label }) {
  return (
    <span style={S.photoEmpty}>
      <span className="ms" style={{ fontSize: 26, color: 'var(--faint)' }}>image</span>
      <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
    </span>
  );
}

const S = {
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadowSm)',
  },
  avatar: {
    width: 40, height: 40, borderRadius: '50%', flex: 'none',
    background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800,
  },
  platformDot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  body: {
    fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
  },
  photo: {
    position: 'relative', width: '100%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoInner: {
    position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center',
  },
  photoEmpty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 20,
  },
  fbActions: {
    display: 'flex', borderTop: '1px solid var(--border)', padding: '4px 8px',
  },
  fbAction: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '9px 0', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)',
  },
  xActions: {
    display: 'flex', justifyContent: 'space-between', maxWidth: 260, marginTop: 12,
  },

  storyFrame: {
    position: 'relative', width: '100%', maxWidth: 260, aspectRatio: '9/16',
    borderRadius: 22, overflow: 'hidden', margin: '0 auto',
    background: '#12100D', boxShadow: 'var(--shadow)',
  },
  storyBg: { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' },
  storyVeil: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,.1) 30%,rgba(0,0,0,.72) 100%)',
  },
  storyBars: {
    position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', gap: 3,
  },
  storyBar: {
    flex: 1, height: 2.5, borderRadius: 99, background: 'rgba(255,255,255,.35)',
  },
  storyHead: {
    position: 'absolute', top: 22, left: 12, right: 12,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  storyText: {
    position: 'absolute', left: 16, right: 16, bottom: 46,
    fontSize: 15, lineHeight: 1.4, fontWeight: 700, color: '#fff',
    textShadow: '0 2px 12px rgba(0,0,0,.5)', whiteSpace: 'pre-wrap',
  },
  storyHint: {
    position: 'absolute', left: 16, right: 16, bottom: 14,
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 10.5, color: 'rgba(255,255,255,.6)', fontWeight: 600,
  },
};
