'use client';

/**
 * VERIFICACIÓN DEL NEGOCIO
 *
 * Aquí vive lo que antes era el asistente de 4 pasos previo al ingreso.
 * La diferencia es que ahora se puede dejar a medias: cada bloque se
 * guarda por separado y la barra de arriba muestra cuánto falta.
 *
 * "Enviar a revisión" llama a `submit_business_for_review()`, que
 * vuelve a comprobar todo en el servidor. Si la pantalla se equivoca
 * marcando algo como listo, la base no deja pasar igual.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDocuments, updateBusiness, uploadDocument, deleteDocument,
  submitForReview, checklistOf, REQUIRED_DOCS, DOC_LABELS,
} from '@/lib/negocio';
import { useBiz } from '../BizContext';

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

export default function VerificacionPage() {
  const { business, loading, toast, refreshBusiness } = useBiz();

  const [form, setForm] = useState(null);
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(null);
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

  const merged = useMemo(
    () => (business && form ? { ...business, ...form } : business),
    [business, form],
  );
  const checklist = useMemo(() => checklistOf(merged, docs), [merged, docs]);
  const doneCount = checklist.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checklist.length) * 100);
  const complete = doneCount === checklist.length;

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (section, keys) => {
    setError(null);
    setSaving(section);
    try {
      const patch = Object.fromEntries(keys.map((k) => [k, form[k]]));
      await updateBusiness(business.id, patch);
      await refreshBusiness?.();
      toast('Guardado');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
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

  const submitted = Boolean(business?.submitted_at);
  const approved = business?.status === 'active';

  return (
    <>
      {/* Progreso */}
      <section style={{ ...S.card, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220, flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 22, letterSpacing: '-.02em' }}>
              {approved
                ? 'Tu negocio está aprobado'
                : submitted ? 'Registro en revisión' : 'Completa tu registro'}
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 6, maxWidth: 520 }}>
              {approved
                ? 'Ya estás visible en la app de clientes y sin límite de pedidos diarios.'
                : submitted
                  ? 'Recibimos tus documentos. Los revisamos en menos de 24 horas; mientras tanto puedes seguir vendiendo con un límite de 20 pedidos diarios.'
                  : 'Mientras esté incompleto puedes vender con un límite de 20 pedidos diarios. Al aprobarlo se levanta el límite.'}
            </div>
          </div>

          <div style={S.ring}>
            <div style={{ ...S.ringFill, background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--surface2) 0)` }} />
            <div style={S.ringHole}>
              <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 20 }}>{pct}%</span>
            </div>
          </div>
        </div>

        <div style={S.steps}>
          {checklist.map((c) => (
            <div key={c.id} style={S.step}>
              <span style={{ ...S.stepDot, background: c.done ? 'var(--green)' : 'var(--surface2)' }}>
                <span className="ms" style={{ fontSize: 15, color: c.done ? '#fff' : 'var(--faint)' }}>
                  {c.done ? 'check' : 'radio_button_unchecked'}
                </span>
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>{c.hint}</span>
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={S.error}>
            <span className="ms" style={{ fontSize: 18, flex: 'none' }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {!approved && (
          <button
            onClick={send}
            disabled={!complete || sending}
            className="md3-btn"
            style={{
              ...S.submitBtn,
              ...(complete
                ? { background: 'var(--primary)', color: '#fff' }
                : { background: 'var(--surface2)', color: 'var(--faint)' }),
            }}
          >
            {sending
              ? 'Enviando…'
              : complete
                ? (submitted ? 'Actualizar mi registro' : 'Enviar a revisión')
                : `Faltan ${checklist.length - doneCount} de ${checklist.length} bloques`}
          </button>
        )}
      </section>

      {/* 1. Datos */}
      <Block
        icon="storefront" title="Datos del negocio"
        sub="Así aparece tu tienda en la app de clientes."
        done={checklist[0].done}
        saving={saving === 'datos'}
        onSave={() => save('datos', ['name', 'vertical', 'nit', 'phone'])}
      >
        <Field label="Nombre comercial" value={form.name} onChange={(v) => set('name', v)} placeholder="Ej. Asadero El Puerto" />
        <Chips
          label="Tipo de negocio" options={VERTICALS}
          value={form.vertical} onChange={(v) => set('vertical', v)}
        />
        <Field label="NIT o cédula del propietario" value={form.nit} onChange={(v) => set('nit', v)} placeholder="901.234.567-8" />
        <Field label="Celular de contacto" value={form.phone} onChange={(v) => set('phone', v)} placeholder="+57 320 000 0000" />
        {form.vertical === 'pharmacy' || form.vertical === 'liquor' ? (
          <Note>
            Farmacias y licoreras pagan 15% de comisión por pedido en vez de 10%.
            Con Biz Pro pasa a 0% en cualquier vertical.
          </Note>
        ) : null}
      </Block>

      {/* 2. Dirección */}
      <Block
        icon="location_on" title="Dirección"
        sub="La usamos para calcular tiempos y zonas de entrega."
        done={checklist[1].done}
        saving={saving === 'direccion'}
        onSave={() => save('direccion', ['address', 'neighborhood', 'courier_notes'])}
      >
        <Field label="Dirección" value={form.address} onChange={(v) => set('address', v)} placeholder="Cra. 3 # 4-58" />
        <Field label="Barrio o comuna" value={form.neighborhood} onChange={(v) => set('neighborhood', v)} placeholder="Centro, Comuna 1" />
        <Field
          label="Indicaciones para el repartidor" value={form.courier_notes}
          onChange={(v) => set('courier_notes', v)}
          placeholder="Local esquinero, al lado de la droguería"
        />
      </Block>

      {/* 3. Documentos */}
      <Block
        icon="folder_open" title="Documentos"
        sub="Los revisamos en menos de 24 horas. Máximo 8 MB por archivo, en PDF o imagen."
        done={checklist[2].done}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {DOC_ORDER.map((kind) => (
            <DocRow
              key={kind}
              kind={kind}
              doc={docs.find((d) => d.kind === kind)}
              businessId={business.id}
              onChange={setDocs}
              onError={setError}
            />
          ))}
        </div>
        <Note>
          Los archivos quedan en un espacio privado: no tienen dirección pública y
          solo los vemos tú y el equipo de TuraFood.
        </Note>
      </Block>

      {/* 4. Banco */}
      <Block
        icon="account_balance" title="Cuenta bancaria"
        sub="Liquidamos todos los viernes con el corte del domingo anterior."
        done={checklist[3].done}
        saving={saving === 'banco'}
        onSave={() => save('banco', ['bank_name', 'bank_account_type', 'bank_account_number', 'bank_account_holder'])}
      >
        <Chips
          label="Banco" options={BANKS.map((b) => ({ value: b, label: b }))}
          value={form.bank_name} onChange={(v) => set('bank_name', v)}
        />
        <Chips
          label="Tipo de cuenta" options={ACCOUNT_TYPES.map((a) => ({ value: a, label: a }))}
          value={form.bank_account_type} onChange={(v) => set('bank_account_type', v)}
        />
        <Field label="Número de cuenta" value={form.bank_account_number} onChange={(v) => set('bank_account_number', v)} placeholder="000-000000-00" />
        <Field label="Titular de la cuenta" value={form.bank_account_holder} onChange={(v) => set('bank_account_holder', v)} placeholder="Como aparece en el banco" />
      </Block>
    </>
  );
}

/** Una fila de documento: subir, ver estado, reemplazar o quitar */
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
          {state.label && (
            <span style={{ ...S.docState, background: state.bg, color: state.fg }}>{state.label}</span>
          )}
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

function Block({ icon, title, sub, done, children, onSave, saving }) {
  return (
    <section style={{ ...S.card, marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
        <span style={{ ...S.blockIcon, background: done ? '#E6F6EE' : 'var(--surface2)' }}>
          <span className="ms" style={{ fontSize: 20, color: done ? '#0B8E54' : 'var(--muted)' }}>
            {done ? 'check' : icon}
          </span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 16.5 }}>
            {title}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 3 }}>
            {sub}
          </span>
        </span>
      </div>

      <div style={{ marginTop: 16 }}>{children}</div>

      {onSave && (
        <button onClick={onSave} disabled={saving} className="md3-btn" style={S.saveBtn}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      )}
    </section>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={S.label}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={S.input}
      />
    </label>
  );
}

function Chips({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={S.label}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              style={{ ...S.chip, ...(on ? S.chipOn : S.chipOff) }}
            >
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
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 20, boxShadow: 'var(--shadowSm)',
  },
  ring: { position: 'relative', width: 84, height: 84, flex: 'none' },
  ringFill: { position: 'absolute', inset: 0, borderRadius: '50%' },
  ringHole: {
    position: 'absolute', inset: 9, borderRadius: '50%', background: 'var(--surface)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  steps: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))',
    gap: 12, marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)',
  },
  step: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  stepDot: {
    width: 26, height: 26, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    width: '100%', height: 50, borderRadius: 15, fontWeight: 700, fontSize: 14.5, marginTop: 18,
  },
  blockIcon: {
    width: 40, height: 40, borderRadius: 12, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  label: { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 7 },
  input: {
    width: '100%', height: 46, borderRadius: 13, border: '1px solid var(--border)',
    background: 'var(--bg)', padding: '0 14px', fontSize: 16, outline: 'none',
  },
  chip: { height: 38, padding: '0 14px', borderRadius: 11, fontSize: 13, fontWeight: 700 },
  chipOn: { background: 'var(--text)', color: '#fff' },
  chipOff: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' },
  saveBtn: {
    height: 44, padding: '0 22px', borderRadius: 13, background: 'var(--text)',
    color: '#fff', fontWeight: 700, fontSize: 13.5, marginTop: 6,
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
    height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--border)',
    fontSize: 12.5, fontWeight: 700,
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
    display: 'flex', alignItems: 'flex-start', gap: 9, marginTop: 16, padding: '12px 14px',
    borderRadius: 14, background: '#FFF0ED', color: 'var(--primary)',
    fontSize: 13, fontWeight: 600, lineHeight: 1.45,
  },
};
