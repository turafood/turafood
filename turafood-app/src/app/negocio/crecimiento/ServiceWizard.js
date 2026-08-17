'use client';

/**
 * ASISTENTE DE SERVICIOS
 *
 * Un solo componente para los tres servicios: ficha de Google, campañas
 * y agente de voz. Cada uno aporta su definición de pasos y campos.
 *
 * Guarda el borrador al cambiar de paso, así que se puede cerrar a
 * medias y retomar: son formularios largos y nadie los llena de una
 * sentada.
 *
 * Al terminar NO se conecta nada solo. Manda la solicitud al equipo de
 * TuraFood, y eso se dice en la pantalla: hacer creer que el botón
 * publicó algo en Google es la forma más rápida de perder la confianza
 * del negocio.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getServiceRequest, saveServiceDraft, submitServiceRequest, SERVICE_STATUS } from '@/lib/servicios';
import { cop } from '@/lib/format';
import { useBiz } from '../BizContext';
import VoicePicker from './VoicePicker';

export default function ServiceWizard({ config }) {
  const { business, toast } = useBiz();

  const [request, setRequest] = useState(null);
  const [form, setForm] = useState({});
  const [step, setStep] = useState(-1);     // -1 = portada
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const top = useRef(null);

  useEffect(() => {
    if (!business) return undefined;
    let alive = true;
    (async () => {
      try {
        const row = await getServiceRequest(business.id, config.kind);
        if (!alive) return;
        setRequest(row);
        setForm({ ...(config.defaults ?? {}), ...(row?.payload ?? {}) });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [business, config]);

  useEffect(() => {
    top.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const missingIn = (s) => s.fields
    .filter((f) => f.required && !hasValue(form[f.key]))
    .map((f) => f.label);

  const persist = async (payload) => {
    try {
      await saveServiceDraft(config.kind, payload);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const planStep = config.steps.length;   // el último: elegir plan

  /**
   * El plan es un paso más del riel, y va de último a propósito:
   * primero la persona arma lo suyo y ve qué recibe; recién ahí se
   * habla de plata. Es como funciona Google Ads.
   */
  const railSteps = [
    ...config.steps,
    { id: 'plan', short: 'Plan' },
  ];

  const go = async (to) => {
    setError(null);
    if (to > step && step >= 0 && step < planStep) {
      const missing = missingIn(config.steps[step]);
      if (missing.length) {
        setError(`Falta: ${missing.join(', ')}.`);
        return;
      }
      setSaving(true);
      try { await persist(form); } catch { setSaving(false); return; }
      setSaving(false);
    }
    setStep(to);
  };

  const send = async () => {
    setError(null);
    const missing = config.steps.flatMap(missingIn);
    if (missing.length) {
      setError(`Falta completar: ${missing.join(', ')}.`);
      return;
    }
    if (config.plans?.length && !form.plan) {
      setError('Elige con qué plan quieres activarlo.');
      return;
    }
    setSaving(true);
    try {
      const row = await submitServiceRequest(config.kind, form);
      setRequest(row);
      setStep(-2);   // pantalla de "listo"
      toast('Solicitud enviada al equipo de TuraFood');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Cargando…</div>;
  }

  const status = SERVICE_STATUS[request?.status] ?? SERVICE_STATUS.draft;
  const alreadySent = request && request.status !== 'draft';

  return (
    <div style={{ maxWidth: 820 }} ref={top}>
      <Link href="/negocio/crecimiento" style={S.back}>
        <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
        Volver a crecimiento
      </Link>

      {/* Portada */}
      {step === -1 && (
        <section style={S.card} className="anim-up">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ ...S.bigIcon, background: config.tint }}>
              <span className="ms" style={{ fontSize: 30, color: config.accent }}>{config.icon}</span>
            </span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <h1 style={S.title}>{config.title}</h1>
                {alreadySent && (
                  <span style={{ ...S.statusPill, background: status.bg, color: status.color }}>
                    {status.label}
                  </span>
                )}
              </div>
              <p style={S.sub}>{config.intro.body}</p>
            </div>
          </div>

          <ul style={S.bullets}>
            {config.intro.bullets.map((b) => (
              <li key={b} style={S.bullet}>
                <span className="ms" style={{ fontSize: 18, color: config.accent, flex: 'none' }}>check_circle</span>
                {b}
              </li>
            ))}
          </ul>

          {/* Lo que de verdad pasa al enviar */}
          <div style={S.honest}>
            <span className="ms" style={{ fontSize: 19, color: 'var(--muted)', flex: 'none' }}>info</span>
            <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}>
              Esto no se conecta solo. Con lo que registres aquí, el equipo de TuraFood
              lo monta y te avisa cuando quede listo{config.intro.eta ? ` — normalmente en ${config.intro.eta}` : ''}.
              Puedes guardar a medias y volver después.
            </span>
          </div>

          {request?.team_notes && (
            <div style={S.teamNote}>
              <span className="ms" style={{ fontSize: 18, color: 'var(--primary)', flex: 'none' }}>forum</span>
              <span>
                <b style={{ display: 'block', fontSize: 11.5, letterSpacing: '.04em', color: 'var(--muted)' }}>
                  NOTA DEL EQUIPO
                </b>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>
                  {request.team_notes}
                </span>
              </span>
            </div>
          )}

          <button onClick={() => go(0)} className="md3-btn" style={{ ...S.primary, background: config.accent }}>
            {alreadySent ? 'Revisar o actualizar mis datos' : config.intro.cta}
            <span className="ms" style={{ fontSize: 19 }}>arrow_forward</span>
          </button>
        </section>
      )}

      {/* Enviado */}
      {step === -2 && (
        <section style={{ ...S.card, textAlign: 'center' }} className="anim-up">
          <span style={{ ...S.bigIcon, background: '#E6F6EE', margin: '0 auto' }}>
            <span className="ms" style={{ fontSize: 32, color: '#0B8E54' }}>mark_email_read</span>
          </span>
          <h1 style={{ ...S.title, marginTop: 18 }}>Quedó en manos del equipo</h1>
          <p style={{ ...S.sub, maxWidth: 460, margin: '10px auto 0' }}>
            Recibimos todo lo que registraste. {config.intro.eta
              ? `Normalmente lo tenemos listo en ${config.intro.eta}.`
              : 'Te avisamos apenas esté listo.'} Si necesitamos algo más, te escribimos
            al celular que tienes en tu cuenta.
          </p>
          <div style={{ display: 'flex', gap: 11, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            <button onClick={() => setStep(0)} style={S.ghost}>Revisar lo que envié</button>
            <Link href="/negocio/crecimiento" className="md3-btn" style={{ ...S.primary, background: config.accent, marginTop: 0 }}>
              Ver otros servicios
            </Link>
          </div>
        </section>
      )}

      {/* Pasos */}
      {step >= 0 && (
        <>
          <section style={{ ...S.card, marginBottom: 16 }}>
            <ol className="hs" style={S.rail}>
              {railSteps.map((s, i) => {
                const done = i === planStep
                  ? Boolean(form.plan)
                  : missingIn(config.steps[i]).length === 0;
                const active = i === step;
                return (
                  <li key={s.id} style={S.railItem}>
                    <button
                      onClick={() => setStep(i)}
                      style={{ ...S.railBtn, ...(active ? S.railActive : null) }}
                      aria-current={active ? 'step' : undefined}
                    >
                      <span
                        style={{
                          ...S.railDot,
                          background: done ? 'var(--green)' : active ? config.accent : 'var(--surface2)',
                          color: done || active ? '#fff' : 'var(--muted)',
                        }}
                      >
                        {done
                          ? <span className="ms" style={{ fontSize: 15 }}>check</span>
                          : <span style={{ fontSize: 12, fontWeight: 800 }}>{i + 1}</span>}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.short}</span>
                    </button>
                    {i < railSteps.length - 1 && <span style={S.railLine} />}
                  </li>
                );
              })}
            </ol>
          </section>

          <section style={S.card} className="anim-up" key={step}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: config.accent, letterSpacing: '.06em' }}>
              PASO {step + 1} DE {railSteps.length}
            </div>
            <h2 style={{ ...S.title, fontSize: 22, marginTop: 5 }}>
              {step === planStep ? 'Con qué plan lo activamos' : config.steps[step].title}
            </h2>
            <p style={{ ...S.sub, marginTop: 6 }}>
              {step === planStep
                ? 'Ya está configurado. Elige el plan con el que quieres arrancar; puedes cambiarlo después sin perder nada de lo que llenaste.'
                : config.steps[step].sub}
            </p>

            <div style={{ marginTop: 22 }}>
              {step === planStep ? (
                <PlanPicker
                  plans={config.plans}
                  note={config.planNote}
                  value={form.plan}
                  onChange={(v) => set('plan', v)}
                  accent={config.accent}
                />
              ) : (
                config.steps[step].fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    field={f}
                    value={form[f.key]}
                    onChange={(v) => set(f.key, v)}
                    accent={config.accent}
                  />
                ))
              )}
            </div>

            {error && (
              <div style={S.error}>
                <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
                <span>{error}</span>
              </div>
            )}

            <div style={S.nav}>
              <button onClick={() => go(step - 1)} style={S.ghost}>
                <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
                {step === 0 ? 'Volver' : 'Atrás'}
              </button>
              <div style={{ flex: 1 }} />
              {step < planStep ? (
                <button onClick={() => go(step + 1)} disabled={saving} className="md3-btn" style={{ ...S.primary, background: config.accent, marginTop: 0 }}>
                  {saving ? 'Guardando…' : 'Guardar y continuar'}
                  <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              ) : (
                <button onClick={send} disabled={saving} className="md3-btn" style={{ ...S.primary, background: config.accent, marginTop: 0 }}>
                  {saving ? 'Enviando…' : alreadySent ? 'Actualizar solicitud' : 'Enviar al equipo'}
                  <span className="ms" style={{ fontSize: 18 }}>send</span>
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}


/**
 * Selector de plan.
 *
 * El precio se muestra completo y sin letra chica. Cuando el servicio
 * tiene un costo aparte que no cobra TuraFood —la inversión en Google,
 * por ejemplo— se dice arriba, no escondido al final.
 */
function PlanPicker({ plans = [], note, value, onChange, accent }) {
  return (
    <div>
      {note && (
        <div style={S.planNote}>
          <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>info</span>
          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--muted)' }}>{note}</span>
        </div>
      )}

      <div style={S.planGrid}>
        {plans.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onChange(p.id)}
              style={{
                ...S.plan,
                borderColor: on ? accent : 'var(--border)',
                boxShadow: on ? `0 0 0 2px ${accent}22` : 'none',
              }}
            >
              {p.recommended && (
                <span style={{ ...S.planTag, background: accent }}>MÁS ELEGIDO</span>
              )}

              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17 }}>
                  {p.name}
                </span>
                <span
                  style={{
                    ...S.radio,
                    borderColor: on ? accent : 'var(--faint)',
                    background: on ? accent : 'transparent',
                  }}
                >
                  {on && <span className="ms" style={{ fontSize: 14, color: '#fff' }}>check</span>}
                </span>
              </span>

              <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em' }}>
                  {cop(p.price)}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 700 }}>{p.period}</span>
              </span>

              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 8, textAlign: 'left' }}>
                {p.summary}
              </span>

              <span style={S.planList}>
                {p.includes.map((i) => (
                  <span key={i} style={S.planItem}>
                    <span className="ms" style={{ fontSize: 16, color: accent, flex: 'none' }}>check</span>
                    {i}
                  </span>
                ))}
              </span>

              {p.suggested && (
                <span style={S.planSuggested}>{p.suggested}</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={S.planFoot}>
        <span className="ms" style={{ fontSize: 18, color: 'var(--muted)', flex: 'none' }}>handshake</span>
        <span style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--muted)' }}>
          Sin permanencia y sin cobro por adelantado: primero lo montamos, lo
          apruebas, y ahí empieza a correr el plan. Si contratas varios servicios te
          armamos un solo precio.
        </span>
      </div>
    </div>
  );
}

const hasValue = (v) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0);

function FieldRenderer({ field, value, onChange, accent }) {
  if (field.type === 'voice') {
    return <VoicePicker field={field} value={value} onChange={onChange} accent={accent} />;
  }

  if (field.type === 'chips' || field.type === 'multi') {
    const multi = field.type === 'multi';
    const selected = multi ? (value ?? []) : value;

    const pick = (v) => {
      if (!multi) { onChange(v); return; }
      const list = value ?? [];
      onChange(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    };

    return (
      <div style={{ marginBottom: 16 }}>
        <Label field={field} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {field.options.map((o) => {
            const on = multi ? selected.includes(o.value) : selected === o.value;
            return (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                style={{
                  ...S.chip,
                  ...(on
                    ? { background: accent, color: '#fff', border: `1px solid ${accent}` }
                    : { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }),
                }}
              >
                {o.icon && <span className="ms" style={{ fontSize: 17 }}>{o.icon}</span>}
                {o.label}
              </button>
            );
          })}
        </div>
        {field.hint && <p style={S.hint}>{field.hint}</p>}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label style={{ display: 'block', marginBottom: 16 }}>
        <Label field={field} />
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          style={{ ...S.input, height: 'auto', padding: '12px 14px', resize: 'vertical', lineHeight: 1.5 }}
        />
        {field.hint && <p style={S.hint}>{field.hint}</p>}
      </label>
    );
  }

  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <Label field={field} />
      <input
        type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        style={S.input}
      />
      {field.hint && <p style={S.hint}>{field.hint}</p>}
    </label>
  );
}

function Label({ field }) {
  return (
    <span style={S.label}>
      {field.label}
      {!field.required && <span style={{ color: 'var(--faint)', fontWeight: 600 }}> · opcional</span>}
    </span>
  );
}

const S = {
  back: {
    display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14,
    fontSize: 13, fontWeight: 700, color: 'var(--muted)', textDecoration: 'none',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 24, boxShadow: 'var(--shadowSm)',
  },
  bigIcon: {
    width: 62, height: 62, borderRadius: 20, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 25, letterSpacing: '-.02em',
  },
  sub: { margin: '8px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6 },
  statusPill: { fontSize: 10.5, fontWeight: 800, padding: '5px 10px', borderRadius: 8 },
  bullets: {
    listStyle: 'none', margin: '20px 0 0', padding: 0,
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 11,
  },
  bullet: {
    display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13,
    lineHeight: 1.5, color: 'var(--text)',
  },
  honest: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20,
    padding: 14, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)',
  },
  teamNote: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 12,
    padding: 14, borderRadius: 14, background: 'var(--bg)',
    borderLeft: '3px solid var(--primary)',
  },
  primary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, padding: '0 24px', borderRadius: 15, color: '#fff',
    fontSize: 14.5, fontWeight: 700, marginTop: 22, textDecoration: 'none',
  },
  ghost: {
    display: 'inline-flex', alignItems: 'center', gap: 7, height: 50, padding: '0 20px',
    borderRadius: 15, border: '1px solid var(--border)', fontSize: 14, fontWeight: 700,
  },
  rail: {
    display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none',
    margin: 0, padding: '2px 0',
  },
  railItem: { display: 'flex', alignItems: 'center', gap: 4, flex: 'none' },
  railBtn: {
    display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px',
    borderRadius: 999, background: 'transparent',
  },
  railActive: { background: 'var(--bg)' },
  railDot: {
    width: 24, height: 24, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  railLine: { width: 18, height: 2, background: 'var(--border)', borderRadius: 2, flex: 'none' },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 },
  input: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
    fontFamily: 'inherit', color: 'var(--text)',
  },
  chip: {
    display: 'flex', alignItems: 'center', gap: 7, height: 42, padding: '0 15px',
    borderRadius: 12, fontSize: 13, fontWeight: 700,
  },
  hint: { margin: '7px 0 0', fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 },
  nav: {
    display: 'flex', alignItems: 'center', gap: 11, marginTop: 24,
    paddingTop: 18, borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  planNote: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
    padding: 13, borderRadius: 14, background: 'var(--bg)', border: '1px solid var(--border)',
  },
  planGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12,
  },
  plan: {
    position: 'relative', display: 'block', textAlign: 'left', padding: 18,
    borderRadius: 18, border: '1.5px solid', background: 'var(--surface)',
    transition: 'border-color .15s ease, box-shadow .15s ease',
  },
  planTag: {
    position: 'absolute', top: -9, left: 16, fontSize: 9, fontWeight: 800,
    letterSpacing: '.06em', padding: '4px 8px', borderRadius: 6, color: '#fff',
  },
  radio: {
    width: 24, height: 24, borderRadius: '50%', border: '2px solid', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  planList: {
    display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14,
    paddingTop: 13, borderTop: '1px solid var(--border)',
  },
  planItem: {
    display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12.5, lineHeight: 1.45,
  },
  planSuggested: {
    display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 12,
    paddingTop: 10, borderTop: '1px dashed var(--border)', lineHeight: 1.45,
  },
  planFoot: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16,
    padding: 13, borderRadius: 14, background: 'var(--bg)',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 18, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
