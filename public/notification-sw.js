self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '새 알림', body: event.data.text() };
  }

  const title = payload.title ?? '새 알림';
  const body = payload.body ?? '';
  const data = payload.data ?? {};

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: '/android-chrome-192x192.png',
      badge: '/favicon-32x32.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
        return;
      }

      clients.openWindow('/');
    }),
  );
});
