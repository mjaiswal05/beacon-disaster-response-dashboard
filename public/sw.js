// Firebase Messaging Service Worker
// This handles background push notifications

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); } catch { return; }

  const title = payload.notification?.title ?? payload.data?.title ?? 'Beacon Alert';
  const body = payload.notification?.body ?? payload.data?.body ?? '';
  const roomId = payload.data?.room_id;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/beacon.png',
      badge: '/beacon.png',
      data: { url: roomId ? `/communication?channel=${roomId}` : '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
