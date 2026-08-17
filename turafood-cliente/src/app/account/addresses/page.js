'use client';

/**
 * MIS DIRECCIONES
 * Conversión de `isAddresses` (línea 1495) del mockup del cliente.
 *
 * Lee las direcciones reales del usuario. Es el CRUD que faltaba: el
 * checkout ya no usa una dirección quemada en el código.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAddresses, saveAddress, setDefaultAddress, deleteAddress } from '@/lib/data';
import AddressSheet from '../../components/AddressSheet';
const LABEL_ICON = {
  Casa: 'home',
  Trabajo: 'work',
  Otro: 'location_on',
};

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getAddresses();
      setAddresses(rows);
      setSelected((prev) => prev ?? rows.find((a) => a.is_default)?.id ?? rows[0]?.id ?? null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const choose = async (id) => {
    setSelected(id);
    try {
      await setDefaultAddress(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await deleteAddress(id);
      if (selected === id) setSelected(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0, position: 'relative' }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>
            Mis direcciones
          </span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 120px', minHeight: 0 }}>

          {error && (
            <div style={S.errorBox}>
              <span className="ms" style={{ fontSize: 18 }}>error</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 86, borderRadius: 18, background: 'var(--surface2)' }} />
              ))}
            </div>
          )}

          {!loading && addresses.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '52px 24px' }}>
              <span style={S.emptyIcon}>
                <span className="ms" style={{ fontSize: 32, color: 'var(--faint)' }}>location_off</span>
              </span>
              <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 18, marginTop: 16 }}>
                Aún no tienes direcciones
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                Agrega dónde quieres recibir tus pedidos en Buenaventura.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {addresses.map((a) => {
              const on = selected === a.id;
              return (
                <div
                  key={a.id}
                  style={{
                    ...S.card,
                    border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  }}
                >
                  <button onClick={() => choose(a.id)} style={S.cardMain}>
                  <span style={{ ...S.icon, background: on ? '#FFF1EC' : 'var(--surface2)' }}>
                    <span className="ms" style={{ fontSize: 21, color: on ? 'var(--primary)' : 'var(--muted)' }}>
                      {LABEL_ICON[a.label] ?? 'location_on'}
                    </span>
                  </span>

                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{a.label}</span>
                      {a.is_default && <span style={S.defaultTag}>PREDETERMINADA</span>}
                    </span>
                    <span className="tr1" style={{ display: 'block', fontSize: 13.5, marginTop: 3 }}>
                      {a.address}
                    </span>
                    {a.detail && (
                      <span className="tr1" style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
                        {a.detail}
                      </span>
                    )}
                  </span>

                    <span style={{
                      ...S.radio,
                      background: on ? 'var(--primary)' : 'transparent',
                      border: on ? 'none' : '2px solid var(--faint)',
                    }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </span>
                  </button>

                  <button
                    onClick={() => remove(a.id)}
                    style={S.deleteBtn}
                    aria-label={`Eliminar dirección ${a.label}`}
                  >
                    <span className="ms" style={{ fontSize: 18, color: 'var(--faint)' }}>delete</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Agregar */}
          <button onClick={() => setSheetOpen(true)} style={S.addBtn}>
            <span className="ms" style={{ fontSize: 20 }}>add_location_alt</span>
            Agregar dirección
          </button>

          <div style={S.note}>
            <span className="ms" style={{ fontSize: 17, color: 'var(--muted)', flex: 'none' }}>info</span>
            <span>
              Buscamos direcciones reales de Buenaventura mientras escribes. Si el
              pin no queda exacto, puedes arrastrarlo sobre el mapa.
            </span>
          </div>
        </div>

        <div style={S.bottom}>
          <button onClick={() => router.back()} disabled={!selected} style={S.confirmBtn}>
            Usar esta dirección
          </button>
        </div>

        <AddressSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onSave={async (payload) => {
            const nueva = await saveAddress(payload);
            await load();
            setSelected(nueva.id);
          }}
        />
      </div>
    </>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  card: {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    background: 'var(--surface)', borderRadius: 18, padding: '14px 10px 14px 14px',
    boxShadow: 'var(--shadowSm)',
  },
  cardMain: {
    display: 'flex', alignItems: 'center', gap: 13, flex: 1,
    minWidth: 0, background: 'none', textAlign: 'left',
  },
  deleteBtn: {
    width: 34, height: 34, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
    width: '100%', height: 52, borderRadius: 16, marginTop: 14,
    border: '1.5px dashed var(--primary)', background: '#FFF6F2',
    color: 'var(--primary)', fontWeight: 800, fontSize: 14.5,
  },
  icon: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  defaultTag: {
    fontSize: 9, fontWeight: 800, letterSpacing: '.04em',
    background: '#FFF1EC', color: 'var(--primary)',
    padding: '3px 6px', borderRadius: 5,
  },
  radio: {
    width: 20, height: 20, borderRadius: '50%', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  note: {
    display: 'flex', gap: 9, marginTop: 18, background: 'var(--surface2)',
    borderRadius: 14, padding: 13, fontSize: 12, color: 'var(--muted)', lineHeight: 1.45,
  },
  bottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface)',
    borderTop: '1px solid var(--border)', padding: '14px 20px 20px',
  },
  confirmBtn: {
    width: '100%', height: 54, borderRadius: 999, background: 'var(--primary)',
    color: '#fff', fontWeight: 700, fontSize: 15.5,
    boxShadow: '0 10px 24px rgba(255,68,31,.32)',
  },
  emptyIcon: {
    width: 66, height: 66, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14,
    padding: '12px 14px', borderRadius: 14, background: '#FFF0ED',
    color: 'var(--primary)', fontSize: 13, fontWeight: 600,
  },
};
