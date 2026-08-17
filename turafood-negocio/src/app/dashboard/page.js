'use client';

/**
 * KANBAN DE PEDIDOS — APP DE NEGOCIO
 * Réplica de la pantalla `isLive` de "Tura Shop - Negocios.dc.html".
 *
 * Los pedidos ya no son un array fijo: salen de `lib/data` y, cuando
 * hay Supabase configurado, entran solos por Realtime.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cop, relativeTime } from '@/lib/format';
import {
  getLiveOrders, getMyBusiness, updateOrderStatus, setStoreOpen,
  subscribeToOrders, KANBAN_COLUMNS, isLive,
} from '@/lib/data';

const NAV = [
  { href: '/dashboard', icon: 'receipt_long', label: 'Kanban Pedidos' },
  { href: '/catalog', icon: 'inventory_2', label: 'Catálogo' },
  { href: '/history', icon: 'history', label: 'Historial' },
];

export default function BusinessDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [business, setBusiness] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [soundOn, setSoundOn] = useState(true);

  const knownIds = useRef(new Set());

  const load = useCallback(async (businessId) => {
    try {
      const rows = await getLiveOrders(businessId);
      setOrders(rows);
      rows.forEach((o) => knownIds.current.add(o.id));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe = () => {};

    (async () => {
      try {
        const biz = await getMyBusiness();
        setBusiness(biz);
        if (!biz) {
          setError('No encontramos un negocio asociado a tu cuenta.');
          setLoading(false);
          return;
        }
        await load(biz.id);
        unsubscribe = subscribeToOrders(biz.id, () => load(biz.id));
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    })();

    return () => unsubscribe();
  }, [load]);

  const advance = async (order, nextStatus) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, nextStatus);
      if (business) await load(business.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (order) => {
    setBusyId(order.id);
    try {
      await updateOrderStatus(order.id, 'cancelled', 'Rechazado por el negocio');
      if (business) await load(business.id);
      setRejecting(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleStore = async () => {
    if (!business) return;
    const next = !business.is_open;
    setBusiness({ ...business, is_open: next });
    try {
      await setStoreOpen(business.id, next);
    } catch (err) {
      setBusiness({ ...business, is_open: !next });
      setError(err.message);
    }
  };

  const newCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 38, background: 'rgba(20,16,10,.4)', backdropFilter: 'blur(2px)' }}
          className="md:hidden"
        />
      )}

      {/* ---------------- BARRA LATERAL ---------------- */}
      <aside
        style={sidebar}
        className={`${sidebarOpen ? 'absolute inset-y-0 left-0 z-40' : 'hidden'} md:static md:flex`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px 18px' }}>
          <div style={logoMark}>t</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 15.5, letterSpacing: '-.01em' }}>
              Tura Shop
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 800, letterSpacing: '.08em' }}>
              NEGOCIOS
            </div>
          </div>
        </div>

        <div style={bizCard}>
          <span style={{
            width: 32, height: 32, borderRadius: 9, flex: 'none',
            backgroundImage: `url('${business?.cover_url ?? ''}')`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            background: business?.cover_url ? undefined : 'var(--primary)',
          }} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="tr1" style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>
              {business?.name ?? 'Cargando…'}
            </span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
              {business?.category ?? ''}
            </span>
          </span>
        </div>

        <nav style={{ flex: 1, padding: '0 10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--faint)', letterSpacing: '.1em', padding: '0 10px 8px' }}>
            OPERACIÓN
          </div>
          {NAV.map((item) => {
            const active = item.href === '/dashboard';
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11, width: '100%', height: 42,
                  padding: '0 12px', borderRadius: 999, marginBottom: 2,
                  background: active ? 'var(--surface2)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text)',
                }}
              >
                <span className="ms" style={{ fontSize: 20, flex: 'none', color: active ? 'var(--primary)' : 'var(--muted)' }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600 }}>{item.label}</span>
                {active && newCount > 0 && (
                  <span style={navBadge}>{newCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
          <div style={dataModeBox}>
            <span className="ms" style={{ fontSize: 16, color: isLive() ? 'var(--green)' : 'var(--amber)' }}>
              {isLive() ? 'cloud_done' : 'cloud_off'}
            </span>
            <span style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--muted)', fontWeight: 600 }}>
              {isLive() ? 'Pedidos en tiempo real' : 'Datos locales de desarrollo'}
            </span>
          </div>
        </div>
      </aside>

      {/* ---------------- CONTENIDO ---------------- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        <header style={topbar}>
          <button onClick={() => setSidebarOpen(true)} style={burger} className="md:hidden">
            <span className="ms" style={{ fontSize: 24 }}>menu</span>
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em' }}>
              Kanban de Pedidos
            </div>
            <div className="tr1" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
              Gestiona tus pedidos en tiempo real
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={toggleStore}
            disabled={!business}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, height: 40,
              padding: '0 6px 0 14px', borderRadius: 13,
              border: business?.is_open ? '1px solid var(--green)' : '1px solid var(--border)',
              background: business?.is_open ? '#E6F6EE' : 'var(--surface2)',
              color: business?.is_open ? '#0B7A48' : 'var(--muted)',
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 800 }}>
              {business?.is_open ? 'Abierto' : 'Cerrado'}
            </span>
            <span style={{
              width: 38, height: 22, borderRadius: 99, padding: 2, display: 'flex',
              background: business?.is_open ? 'var(--green)' : 'var(--faint)',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'transform .18s ease',
                transform: business?.is_open ? 'translateX(16px)' : 'none',
              }} />
            </span>
          </button>
        </header>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 40px' }}>

          {error && (
            <div style={errorBox}>
              <span className="ms" style={{ fontSize: 20 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => setSoundOn((s) => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px',
                borderRadius: 12, fontSize: 12.5, fontWeight: 800,
                background: soundOn ? '#E6F6EE' : 'var(--surface2)',
                color: soundOn ? '#0B7A48' : 'var(--muted)',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: soundOn ? 'var(--green)' : 'var(--faint)',
                animation: soundOn ? 'pulse 2s infinite' : 'none',
              }} />
              {soundOn ? 'Sonido activo' : 'Sonido apagado'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14, alignItems: 'start' }}>
            {KANBAN_COLUMNS.map((col) => {
              const colOrders = orders.filter((o) => col.statuses.includes(o.status));
              return (
                <div key={col.id} style={{ background: 'var(--surface2)', borderRadius: 18, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px 12px' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>{col.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>{colOrders.length}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {loading && (
                      <div style={{ textAlign: 'center', padding: '26px 12px', fontSize: 12, color: 'var(--faint)', fontWeight: 600 }}>
                        Cargando…
                      </div>
                    )}

                    {!loading && colOrders.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '26px 12px', fontSize: 12, color: 'var(--faint)', fontWeight: 600 }}>
                        Sin pedidos
                      </div>
                    )}

                    {colOrders.map((o) => {
                      const isNew = o.status === 'pending';
                      const busy = busyId === o.id;
                      const confirmingReject = rejecting === o.id;

                      return (
                        <article key={o.id} style={orderCard}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800 }}>
                              {isNew && (
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.6s infinite' }} />
                              )}
                              #{o.order_number}
                            </span>
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
                              color: isNew ? 'var(--primary)' : 'var(--muted)',
                            }}>
                              <span className="ms" style={{ fontSize: 14 }}>schedule</span>
                              {relativeTime(o.created_at)}
                            </span>
                          </div>

                          <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 9 }}>
                            {o.customer?.full_name ?? 'Cliente'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                            <span className="ms" style={{ fontSize: 14 }}>
                              {o.mode === 'pickup' ? 'directions_walk' : 'delivery_dining'}
                            </span>
                            {o.mode === 'pickup' ? 'Para recoger · En local' : `Domicilio · ${o.delivery_address ?? 'Sin dirección'}`}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
                            {(o.items ?? []).map((line) => (
                              <div key={line.id} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                                <span style={{ fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>{line.quantity}×</span>
                                <span style={{ flex: 1, lineHeight: 1.35 }}>{line.name}</span>
                              </div>
                            ))}
                          </div>

                          {(o.items ?? []).some((l) => l.notes) && (
                            <div style={noteBox}>
                              <span className="ms" style={{ fontSize: 15, color: '#A8730B', flex: 'none' }}>sticky_note_2</span>
                              <span style={{ fontSize: 11.5, lineHeight: 1.4, color: '#7A5405' }}>
                                {o.items.find((l) => l.notes)?.notes}
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 11, borderTop: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 14.5, fontWeight: 800 }}>{cop(o.total)}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: o.payment_status === 'paid' ? 'var(--green)' : 'var(--muted)' }}>
                              {o.payment_status === 'paid' ? 'Pagado en app' : 'Efectivo al recibir'}
                            </span>
                          </div>

                          {confirmingReject ? (
                            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                              <button onClick={() => setRejecting(null)} disabled={busy} style={ghostBtn}>
                                Cancelar
                              </button>
                              <button onClick={() => reject(o)} disabled={busy} style={{ ...actionBtn, background: 'var(--primary)', color: '#fff' }}>
                                {busy ? '…' : 'Confirmar rechazo'}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                              {col.canReject && (
                                <button
                                  onClick={() => setRejecting(o.id)}
                                  disabled={busy}
                                  style={rejectIconBtn}
                                  aria-label={`Rechazar pedido ${o.order_number}`}
                                >
                                  <span className="ms" style={{ fontSize: 19, color: 'var(--muted)' }}>close</span>
                                </button>
                              )}
                              <button
                                onClick={() => advance(o, col.action.next)}
                                disabled={busy}
                                style={{
                                  ...actionBtn,
                                  background: col.action.style === 'primary' ? 'var(--primary)'
                                    : col.action.style === 'green' ? 'var(--green)' : 'var(--text)',
                                  color: '#fff',
                                }}
                              >
                                {busy ? 'Guardando…' : col.action.label}
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   Estilos del mockup de negocios
   ------------------------------------------------------------ */

const sidebar = {
  flex: 'none', width: 250, background: 'var(--surface)', color: 'var(--text)',
  borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
  overflowY: 'auto',
};

const logoMark = {
  width: 34, height: 34, borderRadius: 11, background: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19,
  flex: 'none', color: '#fff',
};

const bizCard = {
  display: 'flex', alignItems: 'center', gap: 10, margin: '0 12px 14px',
  padding: 11, borderRadius: 16, background: 'var(--surface2)', textAlign: 'left',
};

const navBadge = {
  flex: 'none', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 99,
  background: 'var(--primary)', color: '#fff', fontSize: 10.5, fontWeight: 800,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const topbar = {
  flex: 'none', display: 'flex', alignItems: 'center', gap: 16, minHeight: 68,
  padding: '0 26px', background: 'var(--surface)', borderBottom: '1px solid var(--border)',
};

const burger = {
  width: 42, height: 42, borderRadius: '50%', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flex: 'none', marginLeft: -9,
};

const orderCard = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 15, padding: 13, boxShadow: 'var(--shadowSm)', animation: 'pop .2s ease',
};

const noteBox = {
  display: 'flex', gap: 7, marginTop: 10,
  background: '#FFF7E6', borderRadius: 10, padding: '9px 10px',
};

const actionBtn = {
  flex: 1, height: 38, borderRadius: 11, fontSize: 12.5, fontWeight: 800,
};

const ghostBtn = {
  flex: 1, height: 38, borderRadius: 11, fontSize: 12.5, fontWeight: 700,
  border: '1px solid var(--border)', color: 'var(--muted)',
};

const rejectIconBtn = {
  flex: 'none', width: 38, height: 38, borderRadius: 11,
  border: '1px solid var(--border)', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

const dataModeBox = {
  display: 'flex', gap: 9, alignItems: 'flex-start',
  background: 'var(--bg)', borderRadius: 12, padding: 10,
};

const errorBox = {
  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
  padding: '12px 14px', borderRadius: 14,
  background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
};
