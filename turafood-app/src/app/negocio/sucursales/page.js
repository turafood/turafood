'use client';

/**
 * SUCURSALES
 * Conversión de `isBranches` (línea 616) del mockup de Negocios.
 *
 * Hoy cada cuenta de TuraFood es un punto de venta: `business_profiles`
 * cuelga del mismo id del perfil. Así que aquí se ve tu punto real, no
 * una lista inventada. Abrir una segunda sede se hace con una cuenta
 * nueva hasta que exista el modelo de multisucursal.
 */

import { useMemo } from 'react';
import { cop } from '@/lib/format';
import TuraMap from '../../components/TuraMap';
import Vertical3D, { VERTICAL_TINT } from '../../components/Vertical3D';
import { useBiz } from '../BizContext';

/** Centro de Buenaventura: encuadre por defecto del mapa */
const BUENAVENTURA = { lat: 3.8801, lng: -77.0313 };

/**
 * PostGIS puede llegar como GeoJSON o como WKB en hexadecimal según la
 * configuración de PostgREST. Solo usamos el punto si lo entendemos.
 */
function readPoint(location) {
  if (!location) return null;
  if (typeof location === 'object' && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    return { lat, lng };
  }
  return null;
}

const STATUS = {
  active: { label: 'ABIERTA', bg: '#E6F6EE', color: '#0B7A48', pin: '#11B26A' },
  pending_review: { label: 'EN REVISIÓN', bg: '#FFF7E6', color: '#A8730B', pin: '#FFB020' },
  rejected: { label: 'RECHAZADA', bg: '#FFF1EC', color: '#E2360F', pin: '#FF441F' },
  suspended: { label: 'SUSPENDIDA', bg: 'var(--surface2)', color: 'var(--muted)', pin: '#8C857B' },
  closed: { label: 'CERRADA', bg: 'var(--surface2)', color: 'var(--muted)', pin: '#8C857B' },
};

const VERTICAL_LABEL = {
  restaurant: 'Restaurante', pharmacy: 'Farmacia', market: 'Minimercado',
  liquor: 'Licorera', store: 'Tienda', turbo: 'Turbo', boat: 'Lanchas',
};

export default function SucursalesPage() {
  const { business, orders } = useBiz();

  const st = STATUS[business?.status] ?? STATUS.pending_review;
  const point = readPoint(business?.location) ?? BUENAVENTURA;
  const vertical = business?.vertical ?? 'restaurant';

  const inCourse = useMemo(
    () => orders.reduce((a, o) => a + Number(o.total ?? 0), 0),
    [orders],
  );

  const points = business
    ? [{
      lat: point.lat, lng: point.lng, color: st.pin, badge: '1',
      label: `<b>${business.name}</b><br/>${business.address ?? ''}`,
    }]
    : [];

  return (
    <>
      {/* Mapa */}
      <section style={S.mapCard}>
        <TuraMap points={points} circles height={280} radius={0} />
        <div style={S.legend}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>my_location</span>
            <span style={{ fontSize: 12.5, fontWeight: 700 }}>Tu punto en Buenaventura</span>
          </span>
          <div style={{ flex: 1 }} />
          {[
            { label: 'Abierta', swatch: 'var(--green)' },
            { label: 'En revisión', swatch: 'var(--amber)' },
          ].map((l) => (
            <span key={l.label} style={S.legendItem}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.swatch }} />
              {l.label}
            </span>
          ))}
        </div>
      </section>

      <div style={S.grid}>
        {/* Tarjeta de la sucursal */}
        {business && (
          <article style={S.card}>
            {/* Cabecera: la foto de portada si existe; si no, el icono 3D
                sobre el tinte de la vertical, que se ve intencional. */}
            <div
              style={{
                ...S.cover,
                background: business.cover_url
                  ? undefined
                  : VERTICAL_TINT[vertical] ?? VERTICAL_TINT.restaurant,
                backgroundImage: business.cover_url ? `url('${business.cover_url}')` : undefined,
              }}
            >
              {!business.cover_url && <Vertical3D vertical={vertical} size={86} />}
              <span style={{ ...S.statusPill, background: st.bg, color: st.color }}>{st.label}</span>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...S.avatar, background: VERTICAL_TINT[vertical] }}>
                  <Vertical3D vertical={vertical} size={34} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="tr1" style={S.name}>{business.name}</span>
                  <span style={S.kicker}>
                    {VERTICAL_LABEL[vertical] ?? 'Negocio'} · Sucursal principal
                  </span>
                </span>
              </div>

              <div style={S.address}>
                <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>location_on</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {business.address || 'Sin dirección registrada'}
                </span>
              </div>

              <div style={S.metrics}>
                <Metric label="PEDIDOS EN CURSO" value={String(orders.length)} icon="receipt_long" />
                <Metric label="VALOR EN CURSO" value={cop(inCourse)} icon="payments" />
                <Metric
                  label="PREPARACIÓN"
                  value={`${business.prep_time_min ?? 25} min`}
                  icon="timer"
                />
                <Metric
                  label="CALIFICACIÓN"
                  value={Number(business.rating ?? 5).toFixed(1).replace('.', ',')}
                  icon="star"
                />
              </div>

              <div style={S.footerRow}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span
                    style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: business.is_open ? 'var(--green)' : 'var(--faint)',
                      animation: business.is_open ? 'pulse 2.4s infinite' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: business.is_open ? '#0B7A48' : 'var(--muted)' }}>
                    {business.is_open ? 'Recibiendo pedidos' : 'No recibe pedidos'}
                  </span>
                </span>
                <span style={S.activeTag}>Sucursal activa</span>
              </div>
            </div>
          </article>
        )}

        {/* Agregar sucursal */}
        <article style={S.newCard}>
          <span style={S.newIconWrap}>
            <Vertical3D vertical="store" size={74} alt="Tienda" />
          </span>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 14 }}>
            Agregar sucursal
          </div>
          <p style={S.newText}>
            Cada sucursal tiene su propio catálogo, horario y liquidación. Por ahora se
            abre registrando un punto nuevo: escríbenos y te la creamos con los mismos
            datos que ya tienes.
          </p>

          <ul style={S.newList}>
            {[
              'Catálogo y precios independientes',
              'Horario propio por sede',
              'Liquidación separada cada viernes',
            ].map((l) => (
              <li key={l} style={S.newItem}>
                <span className="ms" style={{ fontSize: 16, color: 'var(--primary)', flex: 'none' }}>check_circle</span>
                {l}
              </li>
            ))}
          </ul>

          <a
            href="https://wa.me/573137594713"
            target="_blank"
            rel="noopener noreferrer"
            className="md3-btn"
            style={S.contact}
          >
            <span className="ms" style={{ fontSize: 19 }}>chat</span>
            Escribir a TuraFood
          </a>
        </article>
      </div>
    </>
  );
}

function Metric({ label, value, icon }) {
  return (
    <div style={S.metric}>
      <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>{icon}</span>
      <span style={S.metricLabel}>{label}</span>
      <span className="tr1" style={S.metricValue}>{value}</span>
    </div>
  );
}

const S = {
  mapCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
    overflow: 'hidden', boxShadow: 'var(--shadowSm)', marginBottom: 16,
  },
  legend: {
    display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px',
    borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11.5, fontWeight: 700, color: 'var(--muted)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16,
    alignItems: 'start',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
    overflow: 'hidden', boxShadow: '0 0 0 1.5px var(--primary), var(--shadowSm)',
  },
  cover: {
    position: 'relative', height: 132, backgroundSize: 'cover', backgroundPosition: 'center',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  statusPill: {
    position: 'absolute', top: 12, right: 12,
    fontSize: 10.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8,
    boxShadow: '0 2px 8px rgba(20,16,10,.12)',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
  },
  name: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 18, letterSpacing: '-.02em',
  },
  kicker: {
    display: 'block', fontSize: 11.5, color: 'var(--muted)', fontWeight: 700, marginTop: 2,
  },
  address: {
    display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14,
    padding: 12, borderRadius: 13, background: 'var(--bg)',
  },
  metrics: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(112px,1fr))',
    gap: 10, marginTop: 14,
  },
  metric: {
    display: 'flex', flexDirection: 'column', gap: 3, padding: 12,
    borderRadius: 13, background: 'var(--bg)', border: '1px solid var(--border)', minWidth: 0,
  },
  metricLabel: {
    fontSize: 9.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em', marginTop: 4,
  },
  metricValue: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17, letterSpacing: '-.02em',
  },
  footerRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  activeTag: {
    fontSize: 11, fontWeight: 800, padding: '6px 12px', borderRadius: 999,
    background: 'var(--surface2)', color: 'var(--muted)',
  },
  newCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    padding: '28px 24px', borderRadius: 20, border: '1.5px dashed var(--faint)',
    background: 'var(--surface)',
  },
  newIconWrap: {
    width: 104, height: 104, borderRadius: 28, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
  },
  newText: {
    margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)',
    lineHeight: 1.55, maxWidth: 280,
  },
  newList: {
    listStyle: 'none', margin: '18px 0 0', padding: 0,
    display: 'flex', flexDirection: 'column', gap: 9, width: '100%', maxWidth: 280,
  },
  newItem: {
    display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5,
    color: 'var(--text)', textAlign: 'left',
  },
  contact: {
    display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 20px',
    borderRadius: 999, background: 'var(--primary)', color: '#fff',
    fontSize: 13.5, fontWeight: 700, textDecoration: 'none', marginTop: 20,
    boxShadow: '0 8px 20px rgba(255,68,31,.28)',
  },
};
