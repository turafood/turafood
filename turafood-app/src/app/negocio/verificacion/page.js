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
import Compromiso24h from '../../components/Compromiso24h';

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
      <style>{`
        .verificacion-bg {
          position: fixed; inset: 0; z-index: -1;
          background: linear-gradient(to bottom, #111, #000);
          overflow: hidden;
        }
        .wave-container {
          position: absolute; width: 200%; height: 100%; top: 50%; left: -50%;
          transform: translateY(-50%);
          pointer-events: none; opacity: 0.15;
        }
        .wave {
          position: absolute; width: 100%; height: 100%;
          background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg"><path fill="%23FF441F" fill-opacity="1" d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,149.3C672,139,768,149,864,176C960,203,1056,245,1152,240C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>') repeat-x;
          background-size: 50% 100%;
        }
        .wave1 { animation: wave 20s linear infinite; bottom: 0; opacity: 0.5; }
        .wave2 { animation: wave 15s linear infinite reverse; bottom: 10px; opacity: 0.3; background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg"><path fill="%23FFFFFF" fill-opacity="1" d="M0,224L48,208C96,192,192,160,288,154.7C384,149,480,171,576,176C672,181,768,171,864,138.7C960,107,1056,53,1152,48C1248,43,1344,85,1392,106.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path></svg>'); }
        .wave3 { animation: wave 25s linear infinite; bottom: -20px; opacity: 0.2; filter: hue-rotate(30deg); }
        @keyframes wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .anim-pulse-glow { animation: pulseGlow 4s infinite alternate; }
        @keyframes pulseGlow { from { opacity: 0.6; filter: blur(20px); } to { opacity: 1; filter: blur(30px); } }
      `}</style>
      <div className="verificacion-bg">
        <div className="wave-container">
          <div className="wave wave1"></div>
          <div className="wave wave2"></div>
          <div className="wave wave3"></div>
        </div>
      </div>
      {/* Cabecera con progreso */}
      <section style={S.head}>
        <div style={S.headGlow} className="anim-pulse-glow" />
        <div style={S.headTop}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
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
            <div style={{ ...S.ringFill, background: `conic-gradient(var(--primary) ${pct * 3.6}deg, rgba(255,255,255,0.06) 0)` }} />
            <div style={S.ringHole}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, color: '#fff' }}>{pct}%</span>
            </div>
          </div>
        </div>

        {/* La promesa de las 24 horas, con reloj. Va arriba del riel
            porque responde la pregunta que trae la persona a esta
            pantalla: ¿cuándo me activan? */}
        <div style={{ position: 'relative', margin: '16px 0 4px' }}>
          <Compromiso24h
            desde={business?.verification_call_at ?? business?.onboarding_at}
            aprobado={business?.status === 'active'}
          />
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
                      background: done ? 'var(--green)' : active ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: done || active ? '#fff' : 'rgba(255,255,255,0.4)',
                      boxShadow: active ? '0 0 16px rgba(255,68,31,0.4)' : 'none',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    {done
                      ? <span className="ms" style={{ fontSize: 15 }}>check</span>
                      : <span style={{ fontSize: 12, fontWeight: 800 }}>{i + 1}</span>}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', color: active ? '#fff' : 'rgba(255,255,255,0.6)' }}>{s.short}</span>
                </button>
                {i < STEPS.length - 1 && <span style={S.railLine} />}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Carrusel de pasos (Wizard) */}
      <div style={{ overflow: 'hidden', padding: '4px 0', margin: '-4px 0' }}>
        <div style={{ 
          display: 'flex', 
          transform: `translateX(-${step * 100}%)`, 
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          alignItems: 'flex-start'
        }}>
          {STEPS.map((s, i) => {
            const isCurrent = i === step;
            return (
              <div key={s.id} style={{ flex: '0 0 100%', minWidth: 0, paddingRight: i < STEPS.length - 1 ? 16 : 0, opacity: Math.abs(step - i) > 1 ? 0 : 1, transition: 'opacity 0.3s' }}>
                <section style={{ ...S.card, opacity: isCurrent ? 1 : 0.5, pointerEvents: isCurrent ? 'auto' : 'none', transition: 'opacity 0.4s' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span style={{ ...S.stepIcon, background: checklist[i].done ? 'rgba(11,142,84,0.15)' : 'rgba(255,68,31,0.1)' }}>
            <span className="ms" style={{ fontSize: 22, color: checklist[i].done ? '#0B8E54' : 'var(--primary)', textShadow: checklist[i].done ? '0 0 10px rgba(11,142,84,0.5)' : '0 0 10px rgba(255,68,31,0.5)' }}>
              {checklist[i].done ? 'check' : s.icon}
            </span>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--primary)', letterSpacing: '.06em', textShadow: '0 0 8px rgba(255,68,31,0.3)' }}>
              PASO {i + 1} DE {STEPS.length}
            </div>
            <h2 style={S.stepTitle}>{s.title}</h2>
            <p style={S.stepSub}>{s.sub}</p>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          {s.id === 'datos' && (
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

          {s.id === 'negocio' && (
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

          {s.id === 'llamada' && <Videollamada />}
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        <div style={S.nav}>
          {i > 0 && (
            <button onClick={() => setStep(i - 1)} style={S.back}>
              <span className="ms" style={{ fontSize: 18 }}>arrow_back</span>
              Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => saveAndGo(i === STEPS.length - 1 ? 'done' : i + 1)}
            disabled={saving}
            className="md3-btn"
            style={S.next}
          >
            {saving ? 'Guardando…' : i === STEPS.length - 1 ? 'Guardar' : 'Guardar y continuar'}
            {i < STEPS.length - 1 && <span className="ms" style={{ fontSize: 18 }}>arrow_forward</span>}
          </button>
        </div>
      </section>
              </div>
            );
          })}
        </div>
      </div>

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
    position: 'relative', overflow: 'hidden',
    background: 'linear-gradient(135deg, rgba(30,30,30,0.7) 0%, rgba(10,10,10,0.8) 100%)',
    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 28, padding: 28, boxShadow: '0 24px 50px rgba(0,0,0,0.5)', marginBottom: 24,
  },
  headGlow: {
    position: 'absolute', top: -50, right: -50, width: 250, height: 250,
    background: 'radial-gradient(circle, rgba(255,68,31,0.15), transparent 70%)',
    borderRadius: '50%', pointerEvents: 'none',
  },
  headTop: { position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headTitle: {
    fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 26, letterSpacing: '-.02em', color: '#fff',
  },
  headSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, marginTop: 6, maxWidth: 520,
  },
  ring: { position: 'relative', width: 84, height: 84, flex: 'none' },
  ringFill: { position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 20px rgba(255,68,31,0.3)' },
  ringHole: {
    position: 'absolute', inset: 6, borderRadius: '50%', background: '#111',
    display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.04)'
  },
  rail: {
    position: 'relative', display: 'flex', alignItems: 'center', gap: 6, listStyle: 'none',
    margin: '24px 0 0', padding: '4px 0 2px',
  },
  railItem: { display: 'flex', alignItems: 'center', gap: 6, flex: 'none' },
  railBtn: {
    display: 'flex', alignItems: 'center', gap: 10, height: 44, padding: '0 14px',
    borderRadius: 999, background: 'transparent', transition: 'all 0.3s',
  },
  railActive: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' },
  railDot: {
    width: 28, height: 28, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s',
  },
  railLine: { width: 24, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, flex: 'none' },
  card: {
    background: 'rgba(20,20,20,0.65)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 28, padding: 32, boxShadow: '0 12px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  stepIcon: {
    width: 52, height: 52, borderRadius: 16, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,68,31,0.15)',
  },
  stepTitle: {
    margin: '6px 0 0', fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 24, letterSpacing: '-.02em', color: '#fff',
  },
  stepSub: { margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55 },
  label: { display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  input: {
    width: '100%', height: 56, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)', padding: '0 20px', fontSize: 16, outline: 'none', color: '#fff',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'all 0.3s',
  },
  chip: { height: 46, padding: '0 20px', borderRadius: 16, fontSize: 14, fontWeight: 700, transition: 'all 0.3s' },
  chipOn: { background: '#fff', color: '#000', boxShadow: '0 6px 20px rgba(255,255,255,0.2)' },
  chipOff: { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' },
  nav: {
    display: 'flex', alignItems: 'center', gap: 14, marginTop: 32,
    paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap',
  },
  back: {
    display: 'flex', alignItems: 'center', gap: 8, height: 52, padding: '0 20px',
    borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', 
    fontSize: 14.5, fontWeight: 700, color: '#fff', transition: 'background 0.2s',
  },
  next: {
    display: 'flex', alignItems: 'center', gap: 10, height: 52, padding: '0 26px',
    borderRadius: 16, background: '#fff', color: '#000', fontSize: 15, fontWeight: 800,
    boxShadow: '0 6px 24px rgba(255,255,255,0.2)', transition: 'all 0.3s',
  },
  submit: {
    width: '100%', height: 60, borderRadius: 20, fontWeight: 800, fontSize: 16, marginTop: 24,
    transition: 'all 0.3s',
  },
  docRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: 18,
    borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap',
    background: 'rgba(255,255,255,0.02)',
  },
  docIcon: {
    width: 46, height: 46, borderRadius: 14, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  docState: { fontSize: 10.5, fontWeight: 800, padding: '4px 8px', borderRadius: 8 },
  optional: {
    fontSize: 10, fontWeight: 800, padding: '4px 8px', borderRadius: 8,
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
  },
  docBtn: {
    height: 44, padding: '0 18px', borderRadius: 14, color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', fontSize: 13.5, fontWeight: 700,
    transition: 'all 0.2s',
  },
  docIconBtn: {
    width: 44, height: 44, borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
  },
  note: {
    display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 16,
    padding: 16, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
  },
  error: {
    display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, padding: '14px 18px',
    borderRadius: 16, background: 'rgba(255,68,31,0.1)', color: '#FFB0A0', border: '1px solid rgba(255,68,31,0.2)',
    fontSize: 13.5, fontWeight: 600, lineHeight: 1.45,
  },
};
