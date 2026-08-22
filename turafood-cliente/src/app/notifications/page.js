'use client';

/**
 * NOTIFICACIONES
 * Conversión de `isNotif` (línea 1711) del mockup del cliente.
 *
 * Salen de la tabla `notifications`, que llena un trigger cuando el
 * pedido cambia de estado. Así el aviso queda registrado aunque el
 * usuario tenga la app cerrada.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getNotifications, markNotificationRead } from '@/lib/data';
import { relativeTime } from '@/lib/format';

/** El color sale del ícono que puso el trigger en la base */
const TONE_BY_ICON = {
  check_circle: { bg: '#E6F6EE', fg: 'var(--green)' },
  takeout_dining: { bg: '#E6F6EE', fg: 'var(--green)' },
  two_wheeler: { bg: '#FFF0ED', fg: 'var(--primary)' },
  restaurant: { bg: '#FFF7E6', fg: '#A8730B' },
  cancel: { bg: 'var(--surface2)', fg: 'var(--muted)' },
  local_activity: { bg: '#FFF7E6', fg: '#A8730B' },
  group_add: { bg: '#E6F6EE', fg: 'var(--green)' },
};

const DEFAULT_TONE = { bg: 'var(--surface2)', fg: 'var(--muted)' };

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getNotifications();
        if (alive) setItems(rows);
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /** Marca como leída y navega a donde apunte la notificación */
  const open = async (n) => {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (
        x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
      )));
      try {
        await markNotificationRead(n.id);
      } catch {
        // Si falla marcarla, la navegación no debe bloquearse
      }
    }
    if (n.link) router.push(n.link);
  };

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px 0 0' }}>

          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
            <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
              <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
            </button>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22 }}>
              Notificaciones
            </span>
          </div>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 108px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ height: 76, borderRadius: 16, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '52px 24px' }}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>notifications_off</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                No tienes notificaciones
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                Aquí te avisamos del estado de tus pedidos y de las promos nuevas.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((n) => {
              const tone = TONE_BY_ICON[n.icon] ?? DEFAULT_TONE;
              const unread = !n.read_at;

              return (
                <button
                  key={n.id}
                  onClick={() => open(n)}
                  style={{
                    ...S.row,
                    // Las no leídas se distinguen con un borde de color
                    borderColor: unread ? 'var(--primary)' : 'var(--border)',
                  }}
                >
                  <span style={{ ...S.icon, background: tone.bg }}>
                    <span className="ms" style={{ fontSize: 21, color: tone.fg }}>{n.icon}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: unread ? 800 : 700, fontSize: 14.5 }}>{n.title}</span>
                      {unread && <span style={S.dot} />}
                    </span>
                    <span className="tr1" style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                      {n.body}
                    </span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--faint)', marginTop: 3 }}>
                      {relativeTime(n.created_at)}
                    </span>
                  </span>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  row: {
    display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 13, boxShadow: 'var(--shadowSm)',
  },
  icon: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    width: 7, height: 7, borderRadius: '50%',
    background: 'var(--primary)', flex: 'none',
  },
  emptyIcon: {
    width: 66, height: 66, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: 'var(--primarySoft)',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
