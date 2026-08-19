'use client';

/**
 * CÓMO COBRA ESTE NEGOCIO
 *
 * No todos los restaurantes del puerto tienen pasarela. Muchos reciben
 * por Nequi, otros solo efectivo, y varios cierran la venta por
 * WhatsApp porque así trabajan hace años. Obligarlos a recibir tarjeta
 * para poder estar en la app es dejarlos afuera.
 *
 * Acá el dueño prende y apaga lo que de verdad puede recibir. Lo que
 * apague desaparece del checkout de sus clientes — no se muestra en
 * gris, no aparece: nadie elige algo que después no se puede pagar.
 *
 * La regla la hace cumplir la base (trigger `guard_payment_method`),
 * no esta pantalla. Acá solo se elige.
 */

import { useEffect, useState } from 'react';
import { useBiz } from '../BizContext';
import { updateBusiness } from '@/lib/negocio';

/**
 * El orden importa: primero lo que cualquiera puede recibir sin
 * firmar nada con nadie, después lo que necesita pasarela. Un dueño
 * sin cuenta de comercio tiene que encontrar lo suyo de una.
 */
const METODOS = [
  {
    id: 'cash',
    nombre: 'Efectivo al recibir',
    icono: 'payments',
    detalle: 'El cliente paga cuando le llega el pedido. No necesitas nada.',
    sinPasarela: true,
  },
  {
    id: 'whatsapp',
    nombre: 'Cerrar por WhatsApp',
    icono: 'chat',
    detalle:
      'El pedido te llega completo por WhatsApp —con el número, los productos y el total— y tú acuerdas el pago por ahí.',
    sinPasarela: true,
    pideNumero: true,
  },
  {
    id: 'nequi',
    nombre: 'Nequi',
    icono: 'account_balance_wallet',
    detalle: 'El cliente paga en línea. Te lo consignamos con el corte del viernes.',
  },
  {
    id: 'daviplata',
    nombre: 'Daviplata',
    icono: 'account_balance',
    detalle: 'El cliente paga en línea. Te lo consignamos con el corte del viernes.',
  },
  {
    id: 'card',
    nombre: 'Tarjeta débito o crédito',
    icono: 'credit_card',
    detalle: 'Cobramos nosotros con nuestra pasarela. Tú no necesitas cuenta de comercio.',
  },
];

export default function PagosPage() {
  const { business, refreshBusiness, toast } = useBiz();

  const [activos, setActivos] = useState([]);
  const [wa, setWa] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!business) return;
    setActivos(business.payment_methods ?? ['cash']);
    setWa(business.whatsapp_phone ?? '');
  }, [business]);

  if (!business) {
    return <div className="sk" style={{ height: 320, borderRadius: 20 }} />;
  }

  const tiene = (id) => activos.includes(id);

  const alternar = (id) => {
    setListo(false);
    setError(null);
    setActivos((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const soloDigitos = wa.replace(/\D/g, '');
  const waFalta = tiene('whatsapp') && soloDigitos.length < 10;
  const ninguno = activos.length === 0;

  const guardar = async () => {
    setError(null);
    setListo(false);

    // Las dos que la base también rechaza. Se avisan acá para no
    // hacerle dar el viaje al servidor por algo que ya se ve.
    if (ninguno) {
      setError('Deja al menos una forma de cobrar, o nadie va a poder pedirte.');
      return;
    }
    if (waFalta) {
      setError('Escribe el número de WhatsApp al que quieres que te lleguen los pedidos.');
      return;
    }

    setGuardando(true);
    try {
      await updateBusiness(business.id, {
        payment_methods: activos,
        whatsapp_phone: soloDigitos || null,
      });
      await refreshBusiness?.();
      setListo(true);
      toast?.('Guardado. Tus clientes ya ven estos medios.');
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      <section style={S.intro}>
        <span className="ms" style={S.introIcono}>point_of_sale</span>
        <div>
          <h2 style={S.introTitulo}>Elige cómo te pueden pagar</h2>
          <p style={S.introTexto}>
            Tus clientes solo van a ver lo que prendas acá. Si no tienes
            pasarela de pagos, con efectivo y WhatsApp ya puedes vender.
          </p>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {METODOS.map((m) => {
          const on = tiene(m.id);
          return (
            <div key={m.id} style={{ ...S.fila, borderColor: on ? 'var(--brand)' : 'var(--line)' }}>
              <button
                onClick={() => alternar(m.id)}
                style={S.filaBoton}
                aria-pressed={on}
              >
                <span style={{ ...S.icono, background: on ? 'var(--brand)' : 'var(--surface-2)', color: on ? '#fff' : 'var(--muted)' }}>
                  <span className="ms" style={{ fontSize: 20 }}>{m.icono}</span>
                </span>

                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span style={S.nombre}>
                    {m.nombre}
                    {m.sinPasarela && (
                      <span style={S.etiqueta}>SIN PASARELA</span>
                    )}
                  </span>
                  <span style={S.detalle}>{m.detalle}</span>
                </span>

                <span style={{ ...S.switch, background: on ? 'var(--brand)' : 'var(--line)' }}>
                  <span style={{ ...S.switchBola, transform: on ? 'translateX(18px)' : 'translateX(0)' }} />
                </span>
              </button>

              {/* El número solo aparece si prendió WhatsApp: un campo
                  que no se necesita es una pregunta más que responder. */}
              {m.pideNumero && on && (
                <div style={S.waCaja}>
                  <label style={S.waLabel}>¿A qué número te llegan los pedidos?</label>
                  <div style={S.waFila}>
                    <span style={S.waPrefijo}>+57</span>
                    <input
                      value={wa}
                      onChange={(e) => { setWa(e.target.value); setListo(false); }}
                      placeholder="313 759 4713"
                      inputMode="tel"
                      style={S.waInput}
                    />
                  </div>
                  <span style={S.waAyuda}>
                    Tiene que ser un número con WhatsApp. Ahí te va a llegar
                    la comanda completa de cada pedido.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {ninguno && (
        <p style={S.aviso}>
          <span className="ms" style={{ fontSize: 17 }}>warning</span>
          Sin ninguna forma de cobrar, tu negocio no le aparece disponible a nadie.
        </p>
      )}

      {error && (
        <p style={{ ...S.aviso, color: 'var(--red)' }}>
          <span className="ms" style={{ fontSize: 17 }}>error</span>
          {error}
        </p>
      )}

      <div style={S.pie}>
        {listo && (
          <span style={S.listo}>
            <span className="ms" style={{ fontSize: 17 }}>check_circle</span>
            Guardado
          </span>
        )}
        <button onClick={guardar} disabled={guardando} style={S.guardar}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

const S = {
  intro: {
    display: 'flex', gap: 14, alignItems: 'flex-start',
    padding: 18, borderRadius: 20,
    background: 'var(--surface)', border: '1px solid var(--line)',
  },
  introIcono: {
    fontSize: 26, color: 'var(--brand)', flex: 'none',
    width: 46, height: 46, borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
  },
  introTitulo: {
    margin: 0, fontFamily: 'var(--font-bricolage)', fontWeight: 800,
    fontSize: 17, letterSpacing: '-.01em',
  },
  introTexto: {
    margin: '5px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--muted)',
  },

  fila: {
    borderRadius: 18, background: 'var(--surface)',
    border: '1px solid var(--line)', overflow: 'hidden',
    transition: 'border-color .2s ease',
  },
  filaBoton: {
    display: 'flex', alignItems: 'center', gap: 13, width: '100%',
    padding: 15, background: 'none', textAlign: 'left',
  },
  icono: {
    width: 42, height: 42, borderRadius: 13, flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background .2s ease, color .2s ease',
  },
  nombre: {
    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    fontSize: 14.5, fontWeight: 700, color: 'var(--text)',
  },
  etiqueta: {
    fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em',
    padding: '2px 7px', borderRadius: 999,
    background: 'color-mix(in srgb, var(--green) 15%, transparent)',
    color: 'var(--green)',
  },
  detalle: {
    display: 'block', marginTop: 3, fontSize: 12.2, lineHeight: 1.45,
    color: 'var(--muted)',
  },
  switch: {
    width: 40, height: 22, borderRadius: 999, flex: 'none',
    padding: 2, transition: 'background .2s ease',
  },
  switchBola: {
    display: 'block', width: 18, height: 18, borderRadius: '50%',
    background: '#fff', transition: 'transform .2s cubic-bezier(.2,0,0,1)',
    boxShadow: '0 1px 3px rgba(0,0,0,.2)',
  },

  waCaja: {
    padding: '0 15px 15px 70px',
    display: 'flex', flexDirection: 'column', gap: 7,
  },
  waLabel: { fontSize: 12, fontWeight: 700, color: 'var(--text)' },
  waFila: {
    display: 'flex', alignItems: 'center', gap: 8,
    border: '1px solid var(--line)', borderRadius: 12,
    background: 'var(--surface-2)', padding: '0 12px', height: 44,
  },
  waPrefijo: { fontSize: 14, fontWeight: 700, color: 'var(--muted)', flex: 'none' },
  waInput: {
    flex: 1, minWidth: 0, border: 'none', background: 'none',
    fontSize: 15, fontWeight: 600, color: 'var(--text)', outline: 'none',
  },
  waAyuda: { fontSize: 11.5, lineHeight: 1.45, color: 'var(--muted)' },

  aviso: {
    display: 'flex', alignItems: 'center', gap: 8, margin: 0,
    fontSize: 12.5, color: 'var(--muted)',
  },

  pie: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 14,
    paddingTop: 4,
  },
  listo: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 13, fontWeight: 700, color: 'var(--green)',
  },
  guardar: {
    height: 46, padding: '0 26px', borderRadius: 999,
    background: 'var(--brand)', color: '#fff',
    fontSize: 14.5, fontWeight: 800,
  },
};
