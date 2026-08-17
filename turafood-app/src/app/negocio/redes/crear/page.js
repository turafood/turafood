'use client';

/**
 * CREAR PUBLICACIÓN
 *
 * A la izquierda se arma, a la derecha se ve. La vista previa cambia
 * con cada letra y con cada red que se toca, porque la misma frase se
 * ve muy distinta en un feed de Facebook que en una historia.
 *
 * Al mandarla queda en cola: el equipo de TuraFood la publica con las
 * cuentas conectadas. Está dicho en pantalla — nadie debe creer que se
 * fue a Instagram solo con apretar el botón.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PLATFORMS, PLATFORM_ORDER, TONES, getAccounts, savePost, enhanceText,
} from '@/lib/redes';
import { uploadProductPhoto } from '@/lib/negocio';
import { useBiz } from '../../BizContext';
import PostPreview from '../PostPreview';

const KINDS = [
  { value: 'post', label: 'Publicación', icon: 'article' },
  { value: 'story', label: 'Historia', icon: 'auto_stories' },
  { value: 'ad', label: 'Anuncio', icon: 'campaign' },
];

export default function CrearPostPage() {
  const router = useRouter();
  const { business, toast } = useBiz();

  const [accounts, setAccounts] = useState([]);
  const [platforms, setPlatforms] = useState(['facebook']);
  const [preview, setPreview] = useState('facebook');
  const [kind, setKind] = useState('post');
  const [tone, setTone] = useState('cercano');
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    getAccounts(business.id)
      .then((rows) => { if (alive) setAccounts(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [business]);

  const connected = useMemo(
    () => new Set(accounts.filter((a) => a.status === 'connected').map((a) => a.platform)),
    [accounts],
  );

  const account = accounts.find((a) => a.platform === preview);
  const limit = PLATFORMS[preview]?.limit ?? 2200;
  const over = content.length > limit;

  const toggle = (p) => {
    setPlatforms((list) => {
      const next = list.includes(p) ? list.filter((x) => x !== p) : [...list, p];
      // La vista previa siempre muestra una red que esté seleccionada
      if (next.length && !next.includes(preview)) setPreview(next[0]);
      return next;
    });
  };

  const addPhotos = async (fileList) => {
    const files = Array.from(fileList ?? []).slice(0, 4 - images.length);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadProductPhoto(business.id, f));
      setImages((list) => [...list, ...urls]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const improve = () => {
    if (!content.trim()) {
      setError('Escribe primero de qué se trata y lo pulimos.');
      return;
    }
    setError(null);
    setContent(enhanceText(content, { tone, businessName: business?.name, platform: preview }));
    toast('Texto mejorado · revísalo antes de publicar');
  };

  const submit = async (status) => {
    setError(null);
    if (!platforms.length) { setError('Elige al menos una red.'); return; }
    if (!content.trim() && !images.length) { setError('Escribe algo o sube una foto.'); return; }
    if (status === 'scheduled' && !scheduledAt) { setError('Elige cuándo quieres que salga.'); return; }

    setSaving(true);
    try {
      await savePost(business.id, {
        platforms, kind, content, images, tone, status,
        scheduled_at: status === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
      });
      toast(status === 'scheduled' ? 'Programada · queda en cola' : 'Enviada a la cola de publicación');
      router.push('/negocio/redes');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <Link href="/negocio/redes" style={S.back}>
        <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
        Volver a redes
      </Link>

      {/* Redes: se puede publicar en varias a la vez */}
      <div className="hs" style={S.tabs}>
        {PLATFORM_ORDER.map((p) => {
          const meta = PLATFORMS[p];
          const on = platforms.includes(p);
          const link = connected.has(p);
          return (
            <button
              key={p}
              onClick={() => toggle(p)}
              onDoubleClick={() => setPreview(p)}
              style={{
                ...S.tab,
                borderColor: on ? meta.color : 'var(--border)',
                background: on ? meta.tint : 'var(--surface)',
                color: on ? meta.color : 'var(--muted)',
              }}
              title={link ? `${meta.label} · conectada` : `${meta.label} · falta conectarla`}
            >
              <span className="ms" style={{ fontSize: 18 }}>{meta.icon}</span>
              {meta.label}
              {on && <span className="ms" style={{ fontSize: 16 }}>check</span>}
              {!link && <span style={S.warnDot} title="Falta conectar esta cuenta" />}
            </button>
          );
        })}
      </div>

      <div className="composer">
        {/* Formulario */}
        <section style={S.panel}>
          <h1 style={S.title}>Crear publicación</h1>
          <p style={S.sub}>
            Se ve al lado mientras escribes. Al enviarla queda en cola y el equipo la
            publica con tus cuentas conectadas.
          </p>

          <div style={{ marginTop: 20 }}>
            <span style={S.label}>Tipo</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  style={{ ...S.chip, ...(kind === k.value ? S.chipOn : S.chipOff) }}
                >
                  <span className="ms" style={{ fontSize: 17 }}>{k.icon}</span>
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <span style={S.label}>Tono</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  style={{ ...S.chip, ...(tone === t.value ? S.chipOn : S.chipOff) }}
                  title={t.hint}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p style={S.hint}>{TONES.find((t) => t.value === tone)?.hint}</p>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ ...S.label, marginBottom: 0 }}>Texto</span>
              <button onClick={improve} style={S.improve}>
                <span className="ms ms-fill" style={{ fontSize: 16, color: 'var(--amber)' }}>auto_awesome</span>
                Mejorar con Tura IA
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Cuenta qué tiene de especial. Ej: la picada alcanza para tres y sale en 20 minutos."
              rows={6}
              style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5, marginTop: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6 }}>
              <span style={S.hint}>
                Tura IA agrega llamada a la acción y etiquetas. Revísalo: escribe mejor
                quien conoce el negocio.
              </span>
              <span
                style={{
                  fontSize: 11.5, fontWeight: 800, flex: 'none',
                  color: over ? 'var(--primary)' : 'var(--faint)',
                }}
              >
                {content.length} / {limit}
              </span>
            </div>
          </div>

          {/* Fotos */}
          <div style={{ marginTop: 18 }}>
            <span style={S.label}>Fotos · {images.length} de 4</span>
            <div style={S.photoGrid}>
              {images.map((url, i) => (
                <div key={url} style={S.photoTile}>
                  <span style={{ ...S.photoImg, backgroundImage: `url('${url}')` }} />
                  <button
                    onClick={() => setImages((l) => l.filter((u) => u !== url))}
                    style={S.photoRemove}
                    aria-label={`Quitar foto ${i + 1}`}
                  >
                    <span className="ms" style={{ fontSize: 14, color: '#fff' }}>close</span>
                  </button>
                </div>
              ))}

              {images.length < 4 && (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addPhotos(e.dataTransfer.files); }}
                  style={S.photoDrop}
                >
                  {uploading ? (
                    <span style={S.spinner} />
                  ) : (
                    <>
                      <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>add_photo_alternate</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center' }}>Arrastra o elige</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <div style={S.error}>
              <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Envío */}
          <div style={S.actions}>
            <button onClick={() => submit('queued')} disabled={saving} className="md3-btn" style={S.primary}>
              <span className="ms" style={{ fontSize: 19 }}>send</span>
              {saving ? 'Enviando…' : 'Publicar ahora'}
            </button>

            <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                style={{ ...S.input, flex: 1 }}
                aria-label="Fecha y hora de publicación"
              />
              <button onClick={() => submit('scheduled')} disabled={saving} style={S.ghost}>
                Programar
              </button>
            </div>
          </div>

          <button onClick={() => submit('draft')} disabled={saving} style={S.draft}>
            Guardar como borrador
          </button>
        </section>

        {/* Vista previa */}
        <section style={S.previewPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
              VISTA PREVIA
            </span>
            <div style={{ flex: 1 }} />
            <div className="hs" style={{ display: 'flex', gap: 6 }}>
              {(platforms.length ? platforms : ['facebook']).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreview(p)}
                  style={{
                    ...S.previewTab,
                    background: preview === p ? PLATFORMS[p].tint : 'transparent',
                    color: preview === p ? PLATFORMS[p].color : 'var(--muted)',
                  }}
                  aria-label={`Ver como ${PLATFORMS[p].label}`}
                >
                  <span className="ms" style={{ fontSize: 17 }}>{PLATFORMS[p].icon}</span>
                </button>
              ))}
            </div>
          </div>

          <PostPreview
            platform={preview}
            kind={kind}
            content={content}
            images={images}
            businessName={business?.name}
            handle={account?.account_handle}
          />

          {!connected.has(preview) && (
            <div style={S.notice}>
              <span className="ms" style={{ fontSize: 18, color: '#A8730B', flex: 'none' }}>info</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: '#7A5405' }}>
                Todavía no has conectado {PLATFORMS[preview].label}. Puedes armar la
                publicación igual; sale cuando conectemos la cuenta.
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', textDecoration: 'none',
  },
  tabs: { display: 'flex', gap: 8, marginBottom: 16, paddingBottom: 2 },
  tab: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 7, flex: 'none',
    height: 42, padding: '0 15px', borderRadius: 999, border: '1.5px solid',
    fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
  },
  warnDot: {
    position: 'absolute', top: 6, right: 8, width: 7, height: 7,
    borderRadius: '50%', background: 'var(--amber)',
  },
  panel: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  previewPanel: {
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 18, minWidth: 0, alignSelf: 'start',
    position: 'sticky', top: 0,
  },
  previewTab: {
    width: 34, height: 34, borderRadius: 10, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 23, letterSpacing: '-.02em',
  },
  sub: { margin: '7px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 },
  input: {
    width: '100%', height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px',
    borderRadius: 11, fontSize: 12.5, fontWeight: 700,
  },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  improve: {
    display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 12px',
    borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg)',
    fontSize: 12, fontWeight: 700, flex: 'none',
  },
  hint: { margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 },
  photoGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 10,
  },
  photoTile: {
    position: 'relative', aspectRatio: '1', borderRadius: 13, overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  photoImg: {
    position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center',
  },
  photoRemove: {
    position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%',
    background: 'rgba(20,16,10,.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  photoDrop: {
    aspectRatio: '1', borderRadius: 13, border: '1.5px dashed var(--faint)',
    background: 'var(--bg)', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 5, padding: 8, cursor: 'pointer',
  },
  spinner: {
    width: 22, height: 22, borderRadius: '50%',
    border: '2.5px solid var(--surface2)', borderTopColor: 'var(--primary)',
    animation: 'spin .8s linear infinite',
  },
  actions: {
    display: 'flex', gap: 10, marginTop: 22, paddingTop: 18,
    borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  primary: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, padding: '0 22px', borderRadius: 14, background: 'var(--primary)',
    color: '#fff', fontSize: 14.5, fontWeight: 700, flex: 'none',
    boxShadow: '0 8px 20px rgba(255,68,31,.28)',
  },
  ghost: {
    height: 46, padding: '0 18px', borderRadius: 13, border: '1px solid var(--border)',
    fontSize: 13.5, fontWeight: 700, flex: 'none',
  },
  draft: {
    width: '100%', height: 44, borderRadius: 13, marginTop: 10,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)',
  },
  notice: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14,
    padding: 12, borderRadius: 13, background: '#FFF7E6',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 18, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
