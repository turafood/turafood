'use client';

/**
 * INICIO DEL REPARTIDOR - REDISEÑO PRO
 * Modo claro/oscuro soportado, animaciones pulse, glassmorphism.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import {
  getAvailableOrders, acceptOrder, getDeliveries, earningsByDay, subscribeToAvailable,
} from '@/lib/repartidor';
import { useRider } from './RiderContext';

const DAILY_GOAL = 120000;

function level(deliveries = 0) {
  if (deliveries >= 1000) return { name: 'Nivel Platino', next: null, from: 1000, to: 1000 };
  if (deliveries >= 500) return { name: 'Nivel Oro', next: 'Platino', from: 500, to: 1000 };
  if (deliveries >= 150) return { name: 'Nivel Plata', next: 'Oro', from: 150, to: 500 };
  return { name: 'Nivel Bronce', next: 'Plata', from: 0, to: 150 };
}

const PERKS = [
  { icon: 'priority_high', label: 'Pedidos prioritarios', color: '#D99A15', bg: 'rgba(217, 154, 21, 0.1)' },
  { icon: 'savings', label: 'Bono semanal x1.3', color: '#25D366', bg: 'rgba(37, 211, 102, 0.1)' },
  { icon: 'support_agent', label: 'Soporte VIP', color: '#2E6BFF', bg: 'rgba(46, 107, 255, 0.1)' },
];

const initials = (name) =>
  String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function distanceOf(order) {
  if (order.distance_km) return Number(order.distance_km).toFixed(1).replace('.', ',');
  const pay = Number(order.courier_earnings ?? 0);
  return Math.max((pay - 4500) / 1500, 0.8).toFixed(1).replace('.', ',');
}

function minutesOf(order) {
  if (order.eta_minutes) return order.eta_minutes;
  const km = Number(String(distanceOf(order)).replace(',', '.'));
  return Math.round((km / 18) * 60 + 6);
}

export default function RepartidorHome() {
  const router = useRouter();
  const { courier, active, online, setOnline, loading, toast } = useRider();

  const [offers, setOffers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [taking, setTaking] = useState(null);
  const [error, setError] = useState(null);

  // DEMO MODE
  const [demoMode, setDemoMode] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!online && !demoMode) { setOffers([]); return; }
    if (demoMode) return; // Keep fake offer if in demo mode
    try {
      setOffers(await getAvailableOrders());
    } catch (err) {
      setError(err.message);
    }
  }, [online, demoMode]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  useEffect(() => {
    if (!online || demoMode) return undefined;
    return subscribeToAvailable(loadOffers);
  }, [online, loadOffers, demoMode]);

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

  const lvl = level(courier?.total_deliveries ?? 86); // Mocked for demo to 86
  const progress = lvl.next
    ? Math.min(100, (((courier?.total_deliveries ?? 86) - lvl.from) / (lvl.to - lvl.from)) * 100)
    : 100;

  const expire = useCallback((orderId) => {
    setOffers((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  const take = async (order) => {
    if (demoMode) {
      toast('Pedido DEMO aceptado');
      setOffers([]);
      setDemoMode(false);
      return;
    }
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

  const triggerDemo = () => {
    setOnline(true);
    setDemoMode(true);
    setOffers([{
      id: 'demo-123',
      courier_earnings: 9400,
      distance_km: 3.1,
      eta_minutes: 18,
      tip_amount: 2500,
      pickup: { name: 'Asadero El Puerto', address: 'Cra. 3 # 4-58, Centro' },
      dropoff: { name: 'Sharick G.', address: 'Cl. 8 # 52-14, Punta del Este' },
      created_at: new Date().toISOString()
    }]);
  };

  return (
    <>
      <style>{`
        .sc { overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(150,150,150,0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(150,150,150,0.4); }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(255,68,31,0.4); }
          70% { box-shadow: 0 0 0 20px rgba(255,68,31,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,68,31,0); }
        }
        .pulse-active { animation: pulse-ring 2s infinite cubic-bezier(0.2,0,0,1); }
        .glass-panel {
          background: var(--surface2);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid var(--border);
          border-radius: 28px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .pro-card {
           background: linear-gradient(145deg, #1A1A1A, #111111);
           border: 1px solid rgba(255,255,255,0.08);
           position: relative; overflow: hidden;
        }
        .pro-card::before {
           content: "";
           position: absolute; right: 0; top: 0; bottom: 0; width: 100px;
           background: radial-gradient(ellipse at right, rgba(255,68,31,0.15) 0%, transparent 70%);
           pointer-events: none;
        }
        html[data-theme='light'] .pro-card {
           background: #1A1A1A; /* Mantiene la hero oscura en modo claro como en el screenshot */
        }
        .timer-circle circle {
          transition: stroke-dashoffset 1s linear;
        }
      `}</style>

      {/* Cabecera */}
      <header style={S.header}>
        <div style={S.avatar}>{initials(courier?.profile?.full_name)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tr1" style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
            Hola, {String(courier?.profile?.full_name ?? '').split(' ')[0] || 'Yeison'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)', fontWeight: 700, marginTop: 1 }}>
            <span className="ms ms-fill" style={{ fontSize: 14, color: 'var(--amber)' }}>star</span>
            {Number(courier?.profile?.rating ?? 4.9).toFixed(1).replace('.', ',')}
            {` · ${courier?.plate || 'Moto WQR-18C'}`}
          </div>
        </div>
        <button style={S.iconBtn}>
          <span className="ms" style={{ fontSize: 22, color: 'var(--text)' }}>notifications</span>
        </button>
      </header>

      <div className="sc" style={S.scroll}>
        {error && (
          <div style={S.errorBox}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <button onClick={triggerDemo} style={S.demoBtn}>
           <span className="ms" style={{ fontSize: 16 }}>play_circle</span>
           Probar Modo DEMO
        </button>

        {courier?.approval_status && courier.approval_status !== 'active' && !demoMode && (
          <div style={S.pendingBox}>
            <span className="ms" style={{ fontSize: 20, color: '#A8730B', flex: 'none' }}>schedule</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.45, color: '#7A5405' }}>
              Tu cuenta está {courier.approval_status === 'pending_review' ? 'en revisión' : 'inactiva'}.
              Hasta que TuraFood la apruebe no vas a recibir pedidos.
            </span>
          </div>
        )}

        {/* Ganado hoy + conexión (PRO CARD OSCURA) */}
        <div className="pro-card" style={S.hero}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' }}>
              GANADO HOY
            </span>
            <span style={S.tierPill}>
              <span className="ms ms-fill" style={{ fontSize: 14, color: '#F0C97A' }}>workspace_premium</span>
              <span style={{ color: '#F0C97A' }}>{lvl.name}</span>
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 7 }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 42, letterSpacing: '-.03em', color: '#fff' }}>
              {loading && !demoMode ? '…' : cop(today.total || 84300)}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#7BE0AE' }}>
              +18% vs. ayer
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 6, height: 44, marginTop: 20 }}>
            {[30, 40, 25, 60, 45, 80, 100].map((val, i, arr) => (
              <span
                key={i}
                style={{
                  flex: 1, borderRadius: '4px 4px 2px 2px',
                  height: `${Math.max(10, val)}%`,
                  background: i === arr.length - 1
                    ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                    : 'rgba(255,255,255,.1)',
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
              <span style={{ display: 'block', fontSize: 15, fontWeight: 800, color: '#fff' }}>
                {online ? 'Estás en línea' : 'Estás desconectado'}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 2, fontWeight: 600 }}>
                {online ? 'Recibiendo pedidos en zona Centro' : 'Conéctate para empezar a recibir pedidos.'}
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

        {/* Nivel (Glass Panel) */}
        <div className="glass-panel" style={S.tierCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={S.tierIcon}>
              <span className="ms ms-fill" style={{ fontSize: 24, color: '#A8730B' }}>workspace_premium</span>
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: 'var(--text)' }}>{lvl.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2, fontWeight: 600 }}>
                {lvl.next
                  ? `Te faltan ${lvl.to - (courier?.total_deliveries ?? 86)} entregas para llegar a ${lvl.next}`
                  : 'Estás en el nivel más alto'}
              </span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted)', flex: 'none' }}>
              {courier?.total_deliveries ?? 86} <span style={{ color: 'var(--faint)' }}>/ {lvl.to}</span>
            </span>
          </div>
          <div style={S.tierTrack}>
            <div style={{ height: '100%', borderRadius: 99, width: `${progress}%`, background: 'linear-gradient(90deg,#F0C97A,#D99A15)' }} />
          </div>
          
          {/* Perks (Botones Píldora) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {PERKS.map((p) => (
              <div key={p.label} style={S.perk}>
                <span className="ms" style={{ fontSize: 18, color: p.color }}>{p.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>{p.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Órdenes Disponibles / Buscando */}
        {online && offers.length === 0 && (
           <div style={S.searching}>
              <div className="pulse-active" style={S.radarDot} />
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Buscando pedidos cerca</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>
                 Te avisamos apenas un negocio tenga uno listo.
              </div>
           </div>
        )}

        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} taking={taking} onTake={take} onExpire={expire} />
        ))}
        
        <div style={{ height: 100 }} /> {/* Espacio para fab/tabs */}
      </div>
    </>
  );
}

/**
 * TARJETA DE NUEVO PEDIDO
 */
function OfferCard({ offer, taking, onTake, onExpire }) {
  const [left, setLeft] = useState(30);
  
  useEffect(() => {
    let alive = true;
    const end = new Date(offer.created_at).getTime() + 30000;
    const tick = () => {
      const ms = end - Date.now();
      if (ms <= 0) {
        if (alive) onExpire(offer.id);
      } else {
        if (alive) {
          setLeft(Math.ceil(ms / 1000));
          window.requestAnimationFrame(tick);
        }
      }
    };
    tick();
    return () => { alive = false; };
  }, [offer, onExpire]);

  const dash = 113; // 2 * pi * 18
  const offset = dash - (left / 30) * dash;

  const take = () => {
    if (taking) return;
    onTake(offer);
  };

  const tip = Number(offer.tip_amount ?? 0);
  const pay = Number(offer.courier_earnings ?? 0) + tip;
  const mins = minutesOf(offer);

  return (
    <div className="anim-pop" style={S.offer}>
      <div style={S.offerHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)' }}>
           <div className="pulse-active" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
           <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.05em' }}>NUEVO PEDIDO</span>
        </div>
        <div style={S.timer}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={S.timerSvg}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,68,31,0.15)" strokeWidth="3" />
            <circle
              className="timer-circle"
              cx="20" cy="20" r="18" fill="none"
              stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={dash} strokeDashoffset={offset}
            />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', position: 'relative', zIndex: 2 }}>{left}</span>
        </div>
      </div>

      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 34, letterSpacing: '-.02em', color: 'var(--text)' }}>
            {cop(pay)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
            {distanceOf(offer)} km · {mins} min
          </span>
        </div>

        {tip > 0 && (
          <div style={S.tipTag}>
            <span className="ms" style={{ fontSize: 16 }}>local_atm</span>
            Incluye {cop(tip)} de propina
          </div>
        )}

        <div style={S.route}>
          <div style={S.stop}>
            <span style={S.dot} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.stopLabel}>RECOGER EN</div>
              <div style={S.stopName}>{offer.pickup?.name}</div>
              <div style={S.stopAddr}>{offer.pickup?.address}</div>
            </div>
          </div>
          <div style={S.stopLine} />
          <div style={S.stop}>
            <span style={{ ...S.dot, background: 'var(--primary)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.stopLabel}>ENTREGAR EN</div>
              <div style={S.stopName}>{offer.dropoff?.name}</div>
              <div style={S.stopAddr}>{offer.dropoff?.address}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
         <button onClick={take} disabled={taking === offer.id} style={S.acceptBtn}>
           {taking === offer.id ? 'Aceptando...' : 'Aceptar'}
         </button>
      </div>
    </div>
  );
}

const S = {
  header: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
  },
  iconBtn: {
     width: 44, height: 44, borderRadius: '50%',
     background: 'var(--surface2)', border: '1px solid var(--border)',
     display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
  },
  avatar: {
    width: 44, height: 44, borderRadius: 16, background: '#F1F1F1', color: '#555',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 800,
  },
  scroll: { flex: 1, padding: '0 20px', position: 'relative' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
  pendingBox: {
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '16px',
    borderRadius: 18, background: '#FFF7E6', border: '1px solid #F7DFA6',
  },
  demoBtn: {
     display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
     borderRadius: 12, background: 'rgba(0,0,0,0.05)', color: 'var(--text)',
     fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none', marginBottom: 20, width: '100%', justifyContent: 'center'
  },
  hero: {
    borderRadius: 24, padding: '24px', color: '#fff',
    marginBottom: 20,
  },
  tierPill: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    borderRadius: 10, background: 'rgba(255,255,255,.08)',
    fontSize: 11, fontWeight: 800,
  },
  onlineRow: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 20,
    borderTop: '1px solid rgba(255,255,255,.08)',
  },
  onlineDot: {
    width: 32, height: 32, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  track: {
    width: 52, height: 32, borderRadius: 99, flex: 'none',
    display: 'flex', alignItems: 'center', padding: '0 4px', cursor: 'pointer',
    border: 'none', transition: 'background .3s',
  },
  knob: {
    width: 24, height: 24, borderRadius: '50%', background: '#fff',
    transition: 'transform .3s cubic-bezier(0.2,0,0,1)',
  },
  tierCard: {
    padding: '24px', marginBottom: 20,
  },
  tierIcon: {
    width: 48, height: 48, borderRadius: 16, flex: 'none',
    background: 'linear-gradient(140deg,#FFF0CC,#F7DFA6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(168, 115, 11, 0.2)'
  },
  tierTrack: {
    height: 6, borderRadius: 99, marginTop: 20, overflow: 'hidden',
    background: 'var(--surface)', border: '1px solid var(--border)'
  },
  perk: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    padding: '16px 8px', borderRadius: 16, background: 'var(--bg)',
    border: '1px solid var(--border)'
  },
  searching: {
     display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
     padding: '60px 20px', textAlign: 'center'
  },
  radarDot: {
     width: 30, height: 30, borderRadius: '50%', border: '4px solid var(--primary)',
     marginBottom: 24
  },
  offer: {
    background: 'var(--surface2)', borderRadius: 28, overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0,0,0,0.1)', border: '1px solid var(--primary)',
    marginBottom: 20, position: 'relative'
  },
  offerHead: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 10px', background: 'var(--bg)'
  },
  timer: {
    position: 'relative', width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  timerSvg: {
    position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)',
  },
  tipTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
    background: 'rgba(37,211,102,0.1)', color: '#0B8E54', borderRadius: 99,
    fontSize: 12, fontWeight: 800, marginTop: 12,
  },
  route: { marginTop: 24, position: 'relative' },
  stop: { display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 2 },
  stopLine: {
    position: 'absolute', left: 5, top: 20, bottom: 20, width: 2,
    background: 'var(--border)', zIndex: 1,
  },
  dot: {
    width: 12, height: 12, borderRadius: '50%', background: 'var(--text)',
    border: '2px solid var(--surface2)', marginTop: 4,
  },
  stopLabel: { fontSize: 10, fontWeight: 800, letterSpacing: '.05em', color: 'var(--muted)' },
  stopName: { fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 4 },
  stopAddr: { fontSize: 12, color: 'var(--muted)', marginTop: 2 },
  acceptBtn: {
     width: '100%', height: 56, borderRadius: 16, background: 'var(--primary)',
     color: '#fff', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer',
     boxShadow: '0 8px 24px rgba(255,68,31,0.3)'
  }
};
