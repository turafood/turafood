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

    // 1,1 s es lo que tarda el ojo en registrar la escena y leer el
    // título. Antes eran 2,2 s "para que se aprecie", y se sentían
    // eternos: la persona ya contestó seis preguntas y lo único que
    // quiere es entrar.
    const minimo = new Promise((r) => setTimeout(r, 1100));

    try {
      await Promise.all([guardarArranque(preguntando, respuestas), minimo]);
    } catch {
      // Perder las respuestas es molesto; dejarlo trancado en la
      // puerta es peor. Entra igual y el panel se arma genérico.
      await minimo;
    }
    entrarAlPanel();
  };

  const entrarAlPanel = () => {
    // Directo a su panel, NO a '/'.
    //
    // Ir a '/' obligaba al proxy a leer el perfil en la base para
    // saber el rol y recién ahí redirigir: un viaje completo al
    // servidor, con la pantalla ya en blanco, después de la
    // animación. El rol lo sabemos acá desde que tocó el botón.
    const destino = preguntando === 'business' ? '/negocio' : '/repartidor';

    // El orden importa: primero se pide la navegación y DESPUÉS se
    // apaga la escena. Al revés queda un parpadeo en blanco entre que
    // desaparece la olla y aparece el panel.
    router.replace(destino);

    setPreguntando(null);
    setPreparando(null);
    setGuardandoArranque(false);
  };

  if (preparando) {
    return (
      <PreparandoPanel
        nicho={preparando.nicho}
        pasos={preguntando === 'business'
          ? ['Guardando lo que nos contaste',
             'Armando tu menú de ejemplo',
             'Poniendo comandas de prueba',
             'Dejando tu tablero listo']
          : ['Guardando tu perfil',
             'Buscando negocios cerca',
             'Dejando tu panel listo']}
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
 * LA ESPERA
 *
 * Los pasos son los de verdad, no un temporizador: cada uno se marca
 * cuando ocurre. Si algo tarda, se ve dónde tardó — y quien espera
 * prefiere saber en qué va que mirar una rueda dando vueltas.
 */
const PASOS = [
  { id: 'sesion', label: 'Abriendo tu espacio' },
  { id: 'ficha',  label: 'Preparando tu panel' },
  { id: 'menu',     label: 'Cargando un menú de ejemplo' },
  { id: 'comandas', label: 'Poniendo pedidos de prueba' },
  { id: 'listo',  label: 'Todo listo' },
];

function Abriendo({ rol, paso }) {
  const actual = Math.max(PASOS.findIndex((p) => p.id === paso), 0);

  return (
    <div style={T.page}>
      <HeroBackdrop brightness={0.18} />

      <div style={T.center}>
        <span style={T.aura}>
          <span style={{ ...T.logo, boxShadow: `0 0 0 0 ${rol?.accent ?? '#FF7A4D'}` }}>t</span>
        </span>

        <div style={T.marca}>TuraFood</div>
        <div style={T.rolTexto}>
          {rol?.id === 'courier' ? 'Preparando tu ruta' : 'Preparando tu negocio'}
        </div>

        <div style={T.pasos}>
          {PASOS.map((p, i) => {
            const hecho = i < actual;
            const activo = i === actual;
            return (
              <div key={p.id} style={{ ...T.paso, opacity: i > actual ? 0.35 : 1 }}>
                <span
                  style={{
                    ...T.punto,
                    background: hecho ? 'var(--green)' : activo ? '#fff' : 'rgba(255,255,255,.18)',
                    color: hecho || activo ? '#0B0A09' : 'transparent',
                  }}
                >
                  {hecho
                    ? <span className="ms" style={{ fontSize: 13 }}>check</span>
                    : activo ? <span style={T.latido} /> : null}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: activo ? 800 : 600 }}>
                  {p.label}
                </span>
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
            }}
          />
        </div>

        <p style={T.nota}>
          Sin papeles y sin llenar nada. Puedes empezar a trabajar de una.
        </p>
      </div>
    </div>
  );
}

const T = {
  page: {
    position: 'relative', minHeight: '100dvh', background: '#080706', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  center: {
    position: 'relative', zIndex: 2, width: '100%', maxWidth: 320, textAlign: 'center',
    animation: 'up .3s ease both',
  },
  aura: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 88, height: 88, borderRadius: 30,
    background: 'radial-gradient(circle, rgba(255,122,77,.22), transparent 70%)',
  },
  logo: {
    width: 60, height: 60, borderRadius: 20, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 34,
    animation: 'pulse 1.8s ease-in-out infinite',
  },
  marca: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 21,
    letterSpacing: '-.02em', marginTop: 16,
  },
  rolTexto: { fontSize: 13.5, color: 'rgba(255,255,255,.55)', marginTop: 5 },
  pasos: {
    display: 'flex', flexDirection: 'column', gap: 13, marginTop: 30,
    textAlign: 'left',
  },
  paso: { display: 'flex', alignItems: 'center', gap: 11, transition: 'opacity .3s ease' },
  punto: {
    width: 22, height: 22, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .3s ease',
  },
  latido: {
    width: 8, height: 8, borderRadius: '50%', background: '#0B0A09',
    animation: 'pulse 1.2s ease-in-out infinite',
  },
  barra: {
    height: 4, borderRadius: 99, background: 'rgba(255,255,255,.12)',
    overflow: 'hidden', marginTop: 26,
  },
  barraRelleno: {
    display: 'block', height: '100%', borderRadius: 99,
    transition: 'width .45s cubic-bezier(.2,0,0,1)',
  },
  nota: {
    margin: '18px 0 0', fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,.4)',
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
    border: '1px solid rgba(255,255,255,.13)',
    color: '#fff',
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
