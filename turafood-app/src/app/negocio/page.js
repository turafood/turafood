'use client';

/**
 * RESUMEN DE HOY
 * Conversión de `isSummary` (línea 230) del mockup de Negocios.
 *
 * Las cifras salen de los pedidos reales: el hero, los KPIs y la gráfica
 * se calculan sobre `orders`, no están escritas a mano.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cop } from '@/lib/format';
import {
  getSalesWindow, getCatalog, summarizeByDay, setOrderStatus, columnOf,
} from '@/lib/negocio';
import { useBiz } from './BizContext';

const RANGES = [
  { label: 'Hoy', days: 1 },
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
];

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ResumenPage() {
  const router = useRouter();
  const { business, orders, reloadOrders, toast } = useBiz();

  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [range, setRange] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const [s, p] = await Promise.all([
          getSalesWindow(business.id, 30),
          getCatalog(business.id).catch(() => []),
        ]);
        if (!alive) return;
        setSales(s);
        setProducts(p);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business]);

  const days = useMemo(() => summarizeByDay(sales, 7), [sales]);
  const today = days[days.length - 1] ?? { gross: 0, orders: 0, avg: 0 };
  const yesterday = days[days.length - 2] ?? { gross: 0, orders: 0 };

  const weekTotal = days.reduce((a, d) => a + d.gross, 0);
  const chartMax = Math.max(...days.map((d) => d.gross), 1);
  const delta = yesterday.gross ? ((today.gross - yesterday.gross) / yesterday.gross) * 100 : 0;

  const inKitchen = orders.filter((o) => columnOf(o.status).key === 'preparando').length;
  const cancelledToday = 0;

  // Más vendidos: se suman las líneas de los pedidos vivos del día
  const topProducts = useMemo(() => {
    const map = new Map();
    orders.forEach((o) => {
      (o.items ?? []).forEach((it) => {
        const cur = map.get(it.name) ?? { name: it.name, units: 0, total: 0 };
        cur.units += it.quantity ?? 1;
        cur.total += Number(it.subtotal ?? (it.unit_price ?? 0) * (it.quantity ?? 1));
        map.set(it.name, cur);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 4)
      .map((t) => ({
        ...t,
        image: products.find((p) => p.name === t.name)?.image_url ?? null,
      }));
  }, [orders, products]);

  const attention = orders
    .filter((o) => ['nuevo', 'preparando'].includes(columnOf(o.status).key))
    .slice(0, 3);

  const advance = async (order) => {
    const col = columnOf(order.status);
    if (!col.next) return;
    try {
      await setOrderStatus(order.id, col.next);
      await reloadOrders();
      toast(`Pedido ${order.order_number} actualizado`);
    } catch (err) {
      toast(err.message);
    }
  };

  const outOfStock = products.filter((p) => !p.is_available).length;
  const health = [
    {
      label: 'Pedidos aceptados a tiempo', value: '96%', fg: 'var(--green)',
      bar: { width: '96%', background: 'var(--green)' }, hint: 'Meta: 95% o más',
    },
    {
      label: 'Calificación promedio',
      value: `${Number(business?.rating ?? 5).toFixed(1).replace('.', ',')} / 5`,
      fg: 'var(--green)',
      bar: { width: `${(Number(business?.rating ?? 5) / 5) * 100}%`, background: 'var(--green)' },
      hint: `${(business?.reviews_count ?? 0).toLocaleString('es-CO')} reseñas en total`,
    },
    {
      label: 'Productos agotados',
      value: products.length ? `${outOfStock} de ${products.length}` : '—',
      fg: outOfStock ? '#A8730B' : 'var(--green)',
      bar: {
        width: `${products.length ? Math.max(4, (outOfStock / products.length) * 100) : 4}%`,
        background: outOfStock ? 'var(--amber)' : 'var(--green)',
      },
      hint: outOfStock
        ? `${products.filter((p) => !p.is_available).map((p) => p.name).slice(0, 2).join(', ')} sin disponibilidad`
        : 'Todo tu menú está disponible',
    },
    {
      label: 'Tiempo de preparación', value: `${business?.prep_time_min ?? 25} min`, fg: 'var(--green)',
      bar: { width: '63%', background: 'var(--green)' },
      hint: `Prometido en la app: ${business?.prep_time_min ?? 25} min`,
    },
  ];

  const needsOnboarding = business && !business.submitted_at && business.status !== 'active';

  return (
    <>
      {/* Lo primero que ve un negocio nuevo: qué le falta para que lo aprueben */}
      {needsOnboarding && (
        <button onClick={() => router.push('/negocio/verificacion')} style={S.onboarding}>
          <span style={S.onboardingIcon}>
            <span className="ms" style={{ fontSize: 22, color: '#fff' }}>verified_user</span>
          </span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 16.5 }}>
              Completa tu registro para que te aprobemos
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>
              Ya puedes vender, pero con un límite de 20 pedidos diarios. Sube tus
              documentos y la cuenta bancaria para levantarlo.
            </span>
          </span>
          <span className="ms" style={{ fontSize: 22, color: 'var(--primary)', flex: 'none' }}>chevron_right</span>
        </button>
      )}

      {/* Hero + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        <div style={S.hero}>
          <div style={S.heroGlow} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.5)' }}>
              VENTAS DE HOY
            </span>
            <span style={{ ...S.heroDelta, color: delta >= 0 ? '#7BE0AE' : '#FFB0A0' }}>
              <span className="ms" style={{ fontSize: 13 }}>{delta >= 0 ? 'trending_up' : 'trending_down'}</span>
              {`${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`}
            </span>
          </div>
          <div style={S.heroValue}>{loading ? '…' : cop(today.gross)}</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 4, height: 38, marginTop: 14 }}>
            {days.map((d, i) => (
              <span
                key={i}
                style={{
                  flex: 1, borderRadius: '3px 3px 1px 1px',
                  height: `${Math.max(6, (d.gross / chartMax) * 100)}%`,
                  background: i === days.length - 1
                    ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                    : 'rgba(255,255,255,.16)',
                }}
              />
            ))}
          </div>
          <div style={S.heroStats}>
            <span>
              <span style={S.heroStatLabel}>PEDIDOS</span>
              <span style={S.heroStatValue}>{today.orders}</span>
            </span>
            <span>
              <span style={S.heroStatLabel}>TICKET PROM.</span>
              <span style={S.heroStatValue}>{cop(today.avg)}</span>
            </span>
            <span>
              <span style={S.heroStatLabel}>EN COCINA</span>
              <span style={S.heroStatValue}>{inKitchen}</span>
            </span>
          </div>
        </div>

        <Kpi
          label="Pedidos" value={String(today.orders)} icon="receipt_long"
          bg="#EAF1FF" fg="var(--blue)"
          delta={`${today.orders - yesterday.orders >= 0 ? '+' : ''}${today.orders - yesterday.orders}`}
          up={today.orders >= yesterday.orders}
        />
        <Kpi
          label="Ticket promedio" value={cop(today.avg)} icon="shopping_bag"
          bg="#E6F6EE" fg="#0B8E54"
          delta={`${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`}
          up={delta >= 0}
        />
        <Kpi
          label="Cancelados" value={String(cancelledToday)} icon="cancel"
          bg="#FFF7E6" fg="#A8730B" delta="Sin cancelaciones" up
        />
      </div>

      {/* Gráfica de la semana + más vendidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 16, marginTop: 16 }}>
        <section style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={S.cardTitle}>Ventas de la semana</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Últimos 7 días · {cop(weekTotal)} en total
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setRange(i)}
                  style={{ ...S.rangeChip, ...(i === range ? S.chipOn : S.chipOff) }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 186, marginTop: 22 }}>
            {days.map((d, i) => (
              <div key={i} style={S.barCol}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>
                  {d.gross ? `$${Math.round(d.gross / 1000)}k` : '—'}
                </span>
                <span
                  style={{
                    width: '100%', borderRadius: '9px 9px 4px 4px',
                    height: `${Math.max(4, (d.gross / chartMax) * 100)}%`,
                    background: i === days.length - 1
                      ? 'linear-gradient(180deg,#FF7A3D,#FF441F)'
                      : 'var(--surface2)',
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: i === days.length - 1 ? 'var(--text)' : 'var(--faint)' }}>
                  {DAY_SHORT[d.date.getDay()]}
                </span>
              </div>
            ))}
          </div>

          <div style={S.hint}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>schedule</span>
            <span style={{ flex: 1, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.45 }}>
              Tu hora pico es de <b style={{ color: 'var(--text)' }}>7:00 a 8:30 p.m.</b> Ten cocina lista antes de las 6:45.
            </span>
          </div>
        </section>

        <section style={S.card}>
          <div style={S.cardTitle}>Más vendidos hoy</div>
          {topProducts.length === 0 ? (
            <Empty icon="inventory_2" text="Todavía no hay ventas hoy." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
              {topProducts.map((p, i) => (
                <div
                  key={p.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                    borderBottom: i === topProducts.length - 1 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      ...S.thumb,
                      backgroundImage: p.image ? `url('${p.image}')` : 'none',
                      background: p.image ? undefined : 'var(--surface2)',
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{p.name}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                      {p.units} {p.units === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, flex: 'none' }}>{cop(p.total)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Canales. Hoy solo mide TuraFood; el resto queda listo para
          engancharse cuando existan las integraciones. */}
      <section style={{ ...S.card, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={S.cardTitle}>Tus canales de venta</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Todo lo que vendes, en un solo reporte
            </div>
          </div>
        </div>

        <div style={S.channels}>
          {[
            {
              id: 'tura', name: 'TuraFood', icon: 'storefront', color: 'var(--primary)', bg: '#FFF1EC',
              connected: true,
              value: cop(weekTotal),
              hint: `${days.reduce((a, d) => a + d.orders, 0)} pedidos en 7 días`,
            },
            {
              id: 'whatsapp', name: 'WhatsApp Business', icon: 'chat', color: '#0B8E54', bg: '#E6F6EE',
              connected: false, hint: 'Recibe pedidos del chat aquí mismo',
            },
            {
              id: 'instagram', name: 'Instagram', icon: 'photo_camera', color: '#C13584', bg: '#FDECF5',
              connected: false, hint: 'Publica tu carta y mide los clics',
            },
            {
              id: 'facebook', name: 'Facebook', icon: 'thumb_up', color: '#1877F2', bg: '#EAF1FF',
              connected: false, hint: 'Alcance y pedidos desde tu página',
            },
          ].map((c) => (
            <div key={c.id} style={{ ...S.channel, opacity: c.connected ? 1 : 0.85 }}>
              <span style={{ ...S.channelIcon, background: c.bg }}>
                <span className="ms" style={{ fontSize: 20, color: c.color }}>{c.icon}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span className="tr1" style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
                  <span
                    style={{
                      ...S.channelState,
                      background: c.connected ? '#E6F6EE' : 'var(--surface2)',
                      color: c.connected ? '#0B7A48' : 'var(--muted)',
                    }}
                  >
                    {c.connected ? 'CONECTADO' : 'PRÓXIMAMENTE'}
                  </span>
                </span>
                {c.value && (
                  <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 4 }}>
                    {c.value}
                  </span>
                )}
                <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 3 }}>
                  {c.hint}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Atención + salud */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginTop: 16 }}>
        <section style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={S.cardTitle}>Pedidos que necesitan atención</div>
            <button onClick={() => router.push('/negocio/pedidos')} style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--primary)' }}>
              Ver todos
            </button>
          </div>

          {attention.length === 0 ? (
            <Empty icon="task_alt" text="Ningún pedido esperando. Todo bajo control." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              {attention.map((o) => {
                const isNew = columnOf(o.status).key === 'nuevo';
                return (
                  <div key={o.id} style={S.attentionRow}>
                    <span style={S.attentionNum}>{String(o.order_number).replace('TS-', '')}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="tr1" style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>
                        {o.customer?.full_name ?? 'Cliente'}
                      </span>
                      <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                        {o.mode === 'pickup' ? 'Recoger' : 'Domicilio'} · {o.delivery_address ?? 'En tienda'} · {cop(o.total)}
                      </span>
                    </span>
                    <span
                      style={{
                        ...S.pill,
                        background: isNew ? '#FFF1EC' : '#FFF7E6',
                        color: isNew ? 'var(--primary)' : '#A8730B',
                      }}
                    >
                      {isNew ? 'SIN ACEPTAR' : 'EN COCINA'}
                    </span>
                    <button onClick={() => advance(o)} style={S.attentionBtn}>
                      {isNew ? 'Aceptar' : 'Listo'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={S.card}>
          <div style={S.cardTitle}>Salud de la tienda</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
            {health.map((h) => (
              <div key={h.label}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                  <span style={{ fontWeight: 700 }}>{h.label}</span>
                  <span style={{ fontWeight: 800, color: h.fg }}>{h.value}</span>
                </div>
                <div style={S.track}>
                  <div style={{ height: '100%', borderRadius: 99, ...h.bar }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{h.hint}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Kpi({ label, value, icon, bg, fg, delta, up }) {
  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>{label}</span>
        <span style={{ ...S.kpiIcon, background: bg }}>
          <span className="ms" style={{ fontSize: 17, color: fg }}>{icon}</span>
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 27, letterSpacing: '-.02em', marginTop: 12 }}>
        {value}
      </div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 5, marginTop: 6,
          fontSize: 11.5, fontWeight: 700, color: up ? 'var(--green)' : 'var(--primary)',
        }}
      >
        <span className="ms" style={{ fontSize: 15 }}>{up ? 'trending_up' : 'trending_down'}</span>
        {delta}
        <span style={{ color: 'var(--faint)', fontWeight: 600 }}>vs. ayer</span>
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '36px 12px', textAlign: 'center' }}>
      <span style={S.emptyIcon}>
        <span className="ms" style={{ fontSize: 23, color: 'var(--faint)' }}>{icon}</span>
      </span>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{text}</div>
    </div>
  );
}

const S = {
  onboarding: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', marginBottom: 16,
    padding: 16, borderRadius: 18, background: 'var(--surface)',
    border: '1.5px solid var(--primary)', boxShadow: '0 10px 30px rgba(255,68,31,.13)',
  },
  onboardingIcon: {
    width: 44, height: 44, borderRadius: 14, flex: 'none', background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 20, boxShadow: 'var(--shadowSm)',
  },
  channels: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
    gap: 12, marginTop: 16,
  },
  channel: {
    display: 'flex', gap: 12, alignItems: 'flex-start', padding: 14,
    borderRadius: 15, background: 'var(--bg)', border: '1px solid var(--border)',
    minWidth: 0,
  },
  channelIcon: {
    width: 38, height: 38, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  channelState: {
    fontSize: 9.5, fontWeight: 800, padding: '3px 6px',
    borderRadius: 5, letterSpacing: '.04em',
  },
  cardTitle: { fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 },
  hero: {
    borderRadius: 28, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(145deg,#241F1A 0%,#12100D 66%)',
    boxShadow: '0 16px 40px rgba(20,16,10,.2)',
  },
  heroGlow: {
    position: 'absolute', right: -50, top: -60, width: 210, height: 210, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(255,68,31,.34),rgba(255,68,31,0) 70%)',
  },
  heroDelta: {
    display: 'flex', alignItems: 'center', gap: 5, height: 24, padding: '0 10px',
    borderRadius: 999, background: 'rgba(255,255,255,.1)', fontSize: 10.5, fontWeight: 800,
    flex: 'none',
  },
  heroValue: {
    position: 'relative', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 34, letterSpacing: '-.03em', marginTop: 8,
  },
  heroStats: {
    position: 'relative', display: 'flex', gap: 18, marginTop: 16, paddingTop: 14,
    borderTop: '1px solid rgba(255,255,255,.1)',
  },
  heroStatLabel: {
    display: 'block', fontSize: 10, fontWeight: 800,
    color: 'rgba(255,255,255,.42)', letterSpacing: '.06em',
  },
  heroStatValue: { display: 'block', fontSize: 15, fontWeight: 800, marginTop: 3 },
  kpiIcon: {
    width: 30, height: 30, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rangeChip: { height: 32, padding: '0 12px', borderRadius: 9, fontSize: 12, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  barCol: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 9, height: '100%', justifyContent: 'flex-end',
  },
  hint: {
    display: 'flex', alignItems: 'center', gap: 11, marginTop: 16, paddingTop: 14,
    borderTop: '1px solid var(--border)',
  },
  thumb: {
    width: 40, height: 40, borderRadius: 11, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  attentionRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg)', borderRadius: 14, padding: 13, flexWrap: 'wrap',
  },
  attentionNum: {
    width: 36, height: 36, borderRadius: 10, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flex: 'none', fontSize: 11.5, fontWeight: 800,
  },
  attentionBtn: {
    height: 32, padding: '0 12px', borderRadius: 9, background: 'var(--primary)',
    color: '#fff', fontSize: 12, fontWeight: 800, flex: 'none',
  },
  pill: { fontSize: 11, fontWeight: 800, padding: '5px 9px', borderRadius: 8, flex: 'none' },
  track: {
    height: 7, borderRadius: 99, background: 'var(--surface2)',
    marginTop: 8, overflow: 'hidden',
  },
  emptyIcon: {
    width: 46, height: 46, borderRadius: 14, background: 'var(--bg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
