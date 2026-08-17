'use client';

/**
 * PROGRAMA DE AFILIADOS
 *
 * Enlace propio, comisión recurrente sobre cada compra del referido,
 * y retiro del dinero a una cuenta real.
 *
 * Nada de esto lo decide el frontend: la comisión la abona un trigger
 * cuando el pedido del referido se entrega, y el retiro se valida
 * contra el saldo real en `request_payout()`. Aquí solo se muestra y
 * se solicita.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { cop, relativeTime } from '@/lib/format';

const COMMISSION_RATE = 0.10;
const MIN_WITHDRAWAL = 50000;

const METHODS = [
  { id: 'nequi', label: 'Nequi', hint: 'Número de celular' },
  { id: 'daviplata', label: 'Daviplata', hint: 'Número de celular' },
  { id: 'bancolombia', label: 'Bancolombia', hint: 'Número de cuenta' },
  { id: 'otro', label: 'Otro banco', hint: 'Número de cuenta' },
];

const PAYOUT_STATUS = {
  pending: { label: 'En revisión', bg: '#FFF7E6', fg: '#A8730B' },
  approved: { label: 'Aprobado', bg: '#EBF2FE', fg: '#1961E6' },
  paid: { label: 'Pagado', bg: '#E6F6EE', fg: '#0B7A48' },
  rejected: { label: 'Rechazado', bg: '#FFF0ED', fg: '#FF441F' },
};

export default function ReferralsPage() {
  const router = useRouter();

  const [code, setCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Formulario de retiro
  const [method, setMethod] = useState('nequi');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      if (!isConfigured()) {
        setCode('SHARICK4F2A');
        setWallet({ available_withdraw: 128400 });
        setReferrals([
          { id: 'r1', status: 'completed', reward_referrer: 84200, created_at: new Date(Date.now() - 26 * 864e5).toISOString(), name: 'Andrés L.', orders: 9 },
          { id: 'r2', status: 'completed', reward_referrer: 44200, created_at: new Date(Date.now() - 12 * 864e5).toISOString(), name: 'Juan D.', orders: 4 },
          { id: 'r3', status: 'pending', reward_referrer: 0, created_at: new Date(Date.now() - 2 * 864e5).toISOString(), name: 'Laura R.', orders: 0 },
        ]);
        setPayouts([
          { id: 'p1', amount: 60000, status: 'paid', method: 'nequi', created_at: new Date(Date.now() - 18 * 864e5).toISOString() },
        ]);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Inicia sesión para ver tu programa de afiliados.');
        return;
      }

      const [profileRes, refRes, walletRes, payoutRes] = await Promise.all([
        supabase.from('profiles').select('referral_code').eq('id', user.id).maybeSingle(),
        supabase
          .from('referrals')
          .select('id, status, reward_referrer, created_at, referred:profiles!referrals_referred_id_fkey(full_name)')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('wallets').select('available_withdraw').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('payout_requests')
          .select('id, amount, status, method, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      setCode(profileRes.data?.referral_code ?? null);
      setReferrals((refRes.data ?? []).map((r) => ({ ...r, name: r.referred?.full_name ?? 'Invitado' })));
      setWallet(walletRes.data);
      setPayouts(payoutRes.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const link = code ? `https://turafood.com/r/${code}` : '';

  const earned = referrals.reduce((sum, r) => sum + Number(r.reward_referrer ?? 0), 0);
  const active = referrals.filter((r) => r.status === 'completed').length;
  const available = Number(wallet?.available_withdraw ?? 0);
  const committed = payouts
    .filter((p) => ['pending', 'approved'].includes(p.status))
    .reduce((s, p) => s + Number(p.amount), 0);
  const withdrawable = Math.max(available - committed, 0);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El enlace queda visible igual
    }
  };

  const share = async () => {
    const text = `Pide en Buenaventura con TuraFood y llévate tu primer pedido con descuento: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TuraFood', text, url: link });
        return;
      } catch { /* cancelado */ }
    }
    copy();
  };

  const requestPayout = async (e) => {
    e.preventDefault();
    setNotice(null);
    setError(null);

    const value = Number(String(amount).replace(/\D/g, ''));

    if (!isConfigured()) {
      setNotice({ ok: false, text: 'Conecta Supabase para poder solicitar retiros.' });
      return;
    }
    if (value < MIN_WITHDRAWAL) {
      setNotice({ ok: false, text: `El retiro mínimo es ${cop(MIN_WITHDRAWAL)}` });
      return;
    }
    if (value > withdrawable) {
      setNotice({ ok: false, text: 'No tienes saldo suficiente disponible.' });
      return;
    }

    setSending(true);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('request_payout', {
        p_amount: value,
        p_method: method,
        p_account: account,
      });
      if (rpcError) throw new Error(rpcError.message);

      setNotice({ ok: true, text: 'Solicitud enviada. La revisamos en menos de 48 horas.' });
      setAmount('');
      setAccount('');
      await load();
    } catch (err) {
      setNotice({ ok: false, text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.push('/account')} style={S.backBtn} aria-label="Volver a la cuenta">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
            Afiliados
          </span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 40px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Ganancias */}
          <div style={S.hero}>
            <div style={S.heroBubble} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.85)' }}>
                GANANCIAS ACUMULADAS
              </div>
              <div style={S.heroAmount}>{loading ? '…' : cop(earned)}</div>

              <div style={{ display: 'flex', gap: 18, marginTop: 14 }}>
                <span>
                  <span style={S.heroStatLabel}>COMISIÓN</span>
                  <span style={S.heroStatValue}>{Math.round(COMMISSION_RATE * 100)}%</span>
                </span>
                <span>
                  <span style={S.heroStatLabel}>PROGRAMA</span>
                  <span style={S.heroStatValue}>Cada compra</span>
                </span>
                <span>
                  <span style={S.heroStatLabel}>ACTIVOS</span>
                  <span style={S.heroStatValue}>{active}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Enlace de afiliado */}
          <div style={{ ...S.card, marginTop: 14 }}>
            <div style={S.cardTitle}>Tu enlace de afiliado</div>
            <div style={S.linkBox}>
              <span className="tr1" style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--muted)' }}>
                {loading ? 'Generando…' : link}
              </span>
              <button onClick={copy} disabled={!code} style={S.copyIcon} aria-label="Copiar enlace">
                <span className="ms" style={{ fontSize: 18, color: copied ? 'var(--green)' : 'var(--muted)' }}>
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
            <button onClick={share} disabled={!code} style={S.shareBtn}>
              <span className="ms" style={{ fontSize: 18 }}>ios_share</span>
              Compartir mi enlace
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10, lineHeight: 1.45 }}>
              También puedes dictar tu código: <strong>{code ?? '—'}</strong>
            </div>
          </div>

          {/* Cómo funciona */}
          <div style={{ ...S.card, marginTop: 14 }}>
            <div style={S.cardTitle}>Cómo funciona</div>
            {[
              { n: '1', t: 'Compartes tu enlace', d: 'Por WhatsApp, redes o dictando tu código.' },
              { n: '2', t: 'Tu referido pide en Tura', d: 'Se registra con tu enlace y hace su primer pedido.' },
              { n: '3', t: 'Ganas en cada compra', d: `Recibes ${Math.round(COMMISSION_RATE * 100)}% del subtotal de todos sus pedidos, no solo el primero.` },
            ].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', gap: 13, padding: '13px 0', borderBottom: i === 2 ? 'none' : '1px solid var(--border)' }}>
                <span style={S.stepDot}>{s.n}</span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5 }}>{s.t}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.45 }}>{s.d}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Retiro */}
          <div style={{ ...S.card, marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <span style={S.cardTitle}>Retirar mi dinero</span>
              <span style={{ textAlign: 'right', flex: 'none' }}>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.05em' }}>
                  DISPONIBLE
                </span>
                <span style={{ display: 'block', fontWeight: 800, fontSize: 17, color: 'var(--green)', marginTop: 2 }}>
                  {cop(withdrawable)}
                </span>
              </span>
            </div>

            <form onSubmit={requestPayout} style={{ marginTop: 12 }}>
              <label htmlFor="metodo" style={S.label}>DÓNDE LO RECIBES</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {METHODS.map((m) => {
                  const on = method === m.id;
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      style={{
                        height: 36, padding: '0 13px', borderRadius: 999,
                        fontSize: 12.5, fontWeight: 700,
                        background: on ? 'var(--text)' : 'var(--bg)',
                        color: on ? '#fff' : 'var(--text)',
                        border: on ? 'none' : '1px solid var(--border)',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              <label htmlFor="cuenta" style={S.label}>
                {METHODS.find((m) => m.id === method)?.hint.toUpperCase()}
              </label>
              <input
                id="cuenta"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder={method === 'bancolombia' || method === 'otro' ? '000-000000-00' : '313 759 4713'}
                style={S.input}
              />

              <label htmlFor="monto" style={{ ...S.label, marginTop: 12 }}>MONTO A RETIRAR</label>
              <input
                id="monto"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder={`Mínimo ${cop(MIN_WITHDRAWAL)}`}
                style={S.input}
              />

              {notice && (
                <div style={{ ...S.notice, background: notice.ok ? '#E6F6EE' : '#FFF0ED', color: notice.ok ? '#0B7A48' : 'var(--primary)' }}>
                  <span className="ms" style={{ fontSize: 17 }}>{notice.ok ? 'check_circle' : 'error'}</span>
                  {notice.text}
                </div>
              )}

              <button type="submit" disabled={sending} style={S.submitBtn}>
                {sending ? 'Enviando…' : 'Solicitar retiro'}
              </button>
            </form>
          </div>

          {/* Referidos */}
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 24 }}>
            Tus referidos
          </div>

          {!loading && referrals.length === 0 && (
            <div style={S.empty}>
              <span className="ms" style={{ fontSize: 28, color: 'var(--faint)' }}>group_add</span>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, color: 'var(--muted)' }}>
                Todavía no tienes referidos
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {referrals.map((r) => {
              const done = r.status === 'completed';
              return (
                <div key={r.id} style={S.row}>
                  <span style={{ ...S.rowIcon, background: done ? '#E6F6EE' : 'var(--surface2)' }}>
                    <span className="ms" style={{ fontSize: 19, color: done ? 'var(--green)' : 'var(--muted)' }}>
                      {done ? 'person_check' : 'schedule'}
                    </span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{r.name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {done ? 'Comprando activamente' : 'Falta su primer pedido'} · {relativeTime(r.created_at)}
                    </span>
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: done ? 'var(--green)' : 'var(--faint)' }}>
                    {done ? `+${cop(r.reward_referrer ?? 0)}` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Historial de retiros */}
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 24 }}>
            Mis retiros
          </div>

          {!loading && payouts.length === 0 && (
            <div style={S.empty}>
              <span className="ms" style={{ fontSize: 28, color: 'var(--faint)' }}>request_quote</span>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, color: 'var(--muted)' }}>
                No has solicitado retiros
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {payouts.map((p) => {
              const st = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.pending;
              return (
                <div key={p.id} style={S.row}>
                  <span style={{ ...S.rowIcon, background: st.bg }}>
                    <span className="ms" style={{ fontSize: 19, color: st.fg }}>payments</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 800, fontSize: 14 }}>{cop(p.amount)}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                      {METHODS.find((m) => m.id === p.method)?.label ?? p.method} · {relativeTime(p.created_at)}
                    </span>
                  </span>
                  <span style={{ ...S.pill, background: st.bg, color: st.fg }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  hero: {
    position: 'relative', overflow: 'hidden', borderRadius: 24,
    background: 'linear-gradient(135deg,#FF7A3D,#E2360F)', padding: 22, color: '#fff',
  },
  heroBubble: {
    position: 'absolute', right: -36, top: -36, width: 160, height: 160,
    borderRadius: '50%', background: 'rgba(255,255,255,.12)',
  },
  heroAmount: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38,
    letterSpacing: '-.02em', marginTop: 6,
  },
  heroStatLabel: {
    display: 'block', fontSize: 9.5, fontWeight: 800,
    color: 'rgba(255,255,255,.7)', letterSpacing: '.06em',
  },
  heroStatValue: {
    display: 'block', fontSize: 14, fontWeight: 800, marginTop: 2,
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 18, boxShadow: 'var(--shadowSm)',
  },
  cardTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 17,
    display: 'block', marginBottom: 4,
  },
  linkBox: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 10,
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 13, padding: '12px 13px',
  },
  copyIcon: {
    width: 30, height: 30, borderRadius: 9, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface)', border: '1px solid var(--border)',
  },
  shareBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 46, borderRadius: 999, marginTop: 10,
    background: 'var(--text)', color: '#fff', fontWeight: 800, fontSize: 13.5,
  },
  stepDot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 800,
  },
  label: {
    display: 'block', fontSize: 10.5, fontWeight: 800,
    color: 'var(--muted)', letterSpacing: '.06em', marginBottom: 6,
  },
  input: {
    width: '100%', height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 14, outline: 'none',
  },
  notice: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 12,
    padding: '11px 13px', borderRadius: 12, fontSize: 12.5, fontWeight: 700,
  },
  submitBtn: {
    width: '100%', height: 50, borderRadius: 999, marginTop: 14,
    background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 14.5,
    boxShadow: '0 8px 20px rgba(255,68,31,.28)',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 13,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  pill: {
    fontSize: 10.5, fontWeight: 800, padding: '5px 9px', borderRadius: 8, flex: 'none',
  },
  empty: {
    textAlign: 'center', padding: '28px 20px', marginTop: 12,
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20,
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
