// TuraFood (cliente) — Service Worker
//
//   · Páginas PÚBLICAS (inicio, tiendas, productos, ofertas): red primero y,
//     si no hay conexión, la última copia vista.
//   · Archivos estáticos: de la caché al instante y se refrescan detrás.
//   · Páginas PRIVADAS (cuenta, pedidos, seguimiento, checkout...): nunca se
//     guardan. En un teléfono compartido la copia seguiría ahí después de
//     cerrar sesión.
//   · Notificaciones push (estado del pedido).
//
// Para publicar una versión nueva, sube VERSION.
const VERSION = 'v2';
const CACHE_NAME = `turafood-cache-${VERSION}`;

// Sin conexión se muestra /offline. No se usa /offline.html: Cloudflare lo
// redirige a /offline, y una respuesta redirigida no sirve de fallback.
const PRECACHE = ['/', '/offline', '/manifest.json', '/icons/icon.svg'];

// Rutas cuyo HTML es igual para todos y seguro de guardar
const PAGINA_PUBLICA = /^\/($|store\/|product\/|offers($|\/)|list($|\/)|offline$)/;

const ES_ESTATICO = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/fonts/'));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Uno por uno: si una falla no se cae toda la instalación
      await Promise.all(PRECACHE.map((u) => cache.add(u).catch(() => {})));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('turafood-cache-') && k !== CACHE_NAME).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Solo se guarda una respuesta completa y directa (no redirecciones ni errores) */
const guardable = (res) => res && res.status === 200 && res.type === 'basic' && !res.redirected;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, ePayco, mapas: directo a la red
  if (url.pathname.startsWith('/api/')) return;

  // Páginas
  if (req.mode === 'navigate') {
    const publica = PAGINA_PUBLICA.test(url.pathname);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (publica && guardable(res)) {
            const copia = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(async () => {
          if (publica) {
            const cached = await caches.match(req);
            if (cached) return cached;
          }
          const offline = await caches.match('/offline');
          return offline || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        }),
    );
    return;
  }

  // Estáticos: caché al instante, refresco detrás (stale-while-revalidate)
  if (ES_ESTATICO(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(req);
        const red = fetch(req)
          .then((res) => {
            if (guardable(res)) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || red;
      }),
    );
  }
});

// ------------------------------------------------------------
// Push
// ------------------------------------------------------------
self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { title: 'TuraFood', body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(
    self.registration.showNotification(d.title || 'TuraFood', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag || 'turafood',
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: d.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of ventanas) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          await w.focus();
          if ('navigate' in w) await w.navigate(destino).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
