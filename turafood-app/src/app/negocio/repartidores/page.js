'use client';

/**
 * MIS REPARTIDORES
 *
 * Cada negocio pone sus propios repartidores. Se les comparte un código
 * (o un enlace por WhatsApp); quien lo escribe queda en tu flota, avalado
 * por ti, y solo ve y toma TUS pedidos.
 *
 * Todo lo que se muestra es real: no hay mapa ni repartidores de ejemplo.
 */

import { useCallback, useEffect, useState } from 'react';
import { useBiz } from '../BizContext';
import {
  getCodigoFlota, nuevoCodigoFlota, getFlota, quitarDeFlota,
  getSoloFlotaPropia, setSoloFlotaPropia, subscribeToFlota,
  enlaceDeFlota, linkWhatsAppFlota,
} from '@/lib/repartidores-negocio';

const ESTADO = {
  en_ruta:      { label: 'En ruta',       color: 'var(--amber)', icon: 'route' },
  disponible:   { label: 'Disponible',    color: 'var(--green)', icon: 'check_circle' },
  desconectado: { label: 'Desconectado',  color: 'var(--muted)', icon: 'cloud_off' },
};

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 24 };

export default function RepartidoresPage() {
  const { business, toast } = useBiz();
  const [flota, setFlota] = useState(null);       // null = cargando
  const [codigo, setCodigo] = useState(null);
  const [soloPropia, setSoloPropia] = useState(false);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargarFlota = useCallback(async () => {
    try {
      setFlota(await getFlota());
      setError(null);
    } catch (e) {
      setError(e.message);
      setFlota((f) => f ?? []);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    cargarFlota();
    getCodigoFlota().then((c) => vivo && setCodigo(c)).catch((e) => vivo && setError(e.message));
    const detener = subscribeToFlota(() => { if (vivo) cargarFlota(); });
    return () => { vivo = false; detener(); };
  }, [cargarFlota]);

  useEffect(() => {
    if (business?.id) getSoloFlotaPropia(business.id).then(setSoloPropia).catch(() => {});
  }, [business?.id]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlaceDeFlota(codigo));
      toast?.('Enlace copiado. Envíaselo a tu repartidor.');
    } catch {
      toast?.('No se pudo copiar. Mantén presionado el código para copiarlo.');
    }
  };

  const cambiarCodigo = async () => {
    if (!window.confirm('Cambiar el código deja sin efecto el anterior. Los repartidores que ya están en tu flota siguen igual. ¿Cambiarlo?')) return;
    setOcupado(true);
    try {
      setCodigo(await nuevoCodigoFlota());
      toast?.('Código nuevo listo');
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  };

  const alternarExclusiva = async () => {
    const nuevo = !soloPropia;
    setSoloPropia(nuevo);
    try {
      await setSoloFlotaPropia(nuevo);
      toast?.(nuevo ? 'Solo tus repartidores tomarán tus pedidos' : 'Otros repartidores de TuraFood también podrán tomarlos');
    } catch (e) {
      setSoloPropia(!nuevo);
      setError(e.message);
    }
  };

  const quitar = async (r) => {
    if (!window.confirm(`¿Quitar a ${r.nombre} de tu flota? Dejará de ver tus pedidos.`)) return;
    try {
      await quitarDeFlota(r.id);
      toast?.(`${r.nombre} ya no está en tu flota`);
      cargarFlota();
    } catch (e) {
      setError(e.message);
    }
  };

  const conectados = (flota ?? []).filter((r) => r.estado !== 'desconectado').length;

  return (
    <div style={{ maxWidth: 860 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 28, margin: 0, color: 'var(--text)' }}>
          Mis repartidores
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14.5 }}>
          Tu flota propia: quienes entren con tu código reparten solo tus pedidos.
        </p>
      </header>

      {error && (
        <div role="alert" style={{ ...card, padding: '12px 16px', marginBottom: 16, borderColor: 'var(--primary)', color: 'var(--text)', fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* Invitar */}
      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Código de tu flota
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginTop: 10 }}>
          <div
            aria-label="Código de tu flota"
            style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38, letterSpacing: '.18em', color: 'var(--text)', userSelect: 'all' }}
          >
            {codigo ?? '······'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={copiar} disabled={!codigo} style={btn(true)}>
              <span className="ms" style={{ fontSize: 18 }}>content_copy</span> Copiar enlace
            </button>
            <a
              href={codigo ? linkWhatsAppFlota(codigo, business?.name) : undefined}
              target="_blank" rel="noopener noreferrer"
              style={{ ...btn(false), textDecoration: 'none', pointerEvents: codigo ? 'auto' : 'none' }}
            >
              <span className="ms" style={{ fontSize: 18 }}>send</span> Enviar por WhatsApp
            </a>
          </div>
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Tu repartidor abre el enlace, pone su nombre y celular, y ya queda en tu flota. No necesita documentos: tú avalas a tu gente.
        </p>
        <button onClick={cambiarCodigo} disabled={ocupado || !codigo} style={{ marginTop: 10, background: 'none', border: 'none', padding: 0, color: 'var(--muted)', fontSize: 13, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>
          Cambiar código
        </button>
      </section>

      {/* Exclusividad */}
      <section style={{ ...card, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>Solo mis repartidores entregan mis pedidos</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
            {soloPropia
              ? 'Activado: ningún repartidor de fuera de tu flota ve ni toma tus pedidos.'
              : 'Desactivado: si no tienes repartidor libre, otros repartidores de TuraFood también pueden tomarlos.'}
          </div>
        </div>
        <button
          role="switch" aria-checked={soloPropia} aria-label="Solo mis repartidores entregan mis pedidos"
          onClick={alternarExclusiva}
          style={{ flex: 'none', width: 52, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer', position: 'relative', background: soloPropia ? 'var(--primary)' : 'var(--border)', transition: 'background .2s' }}
        >
          <span style={{ position: 'absolute', top: 4, left: soloPropia ? 24 : 4, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 2px 6px rgba(0,0,0,.25)' }} />
        </button>
      </section>

      {/* Lista */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20, margin: 0, color: 'var(--text)' }}>Tu equipo</h2>
        {flota && flota.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 700 }}>
            {flota.length} {flota.length === 1 ? 'repartidor' : 'repartidores'} · {conectados} conectado{conectados === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {flota === null && <div style={{ ...card, color: 'var(--muted)' }}>Cargando tu equipo…</div>}

      {flota && flota.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: 36 }}>
          <span className="ms" style={{ fontSize: 40, color: 'var(--faint, var(--muted))' }}>two_wheeler</span>
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8, color: 'var(--text)' }}>Aún no tienes repartidores</div>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>
            Envía tu código por WhatsApp y aparecerán aquí en cuanto se unan.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {(flota ?? []).map((r) => {
          const e = ESTADO[r.estado];
          return (
            <article key={r.id} style={{ ...card, padding: 20, borderTop: `4px solid ${e.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <span className="ms" style={{ fontSize: 24, color: 'var(--text)' }}>{r.vehiculo === 'Bicicleta' ? 'pedal_bike' : r.vehiculo === 'Carro' ? 'directions_car' : 'two_wheeler'}</span>
                </span>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nombre}</h3>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    {r.vehiculo}{r.placa ? ` · ${r.placa}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: e.color, fontWeight: 800 }}>
                  <span className="ms" style={{ fontSize: 17 }}>{e.icon}</span>{e.label}
                </span>
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{r.entregas} entregas</span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                {r.telefono && (
                  <a href={`https://wa.me/${r.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(false), flex: 1, justifyContent: 'center', textDecoration: 'none', height: 40 }}>
                    <span className="ms" style={{ fontSize: 18 }}>chat</span> WhatsApp
                  </a>
                )}
                <button onClick={() => quitar(r)} style={{ ...btn(false), height: 40, color: 'var(--primary)' }}>
                  Quitar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function btn(principal) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 12,
    fontSize: 14, fontWeight: 800, cursor: 'pointer',
    background: principal ? 'var(--primary)' : 'var(--surface2)',
    color: principal ? '#fff' : 'var(--text)',
    border: principal ? 'none' : '1px solid var(--border)',
  };
}
