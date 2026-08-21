'use client';

/**
 * VERIFICACIÓN DEL NEGOCIO ULTRA PRO (FIGMA STYLE + CERO GLITCHES DE SCROLL)
 *
 * Módulo de verificación paso a paso, limpio, sin desbordamientos
 * horizontales y con estética premium de alto contraste.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  updateBusiness,
  submitForReview,
  checklistOf,
} from '@/lib/negocio';
import Vertical3D from '../../components/Vertical3D';
import { useBiz } from '../BizContext';
import Videollamada from '../../components/Videollamada';
import Compromiso24h from '../../components/Compromiso24h';

const VERTICALS = [
  { value: 'restaurant', label: 'Restaurante / Comidas' },
  { value: 'pharmacy', label: 'Farmacia' },
  { value: 'market', label: 'Supermercado' },
  { value: 'liquor', label: 'Licorera' },
  { value: 'store', label: 'Tienda de Barrio' },
];

const STEPS = [
  {
    id: 'datos',
    icon: 'person',
    short: '1. Tus Datos',
    title: '¿Con quién hablamos?',
    sub: 'Datos del propietario o administrador para coordinar la activación.',
    fields: ['owner_name', 'nit', 'phone'],
  },
  {
    id: 'negocio',
    icon: 'storefront',
    short: '2. Tu Negocio',
    title: 'Ficha de tu negocio',
    sub: 'Información visible para los clientes y domiciliarios en Buenaventura.',
    fields: ['name', 'vertical', 'address', 'neighborhood'],
  },
  {
    id: 'llamada',
    icon: 'videocam',
    short: '3. Videollamada',
    title: 'Agenda tu videollamada express',
    sub: 'Conoce al equipo de TuraFood en 15 mins y levanta los topes a ilimitado.',
    fields: [],
  },
];

export default function VerificacionPage() {
  const { business, loading, toast, refreshBusiness } = useBiz();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!business) return;
    setForm({
      name: business.name ?? '',
      vertical: business.vertical ?? 'restaurant',
      nit: business.nit ?? '',
      phone: business.phone ?? '',
      address: business.address ?? '',
      neighborhood: business.neighborhood ?? '',
      courier_notes: business.courier_notes ?? '',
      owner_name: business.owner_name ?? '',
    });
  }, [business]);

  const checklist = useMemo(() => checklistOf(business, []), [business]);
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const complete = doneCount === checklist.length;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const saveAndGo = async (nextStep) => {
    const current = STEPS[step];
    setError(null);

    if (current.fields.length && business?.id) {
      setSaving(true);
      try {
        const patch = Object.fromEntries(current.fields.map((k) => [k, form[k]]));
        await updateBusiness(business.id, patch);
        await refreshBusiness?.();
      } catch (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    if (nextStep === 'done') {
      toast('✓ Datos guardados con éxito');
      return;
    }

    setStep(nextStep);
  };

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      await submitForReview();
      await refreshBusiness?.();
      toast('🚀 Registro enviado a revisión');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading || !form) {
    return (
      <div style={{ padding: 60, textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
        Cargando verificación…
      </div>
    );
  }

  const approved = business?.status === 'active';
  const submitted = Boolean(business?.submitted_at);
  const current = STEPS[step];

  return (
    <div style={S.container}>
      
      {/* ─────────── HERO HEADER ULTRA PRO ─────────── */}
      <section style={S.hero}>
        <div style={S.heroGlow} />

        <div style={S.heroContent}>
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* Status Pill */}
            <div style={S.statusBadge}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: approved ? '#10B981' : '#FBBF24', boxShadow: approved ? '0 0 10px #10B981' : '0 0 10px #FBBF24' }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.04em' }}>
                {approved
                  ? 'NEGOCIO ACTIVO & SIN LÍMITES'
                  : submitted
                    ? 'REGISTRO EN REVISIÓN (MENOS DE 24H)'
                    : 'VERIFICACIÓN EN CURSO (TOPE: 20 PEDIDOS/DÍA)'}
              </span>
            </div>

            <h1 style={S.heroTitle}>
              {approved
                ? '¡Tu negocio está 100% verificado!'
                : 'Verificación y Activación VIP'}
            </h1>

            <p style={S.heroSub}>
              {approved
                ? 'Tu tienda ya es visible para todos los clientes en Buenaventura con recepción de órdenes ilimitadas y repartidores prioritarios.'
                : 'Completa los 3 pasos rápidos para levantar los límites de despacho y activar el pago directo a tus cuentas.'}
            </p>
          </div>

          {/* Donut Chart de Progreso */}
          <div style={S.donutBox}>
            <div style={{
              ...S.donutRing,
              background: `conic-gradient(#FF7A4D ${pct * 3.6}deg, rgba(255,255,255,0.08) 0)`,
            }}>
              <div style={S.donutHole}>
                <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-bricolage)', color: '#fff' }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '.05em' }}>
                  COMPLETO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compromiso 24 Horas */}
        <div style={{ marginTop: 20 }}>
          <Compromiso24h
            desde={business?.verification_call_at ?? business?.onboarding_at}
            aprobado={business?.status === 'active'}
          />
        </div>

        {/* Stepper Tabs Bar */}
        <div style={S.stepperBar}>
          {STEPS.map((s, idx) => {
            const isDone = checklist[idx]?.done;
            const isActive = idx === step;
            return (
              <button
                key={s.id}
                onClick={() => setStep(idx)}
                style={{
                  ...S.stepTab,
                  background: isActive ? '#fff' : 'rgba(255,255,255,0.06)',
                  color: isActive ? '#141009' : 'rgba(255,255,255,0.8)',
                  boxShadow: isActive ? '0 6px 20px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isDone ? '#10B981' : isActive ? '#FF441F' : 'rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 11, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
                }}>
                  {isDone ? '✓' : idx + 1}
                </span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>{s.short}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────── CARD DEL PASO ACTIVO (CERO OVERFLOW GLITCH) ─────────── */}
      <section style={S.activeCard} className="anim-fade">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'var(--primary-tint)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
          }}>
            <span className="ms" style={{ fontSize: 24 }}>{current.icon}</span>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em' }}>
              PASO {step + 1} DE {STEPS.length}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '2px 0 0', color: 'var(--text)' }}>
              {current.title}
            </h2>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
              {current.sub}
            </div>
          </div>
        </div>

        {/* 1. Paso Datos */}
        {current.id === 'datos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field
              label="Nombre del Propietario / Administrador"
              value={form.owner_name}
              onChange={(v) => set('owner_name', v)}
              placeholder="Ej. Carlos Martínez"
            />
            <Field
              label="Número de WhatsApp Directo"
              value={form.phone}
              onChange={(v) => set('phone', v)}
              placeholder="Ej. 313 759 4713"
            />
            <Field
              label="Cédula de Ciudadanía o NIT (Opcional)"
              value={form.nit}
              onChange={(v) => set('nit', v)}
              placeholder="Ej. 1111823902 o 901.234.567-8"
            />

            <div style={S.infoBox}>
              <span className="ms" style={{ color: 'var(--primary)', fontSize: 20 }}>verified_user</span>
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.45 }}>
                Tus datos están protegidos con encriptación bancaria y solo se usan para confirmar tus liquidaciones directas.
              </div>
            </div>
          </div>
        )}

        {/* 2. Paso Negocio */}
        {current.id === 'negocio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field
              label="Nombre Comercial del Restaurante / Negocio"
              value={form.name}
              onChange={(v) => set('name', v)}
              placeholder="Ej. Asadero & Parrilla El Puerto"
            />

            {/* Selector de Nicho */}
            <div>
              <span style={S.label}>Tipo de Comercio</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                {VERTICALS.map((v) => {
                  const sel = form.vertical === v.value;
                  return (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => set('vertical', v.value)}
                      style={{
                        padding: '10px 14px', borderRadius: 12, textAlign: 'left',
                        border: sel ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: sel ? 'var(--primary-tint)' : 'var(--surface2)',
                        color: sel ? 'var(--primary)' : 'var(--text)',
                        fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <span>{v.label}</span>
                      {sel && <span>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field
                label="Dirección Física"
                value={form.address}
                onChange={(v) => set('address', v)}
                placeholder="Ej. Carrera 3 # 4-58"
              />
              <Field
                label="Barrio o Comuna"
                value={form.neighborhood}
                onChange={(v) => set('neighborhood', v)}
                placeholder="Ej. Centro, Comuna 1"
              />
            </div>

            <div style={S.infoBox}>
              <span className="ms" style={{ color: 'var(--green)', fontSize: 20 }}>location_on</span>
              <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.45 }}>
                Una dirección clara le permite a los domiciliarios de TuraFood recoger tus pedidos en tiempo récord.
              </div>
            </div>
          </div>
        )}

        {/* 3. Paso Videollamada */}
        {current.id === 'llamada' && (
          <div>
            <Videollamada />
          </div>
        )}

        {error && (
          <div style={S.errorBox}>
            <span className="ms" style={{ fontSize: 18 }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Navegación del Wizard */}
        <div style={S.wizardNav}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              style={S.backBtn}
            >
              <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
              Atrás
            </button>
          )}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={() => saveAndGo(step === STEPS.length - 1 ? 'done' : step + 1)}
            disabled={saving}
            className="md3-btn"
            style={S.nextBtn}
          >
            {saving
              ? 'Guardando…'
              : step === STEPS.length - 1
                ? 'Guardar Información'
                : 'Guardar y Continuar'}
            {step < STEPS.length - 1 && (
              <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
            )}
          </button>
        </div>
      </section>

      {/* ─────────── RESUMEN FINAL / CHECKLIST BOTTOM ─────────── */}
      {!approved && (
        <section style={S.bottomCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Vertical3D vertical={business?.vertical} size={64} />
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {complete ? '🎉 Todo listo para verificación definitiva' : `Tienes ${doneCount} de ${checklist.length} campos completos`}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                {complete
                  ? 'Envía tu registro a revisión y activaremos tu cuenta con prioridad en menos de 24 horas.'
                  : 'Completa los pasos restantes para levantar los topes de 20 pedidos diarios.'}
              </div>
            </div>

            <button
              onClick={send}
              disabled={sending}
              style={{
                height: 48, padding: '0 24px', borderRadius: 14, border: 'none',
                background: complete ? 'linear-gradient(135deg, #10B981, #059669)' : 'var(--surface2)',
                color: complete ? '#fff' : 'var(--muted)',
                fontSize: 14, fontWeight: 800, cursor: complete ? 'pointer' : 'default',
                boxShadow: complete ? '0 8px 20px rgba(16,185,129,0.35)' : 'none',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span className="ms" style={{ fontSize: 18 }}>send</span>
              {sending ? 'Enviando…' : 'Enviar a Revisión'}
            </button>
          </div>
        </section>
      )}

    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <span style={S.label}>{label}</span>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.input}
      />
    </div>
  );
}

const S = {
  container: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '24px 20px 80px',
    width: '100%',
  },

  hero: {
    position: 'relative',
    borderRadius: 28,
    padding: '36px 32px',
    background: 'linear-gradient(135deg, #1A1612 0%, #0A0806 100%)',
    border: '1px solid rgba(232, 199, 102, 0.25)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
    marginBottom: 24,
    color: '#fff',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute', top: -80, right: -80, width: 300, height: 300,
    borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,122,77,0.25) 0%, transparent 70%)',
    filter: 'blur(40px)', pointerEvents: 'none',
  },
  heroContent: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 24, flexWrap: 'wrap', position: 'relative', zIndex: 2,
  },
  statusBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px',
    borderRadius: 99, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    marginBottom: 14, color: 'rgba(255,255,255,0.9)',
  },
  heroTitle: {
    fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800,
    fontFamily: 'var(--font-bricolage)', lineHeight: 1.15, margin: '0 0 10px', color: '#fff',
  },
  heroSub: {
    fontSize: 14, lineHeight: 1.55, color: 'rgba(255,255,255,0.7)', margin: 0,
  },

  donutBox: { flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  donutRing: {
    width: 86, height: 86, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 8,
    boxShadow: '0 0 20px rgba(255,122,77,0.3)',
  },
  donutHole: {
    width: '100%', height: '100%', borderRadius: '50%', background: '#120F0C',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },

  stepperBar: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
    marginTop: 24, position: 'relative', zIndex: 2,
  },
  stepTab: {
    height: 46, padding: '0 14px', borderRadius: 14, border: 'none',
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
    transition: 'all .25s ease',
  },

  activeCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: '32px 30px',
    boxShadow: 'var(--shadow)',
    marginBottom: 20,
  },
  label: {
    display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8,
  },
  input: {
    width: '100%', height: 48, borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface2)', padding: '0 16px', fontSize: 14.5, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)',
  },

  infoBox: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
    borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
    borderRadius: 12, background: '#FFF1EC', color: 'var(--primary)',
    fontSize: 13, fontWeight: 700, marginTop: 16,
  },

  wizardNav: {
    display: 'flex', alignItems: 'center', gap: 12, marginTop: 28,
    paddingTop: 20, borderTop: '1px solid var(--border)',
  },
  backBtn: {
    height: 48, padding: '0 20px', borderRadius: 14, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 13.5, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  },
  nextBtn: {
    height: 48, padding: '0 24px', borderRadius: 14, border: 'none',
    background: 'var(--primary)', color: '#fff', fontSize: 14, fontWeight: 800,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    boxShadow: '0 6px 18px rgba(255,68,31,0.3)',
  },

  bottomCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 24,
    padding: '24px 28px',
    boxShadow: 'var(--shadowSm)',
  },
};
