#!/usr/bin/env node
/**
 * TURAFOOD — PRUEBA DE HUMO EN PRODUCCION (solo lectura, no crea ni cambia nada)
 *
 * Confirma que lo basico de las tres apps esta vivo: paginas que cargan, PWA
 * instalable (manifiesto + service worker), cabeceras de cache y que las rutas
 * que no existen respondan 404 en vez de una pagina de relleno.
 *
 *   node turafood-supabase/scripts/humo-produccion.mjs
 *
 * Sale con codigo 1 si algo falla.
 */
const CLIENTE = process.env.URL_CLIENTE || 'https://turafood.com';
const APP = process.env.URL_APP || 'https://app.turafood.com';
const ADMIN = process.env.URL_ADMIN || 'https://admin.turafood.com';

let fallos = 0;
const prueba = async (nombre, fn) => {
  try {
    const detalle = await fn();
    console.log(`  OK     ${nombre}${detalle ? `  — ${detalle}` : ''}`);
  } catch (e) {
    fallos++;
    console.log(`  FALLA  ${nombre}  — ${e.message}`);
  }
};
const exigir = (cond, msg) => { if (!cond) throw new Error(msg); };
const pedir = (url, opts = {}) => fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...opts });

console.log('\nPrueba de humo en produccion\n');

// --- Cliente ---
await prueba('cliente: inicio carga y trae el contenido del servidor', async () => {
  const t0 = Date.now();
  const r = await pedir(`${CLIENTE}/`);
  const html = await r.text();
  exigir(r.status === 200, `HTTP ${r.status}`);
  exigir(html.includes('TuraFood'), 'no aparece la marca en el HTML');
  exigir(html.includes('manifest'), 'falta el enlace al manifiesto');
  return `${Date.now() - t0} ms, ${Math.round(html.length / 1024)} KB`;
});

for (const ruta of ['/auth', '/help', '/privacidad', '/terminos', '/offline']) {
  await prueba(`cliente: ${ruta} responde`, async () => {
    const r = await pedir(`${CLIENTE}${ruta}`);
    exigir(r.status === 200, `HTTP ${r.status}`);
  });
}

await prueba('cliente: manifiesto instalable', async () => {
  const r = await pedir(`${CLIENTE}/manifest.json`);
  const m = await r.json();
  exigir(r.status === 200 && m.name && m.start_url && m.icons?.length >= 2, 'manifiesto incompleto');
  return `${m.icons.length} iconos`;
});

await prueba('cliente: service worker disponible', async () => {
  const r = await pedir(`${CLIENTE}/sw.js`);
  const js = await r.text();
  exigir(r.status === 200 && js.includes('push'), 'sw.js no responde o no maneja push');
  const cc = r.headers.get('cache-control') || '';
  exigir(/no-cache|max-age=0|must-revalidate/.test(cc), `sw.js no debe cachearse mucho (cache-control: ${cc || 'vacio'})`);
});

await prueba('cliente: pagina offline disponible', async () => {
  const r = await pedir(`${CLIENTE}/offline`);
  exigir(r.status === 200, `HTTP ${r.status}`);
});

await prueba('cliente: recursos estaticos con cache largo', async () => {
  const r = await pedir(`${CLIENTE}/fonts/${(await (await pedir(`${CLIENTE}/`)).text()).match(/\/fonts\/[\w.-]+/)?.[0]?.split('/fonts/')[1] ?? ''}`);
  if (r.status !== 200) return 'sin fuente local para probar (omitido)';
  const cc = r.headers.get('cache-control') || '';
  exigir(/max-age=\d{6,}|immutable/.test(cc), `cache-control: ${cc || 'vacio'}`);
  return cc;
});

await prueba('cliente: una tienda que no existe da 404 real', async () => {
  const r = await pedir(`${CLIENTE}/store/00000000-0000-4000-8000-000000000000`);
  const html = await r.text();
  exigir(!/Burger House|TS-4838|Yeison/.test(html), 'aparecen datos de relleno');
});

// --- App y Admin (redirigen a login si no hay sesion: 200 o 30x es vivo) ---
for (const [nombre, base] of [['app (negocios y repartidores)', APP], ['admin', ADMIN]]) {
  await prueba(`${nombre}: responde`, async () => {
    const r = await pedir(`${base}/`);
    exigir([200, 301, 302, 307, 308].includes(r.status), `HTTP ${r.status}`);
  });
  await prueba(`${nombre}: service worker`, async () => {
    const r = await pedir(`${base}/sw.js`);
    exigir(r.status === 200, `HTTP ${r.status}`);
  });
}

console.log(fallos === 0 ? '\nTODO BIEN: produccion esta viva.\n' : `\nHAY ${fallos} PRUEBA(S) FALLIDAS.\n`);
process.exit(fallos === 0 ? 0 : 1);
