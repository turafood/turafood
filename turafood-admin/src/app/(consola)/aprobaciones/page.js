'use client';

/**
 * APROBACIÓN DE CUENTAS
 *
 * Lista a la izquierda, expediente a la derecha. La decisión se toma
 * mirando los documentos, así que no puede haber un clic de por medio
 * entre elegir un negocio y ver sus papeles.
 *
 * Aprobar es un botón; rechazar abre un campo de motivo obligatorio.
 * No es fricción por fricción: el motivo es lo único que le permite al
 * negocio arreglar lo que está mal sin escribirle a soporte.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getBusinesses, getBusinessDocuments, reviewBusiness, getDocumentUrl,
  BUSINESS_STATUS, VERTICAL, DOC_KIND, ago,
} from '@/lib/admin';
import { Pill, Tabs, Initials, Empty, Skeleton, ErrorNote, ReasonDialog, btn } from '../../ui';

const TABS = [
  { id: 'pending_review', label: 'Pendientes' },
  { id: 'active', label: 'Aprobados' },
  { id: 'rejected', label: 'Rechazados' },
];

export default function AprobacionesPage() {
  const [tab, setTab] = useState('pending_review');
  const [all, setAll] = useState(null);
  const [selected, setSelected] = useState(null);
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const load = useCallback(() => {
    getBusinesses()
      .then(setAll)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = (all ?? []).filter((b) => b.status === tab);

  // Al cambiar de pestaña o al cargar, seleccionamos el primero: la
  // columna derecha vacía no le sirve a nadie.
  useEffect(() => {
    if (!list.length) { setSelected(null); return; }
    if (!selected || !list.some((b) => b.id === selected.id)) setSelected(list[0]);
  }, [list, selected]);

  useEffect(() => {
    if (!selected) { setDocs([]); return; }
    getBusinessDocuments(selected.id).then(setDocs).catch(() => setDocs([]));
  }, [selected]);

  const decide = async (approve, reason = null) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await reviewBusiness(selected.id, approve, reason);
      setDone(approve
        ? `${selected.name} quedó publicado. Ya puede recibir pedidos.`
        : `Se le avisó a ${selected.name} qué falta corregir.`);
      setRejecting(false);
      setSelected(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Si la carga falló, el estado se queda en null y esto mostraba un
  // esqueleto eterno, con el aviso de error debajo del return — o sea
  // invisible. Mejor decir qué pasó.
  if (error && !all) return <ErrorNote text={error} />;
  if (!all) return <Skeleton rows={4} height={92} />;

  const counts = Object.fromEntries(
    TABS.map((t) => [t.id, (all ?? []).filter((b) => b.status === t.id).length]),
  );

  return (
    <>
      <ErrorNote text={error} />

      {done && (
        <div style={S.done} className="anim-up">
          <span className="ms" style={{ fontSize: 18, flex: 'none' }}>check_circle</span>
          <span style={{ flex: 1 }}>{done}</span>
          <button onClick={() => setDone(null)} style={{ color: 'inherit', fontWeight: 800, fontSize: 12 }}>
            Cerrar
          </button>
        </div>
      )}

      <div style={S.layout}>
        {/* Lista */}
        <div>
          <Tabs
            items={TABS.map((t) => ({ ...t, count: counts[t.id] }))}
            value={tab}
            onChange={setTab}
          />

          <div style={S.list}>
            {list.length === 0 ? (
              <Empty
                icon="task_alt"
                title="Nada por revisar aquí"
                note="Cuando un negocio termine de subir sus documentos aparece en esta lista."
              />
            ) : list.map((b) => {
              const on = selected?.id === b.id;
              const vertical = VERTICAL[b.vertical] ?? VERTICAL.store;
              const status = BUSINESS_STATUS[b.status];
              return (
                <button
                  key={b.id}
                  onClick={() => setSelected(b)}
                  style={{ ...S.item, ...(on ? S.itemOn : null) }}
                  className="adm-row"
                >
                  <Initials name={b.name} size={44} radius={14} />

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={S.itemName}>{b.name}</span>
                      <Pill label={vertical.label} bg={vertical.bg} color={vertical.color} />
                    </span>
                    <span style={S.itemMeta}>
                      {b.address}
                      {b.nit ? ` · NIT ${b.nit}` : ''}
                    </span>
                  </span>

                  <span style={{ flex: 'none', textAlign: 'right' }}>
                    {b.docs_total && (
                      <span style={S.docCount}>{b.docs_ok} de {b.docs_total}</span>
                    )}
                    <span style={{ display: 'block', marginTop: 6 }}>
                      <Pill label={status.label} bg={status.bg} color={status.color} />
                    </span>
                    <span style={S.itemAgo}>{ago(b.created_at)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Expediente */}
        <aside>
          {selected ? (
            <Expediente
              business={selected}
              docs={docs}
              busy={busy}
              onApprove={() => decide(true)}
              onReject={() => setRejecting(true)}
            />
          ) : (
            <div style={S.panel}>
              <Empty icon="folder_open" title="Elige un negocio" note="Aquí aparece el expediente completo." />
            </div>
          )}
        </aside>
      </div>

      <ReasonDialog
        open={rejecting}
        busy={busy}
        title={`Rechazar a ${selected?.name ?? ''}`}
        note="Escribe qué falta o qué está mal. Es lo único que le permite corregir sin tener que escribirle a soporte."
        confirmLabel="Enviar rechazo"
        onCancel={() => setRejecting(false)}
        onConfirm={(reason) => decide(false, reason)}
      />
    </>
  );
}

/* ---------------------------------------------------------------- expediente */

function Expediente({ business, docs, busy, onApprove, onReject }) {
  const status = BUSINESS_STATUS[business.status];
  const approved = docs.filter((d) => d.status === 'approved').length;
  const total = docs.length || business.docs_total || 4;
  const complete = approved >= total && total > 0;

  const RISK = {
    bajo:  { label: 'RIESGO BAJO', bg: '#E6F6EE', color: '#0B8E54' },
    medio: { label: 'RIESGO MEDIO', bg: '#FFF7E6', color: '#A8730B' },
    alto:  { label: 'RIESGO ALTO', bg: '#FFF0ED', color: '#C0341A' },
  }[business.risk] ?? null;

  return (
    <div style={S.panel}>
      <div style={S.cover}>
        {RISK && (
          <span style={{ ...S.riskTag, background: RISK.bg, color: RISK.color }}>
            <span className="ms" style={{ fontSize: 14 }}>shield</span>
            {RISK.label}
          </span>
        )}
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, letterSpacing: '-.02em' }}>
            {business.name}
          </span>
          <Pill label={status.label} bg={status.bg} color={status.color} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          {(VERTICAL[business.vertical] ?? VERTICAL.store).label} · {ago(business.created_at)}
        </div>

        {/* Progreso de documentos */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
            <span style={S.sectionLabel}>VERIFICACIÓN</span>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: complete ? 'var(--green)' : 'var(--muted)' }}>
              {approved} de {total} documentos
            </span>
          </div>
          <div style={S.progressTrack}>
            <div style={{
              ...S.progressFill,
              width: `${(approved / Math.max(total, 1)) * 100}%`,
              background: complete ? 'var(--green)' : 'var(--amber)',
            }} />
          </div>
        </div>

        {/* Datos del representante */}
        <dl style={{ margin: '20px 0 0' }}>
          <Field label="Representante" value={business.representative} />
          <Field label="NIT" value={business.nit} />
          <Field label="Dirección" value={business.address} />
          <Field label="Celular" value={business.phone} />
          <Field label="Correo" value={business.email} />
          <Field label="Cuenta bancaria" value={business.bank} />
        </dl>

        {/* Documentos */}
        <div style={{ marginTop: 20 }}>
          <div style={S.sectionLabel}>DOCUMENTOS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
            {docs.length === 0 && (
              <div style={S.noDocs}>
                Todavía no ha subido ningún documento.
              </div>
            )}
            {docs.map((d) => (
              <button 
                key={d.id} 
                style={S.doc}
                className="adm-row"
                onClick={async () => {
                  try {
                    const url = await getDocumentUrl(d.file_path);
                    window.open(url, '_blank');
                  } catch (e) {
                    alert('No se pudo abrir el documento');
                  }
                }}
              >
                <span style={S.docIcon}>
                  <span className="ms" style={{ fontSize: 17, color: 'var(--muted)' }}>description</span>
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={S.docName}>{DOC_KIND[d.kind] ?? d.file_name}</span>
                  {d.size && <span style={S.docMeta}>{d.size}</span>}
                </span>
                <span
                  className="ms"
                  style={{
                    fontSize: 19, flex: 'none',
                    color: d.status === 'approved' ? 'var(--green)' : 'var(--faint)',
                  }}
                >
                  {d.status === 'approved' ? 'check_circle' : 'visibility'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Acciones — solo si todavía hay algo que decidir */}
        {business.status === 'pending_review' && (
          <div style={{ marginTop: 22 }}>
            <button onClick={onApprove} disabled={busy} style={btn.green}>
              <span className="ms" style={{ fontSize: 19 }}>storefront</span>
              {busy ? 'Publicando…' : 'Aprobar y publicar tienda'}
            </button>

            <button onClick={onReject} disabled={busy} style={{ ...S.rejectBtn, marginTop: 9 }}>
              Rechazar y decir qué falta
            </button>

            {!complete && (
              <p style={S.warn}>
                <span className="ms" style={{ fontSize: 15, verticalAlign: '-2px' }}>info</span>
                {' '}Le faltan documentos. Si lo apruebas igual, la tienda queda publicada
                con el tope de 20 pedidos diarios.
              </p>
            )}
          </div>
        )}

        {business.rejection_reason && (
          <div style={S.reason}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: '#C0341A' }}>
              MOTIVO DEL RECHAZO
            </div>
            <div style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5 }}>{business.rejection_reason}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={S.field}>
      <dt style={{ fontSize: 12, color: 'var(--muted)', flex: 'none' }}>{label}</dt>
      <dd style={{ margin: 0, fontSize: 12.5, fontWeight: 700, textAlign: 'right', minWidth: 0 }}>{value}</dd>
    </div>
  );
}

const S = {
  layout: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 24, alignItems: 'start' },
  list: {
    marginTop: 14, background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', overflow: 'hidden',
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 15, width: '100%', padding: 18,
    borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'all .2s ease', cursor: 'pointer',
  },
  itemOn: { background: '#FFF6F3', boxShadow: 'inset 4px 0 0 var(--primary)' },
  itemName: {
    fontSize: 15, fontWeight: 700,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240,
  },
  itemMeta: {
    display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 4,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  itemAgo: { display: 'block', fontSize: 11, color: 'var(--faint)', marginTop: 6, fontWeight: 500 },
  docCount: { fontSize: 12, fontWeight: 800, color: 'var(--muted)' },

  panel: {
    background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(0,0,0,0.04)', borderRadius: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.04)', overflow: 'hidden',
  },
  cover: {
    height: 90, background: 'linear-gradient(120deg,#F5F3ED,#EAE7DF)',
    position: 'relative', display: 'flex', alignItems: 'flex-start', padding: 16,
  },
  riskTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 12px',
    borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.04em',
  },
  sectionLabel: { fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: 'var(--faint)' },
  progressTrack: { height: 8, borderRadius: 99, background: 'rgba(0,0,0,0.04)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, transition: 'width .5s cubic-bezier(.2,0,0,1)' },

  field: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 14, padding: '12px 0', borderBottom: '1px dashed rgba(0,0,0,0.06)',
  },

  doc: {
    display: 'flex', alignItems: 'center', gap: 12, padding: 14, cursor: 'pointer',
    borderRadius: 18, background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(0,0,0,0.03)',
    transition: 'all 0.2s ease',
  },
  docIcon: {
    width: 36, height: 36, borderRadius: 12, background: 'rgba(0,0,0,0.03)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  docName: { display: 'block', fontSize: 13.5, fontWeight: 700 },
  docMeta: { display: 'block', fontSize: 11.5, color: 'var(--muted)', marginTop: 2 },
  noDocs: {
    padding: 16, borderRadius: 18, background: 'rgba(0,0,0,0.02)',
    fontSize: 13.5, color: 'var(--muted)', textAlign: 'center', border: '1px dashed rgba(0,0,0,0.06)'
  },

  rejectBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
    height: 48, borderRadius: 16, background: '#FFF0ED', color: '#C0341A',
    fontSize: 14, fontWeight: 700, transition: 'all 0.2s ease'
  },
  warn: {
    margin: '14px 0 0', fontSize: 12.5, lineHeight: 1.5, color: 'var(--muted)',
  },
  reason: {
    marginTop: 20, padding: 16, borderRadius: 18, background: '#FFF0ED', border: '1px solid rgba(192,52,26,0.1)'
  },

  done: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, padding: '16px 20px',
    borderRadius: 20, background: '#E6F6EE', color: '#0B7A48', fontSize: 14, fontWeight: 700,
    boxShadow: '0 4px 15px rgba(11,122,72,0.1)'
  },
};
