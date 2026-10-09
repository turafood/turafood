'use client';

import { useState, useEffect } from 'react';
import { useBiz } from '../BizContext';
import { updateBusiness } from '@/lib/negocio';

// Presets de colores de marca
const COLOR_PRESETS = [
  { name: 'Naranja TuraFood', hex: '#FF441F' },
  { name: 'Carbón Tura Muebles', hex: '#111111' },
  { name: 'Oro Pacífico', hex: '#B8912F' },
  { name: 'Verde Esmeralda', hex: '#10B981' },
  { name: 'Azul Puerto', hex: '#2563EB' },
  { name: 'Rubí Gourmet', hex: '#E11D48' },
  { name: 'Púrpura Atelier', hex: '#7C3AED' },
];

export default function PersonalizacionPage() {
  const { business, refreshBusiness, toast } = useBiz();

  // Estados del formulario
  const [skin, setSkin] = useState('vibrant'); // 'vibrant' | 'editorial'
  const [brandColor, setBrandColor] = useState('#FF441F');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Inicializar desde los datos del negocio
  useEffect(() => {
    if (!business) return;
    if (business.pwa_skin) setSkin(business.pwa_skin);
    if (business.brand_color) setBrandColor(business.brand_color);
    if (business.slug) setSubdomain(business.slug);
    if (business.custom_domain) setCustomDomain(business.custom_domain);
  }, [business]);

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

      // Sincronizar en localStorage para que la pestaña cliente en localhost lo lea de inmediato
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
      if (toast) toast('¡Apariencia y skin guardados con éxito!');
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Error guardando cambios: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const previewStoreUrl = `http://localhost:3000/store/${business?.slug || 'el-sazon-del-puerto'}?skin=${skin}`;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* HEADER HERO */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,68,31,0.1)', color: 'var(--primary)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            <span className="ms" style={{ fontSize: 16 }}>palette</span>
            <span>Identidad & Experiencia PWA</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Diseño & Look and Feel de tu Tienda
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: 'var(--muted)', maxWidth: 640, lineHeight: 1.5 }}>
            Elige la identidad visual de tu menú y tienda digital. Decide cómo te verán tus clientes cuando ingresen desde tu dominio propio o desde la red TuraFood.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={previewStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              height: 44,
              padding: '0 18px',
              borderRadius: 12,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              textDecoration: 'none',
              boxShadow: 'var(--shadowSm)',
            }}
          >
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>visibility</span>
            <span>Ver Tienda en Vivo</span>
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
              boxShadow: '0 8px 20px rgba(255,68,31,0.3)',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <span className="ms" style={{ fontSize: 18 }}>{saving ? 'sync' : 'check'}</span>
            <span>{saving ? 'Guardando…' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </div>

      {/* AVISO DE GUARDADO EXITOSO */}
      {savedSuccess && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 14,
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#065F46',
          fontSize: 13.5,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          animation: 'fadeIn 0.2s ease',
        }}>
          <span className="ms" style={{ fontSize: 20, color: '#10B981' }}>check_circle</span>
          <span>¡Diseño actualizado exitosamente! Los comensales que visiten tu menú verán estos cambios al instante.</span>
        </div>
      )}

      {/* GRID DE DOS COLUMNAS: CONTROLES + LIVE PREVIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(320px, 0.75fr)', gap: 32, alignItems: 'start' }}>
        
        {/* ================= COLUMNA IZQUIERDA: CONTROLES ================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* SELECCIÓN DE SKIN */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  1. Selecciona la Skin de tu Menú
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Define la personalidad visual con la que tus clientes experimentarán tus platos.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>style</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              
              {/* SKIN 1: VIBRANTE (DELIVERY / RAPPI STYLE) */}
              <div
                onClick={() => setSkin('vibrant')}
                style={{
                  border: skin === 'vibrant' ? '2.5px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 18,
                  cursor: 'pointer',
                  background: skin === 'vibrant' ? 'rgba(255,68,31,0.03)' : 'var(--surface2)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: '#FFEBE6',
                    color: '#E2360F',
                  }}>
                    Estilo Delivery
                  </span>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: skin === 'vibrant' ? '6px solid var(--primary)' : '2px solid var(--muted)',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                  }} />
                </div>

                <div style={{
                  height: 110,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #FF5B2E 0%, #E2360F 100%)',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#fff',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>🍔 TuraFood Vibrante</span>
                    <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 6 }}>15-25 min</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div style={{ height: 24, width: 60, background: '#fff', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#17140F', fontSize: 10, fontWeight: 800 }}>
                      Pedir
                    </div>
                    <div style={{ height: 24, width: 24, background: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
                      +
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    TuraFood Delivery Vibrante
                  </h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    Colorido, botones redondeados de alta conversión y badges dinámicos. Ideal para hamburgueserías, pizzerías y asaderos.
                  </p>
                </div>
              </div>

              {/* SKIN 2: TURA MUEBLES EDITORIAL LUXURY */}
              <div
                onClick={() => setSkin('editorial')}
                style={{
                  border: skin === 'editorial' ? '2.5px solid #111111' : '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 18,
                  cursor: 'pointer',
                  background: skin === 'editorial' ? '#FAF9F6' : 'var(--surface2)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 999,
                    background: '#111',
                    color: '#fff',
                    letterSpacing: '.04em',
                  }}>
                    Tura Muebles Look & Feel
                  </span>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: skin === 'editorial' ? '6px solid #111111' : '2px solid var(--muted)',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                  }} />
                </div>

                <div style={{
                  height: 110,
                  borderRadius: 12,
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  color: '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 15, fontWeight: 400, letterSpacing: '.02em' }}>
                      Atelier Gastronómico
                    </span>
                    <span style={{ fontSize: 10, border: '1px solid rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 4 }}>HAIRLINE</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 6 }}>
                    <span style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.7 }}>B&W LUXURY</span>
                    <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 13 }}>Tura Sofa Muebles</span>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                    Tura Muebles Editorial Luxury
                  </h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                    Blanco & Negro minimalista, tipografía editorial con cursiva de lujo, bordes finos milimétricos. Ideal para marisquerías gourmet y bistrós.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* COLOR DE ACENTO */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  2. Color de Acento de Marca
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Este tono se aplicará en botones de compra, badges de productos estrella y elementos interactivos.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>colorize</span>
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
                      height: 40,
                      padding: '0 14px',
                      borderRadius: 10,
                      border: active ? '2px solid var(--text)' : '1px solid var(--border)',
                      background: active ? 'var(--surface2)' : 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--text)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: p.hex, boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }} />
                    <span>{p.name}</span>
                  </button>
                );
              })}

              {/* Selector personalizado HEX */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer', background: 'none' }}
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#FF441F"
                  style={{
                    width: 90,
                    height: 38,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    padding: '0 10px',
                    fontSize: 13,
                    fontWeight: 700,
                    textAlign: 'center',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* DOMINIOS & DESPLIEGUE PÚBLICO */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadowSm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  3. Presencia en Internet & Dominios
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                  Configura cómo acceden tus clientes a este menú.
                </p>
              </div>
              <span className="ms" style={{ fontSize: 22, color: 'var(--muted)' }}>language</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Enlace Oficial Turafood */}
              <div style={{ padding: 14, borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.05em' }}>
                    URL Principal en TuraFood
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>
                    turafood.com/store/{business?.slug || 'tu-negocio'}
                  </div>
                </div>
                <a
                  href={`http://localhost:3000/store/${business?.slug || 'el-sazon-del-puerto'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <span>Abrir</span>
                  <span className="ms" style={{ fontSize: 16 }}>open_in_new</span>
                </a>
              </div>

              {/* Subdominio Personalizado */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Subdominio Directo (ej. elsazon.turafood.com)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <input
                    type="text"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="nombre-de-tu-negocio"
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>.turafood.com</span>
                </div>
              </div>

              {/* Dominio Propio (DNS) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    Dominio Propio (ej. pedidos.elrestaurante.com)
                  </label>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: '#E0F2FE', color: '#0369A1' }}>
                    PLAN GROWTH
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>globe</span>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                    placeholder="pedidos.mirestaurante.com"
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
                  />
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Para usar tu dominio, apunta un registro CNAME en tu proveedor (Cloudflare, GoDaddy, etc.) hacia <code style={{ background: 'var(--surface2)', padding: '2px 4px', borderRadius: 4 }}>domains.turafood.com</code>.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* ================= COLUMNA DERECHA: LIVE SMARTPHONE PREVIEW ================= */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 24,
            padding: 20,
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>smartphone</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>Simulador en Vivo</span>
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 999,
                background: skin === 'editorial' ? '#111' : '#FFEBE6',
                color: skin === 'editorial' ? '#fff' : '#E2360F',
                textTransform: 'uppercase',
              }}>
                {skin === 'editorial' ? 'Editorial Luxury' : 'Vibrante'}
              </span>
            </div>

            {/* CHASSIS DE SMARTPHONE */}
            <div style={{
              width: 290,
              height: 580,
              borderRadius: 38,
              background: '#0C0B0A',
              padding: 9,
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* PANTALLA INTERNA DEL TELÉFONO */}
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: 30,
                background: skin === 'editorial' ? '#FAF9F6' : '#F6F5F2',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                color: skin === 'editorial' ? '#111' : '#17140F',
                fontFamily: skin === 'editorial' ? 'Georgia, serif' : 'system-ui, sans-serif',
                transition: 'all 0.25s ease',
              }}>
                {/* ISLA DINÁMICA / NOTCH */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 90,
                  height: 20,
                  background: '#0C0B0A',
                  borderRadius: '0 0 12px 12px',
                  zIndex: 20,
                }} />

                {/* HEADER DEL SIMULADOR SEGÚN EL SKIN */}
                {skin === 'vibrant' ? (
                  // HEADER VIBRANTE
                  <div style={{
                    padding: '28px 14px 12px',
                    background: 'linear-gradient(135deg, #FF441F 0%, #E2360F 100%)',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#fff' }}>arrow_back</span>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{business?.name || 'El Sazón del Puerto'}</span>
                      <span className="ms" style={{ fontSize: 18, color: '#fff' }}>share</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, opacity: 0.9 }}>
                      <span>⭐ 4.9 (180+)</span>
                      <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: 6 }}>15-25 min</span>
                    </div>
                  </div>
                ) : (
                  // HEADER EDITORIAL LUXURY (TURA MUEBLES)
                  <div style={{
                    padding: '28px 14px 14px',
                    background: '#111111',
                    color: '#fff',
                    borderBottom: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#ccc' }}>arrow_back</span>
                      <span style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B8912F' }}>
                        ATELIER GASTRONÓMICO
                      </span>
                      <span className="ms" style={{ fontSize: 18, color: '#ccc' }}>bookmark_border</span>
                    </div>
                    <div style={{ fontStyle: 'italic', fontSize: 15, textAlign: 'center', marginTop: 2, letterSpacing: '.02em' }}>
                      {business?.name || 'El Sazón del Puerto'}
                    </div>
                    <div style={{ fontSize: 9.5, textAlign: 'center', color: '#999', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      Cocina de Autor · Buenaventura
                    </div>
                  </div>
                )}

                {/* CONTENIDO INTERNO DEL SIMULADOR */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* SELECCIÓN DE CATEGORÍA */}
                  <div style={{ display: 'flex', gap: 6, overflowX: 'hidden' }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: skin === 'editorial' ? 4 : 999,
                      background: brandColor,
                      color: '#fff',
                      fontSize: 10.5,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}>
                      Destacados
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: skin === 'editorial' ? 4 : 999,
                      background: skin === 'editorial' ? '#eee' : '#fff',
                      color: '#666',
                      fontSize: 10.5,
                      fontWeight: 700,
                      border: '1px solid rgba(0,0,0,0.06)',
                      whiteSpace: 'nowrap',
                    }}>
                      Platos Fuertes
                    </div>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: skin === 'editorial' ? 4 : 999,
                      background: skin === 'editorial' ? '#eee' : '#fff',
                      color: '#666',
                      fontSize: 10.5,
                      fontWeight: 700,
                      border: '1px solid rgba(0,0,0,0.06)',
                      whiteSpace: 'nowrap',
                    }}>
                      Bebidas
                    </div>
                  </div>

                  {/* PLATO 1 */}
                  <div style={{
                    borderRadius: skin === 'editorial' ? 6 : 14,
                    background: '#fff',
                    border: skin === 'editorial' ? '1px solid #E5E5E5' : '1px solid rgba(0,0,0,0.06)',
                    padding: 10,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    boxShadow: skin === 'editorial' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      width: 54,
                      height: 54,
                      borderRadius: skin === 'editorial' ? 4 : 10,
                      background: "#222 url('https://images.unsplash.com/photo-1544025162-d76694265947?w=200&q=80') center/cover",
                      flex: 'none',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: skin === 'editorial' ? 12.5 : 12,
                        fontWeight: skin === 'editorial' ? 600 : 800,
                        fontStyle: skin === 'editorial' ? 'italic' : 'normal',
                        color: '#111',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        Cazuela de Mariscos Pacífica
                      </div>
                      <div style={{ fontSize: 9.5, color: '#888', marginTop: 1 }}>Con coco y camarones frescos</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: brandColor, marginTop: 4 }}>
                        $34.000
                      </div>
                    </div>
                    <button style={{
                      width: 24,
                      height: 24,
                      borderRadius: skin === 'editorial' ? 4 : '50%',
                      background: brandColor,
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}>
                      +
                    </button>
                  </div>

                  {/* PLATO 2 */}
                  <div style={{
                    borderRadius: skin === 'editorial' ? 6 : 14,
                    background: '#fff',
                    border: skin === 'editorial' ? '1px solid #E5E5E5' : '1px solid rgba(0,0,0,0.06)',
                    padding: 10,
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    boxShadow: skin === 'editorial' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                  }}>
                    <div style={{
                      width: 54,
                      height: 54,
                      borderRadius: skin === 'editorial' ? 4 : 10,
                      background: "#222 url('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=80') center/cover",
                      flex: 'none',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: skin === 'editorial' ? 12.5 : 12,
                        fontWeight: skin === 'editorial' ? 600 : 800,
                        fontStyle: skin === 'editorial' ? 'italic' : 'normal',
                        color: '#111',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        Pargo Rojo Frito con Patacón
                      </div>
                      <div style={{ fontSize: 9.5, color: '#888', marginTop: 1 }}>Arroz con coco y ensalada</div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: brandColor, marginTop: 4 }}>
                        $38.500
                      </div>
                    </div>
                    <button style={{
                      width: 24,
                      height: 24,
                      borderRadius: skin === 'editorial' ? 4 : '50%',
                      background: brandColor,
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}>
                      +
                    </button>
                  </div>

                  {/* BARRA INFERIOR DE ACCIÓN */}
                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    <div style={{
                      padding: '10px 12px',
                      borderRadius: skin === 'editorial' ? 6 : 12,
                      background: skin === 'editorial' ? '#111' : brandColor,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 11.5,
                      fontWeight: 700,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="ms" style={{ fontSize: 16 }}>shopping_bag</span>
                        <span>Ver Carrito (2)</span>
                      </div>
                      <span>$72.500</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <a
                href={previewStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
              >
                <span>Probar en ventana completa</span>
                <span className="ms" style={{ fontSize: 16 }}>arrow_outward</span>
              </a>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
