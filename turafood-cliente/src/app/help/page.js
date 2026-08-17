'use client';

/**
 * AYUDA
 * Conversión de `isHelp` (línea 1603) del mockup del cliente.
 * Temas frecuentes en acordeón + canales de contacto.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
const TOPICS = [
  {
    id: 'late',
    icon: 'schedule',
    q: 'Mi pedido está demorado',
    a: 'Revisa el seguimiento en vivo desde Mis pedidos: ahí ves dónde va el repartidor y el tiempo estimado. Si pasaron más de 20 minutos del rango prometido, escríbenos y revisamos el caso.',
  },
  {
    id: 'wrong',
    icon: 'no_meals',
    q: 'Llegó incompleto o equivocado',
    a: 'Repórtalo dentro de las 2 horas siguientes a la entrega, con una foto de lo que recibiste. Si el negocio se equivocó, te devolvemos el valor de lo que falta en créditos o al medio de pago.',
  },
  {
    id: 'cancel',
    icon: 'cancel',
    q: 'Quiero cancelar un pedido',
    a: 'Puedes cancelar sin costo mientras el negocio no lo haya aceptado. Si ya empezó la preparación, el negocio decide si aplica devolución.',
  },
  {
    id: 'charge',
    icon: 'credit_card',
    q: 'Me cobraron de más',
    a: 'El total lo calcula nuestro servidor con los precios del negocio: subtotal, envío, tarifa de servicio de $1.900 y la propina que elegiste. Si ves algo distinto, mándanos el número del pedido.',
  },
  {
    id: 'plus',
    icon: 'verified',
    q: 'Cómo funciona Tura Plus',
    a: 'Son $9.990 al mes los primeros 3 meses y luego $19.990. Incluye envíos gratis ilimitados y descuento en la tarifa de servicio. Se cancela cuando quieras desde tu cuenta.',
  },
  {
    id: 'courier',
    icon: 'two_wheeler',
    q: 'Quiero ser repartidor o registrar mi negocio',
    a: 'Escríbenos por WhatsApp y te pasamos los requisitos. En Buenaventura estamos sumando negocios y repartidores todo el tiempo.',
  },
];

const CHANNELS = [
  { id: 'whatsapp', icon: 'chat', label: 'WhatsApp', hint: 'Respondemos en minutos', href: 'https://wa.me/573137594713' },
  { id: 'mail', icon: 'mail', label: 'Correo', hint: 'soporte@turafood.com', href: 'mailto:soporte@turafood.com' },
];

export default function HelpPage() {
  const router = useRouter();
  const [open, setOpen] = useState(null);

  return (
    <>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', background: 'var(--bg)', minHeight: 0 }}>

        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 12px' }}>
          <button onClick={() => router.back()} style={S.backBtn} aria-label="Volver">
            <span className="ms" style={{ fontSize: 22 }}>arrow_back_ios_new</span>
          </button>
          <span style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 20 }}>Ayuda</span>
        </div>

        <div className="sc" style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 40px', minHeight: 0 }}>

          <div style={S.hero}>
            <span className="ms" style={{ fontSize: 30, color: 'var(--primary)' }}>support_agent</span>
            <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 800, fontSize: 19, marginTop: 10 }}>
              ¿En qué te ayudamos?
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5, lineHeight: 1.5 }}>
              Atendemos todos los días de 8:00 a.m. a 10:00 p.m.
            </div>
          </div>

          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 24 }}>
            Temas frecuentes
          </div>

          <div style={S.topicsCard}>
            {TOPICS.map((t, i) => {
              const isOpen = open === t.id;
              return (
                <div key={t.id} style={{ borderBottom: i === TOPICS.length - 1 ? 'none' : '1px solid var(--border)' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : t.id)}
                    aria-expanded={isOpen}
                    style={S.topicBtn}
                  >
                    <span className="ms" style={{ fontSize: 22, color: 'var(--muted)', flex: 'none' }}>{t.icon}</span>
                    <span style={{ flex: 1, textAlign: 'left', fontWeight: 700, fontSize: 14 }}>{t.q}</span>
                    <span
                      className="ms"
                      style={{
                        fontSize: 22, color: 'var(--faint)', flex: 'none',
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform .18s ease',
                      }}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div style={S.topicAnswer}>{t.a}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: 'var(--font-bricolage)', fontWeight: 700, fontSize: 19, marginTop: 26 }}>
            Hablar con alguien
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {CHANNELS.map((c) => (
              <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" style={S.channel}>
                <span style={S.channelIcon}>
                  <span className="ms" style={{ fontSize: 21, color: 'var(--primary)' }}>{c.icon}</span>
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{c.label}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>{c.hint}</span>
                </span>
                <span className="ms" style={{ fontSize: 20, color: 'var(--faint)' }}>chevron_right</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const S = {
  backBtn: {
    width: 38, height: 38, borderRadius: '50%', background: 'var(--surface2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
  },
  hero: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: 20, textAlign: 'center', boxShadow: 'var(--shadowSm)',
  },
  topicsCard: {
    marginTop: 12, background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '0 16px', overflow: 'hidden',
  },
  topicBtn: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px 0',
  },
  topicAnswer: {
    fontSize: 13, color: 'var(--muted)', lineHeight: 1.55,
    padding: '0 0 16px 34px',
  },
  channel: {
    display: 'flex', alignItems: 'center', gap: 13,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 18, padding: 14, boxShadow: 'var(--shadowSm)',
    textDecoration: 'none',
  },
  channelIcon: {
    width: 42, height: 42, borderRadius: 13, background: '#FFF1EC', flex: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
