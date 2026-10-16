import '../ta-auth.css';

/**
 * MARCO DE LOS ACCESOS
 *
 * Una columna con el formulario (limpia, centrada, una acción por pantalla) y,
 * en escritorio, un panel visual con foto y un "render" de la interfaz real, como
 * las pantallas de entrada de Stripe o Notion. En celular queda solo el formulario.
 *
 * El mismo archivo vive en cliente, negocios y admin; solo cambia `variante`.
 * Los renders son ilustrativos (llevan la nota "Vista de ejemplo"): no muestran
 * cifras ni nombres reales.
 */

const VARIANTES = {
  cliente: {
    etiqueta: null,
    foto: '/brand/hero-cliente.jpg',
    kicker: 'Buenaventura',
    titulo: 'Tu comida favorita, en minutos.',
    texto: 'Pide a los negocios del puerto y sigue tu domicilio en vivo en el mapa.',
    render: { icono: 'two_wheeler', titulo: 'Tu pedido va en camino', sub: 'Tu repartidor salió del negocio', progreso: 68, filas: [['Llega en', '12 min'], ['Pago', 'Efectivo']] },
  },
  negocio: {
    etiqueta: 'Negocios',
    foto: '/brand/hero-negocio.jpg',
    kicker: 'Para negocios del puerto',
    titulo: 'Vende más, sin complicarte.',
    texto: 'Recibe pedidos, maneja tu menú y reparte con tu propia flota desde un solo panel.',
    render: { icono: 'receipt_long', titulo: 'Nuevo pedido', sub: '2 productos · a domicilio', filas: [['Total', '$ 48.900'], ['Pago', 'Efectivo']], boton: 'Aceptar pedido' },
  },
  admin: {
    etiqueta: 'Consola',
    foto: null,
    kicker: 'Equipo TuraFood',
    titulo: 'Todo TuraFood, en un vistazo.',
    texto: 'Negocios, repartidores, pedidos y pagos en un solo lugar.',
    render: { icono: 'verified_user', titulo: 'Revisiones pendientes', sub: 'Negocios y repartidores', filas: [['Por aprobar', '—']], boton: 'Revisar' },
  },
};

export default function AuthShell({ variante = 'cliente', children, pie }) {
  const v = VARIANTES[variante] ?? VARIANTES.cliente;
  const r = v.render;

  return (
    <div className="ta-root">
      <section className="ta-panel">
        <header className="ta-brand">
          <img className="ta-logo-img claro" src="/brand/logo-verde.png" alt="TuraFood" />
          <img className="ta-logo-img oscuro" src="/brand/logo-crema.png" alt="" aria-hidden="true" />
          {v.etiqueta && <span className="ta-tag">{v.etiqueta}</span>}
        </header>

        <div className="ta-main">
          <div className="ta-card">{children}</div>
        </div>

        <footer className="ta-legal">
          {pie ?? (
            <>
              Al continuar aceptas los <a href="/terminos">Términos</a> y la <a href="/privacidad">Política de privacidad</a>.
            </>
          )}
        </footer>
      </section>

      <aside className="ta-visual" aria-hidden="true">
        {v.foto
          ? <div className="ta-photo" style={{ backgroundImage: `url('${v.foto}')` }} />
          : <div className="ta-grid-bg" />}
        <div className="ta-scrim" />

        <div className="ta-render">
          <div className="ta-render-head">
            <span className="ta-render-ico"><span className="ms ms-fill">{r.icono}</span></span>
            <div>
              <div className="ta-render-t">{r.titulo}</div>
              <div className="ta-render-s">{r.sub}</div>
            </div>
          </div>
          {typeof r.progreso === 'number' && <div className="ta-render-bar"><i style={{ width: `${r.progreso}%` }} /></div>}
          {r.filas.map(([k, val]) => (
            <div key={k} className="ta-render-row"><span>{k}</span><b>{val}</b></div>
          ))}
          {r.boton && <div className="ta-render-btn">{r.boton}</div>}
          <div className="ta-render-note">Vista de ejemplo</div>
        </div>

        <div className="ta-copy">
          <div className="ta-kicker">{v.kicker}</div>
          <h2 className="ta-hero-title">{v.titulo}</h2>
          <p className="ta-hero-text">{v.texto}</p>
        </div>
      </aside>
    </div>
  );
}
