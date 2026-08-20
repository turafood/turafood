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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isConfigured } from '@/utils/supabase/client';
import { probarComo } from '@/lib/sesion';
import Arranque from '../components/Arranque';
import { PREGUNTAS_NEGOCIO, PREGUNTAS_REPARTIDOR } from '../components/preguntasArranque';
import { guardarArranque } from '@/lib/arranque';

import HeroBackdrop from '../components/HeroBackdrop';

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
    <div style={{...S.page, background: 'var(--night)', color: '#fff'}}>
      {/* Background gradients similar to landing */}
      <div style={{position: 'absolute', right: '-10%', top: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,68,31,0.12), transparent 60%)', pointerEvents: 'none'}} />
      <div style={{position: 'absolute', left: '-10%', bottom: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,199,102,0.1), transparent 60%)', pointerEvents: 'none'}} />

      <HeroBackdrop brightness={0.08} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          {/* Floating badges animation */}
          <div className="tf-hide-sm" style={{position: 'absolute', left: -40, top: 80, animation: 'tffloat 5s ease-in-out infinite', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '12px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 11}}>
             <div style={{width: 38, height: 38, borderRadius: 11, background: 'rgba(17,178,106,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span className="ms" style={{fontSize: 21, color: 'var(--green)'}}>event_available</span></div>
             <div><div style={{fontSize: 13, fontWeight: 800, color: 'var(--text)'}}>Nueva reserva</div><div style={{fontSize: 11.5, color: 'var(--muted)', marginTop: 1}}>Mesa 4 · 8:30 PM</div></div>
          </div>
          <div className="tf-hide-sm" style={{position: 'absolute', right: -60, top: 40, animation: 'tffloat 6s ease-in-out infinite .8s', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 17, padding: '12px 14px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 11}}>
             <div style={{width: 38, height: 38, borderRadius: 11, background: 'rgba(255,68,31,.13)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span className="ms" style={{fontSize: 21, color: 'var(--primary)'}}>support_agent</span></div>
             <div><div style={{fontSize: 13, fontWeight: 800, color: 'var(--text)'}}>Voice AI atendió</div><div style={{fontSize: 11.5, color: 'var(--muted)', marginTop: 1}}>Llamada · reserva creada</div></div>
          </div>

          <div style={{...S.brand, position: 'relative', zIndex: 10}}>
            <span style={{...S.logo, boxShadow: '0 8px 20px rgba(255,68,31,.3)'}}>t</span>
            <span>
              <span style={{...S.brandName, color: '#fff'}}>Tura Food <span className="tf-serif" style={{color: 'var(--primary)'}}>AI</span></span>
              <span style={{...S.brandKicker, color: 'var(--gold)', letterSpacing: '0.12em'}}>BUSINESS SUITE</span>
            </span>
          </div>

          {/* Imagen Premium Flotante (Hero Asset del usuario) */}
          <div style={{ position: 'relative', zIndex: 5, marginTop: 12, marginBottom: -12, display: 'flex', justifyContent: 'center', animation: 'tffloat 7s ease-in-out infinite' }}>
            <div style={{
              width: 300, height: 380,
              background: 'url(/burger_new.png) center/cover',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              opacity: 0.95
            }} />
          </div>

          <h1 style={{...S.title, color: '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 10, position: 'relative', lineHeight: 1.05}}>
            Todo el puerto <br />en una sola <span className="tf-serif tf-gold-text" style={{fontWeight: 400}}>APP.</span>
          </h1>
          <p style={{...S.subtitle, color: 'rgba(255,255,255,0.7)', zIndex: 10, position: 'relative'}}>
            La tecnología que necesitas para digitalizar tu negocio, recibir órdenes y organizar tus propios domiciliarios. Sin comisiones abusivas.
          </p>

          <div style={{...S.opciones, zIndex: 10, position: 'relative'}}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => entrar(r)}
                disabled={Boolean(busy)}
                className="entrar-op tf-card"
                style={{ ...S.opcion, opacity: busy && busy !== r.id ? 0.45 : 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span style={{ ...S.opcionIcono, background: `linear-gradient(145deg, #FF7A4D, #E2360F)`, color: '#fff', boxShadow: '0 8px 20px rgba(255,68,31,0.3)' }}>
                  <span className="ms" style={{ fontSize: 25, color: '#fff' }}>{r.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={{...S.opcionTitulo, color: '#fff'}}>
                    {busy === r.id ? 'Abriendo…' : r.titulo}
                  </span>
                  <span style={S.opcionDetalle}>{r.detalle}</span>
                </span>
                <span className="ms" style={{ fontSize: 21, color: 'rgba(255,255,255,.4)', flex: 'none' }}>
                  arrow_forward
                </span>
              </button>
            ))}
          </div>

          {error && (
            <div style={S.alert}>
              <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <p style={S.nota}>
            Digitaliza tu negocio de una. Podrás vincular a tus propios repartidores y el dinero siempre irá directo a tus cuentas.
          </p>

          <div style={S.pie}>
            <span style={S.pieTexto}>¿Ya tienes cuenta?</span>
            <Link href="/auth" style={S.pieEnlace}>Inicia sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * LA ESPERA (ULTRA PRO)
 *
 * Reemplazamos los pasos simples por "mejor información" tecnológica y
 * un diseño estilo terminal/app premium para que la espera de 2-3s
 * se sienta como que un sistema avanzado está arrancando.
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

  return (
    <div style={T.page}>
      {/* Fondo PRO oscuro con malla de puntos sutil */}
      <div style={T.gridBg} />

      <div style={T.center}>
        <div style={{ ...T.card, overflow: 'hidden' }}>
          {/* Imagen Hero flotante incrustada con máscara suave */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '100%', height: 160,
              background: 'url(/burger_new.png) center/cover',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              maskImage: 'radial-gradient(ellipse at center, black 65%, transparent 100%)',
              opacity: 0.95
            }} />
          </div>

          <div style={{ ...T.cardHeader, position: 'relative', zIndex: 1, padding: '0 24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: -20 }}>
            <div style={{ ...T.orbContainer, marginBottom: 12 }}>
              <div style={{ ...T.orbPulse, background: rol?.accent ?? '#FF7A4D' }} className="pro-pulse" />
              <div style={{ ...T.orbSolid, background: rol?.accent ?? '#FF7A4D' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...T.marca, textAlign: 'center' }}>Tura Food <span className="tf-serif tf-gold-text">AI</span></div>
              <div style={{ ...T.rolTexto, textAlign: 'center', marginTop: 4 }}>
                todo el puerto en una sola APP
              </div>
            </div>
          </div>

          <div style={T.pasos}>
            {PASOS.map((p, i) => {
              const hecho = i < actual;
              const activo = i === actual;
              return (
                <div key={p.id} style={{ ...T.paso, opacity: i > actual ? 0.3 : 1 }}>
                  <div style={{
                    ...T.terminalLine,
                    background: activo ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.2)',
                    borderColor: activo ? 'rgba(255,255,255,0.1)' : 'transparent',
                    boxShadow: activo ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
                  }}>
                    <span style={{ 
                      color: hecho ? (rol?.accent ?? '#FF7A4D') : activo ? '#fff' : 'transparent',
                      fontFamily: 'monospace', fontSize: 14, minWidth: 20,
                      animation: activo ? 'blink 1s infinite' : 'none',
                      textShadow: hecho ? `0 0 10px ${rol?.accent ?? '#FF7A4D'}88` : 'none'
                    }}>
                      {hecho ? '✓' : '>'}
                    </span>
                    <span style={{ 
                      fontSize: 13.5, 
                      fontWeight: activo ? 800 : 600,
                      color: activo ? '#fff' : (hecho ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'),
                      fontFamily: 'var(--font-jakarta)',
                      letterSpacing: '0.02em'
                    }}>
                      {p.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={T.barra}>
            <span
              style={{
                ...T.barraRelleno,
                width: `${((actual + 1) / PASOS.length) * 100}%`,
                background: rol?.accent ?? '#FF7A4D',
                boxShadow: `0 0 10px ${rol?.accent ?? '#FF7A4D'}88`,
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
    position: 'relative', minHeight: '100dvh', background: '#040302', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  gridBg: {
    position: 'absolute', inset: 0, opacity: 0.08,
    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
    backgroundSize: '24px 24px',
    pointerEvents: 'none',
  },
  center: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: 360,
    animation: 'up .4s cubic-bezier(0.16, 1, 0.3, 1) both',
  },
  card: {
    background: 'linear-gradient(145deg, rgba(30,30,30,0.8) 0%, rgba(15,15,15,0.95) 100%)', 
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 28, padding: 36,
    boxShadow: '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32,
  },
  orbContainer: {
    position: 'relative', width: 44, height: 44, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.03)', borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  orbPulse: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    animation: 'pro-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
  },
  orbSolid: {
    position: 'relative', width: 12, height: 12, borderRadius: '50%', zIndex: 2,
    boxShadow: '0 0 16px rgba(255,255,255,0.8)',
  },
  marca: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22,
    letterSpacing: '-.02em', color: '#fff',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
  },
  rolTexto: { 
    fontSize: 12.5, color: 'rgba(255,255,255,.7)', marginTop: 4, 
    fontFamily: 'monospace', letterSpacing: '0.05em' 
  },
  pasos: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  paso: { 
    transition: 'opacity .4s ease, transform .4s ease',
  },
  terminalLine: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '16px 18px', borderRadius: 16,
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  barra: {
    height: 6, borderRadius: 99, background: 'rgba(255,255,255,.06)',
    overflow: 'hidden', marginTop: 36,
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    transition: 'width .6s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 0 10px rgba(255,255,255,0.3)',
  },
};

const S = {
  page: { position: 'relative', minHeight: '100dvh', background: '#080706', color: '#fff' },
  scroller: {
    position: 'relative', zIndex: 2, minHeight: '100dvh', maxHeight: '100dvh',
    overflowY: 'auto', display: 'flex',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 430, padding: '36px 22px 30px' },

  brand: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 30 },
  logo: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22,
    boxShadow: '0 6px 18px rgba(255,68,31,.45)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 18, letterSpacing: '-.02em', lineHeight: 1.1,
  },
  brandKicker: {
    display: 'block', fontSize: 9.5, fontWeight: 800, letterSpacing: '.11em',
    color: 'rgba(255,255,255,.42)', marginTop: 3,
  },

  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 'clamp(30px, 8vw, 38px)', lineHeight: 1.08,
    letterSpacing: '-.035em', textWrap: 'balance',
  },
  subtitle: {
    margin: '13px 0 0', fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.62)',
  },

  opciones: { display: 'flex', flexDirection: 'column', gap: 11, marginTop: 28 },
  opcion: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 16,
    borderRadius: 20,
    background: 'rgba(255,255,255,.06)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,.13)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    color: '#fff',
    transition: 'all 0.3s ease',
  },
  opcionIcono: {
    width: 50, height: 50, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  opcionTitulo: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 16.5, letterSpacing: '-.01em',
  },
  opcionDetalle: {
    display: 'block', fontSize: 12, color: 'rgba(255,255,255,.55)',
    marginTop: 3, lineHeight: 1.4,
  },

  nota: { margin: '20px 0 0', fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,.45)' },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 13, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.32)', color: '#FFC7BA',
    fontSize: 12.5, fontWeight: 600, lineHeight: 1.45,
  },
  pie: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.1)',
    flexWrap: 'wrap',
  },
  pieTexto: { fontSize: 13.5, color: 'rgba(255,255,255,.5)' },
  pieEnlace: { fontSize: 13.5, fontWeight: 700, color: '#fff', textDecoration: 'none' },
};
