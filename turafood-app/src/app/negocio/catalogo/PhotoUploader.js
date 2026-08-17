'use client';

/**
 * FOTOS DEL PRODUCTO
 *
 * Se puede soltar archivos encima, elegirlos del computador o tomar la
 * foto con la cámara del celular. Suben apenas se eligen: no hay un
 * segundo botón de "subir" que la gente olvida tocar.
 *
 * La primera foto es la principal y es la que ve el cliente en el
 * listado. Se puede cambiar cuál es sin volver a subir nada.
 */

import { useRef, useState } from 'react';
import { uploadProductPhoto, deleteProductPhoto } from '@/lib/negocio';

const MAX = 5;

export default function PhotoUploader({ businessId, images, onChange, onError }) {
  const filePicker = useRef(null);
  const cameraPicker = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(0);

  const room = MAX - images.length;

  const add = async (fileList) => {
    const files = Array.from(fileList ?? []).slice(0, room);
    if (!files.length) return;

    onError(null);
    setUploading(files.length);
    try {
      // En serie y no en paralelo: en una conexión de celular lenta,
      // cinco subidas a la vez se estorban y fallan más.
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

  const remove = async (url) => {
    onChange(images.filter((u) => u !== url));
    deleteProductPhoto(url).catch(() => {});   // si falla, no bloquea al usuario
  };

  const makeCover = (url) => onChange([url, ...images.filter((u) => u !== url)]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    add(e.dataTransfer.files);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <span style={S.label}>
        Fotos del producto
        <span style={{ color: 'var(--faint)', fontWeight: 600 }}>
          {' '}· {images.length} de {MAX}
        </span>
      </span>

      <div style={S.grid}>
        {images.map((url, i) => (
          <div key={url} style={S.tile}>
            <span
              style={{ ...S.tileImg, backgroundImage: `url('${url}')` }}
              role="img"
              aria-label={i === 0 ? 'Foto principal' : `Foto ${i + 1}`}
            />

            {i === 0 ? (
              <span style={S.coverTag}>PRINCIPAL</span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(url)}
                style={S.makeCover}
                title="Usar como principal"
              >
                Hacer principal
              </button>
            )}

            <button
              type="button"
              onClick={() => remove(url)}
              style={S.removeBtn}
              aria-label={`Quitar foto ${i + 1}`}
            >
              <span className="ms" style={{ fontSize: 15, color: '#fff' }}>close</span>
            </button>
          </div>
        ))}

        {uploading > 0 && Array.from({ length: uploading }).map((_, i) => (
          <div key={`up-${i}`} style={{ ...S.tile, ...S.uploading }}>
            <span style={S.spinner} />
          </div>
        ))}

        {room > 0 && uploading === 0 && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              ...S.dropzone,
              borderColor: dragging ? 'var(--primary)' : 'var(--faint)',
              background: dragging ? '#FFF6F3' : 'var(--bg)',
            }}
          >
            <span className="ms" style={{ fontSize: 24, color: 'var(--primary)' }}>add_photo_alternate</span>
            <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>
              Arrastra o elige
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 9, marginTop: 11, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => filePicker.current?.click()}
          disabled={room <= 0 || uploading > 0}
          style={S.pickBtn}
        >
          <span className="ms" style={{ fontSize: 18 }}>folder_open</span>
          Desde mi equipo
        </button>

        {/* `capture` abre la cámara directo en celular; en escritorio el
            navegador lo ignora y muestra el explorador de archivos. */}
        <button
          type="button"
          onClick={() => cameraPicker.current?.click()}
          disabled={room <= 0 || uploading > 0}
          style={S.pickBtn}
        >
          <span className="ms" style={{ fontSize: 18 }}>photo_camera</span>
          Tomar foto
        </button>
      </div>

      <input
        ref={filePicker}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => { add(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraPicker}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { add(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />

      <p style={S.hint}>
        {images.length === 0
          ? 'Sin foto usamos un icono. Una foto real puede duplicar los pedidos de un plato.'
          : 'La primera es la que ve el cliente en el listado. Máximo 5 MB por foto.'}
      </p>
    </div>
  );
}

const S = {
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10,
  },
  tile: {
    position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
    border: '1px solid var(--border)', background: 'var(--surface2)',
  },
  tileImg: {
    position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center',
  },
  coverTag: {
    position: 'absolute', left: 6, bottom: 6, fontSize: 8.5, fontWeight: 800,
    letterSpacing: '.05em', padding: '3px 6px', borderRadius: 5,
    background: 'var(--primary)', color: '#fff',
  },
  makeCover: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 26,
    background: 'rgba(20,16,10,.68)', color: '#fff', fontSize: 10, fontWeight: 700,
  },
  removeBtn: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
    background: 'rgba(20,16,10,.6)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  uploading: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderStyle: 'dashed',
  },
  spinner: {
    width: 22, height: 22, borderRadius: '50%',
    border: '2.5px solid var(--surface2)', borderTopColor: 'var(--primary)',
    animation: 'spin .8s linear infinite',
  },
  dropzone: {
    aspectRatio: '1', borderRadius: 14, border: '1.5px dashed',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 6, padding: 8,
    transition: 'background .15s ease, border-color .15s ease',
  },
  pickBtn: {
    display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 15px',
    borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, fontWeight: 700,
  },
  hint: {
    margin: '10px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5,
  },
};
