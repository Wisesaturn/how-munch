/**
 * @description 브라우저에서 Notification API를 지원하는지 확인합니다.
 */
export function isNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * @description 서비스 워커를 등록하고 Registration 객체를 반환합니다.
 */
export async function registerNotificationServiceWorker() {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  const registration = await navigator.serviceWorker.register('/notification-sw.js');
  return registration;
}

/**
 * @description 브라우저 시스템 알림 권한을 요청하고 결과를 반환합니다.
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * @description Base64URL 공개키를 Uint8Array로 변환합니다.
 */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * @description PushManager 구독을 생성하거나 기존 구독을 반환합니다.
 */
export async function subscribePush(vapidPublicKey: string) {
  const registration = await registerNotificationServiceWorker();
  if (!registration) return null;
  if (!('pushManager' in registration)) return null;

  const currentSubscription = await registration.pushManager.getSubscription();
  if (currentSubscription) return currentSubscription;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  return subscription;
}

/**
 * @description 현재 브라우저의 Push 구독 정보를 반환합니다.
 */
export async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/notification-sw.js');
  if (!registration || !('pushManager' in registration)) return null;

  const subscription = await registration.pushManager.getSubscription();
  return subscription;
}

/**
 * @description 현재 Push 구독을 해지합니다.
 */
export async function unsubscribePush() {
  const subscription = await getCurrentPushSubscription();
  if (!subscription) return true;

  const result = await subscription.unsubscribe();
  return result;
}

/**
 * @description 시스템 알림을 표시합니다. 서비스 워커가 있으면 SW를 우선 사용합니다.
 */
export async function showSystemNotification(title: string, body: string) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration('/notification-sw.js');
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png',
      });
      return;
    }
  }

  // Fallback: service worker가 없는 경우 기본 Notification API 사용
  new Notification(title, { body });
}
