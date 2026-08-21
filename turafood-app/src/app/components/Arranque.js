'use client';

/**
 * PERSONALIZACIÓN DE TEMA INTERACTIVO ULTRA PREMIUM (FIGMA STYLE)
 *
 * Cambia en tiempo real entre Claro, Oscuro y Puerto reflejando
 * la transformación visual completa del panel en vivo con mini-mockups
 * de alta fidelidad.
 */

import { useEffect, useState } from 'react';
import { TEMAS, TEMA_INFO, useTheme } from '@/lib/prefs';

const THEME_DATA = {
  light: {
    id: 'light',
    name: 'Modo Claro',
    tagline: 'Máxima claridad y frescura',
    desc: 'Diseñado para luz natural y ambientes diurnos en el restaurante.',
    icon: 'light_mode',
    accent: '#FF441F',
    accentGradient: 'linear-gradient(135deg, #FF7A4D, #E2360F)',
    glow: 'rgba(255, 68, 31, 0.35)',
    sheetBg: 'linear-gradient(145deg, #FFFFFF 0%, #F5F2EC 100%)',
    sheetBorder: 'rgba(255, 68, 31, 0.25)',
    textColor: '#17140F',
    subColor: '#736B60',
    mockup: {
      bg: '#FAF9F6',
      sidebar: '#EBE8E1',
      card: '#FFFFFF',
      border: 'rgba(0,0,0,0.08)',
      textPrimary: '#17140F',
      textMuted: '#999185',
      chartBar: '#FF441F',
      pillBg: '#FFF1EC',
      pillColor: '#FF441F',
    },
  },
  dark: {
    id: 'dark',
    name: 'Modo Oscuro',
    tagline: 'Negro mate & Alto contraste',
    desc: 'Elegancia pura, menor fatiga visual y ahorro de batería.',
    icon: 'dark_mode',
    accent: '#E8C766',
    accentGradient: 'linear-gradient(135deg, #F6E4A6, #E8C766, #FF7A4D)',
    glow: 'rgba(232, 199, 102, 0.35)',
    sheetBg: 'linear-gradient(145deg, #181410 0%, #0A0806 100%)',
    sheetBorder: 'rgba(232, 199, 102, 0.3)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.7)',
    mockup: {
      bg: '#120F0C',
      sidebar: '#1E1812',
      card: '#221C16',
      border: 'rgba(232,199,102,0.18)',
      textPrimary: '#FFFFFF',
      textMuted: '#8C8375',
      chartBar: '#E8C766',
      pillBg: 'rgba(232,199,102,0.15)',
      pillColor: '#E8C766',
    },
  },
  puerto: {
    id: 'puerto',
    name: 'Turín Turán',
    tagline: 'Bandera del Puerto · Oro & Esmeralda',
    desc: 'Inspirado en la bandera de Buenaventura (Amarillo Oro & Verde Esmeralda) sobre dark glass.',
    icon: 'sailing',
    accent: '#E8C766',
    accentSecondary: '#11B26A',
    accentGradient: 'linear-gradient(135deg, #F6E4A6 0%, #E8C766 45%, #11B26A 100%)',
    glow: 'rgba(232, 199, 102, 0.35)',
    sheetBg: 'linear-gradient(145deg, #0E1A13 0%, #060D09 100%)',
    sheetBorder: 'rgba(232, 199, 102, 0.3)',
    textColor: '#FFFFFF',
    subColor: 'rgba(255, 255, 255, 0.75)',
    mockup: {
      bg: '#0A140F',
      sidebar: '#122018',
      card: '#16281E',
      border: 'rgba(232,199,102,0.2)',
      textPrimary: '#FFFFFF',
      textMuted: '#9BB3A5',
      chartBar: '#E8C766',
      chartBar2: '#11B26A',
      pillBg: 'rgba(17,178,106,0.2)',
      pillColor: '#11B26A',
    },
  },
};

export default function Arranque({ onListo, onSaltar, guardando }) {
  const { theme, setTheme } = useTheme();
  const activeCfg = THEME_DATA[theme] || THEME_DATA.dark;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !guardando) onSaltar?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSaltar, guardando]);

  const seleccionarTema = (nuevoTema) => {
    setTheme(nuevoTema);
  };

  const completar = () => {
    onListo?.({ tema: theme, nicho: 'comidas' });
  };

  return (
    <div 
      style={{
        ...S.velo,
        background: theme === 'light' ? 'rgba(20, 16, 10, 0.65)' : 'rgba(4, 3, 2, 0.88)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      }} 
      className="anim-fade"
    >
      <section
        style={{
          ...S.hoja,
          background: activeCfg.sheetBg,
          borderColor: activeCfg.sheetBorder,
          boxShadow: `0 30px 90px rgba(0,0,0,0.7), 0 0 40px ${activeCfg.glow}`,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="arranque-hoja anim-slideup"
        role="dialog"
        aria-modal="true"
        aria-label="Elige tu interfaz"
      >

        {/* ─────────── CABECERA ─────────── */}
        <header style={{
          ...S.cabecera,
          borderBottom: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
        }}>
          <div style={S.cabeceraFila}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, color: activeCfg.accent }}>✨</span>
              <span style={{ ...S.paso, color: activeCfg.accent }}>
                PERSONALIZACIÓN VISUAL
              </span>
            </div>
            <button
              onClick={onSaltar}
              style={{
                ...S.saltar,
                color: theme === 'light' ? '#8C857B' : 'rgba(255,255,255,0.5)',
              }}
              disabled={guardando}
            >
              Saltar
            </button>
          </div>
        </header>

        {/* ─────────── CUERPO INTERACTIVO ─────────── */}
        <div id="arranque-scroll" style={S.cuerpo}>
          
          {/* ICON 3D MOCKUP DINÁMICO */}
          <div style={{ position: 'relative', zIndex: 1, margin: '4px 0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              position: 'relative',
              width: 84, height: 84,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'tffloat 5s ease-in-out infinite',
            }}>
              {/* Glow Ambiental Reactivo */}
              <div style={{
                position: 'absolute', inset: -14,
                background: `radial-gradient(circle, ${activeCfg.glow} 0%, transparent 70%)`,
                filter: 'blur(22px)', borderRadius: '50%', pointerEvents: 'none',
                transition: 'background 0.4s ease',
              }} />

              {/* 3D Mockup Badge */}
              <div style={{
                width: 70, height: 70, borderRadius: 20,
                background: theme === 'light'
                  ? 'linear-gradient(145deg, #FFFFFF, #EAE7DE)'
                  : 'linear-gradient(145deg, #241D14 0%, #15110B 100%)',
                border: `1px solid ${activeCfg.accent}`,
                boxShadow: '0 16px 36px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(-3deg)',
                position: 'relative',
                transition: 'all 0.3s ease',
              }}>
                <span className="ms" style={{
                  fontSize: 34,
                  color: activeCfg.accent,
                  filter: `drop-shadow(0 4px 10px ${activeCfg.glow})`,
                  transition: 'all 0.3s ease',
                }}>
                  {activeCfg.icon}
                </span>
              </div>
            </div>
          </div>

          <h2 style={{
            ...S.titulo,
            color: activeCfg.textColor,
            textAlign: 'center',
            transition: 'color 0.3s ease',
          }}>
            ¿Cómo quieres ver tu <span style={{ color: activeCfg.accent }}>interfaz?</span>
          </h2>
          
          <p style={{
            ...S.bajada,
            color: activeCfg.subColor,
            textAlign: 'center',
            transition: 'color 0.3s ease',
          }}>
            {activeCfg.desc}
          </p>

          {/* ─────────── 3 MINI MOCKUP UI CARDS (FIGMA LEVEL) ─────────── */}
          <div style={S.gridTemas}>
            {TEMAS.map((tKey) => {
              const cfg = THEME_DATA[tKey];
              const isSelected = theme === tKey;
              const m = cfg.mockup;

              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => seleccionarTema(tKey)}
                  style={{
                    ...S.themeCard,
                    borderColor: isSelected ? cfg.accent : theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                    background: isSelected
                      ? theme === 'light' ? '#FFFFFF' : 'rgba(255,255,255,0.06)'
                      : theme === 'light' ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)',
                    boxShadow: isSelected
                      ? `0 12px 28px rgba(0,0,0,0.25), 0 0 20px ${cfg.glow}`
                      : 'none',
                    transform: isSelected ? 'translateY(-3px)' : 'none',
                  }}
                >
                  {/* Miniature App Dashboard Screen */}
                  <div style={{
                    ...S.miniScreen,
                    background: m.bg,
                    borderColor: m.border,
                  }}>
                    {/* Top Window Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 6px', borderBottom: `1px solid ${m.border}` }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: '#FF5F56' }} />
                        <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: '#FFBD2E' }} />
                        <span style={{ width: 4.5, height: 4.5, borderRadius: '50%', background: '#27C93F' }} />
                      </div>
                      <div style={{ height: 4, width: 26, borderRadius: 99, background: m.border }} />
                    </div>

                    {/* Dashboard Layout Content */}
                    <div style={{ display: 'flex', flex: 1, padding: 5, gap: 5 }}>
                      {/* Mini Sidebar */}
                      <div style={{ width: 14, borderRadius: 4, background: m.sidebar, display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 2px', alignItems: 'center' }}>
                        <span style={{ width: 6, height: 3, borderRadius: 1, background: cfg.accent }} />
                        <span style={{ width: 6, height: 3, borderRadius: 1, background: m.border }} />
                        <span style={{ width: 6, height: 3, borderRadius: 1, background: m.border }} />
                      </div>

                      {/* Mini Workspace */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Mini Hero Card */}
                        <div style={{ background: m.card, borderRadius: 5, padding: 4, border: `1px solid ${m.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ width: 22, height: 3, borderRadius: 1, background: m.textPrimary }} />
                            <span style={{ width: 14, height: 4, borderRadius: 99, background: m.pillBg }} />
                          </div>
                          {/* Mini Bar Chart */}
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, marginTop: 4 }}>
                            <span style={{ width: 3, height: '40%', background: m.border, borderRadius: 1 }} />
                            <span style={{ width: 3, height: '70%', background: m.border, borderRadius: 1 }} />
                            <span style={{ width: 3, height: '100%', background: cfg.accent, borderRadius: 1 }} />
                            <span style={{ width: 3, height: '60%', background: m.border, borderRadius: 1 }} />
                            <span style={{ width: 3, height: '85%', background: cfg.accent, borderRadius: 1 }} />
                          </div>
                        </div>

                        {/* Mini Order Row */}
                        <div style={{ background: m.card, borderRadius: 4, padding: '3px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${m.border}` }}>
                          <span style={{ width: 16, height: 3, borderRadius: 1, background: m.textMuted }} />
                          <span style={{ width: 10, height: 3, borderRadius: 1, background: '#10B981' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Title & Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="ms" style={{ fontSize: 16, color: isSelected ? cfg.accent : activeCfg.subColor }}>
                        {cfg.icon}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: activeCfg.textColor }}>
                        {TEMA_INFO[tKey].nombre}
                      </span>
                    </div>

                    {/* Radio Check Circle */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: isSelected ? `2px solid ${cfg.accent}` : `1.5px solid ${theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'}`,
                      background: isSelected ? cfg.accent : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .2s ease',
                    }}>
                      {isSelected && (
                        <span className="ms" style={{ fontSize: 13, color: '#fff', fontWeight: 900 }}>check</span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 10.5, color: activeCfg.subColor, textAlign: 'left', marginTop: 3, lineHeight: 1.2 }}>
                    {cfg.tagline}
                  </div>
                </button>
              );
            })}
          </div>

        </div>

        {/* ─────────── PIE / BOTÓN DE ENTRADA ─────────── */}
        <footer style={{
          ...S.pie,
          borderTop: `1px solid ${theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'}`,
        }}>
          <button
            onClick={completar}
            disabled={guardando}
            className="md3-btn"
            style={{
              ...S.boton,
              background: activeCfg.accentGradient,
              boxShadow: `0 10px 24px ${activeCfg.glow}`,
              color: '#fff',
              fontWeight: 800,
            }}
          >
            {guardando ? 'Abriendo panel…' : 'Entrar al panel'}
            <span className="ms" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </footer>

      </section>
    </div>
  );
}

const S = {
  velo: {
    position: 'fixed', inset: 0, zIndex: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  hoja: {
    width: '100%', maxWidth: 520,
    borderRadius: 28,
    display: 'flex', flexDirection: 'column',
    maxHeight: '92dvh', overflow: 'hidden',
    border: '1px solid',
  },
  cabecera: {
    flex: 'none', padding: '18px 24px 14px',
  },
  cabeceraFila: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  paso: {
    fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em',
  },
  saltar: {
    fontSize: 12.5, fontWeight: 700,
    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  },
  cuerpo: {
    flex: 1, padding: '20px 24px 24px', overflowY: 'auto',
  },
  titulo: {
    margin: '0 0 6px', fontSize: 23, fontWeight: 800,
    fontFamily: 'var(--font-bricolage)', lineHeight: 1.18, letterSpacing: '-.025em',
  },
  bajada: {
    margin: '0 0 22px', fontSize: 13, lineHeight: 1.5,
  },

  gridTemas: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
  },
  themeCard: {
    position: 'relative', display: 'flex', flexDirection: 'column',
    padding: '10px 10px 12px', borderRadius: 20, border: '1.5px solid',
    cursor: 'pointer', textAlign: 'left', transition: 'all .25s ease',
  },
  miniScreen: {
    width: '100%', height: 74, borderRadius: 12, border: '1px solid',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  },

  pie: {
    flex: 'none', padding: '16px 24px 22px',
  },
  boton: {
    width: '100%', height: 50, borderRadius: 16,
    border: 'none', fontSize: 15, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all .2s ease',
  },
};
