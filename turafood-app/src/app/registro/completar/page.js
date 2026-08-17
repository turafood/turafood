'use client';

/**
 * ÚLTIMO PASO DEL ALTA CON GOOGLE O FACEBOOK
 *
 * Al volver del proveedor ya hay sesión, pero no sabemos cómo se llama
 * el negocio: eso no lo entrega ni Google ni Facebook. Se pide aquí y
 * con eso `register_business()` crea la ficha.
 *
 * Si la persona ya tenía negocio, la función lo devuelve tal cual y
 * esta pantalla solo redirige: entrar dos veces no duplica nada.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../../components/HeroBackdrop';

export default function CompletarRegistroPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Si ya tiene negocio, no hay nada que preguntar
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isConfigured()) { if (alive) setChecking(false); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }

      const { data } = await supabase
        .from('business_profiles').select('id').eq('id', user.id).maybeSingle();
      if (data) { router.replace('/negocio'); return; }
      if (alive) setChecking(false);
    })();
    return () => { alive = false; };
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error: rpcError } = await createClient().rpc('register_business', {
        p_name: name.trim(),
        p_phone: phone.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      router.replace('/negocio');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={S.page}>
      <HeroBackdrop images={['/images/steak-ribeye.jpg', '/images/burger-hero.jpg']} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          <div style={S.card}>
            <span style={S.logo}>t</span>

            {checking ? (
              <p style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,.7)' }}>
                Verificando tu cuenta…
              </p>
            ) : (
              <form onSubmit={submit}>
                <h1 style={S.title}>Falta un dato</h1>
                <p style={S.subtitle}>
                  ¿Cómo se llama tu negocio? Es el nombre que van a ver tus clientes
                  en la app.
                </p>

                <label style={{ display: 'block', marginTop: 18 }}>
                  <span style={S.label}>Nombre del negocio</span>
                  <input
                    required
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Asadero El Puerto"
                    style={S.input}
                  />
                </label>

                <label style={{ display: 'block', marginTop: 12 }}>
                  <span style={S.label}>Celular de contacto (opcional)</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 320 000 0000"
                    style={S.input}
                  />
                </label>

                {error && (
                  <div style={S.alert}>
                    <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={busy} className="md3-btn" style={S.primaryBtn}>
                  {busy ? 'Creando…' : 'Entrar a mi panel'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { position: 'relative', minHeight: '100dvh', background: '#080706', color: '#fff' },
  scroller: {
    position: 'relative', zIndex: 2, minHeight: '100dvh', maxHeight: '100dvh',
    overflowY: 'auto', display: 'flex',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 440, padding: '32px 20px' },
  card: {
    background: 'linear-gradient(150deg, rgba(38,34,30,.55) 0%, rgba(12,11,10,.68) 100%)',
    backdropFilter: 'blur(42px) saturate(160%)',
    WebkitBackdropFilter: 'blur(42px) saturate(160%)',
    border: '1px solid rgba(255,255,255,.13)', borderRadius: 30, padding: '30px 26px',
    boxShadow: '0 40px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.16)',
  },
  logo: {
    width: 40, height: 40, borderRadius: 13, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23,
    boxShadow: '0 6px 18px rgba(255,68,31,.45)',
  },
  title: {
    margin: '20px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 27, letterSpacing: '-.02em',
  },
  subtitle: { margin: '9px 0 0', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.68)' },
  label: {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'rgba(255,255,255,.62)', marginBottom: 7,
  },
  input: {
    width: '100%', height: 48, borderRadius: 15, padding: '0 15px',
    background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.15)',
    color: '#fff', fontSize: 16, outline: 'none',
  },
  primaryBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 50, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 18,
    boxShadow: '0 10px 26px rgba(255,68,31,.38)',
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14, padding: '12px 14px',
    borderRadius: 14, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.35)', color: '#FFC7BA',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
