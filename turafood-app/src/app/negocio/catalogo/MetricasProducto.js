'use client';

/**
 * CÓMO LE VA A ESTE PLATO
 *
 * Se abre desde la fila del producto. No es un tablero: son cinco
 * números y un embudo, para responder una sola pregunta — ¿este plato
 * está funcionando o no?
 *
 * LOS NÚMEROS SON REALES O NO SE MUESTRAN
 *
 * Hasta hoy nadie medía cuánta gente veía un producto. Se empezó a
 * medir con esta versión, así que los primeros días van a estar en
 * cero — y la pantalla lo dice con todas las letras en vez de rellenar
 * con algo.
 *
 * Un dueño que ve "142 personas lo miraron y no compraron" le va a
 * bajar el precio o le va a cambiar la foto. Tomar esa decisión con un
 * número inventado es peor que no tener el número.
 *
 * EL EMBUDO
 *
 * Cuatro barras: lo vieron → lo echaron al carrito → llegaron al
 * checkout → lo compraron. Cada una proporcional a la primera, así
 * que dónde se cae la gente se ve sin leer una cifra.
 */

import { useEffect, useState } from 'react';
import { cop } from '@/lib/format';
import { metricasProducto } from '@/lib/negocio';

const RANGOS = [
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

export default function MetricasProducto({ producto, onClose }) {
  const [dias, setDias] = useState(30);
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let vivo = true;
    setM(null); setError(null);
    metricasProducto(producto.id, dias)
      .then((r) => { if (vivo) setM(r); })
      .catch((e) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [producto.id, dias]);

  const sinDatos = m && !m.vistas && !m.agregados && !m.comprados && !m.vendidos;

  return (
    <div style={S.velo} onClick={onClose}>
      <section
        style={S.hoja}
        className="metricas-hoja anim-slideup"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Métricas de ${producto.name}`}
      >
        {/* ------------------------------------------ cabecera */}
        <header style={S.cabecera}>
          <span
            style={{
              ...S.foto,
              backgroundImage: producto.image_url ? `url('${producto.image_url}')` : 'none',
              background: producto.image_url ? undefined : 'var(--surface2)',
            }}
          />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={S.nombre}>{producto.name}</span>
            <span style={S.precio}>{cop(producto.price)}</span>
          </span>
          <button onClick={onClose} style={S.cerrar} aria-label="Cerrar">
            <span className="ms" style={{ fontSize: 20 }}>close</span>
          </button>
        </header>

        {/* ------------------------------------------ rango */}
        <div style={S.rangos}>
          {RANGOS.map((r) => (
            <button
              key={r.dias}
              onClick={() => setDias(r.dias)}
              style={{
                ...S.rango,
                background: dias === r.dias ? 'var(--primary)' : 'transparent',
                color: dias === r.dias ? '#fff' : 'var(--muted)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div style={S.cuerpo}>
          {error && <p style={S.error}>{error}</p>}

          {!m && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="sk" style={{ height: 74, borderRadius: 16 }} />
              <span className="sk" style={{ height: 150, borderRadius: 16 }} />
            </div>
          )}

          {m && (
            <>
              {/* ---- lo que se vendió: eso sí es histórico ---- */}
              <div style={S.cifras}>
                <Cifra label="VENDIDOS" valor={m.vendidos} sufijo="unid." fuerte />
                <Cifra label="INGRESOS" valor={cop(m.ingresos)} texto />
              </div>

              {sinDatos ? (
                <div style={S.vacio}>
                  <span className="ms" style={{ fontSize: 30, color: 'var(--primary)' }}>
                    monitoring
                  </span>
                  <p style={S.vacioTitulo}>Todavía no hay suficiente para mostrar</p>
                  <p style={S.vacioTexto}>
                    Empezamos a medir hace poco cómo se comporta cada producto.
                    En unos días vas a ver acá cuánta gente lo mira, cuántos lo
                    echan al carrito y cuántos terminan comprándolo.
                  </p>
                  <p style={S.vacioNota}>
                    Preferimos dejarlo en blanco antes que mostrarte un número
                    que no es real.
                  </p>
                </div>
              ) : (
                <>
                  {/* ---- el embudo ---- */}
                  <div style={S.bloque}>
                    <span style={S.bloqueTitulo}>De la vitrina al pedido</span>
                    <Embudo m={m} />
                  </div>

                  {/* ---- los dos porcentajes que importan ---- */}
                  <div style={S.cifras}>
                    <Cifra
                      label="LO COMPRAN"
                      valor={m.tasa_conversion != null ? `${m.tasa_conversion}%` : '—'}
                      texto
                      pie="de los que lo ven"
                      color="var(--green)"
                    />
                    <Cifra
                      label="LO ABANDONAN"
                      valor={m.abandono_carrito != null ? `${m.abandono_carrito}%` : '—'}
                      texto
                      pie="lo echan y no compran"
                      color="var(--amber)"
                    />
                  </div>

                  {/* ---- qué hacer con esto ---- */}
                  <Consejo m={m} />
                </>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ */

function Embudo({ m }) {
  const pasos = [
    { label: 'Lo vieron', n: m.vistas, color: '#93A5FF' },
    { label: 'Lo echaron al carrito', n: m.agregados, color: '#7BC8FF' },
    { label: 'Llegaron a pagar', n: m.en_checkout, color: '#FFB57A' },
    { label: 'Lo compraron', n: m.comprados, color: '#4ADE80' },
  ];
  const tope = Math.max(...pasos.map((p) => Number(p.n) || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 12 }}>
      {pasos.map((p, i) => {
        const n = Number(p.n) || 0;
        const previo = i > 0 ? Number(pasos[i - 1].n) || 0 : null;
        // Cuánta gente se cayó respecto del paso anterior
        const caida = previo && previo > n ? Math.round(((previo - n) / previo) * 100) : null;

        return (
          <div key={p.label}>
            <div style={S.embudoFila}>
              <span style={S.embudoLabel}>{p.label}</span>
              <span style={S.embudoNum}>
                {n}
                {caida != null && caida > 0 && (
                  <span style={S.caida}>−{caida}%</span>
                )}
              </span>
            </div>
            <div style={S.pista}>
              <span
                style={{
                  ...S.relleno,
                  width: `${Math.max((n / tope) * 100, n > 0 ? 4 : 0)}%`,
                  background: p.color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Una sola frase, la que más pese. Cinco consejos a la vez no se
 * leen; uno concreto sí se actúa.
 */
function Consejo({ m }) {
  let texto = null;

  if (m.vistas > 20 && (m.tasa_conversion ?? 0) < 3) {
    texto = 'Mucha gente lo mira y casi nadie lo pide. Suele ser la foto o el precio: prueba cambiando uno de los dos.';
  } else if ((m.abandono_carrito ?? 0) > 70 && m.agregados > 5) {
    texto = 'Lo echan al carrito pero no terminan. Revisa que el domicilio no les esté saliendo caro para lo que piden.';
  } else if (m.vistas < 10) {
    texto = 'Todavía lo ve poca gente. Ponlo en una promoción o súbelo de primero en tu carta.';
  } else if ((m.tasa_conversion ?? 0) > 15) {
    texto = 'Este funciona. Considera subirlo de primero en la carta o armar un combo con él.';
  }

  if (!texto) return null;

  return (
    <div style={S.consejo}>
      <span className="ms" style={{ fontSize: 18, color: 'var(--primary)', flex: 'none' }}>
        lightbulb
      </span>
      {texto}
    </div>
  );
}

function Cifra({ label, valor, sufijo, texto, pie, color, fuerte }) {
  return (
    <div style={S.cifra}>
      <span style={S.cifraLabel}>{label}</span>
      <span style={{ ...S.cifraValor, color: color ?? 'var(--text)', fontSize: fuerte ? 26 : 22 }}>
        {texto ? valor : (valor ?? 0)}
        {sufijo && <span style={S.cifraSufijo}>{sufijo}</span>}
      </span>
      {pie && <span style={S.cifraPie}>{pie}</span>}
    </div>
  );
}

const S = {
  velo: {
    position: 'fixed', inset: 0, zIndex: 260,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'rgba(12,10,9,.5)',
    backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
  },
  hoja: {
    width: '100%', maxWidth: 460, maxHeight: '90dvh',
    display: 'flex', flexDirection: 'column',
    background: 'var(--surface)',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -20px 60px rgba(12,10,9,.3)',
    overflow: 'hidden',
  },

  cabecera: {
    display: 'flex', alignItems: 'center', gap: 12, flex: 'none',
    padding: 16, borderBottom: '1px solid var(--border)',
  },
  foto: {
    width: 44, height: 44, borderRadius: 12, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  nombre: {
    display: 'block', fontSize: 15, fontWeight: 800,
    letterSpacing: '-.01em', color: 'var(--text)',
  },
  precio: { display: 'block', marginTop: 2, fontSize: 12.5, color: 'var(--muted)' },
  cerrar: {
    width: 34, height: 34, borderRadius: '50%', flex: 'none',
    background: 'var(--surface2)', color: 'var(--muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  rangos: {
    display: 'flex', gap: 6, flex: 'none', padding: '12px 16px 0',
  },
  rango: {
    height: 32, padding: '0 14px', borderRadius: 999,
    fontSize: 12.5, fontWeight: 700,
    border: '1px solid var(--border)',
    transition: 'background .16s ease, color .16s ease',
  },

  cuerpo: {
    flex: 1, minHeight: 0, overflowY: 'auto',
    padding: 16,
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    display: 'flex', flexDirection: 'column', gap: 14,
  },

  cifras: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 },
  cifra: {
    padding: 14, borderRadius: 16,
    background: 'var(--surface2)', border: '1px solid var(--border)',
  },
  cifraLabel: {
    display: 'block', fontSize: 9.5, fontWeight: 800,
    letterSpacing: '.08em', color: 'var(--muted)',
  },
  cifraValor: {
    display: 'block', marginTop: 6,
    fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums',
  },
  cifraSufijo: { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginLeft: 4 },
  cifraPie: {
    display: 'block', marginTop: 3, fontSize: 10.5, color: 'var(--muted)',
  },

  bloque: {
    padding: 16, borderRadius: 18,
    background: 'var(--surface2)', border: '1px solid var(--border)',
  },
  bloqueTitulo: {
    fontSize: 12, fontWeight: 800, letterSpacing: '.04em', color: 'var(--text)',
  },

  embudoFila: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 10, marginBottom: 5,
  },
  embudoLabel: { fontSize: 12.5, color: 'var(--muted)', fontWeight: 600 },
  embudoNum: {
    display: 'flex', alignItems: 'baseline', gap: 7,
    fontSize: 14, fontWeight: 800, color: 'var(--text)',
    fontVariantNumeric: 'tabular-nums',
  },
  caida: { fontSize: 10.5, fontWeight: 700, color: 'var(--amber)' },
  pista: {
    height: 9, borderRadius: 99, overflow: 'hidden',
    background: 'color-mix(in srgb, var(--text) 7%, transparent)',
  },
  relleno: {
    display: 'block', height: '100%', borderRadius: 99,
    transition: 'width .5s cubic-bezier(.2,0,0,1)',
  },

  vacio: {
    padding: '26px 20px', borderRadius: 18, textAlign: 'center',
    background: 'var(--surface2)', border: '1px dashed var(--border)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
  },
  vacioTitulo: {
    margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text)',
  },
  vacioTexto: {
    margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--muted)', maxWidth: 300,
  },
  vacioNota: {
    margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5,
    color: 'var(--faint)', fontStyle: 'italic', maxWidth: 300,
  },

  consejo: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    padding: 14, borderRadius: 16,
    background: 'var(--primary-tint)',
    border: '1px solid color-mix(in srgb, var(--primary) 22%, transparent)',
    fontSize: 12.5, lineHeight: 1.55, color: 'var(--text)',
  },

  error: { margin: 0, fontSize: 13, color: '#E2360F' },
};
