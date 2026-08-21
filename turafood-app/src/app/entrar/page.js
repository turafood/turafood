'use client';

/**
 * LA PUERTA, SIN PUERTA
 *
 * Quien llega a app.turafood.com no viene a registrarse: viene a ver
 * si esto le sirve. Pedirle una cuenta antes de dejarlo entrar es
 * pedirle fe, y nadie tiene fe en una app que todavía no ha visto.
 *
 * Así que esto no es un formulario. Son dos botones: qué eres. Se toca
 * uno y ya está adentro, con una sesión anónima que desde la base es un
 * usuario como cualquier otro — su catálogo es suyo y nadie más lo ve.
 *
 * Puede trabajar de verdad: cargar el menú, recibir pedidos, cobrar. El
 * tope de 20 pedidos diarios que la base le impone a quien no está
 * verificado es la única diferencia, y se quita subiendo los papeles.
 *
 * El acceso con cuenta está abajo, para quien ya tiene una.
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isConfigured } from '@/utils/supabase/client';
import { probarComo } from '@/lib/sesion';
import Arranque from '../components/Arranque';
import { PREGUNTAS_NEGOCIO, PREGUNTAS_REPARTIDOR } from '../components/preguntasArranque';
import { guardarArranque } from '@/lib/arranque';
import HeroBackdrop from '../components/HeroBackdrop';
import LegalModal from '../components/LegalModal';

const ROLES = [
  {
    id: 'business',
    icon: 'storefront',
    titulo: 'Acceso para Negocios',
    detalle: 'Ingresa al panel de control de tu restaurante o tienda',
    accent: '#FF7A4D',
    destino: '/negocio',
  }
];

export default function EntrarPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(null);
  const [paso, setPaso] = useState(null);
  const [error, setError] = useState(null);
  const [pregunta, setPregunta] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // 'terminos' | 'privacidad' | null
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Cuando la sesión ya está lista pero antes de entrar al panel, se
  // pregunta. En este punto la persona YA está adentro: si cierra o
  // salta, entra igual — solo pierde que le armemos el panel a su
  // medida.
  const [preguntando, setPreguntando] = useState(null);
  const [guardandoArranque, setGuardandoArranque] = useState(false);

  // Lo que contestó, para que la escena de preparación se adapte a su
  // nicho: quien puso pizzería ve el horno, no una olla genérica.
  const [preparando, setPreparando] = useState(null);

  const entrar = async (rol) => {
    setError(null);
    if (!isConfigured()) {
      router.replace(rol.destino);
      return;
    }
    setPreguntando(rol.id);
  };

  const saltarArranque = async () => {
    const rolActual = preguntando;
    setPreguntando(null);
    setBusy(rolActual);
    setPaso('sesion');
    try {
      const user = await probarComo(rolActual, setPaso);
      if (!user) throw new Error('No se pudo abrir la sesión. Inténtalo de nuevo.');
      entrarAlPanel(rolActual);
    } catch (err) {
      setError(err.message);
      setBusy(null);
      setPaso(null);
    }
  };

  const terminarArranque = async (respuestas) => {
    const rolActual = preguntando;
    setGuardandoArranque(true);
    setPreparando({ nicho: rolActual === 'business' ? respuestas.nicho : 'repartidor' });
    setPreguntando(null);
    setBusy(rolActual);
    setPaso('sesion');

    try {
      const user = await probarComo(rolActual, setPaso);
      if (!user) throw new Error('No se pudo abrir la sesión.');
      
      const minimo = new Promise((r) => setTimeout(r, 1200));
      await Promise.all([guardarArranque(rolActual, respuestas), minimo]);
      entrarAlPanel(rolActual);
    } catch (err) {
      setError(err.message);
      setBusy(null);
      setPaso(null);
      setPreparando(null);
    }
  };

  const entrarAlPanel = (rolId) => {
    const destino = rolId === 'business' ? '/negocio' : '/repartidor';
    router.replace(destino);
  };

  if (preguntando) {
    return (
      <>
        <div style={S.page}>
          <HeroBackdrop brightness={0.18} />
        </div>
        <Arranque
          preguntas={preguntando === 'business' ? PREGUNTAS_NEGOCIO : PREGUNTAS_REPARTIDOR}
          onListo={terminarArranque}
          onSaltar={saltarArranque}
          guardando={guardandoArranque}
        />
      </>
    );
  }

  // Mientras se abre la sesión, la pantalla completa. No es un adorno:
  // crear la cuenta y su ficha toma un par de segundos, y dos segundos
  // sin nada en pantalla se leen como que la app se colgó.
  if (busy) {
    const rol = ROLES.find((r) => r.id === busy);
    return <Abriendo rol={rol} paso={paso} nicho={preparando?.nicho} />;
  }

  return (
    <div style={{
      ...S.page,
      background: 'radial-gradient(100% 60% at 50% 10%, #171519 0%, #0E0D10 50%, #080709 100%)',
      color: '#fff'
    }}>
      {/* Subtle Warm Ambient Glows */}
      <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', width: 640, height: 280, background: 'radial-gradient(ellipse at top, rgba(232,199,102,0.06) 0%, rgba(255,68,31,0.03) 40%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '15%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,77,0.04), transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: '-10%', bottom: '5%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(17,178,106,0.03), transparent 65%)', pointerEvents: 'none' }} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          
          {/* Top Brand & Platform Pill (Clean & Spacious) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 10, marginBottom: 6 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 16px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 99,
              border: '1px solid rgba(255,255,255,0.08)', marginBottom: 8,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#11B26A', boxShadow: '0 0 8px #11B26A' }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.85)' }}>
                La plataforma de IA para tu Negocio
              </span>
            </div>

            <div style={S.brand}>
              <span style={{...S.logo, boxShadow: '0 6px 20px rgba(255,68,31,.4)'}}>t</span>
              <span>
                <span style={{...S.brandName, color: '#fff'}}>Tura Food <span className="tf-serif" style={{color: 'var(--primary)'}}>AI</span></span>
                <span style={{...S.brandKicker, color: 'var(--gold)', letterSpacing: '0.12em'}}>MKT PARA NEGOCIOS LOCALES</span>
              </span>
            </div>
          </div>

          {/* Hero Seamless Video (Turafood AI - VIDEO) */}
          <div style={{ position: 'relative', zIndex: 5, marginTop: -2, marginBottom: 4, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{
              position: 'relative',
              width: 'min(350px, 84vw)',
              height: 'min(210px, 26vh)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 42%, rgba(0,0,0,0.75) 62%, transparent 95%)',
              maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 42%, rgba(0,0,0,0.75) 62%, transparent 95%)',
            }}>
              {/* Soft Ambient Core Flare */}
              <div style={{
                position: 'absolute', inset: -10,
                background: 'radial-gradient(circle at center, rgba(232, 199, 102, 0.08) 0%, rgba(255, 122, 77, 0.05) 50%, transparent 70%)',
                filter: 'blur(24px)',
                pointerEvents: 'none',
              }} />

              {/* Video Element */}
              <video
                ref={videoRef}
                src="/turafood-ai-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                controls={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <source src="/turafood-ai-video.mp4" type="video/mp4" />
                <source src="/turafood-video-onboarding.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* Value Prop Badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#E8C766', background: 'rgba(232,199,102,0.12)', border: '1px solid rgba(232,199,102,0.25)', padding: '2px 8px', borderRadius: 99 }}>
              🔥 Más pedidos & ventas
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#11B26A', background: 'rgba(17,178,106,0.12)', border: '1px solid rgba(17,178,106,0.25)', padding: '2px 8px', borderRadius: 99 }}>
              ⚡ 0% Comisiones
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#60A5FA', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', padding: '2px 8px', borderRadius: 99 }}>
              🇨🇴 Buenaventura
            </span>
          </div>

          {/* Persuasive Main Headline */}
          <h1 style={{...S.title, color: '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 10, position: 'relative', textAlign: 'center'}}>
            Tu competencia ya está online. <span className="tf-serif tf-gold-text" style={{fontWeight: 400, fontStyle: 'italic'}}>¿Y tú?</span>
          </h1>
          <p style={{...S.subtitle, color: 'rgba(255,255,255,0.72)', zIndex: 10, position: 'relative', textAlign: 'center', marginBottom: 12}}>
            Crea tu cuenta gratis hoy y ten tu negocio digital funcionando en minutos.
          </p>

          {/* Integrated Apple/Notion Glass Scarcity & CTA Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', position: 'relative', zIndex: 10 }}>
            
            {/* Apple Minimalist Glass Counter Bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 14, padding: '7px 12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF441F', boxShadow: '0 0 6px #FF441F', animation: 'pro-pulse 1.5s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  Solo quedan <span style={{ color: '#E8C766', fontWeight: 900 }}>49 plazas</span> de 100
                </span>
              </div>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: '#11B26A', background: 'rgba(17,178,106,0.15)', padding: '2px 7px', borderRadius: 99, border: '1px solid rgba(17,178,106,0.25)', letterSpacing: '0.04em' }}>
                SIEMPRE GRATIS
              </span>
            </div>

            {/* CTA Button */}
            <div style={S.opciones}>
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => entrar(r)}
                  disabled={Boolean(busy)}
                  className="entrar-op tf-card"
                  style={{
                    ...S.opcion,
                    opacity: busy && busy !== r.id ? 0.45 : 1,
                    background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(232, 199, 102, 0.25)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <span style={{
                    ...S.opcionIcono,
                    background: `linear-gradient(145deg, #FF5B2E, #E2360F)`,
                    color: '#fff',
                    boxShadow: '0 8px 22px rgba(255,68,31,0.45)'
                  }}>
                    <span className="ms" style={{ fontSize: 24, color: '#fff' }}>{r.icon}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{...S.opcionTitulo, color: '#fff', display: 'flex', alignItems: 'center', gap: 6}}>
                      {busy === r.id ? 'Abriendo panel…' : r.titulo}
                      <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(232,199,102,0.2)', color: '#E8C766', borderRadius: 99, fontWeight: 700 }}>GRATIS</span>
                    </span>
                    <span style={{...S.opcionDetalle, color: 'rgba(255,255,255,0.6)'}}>{r.detalle}</span>
                  </span>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--gold)', flex: 'none', transform: 'translateX(0)', transition: 'transform .2s' }}>
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={S.alert}>
              <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Social Proof & Porteño Tag Strip */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 10, padding: '6px 12px', background: 'rgba(255,255,255,0.02)',
            borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 10.5, color: '#E8C766', fontWeight: 800, letterSpacing: '0.04em' }}>
              PA´ TURÍN CON AMOR ❤️
            </span>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              · ★★★★★ 4.9 · 100% de la venta para ti
            </span>
          </div>

          <div style={S.pie}>
            <span style={S.pieTexto}>¿Ya tienes cuenta activa?</span>
            <Link href="/auth" style={S.pieEnlace}>Inicia sesión</Link>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.35)', position: 'relative', zIndex: 10 }}>
            Al registrarte aceptas los{' '}
            <button type="button" onClick={() => setLegalModal('terminos')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}>
              Términos SaaS
            </button>
            {' '}y la{' '}
            <button type="button" onClick={() => setLegalModal('privacidad')} style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.65)', textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}>
              Política de Privacidad
            </button>.
          </div>

          <LegalModal
            isOpen={Boolean(legalModal)}
            initialTab={legalModal || 'terminos'}
            onClose={() => setLegalModal(null)}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * LA ESPERA (ULTRA PRO - JOTSY STYLE BENTO)
 *
 * Diseño Bento horizontal ultra compacto para encajar al 100% en pantalla
 * con métricas en tiempo real y animación del avatar sin cortes.
 */
const getPasosAbriendo = (nicho) => {
  if (nicho === 'comidas') {
    return [
      { id: 'sesion',   label: 'Creando tu perfil seguro' },
      { id: 'ficha',    label: 'Preparando tu restaurante' },
      { id: 'menu',     label: 'Alistando tu menú y recetas' },
      { id: 'comandas', label: 'Configurando el panel de comandas' },
      { id: 'listo',    label: 'Todo listo para recibir pedidos' },
    ];
  }
  if (nicho === 'mercado') {
    return [
      { id: 'sesion',   label: 'Creando tu perfil seguro' },
      { id: 'ficha',    label: 'Preparando tu supermercado' },
      { id: 'menu',     label: 'Cargando inventario base' },
      { id: 'comandas', label: 'Alistando el panel de control' },
      { id: 'listo',    label: 'Todo listo para arrancar' },
    ];
  }
  return [
    { id: 'sesion',   label: 'Creando tu perfil seguro' },
    { id: 'ficha',    label: 'Configurando tu entorno de trabajo' },
    { id: 'menu',     label: 'Asignando recursos a tu cuenta' },
    { id: 'comandas', label: 'Alistando el panel de control' },
    { id: 'listo',    label: 'Todo listo para arrancar' },
  ];
};

function Abriendo({ rol, paso, nicho }) {
  const PASOS = getPasosAbriendo(nicho);
  const actual = Math.max(PASOS.findIndex((p) => p.id === paso), 0);
  const progresoPct = Math.round(((actual + 1) / PASOS.length) * 100);

  return (
    <div style={T.page}>
      {/* Fondo PRO oscuro con malla de puntos sutil */}
      <div style={T.gridBg} />

      <div style={T.center}>
        <div style={{ ...T.card, overflow: 'hidden' }}>
          
          {/* Top Bento Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ ...S.logo, width: 32, height: 32, fontSize: 18 }}>t</span>
              <div>
                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16, color: '#fff', lineHeight: 1.1 }}>
                  Tura Food <span className="tf-serif tf-gold-text">AI</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#E8C766', fontWeight: 700, letterSpacing: '0.06em' }}>
                  PA´ TURÍN CON AMOR ❤️
                </div>
              </div>
            </div>

            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', background: 'rgba(17,178,106,0.14)',
              border: '1px solid rgba(17,178,106,0.3)', borderRadius: 99,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#11B26A', boxShadow: '0 0 6px #11B26A' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#11B26A' }}>{progresoPct}% LISTO</span>
            </div>
          </div>

          {/* Main Horizontal Content Split */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Left: Animated Video Avatar with seamless blending */}
            <div style={{
              flex: '1 1 180px',
              maxWidth: 220,
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              margin: '0 auto',
              overflow: 'hidden',
              WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 45%, rgba(0,0,0,0.8) 65%, transparent 96%)',
              maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, black 45%, rgba(0,0,0,0.8) 65%, transparent 96%)',
            }}>
              <video
                src="/turafood-ai-video.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <source src="/turafood-ai-video.mp4" type="video/mp4" />
                <source src="/turafood-video-onboarding.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Right: Interactive High-Tech Steps */}
            <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                ¡Todo listo para arrancar! 👋
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>
                Configurando tus comandas y conectando la red de domicilios de Buenaventura.
              </div>

              <div style={T.pasos}>
                {PASOS.map((p, i) => {
                  const hecho = i < actual;
                  const activo = i === actual;
                  return (
                    <div key={p.id} style={{ ...T.paso, opacity: i > actual ? 0.35 : 1 }}>
                      <div style={{
                        ...T.terminalLine,
                        background: activo ? 'rgba(232,199,102,0.1)' : 'rgba(0,0,0,0.25)',
                        borderColor: activo ? 'rgba(232,199,102,0.3)' : 'transparent',
                        padding: '6px 10px',
                      }}>
                        <span style={{ 
                          color: hecho ? '#11B26A' : activo ? '#E8C766' : 'transparent',
                          fontFamily: 'monospace', fontSize: 13, minWidth: 16,
                          animation: activo ? 'blink 1s infinite' : 'none',
                        }}>
                          {hecho ? '✓' : '>'}
                        </span>
                        <span style={{ 
                          fontSize: 12, 
                          fontWeight: activo ? 800 : 600,
                          color: activo ? '#fff' : (hecho ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)'),
                          fontFamily: 'var(--font-jakarta)',
                        }}>
                          {p.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Glowing Animated Progress Bar */}
          <div style={{ ...T.barra, marginTop: 14 }}>
            <span
              style={{
                ...T.barraRelleno,
                width: `${progresoPct}%`,
                background: 'linear-gradient(90deg, #FF7A4D, #E8C766, #11B26A)',
                boxShadow: '0 0 12px rgba(232,199,102,0.6)',
              }}
            />
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pro-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
}

const T = {
  page: {
    position: 'fixed', inset: 0, width: '100vw', height: '100vh',
    background: 'radial-gradient(100% 60% at 50% 20%, #151417 0%, #0D0C0F 55%, #070608 100%)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    overflow: 'hidden',
  },
  gridBg: {
    position: 'absolute', inset: 0, opacity: 0.08,
    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  center: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: 580,
    animation: 'up .4s cubic-bezier(0.16, 1, 0.3, 1) both',
  },
  card: {
    background: 'linear-gradient(145deg, #161518 0%, #0E0D10 100%)', 
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(232,199,102,0.2)', borderRadius: 24, padding: '20px 24px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
  },
  orbContainer: {
    position: 'relative', width: 38, height: 38, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.03)', borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  orbPulse: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    animation: 'pro-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
  },
  orbSolid: {
    position: 'relative', width: 10, height: 10, borderRadius: '50%', zIndex: 2,
    boxShadow: '0 0 14px rgba(255,255,255,0.8)',
  },
  marca: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    letterSpacing: '-.02em', color: '#fff',
  },
  rolTexto: { 
    fontSize: 11.5, color: 'rgba(255,255,255,.7)', marginTop: 2, 
    fontFamily: 'monospace', letterSpacing: '0.05em' 
  },
  pasos: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  paso: { 
    transition: 'opacity .4s ease, transform .4s ease',
  },
  terminalLine: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 12,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.3s ease',
  },
  barra: {
    height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99,
    overflow: 'hidden', marginTop: 14,
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    transition: 'width .5s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 0 10px rgba(255,255,255,0.3)',
  },
};

const S = {
  page: { position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#0F0E11', color: '#fff', overflow: 'hidden' },
  scroller: {
    position: 'relative', zIndex: 2, width: '100%', height: '100%',
    overflowY: 'auto', display: 'flex', flexDirection: 'column',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 410, padding: '14px 20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },

  brand: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  logo: {
    width: 34, height: 34, borderRadius: 10, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20,
    boxShadow: '0 4px 14px rgba(255,68,31,.45)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16.5, letterSpacing: '-.02em', lineHeight: 1.1,
  },
  brandKicker: {
    display: 'block', fontSize: 9, fontWeight: 800, letterSpacing: '.11em',
    color: 'rgba(255,255,255,.42)', marginTop: 2,
  },

  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 'clamp(24px, 5.5vw, 30px)', lineHeight: 1.1,
    letterSpacing: '-.03em', textWrap: 'balance',
  },
  subtitle: {
    margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.45, color: 'rgba(255,255,255,.62)',
  },

  opciones: { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 14px',
    borderRadius: 18,
    background: 'rgba(255,255,255,.05)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,.11)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  opcionIcono: {
    width: 44, height: 44, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  opcionTitulo: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 15.5, letterSpacing: '-.01em',
  },
  opcionDetalle: {
    display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.55)',
    marginTop: 2, lineHeight: 1.35,
  },

  nota: { margin: '10px 0 0', fontSize: 11, lineHeight: 1.45, color: 'rgba(255,255,255,.45)' },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 12, padding: '10px 12px',
    borderRadius: 12, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.32)', color: '#FFC7BA',
    fontSize: 12, fontWeight: 600, lineHeight: 1.4,
  },
  pie: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.08)',
    flexWrap: 'wrap',
  },
  pieTexto: { fontSize: 12, color: 'rgba(255,255,255,.5)' },
  pieEnlace: { fontSize: 12, fontWeight: 800, color: 'var(--primary)' },
};
