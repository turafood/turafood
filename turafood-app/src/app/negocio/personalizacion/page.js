'use client';

import { useState, useEffect } from 'react';
import { useBiz } from '../BizContext';
import { updateBusiness } from '@/lib/negocio';

// Presets de color de acento de marca
const COLOR_PRESETS = [
  { name: 'Naranja TuraFood', hex: '#FF441F', tag: 'Vibrante' },
  { name: 'Negro Carbón', hex: '#111111', tag: 'Editorial Tura Muebles' },
  { name: 'Oro Pacífico', hex: '#B8912F', tag: 'Luxury' },
  { name: 'Verde Esmeralda', hex: '#12784A', tag: 'Natural' },
  { name: 'Azul Zafiro', hex: '#2563EB', tag: 'Corporativo' },
  { name: 'Rubí Gourmet', hex: '#B93815', tag: 'Bistró' },
];

export default function PersonalizacionPage() {
  const { business, refreshBusiness, toast } = useBiz();

  // Estados
  const [skin, setSkin] = useState('vibrant'); // 'vibrant' | 'editorial'
  const [brandColor, setBrandColor] = useState('#FF441F');
  const [customDomain, setCustomDomain] = useState('');
  const [previewTab, setPreviewTab] = useState('store'); // 'store' | 'home'
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Inicializar con los datos reales del negocio
  useEffect(() => {
    if (!business) return;
    if (business.pwa_skin) setSkin(business.pwa_skin);
    if (business.brand_color) setBrandColor(business.brand_color);
    if (business.custom_domain) setCustomDomain(business.custom_domain);
  }, [business]);

  const handleSelectSkin = (selectedSkin) => {
    setSkin(selectedSkin);
    // Sugerir color representativo automáticamente si está en el valor por defecto
    if (selectedSkin === 'editorial' && brandColor === '#FF441F') {
      setBrandColor('#111111');
    } else if (selectedSkin === 'vibrant' && brandColor === '#111111') {
      setBrandColor('#FF441F');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      if (business?.id) {
        await updateBusiness(business.id, {
          pwa_skin: skin,
          brand_color: brandColor,
          custom_domain: customDomain.trim() || null,
        });
      }

      // Sincronizar en localStorage para que cualquier pestaña del cliente en localhost lo lea inmediatamente
      if (typeof window !== 'undefined') {
        const payload = {
          state: {
            skin,
            brandAccent: brandColor,
          },
          version: 0,
        };
        localStorage.setItem('turafood_skin_preference', JSON.stringify(payload));
      }

      await refreshBusiness?.();
      setSavedSuccess(true);
      if (toast) toast('¡Diseño guardado exitosamente!');
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err) {
      console.error(err);
      alert('Error guardando diseño: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const storeSlug = business?.slug || 'el-sazon-del-puerto';
  const cleanAccent = brandColor.replace('#', '');
  const iframeSrc = previewTab === 'store'
    ? `http://localhost:3000/store/${storeSlug}?skin=${skin}&accent=${cleanAccent}`
    : `http://localhost:3000/home?skin=${skin}&accent=${cleanAccent}`;

  const liveStoreUrl = `http://localhost:3000/store/${storeSlug}?skin=${skin}&accent=${cleanAccent}`;

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 24px 90px' }}>
      
      {/* ================= ENCABEZADO PRINCIPAL ================= */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, background: 'rgba(255,68,31,0.08)', color: 'var(--primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            <span className="ms" style={{ fontSize: 16 }}>palette</span>
            <span>Identidad Visual & Look and Feel PWA</span>
          </div>
          <h1 style={{ fontSize: 29, fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.025em' }}>
            Diseño & Skin de tu Restaurante
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--muted)', maxWidth: 660, lineHeight: 1.55 }}>
            Elige cómo se presenta tu marca ante el público. Selecciona entre la experiencia de <strong>Delivery Vibrante (estilo Rappi)</strong> o el diseño de <strong>Alta Gama Editorial (inspirado fielmente en Tura Muebles)</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={liveStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 44,
              padding: '0 18px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 13.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              boxShadow: 'var(--shadowSm)',
            }}
          >
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>open_in_new</span>
            <span>Abrir Tienda Cliente</span>
          </a>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              height: 44,
              padding: '0 24px',
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: 'none',
              cursor: saving ? 'wait' : 'pointer',
              boxShadow: '0 8px 22px rgba(255,68,31,0.32)',
              opacity: saving ? 0.75 : 1,
            }}
          >
            <span className="ms" style={{ fontSize: 19 }}>{saving ? 'sync' : 'check'}</span>
            <span>{saving ? 'Guardando…' : 'Guardar y Publicar'}</span>
          </button>
        </div>
      </div>

      {/* AVISO DE ÉXITO */}
      {savedSuccess && (
        <div style={{
          padding: '14px 20px',
          borderRadius: 14,
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#065F46',
          fontSize: 14,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 26,
        }}>
          <span className="ms" style={{ fontSize: 22, color: '#10B981' }}>verified</span>
          <div>
            <strong>¡Cambios publicados en vivo!</strong> Tu menú y catálogo ahora utilizan el skin <strong>{skin === 'editorial' ? 'Tura Muebles Editorial Luxury' : 'TuraFood Delivery Vibrante'}</strong>.
          </div>
        </div>
      )}

      {/* ================= LAYOUT DE DOS COLUMNAS ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.9fr)', gap: 32, alignItems: 'start' }}>
        
        {/* ================= COLUMNA IZQUIERDA: SELECTORES Y OPCIONES ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          {/* SECCIÓN 1: SELECTOR DE SKIN */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  1. Elige la Identidad Visual (Skin)
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Selecciona la plantilla con la que se desplegará tu menú ante los clientes.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>view_quilt</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
              
              {/* ================= TARJETA 1: TURAFOOD VIBRANTE ================= */}
              <div
                onClick={() => handleSelectSkin('vibrant')}
                style={{
                  border: skin === 'vibrant' ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 18,
                  background: skin === 'vibrant' ? 'rgba(255,68,31,0.02)' : 'var(--surface2)',
                  padding: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: skin === 'vibrant' ? '0 10px 28px rgba(255,68,31,0.12)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Radio de selección y badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: '#FFE8E3',
                    color: '#E2360F',
                    letterSpacing: '.05em',
                  }}>
                    Estilo Rappi / Delivery
                  </span>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: skin === 'vibrant' ? '7px solid var(--primary)' : '2px solid var(--muted)',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                  }} />
                </div>

                {/* SHOWCASE VISUAL REALISTA DE LA APP DE CLIENTES */}
                <div style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#F6F5F2',
                  border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Mini barra superior de la app */}
                  <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--primary)', color: '#fff', fontSize: 11, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>t</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#17140F' }}>TuraFood</span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#8C857B' }}>📍 Buenaventura</span>
                  </div>

                  {/* Banner de promo tipo delivery */}
                  <div style={{
                    margin: 8,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #FF441F 0%, #E2360F 100%)',
                    padding: '10px 12px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 800, opacity: 0.9, textTransform: 'uppercase' }}>2x1 HOY</div>
                      <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>Burger Doble</div>
                      <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>⭐ 4.9 · 15-25 min</div>
                    </div>
                    <span style={{ fontSize: 28 }}>🍔</span>
                  </div>

                  {/* Fila de categorías tipo píldoras */}
                  <div style={{ display: 'flex', gap: 5, padding: '0 8px 8px', overflow: 'hidden' }}>
                    <span style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 999, padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: '#17140F' }}>🍔 Burgers</span>
                    <span style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 999, padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: '#17140F' }}>🍗 Pollo</span>
                    <span style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 999, padding: '3px 8px', fontSize: 9.5, fontWeight: 700, color: '#17140F' }}>🍤 Mariscos</span>
                  </div>

                  {/* Mini tarjeta de producto */}
                  <div style={{ margin: '0 8px 8px', background: '#fff', borderRadius: 8, padding: 6, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#eee', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: '#17140F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Cazuela Especial</div>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: '#FF441F' }}>$32.000</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: '#11B26A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>+</div>
                  </div>
                </div>

                {/* Explicación y características */}
                <div>
                  <h3 style={{ margin: '0 0 5px', fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>
                    TuraFood Delivery Vibrante
                  </h3>
                  <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    Colorido, botones de conversión inmediata, badges enérgicos y experiencia tipo Rappi / DoorDash.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ms" style={{ fontSize: 15, color: '#10B981' }}>check</span>
                      <span>Optimizado para comida rápida, asaderos y domicilios</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ms" style={{ fontSize: 15, color: '#10B981' }}>check</span>
                      <span>Botones grandes con micro-animaciones de carrito</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= TARJETA 2: TURA MUEBLES EDITORIAL LUXURY ================= */}
              <div
                onClick={() => handleSelectSkin('editorial')}
                style={{
                  border: skin === 'editorial' ? '2.5px solid #111111' : '1px solid var(--border)',
                  borderRadius: 18,
                  background: skin === 'editorial' ? '#FAF9F6' : 'var(--surface2)',
                  padding: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: skin === 'editorial' ? '0 10px 28px rgba(0,0,0,0.12)' : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {/* Radio de selección y badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: '#111111',
                    color: '#FFFFFF',
                    letterSpacing: '.05em',
                  }}>
                    Look & Feel Tura Muebles
                  </span>
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: skin === 'editorial' ? '7px solid #111111' : '2px solid var(--muted)',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                  }} />
                </div>

                {/* SHOWCASE VISUAL REALISTA DE TURA MUEBLES (01-INICIO.PNG & 06-CATALOGO.PNG) */}
                <div style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#F5F5F5',
                  border: '1px solid rgba(17,17,17,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Mini barra superior sobria de Tura Muebles */}
                  <div style={{ padding: '8px 12px', background: '#fff', borderBottom: '1px solid rgba(17,17,17,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 18, height: 18, borderRadius: 5, background: '#111', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⊞</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>turamuebles</span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: '#6A6A6A', border: '1px solid #E3E3E3', padding: '1px 5px', borderRadius: 4 }}>🇨🇴 ES</span>
                  </div>

                  {/* Hero card negro mate con Instrument Serif itálica (como en 01-inicio.png) */}
                  <div style={{
                    margin: 8,
                    borderRadius: 10,
                    background: '#111111',
                    padding: '10px 12px',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ maxWidth: '65%' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.15 }}>
                        Tu cocina de autor, <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 400 }}>mañana.</span>
                      </div>
                      <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#111', fontSize: 8.5, fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
                        Ver carta →
                      </div>
                    </div>
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: '#222', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      🥂
                    </div>
                  </div>

                  {/* Fila de categorías con dash hairline */}
                  <div style={{ padding: '0 8px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: '#6A6A6A', textTransform: 'uppercase' }}>— CATÁLOGO</span>
                    <span style={{ background: '#111', color: '#fff', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>✓ Todo</span>
                    <span style={{ background: '#fff', border: '1px solid #E3E3E3', borderRadius: 999, padding: '2px 7px', fontSize: 9, fontWeight: 700, color: '#111' }}>Entradas</span>
                  </div>

                  {/* Mini tarjeta con well blanco y hairline border (como en 06-tienda-catalogo.png) */}
                  <div style={{ margin: '0 8px 8px', background: '#fff', borderRadius: 8, padding: 6, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(17,17,17,0.08)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#F0F0F0', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🐟</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#888', letterSpacing: '.05em', textTransform: 'uppercase' }}>CHEF AUTOR</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Pargo Dorado al Horno</div>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: '#111' }}>$38.500</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>+</div>
                  </div>
                </div>

                {/* Explicación y características */}
                <div>
                  <h3 style={{ margin: '0 0 5px', fontSize: 15.5, fontWeight: 800, color: 'var(--text)' }}>
                    Tura Muebles Editorial Luxury
                  </h3>
                  <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    Blanco & Negro minimalista, tipografía editorial cursiva (<code style={{ fontSize: 11, background: '#eee', padding: '1px 4px', borderRadius: 4 }}>Instrument Serif</code>), bordes milimétricos hairline.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: 'var(--muted)', fontWeight: 600 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ms" style={{ fontSize: 15, color: '#111' }}>check</span>
                      <span>Ideal para restaurantes gourmet, bistrós y marisquerías de autor</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ms" style={{ fontSize: 15, color: '#111' }}>check</span>
                      <span>Diseño editorial de revista culinaria con fotografías protagónicas</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: COLOR DE ACENTO DE MARCA */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  2. Color de Acento de tu Marca
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Aplica el color de tu logotipo en botones principales, badges y llamadas a la acción.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>colorize</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {COLOR_PRESETS.map((p) => {
                const active = brandColor.toLowerCase() === p.hex.toLowerCase();
                return (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setBrandColor(p.hex)}
                    style={{
                      height: 44,
                      padding: '0 16px',
                      borderRadius: 12,
                      border: active ? '2.5px solid var(--text)' : '1px solid var(--border)',
                      background: active ? 'var(--surface2)' : 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text)',
                      transition: 'all 0.15s ease',
                      boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: p.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                    <span>{p.name}</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>({p.tag})</span>
                  </button>
                );
              })}

              {/* Selector personalizado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#FF441F"
                  style={{
                    width: 100,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '0 10px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    textAlign: 'center',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: DOMINIOS Y DESPLIEGUE PÚBLICO */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  3. Presencia en Internet & Dominio
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Configura cómo visitan tus comensales este menú.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>language</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Enlace Oficial Turafood */}
              <div style={{ padding: 16, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.06em' }}>
                    URL OFICIAL EN TURAFOOD.COM
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>
                    https://turafood.com/store/{storeSlug}
                  </div>
                </div>
                <a
                  href={`http://localhost:3000/store/${storeSlug}?skin=${skin}&accent=${cleanAccent}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                    boxShadow: 'var(--shadowSm)',
                  }}
                >
                  <span>Probar URL</span>
                  <span className="ms" style={{ fontSize: 17 }}>launch</span>
                </a>
              </div>

              {/* Dominio Propio Personalizado */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
                    Conectar Dominio Propio (ej. pedidos.minegocio.com)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#E0F2FE', color: '#0369A1' }}>
                    PLAN TURA GROWTH
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>globe</span>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                    placeholder="pedidos.mibar.com o mibar.com"
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
                  />
                </div>
                <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                  Podrás alojar tu menú bajo tu propio dominio corporativo. Simplemente apunta un CNAME en Cloudflare hacia <code style={{ background: 'var(--surface2)', padding: '2px 5px', borderRadius: 4, fontWeight: 700 }}>domains.turafood.com</code>.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* ================= COLUMNA DERECHA: SIMULADOR IPHONE REAL EN VIVO ================= */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 22,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            
            {/* Header del Simulador */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>smartphone</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Simulador PWA Real</span>
              </div>

              {/* Pestañas de vista rápida */}
              <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setPreviewTab('store')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: previewTab === 'store' ? 'var(--surface)' : 'transparent',
                    color: previewTab === 'store' ? 'var(--text)' : 'var(--muted)',
                    boxShadow: previewTab === 'store' ? 'var(--shadowSm)' : 'none',
                  }}
                >
                  Menú Tienda
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('home')}
                  style={{
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: previewTab === 'home' ? 'var(--surface)' : 'transparent',
                    color: previewTab === 'home' ? 'var(--text)' : 'var(--muted)',
                    boxShadow: previewTab === 'home' ? 'var(--shadowSm)' : 'none',
                  }}
                >
                  Catálogo App
                </button>
              </div>
            </div>

            {/* MARCO DE TELÉFONO DE ALTA GAMA (APPLE IPHONE 15 PRO) */}
            <div style={{
              width: 320,
              height: 640,
              borderRadius: 44,
              background: '#0C0B0A',
              border: '3px solid #2B2824',
              padding: 9,
              boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 0 4px rgba(255,255,255,0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Dynamic Island / Altavoz */}
              <div style={{
                position: 'absolute',
                top: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 96,
                height: 22,
                background: '#0C0B0A',
                borderRadius: 999,
                zIndex: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1C1917' }} />
              </div>

              {/* PANTALLA INTERNA: IFRAME DE LA APP REAL CLIENTE */}
              <div style={{
                flex: 1,
                borderRadius: 34,
                overflow: 'hidden',
                background: skin === 'editorial' ? '#F5F5F5' : '#F6F5F2',
                position: 'relative',
              }}>
                <iframe
                  key={`${skin}-${brandColor}-${previewTab}`}
                  src={iframeSrc}
                  title="Live Preview PWA Client"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                    background: skin === 'editorial' ? '#F5F5F5' : '#F6F5F2',
                  }}
                />
              </div>

              {/* Barra de inicio inferior (Home Indicator) */}
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 100,
                height: 4,
                borderRadius: 999,
                background: skin === 'editorial' ? '#111' : '#fff',
                opacity: 0.6,
                zIndex: 40,
                pointerEvents: 'none',
              }} />
            </div>

            {/* Enlace directo debajo del teléfono */}
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <a
                href={liveStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}
              >
                <span>Abrir en navegador completo</span>
                <span className="ms" style={{ fontSize: 16 }}>arrow_outward</span>
              </a>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
