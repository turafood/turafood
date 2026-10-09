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

// Screenshots oficiales del handoff de Claude Code en PWA - Screenshots y Handoff - 05-10-2026
const HANDOFF_SCREENSHOTS = [
  {
    category: 'Experiencia Inicial & Home',
    items: [
      { id: '01-inicio', title: 'Portada & Inicio Editorial', file: '/img/turamuebles/01-inicio.png', desc: 'Tipografía cursiva Instrument Serif, banners minimalistas y búsqueda rápida.' },
      { id: '02-inicio-oscuro', title: 'Modo Oscuro Luxury', file: '/img/turamuebles/02-inicio-oscuro.png', desc: 'Negro profundo con contraste milimétrico para navegación nocturna.' },
      { id: '05-inicio-asistente', title: 'Espacios & Asistente IA', file: '/img/turamuebles/05-inicio-asistente-y-espacios.png', desc: 'Navegación por ambientes del hogar y atajo al asesor virtual.' },
    ],
  },
  {
    category: 'Catálogo & Ficha de Producto',
    items: [
      { id: '06-tienda-catalogo', title: 'Catálogo de Productos', file: '/img/turamuebles/06-tienda-catalogo.png', desc: 'Cuadrícula limpia con 18 muebles listos para armar, precios y disponibilidad.' },
      { id: '10-producto', title: 'Ficha de Producto de Autor', file: '/img/turamuebles/10-producto.png', desc: 'Fotografía protagónica, medidas exactas y botón de ensamble incluido.' },
      { id: '13-carrito', title: 'Bolsa de Compras / Carrito', file: '/img/turamuebles/13-carrito.png', desc: 'Resumen claro de costos, subtotal y envío prioritario a Buenaventura.' },
    ],
  },
  {
    category: 'Checkout, Seguimiento & Tura IA',
    items: [
      { id: '16-pago-datos', title: 'Datos de Entrega Buenaventura', file: '/img/turamuebles/16-pago-datos-de-entrega.png', desc: 'Campos optimizados para barrios y comunas locales.' },
      { id: '21-seguimiento', title: 'Línea de Tiempo en Vivo', file: '/img/turamuebles/21-seguimiento.png', desc: 'Tracking de despacho con estados claros desde el centro de distribución.' },
      { id: '30-tura-ia', title: 'Tura IA Asistente Experto', file: '/img/turamuebles/30-tura-ia-bienvenida.png', desc: 'Asesor inteligente que sugiere mobiliario según medidas y presupuesto.' },
      { id: '34-pacifico-protect', title: 'Garantía Pacífico Protect', file: '/img/turamuebles/34-pacifico-protect.png', desc: 'Protección contra humedad marina y garantía de herrajes.' },
    ],
  },
];

export default function PersonalizacionPage() {
  const { business, refreshBusiness, toast } = useBiz();

  // Estados principales
  const [skin, setSkin] = useState('editorial'); // 'editorial' | 'vibrant'
  const [brandColor, setBrandColor] = useState('#111111');
  const [customDomain, setCustomDomain] = useState('');
  const [activeTab, setActiveTab] = useState('turamuebles'); // 'turamuebles' | 'turafood' | 'galeria'
  const [simulatorView, setSimulatorView] = useState('editorial'); // 'editorial' | 'vibrant'
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeGalleryModal, setActiveGalleryModal] = useState(null);

  // Inicializar con datos del negocio si existen
  useEffect(() => {
    if (!business) return;
    if (business.pwa_skin) {
      setSkin(business.pwa_skin);
      setSimulatorView(business.pwa_skin);
    }
    if (business.brand_color) setBrandColor(business.brand_color);
    if (business.custom_domain) setCustomDomain(business.custom_domain);
  }, [business]);

  const handleSelectSkin = (selectedSkin) => {
    setSkin(selectedSkin);
    setSimulatorView(selectedSkin);
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

      // Sincronizar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'turafood_skin_preference',
          JSON.stringify({ state: { skin, brandAccent: brandColor }, version: 0 })
        );
      }

      await refreshBusiness?.();
      setSavedSuccess(true);
      if (toast) toast('¡Identidad visual guardada con éxito!');
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Error guardando diseño: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const storeSlug = business?.slug || 'asadero-el-puerto';
  const cleanAccent = brandColor.replace('#', '');

  // URLs de demostración con datos base pre-cargados
  const turaMueblesDemoUrl = 'https://turamuebles.pages.dev';
  const turaMueblesLocalDemoUrl = '/demo-turamuebles.html';
  const turaFoodDemoUrl = `http://localhost:3000/store/asadero-el-puerto?skin=vibrant&accent=${cleanAccent}`;
  const turaFoodHomeDemoUrl = `http://localhost:3000/home?skin=vibrant&accent=${cleanAccent}`;

  // Iframe dinámico según el simulador
  const iframeSrc = simulatorView === 'editorial'
    ? turaMueblesLocalDemoUrl
    : turaFoodDemoUrl;

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '24px 24px 90px' }}>
      
      {/* ================= ENCABEZADO PRINCIPAL ================= */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 999, background: 'rgba(17,17,17,0.06)', color: 'var(--text)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>
            <span className="ms" style={{ fontSize: 16, color: 'var(--primary)' }}>devices</span>
            <span>Showcase Oficial de Apps PWA · Pre-cargadas con Datos Base</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, color: 'var(--text)', letterSpacing: '-0.025em' }}>
            Identidad Visual & Experiencia PWA
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--muted)', maxWidth: 750, lineHeight: 1.55 }}>
            Aquí tienes las 2 aplicaciones completas pre-cargadas con datos base oficiales para demostración: 
            <strong> Tura Muebles Editorial Luxury</strong> (diseño B&W de alta gama por Claude Code) y 
            <strong> TuraFood Delivery Vibrante</strong> (estilo Rappi / comida rápida). Puedes abrirlas a pantalla completa o activarlas para tu negocio.
          </p>
        </div>

        {/* Acciones superiores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={simulatorView === 'editorial' ? turaMueblesDemoUrl : turaFoodDemoUrl}
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
            <span>Abrir Demo en Pantalla Completa</span>
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
          marginBottom: 24,
        }}>
          <span className="ms" style={{ fontSize: 22, color: '#10B981' }}>verified</span>
          <div>
            <strong>¡Plantilla actualizada con éxito!</strong> Tu menú y presencia digital ahora despliegan el skin <strong>{skin === 'editorial' ? 'Tura Muebles Editorial Luxury' : 'TuraFood Delivery Vibrante'}</strong>.
          </div>
        </div>
      )}

      {/* ================= BARRA DE ACCESO RÁPIDO A DEMOS Y DOMINIOS ================= */}
      <div style={{
        background: 'linear-gradient(135deg, #111111 0%, #1A1A1A 100%)',
        borderRadius: 20,
        padding: '18px 24px',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28,
        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="ms" style={{ fontSize: 24, color: '#FF441F' }}>language</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,0.6)' }}>
              ACCESO DIRECTO A LA DEMO PWA
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>https://demo.turafood.com</span>
              <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                Alias Cloudflare: turamuebles.pages.dev
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a
            href={turaMueblesDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: '#FFFFFF',
              color: '#111111',
              fontSize: 13,
              fontWeight: 800,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>Ver Tura Muebles en la Web</span>
            <span className="ms" style={{ fontSize: 16 }}>arrow_outward</span>
          </a>

          <a
            href={turaFoodDemoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.12)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span>Ver TuraFood Vibrante</span>
            <span className="ms" style={{ fontSize: 16 }}>restaurant</span>
          </a>
        </div>
      </div>

      {/* ================= PESTAÑAS DE LA SESIÓN ================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '2px solid var(--border)',
        marginBottom: 28,
        paddingBottom: 2,
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('turamuebles'); setSimulatorView('editorial'); }}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            color: activeTab === 'turamuebles' ? 'var(--text)' : 'var(--muted)',
            borderBottom: activeTab === 'turamuebles' ? '3px solid #111111' : '3px solid transparent',
            marginBottom: -3,
            transition: 'all 0.2s ease',
          }}
        >
          <span className="ms" style={{ fontSize: 20, color: activeTab === 'turamuebles' ? '#111111' : 'var(--muted)' }}>chair</span>
          <span>1. Tura Muebles Editorial Luxury</span>
          <span style={{ fontSize: 11, background: '#111111', color: '#fff', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
            CLAUDE CODE PWA
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('turafood'); setSimulatorView('vibrant'); }}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            color: activeTab === 'turafood' ? 'var(--primary)' : 'var(--muted)',
            borderBottom: activeTab === 'turafood' ? '3px solid var(--primary)' : '3px solid transparent',
            marginBottom: -3,
            transition: 'all 0.2s ease',
          }}
        >
          <span className="ms" style={{ fontSize: 20, color: activeTab === 'turafood' ? 'var(--primary)' : 'var(--muted)' }}>local_pizza</span>
          <span>2. TuraFood Delivery Vibrante</span>
          <span style={{ fontSize: 11, background: 'rgba(255,68,31,0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
            ESTILO RAPPI
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('galeria')}
          style={{
            border: 'none',
            background: 'none',
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            color: activeTab === 'galeria' ? '#2563EB' : 'var(--muted)',
            borderBottom: activeTab === 'galeria' ? '3px solid #2563EB' : '3px solid transparent',
            marginBottom: -3,
            transition: 'all 0.2s ease',
          }}
        >
          <span className="ms" style={{ fontSize: 20, color: activeTab === 'galeria' ? '#2563EB' : 'var(--muted)' }}>photo_library</span>
          <span>3. Galería de Pantallas Handoff (4K)</span>
          <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
            36 SCREENS
          </span>
        </button>
      </div>

      {/* ================= CONTENIDO SEGÚN LA PESTAÑA ACTIVA ================= */}
      
      {/* VISTA 1 & 2: COMPARATIVA CON SIMULADOR IPHONE */}
      {(activeTab === 'turamuebles' || activeTab === 'turafood') && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 0.9fr)', gap: 32, alignItems: 'start' }}>
          
          {/* ================= COLUMNA IZQUIERDA: DETALLES, PALETA Y CONFIGURACIÓN ================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            
            {/* HERO CARD DE LA APP SELECCIONADA */}
            {activeTab === 'turamuebles' ? (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #111111',
                borderRadius: 22,
                padding: 28,
                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: '#111111', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>
                      tm
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: '#111111' }}>
                      Tura Muebles · Experiencia Editorial Luxury
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#F5F5F5', color: '#111111', border: '1px solid #E5E5E5' }}>
                    Diseñado en Claude Code
                  </span>
                </div>

                <h2 style={{ fontSize: 26, fontWeight: 900, color: '#111111', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                  Arquitectura Visual Blanca & Negra de Alta Gama
                </h2>
                <p style={{ fontSize: 14.5, color: '#666666', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Inspirada fielmente en la entrega de Tura Muebles (05-10-2026). Utiliza la tipografía cursiva 
                  <em style={{ fontFamily: 'serif', fontStyle: 'italic', fontWeight: 600, color: '#111' }}> Instrument Serif</em>, 
                  bordes milimétricos hairline de 1px, fotografía arquitectónica protagónica y navegación por espacios.
                </p>

                {/* Grid de Características Clave */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ padding: 14, borderRadius: 12, background: '#FAFAFA', border: '1px solid #EEEEEE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#111' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#111' }}>inventory_2</span>
                      <span>18 Muebles Listos para Armar</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>
                      Catálogo con medidas exactas, materiales resistentes a humedad y opción de ensamble en Buenaventura.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: '#FAFAFA', border: '1px solid #EEEEEE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#111' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#111' }}>psychology</span>
                      <span>Tura IA Asistente Experto</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>
                      Asesor conversacional integrado que recomienda productos según medidas de la sala o alcoba.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: '#FAFAFA', border: '1px solid #EEEEEE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#111' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#111' }}>shield</span>
                      <span>Garantía Pacífico Protect</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>
                      Protección contra salitre y humedad marina para todos los muebles y herrajes metálicos.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: '#FAFAFA', border: '1px solid #EEEEEE' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: '#111' }}>
                      <span className="ms" style={{ fontSize: 18, color: '#111' }}>dark_mode</span>
                      <span>Modo Oscuro & Multi-idioma</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>
                      Conmutador instantáneo entre Negro Luxury y Blanco Editorial, con soporte en Español e Inglés.
                    </p>
                  </div>
                </div>

                {/* Botones de acción del Skin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectSkin('editorial')}
                    style={{
                      height: 44,
                      padding: '0 22px',
                      borderRadius: 12,
                      background: skin === 'editorial' ? '#111111' : '#F0F0F0',
                      color: skin === 'editorial' ? '#FFFFFF' : '#111111',
                      fontSize: 14,
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: skin === 'editorial' ? '0 6px 18px rgba(0,0,0,0.2)' : 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>{skin === 'editorial' ? 'check_circle' : 'radio_button_unchecked'}</span>
                    <span>{skin === 'editorial' ? 'Skin Editorial Activado' : 'Activar este Skin para mi Negocio'}</span>
                  </button>

                  <a
                    href={turaMueblesDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 44,
                      padding: '0 18px',
                      borderRadius: 12,
                      background: '#FFFFFF',
                      border: '1.5px solid #111111',
                      color: '#111111',
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Abrir en Pantalla Completa (turamuebles.pages.dev)</span>
                    <span className="ms" style={{ fontSize: 16 }}>open_in_new</span>
                  </a>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--primary)',
                borderRadius: 22,
                padding: 28,
                boxShadow: '0 8px 30px rgba(255,68,31,0.08)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900 }}>
                      tf
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--primary)' }}>
                      TuraFood · Experiencia Delivery Vibrante
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#FFE8E3', color: '#E2360F' }}>
                    Estilo Rappi / DoorDash
                  </span>
                </div>

                <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                  Conversión Inmediata & Pedidos Rápidos de Comida
                </h2>
                <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Optimizado para restaurantes, asaderos, hamburgueserías y comida rápida en Buenaventura. 
                  Enfocado en botones llamativos de compra rápida, temporizadores de entrega en 15 minutos, 
                  badges 2x1 y canasta flotante interactiva.
                </p>

                {/* Grid de Características Clave */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
                  <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>bolt</span>
                      <span>Tura Turbo 15 Minutos</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                      Insignias energéticas y cálculo en vivo de tiempo de entrega para comensales hambrientos.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>shopping_basket</span>
                      <span>Canasta de Compra Flotante</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                      Barra fija en la parte inferior con micro-animaciones y cálculo de subtotal en pesos colombianos.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>local_offer</span>
                      <span>Promos 2x1 & Descuentos</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                      Tarjetas protagónicas con fotos de comida de alta resolución y tags de ofertas automáticas.
                    </p>
                  </div>

                  <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 13.5, color: 'var(--text)' }}>
                      <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>storefront</span>
                      <span>Catálogo Multi-Categoría</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                      Chips horizontales desplazables para pasar rápidamente de Hamburguesas a Bebidas o Asados.
                    </p>
                  </div>
                </div>

                {/* Botones de acción del Skin */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectSkin('vibrant')}
                    style={{
                      height: 44,
                      padding: '0 22px',
                      borderRadius: 12,
                      background: skin === 'vibrant' ? 'var(--primary)' : 'var(--surface2)',
                      color: skin === 'vibrant' ? '#FFFFFF' : 'var(--text)',
                      fontSize: 14,
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: skin === 'vibrant' ? '0 6px 18px rgba(255,68,31,0.25)' : 'none',
                    }}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>{skin === 'vibrant' ? 'check_circle' : 'radio_button_unchecked'}</span>
                    <span>{skin === 'vibrant' ? 'Skin Vibrante Activado' : 'Activar este Skin para mi Negocio'}</span>
                  </button>

                  <a
                    href={turaFoodDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 44,
                      padding: '0 18px',
                      borderRadius: 12,
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Abrir Tienda Cliente en Pantalla Completa</span>
                    <span className="ms" style={{ fontSize: 16 }}>open_in_new</span>
                  </a>
                </div>
              </div>
            )}

            {/* SECCIÓN 2: PERSONALIZACIÓN DEL COLOR DE MARCA */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26, boxShadow: 'var(--shadowSm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                    Color de Acento de Marca
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                    Personaliza los botones de compra, badges y cabeceras con la tonalidad de tu empresa.
                  </p>
                </div>
                <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>colorize</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                        boxShadow: active ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: p.hex, border: '1px solid rgba(0,0,0,0.1)' }} />
                      <span>{p.name}</span>
                    </button>
                  );
                })}

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
                    placeholder="#111111"
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

            {/* SECCIÓN 3: INFORMACIÓN DE DESPLIEGUE EN VIVO */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 22, padding: 26, boxShadow: 'var(--shadowSm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                    Despliegue & Dominio Propio (demo.turafood.com)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                    Configuración de acceso para clientes y público general.
                  </p>
                </div>
                <span className="ms" style={{ fontSize: 24, color: 'var(--muted)' }}>cloud_done</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '.06em' }}>
                      DOMINIO DE DEMOSTRACIÓN (CLOUDFLARE)
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text)', marginTop: 3 }}>
                      https://demo.turafood.com
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      Apunta a la versión completa de Tura Muebles en Cloudflare Pages
                    </div>
                  </div>
                  <a
                    href={turaMueblesDemoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontSize: 12.5,
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    Probar Enlace ↗
                  </a>
                </div>

                {/* Dominio Propio Personalizado */}
                <div>
                  <label style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
                    Conectar Dominio Personalizado del Negocio (opcional)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>globe</span>
                    <input
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                      placeholder="pedidos.minegocio.com o minegocio.com"
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
                    />
                  </div>
                  <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                    Puedes alojar este menú en tu propio dominio. Apunta un registro CNAME en Cloudflare hacia <code>domains.turafood.com</code>.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* ================= COLUMNA DERECHA: SIMULADOR IPHONE 15 PRO ================= */}
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
                  <span className="ms" style={{ fontSize: 20, color: simulatorView === 'editorial' ? '#111' : 'var(--primary)' }}>smartphone</span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                    {simulatorView === 'editorial' ? 'Tura Muebles PWA' : 'TuraFood Delivery'}
                  </span>
                </div>

                {/* Conmutador de la demo interactiva en el simulador */}
                <div style={{ display: 'flex', background: 'var(--surface2)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setSimulatorView('editorial')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: simulatorView === 'editorial' ? '#111111' : 'transparent',
                      color: simulatorView === 'editorial' ? '#FFFFFF' : 'var(--muted)',
                    }}
                  >
                    Tura Muebles
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatorView('vibrant')}
                    style={{
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: simulatorView === 'vibrant' ? 'var(--primary)' : 'transparent',
                      color: simulatorView === 'vibrant' ? '#FFFFFF' : 'var(--muted)',
                    }}
                  >
                    TuraFood
                  </button>
                </div>
              </div>

              {/* MARCO DE TELÉFONO DE ALTA GAMA (APPLE IPHONE 15 PRO) */}
              <div style={{
                width: 330,
                height: 660,
                borderRadius: 44,
                background: '#0C0B0A',
                border: '3.5px solid #2B2824',
                padding: 10,
                boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 0 4px rgba(255,255,255,0.2)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                {/* Dynamic Island */}
                <div style={{
                  position: 'absolute',
                  top: 12,
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

                {/* PANTALLA INTERNA: CARGADA CON LA DEMO REAL */}
                <div style={{
                  flex: 1,
                  borderRadius: 34,
                  overflow: 'hidden',
                  background: simulatorView === 'editorial' ? '#FFFFFF' : '#F6F5F2',
                  position: 'relative',
                }}>
                  <iframe
                    key={`${simulatorView}-${brandColor}`}
                    src={iframeSrc}
                    title="Live Demo Simulator"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                      background: simulatorView === 'editorial' ? '#FFFFFF' : '#F6F5F2',
                    }}
                  />
                </div>

                {/* Home Indicator */}
                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 120,
                  height: 4,
                  background: '#44403C',
                  borderRadius: 999,
                  zIndex: 40,
                }} />
              </div>

              {/* Botón debajo del teléfono */}
              <div style={{ marginTop: 14, width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a
                  href={simulatorView === 'editorial' ? turaMueblesDemoUrl : turaFoodDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    height: 38,
                    borderRadius: 10,
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: 12.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <span className="ms" style={{ fontSize: 16 }}>open_in_new</span>
                  <span>Abrir esta vista en nueva ventana</span>
                </a>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ================= VISTA 3: GALERÍA DE SCREENSHOTS OFICIALES HANDOFF (4K) ================= */}
      {activeTab === 'galeria' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 22,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text)' }}>
                Galería Oficial del Handoff PWA · Tura Muebles
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--muted)' }}>
                Capturas directas en alta resolución de la carpeta <code>PWA - Screenshots y Handoff - 05-10-2026</code>. Haz clic en cualquiera para ampliar en tamaño completo.
              </p>
            </div>
            <a
              href={turaMueblesDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 10,
                background: '#111111',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 800,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>Abrir App Completa en Vivo</span>
              <span className="ms" style={{ fontSize: 16 }}>arrow_outward</span>
            </a>
          </div>

          {HANDOFF_SCREENSHOTS.map((group) => (
            <div key={group.category} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>folder_special</span>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {group.category}
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveGalleryModal(item)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 18,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      boxShadow: 'var(--shadowSm)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = 'var(--shadow)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'var(--shadowSm)';
                    }}
                  >
                    <div style={{ width: '100%', height: 380, background: '#111111', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={item.file}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                        {item.desc}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>Ver en tamaño gigante</span>
                        <span className="ms" style={{ fontSize: 14 }}>zoom_in</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      )}

      {/* MODAL LIGHTBOX PARA SCREENSHOTS GIGANTES */}
      {activeGalleryModal && (
        <div
          onClick={() => setActiveGalleryModal(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 520,
              maxHeight: '92vh',
              background: '#FFFFFF',
              borderRadius: 24,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ padding: '16px 20px', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{activeGalleryModal.title}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{activeGalleryModal.desc}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveGalleryModal(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
              >
                <span className="ms" style={{ fontSize: 24 }}>close</span>
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#0C0B0A', padding: 12, display: 'flex', justifyContent: 'center' }}>
              <img
                src={activeGalleryModal.file}
                alt={activeGalleryModal.title}
                style={{ maxWidth: '100%', height: 'auto', borderRadius: 14 }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
