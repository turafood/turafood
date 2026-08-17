'use client';

/**
 * ALTA DE NEGOCIO — asistente de 4 pasos
 * Conversión 1:1 de `isSignup` (línea 60) del mockup de Negocios.
 * Los pasos, etiquetas y textos salen literalmente de STEPS (línea 1140).
 *
 * El paso 4 crea la cuenta: usuario en auth, perfil con rol `business`
 * y ficha en `business_profiles` con estado `pending_review`. Quien
 * aprueba es el Super Admin; mientras tanto el negocio ya puede entrar.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isConfigured } from '@/utils/supabase/client';

/** Verticales tal como las guarda la base (business_profiles.vertical) */
const VERTICALS = [
  { label: 'Restaurante', value: 'restaurant' },
  { label: 'Farmacia', value: 'pharmacy' },
  { label: 'Minimercado', value: 'market' },
  { label: 'Licorera', value: 'liquor' },
  { label: 'Tienda', value: 'store' },
];

const BANKS = ['Bancolombia', 'Davivienda', 'Nequi', 'Daviplata', 'BBVA'];
const ACCOUNT_TYPES = ['Ahorros', 'Corriente'];

const STEPS = [
  {
    tag: 'PASO 1 DE 4',
    title: 'Cuéntanos de tu negocio',
    sub: 'Estos datos aparecen en la app tal como los escribas.',
    fields: [
      { key: 'name', label: 'Nombre comercial', placeholder: 'Ej. Asadero El Puerto', kind: 'text', required: true },
      { key: 'vertical', label: 'Tipo de negocio', kind: 'select', options: VERTICALS },
      { key: 'nit', label: 'NIT o cédula del propietario', placeholder: '901.234.567-8', kind: 'text' },
      { key: 'phone', label: 'Celular de contacto', placeholder: '+57 320 000 0000', kind: 'text', required: true },
    ],
  },
  {
    tag: 'PASO 2 DE 4',
    title: '¿Dónde queda tu primera sucursal?',
    sub: 'Usamos la dirección para calcular tiempos y zonas de entrega.',
    fields: [
      { key: 'address', label: 'Dirección', placeholder: 'Cra. 3 # 4-58', kind: 'text', required: true },
      { key: 'neighborhood', label: 'Barrio o comuna', placeholder: 'Centro, Comuna 1', kind: 'text' },
      { key: 'directions', label: 'Indicaciones para el repartidor', placeholder: 'Local esquinero, al lado de la droguería', kind: 'text' },
    ],
  },
  {
    tag: 'PASO 3 DE 4',
    title: 'Sube tus documentos',
    sub: 'Los revisamos en menos de 24 horas. Puedes empezar a vender mientras tanto.',
    fields: [
      { key: 'doc_rut', label: 'RUT', placeholder: 'Cargar RUT actualizado', kind: 'upload' },
      { key: 'doc_camara', label: 'Cámara de comercio', placeholder: 'Cargar certificado (máx. 90 días)', kind: 'upload' },
      { key: 'doc_cedula', label: 'Cédula del representante', placeholder: 'Cargar cédula por ambas caras', kind: 'upload' },
      { key: 'doc_sanitario', label: 'Concepto sanitario (si aplica)', placeholder: 'Cargar concepto sanitario', kind: 'upload' },
    ],
  },
  {
    tag: 'PASO 4 DE 4',
    title: '¿Dónde te consignamos?',
    sub: 'Liquidamos todos los viernes con el corte del domingo anterior.',
    fields: [
      { key: 'bank', label: 'Banco', kind: 'select', options: BANKS.map((b) => ({ label: b, value: b })) },
      { key: 'account_type', label: 'Tipo de cuenta', kind: 'select', options: ACCOUNT_TYPES.map((a) => ({ label: a, value: a })) },
      { key: 'account_number', label: 'Número de cuenta', placeholder: '000-000000-00', kind: 'text' },
      { key: 'account_holder', label: 'Titular de la cuenta', placeholder: 'Como aparece en el banco', kind: 'text' },
      { key: 'email', label: 'Correo para entrar a la plataforma', placeholder: 'tucorreo@ejemplo.com', kind: 'email', required: true },
      { key: 'password', label: 'Contraseña', placeholder: 'Mínimo 8 caracteres', kind: 'password', required: true },
    ],
  },
];

const SIGNUP_PERKS = [
  { icon: 'storefront', text: 'Tu catálogo publicado el mismo día, sin desarrollo ni app propia.' },
  { icon: 'two_wheeler', text: 'Usa repartidores Tura o tu propia flota, tú decides por pedido.' },
  { icon: 'account_balance', text: 'Consignación semanal los viernes, con reporte de comisiones al detalle.' },
  { icon: 'insights', text: 'Reportes de ventas, productos top y horas de mayor demanda.' },
];

/** "Asadero El Puerto" -> "asadero-el-puerto" */
function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ vertical: 'restaurant', bank: 'Bancolombia', account_type: 'Ahorros' });
  const [uploads, setUploads] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const current = STEPS[step];
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const missing = current.fields
    .filter((f) => f.required && !String(form[f.key] ?? '').trim())
    .map((f) => f.label);

  const create = async () => {
    setError(null);

    if (!isConfigured()) {
      setError('Supabase todavía no está conectado en este entorno.');
      return;
    }
    if (String(form.password ?? '').length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();

      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.account_holder || form.name, role: 'business' },
        },
      });
      if (signUpError) throw new Error(signUpError.message);

      const userId = signUp.user?.id;
      if (!userId) {
        // Confirmación de correo activada: la ficha se crea al primer ingreso.
        setError('Te enviamos un correo para confirmar la cuenta. Confírmalo y vuelve a entrar.');
        return;
      }

      // El trigger de auth crea el perfil con rol 'customer'; lo pasamos a negocio.
      await supabase.from('profiles').update({
        role: 'business',
        full_name: form.account_holder || form.name,
        phone: form.phone,
      }).eq('id', userId);

      const { error: bizError } = await supabase.from('business_profiles').insert({
        id: userId,
        name: form.name,
        slug: `${slugify(form.name)}-${userId.slice(0, 6)}`,
        vertical: form.vertical,
        address: [form.address, form.neighborhood].filter(Boolean).join(', '),
        phone: form.phone,
        status: 'pending_review',
      });
      if (bizError) throw new Error(bizError.message);

      router.replace('/negocio');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (missing.length) {
      setError(`Falta completar: ${missing.join(', ')}.`);
      return;
    }
    setError(null);
    if (step === STEPS.length - 1) create();
    else setStep((s) => s + 1);
  };

  return (
    <div style={S.page}>
      {/* Panel de marca — mockup línea 79 */}
      <aside className="desktop-only" style={S.brand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={S.logo}>t</div>
          <div>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, letterSpacing: '-.01em' }}>
              TuraFood
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.05em' }}>
              NEGOCIOS
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', maxWidth: 430 }}>
          <div style={S.brandTitle}>Vende en línea en todo Buenaventura.</div>
          <div style={S.brandSub}>
            Restaurantes, farmacias, minimercados y licoreras. Publica tu catálogo,
            recibe pedidos y cobra sin montar tu propia app.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 34 }}>
            {SIGNUP_PERKS.map((p) => (
              <div key={p.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={S.perkIcon}>
                  <span className="ms" style={{ fontSize: 18, color: 'var(--primary)' }}>{p.icon}</span>
                </span>
                <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5, color: 'rgba(255,255,255,.86)', paddingTop: 4 }}>
                  {p.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 40, fontSize: 12, color: 'rgba(255,255,255,.36)' }}>
          Aprobación en menos de 24 horas · Sin costo de instalación
        </div>
      </aside>

      {/* Asistente */}
      <main style={S.formWrap}>
        <div style={{ width: '100%', maxWidth: 470 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {STEPS.map((_, i) => (
              <span
                key={i}
                style={{
                  flex: 1, height: 5, borderRadius: 99,
                  background: i <= step ? 'var(--primary)' : 'var(--surface2)',
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em', marginTop: 22 }}>
            {current.tag}
          </div>
          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 29, letterSpacing: '-.02em', marginTop: 6 }}>
            {current.title}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8 }}>
            {current.sub}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 26 }}>
            {current.fields.map((f) => (
              <label key={f.key} style={{ display: 'block' }}>
                <span style={S.label}>{f.label}</span>

                {f.kind === 'upload' && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => setUploads((u) => ({ ...u, [f.key]: !u[f.key] }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') setUploads((u) => ({ ...u, [f.key]: !u[f.key] })); }}
                    style={{
                      ...S.upload,
                      border: uploads[f.key] ? '1.5px solid var(--green)' : '1.5px dashed var(--faint)',
                    }}
                  >
                    <span style={{ ...S.uploadIcon, background: uploads[f.key] ? '#E6F6EE' : 'var(--surface2)' }}>
                      <span className="ms" style={{ fontSize: 19, color: uploads[f.key] ? '#0B8E54' : 'var(--muted)' }}>
                        {uploads[f.key] ? 'check' : 'upload_file'}
                      </span>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>
                        {uploads[f.key] ? 'Documento marcado' : f.placeholder}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                        PDF o imagen · máx. 8 MB
                      </span>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', flex: 'none' }}>
                      {uploads[f.key] ? 'Quitar' : 'Subir'}
                    </span>
                  </span>
                )}

                {f.kind === 'select' && (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
                    {f.options.map((o) => {
                      const on = form[f.key] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => set(f.key, o.value)}
                          style={{ ...S.chip, ...(on ? S.chipOn : S.chipOff) }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </span>
                )}

                {['text', 'email', 'password'].includes(f.kind) && (
                  <input
                    type={f.kind}
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    autoComplete={f.kind === 'password' ? 'new-password' : 'on'}
                    style={S.input}
                  />
                )}
              </label>
            ))}
          </div>

          {error && (
            <div style={S.error}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)} style={S.back}>
                Atrás
              </button>
            )}
            <button type="button" onClick={next} disabled={busy} className="md3-btn" style={S.next}>
              {busy ? 'Creando…' : step === STEPS.length - 1 ? 'Crear mi tienda' : 'Continuar'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 18 }}>
            <span className="ms" style={{ fontSize: 18, color: 'var(--muted)' }}>verified_user</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Tu tienda queda activa de inmediato con un límite de 20 pedidos diarios.
              El equipo de TuraFood revisa los documentos en las siguientes 24 horas
              para levantar el límite.
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push('/auth')}
            style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 20, fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}
          >
            Ya tengo cuenta · Iniciar sesión
          </button>
        </div>
      </main>
    </div>
  );
}

const S = {
  page: { display: 'flex', minHeight: '100dvh', background: 'var(--bg)' },
  brand: {
    flex: 'none', width: '44%', maxWidth: 620, background: '#17140F', color: '#fff',
    padding: '52px 56px', flexDirection: 'column',
  },
  logo: {
    width: 40, height: 40, borderRadius: 13, background: 'var(--primary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 23, color: '#fff',
  },
  brandTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 38,
    lineHeight: 1.08, letterSpacing: '-.025em', textWrap: 'balance',
  },
  brandSub: { marginTop: 16, fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,.62)' },
  perkIcon: {
    width: 30, height: 30, borderRadius: 10, background: 'rgba(255,255,255,.1)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  formWrap: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '48px 24px', overflowY: 'auto',
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 },
  input: {
    width: '100%', height: 50, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface)', padding: '0 15px', fontSize: 16, outline: 'none',
  },
  upload: {
    display: 'flex', alignItems: 'center', gap: 12, height: 64, borderRadius: 14,
    background: 'var(--surface)', padding: '0 16px', cursor: 'pointer',
  },
  uploadIcon: {
    width: 36, height: 36, borderRadius: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  chip: { height: 40, padding: '0 15px', borderRadius: 12, fontSize: 13.5, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  back: {
    height: 52, padding: '0 22px', borderRadius: 15, border: '1px solid var(--border)',
    background: 'var(--surface)', fontWeight: 700, fontSize: 14.5, flex: 'none',
  },
  next: {
    flex: 1, height: 52, borderRadius: 15, background: 'var(--primary)', color: '#fff',
    fontWeight: 700, fontSize: 15, boxShadow: '0 10px 24px rgba(255,68,31,.3)',
  },
  error: {
    display: 'flex', alignItems: 'center', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
