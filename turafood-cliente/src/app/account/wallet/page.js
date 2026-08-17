'use client';

/**
 * BILLETERA Y MÉTODOS DE PAGO
 * Conversión de `isWallet` (línea 1525) del mockup del cliente.
 *
 * El saldo sale de `wallets`, que solo mueven los triggers de la base
 * de datos. La pantalla nunca escribe montos.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import {
  getPaymentMethods, addPaymentMethod, setDefaultPaymentMethod, deletePaymentMethod,
} from '@/lib/data';
import AddPaymentSheet from '../../components/AddPaymentSheet';
import { cop, relativeTime } from '@/lib/format';
/** Cómo se pinta cada método guardado */
const LOOK = {
  nequi: { label: 'Nequi', icon: 'account_balance_wallet', color: '#6C2BD9' },
  daviplata: { label: 'Daviplata', icon: 'account_balance', color: '#E2001A' },
  cash: { label: 'Efectivo', icon: 'payments', color: 'var(--green)' },
  card: { label: 'Tarjeta', icon: 'credit_card', color: 'var(--blue)' },
};

const BRAND_NAME = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', diners: 'Diners', other: 'Tarjeta',
};

/** Título y subtítulo legibles a partir del registro guardado */
function describe(m) {
  const base = LOOK[m.kind] ?? LOOK.card;

  if (m.kind === 'card') {
    return {
      ...base,
      label: m.alias || `${BRAND_NAME[m.brand] ?? 'Tarjeta'} ···· ${m.last4}`,
      hint: `Vence ${String(m.exp_month).padStart(2, '0')}/${String(m.exp_year).slice(-2)}`,
    };
  }
  if (m.kind === 'cash') {
    return { ...base, hint: 'Pagas al recibir' };
  }
  return { ...base, label: m.alias || base.label, hint: `*** ${m.last4}` };
}

const TX_LABEL = {
  cashback: 'Cashback', bonus: 'Bono', referral: 'Bono por invitación',
  refund: 'Reembolso', earning: 'Ingreso', tip: 'Propina',
  adjustment: 'Ajuste', subscription: 'Suscripción',
};

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState(null);
  const [tx, setTx] = useState([]);
  const [methods, setMethods] = useState([]);
  const [defaultId, setDefaultId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConfigured()) {
          if (alive) {
            setWallet({ credits: 24500 });
            setTx([
              { id: 't1', type: 'referral', amount: 10000, description: 'Bono por invitar a un amigo', created_at: new Date(Date.now() - 3 * 864e5).toISOString() },
              { id: 't2', type: 'cashback', amount: 4500, description: 'Cashback de tu pedido #TS-3992', created_at: new Date(Date.now() - 6 * 864e5).toISOString() },
              { id: 't3', type: 'bonus', amount: 10000, description: 'Bono de bienvenida', created_at: new Date(Date.now() - 20 * 864e5).toISOString() },
            ]);
          }
          return;
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setError('Inicia sesión para ver tu billetera.');
          return;
        }

        const { data: w } = await supabase
          .from('wallets').select('id, credits').eq('user_id', user.id).maybeSingle();
        if (alive) setWallet(w);

        if (w) {
          const { data: rows } = await supabase
            .from('wallet_transactions')
            .select('id, type, amount, description, created_at')
            .eq('wallet_id', w.id)
            .order('created_at', { ascending: false })
            .limit(20);
          if (alive) setTx(rows ?? []);
        }
        const pms = await getPaymentMethods();
        if (alive) {
          setMethods(pms);
          setDefaultId(pms.find((m) => m.is_default)?.id ?? pms[0]?.id ?? null);
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const reload = async () => {
    const pms = await getPaymentMethods();
    setMethods(pms);
    setDefaultId(pms.find((m) => m.is_default)?.id ?? pms[0]?.id ?? null);
  };

  const choose = async (id) => {
    setDefaultId(id);
    try { await setDefaultPaymentMethod(id); await reload(); }
    catch (err) { setError(err.message); }
  };

  const remove = async (id) => {
    try { await deletePaymentMethod(id); await reload(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
            Billetera
          </span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 40px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Saldo */}
          <div style={S.balanceCard}>
            <div style={S.bubble} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.85)' }}>
                CRÉDITOS TURA
              </div>
              <div style={S.balance}>{loading ? '…' : cop(wallet?.credits ?? 0)}</div>
              <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.8)', marginTop: 6, lineHeight: 1.4 }}>
                Se descuentan solos en tu próximo pedido
              </div>
            </div>
          </div>

          {/* Métodos de pago guardados */}
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 24 }}>
            Métodos de pago
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {methods.map((m) => {
              const on = defaultId === m.id;
              const look = describe(m);
              return (
                <div
                  key={m.id}
                  style={{ ...S.methodRow, border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)' }}
                >
                  <button onClick={() => choose(m.id)} style={S.methodMain}>
                    <span style={{ ...S.methodIcon, background: on ? '#FFF1EC' : 'var(--surface2)' }}>
                      <span className="ms" style={{ fontSize: 21, color: on ? 'var(--primary)' : look.color }}>
                        {look.icon}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>{look.label}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                        {look.hint}
                      </span>
                    </span>
                    <span style={{
                      ...S.radio,
                      background: on ? 'var(--primary)' : 'transparent',
                      border: on ? 'none' : '2px solid var(--faint)',
                    }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </span>
                  </button>

                  <button
                    onClick={() => remove(m.id)}
                    style={S.removeBtn}
                    aria-label={`Eliminar ${look.label}`}
                  >
                    <span className="ms" style={{ fontSize: 17, color: 'var(--faint)' }}>delete</span>
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={() => setSheetOpen(true)} style={S.addBtn}>
            <span className="ms" style={{ fontSize: 20 }}>add_card</span>
            Agregar método de pago
          </button>

          {/* Movimientos */}
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 26 }}>
            Movimientos
          </div>

          {!loading && tx.length === 0 && (
            <div style={S.empty}>
              <span className="ms" style={{ fontSize: 28, color: 'var(--faint)' }}>receipt_long</span>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, color: 'var(--muted)' }}>
                Todavía no tienes movimientos
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
            {tx.map((t) => (
              <div key={t.id} style={S.txRow}>
                <span style={S.txIcon}>
                  <span className="ms" style={{ fontSize: 19, color: 'var(--green)' }}>add_circle</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>
                    {t.description ?? TX_LABEL[t.type] ?? 'Movimiento'}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {relativeTime(t.created_at)}
                  </span>
                </span>
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--green)' }}>
                  +{cop(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <AddPaymentSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSave={async (payload) => { await addPaymentMethod(payload); await reload(); }}
        />
      </div>
    </>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  balanceCard: {
    position: 'relative', overflow: 'hidden', borderRadius: 24,
    background: 'linear-gradient(135deg,#3A332A,#17140F)', padding: 22, color: '#fff',
  },
  bubble: {
    position: 'absolute', right: -36, top: -36, width: 160, height: 160,
    borderRadius: '50%', background: 'rgba(255,255,255,.08)',
  },
  balance: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 36,
    letterSpacing: '-.02em', marginTop: 8,
  },
  methodMain: {
    display: 'flex', alignItems: 'center', gap: 13, flex: 1, minWidth: 0,
    background: 'none', textAlign: 'left',
  },
  removeBtn: {
    width: 32, height: 32, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 52, borderRadius: 16, marginTop: 14,
    border: '1.5px dashed var(--primary)', background: '#FFF6F2',
    color: 'var(--primary)', fontWeight: 800, fontSize: 14.5,
  },
  methodRow: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    background: 'var(--surface)', borderRadius: 18, padding: '14px 10px 14px 14px',
    boxShadow: 'var(--shadowSm)',
  },
  methodIcon: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  radio: {
    width: 20, height: 20, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: {
    display: 'flex', gap: 9, marginTop: 14, background: 'var(--surface2)',
    borderRadius: 14, padding: 13, fontSize: 12, color: 'var(--muted)', lineHeight: 1.45,
  },
  txRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 0', borderBottom: '1px solid var(--border)',
  },
  txIcon: {
    width: 36, height: 36, borderRadius: '50%', background: '#E6F6EE',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  empty: {
    textAlign: 'center', padding: '30px 20px', marginTop: 12,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
