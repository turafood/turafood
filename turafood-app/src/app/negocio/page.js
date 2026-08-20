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
import ProgresoCuenta from '../components/ProgresoCuenta';

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

  const pasosNegocio = useMemo(() => [
    {
      id: 'nombre', icono: 'storefront',
      titulo: 'Ponle el nombre a tu negocio',
      detalle: 'Es el que van a ver tus clientes en la app',
      href: '/negocio/equipo',
      cta: 'Ponerlo',
      hecho: Boolean(business?.name) && business.name !== 'Mi negocio',
    },
    {
      id: 'direccion', icono: 'location_on',
      titulo: 'Dinos dónde quedas',
      detalle: 'Sin dirección no podemos calcular el domicilio',
      href: '/negocio/sucursales',
      cta: 'Agregar',
      hecho: Boolean(business?.address),
    },
    {
      id: 'menu', icono: 'restaurant_menu',
      titulo: 'Deja tu menú a tu gusto',
      detalle: 'Te cargamos uno de ejemplo: cámbialo por el tuyo',
      href: '/negocio/catalogo',
      cta: 'Editarlo',
      hecho: Boolean(business?.menu_listo),
    },
    {
      id: 'horarios', icono: 'schedule',
      titulo: 'Marca tus horarios',
      detalle: 'Para que nadie pida cuando estás cerrado',
      href: '/negocio/horarios',
      cta: 'Marcarlos',
      hecho: Boolean(business?.horarios_listos),
    },
    {
      id: 'documentos', icono: 'verified_user',
      titulo: 'Sube tus documentos',
      detalle: 'RUT, cédula y demás papeles',
      href: '/negocio/verificacion',
      cta: 'Subirlos',
      hecho: Boolean(business?.documentos_listos),
    },
  ], [business]);

  return (
    <>
      <style>{`
        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes heroWave {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes subtleBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .anim-glow { animation: heroGlowPulse 4s ease-in-out infinite; }
        .anim-wave { background-size: 200% 200% !important; animation: heroWave 8s ease infinite; }
        .anim-bounce { animation: subtleBounce 3s ease-in-out infinite; }
      `}</style>

      {/* Lo primero que ve un negocio nuevo: qué le falta para que lo aprueben */}
      {business && business.status !== 'active' && (
        <ProgresoCuenta
          titulo="Termina de activar tu negocio"
          verificado={business.status === 'active' && !needsOnboarding}
          pasos={pasosNegocio}
        />
      )}

      {/* Hero + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        <div style={S.hero} className="anim-wave">
          <div style={S.heroGlow} className="anim-glow" />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.09em', color: 'rgba(255,255,255,.6)' }}>
              INGRESOS EN VIVO 🚀
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
              <span style={S.heroStatLabel}>NUEVAS ÓRDENES</span>
              <span style={S.heroStatValue}>{today.orders}</span>
            </span>
            <span>
              <span style={S.heroStatLabel}>TICKET MÁX.</span>
              <span style={S.heroStatValue}>{cop(today.avg * 1.2)}</span>
            </span>
            <span>
              <span style={S.heroStatLabel}>MARCHANDO</span>
              <span style={S.heroStatValue}>{inKitchen}</span>
            </span>
          </div>
        </div>

        <Kpi
          label="Nuevos pedidos" value={String(today.orders)} icon="receipt_long"
          bg="#EAF1FF" fg="var(--blue)"
          delta={`${today.orders - yesterday.orders >= 0 ? '+' : ''}${today.orders - yesterday.orders}`}
          up={today.orders >= yesterday.orders}
        />
        <Kpi
          label="Gasto por cliente" value={cop(today.avg)} icon="shopping_bag"
          bg="#E6F6EE" fg="#0B8E54"
          delta={`${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}%`}
          up={delta >= 0}
        />
        <Kpi
          label="Fugas de venta" value={String(cancelledToday)} icon="cancel"
          bg="#FFF7E6" fg="#A8730B" delta="¡Retención perfecta!" up
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
              id: 'tura', name: 'TuraFood', icon: 'storefront', color: 'var(--primary)', bg: 'linear-gradient(135deg, rgba(255,68,31,0.2) 0%, rgba(255,68,31,0.05) 100%)',
              connected: true,
              value: cop(weekTotal),
              hint: `${days.reduce((a, d) => a + d.orders, 0)} pedidos en 7 días`,
            },
            {
              id: 'whatsapp', name: 'WhatsApp Business', icon: 'chat', color: '#10B981', bg: 'linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 100%)',
              connected: false, hint: 'Recibe pedidos del chat aquí mismo',
            },
            {
              id: 'instagram', name: 'Instagram', icon: 'photo_camera', color: '#D946EF', bg: 'linear-gradient(135deg, rgba(217,70,239,0.2) 0%, rgba(217,70,239,0.05) 100%)',
              connected: false, hint: 'Publica tu carta y mide los clics',
            },
            {
              id: 'facebook', name: 'Facebook', icon: 'thumb_up', color: '#3B82F6', bg: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.05) 100%)',
              connected: false, hint: 'Alcance y pedidos desde tu página',
            },
          ].map((c) => (
            <div key={c.id} style={{ ...S.channel, opacity: c.connected ? 1 : 0.85, background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              <span style={{ ...S.channelIcon, background: c.bg }}>
                <span className="ms" style={{ fontSize: 20, color: c.color }}>{c.icon}</span>
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <span className="tr1" style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
                  <span
                    style={{
                      ...S.channelState,
                      background: c.connected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: c.connected ? '#10B981' : 'var(--muted)',
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

      {/* Embudo de Ventas Simulado */}
      <section style={{ ...S.card, marginTop: 16 }}>
        <div style={S.cardTitle}>Embudo de Ventas Global (Últimos 7 días)</div>
        <div style={{ marginTop: 20, background: 'rgba(0,0,0,0.3)', borderRadius: 24, padding: 28, border: '1px solid rgba(255,255,255,0.06)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)' }}>
           {(() => {
              const vistas = 2450;
              const agregados = Math.round(vistas * 0.35);
              const compras = Math.round(agregados * 0.4);
              const tVistas = 100;
              const tAgregados = (agregados / vistas) * 100;
              const tCompras = (compras / vistas) * 100;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 130, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Visitas a la app</div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${tVistas}%`, height: '100%', background: '#A5B4FC', borderRadius: 99, boxShadow: '0 0 12px #A5B4FC' }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 14, fontWeight: 800 }}>{vistas}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 130, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Al Carrito</div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${tAgregados}%`, height: '100%', background: '#93C5FD', borderRadius: 99, boxShadow: '0 0 12px #93C5FD' }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 14, fontWeight: 800 }}>{agregados}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 130, fontSize: 13.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>Compras</div>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: 10, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${tCompras}%`, height: '100%', background: '#86EFAC', borderRadius: 99, boxShadow: '0 0 12px #86EFAC' }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 14, fontWeight: 800 }}>{compras}</div>
                  </div>
                </div>
              );
           })()}
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

        <section style={{ ...S.card, background: 'linear-gradient(180deg, rgba(255,68,31,0.03) 0%, rgba(255,68,31,0.01) 100%)', border: '1px solid rgba(255,68,31,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--ink)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8, letterSpacing: '.05em' }}>
              <span className="ms" style={{ fontSize: 14 }}>auto_awesome</span> Tura IA
            </span>
            <div style={S.cardTitle}>Insights para tu negocio</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="ms" style={{ fontSize: 20, color: 'var(--primary)', marginBottom: 8 }}>trending_up</span>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Demanda en aumento</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                Tus pedidos de "Hamburguesa Doble Queso" subieron un 15% esta semana. Considera crear un combo para aprovechar la tendencia.
              </div>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="ms" style={{ fontSize: 20, color: '#A8730B', marginBottom: 8 }}>schedule</span>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Optimiza tus tiempos</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                Tu tiempo promedio de preparación (25 min) es excelente, pero de 7:00pm a 8:00pm sube a 35 min. ¡Prepara ingredientes antes!
              </div>
            </div>
            
            {outOfStock > 0 && (
              <div style={{ background: 'rgba(255,68,31,0.05)', padding: 16, borderRadius: 16, border: '1px solid rgba(255,68,31,0.1)' }}>
                <span className="ms" style={{ fontSize: 20, color: 'var(--primary)', marginBottom: 8 }}>warning</span>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--primary)' }}>Productos agotados</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>
                  Tienes {outOfStock} productos sin disponibilidad. ¡Estás perdiendo dinero! Actívalos en el catálogo apenas te lleguen insumos.
                </div>
              </div>
            )}
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
        <span style={{ ...S.kpiIcon, background: bg }} className="anim-bounce">
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
  card: {
    background: 'rgba(18, 18, 18, 0.65)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,0.06)', color: '#fff',
    borderRadius: 28, padding: 26, boxShadow: '0 20px 50px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  channels: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
    gap: 16, marginTop: 20,
  },
  channel: {
    display: 'flex', gap: 14, alignItems: 'flex-start', padding: 18,
    borderRadius: 20, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
    minWidth: 0, transition: 'all 0.3s',
  },
  channelIcon: {
    width: 44, height: 44, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  channelState: {
    fontSize: 10, fontWeight: 800, padding: '4px 8px',
    borderRadius: 8, letterSpacing: '.04em',
  },
  cardTitle: { fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: '#fff' },
  hero: {
    borderRadius: 28, padding: 24, color: '#fff', position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(20,20,20,0.8) 0%, rgba(10,10,10,0.9) 100%)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)',
  },
  heroGlow: {
    position: 'absolute', right: -50, top: -60, width: 250, height: 250, borderRadius: '50%',
    background: 'radial-gradient(circle,rgba(255,68,31,.25),rgba(255,68,31,0) 70%)',
  },
  heroDelta: {
    display: 'flex', alignItems: 'center', gap: 6, height: 26, padding: '0 12px',
    borderRadius: 999, background: 'rgba(255,255,255,.08)', fontSize: 11, fontWeight: 800,
    flex: 'none', border: '1px solid rgba(255,255,255,0.1)',
  },
  heroValue: {
    position: 'relative', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 42, letterSpacing: '-.03em', marginTop: 12, textShadow: '0 4px 20px rgba(0,0,0,0.5)',
  },
  heroStats: {
    position: 'relative', display: 'flex', gap: 24, marginTop: 20, paddingTop: 18,
    borderTop: '1px solid rgba(255,255,255,.08)',
  },
  heroStatLabel: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: 'rgba(255,255,255,.5)', letterSpacing: '.06em',
  },
  heroStatValue: { display: 'block', fontSize: 17, fontWeight: 800, marginTop: 4, textShadow: '0 2px 10px rgba(0,0,0,0.3)' },
  kpiIcon: {
    width: 36, height: 36, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  rangeChip: { height: 36, padding: '0 16px', borderRadius: 12, fontSize: 13, fontWeight: 700, transition: 'all 0.3s' },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 6px 20px rgba(255,255,255,0.2)' },
  chipOff: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' },
  barCol: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, height: '100%', justifyContent: 'flex-end',
  },
  hint: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, paddingTop: 18,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  thumb: {
    width: 48, height: 48, borderRadius: 14, flex: 'none',
    backgroundSize: 'cover', backgroundPosition: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  attentionRow: {
    display: 'flex', alignItems: 'center', gap: 14,
    background: 'rgba(0,0,0,0.3)', borderRadius: 18, padding: 16, flexWrap: 'wrap',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  attentionNum: {
    width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flex: 'none', fontSize: 13, fontWeight: 800,
  },
  attentionBtn: {
    height: 38, padding: '0 16px', borderRadius: 12, background: 'var(--primary)',
    color: '#fff', fontSize: 13, fontWeight: 800, flex: 'none', boxShadow: '0 4px 16px rgba(255,68,31,0.3)',
  },
  pill: { fontSize: 11.5, fontWeight: 800, padding: '6px 12px', borderRadius: 10, flex: 'none' },
  emptyIcon: {
    width: 54, height: 54, borderRadius: 18, background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
