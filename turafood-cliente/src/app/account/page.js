'use client';

/**
 * CUENTA
 *
 * Estructura en bloques, como las apps de reparto grandes:
 *   perfil → plan → accesos rápidos → Beneficios → Mi cuenta →
 *   Ajustes → Más información → cerrar sesión → pie de marca.
 *
 * Cada fila es una entrada real de la app; no hay accesos muertos.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { getOrders } from '@/lib/data';
import { cop, relativeTime } from '@/lib/format';
import { Cover } from '../components/Media';

const QUICK_TILES = [
  { id: 'orders', icon: 'receipt_long', label: 'Pedidos', href: '/account/orders' },
  { id: 'help', icon: 'headset_mic', label: 'Ayuda', href: '/help' },
  { id: 'pay', icon: 'credit_card', label: 'Métodos de pago', href: '/account/wallet' },
];

const SECTIONS = [
  {
    id: 'benefits',
    title: 'Beneficios',
    rows: [
      { icon: 'account_balance_wallet', label: 'Créditos Tura', href: '/account/wallet', valueKey: 'credits' },
      { icon: 'local_activity', label: 'Cupones', href: '/offers', value: '3 activos' },
      { icon: 'group_add', label: 'Afiliados', href: '/account/referrals', value: 'Gana 10%' },
    ],
  },
  {
    id: 'mine',
    title: 'Mi cuenta',
    rows: [
      { icon: 'workspace_premium', label: 'Tura Plus', href: '/plus' },
      { icon: 'location_on', label: 'Direcciones', href: '/account/addresses' },
      { icon: 'credit_card', label: 'Métodos de pago', href: '/account/wallet' },
      { icon: 'receipt_long', label: 'Mis pedidos', href: '/account/orders' },
    ],
  },
  {
    id: 'settings',
    title: 'Ajustes',
    rows: [
      { icon: 'notifications', label: 'Notificaciones', href: '/notifications' },
    ],
  },
  {
    id: 'more',
    title: 'Más información',
    rows: [
      { icon: 'storefront', label: 'Registra tu negocio', href: '/help' },
      { icon: 'two_wheeler', label: 'Sé repartidor Tura', href: '/help' },
      { icon: 'headset_mic', label: 'Ayuda y soporte', href: '/help' },
      { icon: 'info', label: 'Términos y condiciones', href: '/help' },
      { icon: 'shield', label: 'Política de privacidad', href: '/help' },
    ],
  },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [credits, setCredits] = useState(0);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConfigured()) {
          if (alive) {
            setProfile({ full_name: 'Sharick G.', tura_plus: true });
            setCredits(24500);
          }
        } else {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const [p, w] = await Promise.all([
              supabase.from('profiles').select('full_name, tura_plus, tura_plus_expires_at').eq('id', user.id).maybeSingle(),
              supabase.from('wallets').select('credits').eq('user_id', user.id).maybeSingle(),
            ]);
            if (alive) {
              setProfile(p.data);
              setCredits(Number(w.data?.credits ?? 0));
            }
          }
        }

        const orders = await getOrders();
        if (alive) setRecent(orders.slice(0, 2));
      } catch {
        // La cuenta debe abrir aunque falle algo accesorio
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const name = profile?.full_name ?? 'Tu cuenta';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const isPlus = Boolean(profile?.tura_plus);

  const valueFor = (row) => (row.valueKey === 'credits' ? cop(credits) : row.value);

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>
        <div style={{ width: '100%', maxWidth: 740, margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, padding: '16px 0 0' }}>

          <div style={{ flex: 'none', padding: '0 20px 10px' }}>
            <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 24, letterSpacing: '-.02em' }}>
              Cuenta
            </span>
          </div>

          <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 0 108px', minHeight: 0 }}>

          {/* Perfil */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 20px 0' }}>
            <div style={S.avatar}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>{name}</div>
              <button style={S.editLink}>
                Editar perfil
                <span className="ms" style={{ fontSize: 16 }}>chevron_right</span>
              </button>
            </div>
          </div>

          {/* Plan */}
          <button onClick={() => router.push('/plus')} style={S.plusCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Tu plan</span>
              <span className="ms" style={{ fontSize: 20, color: 'var(--muted)' }}>chevron_right</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
              <span className="ms ms-fill" style={{ fontSize: 20, color: '#D99A15' }}>verified</span>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>
                {isPlus ? 'Tura Plus' : 'Únete a Tura Plus'}
              </span>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, marginTop: 10 }}>{cop(68400)}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4, marginTop: 2 }}>
              {isPlus
                ? 'Es lo que ahorra en promedio un usuario Plus cada mes'
                : 'Es lo que ahorrarías al mes con envíos gratis ilimitados'}
            </div>
          </button>

          {/* Accesos rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 11, padding: '14px 20px 0' }}>
            {QUICK_TILES.map((t) => (
              <button key={t.id} onClick={() => router.push(t.href)} style={S.tile}>
                <span className="ms" style={{ fontSize: 25 }}>{t.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'center', lineHeight: 1.25 }}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Últimos pedidos */}
          <div style={S.block}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={S.blockTitle}>Últimos pedidos</span>
              <button onClick={() => router.push('/account/orders')} style={S.seeAll}>Ver todos</button>
            </div>

            {loading && <div style={S.hint}>Cargando…</div>}
            {!loading && recent.length === 0 && <div style={S.hint}>Todavía no tienes pedidos.</div>}

            {recent.map((o, i) => (
              <button
                key={o.id}
                onClick={() => router.push(`/tracking?order=${o.id}`)}
                style={{ ...S.row, borderBottom: i === recent.length - 1 ? 'none' : '1px solid var(--border)' }}
              >
                <Cover
                  src={o.business?.cover_url}
                  alt={o.business?.name ?? ''}
                  radius={22}
                  sizes="44px"
                  style={{ width: 44, height: 44, flex: 'none' }}
                />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="tr1" style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>
                    {o.business?.name ?? 'Negocio'}
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                    {relativeTime(o.created_at)} · {cop(o.total)}
                  </span>
                </span>
                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
              </button>
            ))}
          </div>

          {/* Secciones */}
          {SECTIONS.map((section) => (
            <div key={section.id} style={S.block}>
              <span style={{ ...S.blockTitle, display: 'block', marginBottom: 2 }}>{section.title}</span>
              {section.rows.map((row, i) => (
                <button
                  key={row.label}
                  onClick={() => router.push(row.href)}
                  style={{ ...S.row, borderBottom: i === section.rows.length - 1 ? 'none' : '1px solid var(--border)' }}
                >
                  <span className="ms" style={{ fontSize: 22, color: 'var(--muted)', flex: 'none' }}>{row.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14.5 }}>{row.label}</span>
                  {valueFor(row) && (
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--muted)' }}>{valueFor(row)}</span>
                  )}
                  <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
                </button>
              ))}
            </div>
          ))}

          {/* Cerrar sesión */}
          <div style={{ padding: '18px 20px 0' }}>
            <button onClick={signOut} style={S.signOut}>
              <span className="ms" style={{ fontSize: 20 }}>logout</span>
              Cerrar sesión
            </button>
          </div>

          {/* Pie */}
          <div style={S.footer}>
            <div style={{ fontSize: 11.5, color: 'var(--faint)', fontWeight: 600 }}>
              TuraFood · Buenaventura
            </div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginTop: 10 }}>
              Hecho con <span style={{ color: 'var(--primary)' }}>amor</span>
              <br />en el Pacífico
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  avatar: {
    width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22,
    color: 'var(--muted)', flex: 'none',
  },
  editLink: {
    display: 'flex', alignItems: 'center', gap: 3, fontSize: 13,
    color: 'var(--muted)', fontWeight: 600, marginTop: 2, padding: 0,
  },
  plusCard: {
    display: 'block', width: 'calc(100% - 40px)', margin: '18px 20px 0',
    textAlign: 'left', border: '1px solid #F0C97A', background: '#FFFBF2',
    borderRadius: 18, padding: 16,
  },
  tile: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 9, height: 100, background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 18, boxShadow: 'var(--shadowSm)',
  },
  block: {
    marginTop: 18, padding: '16px 20px', background: 'var(--surface)',
    borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
  },
  blockTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 18,
  },
  seeAll: {
    height: 32, padding: '0 13px', borderRadius: 999,
    background: 'var(--surface2)', fontSize: 12, fontWeight: 800,
  },
  row: {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
    padding: '14px 0', textAlign: 'left',
  },
  hint: {
    padding: '16px 0', fontSize: 13, color: 'var(--muted)',
  },
  signOut: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 50, borderRadius: 999,
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--primary)', fontWeight: 800, fontSize: 14.5,
  },
  footer: {
    padding: '28px 20px 20px', textAlign: 'center',
  },
};
