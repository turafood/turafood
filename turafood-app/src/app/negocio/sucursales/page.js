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

export default function SucursalesPage() {
  const { business, orders } = useBiz();

  const st = STATUS[business?.status] ?? STATUS.pending_review;
  const point = readPoint(business?.location) ?? BUENAVENTURA;

  const todaySales = useMemo(
    () => orders.reduce((a, o) => a + Number(o.total ?? 0), 0),
    [orders],
  );

  const points = business
    ? [{ lat: point.lat, lng: point.lng, color: st.pin, badge: '1', label: `<b>${business.name}</b><br/>${business.address ?? ''}` }]
    : [];

  return (
    <>
      <div style={S.mapCard}>
        <TuraMap points={points} circles height={260} radius={0} />
        <div style={S.legend}>
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Tu punto en Buenaventura</span>
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
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 16 }}>
        {business && (
          <div style={{ ...S.card, boxShadow: '0 0 0 2px var(--primary)' }}>
            <div
              style={{
                height: 112,
                backgroundImage: business.cover_url ? `url('${business.cover_url}')` : 'none',
                background: business.cover_url ? undefined : 'var(--surface2)',
                backgroundSize: 'cover', backgroundPosition: 'center',
              }}
            />
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
                  {business.name}
                </span>
                <span style={{ ...S.pill, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 6 }}>
                {business.address ?? 'Sin dirección registrada'}
              </div>

              <div style={{ display: 'flex', gap: 18, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={S.metaLabel}>PEDIDOS EN CURSO</div>
                  <div style={S.metaValue}>{orders.length}</div>
                </div>
                <div>
                  <div style={S.metaLabel}>VALOR EN CURSO</div>
                  <div style={S.metaValue}>{cop(todaySales)}</div>
                </div>
              </div>

              <div style={S.activeBtn}>Sucursal activa</div>
            </div>
          </div>
        )}

        <div style={S.newCard}>
          <span style={S.newIcon}>
            <span className="ms" style={{ fontSize: 24, color: 'var(--primary)' }}>add_business</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 800 }}>Agregar sucursal</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 220, textAlign: 'center', lineHeight: 1.45 }}>
            Cada sucursal tiene su propio catálogo, horario y liquidación. Por ahora se abre
            registrando un punto nuevo: escríbenos y te la creamos con los mismos datos.
          </span>
          <a href="https://wa.me/573160000000" target="_blank" rel="noopener noreferrer" style={S.contact}>
            <span className="ms" style={{ fontSize: 18 }}>chat</span>
            Escribir a TuraFood
          </a>
        </div>
      </div>
    </>
  );
}

const S = {
  mapCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
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
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, overflow: 'hidden',
  },
  pill: { fontSize: 10.5, fontWeight: 800, padding: '5px 9px', borderRadius: 8, flex: 'none' },
  metaLabel: { fontSize: 11, color: 'var(--muted)', fontWeight: 700 },
  metaValue: { fontSize: 16, fontWeight: 800, marginTop: 3 },
  activeBtn: {
    width: '100%', height: 40, borderRadius: 12, marginTop: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface2)', color: 'var(--muted)', fontSize: 12.5, fontWeight: 800,
  },
  newCard: {
    minHeight: 280, border: '1.5px dashed var(--faint)', borderRadius: 18,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 12, padding: 24,
  },
  newIcon: {
    width: 48, height: 48, borderRadius: 14, background: '#FFF1EC',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  contact: {
    display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px',
    borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)',
    fontSize: 13, fontWeight: 700, color: 'var(--text)', textDecoration: 'none',
  },
};
