// TuraFood (negocios y repartidores) — Service Worker
//
// Qué hace:
//   · Notificaciones push (pedido nuevo, pedido asignado...).
//   · Guarda en caché SOLO archivos estáticos (JS/CSS/fuentes/iconos) para
//     que la app abra rápido.
//
// Qué NO hace, a propósito:
//   · No guarda en caché páginas HTML ni respuestas de la API. Esta app es
//     de uso privado (pedidos, plata, datos de clientes): una copia en el
//     dispositivo se vería después de cerrar sesión o en un teléfono
//     compartido.
//
// Para publicar una versión nueva, sube VERSION.
const VERSION = 'v1';
const STATIC_CACHE = `tf-pro-static-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('tf-pro-') && k !== STATIC_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

const ES_ESTATICO = (url) =>
  url.origin === self.location.origin &&
  (url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/icons/'));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!ES_ESTATICO(url)) return; // todo lo demás va directo a la red

  // Cache-first: estos archivos llevan hash en el nombre o casi no cambian.
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    }),
  );
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

  const urgente = d.kind === 'new_order' || d.kind === 'courier_assigned';
  event.waitUntil(
    self.registration.showNotification(d.title || 'TuraFood', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag || 'turafood',
      renotify: true,
      vibrate: urgente ? [300, 120, 300, 120, 300] : [150],
      // Un pedido nuevo no desaparece solo: hay que verlo y aceptarlo.
      requireInteraction: urgente,
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
