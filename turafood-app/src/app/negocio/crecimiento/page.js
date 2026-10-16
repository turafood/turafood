'use client';

/**
 * TURAFOOD PARTNERS
 *
 * El centro de mando para crecer. Orden de lectura:
 *   1. Qué es y los tres pilares.
 *   2. El camino en tres fases (dar a conocer · convencer · fidelizar), cada una
 *      enlazada a la herramienta REAL del panel. Lo que aún no existe lleva la marca
 *      «Próximamente»: no se promete nada que no esté.
 *   3. Los tres planes, con el ahorro del plan anual en plata.
 *   4. Las condiciones, a la vista.
 *
 * Sin cifras de «clientes» ni «calificaciones» inventadas: lo que se muestra sale de
 * `planes.js` o es una descripción de lo que hace cada herramienta.
 */

import { useState } from 'react';
import Link from 'next/link';
import { cop } from '@/lib/format';
import {
  PLANES, PRECIOS, CONDICIONES, URL_AGENDA, WHATSAPP_VENTAS, ahorro, porMes, descuento, anualPorMeses,
} from './planes';

const PILARES = [
  { icono: 'campaign', titulo: 'Mercadeo y promociones', texto: 'Cupones, combos y envíos especiales para que más gente te elija y vuelva a pedir.' },
  { icono: 'storefront', titulo: 'Administración total', texto: 'Edita tu menú, precios y horarios, y consulta tus pagos desde un solo lugar.' },
  { icono: 'insights', titulo: 'Desempeño', texto: 'Ventas, platos más pedidos, tiempos y reseñas de tus clientes para decidir con datos.' },
];

const FASES = [
  {
    n: 1, titulo: 'Que te conozcan', icono: 'public',
    texto: 'Un perfil completo y abierto cuando los clientes buscan qué comer.',
    pasos: [
      { t: 'Menú, fotos y precios al día', href: '/negocio/catalogo', ok: true },
      { t: 'Horarios y tienda abierta', href: '/negocio/horarios', ok: true },
      { t: 'Posiciones destacadas en la búsqueda y las categorías', ok: false },
    ],
  },
  {
    n: 2, titulo: 'Que te compren', icono: 'local_activity',
    texto: 'Palancas de conversión inmediata en el momento de decidir.',
    pasos: [
      { t: 'Promociones, descuentos y combos', href: '/negocio/promociones', ok: true },
      { t: 'Métodos de pago que tus clientes usan', href: '/negocio/pagos', ok: true },
      { t: 'Pauta en Instagram, Facebook y Google', ok: false },
    ],
  },
  {
    n: 3, titulo: 'Que vuelvan', icon: 'loyalty', icono: 'loyalty',
    texto: 'Convierte la primera compra en clientes frecuentes.',
    pasos: [
      { t: 'Correos a tus clientes', href: '/negocio/email-mkt', ok: true },
      { t: 'Reseñas: responde y mejora', href: '/negocio/resenas', ok: true },
      { t: 'Tarjeta de sellos digitales y cupones de rescate', ok: false },
    ],
  },
];

const wa = (txt) => `https://wa.me/${WHATSAPP_VENTAS}?text=${encodeURIComponent(txt)}`;

export default function PartnersPage() {
  const [anual, setAnual] = useState(true);
  const p = PRECIOS.selfhosted;

  return (
    <div className="pt-root">
      <style>{CSS}</style>

      <header className="pt-hero">
        <span className="pt-badge">TuraFood Partners</span>
        <h1>Todo para administrar y hacer crecer tu negocio, en un solo lugar.</h1>
        <p>
          Mientras tu cocina atiende los pedidos del día, aquí configuras tu negocio, revisas cómo te va y lanzas
          promociones para vender más.
        </p>
      </header>

      <section className="pt-grid3">
        {PILARES.map((x) => (
          <article key={x.titulo} className="pt-card">
            <span className="pt-ico"><span className="ms">{x.icono}</span></span>
            <h3>{x.titulo}</h3>
            <p>{x.texto}</p>
          </article>
        ))}
      </section>

      <section>
        <h2 className="pt-h2">El camino para vender más</h2>
        <div className="pt-grid3">
          {FASES.map((f) => (
            <article key={f.n} className="pt-card">
              <div className="pt-fase"><span className="pt-num">{f.n}</span><span className="ms">{f.icono}</span></div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
              <ul className="pt-pasos">
                {f.pasos.map((s) => (
                  <li key={s.t}>
                    {s.ok ? (
                      <Link href={s.href} className="pt-paso"><span className="ms">check_circle</span><span>{s.t}</span><span className="ms flecha">chevron_right</span></Link>
                    ) : (
                      <div className="pt-paso off"><span className="ms">schedule</span><span>{s.t}</span><em>Próximamente</em></div>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="pt-h2">Escoge un plan y empieza a crecer</h2>
        <div className="pt-conm" role="group" aria-label="Facturación">
          <button type="button" data-on={!anual} onClick={() => setAnual(false)}>Mensual</button>
          <button type="button" data-on={anual} onClick={() => setAnual(true)}>Anual <b>-{descuento(p)}%</b></button>
        </div>

        <div className="pt-planes">
          {PLANES.map((pl) => (
            <article key={pl.id} className={`pt-plan ${pl.destacado ? 'top' : ''}`}>
              {pl.sello && <span className="pt-sello">{pl.sello}</span>}
              <h3>{pl.nombre}</h3>
              <p className="pt-gancho">{pl.gancho}</p>

              <div className="pt-precio">
                {pl.precio ? (
                  <>
                    <strong>{cop(anual ? pl.precio.anio : pl.precio.mes)}</strong>
                    <span>{anual ? ' / año' : ' / mes'}</span>
                  </>
                ) : <strong>{pl.precioTexto}</strong>}
              </div>
              {pl.precio && anual && (
                <div className="pt-ahorro">
                  Equivale a {cop(porMes(pl.precio))} al mes · ahorras {cop(ahorro(pl.precio))} frente a pagar mes a mes ({cop(anualPorMeses(pl.precio))})
                </div>
              )}
              {pl.precio && !anual && <div className="pt-ahorro">Pagando el año completo ahorras {descuento(pl.precio)} %.</div>}
              <p className="pt-para">{pl.paraQuien}</p>

              {pl.id === 'gratis' && <Link href="/negocio" className="pt-cta sec">Tu plan actual</Link>}
              {pl.id === 'selfhosted' && (
                <a className="pt-cta" target="_blank" rel="noopener noreferrer"
                  href={wa(`Hola, quiero el plan Self Hosted (${anual ? 'anual' : 'mensual'}) de TuraFood.`)}>
                  {pl.cta}
                </a>
              )}
              {pl.id === 'enterprise' && <a className="pt-cta sec" href={URL_AGENDA} target="_blank" rel="noopener noreferrer">{pl.cta}</a>}

              <ul className="pt-lista">
                {pl.incluye.map((i) => <li key={i}><span className="ms">check_circle</span><span>{i}</span></li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <details className="pt-cond">
        <summary><span className="ms">gavel</span> Lo que tienes que saber antes de decidir</summary>
        <ul>{CONDICIONES.map((c) => <li key={c}>{c}</li>)}</ul>
      </details>
    </div>
  );
}

const CSS = `
.pt-root{display:flex;flex-direction:column;gap:28px;max-width:1080px;margin:0 auto;width:100%}
.pt-hero{padding:32px 22px;border-radius:24px;background:#0B0B0C;color:#F5F5F5;border:1px solid rgba(216,182,92,.28);text-align:left}
.pt-hero h1{margin:14px 0 10px;font-size:clamp(24px,5vw,36px);line-height:1.1;letter-spacing:-.03em;font-weight:800;text-wrap:balance}
.pt-hero p{margin:0;max-width:560px;font-size:15px;line-height:1.55;color:#B8B8BC}
.pt-badge{display:inline-flex;height:26px;align-items:center;padding:0 12px;border-radius:99px;border:1px solid rgba(216,182,92,.4);color:#D8B65C;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.pt-h2{margin:0 0 14px;font-size:22px;font-weight:800;letter-spacing:-.02em}
.pt-grid3{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:760px){.pt-grid3{grid-template-columns:repeat(3,1fr)}}
.pt-card{padding:20px;border-radius:20px;background:var(--surface);border:1px solid var(--border)}
.pt-card h3{margin:14px 0 6px;font-size:17px;font-weight:800;letter-spacing:-.01em}
.pt-card p{margin:0;font-size:14px;line-height:1.5;color:var(--muted)}
.pt-ico{width:44px;height:44px;border-radius:14px;background:var(--surface2);display:grid;place-items:center;color:var(--gold)}
.pt-ico .ms{font-size:24px}
.pt-fase{display:flex;align-items:center;justify-content:space-between;color:var(--gold)}
.pt-num{width:28px;height:28px;border-radius:50%;background:var(--text);color:var(--surface);display:grid;place-items:center;font-size:13px;font-weight:800}
.pt-pasos{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}
.pt-paso{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:var(--surface2);color:var(--text);font-size:13.5px;font-weight:600;text-decoration:none}
.pt-paso .ms{font-size:19px;color:var(--gold)}
.pt-paso .flecha{margin-left:auto;color:var(--faint)}
.pt-paso span:nth-child(2){flex:1;min-width:0}
.pt-paso.off{opacity:.62}
.pt-paso.off .ms{color:var(--faint)}
.pt-paso em{font-style:normal;font-size:11px;font-weight:800;color:var(--muted);border:1px solid var(--border);padding:3px 8px;border-radius:99px;white-space:nowrap}
.pt-conm{display:inline-flex;padding:4px;border-radius:99px;background:var(--surface2);margin-bottom:16px}
.pt-conm button{height:38px;padding:0 20px;border-radius:99px;font-size:14px;font-weight:700;color:var(--muted)}
.pt-conm button[data-on="true"]{background:var(--text);color:var(--surface)}
.pt-conm b{margin-left:6px;font-size:11px;padding:2px 7px;border-radius:99px;background:var(--gold);color:#111}
.pt-planes{display:grid;gap:16px;grid-template-columns:1fr}
@media(min-width:900px){.pt-planes{grid-template-columns:repeat(3,1fr);align-items:stretch}}
.pt-plan{position:relative;display:flex;flex-direction:column;gap:6px;padding:22px;border-radius:22px;background:var(--surface);border:1px solid var(--border)}
.pt-plan.top{border:2px solid var(--gold);box-shadow:0 14px 40px rgba(0,0,0,.12)}
.pt-sello{position:absolute;top:-12px;left:20px;padding:5px 12px;border-radius:99px;background:var(--gold);color:#111;font-size:11px;font-weight:800}
.pt-plan h3{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em}
.pt-gancho{margin:0;font-size:13.5px;color:var(--muted)}
.pt-precio{margin-top:10px}
.pt-precio strong{font-size:32px;font-weight:800;letter-spacing:-.03em}
.pt-precio span{font-size:14px;color:var(--muted);font-weight:600}
.pt-ahorro{font-size:12.5px;line-height:1.45;color:var(--muted)}
.pt-para{margin:8px 0 6px;font-size:13.5px;line-height:1.5}
.pt-cta{display:flex;align-items:center;justify-content:center;height:48px;border-radius:14px;background:var(--primary);color:var(--onPrimary);font-weight:800;font-size:15px;text-decoration:none;margin:8px 0 10px}
.pt-cta.sec{background:transparent;color:var(--text);border:1.5px solid var(--text)}
.pt-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.pt-lista li{display:flex;gap:9px;font-size:13.5px;line-height:1.4}
.pt-lista .ms{font-size:18px;color:var(--gold);flex:none}
.pt-cond{border-radius:16px;border:1px solid var(--border);background:var(--surface)}
.pt-cond summary{display:flex;align-items:center;gap:10px;padding:16px;font-size:14px;font-weight:700;cursor:pointer;list-style:none}
.pt-cond ul{margin:0;padding:0 18px 16px 34px;display:flex;flex-direction:column;gap:9px;font-size:13px;line-height:1.55;color:var(--muted)}
`;
