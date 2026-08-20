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
import PreparandoPanel from '../components/PreparandoPanel';
import HeroBackdrop from '../components/HeroBackdrop';

const ROLES = [
  {
    id: 'business',
    icon: 'storefront',
    titulo: 'Tengo un negocio',
    detalle: 'Comida, mercado, farmacia o licores',
    accent: '#FF7A4D',
    destino: '/negocio',
  },
  {
    id: 'courier',
    icon: 'two_wheeler',
    titulo: 'Quiero repartir',
    detalle: 'Entregar pedidos en moto, bici o carro',
    accent: '#4C8DFF',
    destino: '/repartidor',
  },
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
      // Sin base, el panel corre con los datos de la maqueta
      router.replace(rol.destino);
      return;
    }

    setBusy(rol.id);
    setPaso('sesion');
    try {
      const user = await probarComo(rol.id, setPaso);
      if (!user) {
        throw new Error('No se pudo abrir la sesión. Entra con tu cuenta o inténtalo de nuevo.');
      }
      // En vez de entrar derecho, seis preguntas cortas. La sesión ya
      // existe, así que esto no es un muro: es afinar el panel que ya
      // es suyo.
      setPreguntando(rol.id);
      setBusy(null);
      setPaso(null);
    } catch (err) {
      setError(err.message);
      setBusy(null);
      setPaso(null);
    }
  };

  /**
   * Guarda y entra. Si falla el guardado, entra igual.
   *
   * La escena de preparación se muestra un mínimo de 2,2 s aunque el
   * guardado termine antes. Suena raro alargar una espera a propósito,
   * pero un fogonazo de 300 ms que aparece y desaparece se siente como
   * un parpadeo roto; dos segundos con algo que mirar se sienten como
   * que la app está haciendo su trabajo.
   */
  const terminarArranque = async (respuestas) => {
    setGuardandoArranque(true);
    setPreparando({
      nicho: preguntando === 'business' ? respuestas.nicho : 'repartidor',
    });

    // Subimos el tiempo mínimo a 2,8s para que tengan el tiempo
    // de apreciar el nuevo "Motion Graphic PRO" que implementamos.
    // Antes estaba en 1,1s y parpadeaba muy rápido.
    const minimo = new Promise((r) => setTimeout(r, 2800));

    try {
      await Promise.all([guardarArranque(preguntando, respuestas), minimo]);
    } catch {
      await minimo;
    }
    entrarAlPanel();
  };

  const entrarAlPanel = () => {
    // Directo a su panel.
    const destino = preguntando === 'business' ? '/negocio' : '/repartidor';

    // No limpiamos el estado (setPreparando(null)).
    // Si lo hacemos, React desmonta el loader inmediatamente y el usuario
    // ve la pantalla de login de nuevo por un segundo mientras Next.js
    // navega a la siguiente ruta. Al cambiar de ruta, la página entera
    // se desmontará sola de todas formas.
    router.replace(destino);
  };

  if (preparando) {
    return (
      <PreparandoPanel
        nicho={preparando.nicho}
        pasos={preguntando === 'business'
          ? ['Compilando preferencias de inventario',
             'Inyectando base de datos de prueba',
             'Generando entorno virtual aislado',
             'Desplegando módulos analíticos']
          : ['Registrando zona de cobertura',
             'Mapeando coordenadas locales',
             'Desplegando enrutador en vivo']}
      />
    );
  }

  if (preguntando) {
    return (
      <>
        <div style={S.page}>
          <HeroBackdrop brightness={0.18} />
        </div>
        <Arranque
          preguntas={preguntando === 'business' ? PREGUNTAS_NEGOCIO : PREGUNTAS_REPARTIDOR}
          onListo={terminarArranque}
          onSaltar={entrarAlPanel}
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
    return <Abriendo rol={rol} paso={paso} />;
  }

  return (
    <div style={S.page}>
      <HeroBackdrop brightness={0.28} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>

          <div style={S.brand}>
            <span style={S.logo}>t</span>
            <span>
              <span style={S.brandName}>TuraFood</span>
              <span style={S.brandKicker}>NEGOCIOS Y REPARTIDORES</span>
            </span>
          </div>

          <h1 style={S.title}>Entra y míralo<br />por dentro.</h1>
          <p style={S.subtitle}>
            Sin cuenta, sin papeles, sin llenar nada. Elige qué eres y estás adentro.
          </p>

          <div style={S.opciones}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => entrar(r)}
                disabled={Boolean(busy)}
                className="entrar-op"
                style={{ ...S.opcion, opacity: busy && busy !== r.id ? 0.45 : 1 }}
              >
                <span style={{ ...S.opcionIcono, background: `${r.accent}22` }}>
                  <span className="ms" style={{ fontSize: 25, color: r.accent }}>{r.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={S.opcionTitulo}>
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
            Trabajas de una, con un tope de 20 pedidos al día. Los documentos los
            subes cuando quieras quitártelo — y si no los tienes, sigues operando igual.
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
const PASOS = [
  { id: 'sesion',   label: 'Negociando tokens de seguridad' },
  { id: 'ficha',    label: 'Cifrando conexión punto a punto' },
  { id: 'menu',     label: 'Asignando clúster de datos' },
  { id: 'comandas', label: 'Montando componentes en memoria' },
  { id: 'listo',    label: 'Enlace establecido' },
];

function Abriendo({ rol, paso }) {
  const actual = Math.max(PASOS.findIndex((p) => p.id === paso), 0);

  return (
    <div style={T.page}>
      {/* Fondo PRO oscuro con malla de puntos sutil */}
      <div style={T.gridBg} />

      <div style={T.center}>
        <div style={T.card}>
          <div style={T.cardHeader}>
            <div style={T.orbContainer}>
              <div style={{ ...T.orbPulse, background: rol?.accent ?? '#FF7A4D' }} className="pro-pulse" />
              <div style={{ ...T.orbSolid, background: rol?.accent ?? '#FF7A4D' }} />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div style={T.marca}>TuraFood OS</div>
              <div style={T.rolTexto}>
                {rol?.id === 'courier' ? 'Inicializando módulo Courier' : 'Inicializando Business Suite'}
              </div>
            </div>
          </div>

          <div style={T.pasos}>
            {PASOS.map((p, i) => {
              const hecho = i < actual;
              const activo = i === actual;
              return (
                <div key={p.id} style={{ ...T.paso, opacity: i > actual ? 0.2 : 1 }}>
                  <div style={T.terminalLine}>
                    <span style={{ 
                      color: hecho ? (rol?.accent ?? '#FF7A4D') : activo ? '#fff' : 'transparent',
                      fontFamily: 'monospace', fontSize: 13, minWidth: 16,
                      animation: activo ? 'blink 1s infinite' : 'none'
                    }}>
                      {hecho ? '✓' : '>'}
                    </span>
                    <span style={{ 
                      fontSize: 13, 
                      fontWeight: activo ? 700 : 500,
                      color: activo ? '#fff' : (hecho ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)'),
                      fontFamily: 'var(--font-jakarta)'
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
    background: 'rgba(20, 20, 20, 0.65)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: 24, padding: 30,
    boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
  },
  orbContainer: {
    position: 'relative', width: 36, height: 36, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  orbPulse: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    animation: 'pro-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
  },
  orbSolid: {
    position: 'relative', width: 14, height: 14, borderRadius: '50%', zIndex: 2,
    boxShadow: '0 0 10px rgba(255,255,255,0.5)',
  },
  marca: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18,
    letterSpacing: '-.02em',
  },
  rolTexto: { 
    fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2, 
    fontFamily: 'monospace', letterSpacing: '0.05em' 
  },
  pasos: {
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  paso: { 
    transition: 'opacity .3s ease',
  },
  terminalLine: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.03)',
  },
  barra: {
    height: 3, borderRadius: 99, background: 'rgba(255,255,255,.06)',
    overflow: 'hidden', marginTop: 30,
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    transition: 'width .6s cubic-bezier(0.16, 1, 0.3, 1)',
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
