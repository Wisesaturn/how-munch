// 브라우저가 push subscription을 자동 갱신할 때 발생하는 이벤트.
// 핸들러가 없으면 새 endpoint가 DB에 반영되지 않아 알림 전달이 실패한다.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' });
      });
    }),
  );
});

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
