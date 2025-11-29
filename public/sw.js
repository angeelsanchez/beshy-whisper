// ===================================================================
// SERVICE WORKER SIMPLIFICADO PARA NOTIFICACIONES PUSH
// OBJETIVO: Solo manejar push notifications sin cache problemático
// ===================================================================

console.log('Service Worker simplificado cargado');

// Install event - solo registrar, sin cache
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  // Saltar la espera para activar inmediatamente
  event.waitUntil(self.skipWaiting());
});

// Activate event - tomar control inmediatamente
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar caches antiguos si existen
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Tomar control de todas las páginas
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activation complete');
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  console.log('[SW] Push event details:', {
    hasData: !!event.data,
    dataType: event.data ? typeof event.data : 'none'
  });
  
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data parsed successfully:', data);
    
    const options = {
      body: data.body || 'Nueva notificación',
      icon: '/beshy-logo.svg', // Usar un icono que sabemos que funciona
      badge: '/beshy-logo.svg',
      tag: data.tag || 'notification',
      requireInteraction: true,
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Ver',
          icon: '/beshy-logo.svg'
        },
        {
          action: 'dismiss',
          title: 'Cerrar'
        }
      ]
    };

    console.log('[SW] Notification options prepared:', options);

    event.waitUntil(
      self.registration.showNotification(data.title || 'BESHY Whisper', options)
        .then(() => {
          console.log('[SW] Notification displayed successfully');
        })
        .catch(error => {
          console.error('[SW] Error showing notification:', error);
        })
    );
  } catch (error) {
    console.error('[SW] Error processing push data:', error);
    console.error('[SW] Raw event data:', event.data);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Handle notification click
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // If a client is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    }).catch(error => {
      console.error('[SW] Error handling notification click:', error);
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Service Worker simplificado listo para notificaciones push');

