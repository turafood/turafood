'use client';

/**
 * CÓMO COBRA ESTE NEGOCIO
 *
 * TuraFood no procesa la plata de las ventas ni cobra comisión por
 * pedido: cada negocio recibe directo. Así que esta pantalla es donde
 * el dueño define si va a poder cobrar o no.
 *
 * Lo que apague desaparece del checkout de sus clientes. No se muestra
 * en gris: no aparece.
 *
 * CUATRO BLOQUES, NO CINCO
 *
 * Nequi y Daviplata van juntos bajo "Transferencia". Para el dueño son
 * la misma decisión —"que me consignen"— y separarlas lo obligaba a
 * pensar dos veces lo mismo. Por dentro siguen siendo dos métodos
 * distintos, porque el cliente sí tiene que saber a cuál de las dos
 * apps le transfiere y a qué número.
 *
 * El switch es el mismo verde de "Tienda abierta" del encabezado, a
 * propósito: el dueño ya aprendió que ese verde significa "prendido".
 *
 * Las reglas las hace cumplir la base —el constraint y el trigger
 * `guard_payment_method`—, no esta pantalla.
 */

import { useEffect, useMemo, useState } from 'react';

import { useBiz } from '../BizContext';
import HeaderHero from '../../components/HeaderHero';
import { updateBusiness } from '@/lib/negocio';
import {
  IconoEfectivo, IconoTransferencia, IconoWhatsapp, IconoTarjeta, PuntoMarca,
} from '../../components/IconosPago';

/**
 * El rojo de aviso. No hay `--red` en la paleta de esta app —se
 * comprobó en globals.css— y usar una variable que no existe hace que
 * el borde de error salga del color del texto, o sea invisible.
 */
const ROJO = '#E2360F';

/**
 * Primero lo que se recibe sin configurar nada. Un dueño que solo
 * maneja efectivo encuentra lo suyo en la primera fila y se puede ir.
 */
const BLOQUES = [
  {
    id: 'cash',
    Icono: IconoEfectivo,
    nombre: 'Efectivo',
    detalle: 'Te pagan cuando les llega el pedido.',
    sello: 'SIN CONFIGURAR NADA',
  },
  {
    id: 'transferencia',
    Icono: IconoTransferencia,
    nombre: 'Nequi o Daviplata',
    detalle: 'Te consignan directo a tu billetera.',
    billeteras: [
      { id: 'nequi', nombre: 'Nequi' },
      { id: 'daviplata', nombre: 'Daviplata' },
    ],
  },
  {
    id: 'card',
    Icono: IconoTarjeta,
    nombre: 'Datáfono en físico',
    detalle: 'Si mandas datáfono con el domiciliario.',
  },
];

const digitos = (v) => String(v ?? '').replace(/\D/g, '');

export default function PagosPage() {
  const { business, refreshBusiness, toast } = useBiz();

  const [activos, setActivos] = useState([]);
  const [datos, setDatos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!business) return;
    setActivos(business.payment_methods ?? ['cash']);
    setDatos({
      whatsapp: business.whatsapp_phone ?? '',
      nequi: business.payment_details?.nequi ?? '',
      daviplata: business.payment_details?.daviplata ?? '',
    });
  }, [business]);

  /** Prendidos a los que les falta el número */
  const incompletos = useMemo(() => {
    const faltan = [];
    if (activos.includes('whatsapp') && digitos(datos.whatsapp).length !== 10) faltan.push('WhatsApp');
    for (const w of ['nequi', 'daviplata']) {
      if (activos.includes(w) && digitos(datos[w]).length !== 10) {
        faltan.push(w === 'nequi' ? 'Nequi' : 'Daviplata');
      }
    }
    return faltan;
  }, [activos, datos]);

  if (!business) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="sk" style={{ height: 104, borderRadius: 24 }} />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk" style={{ height: 82, borderRadius: 20 }} />
        ))}
      </div>
    );
  }

  /** Un bloque está prendido si alguno de sus métodos lo está */
  const bloqueOn = (b) =>
    b.billeteras ? b.billeteras.some((w) => activos.includes(w.id)) : activos.includes(b.id);

  const alternarBloque = (b) => {
    setListo(false); setError(null);
    if (!b.billeteras) {
      setActivos((p) => (p.includes(b.id) ? p.filter((x) => x !== b.id) : [...p, b.id]));
      return;
    }
    // Apagar el bloque apaga las dos billeteras; prenderlo prende la
    // primera, que es la que más se usa acá.
    const ids = b.billeteras.map((w) => w.id);
    setActivos((p) =>
      ids.some((x) => p.includes(x)) ? p.filter((x) => !ids.includes(x)) : [...p, ids[0]],
    );
  };

  const alternarBilletera = (id) => {
    setListo(false); setError(null);
    setActivos((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const escribir = (clave, valor) => {
    setListo(false);
    setDatos((p) => ({ ...p, [clave]: valor }));
  };

  const guardar = async () => {
    setError(null); setListo(false);

    if (activos.length === 0) {
      setError('Deja al menos una forma de cobrar, o tu negocio no le aparece a nadie.');
      return;
    }
    if (incompletos.length > 0) {
      setError(`Falta el número de ${incompletos.join(' y ')}. Sin eso tus clientes no sabrían a dónde pagarte.`);
      return;
    }

    setGuardando(true);
    try {
      await updateBusiness(business.id, {
        payment_methods: activos,
        whatsapp_phone: digitos(datos.whatsapp) || null,
        payment_details: {
          ...(business.payment_details ?? {}),
          nequi: digitos(datos.nequi) || undefined,
          daviplata: digitos(datos.daviplata) || undefined,
        },
      });
      await refreshBusiness?.();
      setListo(true);
      toast?.('Guardado. Tus clientes ya ven estos medios.');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const activosListos = activos.length - incompletos.length;

  return (
    <div style={S.pagina}>

      <HeaderHero
        title="Control total de tus pagos"
        subtitle="Recibe tu dinero de forma directa, instantánea y sin comisiones ocultas de TuraFood. Tú decides exactamente qué métodos de pago quieres aceptar de tus clientes."
        images={[
          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1580828369019-2238f6982056?q=80&w=1200&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=1200&auto=format&fit=crop'
        ]}
      />
      
      {/* Estado rápido de métodos */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={S.contador}>
            <span className="ms" style={{ fontSize: 18 }}>account_balance_wallet</span>
            <b>{activosListos}</b> {activosListos === 1 ? 'método activo' : 'métodos activos'}
          </span>
          {incompletos.length > 0 && (
            <span style={S.contadorAviso}>
              <span className="ms" style={{ fontSize: 16 }}>error</span>
              Falta configuración de {incompletos.join(' y ')}
            </span>
          )}
      </div>

      {/* ------------------------------------------- los bloques */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BLOQUES.map((b) => {
          const on = bloqueOn(b);
          const faltaCampo = b.campo && on && digitos(datos[b.campo]).length !== 10;

          return (
            <article
              key={b.id}
              style={{
                ...S.tarjeta,
                borderColor: faltaCampo ? 'var(--primary)' : on ? 'var(--green)' : 'var(--border)',
                background: on ? 'color-mix(in srgb, var(--green) 3%, var(--surface))' : 'var(--surface)',
                boxShadow: on ? '0 8px 30px color-mix(in srgb, var(--green) 8%, transparent)' : 'var(--shadowSm)',
              }}
            >
              <button onClick={() => alternarBloque(b)} style={S.fila} aria-pressed={on}>
                {/* Apagado se ve en gris: el color de la marca es la
                    señal de que ese medio está vivo. */}
                <span style={{ ...S.marca, filter: on ? 'none' : 'grayscale(1)', opacity: on ? 1 : .45 }}>
                  <b.Icono />
                </span>

                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={S.nombre}>
                    {b.nombre}
                    {b.sello && <span style={S.sello}>{b.sello}</span>}
                  </span>
                  <span style={S.detalle}>{b.detalle}</span>
                </span>

                <span style={{ ...S.switchTrack, background: on ? 'var(--green)' : 'var(--surface2)', boxShadow: on ? '0 0 10px rgba(16,185,129,0.4)' : 'none' }}>
                  <span style={{ ...S.switchKnob, transform: on ? 'translateX(20px)' : 'none' }} />
                </span>
              </button>

              {/* --- transferencia: cuál billetera y a qué número --- */}
              {b.billeteras && on && (
                <div style={S.interior}>
                  {b.billeteras.map((w) => {
                    const wOn = activos.includes(w.id);
                    const wFalta = wOn && digitos(datos[w.id]).length !== 10;
                    return (
                      <div key={w.id} style={S.billetera}>
                        <button
                          onClick={() => alternarBilletera(w.id)}
                          style={S.billeteraFila}
                          aria-pressed={wOn}
                        >
                          <PuntoMarca marca={w.id} />
                          <span style={{ flex: 1, textAlign: 'left', fontSize: 13.5, fontWeight: 700 }}>
                            {w.nombre}
                          </span>
                          <span style={{ ...S.switchMini, background: wOn ? 'var(--green)' : 'var(--surface2)' }}>
                            <span style={{ ...S.switchMiniKnob, transform: wOn ? 'translateX(16px)' : 'none' }} />
                          </span>
                        </button>

                        {wOn && (
                          <div style={{ ...S.campoCaja, borderColor: wFalta ? ROJO : 'var(--border)' }}>
                            <span style={S.prefijo}>+57</span>
                            <input
                              value={datos[w.id] ?? ''}
                              onChange={(e) => escribir(w.id, e.target.value)}
                              placeholder="313 759 4713"
                              inputMode="numeric"
                              maxLength={14}
                              style={S.input}
                            />
                            {!wFalta && (
                              <span className="ms" style={{ fontSize: 18, color: 'var(--green)' }}>
                                check_circle
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <span style={S.ayuda}>
                    Tus clientes ven este número en el checkout para transferirte.
                  </span>
                </div>
              )}

              {/* --- whatsapp: a qué número le llegan los pedidos --- */}
              {b.campo && on && (
                <div style={S.interior}>
                  <div style={{ ...S.campoCaja, borderColor: faltaCampo ? ROJO : 'var(--border)' }}>
                    <span style={S.prefijo}>+57</span>
                    <input
                      value={datos[b.campo] ?? ''}
                      onChange={(e) => escribir(b.campo, e.target.value)}
                      placeholder="313 759 4713"
                      inputMode="numeric"
                      maxLength={14}
                      style={S.input}
                    />
                    {!faltaCampo && (
                      <span className="ms" style={{ fontSize: 18, color: 'var(--green)' }}>
                        check_circle
                      </span>
                    )}
                  </div>
                  <span style={{ ...S.ayuda, color: faltaCampo ? ROJO : 'var(--muted)' }}>
                    {faltaCampo
                      ? 'Son 10 dígitos, sin el +57.'
                      : 'Ahí te llega la comanda completa de cada pedido.'}
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {error && (
        <p style={{ ...S.aviso, color: ROJO }}>
          <span className="ms" style={{ fontSize: 18 }}>error</span>
          {error}
        </p>
      )}

      {/* ------------------------------------------- guardar */}
      <div style={S.barra}>
        <span style={S.barraTexto}>
          {listo ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontWeight: 700 }}>
              <span className="ms" style={{ fontSize: 18 }}>check_circle</span>
              Guardado. Tus clientes ya lo ven.
            </span>
          ) : (
            'Tus clientes solo ven los medios que dejes prendidos.'
          )}
        </span>
        <button onClick={guardar} disabled={guardando} style={S.guardar}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

const S = {
  pagina: { display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 8 },

  contadores: {
    display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12,
  },
  contador: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12.5, fontWeight: 700, color: '#4ADE80',
  },
  contadorAviso: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12.5, fontWeight: 700, color: '#FCA5A5',
  },

  hero: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 24, padding: 20,
    background: 'linear-gradient(142deg, var(--ink) 0%, var(--ink2) 72%)',
    color: 'var(--text)',
  },
  heroBrillo: {
    position: 'absolute', right: -70, top: -90, width: 230, height: 230,
    borderRadius: '50%', pointerEvents: 'none',
    background: 'radial-gradient(circle, rgba(37,211,102,.30), transparent 70%)',
  },
  heroFila: { position: 'relative', display: 'flex', gap: 16, alignItems: 'center' },
  heroTitulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 19, letterSpacing: '-.015em',
  },
  heroTexto: {
    margin: '6px 0 0', fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,.62)',
  },
  heroCifra: {
    flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '10px 16px', borderRadius: 16,
    background: 'rgba(255,255,255,.08)', color: '#4ADE80',
    fontWeight: 800, letterSpacing: '.06em',
  },
  heroAviso: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
    marginTop: 14, paddingTop: 13,
    borderTop: '1px solid rgba(255,255,255,.10)',
    fontSize: 12.5, fontWeight: 700, color: '#FCA5A5',
  },

  tarjeta: {
    borderRadius: 24, border: '1px solid var(--border)',
    overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  fila: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 18,
    padding: '24px', background: 'none', border: 'none', cursor: 'pointer',
  },
  marca: {
    width: 48, height: 48, borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface2)', flex: 'none',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  nombre: {
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--text)',
  },
  sello: {
    fontSize: 10, fontWeight: 800, letterSpacing: '.06em', color: 'var(--primary)',
    background: 'color-mix(in srgb, var(--primary) 10%, transparent)', padding: '4px 8px', borderRadius: 6,
  },
  detalle: {
    display: 'block', marginTop: 4, fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.4,
  },
  switchTrack: {
    width: 44, height: 24, borderRadius: 99, flex: 'none',
    position: 'relative', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  switchKnob: {
    position: 'absolute', top: 2, left: 2, width: 20, height: 20,
    borderRadius: '50%', background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  interior: {
    padding: '0 20px 20px 76px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  billetera: { display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' },
  billeteraFila: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
    background: 'none', padding: 0, transition: 'opacity 0.2s',
  },
  switchMini: {
    width: 36, height: 20, borderRadius: 99, padding: 2,
    display: 'flex', flex: 'none', transition: 'background 0.3s ease',
  },
  switchMiniKnob: {
    width: 16, height: 16, borderRadius: '50%', background: '#fff',
    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 1px 3px rgba(0,0,0,.15)',
  },

  campoCaja: {
    display: 'flex', alignItems: 'center', gap: 10,
    height: 48, padding: '0 16px', borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.06)', background: 'var(--bg)',
    transition: 'all .2s ease', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
  },
  prefijo: { fontSize: 14.5, fontWeight: 700, color: 'var(--muted)', flex: 'none' },
  input: {
    flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none',
    fontSize: 15.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '.03em',
  },
  ayuda: { fontSize: 11.5, lineHeight: 1.45, color: 'var(--muted)' },

  aviso: {
    display: 'flex', alignItems: 'center', gap: 9, margin: 0,
    fontSize: 13, lineHeight: 1.5,
  },

  barra: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 16, flexWrap: 'wrap', padding: 16, borderRadius: 20,
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  barraTexto: { fontSize: 12.5, color: 'var(--muted)', flex: 1, minWidth: 180 },
  guardar: {
    height: 48, padding: '0 28px', borderRadius: 999, flex: 'none',
    background: 'var(--green)', color: 'var(--text)',
    fontSize: 15, fontWeight: 800, letterSpacing: '-.01em',
    boxShadow: '0 4px 14px rgba(11,122,72,.28)',
  },
};
