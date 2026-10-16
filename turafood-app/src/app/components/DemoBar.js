'use client';

import { URL_GO_LIVE } from '@/lib/sitio';

/**
 * Franja fija del sitio demo: deja claro que los datos son de ejemplo y ofrece
 * el paso a producción. No guarda nada: el alta real ocurre en app.turafood.com.
 */
export default function DemoBar() {
  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '10px 14px', marginBottom: 16, borderRadius: 14,
      background: 'color-mix(in srgb, var(--amber) 22%, var(--surface))',
      border: '1px solid color-mix(in srgb, var(--amber) 55%, transparent)',
      color: 'var(--text)',
    }}>
      <span className="ms ms-fill" style={{ fontSize: 20, color: 'var(--primary)' }}>science</span>
      <div style={{ flex: '1 1 220px', minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13.5 }}>Estás en el DEMO de TuraFood</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          Recorre el panel con datos de ejemplo. Nada de lo que hagas aquí se guarda.
        </div>
      </div>
      <a href={URL_GO_LIVE} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px',
        borderRadius: 12, background: 'var(--primary)', color: 'var(--onPrimary)',
        fontWeight: 800, fontSize: 13.5, textDecoration: 'none', whiteSpace: 'nowrap',
      }}>
        <span className="ms" style={{ fontSize: 18 }}>rocket_launch</span> Go live
      </a>
    </div>
  );
}
