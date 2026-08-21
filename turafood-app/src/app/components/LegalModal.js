'use client';

import { useEffect, useState } from 'react';

export default function LegalModal({ isOpen, initialTab = 'terminos', onClose }) {
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5, 4, 7, 0.82)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', animation: 'tfFadeIn .22s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <style>{`
        @keyframes tfFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes tfPopIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .legal-bento-card {
          transition: all 0.2s ease;
        }
        .legal-bento-card:hover {
          border-color: rgba(232, 199, 102, 0.35) !important;
          background: rgba(255, 255, 255, 0.04) !important;
          transform: translateY(-1px);
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 590, maxHeight: '88vh',
          background: 'linear-gradient(155deg, rgba(26, 24, 29, 0.98) 0%, rgba(12, 11, 14, 0.99) 100%)',
          backdropFilter: 'blur(45px) saturate(180%)',
          WebkitBackdropFilter: 'blur(45px) saturate(180%)',
          border: '1px solid rgba(232, 199, 102, 0.22)',
          borderRadius: 24,
          boxShadow: '0 35px 100px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 68, 31, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', animation: 'tfPopIn .28s cubic-bezier(0.16, 1, 0.3, 1) both',
          color: '#fff',
        }}
      >
        {/* Top Bar with Badge & Segmented Control */}
        <div style={{
          padding: '16px 20px 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {/* Segmented Control */}
          <div style={{
            display: 'flex', background: 'rgba(0, 0, 0, 0.4)',
            padding: 3, borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.08)',
            gap: 4,
          }}>
            <button
              onClick={() => setTab('terminos')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all .2s ease',
                background: tab === 'terminos' ? 'linear-gradient(135deg, rgba(232,199,102,0.22) 0%, rgba(255,68,31,0.18) 100%)' : 'transparent',
                color: tab === 'terminos' ? '#E8C766' : 'rgba(255, 255, 255, 0.6)',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: tab === 'terminos' ? 'rgba(232,199,102,0.35)' : 'transparent',
                boxShadow: tab === 'terminos' ? '0 2px 10px rgba(0, 0, 0, 0.3)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Términos SaaS
            </button>

            <button
              onClick={() => setTab('privacidad')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer', transition: 'all .2s ease',
                background: tab === 'privacidad' ? 'linear-gradient(135deg, rgba(17,178,106,0.22) 0%, rgba(96,165,250,0.18) 100%)' : 'transparent',
                color: tab === 'privacidad' ? '#11B26A' : 'rgba(255, 255, 255, 0.6)',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: tab === 'privacidad' ? 'rgba(17,178,106,0.35)' : 'transparent',
                boxShadow: tab === 'privacidad' ? '0 2px 10px rgba(0, 0, 0, 0.3)' : 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              Habeas Data & Privacidad
            </button>
          </div>

          {/* Close Button SVG */}
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255, 255, 255, 0.75)', cursor: 'pointer',
              transition: 'all .2s ease',
            }}
            aria-label="Cerrar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="sc" style={{
          padding: '20px 22px', overflowY: 'auto', flex: 1,
          fontSize: 13, lineHeight: 1.6, color: 'rgba(255, 255, 255, 0.85)',
        }}>
          {tab === 'terminos' ? (
            <div>
              {/* Header Title Section */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8C766', boxShadow: '0 0 8px #E8C766' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Licencia & Condiciones de Uso SaaS
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 20, fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                    Términos del Servicio Tura Food AI
                  </h2>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#E8C766',
                  background: 'rgba(232,199,102,0.12)', border: '1px solid rgba(232,199,102,0.25)',
                  padding: '3px 8px', borderRadius: 99, flexShrink: 0
                }}>
                  v2.0 · 2026
                </span>
              </div>

              {/* Bento Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                
                {/* Item 1 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(255, 68, 31, 0.15)',
                        border: '1px solid rgba(255, 68, 31, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                          <line x1="8" y1="21" x2="16" y2="21"></line>
                          <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        1. Naturaleza del Servicio (SaaS)
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.04em' }}>CLOUD IA</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    TuraFood AI es una suite tecnológica que provee a los comercios herramientas de software en la nube: catálogo interactivo, módulo de comandas en vivo, marketing automatizado y optimización de ventas mediante IA.
                  </p>
                </div>

                {/* Item 2 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(17, 178, 106, 0.15)',
                        border: '1px solid rgba(17, 178, 106, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#11B26A',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        2. Cero Comisiones en Ventas Directas
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#11B26A', letterSpacing: '0.04em' }}>100% PARA TI</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    El negocio conserva el 100% de los ingresos de sus pedidos procesados por WhatsApp, Nequi, Daviplata o transferencias directas. No intermediamos ni retenemos sus fondos.
                  </p>
                </div>

                {/* Item 3 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(96, 165, 250, 0.15)',
                        border: '1px solid rgba(96, 165, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60A5FA',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        3. Responsabilidad y Autonomía
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#60A5FA', letterSpacing: '0.04em' }}>COMERCIO</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Cada establecimiento es el único responsable de la calidad e inocuidad de sus productos, la fijación de sus precios, los tiempos de entrega y la atención al cliente final.
                  </p>
                </div>

                {/* Item 4 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(168, 85, 247, 0.15)',
                        border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#C084FC',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        4. Disponibilidad y Soporte Técnico
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#C084FC', letterSpacing: '0.04em' }}>99.9% SLA</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Garantizamos alta disponibilidad del sistema y asistencia técnica prioritaria a través de nuestros canales locales en Buenaventura.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Header Title Section */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#11B26A', boxShadow: '0 0 8px #11B26A' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#11B26A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Protección Legal de Datos · Colombia
                    </span>
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-bricolage)', fontSize: 20, fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.02em' }}>
                    Política de Tratamiento y Privacidad
                  </h2>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: '#11B26A',
                  background: 'rgba(17,178,106,0.12)', border: '1px solid rgba(17,178,106,0.25)',
                  padding: '3px 8px', borderRadius: 99, flexShrink: 0
                }}>
                  Ley 1581
                </span>
              </div>

              {/* Bento Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                
                {/* Item 1 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(17, 178, 106, 0.15)',
                        border: '1px solid rgba(17, 178, 106, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#11B26A',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        1. Confidencialidad y Propiedad Absoluta
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#11B26A', letterSpacing: '0.04em' }}>100% PRIVADO</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Los datos de su catálogo, inventarios, precios y clientes son de exclusiva propiedad de su negocio. Jamás vendemos, compartimos ni comercializamos su información comercial con terceros.
                  </p>
                </div>

                {/* Item 2 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(232, 199, 102, 0.15)',
                        border: '1px solid rgba(232, 199, 102, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--gold)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        2. Uso Exclusivamente Operativo
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.04em' }}>GESTIÓN</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    La información se emplea únicamente para procesar comandas, enviar notificaciones operativas y entregar métricas de rendimiento y sugerencias de Tura IA.
                  </p>
                </div>

                {/* Item 3 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(96, 165, 250, 0.15)',
                        border: '1px solid rgba(96, 165, 250, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60A5FA',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        3. Cifrado y Seguridad Bancaria
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#60A5FA', letterSpacing: '0.04em' }}>SSL / RLS</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Todas las conexiones están cifradas con protocolos SSL/TLS y aislamiento a nivel de fila (Row Level Security) para blindar sus registros.
                  </p>
                </div>

                {/* Item 4 */}
                <div className="legal-bento-card" style={{
                  background: 'rgba(255, 255, 255, 0.025)', padding: '14px 16px',
                  borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.07)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 8, background: 'rgba(255, 68, 31, 0.15)',
                        border: '1px solid rgba(255, 68, 31, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary)',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </span>
                      <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>
                        4. Derechos del Titular (Habeas Data)
                      </span>
                    </div>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.04em' }}>ARCO</span>
                  </div>
                  <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.72)', fontSize: 12.5, lineHeight: 1.55 }}>
                    Usted puede conocer, rectificar o eliminar cualquier dato de su cuenta en cualquier momento directamente desde su panel de control.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11.5, color: '#E8C766', fontWeight: 800, letterSpacing: '0.04em' }}>
              PA´ TURÍN CON AMOR ❤️
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', fontWeight: 500 }}>
              · Buenaventura
            </span>
          </div>
          
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 22px', borderRadius: 12,
              background: 'linear-gradient(145deg, #FF5B2E, #E2360F)',
              color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(255, 68, 31, 0.4)',
              transition: 'transform 0.15s ease, filter 0.15s ease',
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
