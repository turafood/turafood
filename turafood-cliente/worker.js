/**
 * TURAFOOD — Worker del cliente con caché de la página de inicio
 *
 * Envuelve al Worker que genera OpenNext. La portada ("/") es la misma para
 * todos los visitantes sin sesión (los negocios activos, datos públicos), así
 * que su HTML se guarda en la caché del borde de Cloudflare:
 *
 *   · fresco (< 30 s)        → se sirve de inmediato, sin generar nada;
 *   · viejo (30 s – 5 min)   → se sirve igual y se regenera por detrás;
 *   · más viejo o ausente    → se genera, se sirve y se guarda.
 *
 * NUNCA se cachea algo con cookies de sesión (quien ya entró ve su versión) ni
 * respuestas que traigan Set-Cookie. Solo GET de "/" sin parámetros.
 */
import handler from './.open-next/worker.js';
export * from './.open-next/worker.js';

const FRESCO = 30;      // segundos
const MAXIMO = 300;     // segundos

const llevaSesion = (request) => /(^|;\s*)sb-[^=]*-auth-token/.test(request.headers.get('cookie') || '');

async function generar(request, env, ctx, cache, clave) {
  const res = await handler.fetch(request, env, ctx);
  const tipo = res.headers.get('content-type') || '';
  if (res.status === 200 && tipo.includes('text/html') && !res.headers.has('set-cookie')) {
    const copia = new Response(res.clone().body, res);
    copia.headers.set('Cache-Control', `public, max-age=0, s-maxage=${MAXIMO}`);
    copia.headers.set('x-generada', String(Date.now()));
    ctx.waitUntil(cache.put(clave, copia));
  }
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Solo la página HTML: las peticiones internas de Next (RSC, prefetch) son otro formato y no se tocan
    const esHtml = (request.headers.get('accept') || '').includes('text/html') && !request.headers.has('rsc')
      && !request.headers.has('next-router-prefetch') && !request.headers.has('next-router-state-tree');
    const cacheable = request.method === 'GET' && url.pathname === '/' && !url.search && esHtml && !llevaSesion(request);
    if (!cacheable) return handler.fetch(request, env, ctx);

    const cache = caches.default;
    const clave = new Request(`${url.origin}/`, { method: 'GET' });
    const guardada = await cache.match(clave);

    if (guardada) {
      const edad = (Date.now() - Number(guardada.headers.get('x-generada') || 0)) / 1000;
      if (edad > FRESCO) ctx.waitUntil(generar(request, env, ctx, cache, clave));   // se refresca por detrás
      const res = new Response(guardada.body, guardada);
      res.headers.set('x-cache', edad > FRESCO ? 'STALE' : 'HIT');
      res.headers.set('Cache-Control', 'private, no-cache, max-age=0, must-revalidate');   // el navegador siempre pregunta
      return res;
    }

    const res = await generar(request, env, ctx, cache, clave);
    const salida = new Response(res.body, res);
    salida.headers.set('x-cache', 'MISS');
    return salida;
  },
};
