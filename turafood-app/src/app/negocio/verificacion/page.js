'use client';

/**
 * VERIFICACIÓN DEL NEGOCIO — ASISTENTE
 *
 * Aquí vive lo que antes era el alta previa al ingreso. La diferencia
 * es que ahora se recorre paso a paso desde adentro y se puede dejar a
 * medias: cada paso se guarda al avanzar y el riel de arriba muestra
 * en qué punto va.
 *
 * Se puede saltar a cualquier paso tocando el riel. Obligar a pasar en
 * orden molesta a quien solo entró a cambiar la cuenta bancaria.
 *
 * "Enviar a revisión" llama a `submit_business_for_review()`, que
 * revalida todo en el servidor: si esta pantalla marca algo como listo
 * por error, la base no deja pasar igual.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDocuments, updateBusiness, uploadDocument, deleteDocument,
  submitForReview, checklistOf, REQUIRED_DOCS, DOC_LABELS,
} from '@/lib/negocio';
import Vertical3D from '../../components/Vertical3D';
import { useBiz } from '../BizContext';
import Videollamada from '../../components/Videollamada';

const VERTICALS = [
  { value: 'restaurant', label: 'Restaurante' },
  { value: 'pharmacy', label: 'Farmacia' },
  { value: 'market', label: 'Minimercado' },
  { value: 'liquor', label: 'Licorera' },
  { value: 'store', label: 'Tienda' },
];

const BANKS = ['Bancolombia', 'Davivienda', 'Nequi', 'Daviplata', 'BBVA', 'Banco de Bogotá'];
const ACCOUNT_TYPES = ['Ahorros', 'Corriente'];
const DOC_ORDER = ['rut', 'chamber', 'id_card', 'health'];

/** Los cuatro pasos, con los campos que guarda cada uno */
/**
 * TRES PASOS, NINGUNO OBLIGATORIO
 *
 * Antes eran cuatro y pedían NIT, cámara de comercio, RUT, concepto
 * sanitario y cuenta bancaria antes de aprobar. Eso dejaba por fuera a
 * la mitad de los negocios del puerto — los que trabajan hace años sin
 * papeles al día — que es justo a quienes queremos adentro.
 *
 * Ahora se piden datos livianos y la verificación de verdad pasa en
 * una videollamada con el equipo. Ahí se conoce el negocio, se
 * resuelven dudas y se decide si se le levantan los topes. Un humano
 * decidiendo en 30 minutos es mejor filtro que un PDF que nadie mira.
 *
 * Los tres pasos se pueden saltar. Lo único que hace falta para
 * agendar la llamada es un WhatsApp donde contestar.
 */
const STEPS = [
  {
    id: 'datos', icon: 'person', short: 'Tus datos',
    title: '¿Con quién hablamos?',
    sub: 'Solo lo básico para poder llamarte. Nada de esto sale en la app.',
    fields: ['owner_name', 'nit', 'phone'],
  },
  {
    id: 'negocio', icon: 'storefront', short: 'Tu negocio',
    title: 'Cuéntanos de tu negocio',
    sub: 'Así aparece tu tienda para los clientes. Lo cambias cuando quieras.',
    fields: ['name', 'vertical', 'address', 'neighborhood'],
  },
  {
    id: 'llamada', icon: 'videocam', short: 'Videollamada',
    title: 'Agenda tu videollamada',
    sub: 'El equipo de TuraFood te conoce y te levanta los topes.',
    fields: [],
  },
];

export default function VerificacionPage() {
  const { business, loading, toast, refreshBusiness } = useBiz();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const top = useRef(null);

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
      bank_name: business.bank_name ?? BANKS[0],
      bank_account_type: business.bank_account_type ?? 'Ahorros',
      bank_account_number: business.bank_account_number ?? '',
      bank_account_holder: business.bank_account_holder ?? '',
    });
  }, [business]);

  useEffect(() => {
    if (!business) return;
    let alive = true;
    getDocuments(business.id)
      .then((rows) => { if (alive) setDocs(rows); })
      .catch(() => {});
    return () => { alive = false; };
  }, [business]);

  // Al cambiar de paso, volver arriba: si no, se entra a media pantalla
  useEffect(() => {
    top.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [step]);

  const merged = useMemo(
    () => (business && form ? { ...business, ...form } : business),
    [business, form],
  );
  const checklist = useMemo(() => checklistOf(merged), [merged]);
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const complete = doneCount === checklist.length;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  /** Guarda el paso actual y se mueve a `to` */
  const saveAndGo = async (to) => {
    const current = STEPS[step];
    setError(null);

    if (current.fields.length) {
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

    if (to === 'done') {
      toast('Guardado');
      return;
    }
    setStep(to);
  };

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      await submitForReview();
      await refreshBusiness?.();
      toast('Registro enviado a revisión');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading || !form) {
    return <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>Cargando…</div>;
  }

  const approved = business?.status === 'active';
  const submitted = Boolean(business?.submitted_at);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div style={{ maxWidth: 820 }} ref={top}>
      {/* Cabecera con progreso */}
      <section style={S.head}>
        <div style={S.headTop}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={S.headTitle}>
              {approved
                ? 'Tu negocio está aprobado'
                : submitted ? 'Registro en revisión' : 'Completa tu registro'}
            </div>
            <div style={S.headSub}>
              {approved
                ? 'Ya estás visible en la app de clientes y sin límite de pedidos diarios.'
                : submitted
                  ? 'Recibimos tus documentos. Los revisamos en menos de 24 horas; mientras tanto sigues vendiendo con un límite de 20 pedidos diarios.'
                  : 'Mientras esté incompleto vendes con un límite de 20 pedidos diarios. Al aprobarlo se levanta.'}
            </div>
          </div>

          <div style={S.ring}>
            <div style={{ ...S.ringFill, background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--surface2) 0)` }} />
            <div style={S.ringHole}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19 }}>{pct}%</span>
            </div>
          </div>
        </div>

        {/* Riel de pasos: se puede saltar a cualquiera */}
        <ol className="hs" style={S.rail}>
          {STEPS.map((s, i) => {
            const done = checklist[i].done;
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
                      background: done ? 'var(--green)' : active ? 'var(--primary)' : 'var(--surface2)',
                      color: done || active ? '#fff' : 'var(--muted)',
                    }}
                  >
                    {done
                      ? <span className="ms" style={{ fontSize: 15 }}>check</span>
                      : <span style={{ fontSize: 12, fontWeight: 800 }}>{i + 1}</span>}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.short}</span>
                </button>
                {i < STEPS.length - 1 && <span style={S.railLine} />}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Paso actual */}
      <section style={S.card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ ...S.stepIcon, background: checklist[step].done ? '#E6F6EE' : '#FFF1EC' }}>
            <span className="ms" style={{ fontSize: 22, color: checklist[step].done ? '#0B8E54' : 'var(--primary)' }}>
              {checklist[step].done ? 'check' : current.icon}
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em' }}>
              PASO {step + 1} DE {STEPS.length}
            </div>
            <h2 style={S.stepTitle}>{current.title}</h2>
            <p style={S.stepSub}>{current.sub}</p>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          {current.id === 'datos' && (
            <>
              <Field label="Tu nombre" value={form.owner_name} onChange={(v) => set('owner_name', v)} placeholder="Como te presentas" />
              <Field label="WhatsApp" value={form.phone} onChange={(v) => set('phone', v)} placeholder="313 759 4713" />
              <Field label="Cédula o NIT (opcional)" value={form.nit} onChange={(v) => set('nit', v)} placeholder="Lo puedes dejar en blanco" />
              <Note>
                Con el WhatsApp nos basta para coordinar la llamada. Lo demás
                lo puedes llenar después o decirlo ahí mismo.
              </Note>
            </>
          )}

          {current.id === 'negocio' && (
            <>
              <Field label="Nombre comercial" value={form.name} onChange={(v) => set('name', v)} placeholder="Ej. Asadero El Puerto" />
              <Chips label="Tipo de negocio" options={VERTICALS} value={form.vertical} onChange={(v) => set('vertical', v)} />
              <Field label="Dirección" value={form.address} onChange={(v) => set('address', v)} placeholder="Cra. 3 # 4-58" />
              <Field label="Barrio o comuna" value={form.neighborhood} onChange={(v) => set('neighborhood', v)} placeholder="Centro, Comuna 1" />
              <Note>
                Entre más clara la dirección, menos llamadas recibes del
                repartidor y más rápido sale el pedido.
              </Note>
            </>
          )}

          {current.id === 'llamada' && <Videollamada />}
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <div style={S.nav}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={S.back}>
              <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
              Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => saveAndGo(isLast ? 'done' : step + 1)}
            disabled={saving}
            className="md3-btn"
            style={S.next}
          >
            {saving ? 'Guardando…' : isLast ? 'Guardar' : 'Guardar y continuar'}
            {!isLast && <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>}
          </button>
        </div>
      </section>

      {/* Cierre: qué falta y el botón de enviar */}
      {!approved && (
        <section style={{ ...S.card, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Vertical3D vertical={business?.vertical} size={56} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 17 }}>
                {complete ? 'Todo listo para revisar' : `Te faltan ${checklist.length - doneCount} de ${checklist.length}`}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
                {complete
                  ? 'Envíalo y te respondemos en menos de 24 horas.'
                  : checklist.filter((c) => !c.done).map((c) => c.label).join(' · ')}
              </div>
            </div>
          </div>

          <button
            onClick={send}
            disabled={!complete || sending}
            className="md3-btn"
            style={{
              ...S.submit,
              ...(complete
                ? { background: 'var(--primary)', color: '#fff', boxShadow: '0 10px 24px rgba(255,68,31,.28)' }
                : { background: 'var(--surface2)', color: 'var(--faint)' }),
            }}
          >
            {sending
              ? 'Enviando…'
              : complete
                ? (submitted ? 'Actualizar mi registro' : 'Enviar a revisión')
                : 'Completa los pasos que faltan'}
          </button>
        </section>
      )}
    </div>
  );
}

/** Fila de documento: subir, ver estado, reemplazar o quitar */
function DocRow({ kind, doc, businessId, onChange, onError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const meta = DOC_LABELS[kind];
  const required = REQUIRED_DOCS.includes(kind);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    onError(null);
    try {
      await uploadDocument(businessId, kind, file);
      onChange(await getDocuments(businessId));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDocument(businessId, kind, doc?.file_path);
      onChange(await getDocuments(businessId));
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const state = doc?.status === 'approved'
    ? { bg: '#E6F6EE', fg: '#0B8E54', icon: 'verified', label: 'Aprobado' }
    : doc?.status === 'rejected'
      ? { bg: '#FFF1EC', fg: '#E2360F', icon: 'error', label: 'Rechazado' }
      : doc
        ? { bg: '#FFF7E6', fg: '#A8730B', icon: 'schedule', label: 'En revisión' }
        : { bg: 'var(--surface2)', fg: 'var(--muted)', icon: 'upload_file', label: '' };

  return (
    <div style={{ ...S.docRow, borderStyle: doc ? 'solid' : 'dashed' }}>
      <span style={{ ...S.docIcon, background: state.bg }}>
        <span className="ms" style={{ fontSize: 20, color: state.fg }}>{state.icon}</span>
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{meta.label}</span>
          {!required && <span style={S.optional}>OPCIONAL</span>}
          {state.label && <span style={{ ...S.docState, background: state.bg, color: state.fg }}>{state.label}</span>}
        </span>
        <span className="tr1" style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          {doc?.file_name ?? meta.hint}
        </span>
        {doc?.reject_reason && (
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--primary)', marginTop: 3 }}>
            {doc.reject_reason}
          </span>
        )}
      </span>

      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={pick}
        style={{ display: 'none' }}
      />

      <span style={{ display: 'flex', gap: 6, flex: 'none' }}>
        <button onClick={() => input.current?.click()} disabled={busy} style={S.docBtn}>
          {busy ? '…' : doc ? 'Cambiar' : 'Subir'}
        </button>
        {doc && (
          <button onClick={remove} disabled={busy} style={S.docIconBtn} aria-label={`Quitar ${meta.label}`}>
            <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>delete</span>
          </button>
        )}
      </span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span style={S.label}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
    </label>
  );
}

function Chips({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span style={S.label}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button key={o.value} onClick={() => onChange(o.value)} style={{ ...S.chip, ...(on ? S.chipOn : S.chipOff) }}>
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Note({ children }) {
  return (
    <div style={S.note}>
      <span className="ms" style={{ fontSize: 17, color: 'var(--muted)', flex: 'none' }}>info</span>
      <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

const S = {
  head: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)', marginBottom: 16,
  },
  headTop: { display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em',
  },
  headSub: {
    fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6, maxWidth: 520,
  },
  ring: { position: 'relative', width: 78, height: 78, flex: 'none' },
  ringFill: { position: 'absolute', inset: 0, borderRadius: '50%' },
  ringHole: {
    position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rail: {
    display: 'flex', alignItems: 'center', gap: 4, listStyle: 'none',
    margin: '20px 0 0', padding: '4px 0 2px',
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
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 22, boxShadow: 'var(--shadowSm)',
  },
  stepIcon: {
    width: 46, height: 46, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stepTitle: {
    margin: '5px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 21, letterSpacing: '-.02em',
  },
  stepSub: { margin: '6px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 },
  input: {
    width: '100%', height: 48, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
  },
  chip: { height: 40, padding: '0 15px', borderRadius: 12, fontSize: 13, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  nav: {
    display: 'flex', alignItems: 'center', gap: 11, marginTop: 24,
    paddingTop: 18, borderTop: '1px solid var(--border)', flexWrap: 'wrap',
  },
  back: {
    display: 'flex', alignItems: 'center', gap: 7, height: 48, padding: '0 18px',
    borderRadius: 14, border: '1px solid var(--border)', fontSize: 14, fontWeight: 700,
  },
  next: {
    display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 22px',
    borderRadius: 14, background: 'var(--text)', color: '#fff', fontSize: 14.5, fontWeight: 700,
  },
  submit: {
    width: '100%', height: 50, borderRadius: 15, fontWeight: 700, fontSize: 14.5, marginTop: 18,
  },
  docRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 13,
    borderRadius: 14, border: '1px solid var(--border)', flexWrap: 'wrap',
  },
  docIcon: {
    width: 40, height: 40, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  docState: { fontSize: 10, fontWeight: 800, padding: '3px 7px', borderRadius: 6 },
  optional: {
    fontSize: 9.5, fontWeight: 800, padding: '3px 6px', borderRadius: 5,
    background: 'var(--surface2)', color: 'var(--muted)',
  },
  docBtn: {
    height: 36, padding: '0 14px', borderRadius: 10,
    border: '1px solid var(--border)', fontSize: 12.5, fontWeight: 700,
  },
  docIconBtn: {
    width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 14,
    padding: 12, borderRadius: 12, background: 'var(--bg)',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 18, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
