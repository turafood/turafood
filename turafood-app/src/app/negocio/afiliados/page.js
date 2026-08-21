'use client';

import { useState } from 'react';
import { cop } from '@/lib/format';
import { useBiz } from '../BizContext';
import Vertical3D from '../../components/Vertical3D';

/* ═══════════════ MOCK DATA & CONFIG ═══════════════ */

const INITIAL_REFERRALS = [
  { id: 1, name: 'Parrilla Don Jorge', category: 'Carnes & Asados', date: '12 Ago 2026', orders: 184, monthlyVol: 3450000, commission: 345000, status: 'active', avatar: '🥩' },
  { id: 2, name: 'Marisquería El Faro', category: 'Pescados & Mariscos', date: '01 Ago 2026', orders: 240, monthlyVol: 4800000, commission: 480000, status: 'active', avatar: '🦐' },
  { id: 3, name: 'Pizzería Bella Napoli', category: 'Pizzas & Pastas', date: '22 Jul 2026', orders: 120, monthlyVol: 2200000, commission: 220000, status: 'active', avatar: '🍕' },
  { id: 4, name: 'Burger House Bahía', category: 'Hamburguesas', date: '15 Jul 2026', orders: 310, monthlyVol: 5600000, commission: 560000, status: 'active', avatar: '🍔' },
  { id: 5, name: 'Cevichería Doña Rosa', category: 'Comida del Mar', date: '04 Jul 2026', orders: 95, monthlyVol: 1800000, commission: 180000, status: 'active', avatar: '🐟' },
];

const INITIAL_WITHDRAWALS = [
  { id: 'TX-94821', date: '15 Ago 2026', amount: 350000, method: 'Nequi', account: '300 123 4567', status: 'completed' },
  { id: 'TX-89210', date: '01 Ago 2026', amount: 500000, method: 'Bancolombia', account: 'Ahorros ***4921', status: 'completed' },
  { id: 'TX-76432', date: '15 Jul 2026', amount: 420000, method: 'Daviplata', account: '310 987 6543', status: 'completed' },
];

export default function AfiliadosPage() {
  const { toast } = useBiz ? useBiz() : { toast: () => {} };

  // Wallet State
  const [walletBalance, setWalletBalance] = useState(420000);
  const [totalEarned, setTotalEarned] = useState(1785000);
  const [referrals, setReferrals] = useState(INITIAL_REFERRALS);
  const [withdrawals, setWithdrawals] = useState(INITIAL_WITHDRAWALS);

  // Form State
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  // Withdrawal Form State
  const [withdrawMethod, setWithdrawMethod] = useState('nequi');
  const [withdrawAccount, setWithdrawAccount] = useState('300 123 4567');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const affLink = 'https://app.turafood.com/registro?ref=TURA-PRO-9842';

  const copyLink = () => {
    navigator.clipboard.writeText(affLink);
    setCopied(true);
    if (toast) toast('¡Enlace de afiliado copiado al portapapeles!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteSent(true);
    if (toast) toast(`Invitación enviada con éxito a ${inviteEmail}`);
    setInviteEmail('');
    setTimeout(() => setInviteSent(false), 3000);
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      if (toast) toast('Ingresa un monto válido para retirar');
      return;
    }
    if (amount > walletBalance) {
      if (toast) toast('Saldo insuficiente en tu Wallet');
      return;
    }

    setWithdrawing(true);
    setTimeout(() => {
      setWalletBalance(prev => prev - amount);
      const newTx = {
        id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        date: 'Hoy (Ahora)',
        amount,
        method: withdrawMethod === 'nequi' ? 'Nequi' : withdrawMethod === 'daviplata' ? 'Daviplata' : withdrawMethod === 'bancolombia' ? 'Bancolombia' : 'Créditos TuraFood',
        account: withdrawAccount || 'Cuenta Principal',
        status: 'completed'
      };
      setWithdrawals([newTx, ...withdrawals]);
      setWithdrawing(false);
      setWithdrawAmount('');
      if (toast) toast(`¡Retiro de ${cop(amount)} procesado correctamente!`);
    }, 1200);
  };

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', paddingBottom: 80 }}>
      
      {/* ─────────── HERO NIVEL DIOS (GOLDEN GLOW + MAGICAI GLASS) ─────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #141009 0%, #2A2216 50%, #15110B 100%)',
        borderRadius: 28, padding: '44px 40px', color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 28px 60px rgba(20,16,10,0.25)', border: '1px solid rgba(232,199,102,0.25)',
        marginBottom: 28
      }}>
        {/* Glows */}
        <div style={{ position: 'absolute', top: -120, right: -60, width: 400, height: 400, background: 'radial-gradient(circle, rgba(232,199,102,0.22) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -60, width: 300, height: 300, background: 'radial-gradient(circle, rgba(255,68,31,0.18) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(50px)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 28 }}>
          <div style={{ flex: '1 1 480px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(232,199,102,0.1)', borderRadius: 99, border: '1px solid rgba(232,199,102,0.25)', marginBottom: 18 }}>
              <span className="ms" style={{ fontSize: 16, color: 'var(--gold)' }}>card_giftcard</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Programa de Afiliados &amp; Partners</span>
            </div>

            <h1 style={{ margin: '0 0 14px', fontSize: 34, fontFamily: 'var(--font-bricolage)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>
              Invita a otros negocios y gana <span style={{ background: 'linear-gradient(90deg, #E8C766, #FF7A4D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>comisiones de por vida. 🎁</span>
            </h1>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, maxWidth: 520 }}>
              Por cada restaurante o comercio que traigas a TuraFood, recibes el <strong>10% recurrente</strong> de sus ventas en efectivo o créditos para tu propio negocio.
            </p>

            {/* Affiliate Link Box */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>Tu Enlace de Afiliado Exclusivo:</div>
              <div style={{ display: 'flex', gap: 8, maxWidth: 520 }}>
                <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: 13.5, color: 'var(--gold)', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {affLink}
                </div>
                <button
                  onClick={copyLink}
                  style={{
                    padding: '0 20px', height: 46, borderRadius: 14, border: 'none',
                    background: copied ? 'var(--green)' : 'linear-gradient(135deg, var(--gold), #B8912F)',
                    color: '#000', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 6px 18px rgba(232,199,102,0.3)', transition: 'all .2s'
                  }}
                >
                  <span className="ms" style={{ fontSize: 18 }}>{copied ? 'done' : 'content_copy'}</span>
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          {/* Earnings Glass Card */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
            borderRadius: 24, padding: '28px 32px', border: '1px solid rgba(255,255,255,0.12)',
            minWidth: 260, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center'
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Ganancias Disponibles</div>
            <div style={{ fontSize: 40, fontFamily: 'var(--font-bricolage)', fontWeight: 900, color: '#fff', marginTop: 4, lineHeight: 1 }}>
              {cop(walletBalance)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <span className="ms" style={{ fontSize: 16 }}>trending_up</span> Tasa de Comisión: 10%
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
              Total Histórico: {cop(totalEarned)}
            </div>
          </div>
        </div>
      </section>


      {/* ─────────── 4 KPIS DE RENDIMIENTO ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Saldo en Billetera', value: cop(walletBalance), sub: 'Listo para retirar', icon: 'account_balance_wallet', color: 'var(--gold)' },
          { label: 'Negocios Activos', value: `${referrals.length} Comercios`, sub: 'Generando comisión mensual', icon: 'storefront', color: 'var(--green)' },
          { label: 'Facturación Referida', value: cop(17850000), sub: 'Volumen total este mes', icon: 'payments', color: '#2E6BFF' },
          { label: 'Nivel Partner', value: 'Platino 👑', sub: 'Comisión máxima 10%', icon: 'military_tech', color: '#A855F7' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 20, padding: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -12, right: -12, width: 56, height: 56, background: `radial-gradient(circle, ${kpi.color}15 0%, transparent 70%)`, borderRadius: '50%' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="ms" style={{ fontSize: 18, color: kpi.color }}>{kpi.icon}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{kpi.label}</span>
            </div>
            <div style={{ fontSize: 24, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>


      {/* ─────────── 2 COLUMNAS: CÓMO FUNCIONA & RETIRO DE FONDOS ─────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, marginBottom: 32 }}>
        
        {/* COL 1: CÓMO FUNCIONA */}
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 32, border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="ms" style={{ fontSize: 22, color: 'var(--primary)' }}>help_outline</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>¿Cómo Funciona?</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>3 sencillos pasos para monetizar tu red de contactos</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            {[
              { num: '1', title: 'Envías tu enlace de invitación', desc: 'Compártelo por WhatsApp o correo a dueños de restaurantes y tiendas.' },
              { num: '2', title: 'Se registran y configuran su menú', desc: 'Obtienen $50.000 COP de bienvenida en créditos para arrancar.' },
              { num: '3', title: 'Ganas comisiones automáticas', desc: 'Cada vez que despachen pedidos, recibes el 10% de su plan de por vida.' },
            ].map((step) => (
              <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: 'var(--primary)', flex: 'none' }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>{step.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Enviar Invitación por Email */}
          <form onSubmit={handleSendInvite} style={{ marginTop: 'auto', background: 'var(--surface2)', padding: 18, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Invitar directamente por correo:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="correo-del-negocio@gmail.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
              />
              <button
                type="submit"
                style={{ padding: '0 18px', height: 40, borderRadius: 10, border: 'none', background: 'var(--text)', color: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Enviar
              </button>
            </div>
            {inviteSent && <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700, marginTop: 6 }}>✓ Invitación enviada</div>}
          </form>
        </div>

        {/* COL 2: FORMULARIO DE RETIRO & WALLET */}
        <div style={{ background: 'var(--surface)', borderRadius: 24, padding: 32, border: '1px solid var(--border)', boxShadow: 'var(--shadowSm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(232,199,102,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="ms" style={{ fontSize: 22, color: 'var(--gold)' }}>payments</span>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>Solicitar Retiro o Canje</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>Transfiere a tu cuenta bancaria o abona a tu factura</p>
            </div>
          </div>

          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Método */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Método de Destino</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { id: 'nequi', label: '🟣 Nequi' },
                  { id: 'bancolombia', label: '🟡 Bancolombia' },
                  { id: 'daviplata', label: '🔴 Daviplata' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWithdrawMethod(m.id)}
                    style={{
                      padding: '10px 8px', borderRadius: 12, border: `1px solid ${withdrawMethod === m.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: withdrawMethod === m.id ? 'var(--primary-tint)' : 'var(--surface2)',
                      color: withdrawMethod === m.id ? 'var(--primary)' : 'var(--text)',
                      fontWeight: 800, fontSize: 12, cursor: 'pointer', textAlign: 'center'
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </label>

            {/* Número de Cuenta / Teléfono */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--muted)' }}>Número de Cuenta / Celular</span>
              <input
                type="text"
                value={withdrawAccount}
                onChange={(e) => setWithdrawAccount(e.target.value)}
                placeholder="Ej: 300 123 4567"
                style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
            </label>

            {/* Monto */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: 'var(--muted)' }}>Monto a Retirar</span>
                <span style={{ color: 'var(--primary)', fontWeight: 800, cursor: 'pointer' }} onClick={() => setWithdrawAmount(walletBalance.toString())}>
                  Máximo ({cop(walletBalance)})
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--muted)' }}>$</span>
                <input
                  type="number"
                  placeholder="Monto mínimo: 50.000"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '12px 8px', fontSize: 15, fontWeight: 800, color: 'var(--text)' }}
                />
                <span style={{ fontSize: 12, color: 'var(--faint)' }}>COP</span>
              </div>
            </label>

            <button
              type="submit"
              disabled={withdrawing}
              style={{
                marginTop: 8, height: 48, borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, var(--text), #2A2A2A)',
                color: 'var(--surface)', fontWeight: 800, fontSize: 14.5, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: 'var(--shadowSm)'
              }}
            >
              {withdrawing ? <span className="ms spin">refresh</span> : <span className="ms">send</span>}
              {withdrawing ? 'Procesando Transferencia...' : 'Solicitar Retiro Inmediato'}
            </button>
          </form>
        </div>

      </div>


      {/* ─────────── TABLA DE NEGOCIOS REFERIDOS ─────────── */}
      <section style={{ background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadowSm)', marginBottom: 28 }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
              Comercios Afiliados Activos
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Negocios registrados con tu enlace que están generando comisiones recurrentes.
            </p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', background: 'var(--green-tint)', padding: '4px 12px', borderRadius: 99 }}>
            {referrals.length} Referidos
          </span>
        </div>

        <table style={{ width: '100%', fontSize: 13.5, textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Negocio', 'Categoría', 'Vinculación', 'Pedidos Mes', 'Volumen Facturado', 'Tu Comisión (10%)', 'Estado'].map(h => (
                <th key={h} style={{ padding: '14px 24px', fontWeight: 700, color: 'var(--muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {referrals.map((ref) => (
              <tr key={ref.id} style={{ borderTop: '1px solid var(--border)' }} className="hover-row">
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {ref.avatar}
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text)' }}>{ref.name}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px', color: 'var(--muted)' }}>{ref.category}</td>
                <td style={{ padding: '16px 24px', color: 'var(--faint)' }}>{ref.date}</td>
                <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text)' }}>{ref.orders} pedidos</td>
                <td style={{ padding: '16px 24px', color: 'var(--text)', fontWeight: 700 }}>{cop(ref.monthlyVol)}</td>
                <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--green)' }}>{cop(ref.commission)}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 800, background: 'var(--green-tint)', color: 'var(--green)' }}>
                    ● Activo
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>


      {/* ─────────── TABLA DE HISTORIAL DE RETIROS ─────────── */}
      <section style={{ background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadowSm)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontFamily: 'var(--font-bricolage)', fontWeight: 800, color: 'var(--text)' }}>
              Historial de Solicitudes y Retiros
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>
              Registro de todas las transferencias de comisiones enviadas a tus cuentas.
            </p>
          </div>
        </div>

        <table style={{ width: '100%', fontSize: 13.5, textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['ID Transacción', 'Fecha', 'Monto Transferido', 'Método', 'Cuenta Destino', 'Estado'].map(h => (
                <th key={h} style={{ padding: '14px 24px', fontWeight: 700, color: 'var(--muted)', fontSize: 11.5, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((tx) => (
              <tr key={tx.id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--text)' }}>{tx.id}</td>
                <td style={{ padding: '16px 24px', color: 'var(--muted)' }}>{tx.date}</td>
                <td style={{ padding: '16px 24px', fontWeight: 800, color: 'var(--primary)' }}>{cop(tx.amount)}</td>
                <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text)' }}>{tx.method}</td>
                <td style={{ padding: '16px 24px', color: 'var(--muted)' }}>{tx.account}</td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 800, background: 'var(--green-tint)', color: 'var(--green)' }}>
                    ✓ Completado
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

    </div>
  );
}
