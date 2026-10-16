// Genera las páginas de negocios.turafood.com en ../public (HTML estático, sin framework).
//   node site/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const salida = path.join(aqui, '..', 'public');

// ---------- datos (una sola fuente para precios y enlaces) ----------
const URL_DEMO = 'https://demo.turafood.com';
const URL_EMPEZAR = 'https://app.turafood.com/empezar';
const URL_LOGIN = 'https://app.turafood.com/auth';
const URL_AGENDA = 'https://cal.com/sophieaimkt/growthpartner';
const WA = '573137594713';
const wa = (t) => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;

const MES = 189000;
const ANIO = 589000;
const cop = (n) => '$' + n.toLocaleString('es-CO');
const ahorroPct = Math.round((1 - ANIO / (MES * 12)) * 100);

const I = {
  tienda: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/></svg>',
  moto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M8.5 16.5h5l3-7h-4"/><path d="M13 5h3l1.5 4.5"/></svg>',
  grafica: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>',
  regalo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8"/><path d="M12 8v12"/><path d="M12 8S10.5 3.5 8 4.5 8 8 12 8zM12 8s1.5-4.5 4-3.5S16 8 12 8z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
};

const NAV = [
  ['/#modulos', 'Plataforma'],
  ['/planes', 'Planes'],
  ['/como-funciona', 'Cómo funciona'],
  ['/contacto', 'Contacto'],
];

const FAQ = [
  ['¿Cuánto cuesta empezar?', 'Nada. El plan Gratis no tiene costo de suscripción: creas tu negocio, cargas tu menú y recibes pedidos desde tu panel.'],
  ['¿Cobran comisión por cada venta?', `No cobramos comisión por venta. En el plan Self Hosted el 100 % de tus ventas es tuyo. Si conectas una pasarela de pagos en línea, esa pasarela puede tener su propia tarifa por transacción; no es de TuraFood.`],
  ['¿Puedo ver la plataforma antes de inscribirme?', 'Sí. En demo.turafood.com recorres el panel completo con datos de ejemplo, sin registrarte. Cuando quieras operar de verdad, pulsas «Go live» y solo te pedimos nombre del negocio, celular y correo.'],
  ['¿Cómo recibo los pedidos?', 'En tu panel, con alertas sonoras para la cocina, y también por WhatsApp. Aceptas, preparas y despachas desde el mismo lugar.'],
  ['¿Y los domicilios?', 'Tú asignas tus propios repartidores desde el panel y tus clientes siguen el pedido en el mapa. Fijas la ubicación de tu negocio y el mapa cubre Buenaventura.'],
  ['¿Qué es el plan Self Hosted?', 'Es tu propio ecosistema digital: tu web en tu propio dominio, con tu logo y tus colores, pagos en línea y cero comisiones por venta. Te acompañamos en la configuración del dominio.'],
  ['¿Puedo empezar gratis y subir de plan después?', 'Sí. Empiezas con el plan Gratis y subes a Self Hosted cuando lo necesites; tu menú y tus datos se conservan.'],
  ['¿Qué incluye Enterprise?', 'Es para cadenas y franquicias: varias sedes, app propia con tu marca, integración con tu POS o ERP, un consultor dedicado y acuerdos de flota para horas pico. Se cotiza según tu operación: agenda una llamada.'],
];

const PLANES = [
  {
    id: 'gratis', nombre: 'Gratis', gancho: 'El punto de partida', precio: () => ['$0', ''], ahorro: () => 'Sin costo de suscripción.',
    para: 'Negocios que dan sus primeros pasos en lo digital y quieren probar sin costo.',
    cta: ['Empezar gratis', URL_EMPEZAR, 'linea'],
    items: ['Presencia en el marketplace local de TuraFood', 'Menú digital con fotos, precios y modificadores básicos', 'Recepción de pedidos en tu panel y por WhatsApp', 'Control de horarios y disponibilidad de platos', 'Enlace para compartir en redes (turafood.com/tu-negocio)', 'Soporte estándar'],
  },
  {
    id: 'selfhosted', nombre: 'Self Hosted', gancho: 'Tu ecosistema digital independiente', top: true, sello: 'El más popular',
    precio: 'dinamico',
    para: 'Restaurantes que quieren su propia marca, independencia total y cero intermediarios.',
    cta: ['Elegir Self Hosted', wa('Hola, quiero el plan Self Hosted de TuraFood.'), 'oro'],
    items: ['Tu propia web en tu dominio (www.tunegocio.com o pedidos.tunegocio.com)', 'Cero comisiones por venta: el 100 % es tuyo', 'Identidad visual propia: tu logo, tus colores y tu portada', 'Pasarela de pagos en línea (PSE, Nequi, Daviplata, tarjetas) y contra entrega', 'Menú inteligente con control de stock en tiempo real y combos', 'Alertas sonoras en vivo para la cocina', 'Promociones: cupones, combos del día y envíos especiales', 'Estadísticas de ventas, platos más pedidos y base de tus propios clientes', 'Asesoría para configurar y poner en marcha tu dominio'],
  },
  {
    id: 'enterprise', nombre: 'Enterprise', gancho: 'A la medida: cadenas y franquicias', precio: () => ['A la medida', ''], ahorro: () => 'Según lo que necesite tu operación.',
    para: 'Marcas con varias sedes o alto volumen que necesitan integraciones y logística propias.',
    cta: ['Hablar con un especialista', URL_AGENDA, 'linea'],
    items: ['Multi-sucursal con gestión centralizada', 'App móvil con tu propia marca (iOS y Android)', 'Integración con tu POS o ERP por API', 'Consultor de cuenta dedicado y soporte prioritario', 'Estrategia de pauta y trade marketing local', 'Acuerdos de flota de domiciliarios para horas pico'],
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- piezas ----------
const head = (titulo, desc, ruta) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0B0B0C">
<link rel="canonical" href="https://negocios.turafood.com${ruta}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://negocios.turafood.com${ruta}">
<meta property="og:image" content="https://negocios.turafood.com/brand/og.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="skip" href="#principal">Saltar al contenido</a>`;

const nav = (actual) => `
<header class="nav">
  <div class="wrap">
    <a class="logo" href="/" aria-label="TuraFood Negocios"><img src="/brand/logo-crema.png" alt="TuraFood" width="120" height="68"></a>
    <ul>${NAV.map(([h, t]) => `<li><a href="${h}"${h === actual ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul>
    <div class="acciones">
      <a class="btn sm contorno" href="${URL_LOGIN}">Ingresar</a>
      <a class="btn sm luz" href="${URL_EMPEZAR}">Empezar gratis</a>
      <details class="menu-m"><summary aria-label="Menú">${I.menu}</summary>
        <nav>${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}<a href="${URL_DEMO}">Ver demo</a><a href="${URL_LOGIN}">Ingresar</a></nav>
      </details>
    </div>
  </div>
</header>`;

const pie = `
<footer>
  <div class="wrap">
    <div>
      <img src="/brand/logo-crema.png" alt="TuraFood" width="120" height="68">
      <p style="margin-top:14px;max-width:340px">La plataforma de pedidos y domicilios para los negocios de Buenaventura.</p>
    </div>
    <div class="cols">
      <div><h4>Plataforma</h4><ul><li><a href="/#modulos">Qué incluye</a></li><li><a href="/planes">Planes</a></li><li><a href="/como-funciona">Cómo funciona</a></li><li><a href="${URL_DEMO}">Ver demo</a></li></ul></div>
      <div><h4>Cuenta</h4><ul><li><a href="${URL_EMPEZAR}">Empezar gratis</a></li><li><a href="${URL_LOGIN}">Ingresar</a></li><li><a href="/contacto">Contacto</a></li></ul></div>
      <div><h4>Legal</h4><ul><li><a href="https://turafood.com/terminos">Términos</a></li><li><a href="https://turafood.com/privacidad">Privacidad</a></li><li><a href="https://turafood.com">turafood.com</a></li></ul></div>
    </div>
    <div class="legal" style="grid-column:1/-1">© ${new Date().getFullYear()} TuraFood · Buenaventura, Valle del Cauca, Colombia</div>
  </div>
</footer>`;

const faqHtml = (items = FAQ) => `<div class="faq">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;

const planesHtml = () => `
<div class="conm" role="group" aria-label="Facturación">
  <button type="button" id="b-mes" aria-pressed="false">Mensual</button>
  <button type="button" id="b-anio" aria-pressed="true">Anual <b>-${ahorroPct}%</b></button>
</div>
<div class="planes">${PLANES.map((p) => `
  <article class="plan${p.top ? ' top' : ''}" id="plan-${p.id}">
    ${p.sello ? `<span class="sello">${p.sello}</span>` : ''}
    <h3>${p.nombre}</h3>
    <p class="gancho">${p.gancho}</p>
    ${p.precio === 'dinamico'
      ? `<div class="precio"><span id="px">${cop(ANIO)}</span> <small id="pp">/ año</small></div><div class="ahorro" id="pa">Equivale a ${cop(Math.round(ANIO / 12))} al mes · ahorras ${cop(MES * 12 - ANIO)} frente a pagar mes a mes.</div>`
      : `<div class="precio">${p.precio()[0]}</div><div class="ahorro">${p.ahorro()}</div>`}
    <p class="para">${p.para}</p>
    <a class="btn ${p.cta[2]}" href="${esc(p.cta[1])}"${p.cta[1].startsWith('http') && !p.cta[1].includes('app.turafood') ? ' target="_blank" rel="noopener"' : ''}>${p.cta[0]}</a>
    <ul>${p.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
  </article>`).join('')}
</div>
<p class="nota-planes">La pasarela de pagos en línea la opera un proveedor externo y puede tener su propia tarifa por transacción. El dominio propio (la compra anual del nombre) se paga aparte; te asesoramos en la configuración.</p>
<script>
(function(){
  var MES=${MES},ANIO=${ANIO};
  var f=function(n){return '$'+n.toLocaleString('es-CO')};
  var bm=document.getElementById('b-mes'),ba=document.getElementById('b-anio');
  function poner(anual){
    bm.setAttribute('aria-pressed',String(!anual));ba.setAttribute('aria-pressed',String(anual));
    document.getElementById('px').textContent=f(anual?ANIO:MES);
    document.getElementById('pp').textContent=anual?'/ año':'/ mes';
    document.getElementById('pa').textContent=anual?('Equivale a '+f(Math.round(ANIO/12))+' al mes · ahorras '+f(MES*12-ANIO)+' frente a pagar mes a mes.'):('Pagando el año completo ahorras ${ahorroPct} %.');
  }
  bm.onclick=function(){poner(false)};ba.onclick=function(){poner(true)};
})();
</script>`;

const bandaDemo = `
<section><div class="wrap"><div class="banda">
  <div>
    <h2>Míralo funcionando antes de decidir.</h2>
    <p>Recorre el panel completo en el demo, con datos de ejemplo y sin registrarte. Cuando estés listo, un botón te lleva a operar de verdad.</p>
  </div>
  <div class="cta"><a class="btn oro" href="${URL_DEMO}">Ver el demo</a><a class="btn contorno" href="${URL_EMPEZAR}">Empezar gratis</a></div>
</div></div></section>`;

const cierre = (actual) => nav(actual);

const pagina = (ruta, titulo, desc, cuerpo) => {
  // una sola <h1> por página: en las internas es el primer título de sección
  if (ruta !== '/') cuerpo = cuerpo.replace(/<h2([^>]*)>([^]*?)<\/h2>/, '<h1$1>$2</h1>');
  const html = head(titulo, desc, ruta) + nav(ruta === '/' ? '/' : ruta) + `\n<main id="principal">${cuerpo}</main>` + pie + '\n</body>\n</html>\n';
  const dest = ruta === '/' ? path.join(salida, 'index.html') : path.join(salida, ruta.slice(1) + '.html');
  fs.writeFileSync(dest, html);
  console.log('✔', path.relative(salida, dest));
};

// ---------- inicio ----------
const MODULOS = [
  [I.tienda, 'Menú y disponibilidad', 'Cambia precios en segundos, pausa un plato cuando se acabe el ingrediente y ordena tus categorías: entradas, mariscos, bebidas, combos.'],
  [I.moto, 'Domicilios en Buenaventura', 'Asigna tus propios repartidores, fija la ubicación de tu negocio y deja que tus clientes sigan el pedido en el mapa de Buenaventura.'],
  [I.grafica, 'Métricas del día', 'Total vendido, número de órdenes, ticket promedio y platos más pedidos, para decidir con datos y no con intuición.'],
  [I.regalo, 'Promociones y clientes', 'Cupones, combos del día y envíos especiales para que más gente te elija y vuelva a pedir.'],
];

pagina('/', 'TuraFood Negocios · Vende directo en Buenaventura, sin comisiones por venta', 'Menú digital, pedidos, domicilios y pagos para los negocios de Buenaventura. Empieza gratis o ten tu propia web en tu dominio.', `
<section class="hero" style="padding:0">
  <div class="wrap">
    <div>
      <span class="kicker">Hecho en Buenaventura</span>
      <h1>Vende directo a tus clientes, <span class="serif">sin comisiones</span> por venta.</h1>
      <p class="sub">Tu tienda virtual, tus pedidos y tus domicilios en un solo panel. Empieza gratis o ten tu propia web en tu propio dominio.</p>
      <div class="cta"><a class="btn oro" href="${URL_EMPEZAR}">Empezar gratis</a><a class="btn contorno" href="${URL_DEMO}">Ver el demo</a></div>
      <p class="nota">Sin tarjeta. En el demo no hace falta registrarse.</p>
    </div>
    <div class="render" aria-hidden="true">
      <div class="tarjeta"><b>Nuevo pedido</b><div class="fila"><span>2 productos · a domicilio</span><strong>En cocina</strong></div><div class="fila"><span>Pago</span><strong>Efectivo</strong></div><div class="ok">Aceptar pedido</div></div>
      <span class="nota-render">Vista de ejemplo</span>
    </div>
  </div>
</section>
<div class="franja"><div class="wrap"><span>Panel de pedidos en tiempo real</span><span>Domicilios con tus repartidores</span><span>Menú digital con fotos</span><span>Pagos en línea y contra entrega</span></div></div>

<section id="modulos"><div class="wrap">
  <div class="sec-head"><span class="kicker">La plataforma</span><h2>Todo lo que necesitas para vender, en un solo lugar.</h2><p>Mientras tu cocina atiende el día a día, aquí configuras tu negocio, revisas cómo te va y lanzas promociones.</p></div>
  <div class="grid g4">${MODULOS.map(([ic, t, d]) => `<article class="card"><span class="ico">${ic}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
</div></section>

<section class="oscura"><div class="wrap">
  <div class="sec-head"><span class="kicker">Cómo funciona</span><h2>Operando en tres pasos.</h2><p>Sin papeleos al inicio: lo demás lo completas ya dentro del panel.</p></div>
  <div class="grid g3 pasos">
    <article class="card paso" style="background:var(--ink-2);border-color:rgba(255,255,255,.1)"><h3 style="color:#fff">Regístrate</h3><p>Nombre de tu negocio, celular y correo. Confirmas con un código y estás dentro.</p><span class="tag">Menos de 2 minutos</span></article>
    <article class="card paso" style="background:var(--ink-2);border-color:rgba(255,255,255,.1)"><h3 style="color:#fff">Sube tu menú</h3><p>Platos con fotos y precios, tus horarios y tu ubicación. Lo puedes ajustar cuando quieras.</p></article>
    <article class="card paso" style="background:var(--ink-2);border-color:rgba(255,255,255,.1)"><h3 style="color:#fff">Recibe pedidos</h3><p>Llegan a tu panel con alerta sonora y los despachas con tus repartidores.</p></article>
  </div>
</div></section>

<section id="planes"><div class="wrap">
  <div class="sec-head"><span class="kicker">Planes</span><h2>Escoge un plan y empieza a crecer.</h2><p>Empieza gratis. Cuando quieras tu propia marca y tu propio dominio, pasa a Self Hosted.</p></div>
  ${planesHtml()}
</div></section>

${bandaDemo}

<section id="faq" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="kicker">Preguntas frecuentes</span><h2>Lo que más nos preguntan.</h2></div>
  ${faqHtml()}
</div></section>`);

// ---------- planes ----------
const FILAS = [
  ['Presencia en el marketplace TuraFood', 1, 1, 1],
  ['Menú digital con fotos y precios', 1, 1, 1],
  ['Pedidos en el panel y por WhatsApp', 1, 1, 1],
  ['Control de horarios y disponibilidad', 1, 1, 1],
  ['Tu propia web en tu dominio', 0, 1, 1],
  ['Identidad visual propia (logo, colores, portada)', 0, 1, 1],
  ['Cero comisiones por venta', 0, 1, 1],
  ['Pagos en línea (PSE, Nequi, Daviplata, tarjetas)', 0, 1, 1],
  ['Control de stock en tiempo real y combos', 0, 1, 1],
  ['Cupones y promociones', 0, 1, 1],
  ['Estadísticas y base de tus clientes', 0, 1, 1],
  ['Multi-sucursal', 0, 0, 1],
  ['App móvil con tu marca', 0, 0, 1],
  ['Integración con POS / ERP (API)', 0, 0, 1],
  ['Consultor dedicado y soporte prioritario', 0, 0, 1],
];
pagina('/planes', 'Planes · TuraFood Negocios', `Gratis, Self Hosted (${cop(MES)}/mes o ${cop(ANIO)}/año) y Enterprise a la medida.`, `
<section style="padding-top:56px"><div class="wrap">
  <div class="sec-head"><span class="kicker">Planes</span><h2>Escoge un plan y empieza a crecer.</h2><p>Sin letra chica escondida: lo que incluye cada plan está aquí, completo.</p></div>
  ${planesHtml()}
</div></section>
<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><h2 style="font-size:clamp(24px,4.4vw,34px)">Compara lo que incluye cada plan.</h2></div>
  <div class="tabla-wrap"><table><thead><tr><th>Incluye</th><th>Gratis</th><th>Self Hosted</th><th>Enterprise</th></tr></thead><tbody>
  ${FILAS.map(([n, a, b, c]) => `<tr><td>${n}</td>${[a, b, c].map((x) => `<td>${x ? '<span class="si" aria-label="Incluido">✓</span>' : '<span class="no" aria-label="No incluido">—</span>'}</td>`).join('')}</tr>`).join('')}
  </tbody></table></div>
</div></section>
${bandaDemo}
<section style="padding-top:0"><div class="wrap"><div class="sec-head"><span class="kicker">Preguntas frecuentes</span><h2>Antes de decidir.</h2></div>${faqHtml()}</div></section>`);

// ---------- cómo funciona ----------
pagina('/como-funciona', 'Cómo funciona · TuraFood Negocios', 'Registra tu negocio, sube tu menú y recibe pedidos en Buenaventura.', `
<section style="padding-top:56px"><div class="wrap">
  <div class="sec-head"><span class="kicker">Cómo funciona</span><h2>De cero a recibir pedidos, paso a paso.</h2><p>Pensado para que empieces hoy y completes el resto con calma.</p></div>
  <div class="grid g3 pasos">
    <article class="card paso"><h3>1. Regístrate</h3><p>Escribes el nombre de tu negocio, tu celular y tu correo. Te enviamos un código y confirmas. Tu panel queda creado al instante.</p><span class="tag">Sin documentos al inicio</span></article>
    <article class="card paso"><h3>2. Sube tu menú</h3><p>Agrega tus platos con foto, precio y modificadores. Define tus horarios y la ubicación de tu negocio en Buenaventura.</p><span class="tag">Lo ajustas cuando quieras</span></article>
    <article class="card paso"><h3>3. Recibe y despacha</h3><p>Los pedidos llegan a tu panel con alerta sonora y por WhatsApp. Aceptas, preparas y los envías con tus repartidores.</p><span class="tag">Con seguimiento en el mapa</span></article>
  </div>
</div></section>
<section style="padding-top:0"><div class="wrap">
  <div class="sec-head"><span class="kicker">Prueba primero</span><h2>El demo es el mismo panel.</h2><p>Con datos de ejemplo y sin registrarte. Si te convence, «Go live» te pide solo tres datos para empezar a operar.</p></div>
  <div class="cta" style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn negro" href="${URL_DEMO}">Ver el demo</a><a class="btn linea" href="${URL_EMPEZAR}">Empezar gratis</a></div>
</div></section>
<section style="padding-top:0"><div class="wrap"><div class="sec-head"><span class="kicker">Preguntas frecuentes</span><h2>Dudas comunes.</h2></div>${faqHtml()}</div></section>`);

// ---------- contacto ----------
pagina('/contacto', 'Contacto · TuraFood Negocios', 'Habla con el equipo de TuraFood por WhatsApp o agenda una llamada.', `
<section style="padding-top:56px"><div class="wrap">
  <div class="sec-head"><span class="kicker">Contacto</span><h2>Hablemos de tu negocio.</h2><p>Escríbenos y te ayudamos a empezar, o agenda una llamada si eres una cadena o franquicia.</p></div>
  <div class="contacto-g">
    <article class="card"><div class="canal"><div><span class="ico">${I.tienda}</span><h3>WhatsApp</h3><p>La forma más rápida de resolver dudas y activar tu plan.</p><a class="btn negro" href="${wa('Hola, quiero información de TuraFood para mi negocio.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a></div></div></article>
    <article class="card"><div class="canal"><div><span class="ico">${I.grafica}</span><h3>Llamada con un especialista</h3><p>Para Enterprise o si quieres revisar tu operación con calma.</p><a class="btn linea" href="${URL_AGENDA}" target="_blank" rel="noopener">Agendar llamada</a></div></div></article>
  </div>
</div></section>
${bandaDemo}`);

// ---------- ico de compartir (og) si existe ----------
console.log('Listo.');
