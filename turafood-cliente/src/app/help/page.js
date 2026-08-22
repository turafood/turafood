'use client';

/**
 * CENTRO DE AYUDA Y SUITE DE GARANTÍA TURAFOOD (ESTILO RAPPI / UBER)
 * 
 * Permite a los clientes:
 * 1. Tomar casos de pedidos recientes de forma automática.
 * 2. Reportar platos faltantes, demoras, derrames o cobros erróneos.
 * 3. Obtener resolución instantánea con abono en TuraCréditos (+10% bonus) a la Billetera,
 *    reembolso directo a Nequi/Daviplata o reenvío express.
 * 4. Gestionar el historial de tickets y reclamos con comprobante digital.
 * 5. Canales de soporte oficial y preguntas frecuentes.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useThemeStore } from '@/store/useThemeStore';
import { getOrders, getOrder } from '@/lib/data';
import { cop, feeLabel } from '@/lib/format';
import RouteSkeleton from '../components/RouteSkeleton';

const ISSUES = [
  {
    id: 'missing_item',
    icon: 'no_meals',
    title: 'Faltó un plato o bebida',
    sub: 'Uno o varios productos de la orden no llegaron',
    color: '#FF441F',
    instantEligible: true,
  },
  {
    id: 'spilled_food',
    icon: 'liquor',
    title: 'Comida derramada o en mal estado',
    sub: 'El empaque llegó roto o la comida no estaba fresca',
    color: '#FF9800',
    instantEligible: true,
  },
  {
    id: 'too_late',
    icon: 'schedule',
    title: 'Demora excesiva (+30 min)',
    sub: 'El pedido tardó mucho más del rango prometido',
    color: '#A8730B',
    instantEligible: true,
  },
  {
    id: 'wrong_charge',
    icon: 'credit_card',
    title: 'Cobro erróneo o duplicado',
    sub: 'El total cobrado no coincide con tu confirmación',
    color: '#2E6BFF',
    instantEligible: true,
  },
  {
    id: 'courier_issue',
    icon: 'two_wheeler',
    title: 'Inconveniente con la entrega',
    sub: 'El repartidor no entregó en tu puerta o hubo un percance',
    color: '#10B981',
    instantEligible: false,
  },
];

const DEFAULT_FAQS = [
  {
    id: 'wallet',
    icon: 'account_balance_wallet',
    q: '¿Cómo funcionan los TuraCréditos y reembolsos?',
    a: 'Los TuraCréditos acreditados por nuestro sistema de Garantía quedan disponibles de inmediato en tu Billetera y se descuentan automáticamente en tu próxima compra en cualquier restaurante de Buenaventura.',
  },
  {
    id: 'late',
    icon: 'schedule',
    q: '¿Qué pasa si mi pedido se demora más de lo pactado?',
    a: 'Nuestra garantía TuraFood te compensa automáticamente con un cupón de envío gratis o créditos de lealtad si la entrega supera los 25 minutos del tiempo estimado.',
  },
  {
    id: 'cancel',
    icon: 'cancel',
    q: '¿Puedo cancelar un pedido en curso?',
    a: 'Puedes cancelarlo sin penalidad si el restaurante aún no ha iniciado la preparación en cocina. Si ya está en fogón, nuestro equipo de soporte revisa la devolución.',
  },
  {
    id: 'plus',
    icon: 'verified',
    q: 'Beneficios del plan Tura Plus',
    a: 'Envíos gratis ilimitados en restaurantes seleccionados, tarifa de servicio reducida y prioridad en la asignación de repartidores en Buenaventura.',
  },
];

const MOCK_RECENT_ORDERS = [
  {
    id: 'local-1787356791610',
    order_number: 'TS-8069',
    business_name: 'Marisquería El Faro',
    created_at: new Date(Date.now() - 35 * 60000).toISOString(),
    total: 34800,
    status: 'delivered',
    items: [
      { id: 'item-1', name: 'Encocado de Jaiba Real', price: 32000, quantity: 1 },
      { id: 'item-2', name: 'Limonada de Coco Frappé', price: 7500, quantity: 1 },
    ],
  },
  {
    id: 'local-1787350000000',
    order_number: 'TS-3217',
    business_name: 'Asadero El Puerto',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    total: 42900,
    status: 'delivered',
    items: [
      { id: 'item-3', name: 'Picada Especial del Puerto', price: 38000, quantity: 1 },
      { id: 'item-4', name: 'Porción Patacón con Hogao', price: 4900, quantity: 1 },
    ],
  },
];

export default function HelpPageWrapper() {
  return (
    <Suspense fallback={<RouteSkeleton rows={5} height={70} />}>
      <HelpPage />
    </Suspense>
  );
}

function HelpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrderId = searchParams.get('order');

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  // Pestaña activa: 'dispute' | 'tickets' | 'faq'
  const [tab, setTab] = useState('dispute');

  // Pedidos disponibles
  const [orders, setOrders] = useState(MOCK_RECENT_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pasos de reclamación: 1: Seleccionar orden -> 2: Seleccionar problema -> 3: Seleccionar items y detalle -> 4: Elegir solución -> 5: Resuelto
  const [step, setStep] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState('wallet_credits'); // 'wallet_credits' | 'nequi' | 'reorder' | 'support_chat'
  const [nequiNumber, setNequiNumber] = useState('');

  // Tickets generados
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);

  // Cargar órdenes reales si existen
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await getOrders();
        if (alive && rows && rows.length > 0) {
          setOrders(rows);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // Cargar tickets guardados en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('turafood_dispute_tickets');
      if (saved) {
        setTickets(JSON.parse(saved));
      } else {
        // Tickets de demostración
        const demo = [
          {
            id: 'TK-9412',
            order_number: 'TS-3217',
            business_name: 'Asadero El Puerto',
            issue_title: 'Faltó bebida en el pedido',
            solution: 'TuraCréditos Acreditados',
            amount: 7500,
            status: 'approved',
            status_label: 'Aprobado · Dinero en Billetera',
            date: new Date(Date.now() - 24 * 3600000).toISOString(),
          },
        ];
        setTickets(demo);
        localStorage.setItem('turafood_dispute_tickets', JSON.stringify(demo));
      }
    } catch {}
  }, []);

  // Preseleccionar orden si viene por query param
  useEffect(() => {
    if (preselectedOrderId) {
      const found = orders.find((o) => o.id === preselectedOrderId || String(o.id).includes(preselectedOrderId));
      if (found) {
        setSelectedOrder(found);
        setStep(2);
      }
    }
  }, [preselectedOrderId, orders]);

  // Cálculo del monto a reembolsar
  const refundAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    if (selectedIssue?.id === 'too_late') {
      return Math.round((selectedOrder.total || 30000) * 0.3); // 30% de compensación por demora
    }
    if (selectedItems.length === 0) {
      return selectedOrder.total || 30000;
    }
    const items = selectedOrder.items || [];
    return selectedItems.reduce((acc, itemId) => {
      const item = items.find((i) => (i.id || i.product_id) === itemId);
      return acc + ((item?.price || item?.unit_price || 15000) * (item?.quantity || 1));
    }, 0);
  }, [selectedOrder, selectedIssue, selectedItems]);

  const bonusAmount = Math.round(refundAmount * 0.1); // 10% bonus extra en créditos
  const totalCreditsToReceive = refundAmount + bonusAmount;

  // Procesar reclamación instantánea
  const handleSubmitDispute = () => {
    const newTicket = {
      id: `TK-${Math.floor(1000 + Math.random() * 9000)}`,
      order_number: selectedOrder?.order_number || `TS-${String(selectedOrder?.id || '').slice(0, 4)}`,
      business_name: selectedOrder?.business_name || selectedOrder?.business?.name || 'Restaurante Buenaventura',
      issue_title: selectedIssue?.title || 'Reclamación de Pedido',
      solution: refundMethod === 'wallet_credits'
        ? `Abono de ${cop(totalCreditsToReceive)} en TuraCréditos (+10% Bonus)`
        : refundMethod === 'nequi'
          ? `Transferencia Nequi a ${nequiNumber || 'tu cuenta'} (${cop(refundAmount)})`
          : 'Reenvío Express Prioritario en Cocina',
      amount: refundMethod === 'wallet_credits' ? totalCreditsToReceive : refundAmount,
      status: 'approved',
      status_label: refundMethod === 'wallet_credits' ? 'Aprobado · Acreditado en Billetera' : 'En Proceso de Envío',
      date: new Date().toISOString(),
      notes,
    };

    // Actualizar Billetera si fue en créditos
    if (refundMethod === 'wallet_credits') {
      try {
        const storedWallet = localStorage.getItem('turafood_wallet_balance');
        const currentBal = storedWallet ? Number(storedWallet) : 24500;
        const newBal = currentBal + totalCreditsToReceive;
        localStorage.setItem('turafood_wallet_balance', String(newBal));
      } catch {}
    }

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    try {
      localStorage.setItem('turafood_dispute_tickets', JSON.stringify(updated));
    } catch {}

    setActiveTicket(newTicket);
    setStep(5); // Pantalla de éxito
  };

  const handleOpenWhatsappSupport = () => {
    const msg = `Hola Soporte TuraFood 👋\nNecesito ayuda con mi Pedido *#${selectedOrder?.order_number || 'TS-8069'}* de *${selectedOrder?.business_name || 'Restaurante'}*.\n\n*Motivo:* ${selectedIssue?.title || 'Incidencia'}\n*Detalle:* ${notes || 'Revisión del pedido'}`;
    window.open(`https://wa.me/573026886449?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: '100vh', padding: '16px 20px 80px' }}>
      
      {/* ============================================================
          CABECERA RESPONSIVA
          ============================================================ */}
      <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/home')} style={S.backBtn} aria-label="Volver">
              <span className="ms" style={{ fontSize: 20 }}>arrow_back_ios_new</span>
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, letterSpacing: '-.02em', color: 'var(--text)' }}>
                  Centro de Ayuda & Garantía
                </span>
                <span style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--green)', fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="ms ms-fill" style={{ fontSize: 13 }}>verified_user</span>
                  100% Protegido
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Autogestión rápida, devoluciones en puntos y soporte oficial de Buenaventura
              </div>
            </div>
          </div>

          <button
            onClick={toggleTheme}
            style={S.backBtn}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            aria-label="Cambiar tema"
          >
            <span className="ms" style={{ fontSize: 19, color: theme === 'dark' ? '#FFB800' : 'var(--text)' }}>
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>

        {/* ============================================================
            SELECTOR DE PESTAÑAS (TABS PRO)
            ============================================================ */}
        <div style={S.tabsContainer}>
          <button
            onClick={() => { setTab('dispute'); setStep(1); }}
            style={{ ...S.tabBtn, ...(tab === 'dispute' ? S.tabBtnActive : {}) }}
          >
            <span className="ms" style={{ fontSize: 18, color: tab === 'dispute' ? 'var(--primary)' : 'var(--muted)' }}>
              shield
            </span>
            <span>Garantía & Reclamos</span>
          </button>

          <button
            onClick={() => setTab('tickets')}
            style={{ ...S.tabBtn, ...(tab === 'tickets' ? S.tabBtnActive : {}) }}
          >
            <span className="ms" style={{ fontSize: 18, color: tab === 'tickets' ? 'var(--primary)' : 'var(--muted)' }}>
              receipt_long
            </span>
            <span>Mis Casos ({tickets.length})</span>
          </button>

          <button
            onClick={() => setTab('faq')}
            style={{ ...S.tabBtn, ...(tab === 'faq' ? S.tabBtnActive : {}) }}
          >
            <span className="ms" style={{ fontSize: 18, color: tab === 'faq' ? 'var(--primary)' : 'var(--muted)' }}>
              quiz
            </span>
            <span>Preguntas Frecuentes</span>
          </button>
        </div>

        {/* ============================================================
            PESTAÑA 1: GARANTÍA & AUTOGESTIÓN DE CASOS (WIZARD PRO)
            ============================================================ */}
        {tab === 'dispute' && (
          <div style={S.cardSurface}>
            
            {/* PASO 1: SELECCIONAR PEDIDO RECIENTE */}
            {step === 1 && (
              <div>
                <div style={S.sectionHeader}>
                  <span className="ms" style={{ fontSize: 24, color: 'var(--primary)' }}>inventory_2</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                      ¿Con qué pedido tuviste un inconveniente?
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                      Selecciona la orden para resolverla al instante con devolución o reenvío.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 18 }}>
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => { setSelectedOrder(o); setStep(2); }}
                      style={S.orderSelectCard}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={S.orderIconBadge}>
                            <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>restaurant</span>
                          </span>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                              {o.business_name || o.business?.name || 'Restaurante'}
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                              Pedido #{o.order_number || `TS-${String(o.id).slice(0, 4)}`} · {new Date(o.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{cop(o.total || 34800)}</div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 6 }}>
                            Entregado
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 16, background: 'var(--surface2)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="ms ms-fill" style={{ fontSize: 22, color: 'var(--amber)' }}>bolt</span>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                    <strong>Resolución Instantánea TuraFood:</strong> Reembolsamos directamente a tu Billetera en créditos con un <strong>10% extra</strong> de bonificación.
                  </div>
                </div>
              </div>
            )}

            {/* PASO 2: SELECCIONAR MOTIVO DEL PROBLEMA */}
            {step === 2 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button onClick={() => setStep(1)} style={S.miniBackBtn}>
                    <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                    <span>Cambiar pedido</span>
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Paso 2 de 4</span>
                </div>

                <div style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--surface2)', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>RECLAMO PARA:</span>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedOrder?.business_name || 'Restaurante'} (#{selectedOrder?.order_number || 'TS-8069'})</div>
                  </div>
                  <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{cop(selectedOrder?.total || 34800)}</span>
                </div>

                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>
                  ¿Qué problema tuviste con la entrega?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ISSUES.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => { setSelectedIssue(issue); setStep(3); }}
                      style={S.issueOptionBtn}
                    >
                      <span style={{ ...S.issueIcon, background: `${issue.color}18`, color: issue.color }}>
                        <span className="ms" style={{ fontSize: 22 }}>{issue.icon}</span>
                      </span>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: 'var(--text)' }}>{issue.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{issue.sub}</div>
                      </div>
                      <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PASO 3: SELECCIONAR ITEMS AFECTADOS & DETALLE */}
            {step === 3 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button onClick={() => setStep(2)} style={S.miniBackBtn}>
                    <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                    <span>Atrás</span>
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Paso 3 de 4</span>
                </div>

                <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
                  {selectedIssue?.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                  Selecciona qué productos tuvieron el inconveniente:
                </div>

                {/* Lista de Platos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {(selectedOrder?.items || [
                    { id: 'item-1', name: 'Encocado de Jaiba Real', price: 32000, quantity: 1 },
                    { id: 'item-2', name: 'Limonada de Coco Frappé', price: 7500, quantity: 1 },
                  ]).map((item) => {
                    const id = item.id || item.product_id;
                    const isChecked = selectedItems.includes(id);
                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setSelectedItems((prev) => isChecked ? prev.filter((i) => i !== id) : [...prev, id]);
                        }}
                        style={{
                          ...S.itemCheckRow,
                          borderColor: isChecked ? 'var(--primary)' : 'var(--border)',
                          background: isChecked ? 'rgba(255,68,31,0.04)' : 'var(--surface)',
                        }}
                      >
                        <span className={`ms ${isChecked ? 'ms-fill' : ''}`} style={{ fontSize: 22, color: isChecked ? 'var(--primary)' : 'var(--muted)' }}>
                          {isChecked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cantidad: {item.quantity || 1}</div>
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
                          {cop(item.price || item.unit_price || 15000)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explicación / Notas */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                    Cuéntanos brevemente qué sucedió (Opcional):
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. El empaque venía roto o faltó la limonada de coco..."
                    rows={3}
                    style={S.textarea}
                  />
                </div>

                {/* Resumen del Monto Reclamado */}
                <div style={{ padding: '14px 18px', borderRadius: 16, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>Monto a Compensar:</span>
                  <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, color: 'var(--primary)' }}>
                    {cop(refundAmount)}
                  </span>
                </div>

                <button
                  onClick={() => setStep(4)}
                  disabled={refundAmount <= 0}
                  style={{ ...S.submitBtn, opacity: refundAmount > 0 ? 1 : 0.5 }}
                >
                  <span>Continuar a Opciones de Solución</span>
                  <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              </div>
            )}

            {/* PASO 4: ELEGIR SOLUCIÓN (TuraCréditos, Nequi, Reenvío o WhatsApp) */}
            {step === 4 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <button onClick={() => setStep(3)} style={S.miniBackBtn}>
                    <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                    <span>Atrás</span>
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--muted)' }}>Paso 4 de 4</span>
                </div>

                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                  ¿Cómo prefieres resolver tu caso?
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                  Elige la opción más conveniente para ti con garantía inmediata:
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  
                  {/* OPCIÓN 1: TURACRÉDITOS (+10% EXTRA) RECOMENDADO */}
                  <div
                    onClick={() => setRefundMethod('wallet_credits')}
                    style={{
                      ...S.solutionCard,
                      borderColor: refundMethod === 'wallet_credits' ? 'var(--primary)' : 'var(--border)',
                      background: refundMethod === 'wallet_credits' ? 'rgba(255,68,31,0.04)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span className="ms ms-fill" style={{ fontSize: 24, color: 'var(--primary)', marginTop: 2 }}>
                        {refundMethod === 'wallet_credits' ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                            Abono Inmediato en TuraCréditos
                          </span>
                          <span style={{ fontSize: 10.5, fontWeight: 900, background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', padding: '2px 7px', borderRadius: 6 }}>
                            +10% REGALO
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                          Recibe <strong>{cop(totalCreditsToReceive)}</strong> al instante en tu Billetera (Valor reclamado {cop(refundAmount)} + {cop(bonusAmount)} de bono por molestias).
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OPCIÓN 2: REEMBOLSO A NEQUI */}
                  <div
                    onClick={() => setRefundMethod('nequi')}
                    style={{
                      ...S.solutionCard,
                      borderColor: refundMethod === 'nequi' ? 'var(--primary)' : 'var(--border)',
                      background: refundMethod === 'nequi' ? 'rgba(255,68,31,0.04)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span className="ms ms-fill" style={{ fontSize: 24, color: refundMethod === 'nequi' ? 'var(--primary)' : 'var(--muted)', marginTop: 2 }}>
                        {refundMethod === 'nequi' ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                          Transferencia Directa a Nequi / Daviplata
                        </span>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                          Reembolso del 100% ({cop(refundAmount)}) directamente a tu número celular de Nequi.
                        </div>

                        {refundMethod === 'nequi' && (
                          <div style={{ marginTop: 10 }}>
                            <input
                              type="tel"
                              value={nequiNumber}
                              onChange={(e) => setNequiNumber(e.target.value)}
                              placeholder="Escribe tu número de Nequi (ej. 302...)"
                              style={S.inputNequi}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* OPCIÓN 3: REENVÍO EXPRESS */}
                  <div
                    onClick={() => setRefundMethod('reorder')}
                    style={{
                      ...S.solutionCard,
                      borderColor: refundMethod === 'reorder' ? 'var(--primary)' : 'var(--border)',
                      background: refundMethod === 'reorder' ? 'rgba(255,68,31,0.04)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span className="ms ms-fill" style={{ fontSize: 24, color: refundMethod === 'reorder' ? 'var(--primary)' : 'var(--muted)', marginTop: 2 }}>
                        {refundMethod === 'reorder' ? 'radio_button_checked' : 'radio_button_unchecked'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>
                          Reenvío Express Gratuito del Plato
                        </span>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                          La cocina vuelve a preparar el producto y se despacha de inmediato con repartidor prioritario.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleSubmitDispute}
                    style={{ ...S.submitBtn, flex: 2 }}
                  >
                    <span className="ms ms-fill" style={{ fontSize: 20 }}>verified</span>
                    <span>Confirmar y Aplicar Solución</span>
                  </button>
                  <button
                    onClick={handleOpenWhatsappSupport}
                    style={{ ...S.whatsappSecondaryBtn, flex: 1 }}
                    title="Hablar con asesor humano"
                  >
                    <span className="ms" style={{ fontSize: 18 }}>chat</span>
                    <span>Asesor</span>
                  </button>
                </div>
              </div>
            )}

            {/* PASO 5: CASO RESUELTO CON ÉXITO & COMPROBANTE */}
            {step === 5 && activeTicket && (
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={S.successBadgeWrapper}>
                  <span className="ms ms-fill" style={{ fontSize: 44, color: 'var(--green)' }}>check_circle</span>
                </div>

                <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, marginTop: 14 }}>
                  ¡Garantía Aplicada con Éxito!
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4, maxWidth: 440, margin: '6px auto 0' }}>
                  Tu caso ha sido resuelto automáticamente bajo los estándares de protección TuraFood.
                </div>

                {/* Tarjeta Comprobante Digital */}
                <div style={S.ticketProofCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.04em' }}>RADICADO</span>
                      <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--primary)' }}>#{activeTicket.id}</div>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 800, background: 'rgba(16,185,129,0.12)', color: 'var(--green)', padding: '4px 9px', borderRadius: 8 }}>
                      {activeTicket.status_label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', fontSize: 13 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Restaurante:</span>
                      <span style={{ fontWeight: 700 }}>{activeTicket.business_name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Solución:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{activeTicket.solution}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Monto:</span>
                      <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--green)' }}>{cop(activeTicket.amount)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                  <button
                    onClick={() => router.push('/account/wallet')}
                    style={S.submitBtn}
                  >
                    <span className="ms" style={{ fontSize: 18 }}>account_balance_wallet</span>
                    <span>Ver mi Billetera</span>
                  </button>
                  <button
                    onClick={() => { setTab('dispute'); setStep(1); }}
                    style={S.secondaryBtn}
                  >
                    <span>Finalizar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            PESTAÑA 2: HISTORIAL DE TICKETS Y CASOS
            ============================================================ */}
        {tab === 'tickets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tickets.length === 0 ? (
              <div style={S.emptyTicketsCard}>
                <span className="ms" style={{ fontSize: 40, color: 'var(--faint)' }}>mark_email_read</span>
                <div style={{ fontWeight: 800, fontSize: 17, marginTop: 12 }}>No tienes reclamaciones abiertas</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Todos tus pedidos se encuentran al día.</div>
              </div>
            ) : (
              tickets.map((tk) => (
                <div key={tk.id} style={S.ticketItemCard}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--primary)' }}>#{tk.id}</span>
                      <span style={{ color: 'var(--faint)' }}>•</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{tk.business_name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)', background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                      {tk.status_label}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                    {tk.issue_title} · Solución: <strong style={{ color: 'var(--text)' }}>{tk.solution}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--muted)' }}>
                      {new Date(tk.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontWeight: 900, fontSize: 14, color: 'var(--green)' }}>{cop(tk.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============================================================
            PESTAÑA 3: PREGUNTAS FRECUENTES (FAQ) Y CONTACTO
            ============================================================ */}
        {tab === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={S.cardSurface}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Preguntas Frecuentes</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {DEFAULT_FAQS.map((f, i) => {
                  const isOpen = faqOpen === f.id;
                  return (
                    <div key={f.id} style={{ borderBottom: i === DEFAULT_FAQS.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <button
                        onClick={() => setFaqOpen(isOpen ? null : f.id)}
                        style={S.faqBtn}
                      >
                        <span className="ms" style={{ fontSize: 20, color: 'var(--primary)' }}>{f.icon}</span>
                        <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14 }}>{f.q}</span>
                        <span className="ms" style={{ fontSize: 20, color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
                          expand_more
                        </span>
                      </button>
                      {isOpen && <div style={S.faqAnswer}>{f.a}</div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Canales Oficiales */}
            <div style={S.cardSurface}>
              <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 12 }}>Canales Directos con Soporte</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="https://wa.me/573026886449" target="_blank" rel="noopener noreferrer" style={S.contactRow}>
                  <span style={S.whatsappIconBadge}>
                    <span className="ms" style={{ fontSize: 22, color: '#fff' }}>chat</span>
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5 }}>Línea Oficial WhatsApp</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>+57 302 688 6449 · Respuesta en menos de 3 min</div>
                  </div>
                  <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: 12, background: 'var(--surface)',
    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', color: 'var(--text)',
    boxShadow: 'var(--shadowSm)',
  },
  tabsContainer: {
    display: 'flex', gap: 8, background: 'var(--surface)', padding: 6,
    borderRadius: 16, border: '1px solid var(--border)', overflowX: 'auto',
  },
  tabBtn: {
    flex: 1, minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '10px 14px', borderRadius: 12, border: 'none',
    background: 'transparent', color: 'var(--muted)', fontSize: 13,
    fontWeight: 700, cursor: 'pointer', transition: 'all .15s ease',
  },
  tabBtnActive: {
    background: 'var(--surface2)', color: 'var(--text)',
    boxShadow: 'var(--shadowSm)',
  },
  cardSurface: {
    background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)',
    padding: '24px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 16,
    borderBottom: '1px solid var(--border)',
  },
  orderSelectCard: {
    padding: '16px 18px', borderRadius: 18, background: 'var(--surface2)',
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'all .15s ease',
  },
  orderIconBadge: {
    width: 44, height: 44, borderRadius: 12, background: 'rgba(255,68,31,0.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  miniBackBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none',
    border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', padding: 0,
  },
  issueOptionBtn: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    borderRadius: 16, background: 'var(--surface2)', border: '1px solid var(--border)',
    cursor: 'pointer', width: '100%', transition: 'all .15s ease',
  },
  issueIcon: {
    width: 42, height: 42, borderRadius: 12, display: 'flex',
    alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  itemCheckRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    borderRadius: 14, border: '1px solid var(--border)', cursor: 'pointer',
    transition: 'all .15s ease',
  },
  textarea: {
    width: '100%', borderRadius: 14, padding: 12, background: 'var(--surface2)',
    border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13.5,
    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
  },
  solutionCard: {
    padding: '16px', borderRadius: 18, border: '2px solid var(--border)',
    cursor: 'pointer', transition: 'all .15s ease',
  },
  inputNequi: {
    width: '100%', height: 42, borderRadius: 10, padding: '0 12px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    fontSize: 13.5, color: 'var(--text)', outline: 'none', fontWeight: 600,
  },
  submitBtn: {
    height: 48, borderRadius: 14, background: 'var(--primary)', color: '#fff',
    border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '0 22px', boxShadow: '0 8px 24px rgba(255,68,31,0.28)',
  },
  secondaryBtn: {
    height: 48, borderRadius: 14, background: 'var(--surface2)', color: 'var(--text)',
    border: '1px solid var(--border)', fontWeight: 800, fontSize: 14, cursor: 'pointer',
    padding: '0 20px',
  },
  whatsappSecondaryBtn: {
    height: 48, borderRadius: 14, background: '#25D366', color: '#fff',
    border: 'none', fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  successBadgeWrapper: {
    width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
  },
  ticketProofCard: {
    marginTop: 20, padding: 18, borderRadius: 20, background: 'var(--surface2)',
    border: '1px solid var(--border)', maxWidth: 440, margin: '20px auto 0',
  },
  emptyTicketsCard: {
    padding: '48px 20px', borderRadius: 24, background: 'var(--surface)',
    border: '1px solid var(--border)', textAlign: 'center',
  },
  ticketItemCard: {
    padding: '16px 18px', borderRadius: 20, background: 'var(--surface)',
    border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)',
  },
  faqBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)',
  },
  faqAnswer: {
    padding: '0 0 16px 32px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5,
  },
  contactRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
    borderRadius: 16, background: 'var(--surface2)', border: '1px solid var(--border)',
    textDecoration: 'none', color: 'var(--text)', cursor: 'pointer',
  },
  whatsappIconBadge: {
    width: 42, height: 42, borderRadius: 12, background: '#25D366',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
};
