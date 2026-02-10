const CACHE_NAME = 'beshy-v1';

const PRECACHE_URLS = [
  '/offline.html',
  '/beshy-logo.svg',
  '/icon-192.png',
  '/manifest.json',
];

const CACHEABLE_EXTENSIONS = /\.(js|css|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/i;

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.test(url.pathname);
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isThirdParty(url, swOrigin) {
  return url.origin !== swOrigin;
}

// ─── Install: precache critical assets ───
globalThis.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => globalThis.skipWaiting())
  );
});

// ─── Activate: clean old caches + claim clients ───
globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
        )
      )
      .then(() => globalThis.clients.claim())
  );
});

// ─── Fetch: caching strategies ───
globalThis.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const swOrigin = new URL(globalThis.location.origin);

  if (event.request.method !== 'GET') return;
  if (isThirdParty(url, swOrigin.origin)) return;
  if (isApiRequest(url)) return;

  // Navigation: network-first → offline fallback
  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets: cache-first → network fallback
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  }
});

// ─── Push notifications ───
globalThis.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'Nueva notificacion',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'notification',
      requireInteraction: data.requireInteraction ?? false,
      data: data.data || {},
    };

    event.waitUntil(
      globalThis.registration.showNotification(data.title || 'BESHY Whisper', options)
    );
  } catch (error) {
    console.error('[SW] Error processing push data:', error);
  }
});

// ─── Notification click ───
globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(globalThis.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (globalThis.clients.openWindow) {
        return globalThis.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Message: skip waiting for updates ───
globalThis.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    globalThis.skipWaiting();
  }
});
