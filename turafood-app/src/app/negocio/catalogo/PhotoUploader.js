'use client';

/**
 * SUBIDOR DE FOTOS ULTRA PRO (FIGMA STYLE + GALERÍA GOURMET DE 1 CLIC)
 */

import { useRef, useState } from 'react';
import { uploadProductPhoto, deleteProductPhoto } from '@/lib/negocio';

const MAX = 5;

// Galería de fotos gourmet precargadas de alta definición para elegir en 1 clic
const GOURMET_PRESETS = [
  { id: 'burger_pro', name: 'Hamburguesa Gourmet', url: '/burger_hero_pro.png' },
  { id: 'fork_meat', name: 'Carne en Tenedor', url: '/fork_meat_pro.png' },
  { id: 'steak_ribeye', name: 'Corte Ribeye', url: '/images/steak-ribeye.jpg' },
  { id: 'fried_steak', name: 'Carne Asada', url: '/images/fried-steak.jpg' },
  { id: 'beef_tomatoes', name: 'Lomo Saltado', url: '/images/beef-tomatoes.jpg' },
  { id: 'lamb_chops', name: 'Costillas Gourmet', url: '/images/lamb-chops.jpg' },
  { id: 'gold_steak', name: 'Steak Dorado', url: '/images/gold-steak.jpg' },
  { id: 'hero_burger', name: 'Burger Clásica', url: '/hero_burger.jpg' },
];

export default function PhotoUploader({ businessId, images, onChange, onError }) {
  const filePicker = useRef(null);
  const [uploading, setUploading] = useState(0);

  const room = MAX - images.length;

  const add = async (fileList) => {
    const files = Array.from(fileList ?? []).slice(0, room);
    if (!files.length) return;

    onError(null);
    setUploading(files.length);
    try {
      const urls = [];
      for (const file of files) {
        urls.push(await uploadProductPhoto(businessId, file));
      }
      onChange([...images, ...urls]);
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(0);
    }
  };

  const selectPreset = (url) => {
    if (images.includes(url)) {
      onChange(images.filter(u => u !== url));
    } else if (images.length < MAX) {
      onChange([url, ...images]);
    }
  };

  const remove = async (url) => {
    onChange(images.filter((u) => u !== url));
    deleteProductPhoto(url).catch(() => {});
  };

  const makeCover = (url) => onChange([url, ...images.filter((u) => u !== url)]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* 1. Zona de Subida Rápida (1 Clic) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={S.label}>
            Fotos Seleccionadas
            <span style={{ color: 'var(--muted)', fontWeight: 600 }}> ({images.length} de {MAX})</span>
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 700 }}>
            {images.length > 0 ? '✓ Foto principal lista' : 'Selecciona una foto'}
          </span>
        </div>

        {/* Selected images grid or single click dropzone */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12 }}>
          {images.map((url, i) => (
            <div key={url} style={S.tile}>
              <div
                style={{
                  width: '100%', height: '100%',
                  backgroundImage: `url('${url}')`,
                  backgroundSize: 'cover', backgroundPosition: 'center',
                }}
              />

              {i === 0 ? (
                <span style={S.coverTag}>⭐ PRINCIPAL</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(url)}
                  style={S.makeCover}
                >
                  Principal
                </button>
              )}

              <button
                type="button"
                onClick={() => remove(url)}
                style={S.removeBtn}
                aria-label="Quitar foto"
              >
                <span className="ms" style={{ fontSize: 14, color: '#fff' }}>close</span>
              </button>
            </div>
          ))}

          {room > 0 && (
            <button
              type="button"
              onClick={() => filePicker.current?.click()}
              style={S.dropBtn}
            >
              <span className="ms" style={{ fontSize: 24, color: 'var(--primary)' }}>
                {uploading > 0 ? 'sync' : 'add_photo_alternate'}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
                {uploading > 0 ? 'Subiendo…' : 'Subir foto propia'}
              </span>
            </button>
          )}
        </div>

        <input
          ref={filePicker}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(e) => add(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>

      {/* 2. Galería Gourmet de 1 Clic (Preset Gallery) */}
      <div style={{ background: 'var(--surface2)', padding: '16px 18px', borderRadius: 20, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--gold)' }}>auto_awesome</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
              Galería Gourmet de 1 Clic
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Toca para asignar al plato</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {GOURMET_PRESETS.map((p) => {
            const isSelected = images.includes(p.url);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p.url)}
                style={{
                  position: 'relative', height: 72, borderRadius: 14, overflow: 'hidden',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  padding: 0, cursor: 'pointer', background: '#000',
                  boxShadow: isSelected ? '0 0 0 2px var(--primary-tint)' : 'none',
                  transition: 'all .2s ease'
                }}
              >
                <div
                  style={{
                    width: '100%', height: '100%',
                    backgroundImage: `url('${p.url}')`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    opacity: isSelected ? 1 : 0.85
                  }}
                />
                
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                    borderRadius: '50%', background: 'var(--primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 900
                  }}>
                    ✓
                  </div>
                )}

                <div style={{
                  position: 'absolute', bottom: 0, insetInline: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
                  padding: '4px 6px', fontSize: 9.5, fontWeight: 700, color: '#fff',
                  textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

const S = {
  label: { display: 'block', fontSize: 12.5, fontWeight: 800, color: 'var(--text)' },
  tile: {
    position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 16,
    overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)',
  },
  coverTag: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    background: 'rgba(0,0,0,0.8)', color: 'var(--gold)',
    fontSize: 9, fontWeight: 900, padding: '3px 4px', borderRadius: 6,
    textAlign: 'center', letterSpacing: '.05em', backdropFilter: 'blur(4px)',
  },
  makeCover: {
    position: 'absolute', bottom: 4, left: 4, right: 4,
    background: 'rgba(0,0,0,0.75)', color: '#fff',
    fontSize: 9, fontWeight: 700, padding: '3px 4px', borderRadius: 6,
    border: 'none', cursor: 'pointer', textAlign: 'center',
  },
  removeBtn: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22,
    borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  dropBtn: {
    width: '100%', aspectRatio: '1/1', borderRadius: 16,
    border: '1px dashed var(--border)', background: 'var(--surface2)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
    cursor: 'pointer', padding: 8, transition: 'background .2s',
  },
};
