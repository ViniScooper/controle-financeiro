// Service Worker para FinControl PWA
const CACHE_NAME = 'fincontrol-pwa-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.svg',
  '/logo.png',
  '/logo-192.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições de API para não cachear dados financeiros desatualizados
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        return networkResponse;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});

// Listener de Notificação Push Nativa
self.addEventListener('push', (event) => {
  let payload = { title: 'FinControl - Alerta de Conta', body: 'Você tem faturas ou contas com vencimento próximo!' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'FinControl', body: event.data.text() };
    }
  }

  const options = {
    body: payload.body,
    icon: '/logo-192.png',
    badge: '/logo-192.png',
    vibrate: [200, 100, 200],
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: 'Ver Contas' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Listener de Clique na Notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
