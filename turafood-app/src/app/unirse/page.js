'use client';

/**
 * UNIRSE A LA FLOTA DE UN NEGOCIO
 *
 * A donde llega el repartidor cuando su negocio le manda el enlace
 * (app.turafood.com/unirse?c=CODIGO). Pone su nombre y celular, y queda
 * en la flota de ese negocio: el negocio lo avala, así que no hay
 * documentos ni espera de aprobación.
 *
 * Abre una sesión anónima con rol repartidor (la misma "puerta sin
 * puerta" de /entrar) y la base lo une con el código.
 */

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, isConfigured } from '@/utils/supabase/client';
import { probarComo } from '@/lib/sesion';
import { unirseAFlota } from '@/lib/repartidor';

/** Celular colombiano de 10 dígitos (3xx xxx xxxx) → +57… */
function celularCO(texto) {
  const d = String(texto ?? '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  return /^3\d{9}$/.test(d) ? `+57${d}` : null;
}

function Formulario() {
  const router = useRouter();
  const params = useSearchParams();
  const [codigo, setCodigo] = useState((params.get('c') ?? '').toUpperCase());
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const unirse = async (e) => {
    e.preventDefault();
    setError(null);

    if (!isConfigured()) return setError('Esto todavía no está conectado en este entorno.');
    if (nombre.trim().length < 3) return setError('Escribe tu nombre completo.');
    const tel = celularCO(celular);
    if (!tel) return setError('Escribe tu celular de 10 dígitos (empieza por 3).');
    if (codigo.trim().length < 4) return setError('Escribe el código que te dio tu negocio.');

    setBusy(true);
    try {
      const user = await probarComo('courier');
      if (!user) throw new Error('No se pudo abrir tu sesión. Inténtalo de nuevo.');

      const { error: errPerfil } = await createClient()
        .from('profiles')
        .update({ full_name: nombre.trim(), phone: tel })
        .eq('id', user.id);
      if (errPerfil) throw new Error('No se pudieron guardar tus datos. Inténtalo de nuevo.');

      const r = await unirseAFlota(codigo);
      if (!r?.ok) throw new Error(r?.mensaje ?? 'No se pudo unir a la flota.');

      router.replace('/repartidor');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <form onSubmit={unirse} style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, padding: 28, boxShadow: 'var(--shadowSm)' }}>
        <span style={{ width: 52, height: 52, borderRadius: 16, background: 'color-mix(in srgb, var(--primary) 14%, transparent)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="ms" style={{ fontSize: 28 }}>two_wheeler</span>
        </span>
        <h1 style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, margin: '14px 0 4px' }}>Reparte con tu negocio</h1>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 }}>
          Pon tus datos y el código que te dio tu negocio. Queda todo listo en un minuto, sin documentos.
        </p>

        <Campo etiqueta="Código del negocio">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" maxLength={12}
            style={{ ...entrada, fontWeight: 800, letterSpacing: '.18em', fontSize: 18 }} />
        </Campo>
        <Campo etiqueta="Tu nombre completo">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" style={entrada} />
        </Campo>
        <Campo etiqueta="Tu celular (WhatsApp)">
          <input value={celular} onChange={(e) => setCelular(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="300 123 4567" style={entrada} />
        </Campo>

        {error && <div role="alert" style={{ marginTop: 14, fontSize: 13.5, color: 'var(--primary)', fontWeight: 700 }}>{error}</div>}

        <button type="submit" disabled={busy} style={{ marginTop: 20, width: '100%', height: 54, borderRadius: 16, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Uniéndote…' : 'Unirme a la flota'}
        </button>

        <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          ¿Ya tienes cuenta? <Link href="/auth" style={{ color: 'var(--primary)', fontWeight: 700 }}>Inicia sesión</Link>
        </p>
      </form>
    </main>
  );
}

const entrada = { width: '100%', height: 50, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', padding: '0 14px', fontSize: 16 };

function Campo({ etiqueta, children }) {
  return (
    <label style={{ display: 'block', marginTop: 18 }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{etiqueta}</span>
      {children}
    </label>
  );
}

export default function UnirsePage() {
  return (
    <Suspense fallback={null}>
      <Formulario />
    </Suspense>
  );
}
