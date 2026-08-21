'use client';

/**
 * KIT TURAFOOD — ULTRA PREMIUM GROWTH SUITE
 *
 * Módulo todo en uno con Agente de Voz IA 24/7 + SMS + WhatsApp + Email +
 * Ficha de Google My Business Optimizada.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useBiz } from '../BizContext';

export default function KitTurafoodPage() {
  const { business } = useBiz();
  const [activeVoiceDemo, setActiveVoiceDemo] = useState(false);
  const [activeTab, setActiveTab] = useState('todos'); // todos, voz, omnicanal, google
  const [voicePlaying, setVoicePlaying] = useState(false);
  const [simulatedCall, setSimulatedCall] = useState(null);

  const simulateCall = () => {
    setVoicePlaying(true);
    setSimulatedCall('Conectando con Agente de Voz Tura IA...');
    setTimeout(() => {
      setSimulatedCall('🗣️ "Hola, bienvenido a ' + (business?.name || 'nuestro restaurante') + '. ¿Deseas hacer un pedido a domicilio o reservar una mesa para hoy?"');
    }, 1200);
  };

  const stopCall = () => {
    setVoicePlaying(false);
    setSimulatedCall(null);
  };

  return (
    <div style={S.page}>
      
      {/* ─────────── HERO ULTRA PREMIUM ─────────── */}
      <section style={S.hero}>
        <div style={S.heroGlow} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 840 }}>
          {/* Badge Ultra */}
          <div style={S.ultraBadge}>
            <span style={S.sparkle}>✨</span>
            <span>KIT TURAFOOD · ALL-IN-ONE ULTRA PREMIUM</span>
            <span style={S.newTag}>NUEVO</span>
          </div>

          <h1 style={S.heroTitle}>
            La Suite Definitiva de <span className="tf-serif tf-gold-text">Crecimiento Inteligente</span>
          </h1>

          <p style={S.heroSub}>
            Todo el poder de la Inteligencia Artificial trabajando 24/7 para tu restaurante: 
            <strong> Agente de Voz Telefónico</strong>, <strong>Omnicanalidad (SMS + WhatsApp + Email)</strong> y <strong>Ficha de Google My Business Optimizada</strong>.
          </p>

          {/* Status Badges Row */}
          <div style={S.statusRow}>
            <div style={S.statusPill}>
              <span style={S.greenDot} />
              <span>Agente de Voz: <strong>Activo 24/7</strong></span>
            </div>
            <div style={S.statusPill}>
              <span style={S.greenDot} />
              <span>Omnicanal: <strong>WhatsApp + SMS + Email</strong></span>
            </div>
            <div style={S.statusPill}>
              <span style={S.goldDot} />
              <span>Google Maps: <strong>Top #1 Optimizado</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FILTROS DE VISTA ─────────── */}
      <div style={S.filters}>
        {[
          { id: 'todos', label: '🌟 Todos los Módulos del Kit' },
          { id: 'voz', label: '🎧 Agente de Voz IA 24/7' },
          { id: 'omnicanal', label: '💬 SMS + WhatsApp + Email' },
          { id: 'google', label: '📍 Google My Business' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...S.tabBtn,
              background: activeTab === tab.id ? 'var(--text)' : 'var(--surface)',
              color: activeTab === tab.id ? 'var(--surface)' : 'var(--muted)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─────────── LOS 3 PILARES DEL KIT TURAFOOD ─────────── */}
      <div style={S.grid}>

        {/* 1. AGENTE DE VOZ IA */}
        {(activeTab === 'todos' || activeTab === 'voz') && (
          <div style={{ ...S.card, border: '1px solid rgba(16,185,129,0.3)', background: 'linear-gradient(145deg, var(--surface) 0%, rgba(16,185,129,0.03) 100%)' }}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                <span className="ms" style={{ fontSize: 26 }}>support_agent</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={S.cardKicker}>VOZ Y TELEFONÍA AI</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#E6F6EE', color: '#0B8E54' }}>
                    ● EN VIVO 24/7
                  </span>
                </div>
                <h2 style={S.cardTitle}>Agente de Voz IA Telefónico</h2>
              </div>
            </div>

            <p style={S.cardText}>
              Una línea telefónica inteligente con voz humana ultra-realista que contesta cada llamada al instante, toma pedidos del menú, agenda reservas de mesa y resuelve preguntas frecuentes sin esperas.
            </p>

            {/* Métricas */}
            <div style={S.metricsGrid}>
              <div style={S.metricBox}>
                <div style={S.metricVal}>1.420</div>
                <div style={S.metricLabel}>Llamadas atendidas</div>
              </div>
              <div style={S.metricBox}>
                <div style={{ ...S.metricVal, color: '#10B981' }}>0%</div>
                <div style={S.metricLabel}>Llamadas perdidas</div>
              </div>
              <div style={S.metricBox}>
                <div style={S.metricVal}>4.9 ★</div>
                <div style={S.metricLabel}>Satisfacción cliente</div>
              </div>
            </div>

            {/* Simulador Interactivo de Voz */}
            <div style={S.demoBox}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                  🎧 Simulador de Voz en Vivo
                </span>
                {voicePlaying && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="ms" style={{ fontSize: 14 }}>graphic_eq</span> Audio Activo
                  </span>
                )}
              </div>

              {simulatedCall ? (
                <div style={S.simMessage}>
                  {simulatedCall}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  Prueba cómo contesta tu Agente de Voz cuando un cliente llama a tu restaurante.
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {!voicePlaying ? (
                  <button onClick={simulateCall} style={S.voiceBtn}>
                    <span className="ms" style={{ fontSize: 18 }}>call</span>
                    Simular Llamada Entrante
                  </button>
                ) : (
                  <button onClick={stopCall} style={{ ...S.voiceBtn, background: '#EF4444' }}>
                    <span className="ms" style={{ fontSize: 18 }}>call_end</span>
                    Finalizar Prueba
                  </button>
                )}
                <Link href="/negocio/agente-ia" style={S.ghostBtn}>
                  Configurar Respuestas
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2. OMNICANALIDAD (SMS + WHATSAPP + EMAIL) */}
        {(activeTab === 'todos' || activeTab === 'omnicanal') && (
          <div style={{ ...S.card, border: '1px solid rgba(255,122,77,0.3)', background: 'linear-gradient(145deg, var(--surface) 0%, rgba(255,122,77,0.03) 100%)' }}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: 'rgba(255,122,77,0.15)', color: 'var(--primary)' }}>
                <span className="ms" style={{ fontSize: 26 }}>mark_chat_unread</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={S.cardKicker}>MARKETING OMNICANAL</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#FFF1EC', color: 'var(--primary)' }}>
                    WHATSAPP + SMS + EMAIL
                  </span>
                </div>
                <h2 style={S.cardTitle}>SMS + WhatsApp + Email Marketing</h2>
              </div>
            </div>

            <p style={S.cardText}>
              Automatizaciones que recuperan carritos abandonados, envían cupones flash por SMS con alta tasa de apertura y despachan correos de fidelización automáticos con tus promociones de la semana.
            </p>

            {/* Métricas */}
            <div style={S.metricsGrid}>
              <div style={S.metricBox}>
                <div style={S.metricVal}>98.6%</div>
                <div style={S.metricLabel}>Apertura en WhatsApp</div>
              </div>
              <div style={S.metricBox}>
                <div style={{ ...S.metricVal, color: 'var(--primary)' }}>+42%</div>
                <div style={S.metricLabel}>Recompra recurrente</div>
              </div>
              <div style={S.metricBox}>
                <div style={S.metricVal}>3.840</div>
                <div style={S.metricLabel}>Mensajes enviados</div>
              </div>
            </div>

            {/* Canales Activos */}
            <div style={S.channelsList}>
              <div style={S.channelItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🟢</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>WhatsApp Business API</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Confirmaciones y carritos recuperados</div>
                  </div>
                </div>
                <span style={S.activeBadge}>Conectado</span>
              </div>

              <div style={S.channelItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>SMS Flash Gateway</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Cupones de última hora a clientes cercanos</div>
                  </div>
                </div>
                <span style={S.activeBadge}>Conectado</span>
              </div>

              <div style={S.channelItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>✉️</span>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text)' }}>Email Marketing Automatizado</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>Campañas de fin de semana y cumpleaños</div>
                  </div>
                </div>
                <span style={S.activeBadge}>Conectado</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Link href="/negocio/email-mkt" style={S.primaryBtn}>
                <span className="ms" style={{ fontSize: 18 }}>send</span>
                Lanzar Campaña
              </Link>
              <Link href="/negocio/redes/inbox" style={S.ghostBtn}>
                Bandeja Unificada
              </Link>
            </div>
          </div>
        )}

        {/* 3. GOOGLE MY BUSINESS OPTIMIZADO */}
        {(activeTab === 'todos' || activeTab === 'google') && (
          <div style={{ ...S.card, border: '1px solid rgba(66,133,244,0.3)', background: 'linear-gradient(145deg, var(--surface) 0%, rgba(66,133,244,0.03) 100%)' }}>
            <div style={S.cardHeader}>
              <div style={{ ...S.cardIcon, background: 'rgba(66,133,244,0.15)', color: '#4285F4' }}>
                <span className="ms" style={{ fontSize: 26 }}>storefront</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={S.cardKicker}>POSICIONAMIENTO LOCAL</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#E8F0FE', color: '#1967D2' }}>
                    GOOGLE MAPS PRO
                  </span>
                </div>
                <h2 style={S.cardTitle}>Ficha de Google My Business Optimizada</h2>
              </div>
            </div>

            <p style={S.cardText}>
              Aparece de primero cuando alguien busque comida en Buenaventura. Tu ficha verificada en Google Maps con menú sincronizado, fotos de alta calidad y respuestas inteligentes automáticas a cada reseña.
            </p>

            {/* Métricas */}
            <div style={S.metricsGrid}>
              <div style={S.metricBox}>
                <div style={S.metricVal}>Top #1</div>
                <div style={S.metricLabel}>Posición en Maps</div>
              </div>
              <div style={S.metricBox}>
                <div style={{ ...S.metricVal, color: '#4285F4' }}>8.450</div>
                <div style={S.metricLabel}>Búsquedas locales</div>
              </div>
              <div style={S.metricBox}>
                <div style={S.metricVal}>+189</div>
                <div style={S.metricLabel}>Reseñas con 4.9 ★</div>
              </div>
            </div>

            {/* Destacados Google */}
            <div style={S.googlePreview}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4285F4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14 }}>
                  G
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{business?.name || 'Tu Restaurante'} · Google Maps</div>
                  <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Perfil Verificado y Optimizado</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                Sincronización directa de platos, horarios de apertura en vivo y botón de <strong>"Pedir en Línea"</strong> apuntando directamente a tu menú en TuraFood.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Link href="/negocio/crecimiento/google-negocio" style={{ ...S.primaryBtn, background: '#4285F4' }}>
                <span className="ms" style={{ fontSize: 18 }}>store</span>
                Ver Ficha en Google
              </Link>
              <Link href="/negocio/resenas" style={S.ghostBtn}>
                Respuestas Automáticas IA
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* ─────────── BANNER RESUMEN TODO EN UNO ─────────── */}
      <section style={S.allInOneBanner}>
        <div style={{ maxWidth: 640 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: 'rgba(232,199,102,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 800, marginBottom: 12 }}>
            <span>⚡</span> TODO INCLUIDO EN EL PLAN PRO
          </div>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 10px', fontFamily: 'var(--font-bricolage)' }}>
            ¿Tienes dudas sobre cómo escalar con tu Kit?
          </h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
            Nuestro equipo de ingenieros y especialistas de soporte en Buenaventura te acompaña en la configuración de tus líneas y campañas.
          </p>
        </div>

        <a
          href="https://wa.me/573026886449?text=Hola%2C%20quiero%20soporte%20VIP%20para%20configurar%20mi%20Kit%20Turafood%20Ultra"
          target="_blank"
          rel="noopener noreferrer"
          style={S.whatsappVipBtn}
        >
          <span className="ms" style={{ fontSize: 20 }}>chat</span>
          Hablar con Asesor VIP
        </a>
      </section>

    </div>
  );
}

const S = {
  page: { padding: '24px 28px 80px', maxWidth: 1160, margin: '0 auto' },
  
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 28,
    padding: '48px 36px', background: 'linear-gradient(135deg, #181410 0%, #0A0806 100%)',
    color: '#fff', marginBottom: 28, border: '1px solid rgba(232,199,102,0.2)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  heroGlow: {
    position: 'absolute', top: -100, right: -100, width: 340, height: 340,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,77,0.3) 0%, rgba(232,199,102,0.15) 50%, transparent 80%)',
    filter: 'blur(50px)', pointerEvents: 'none',
  },
  ultraBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
    borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
    fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '.05em', marginBottom: 18,
  },
  sparkle: { fontSize: 14, color: 'var(--gold)' },
  newTag: {
    fontSize: 9.5, fontWeight: 900, padding: '2px 6px', borderRadius: 6,
    background: 'linear-gradient(135deg, #FF7A4D, #E2360F)', color: '#fff',
    letterSpacing: '.05em', boxShadow: '0 2px 8px rgba(255,68,31,0.4)',
  },
  heroTitle: {
    fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 800, fontFamily: 'var(--font-bricolage)',
    lineHeight: 1.12, letterSpacing: '-.03em', margin: '0 0 16px', color: '#fff',
  },
  heroSub: {
    fontSize: 15.5, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 24px',
  },
  statusRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  statusPill: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
    borderRadius: 99, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
  },
  greenDot: { width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' },
  goldDot: { width: 8, height: 8, borderRadius: '50%', background: '#FBBF24', boxShadow: '0 0 8px #FBBF24' },

  filters: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  tabBtn: {
    height: 42, padding: '0 18px', borderRadius: 14, fontSize: 13, fontWeight: 800,
    cursor: 'pointer', transition: 'all .2s ease',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 36 },
  card: {
    borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow)', transition: 'transform .2s',
  },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 },
  cardIcon: {
    width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flex: 'none',
  },
  cardKicker: { fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.06em' },
  cardTitle: { fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: '4px 0 0', lineHeight: 1.25 },
  cardText: { fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 20px', minHeight: 60 },

  metricsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
    padding: '14px', borderRadius: 16, background: 'var(--surface2)', marginBottom: 20,
    border: '1px solid var(--border)',
  },
  metricBox: { textAlign: 'center' },
  metricVal: { fontSize: 18, fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-bricolage)' },
  metricLabel: { fontSize: 10, color: 'var(--muted)', marginTop: 2, fontWeight: 600 },

  demoBox: {
    marginTop: 'auto', padding: 16, borderRadius: 18, background: 'var(--surface2)',
    border: '1px solid var(--border)',
  },
  simMessage: {
    padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)',
    fontSize: 12.5, color: 'var(--text)', lineHeight: 1.45, marginBottom: 12,
    boxShadow: 'var(--shadowSm)', animation: 'pop .3s ease both',
  },
  voiceBtn: {
    flex: 1, height: 42, padding: '0 14px', borderRadius: 12, border: 'none',
    background: '#10B981', color: '#fff', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
  },
  ghostBtn: {
    height: 42, padding: '0 14px', borderRadius: 12, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none',
  },
  primaryBtn: {
    flex: 1, height: 42, padding: '0 16px', borderRadius: 12, border: 'none',
    background: 'var(--primary)', color: '#fff', fontSize: 12.5, fontWeight: 800,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(255,68,31,0.25)',
  },

  channelsList: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', marginBottom: 6 },
  channelItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
    borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
  },
  activeBadge: {
    fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6,
    background: '#E6F6EE', color: '#0B8E54',
  },

  googlePreview: {
    marginTop: 'auto', padding: 14, borderRadius: 16, background: 'var(--surface2)',
    border: '1px solid var(--border)',
  },

  allInOneBanner: {
    borderRadius: 24, padding: '32px 36px', background: 'linear-gradient(135deg, #1C1917, #0C0A09)',
    border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
  },
  whatsappVipBtn: {
    height: 50, padding: '0 24px', borderRadius: 16, border: 'none',
    background: '#25D366', color: '#fff', fontSize: 14.5, fontWeight: 800,
    display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none',
    boxShadow: '0 8px 24px rgba(37,211,102,0.35)', cursor: 'pointer', flex: 'none',
  },
};
