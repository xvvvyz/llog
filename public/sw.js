self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};

  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'llog', {
      badge: '/icon-192.png',
      body: payload.body || '',
      data: {
        recordId: payload.recordId,
        type: payload.type,
        url: payload.url || '/',
      },
      icon: '/icon-192.png',
      tag: payload.tag,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = new URL(event.notification.data?.url || '/', self.location.origin)
    .href;

  event.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: 'window' })
      .then(async (clients) => {
        const [client] = clients;

        if (client) {
          if ('focus' in client) {
            await client.focus();
          }

          if ('navigate' in client) {
            await client.navigate(url);
          }

          return;
        }

        if (self.clients.openWindow) {
          await self.clients.openWindow(url);
        }
      })
  );
});
