// TuraFood Service Worker v1.0 - Cache & Offline First
const CACHE_NAME = 'turafood-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/offline.html',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Evitar interceptar requests que no sean GET o autenticación
  if (req.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase.co')) {
    return;
  }

  // Navegación HTML (páginas): Network-first con fallback a cache / offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // Recursos estáticos (CSS, JS, Fuentes, Imágenes): Cache-first con actualización en segundo plano
  if (
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        if (cachedRes) {
          fetch(req).then((freshRes) => {
            if (freshRes && freshRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(req, freshRes));
            }
          }).catch(() => {});
          return cachedRes;
        }
        return fetch(req).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        });
      })
    );
  }
});
