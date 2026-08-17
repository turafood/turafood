'use client';

/**
 * ALTA DE NEGOCIO — corta a propósito
 *
 * Antes eran 4 pasos con documentos y cuenta bancaria ANTES de poder
 * entrar. Quien no tenía el RUT a mano cerraba la pestaña y no volvía.
 *
 * Ahora aquí solo se crea la cuenta: nombre, correo y contraseña. Los
 * requisitos para que TuraFood apruebe el negocio se completan adentro,
 * en /negocio/verificacion, con una lista que se puede dejar a medias y
 * retomar.
 *
 * Quien crea la ficha es `register_business()` en la base: resuelve el
 * slug único y pone el rol. La pantalla no inventa identificadores.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient, isConfigured } from '@/utils/supabase/client';
import HeroBackdrop from '../components/HeroBackdrop';
import { GoogleMark, FacebookMark } from '../components/SocialMarks';

const PERKS = [
  'Publicas tu catálogo el mismo día',
  'Repartidores Tura o tu propia flota',
  'Consignación semanal, todos los viernes',
];

export default function RegistroPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const withProvider = async (provider) => {
    setError(null);
    if (!isConfigured()) {
      setError('Supabase todavía no está conectado en este entorno.');
      return;
    }
    setBusy(true);
    try {
      // Volvemos a /registro/completar, que termina de crear la ficha
      // con el nombre del negocio una vez la sesión ya existe.
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/registro/completar` },
      });
      if (oauthError) throw new Error(oauthError.message);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!isConfigured()) {
      setError('Supabase todavía no está conectado en este entorno.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), role: 'business' } },
      });
      if (signUpError) throw new Error(signUpError.message);

      if (!data.session) {
        // Confirmación de correo activada: la ficha se crea al entrar
        setNotice(
          'Te enviamos un correo para confirmar la cuenta. Ábrelo y vuelve a entrar; ahí terminamos el registro.',
        );
        return;
      }

      const { error: rpcError } = await supabase.rpc('register_business', {
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
      <HeroBackdrop images={['/images/burger-hero.jpg', '/images/steak-ribeye.jpg', '/images/fried-steak.jpg']} />

      <div className="sc" style={S.scroller}>
        <div style={S.center}>
          <div style={S.card}>
            <div style={S.brand}>
              <span style={S.logo}>t</span>
              <span>
                <span style={S.brandName}>TuraFood</span>
                <span style={S.brandKicker}>NEGOCIOS</span>
              </span>
            </div>

            <h1 style={S.title}>Empieza a vender<br />en Buenaventura.</h1>
            <p style={S.subtitle}>
              Creas la cuenta en un minuto. Los documentos y la cuenta bancaria los
              subes después, desde tu panel.
            </p>

            <ul style={S.perks}>
              {PERKS.map((p) => (
                <li key={p} style={S.perk}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--primary)', flex: 'none' }}>check_circle</span>
                  {p}
                </li>
              ))}
            </ul>

            <form onSubmit={create} style={{ marginTop: 20 }}>
              <Field
                label="Nombre del negocio" value={name} onChange={setName}
                placeholder="Ej. Asadero El Puerto" autoFocus
              />
              <Field
                label="Correo" type="email" value={email} onChange={setEmail}
                placeholder="tucorreo@ejemplo.com" autoComplete="email"
              />
              <Field
                label="Contraseña" type="password" value={password} onChange={setPassword}
                placeholder="Mínimo 8 caracteres" autoComplete="new-password"
              />
              <Field
                label="Celular (opcional)" type="tel" value={phone} onChange={setPhone}
                placeholder="+57 320 000 0000" required={false}
              />

              {error && (
                <div style={S.alert}>
                  <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
                  <span>{error}</span>
                </div>
              )}
              {notice && (
                <div style={S.notice}>
                  <span className="ms" style={{ fontSize: 18, flex: 'none' }}>mark_email_unread</span>
                  <span>{notice}</span>
                </div>
              )}

              <button type="submit" disabled={busy} className="md3-btn" style={S.primaryBtn}>
                {busy ? 'Creando…' : 'Crear mi cuenta'}
              </button>
            </form>

            <div style={S.divider}>
              <span style={S.dividerLine} />
              <span style={S.dividerText}>O REGÍSTRATE CON</span>
              <span style={S.dividerLine} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => withProvider('google')} disabled={busy} className="md3-btn" style={S.whiteBtn}>
                <GoogleMark />
                Google
              </button>
              <button onClick={() => withProvider('facebook')} disabled={busy} className="md3-btn" style={S.facebookBtn}>
                <FacebookMark />
                Facebook
              </button>
            </div>

            <div style={S.reassure}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--primary)', flex: 'none' }}>verified_user</span>
              <span>
                Tu tienda queda activa de inmediato con un límite de 20 pedidos diarios.
                Al aprobar tus documentos se levanta el límite.
              </span>
            </div>

            <Link href="/auth" style={S.loginLink}>Ya tengo cuenta · Iniciar sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder, autoComplete, autoFocus, required = true }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={S.label}>{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        style={S.input}
      />
    </label>
  );
}

const S = {
  page: { position: 'relative', minHeight: '100dvh', background: '#080706', color: '#fff' },
  scroller: {
    position: 'relative', zIndex: 2, minHeight: '100dvh', maxHeight: '100dvh',
    overflowY: 'auto', display: 'flex',
  },
  center: { margin: 'auto', width: '100%', maxWidth: 470, padding: '32px 20px 28px' },
  card: {
    background: 'linear-gradient(150deg, rgba(38,34,30,.55) 0%, rgba(12,11,10,.68) 100%)',
    backdropFilter: 'blur(42px) saturate(160%)',
    WebkitBackdropFilter: 'blur(42px) saturate(160%)',
    border: '1px solid rgba(255,255,255,.13)', borderRadius: 30, padding: '30px 26px',
    boxShadow: '0 40px 90px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.16)',
    animation: 'pop .5s cubic-bezier(.2,0,0,1) both',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 },
  logo: {
    width: 40, height: 40, borderRadius: 13, background: 'var(--primary)', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23,
    boxShadow: '0 6px 18px rgba(255,68,31,.45)',
  },
  brandName: {
    display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 19, letterSpacing: '-.02em',
  },
  brandKicker: {
    display: 'block', fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
    color: 'rgba(255,255,255,.5)', marginTop: 2,
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 30,
    lineHeight: 1.08, letterSpacing: '-.03em', textWrap: 'balance',
  },
  subtitle: { margin: '10px 0 0', fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.68)' },
  perks: { listStyle: 'none', margin: '18px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 },
  perk: {
    display: 'flex', alignItems: 'center', gap: 9,
    fontSize: 13, color: 'rgba(255,255,255,.82)',
  },
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
    color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 6,
    boxShadow: '0 10px 26px rgba(255,68,31,.38)',
  },
  whiteBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    height: 46, borderRadius: 999, background: '#fff', color: '#17140F',
    fontWeight: 700, fontSize: 14,
  },
  facebookBtn: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    height: 46, borderRadius: 999, background: '#1877F2', color: '#fff',
    fontWeight: 700, fontSize: 14,
  },
  divider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 14px' },
  dividerLine: { flex: 1, height: 1, background: 'rgba(255,255,255,.14)' },
  dividerText: { fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: 'rgba(255,255,255,.45)' },
  reassure: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 20,
    padding: 13, borderRadius: 14, background: 'rgba(255,255,255,.06)',
    fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,.62)',
  },
  loginLink: {
    display: 'block', textAlign: 'center', marginTop: 18,
    fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.65)', textDecoration: 'none',
  },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: 'rgba(255,68,31,.14)',
    border: '1px solid rgba(255,68,31,.35)', color: '#FFC7BA',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
  notice: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12, padding: '12px 14px',
    borderRadius: 14, background: 'rgba(255,176,32,.14)',
    border: '1px solid rgba(255,176,32,.35)', color: '#FFD9A0',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
