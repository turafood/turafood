'use client';

/**
 * INICIO DEL REPARTIDOR
 * Conversión de `isHome` (línea 292) del mockup del Repartidor.
 *
 * Si ya hay una entrega en curso, esta pantalla lleva a ella. Si no,
 * muestra la bolsa de pedidos disponibles: el primero que acepte se lo
 * lleva, y eso lo resuelve la base, no el navegador.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import {
  getAvailableOrders, acceptOrder, getDeliveries, earningsByDay, subscribeToAvailable,
} from '@/lib/repartidor';
import { useRider } from './RiderContext';

const DAILY_GOAL = 120000;

/** Nivel a partir de entregas hechas: nada inventado, sale del perfil */
function level(deliveries = 0) {
  if (deliveries >= 1000) return { name: 'Nivel Platino', next: null, from: 1000, to: 1000 };
  if (deliveries >= 500) return { name: 'Nivel Oro', next: 'Platino', from: 500, to: 1000 };
  if (deliveries >= 150) return { name: 'Nivel Plata', next: 'Oro', from: 150, to: 500 };
  return { name: 'Nivel Bronce', next: 'Plata', from: 0, to: 150 };
}

const PERKS = [
  { icon: 'priority_high', label: 'Pedidos prioritarios', fg: '#D99A15' },
  { icon: 'savings', label: 'Bono semanal', fg: 'var(--green)' },
  { icon: 'support_agent', label: 'Soporte VIP', fg: 'var(--blue)' },
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default function RepartidorHome() {
  const router = useRouter();
  const { courier, active, online, setOnline, loading, toast } = useRider();

  const [offers, setOffers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [taking, setTaking] = useState(null);
  const [error, setError] = useState(null);

  const loadOffers = useCallback(async () => {
    if (!online) { setOffers([]); return; }
    try {
      setOffers(await getAvailableOrders());
    } catch (err) {
      setError(err.message);
    }
  }, [online]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  useEffect(() => {
    if (!online) return undefined;
    return subscribeToAvailable(loadOffers);
  }, [online, loadOffers]);

  useEffect(() => {
    if (!courier) return undefined;
    let alive = true;
    getDeliveries(courier.id)
      .then((d) => { if (alive) setDeliveries(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [courier]);

  const days = useMemo(() => earningsByDay(deliveries, 7), [deliveries]);
  const today = days[days.length - 1] ?? { total: 0, count: 0 };
  const yesterday = days[days.length - 2] ?? { total: 0 };
  const chartMax = Math.max(...days.map((d) => d.total), 1);
  const delta = yesterday.total ? ((today.total - yesterday.total) / yesterday.total) * 100 : 0;

  const lvl = level(courier?.total_deliveries ?? 0);
  const progress = lvl.next
    ? Math.min(100, (((courier?.total_deliveries ?? 0) - lvl.from) / (lvl.to - lvl.from)) * 100)
    : 100;

  const take = async (order) => {
    setTaking(order.id);
    setError(null);
    try {
      await acceptOrder(order.id);
      toast('Pedido aceptado · ve al negocio');
      router.push('/repartidor/activo');
    } catch (err) {
      setError(err.message);
      loadOffers();
    } finally {
      setTaking(null);
    }
  };

  return (
    <>
      {/* Cabecera */}
      <header style={S.header}>
        <div style={S.avatar}>{initials(courier?.profile?.full_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18 }}>
            Hola, {String(courier?.profile?.full_name ?? '').split(' ')[0] || 'repartidor'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>
            <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
            {Number(courier?.profile?.rating ?? 5).toFixed(1).replace('.', ',')}
            {courier?.plate ? ` · ${courier.plate}` : ''}
          </div>
        </div>
      </header>

      <div className="sc" style={S.scroll}>
        {error && (
          <div style={S.errorBox}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {courier?.approval_status && courier.approval_status !== 'active' && (
          <div style={S.pendingBox}>
            <span className="ms" style={{ fontSize: 20, color: '#A8730B', flex: 'none' }}>schedule</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: '#7A5405' }}>
              Tu cuenta está {courier.approval_status === 'pending_review' ? 'en revisión' : 'inactiva'}.
              Hasta que TuraFood la apruebe no vas a recibir pedidos.
            </span>
          </div>
        )}

        {/* Ganado hoy + conexión */}
        <div style={S.hero}>
          <div style={S.heroGlow} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' }}>
              GANADO HOY
            </span>
            <span style={S.tierPill}>
              <span className="ms" style={{ fontSize: 14 }}>workspace_premium</span>
              {lvl.name}
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 7 }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38, letterSpacing: '-.03em' }}>
              {loading ? '…' : cop(today.total)}
            </span>
            {yesterday.total > 0 && (
              <span style={{ fontSize: 12.5, fontWeight: 800, color: delta >= 0 ? '#7BE0AE' : '#FFB0A0' }}>
                {`${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs. ayer`}
              </span>
            )}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 5, height: 40, marginTop: 16 }}>
            {days.map((d, i) => (
              <span
                key={i}
                style={{
                  flex: 1, borderRadius: '4px 4px 2px 2px',
                  height: `${Math.max(6, (d.total / chartMax) * 100)}%`,
                  background: i === days.length - 1
                    ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                    : 'rgba(255,255,255,.16)',
                }}
              />
            ))}
          </div>

          <div style={S.onlineRow}>
            <span style={{ ...S.onlineDot, background: online ? 'var(--green)' : 'rgba(255,255,255,.12)' }}>
              <span className="ms" style={{ fontSize: 19, color: online ? '#fff' : 'rgba(255,255,255,.45)' }}>
                {online ? 'bolt' : 'power_settings_new'}
              </span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800 }}>
                {online ? 'Estás en línea' : 'Desconectado'}
              </span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'rgba(255,255,255,.5)', marginTop: 1 }}>
                {online ? 'Recibiendo pedidos en Buenaventura' : 'Actívate para recibir pedidos'}
              </span>
            </span>
            <button
              onClick={() => setOnline(!online)}
              aria-label={online ? 'Desconectarme' : 'Conectarme'}
              style={{ ...S.track, background: online ? 'var(--green)' : 'rgba(255,255,255,.22)' }}
            >
              <span style={{ ...S.knob, transform: online ? 'translateX(23px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Nivel */}
        <div style={S.tierCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={S.tierIcon}>
              <span className="ms" style={{ fontSize: 20, color: '#A8730B' }}>workspace_premium</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{lvl.name}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                {lvl.next
                  ? `Te faltan ${lvl.to - (courier?.total_deliveries ?? 0)} entregas para ${lvl.next}`
                  : 'Estás en el nivel más alto'}
              </span>
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>
              {courier?.total_deliveries ?? 0}
            </span>
          </div>
          <div style={S.tierTrack}>
            <div style={{ height: '100%', borderRadius: 99, width: `${progress}%`, background: 'linear-gradient(90deg,#F0C97A,#D99A15)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 13 }}>
            {PERKS.map((p) => (
              <span key={p.icon} style={S.perk}>
                <span className="ms" style={{ fontSize: 19, color: p.fg }}>{p.icon}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25, color: 'var(--muted)' }}>
                  {p.label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Entrega en curso */}
        {active && (
          <button onClick={() => router.push('/repartidor/activo')} style={S.activeCard}>
            <span style={S.activeIcon}>
              <span className="ms ms-fill" style={{ fontSize: 22, color: '#fff' }}>two_wheeler</span>
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.05em' }}>
                ENTREGA EN CURSO
              </span>
              <span className="tr1" style={{ display: 'block', fontSize: 14.5, fontWeight: 700, marginTop: 3 }}>
                #{active.order_number} · {active.business?.name}
              </span>
            </span>
            <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>chevron_right</span>
          </button>
        )}

        {/* Bolsa de pedidos */}
        {!active && online && offers.map((o) => (
          <OfferCard
            key={o.id}
            order={o}
            busy={taking === o.id}
            onAccept={() => take(o)}
          />
        ))}

        {!active && online && offers.length === 0 && (
          <div style={S.stateCard}>
            <div style={S.spinner} />
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 17, marginTop: 16 }}>
              Buscando pedidos cerca
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}>
              Te avisamos apenas un negocio tenga uno listo.
            </div>
          </div>
        )}

        {!active && !online && (
          <div style={S.stateCard}>
            <span style={S.sleepIcon}>
              <span className="ms" style={{ fontSize: 26, color: 'var(--faint)' }}>bedtime</span>
            </span>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 17, marginTop: 16 }}>
              Estás desconectado
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}>
              Conéctate para empezar a recibir pedidos.
            </div>
          </div>
        )}

        {/* Indicadores del día */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 11, marginTop: 16 }}>
          {[
            { label: 'Ganado hoy', value: cop(today.total), icon: 'payments', fg: 'var(--primary)' },
            { label: 'Entregas', value: String(today.count), icon: 'check_circle', fg: 'var(--green)' },
            { label: 'Aceptación', value: `${Math.round(courier?.acceptance_rate ?? 100)}%`, icon: 'thumb_up', fg: 'var(--blue)' },
          ].map((t) => (
            <div key={t.label} style={S.stat}>
              <span className="ms" style={{ fontSize: 20, color: t.fg }}>{t.icon}</span>
              <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, marginTop: 9 }}>
                {t.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>{t.label}</div>
            </div>
          ))}
        </div>

        {/* Metas */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19 }}>Tu jornada</span>
        </div>
        <div style={S.goalsCard}>
          <Goal
            label={`Meta del día · ${cop(DAILY_GOAL)}`}
            value={cop(today.total)}
            pct={Math.min(100, (today.total / DAILY_GOAL) * 100)}
            color="var(--primary)"
            hint={today.total >= DAILY_GOAL
              ? '¡Meta cumplida! Todo lo de aquí en adelante es extra.'
              : `Te faltan ${cop(Math.max(0, DAILY_GOAL - today.total))} para cerrar la meta`}
          />
          <Goal
            label="Aceptación de pedidos"
            value={`${Math.round(courier?.acceptance_rate ?? 100)}%`}
            pct={Number(courier?.acceptance_rate ?? 100)}
            color="var(--green)"
            hint="Mantén más del 85% para conservar la prioridad"
          />
        </div>
      </div>
    </>
  );
}

function OfferCard({ order, busy, onAccept }) {
  const pay = Number(order.courier_earnings ?? 0);
  const tip = Number(order.tip ?? 0);

  return (
    <article className="anim-pop" style={S.offer}>
      <div style={S.offerHead}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.04em' }}>
          <span style={S.glowDot} />
          PEDIDO DISPONIBLE
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--muted)' }}>
          #{order.order_number}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30, letterSpacing: '-.02em' }}>
            {cop(pay)}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>
            {(order.items ?? []).reduce((a, i) => a + (i.quantity ?? 1), 0)} productos · {cop(order.total)} del pedido
          </span>
        </div>

        {tip > 0 && (
          <div style={S.tipPill}>
            <span className="ms" style={{ fontSize: 14 }}>volunteer_activism</span>
            Incluye {cop(tip)} de propina
          </div>
        )}

        {order.payment_method === 'cash' && (
          <div style={S.cashPill}>
            <span className="ms" style={{ fontSize: 14 }}>payments</span>
            Cobras {cop(order.total)} en efectivo al entregar
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', paddingTop: 3 }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--text)' }} />
              <span style={{ width: 2, height: 34, background: 'var(--border)' }} />
            </span>
            <span style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
              <span style={S.legLabel}>RECOGER EN</span>
              <span style={S.legName}>{order.business?.name ?? 'Negocio'}</span>
              <span style={S.legAddr}>{order.business?.address ?? ''}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--primary)', flex: 'none', marginTop: 3 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.legLabel}>ENTREGAR EN</span>
              <span style={S.legName}>{order.customer?.full_name ?? 'Cliente'}</span>
              <span style={S.legAddr}>{order.delivery_address ?? ''}</span>
            </span>
          </div>
        </div>

        <button onClick={onAccept} disabled={busy} style={S.acceptBtn}>
          {busy ? 'Tomando…' : 'Aceptar pedido'}
        </button>
      </div>
    </article>
  );
}

function Goal({ label, value, pct, color, hint }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, gap: 10 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={S.goalTrack}>
        <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color }} />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>{hint}</div>
    </div>
  );
}

const S = {
  header: {
    flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 12px',
  },
  avatar: {
    width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 14, color: 'var(--muted)', flex: 'none',
  },
  scroll: { flex: 1, overflowY: 'auto', padding: '6px 20px 108px', minHeight: 0 },
  hero: {
    borderRadius: 28, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 64%)',
    boxShadow: '0 18px 44px rgba(20,16,10,.22)',
  },
  heroGlow: {
    position: 'absolute', right: -44, top: -54, width: 190, height: 190, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(255,68,31,.36),rgba(255,68,31,0) 70%)',
  },
  tierPill: {
    display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px',
    borderRadius: 999, background: 'rgba(255,255,255,.1)', fontSize: 10.5,
    fontWeight: 800, letterSpacing: '.04em', color: '#F0C97A', flex: 'none',
  },
  onlineRow: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 16,
    paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.1)',
  },
  onlineDot: {
    width: 34, height: 34, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  track: { width: 54, height: 31, borderRadius: 99, padding: 3, display: 'flex', flex: 'none' },
  knob: {
    width: 25, height: 25, borderRadius: '50%', background: '#fff',
    transition: 'transform .22s cubic-bezier(.32,.72,0,1)',
  },
  tierCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24,
    padding: 16, marginTop: 12, boxShadow: 'var(--shadowSm)',
  },
  tierIcon: {
    width: 38, height: 38, borderRadius: 13, flex: 'none',
    background: 'linear-gradient(140deg,#FFF0CC,#F7DFA6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tierTrack: {
    height: 8, borderRadius: 99, background: 'var(--surface2)', marginTop: 13, overflow: 'hidden',
  },
  perk: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    background: 'var(--bg)', borderRadius: 13, padding: '11px 6px',
  },
  activeCard: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', marginTop: 14,
    background: 'var(--surface)', border: '1.5px solid var(--primary)', borderRadius: 20,
    padding: 15, boxShadow: '0 12px 34px rgba(255,68,31,.16)',
  },
  activeIcon: {
    width: 44, height: 44, borderRadius: 14, flex: 'none', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  offer: {
    marginTop: 14, background: 'var(--surface)', border: '1.5px solid var(--primary)',
    borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 34px rgba(255,68,31,.16)',
  },
  offerHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '13px 16px', background: 'linear-gradient(90deg,#FDF0EA,#FFF7F4)',
  },
  glowDot: {
    width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)',
    animation: 'glow 1s infinite',
  },
  tipPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
    background: '#E6F6EE', color: '#0B7A48', fontSize: 11.5, fontWeight: 800,
    padding: '5px 9px', borderRadius: 8,
  },
  cashPill: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 8,
    background: '#FFF7E6', color: '#7A5405', fontSize: 11.5, fontWeight: 800,
    padding: '7px 9px', borderRadius: 8,
  },
  legLabel: {
    display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em',
  },
  legName: { display: 'block', fontSize: 14, fontWeight: 700, marginTop: 2 },
  legAddr: { display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 },
  acceptBtn: {
    width: '100%', height: 52, borderRadius: 16, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15.5, marginTop: 18,
    boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  stateCard: {
    marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '30px 20px', textAlign: 'center', boxShadow: 'var(--shadowSm)',
  },
  spinner: {
    width: 52, height: 52, borderRadius: '50%', border: '3px solid var(--surface2)',
    borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite', margin: '0 auto',
  },
  sleepIcon: {
    width: 52, height: 52, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
  },
  stat: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 15, boxShadow: 'var(--shadowSm)', minWidth: 0,
  },
  goalsCard: {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
    padding: 16, marginTop: 11, boxShadow: 'var(--shadowSm)',
    display: 'flex', flexDirection: 'column', gap: 15,
  },
  goalTrack: {
    height: 8, borderRadius: 99, background: 'var(--surface2)', marginTop: 8, overflow: 'hidden',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  pendingBox: {
    display: 'flex', gap: 10, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: '#FFF7E6',
  },
};
