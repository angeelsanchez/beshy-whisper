globalThis.addEventListener('install', (event) => {
  event.waitUntil(globalThis.skipWaiting());
});

globalThis.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames =>
        Promise.all(cacheNames.map(name => caches.delete(name)))
      ),
      globalThis.clients.claim()
    ])
  );
});

globalThis.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'Nueva notificación',
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

globalThis.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    globalThis.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
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

globalThis.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    globalThis.skipWaiting();
  }
});
