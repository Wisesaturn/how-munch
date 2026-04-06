import { createClient } from '@/commons/api/supabase/client';
import {
  isNotificationSupported,
  requestNotificationPermission,
  subscribePush,
} from '@/commons/lib';
import { Toast } from '@/commons/ui';

interface SyncPushPermissionParams {
  userId: string;
  isPermissionAsked: boolean;
}

type SyncPushPermissionStatus =
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'missing_vapid'
  | 'subscription_failed';

interface SyncPushPermissionResult {
  status: SyncPushPermissionStatus;
  isPermissionAsked: boolean;
  promptedPermission: NotificationPermission | null;
}

function encodePushKey(value: ArrayBuffer | null) {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

/**
 * @description 권한 확인(필요 시 요청)과 웹 푸시 구독 업서트를 한 번에 수행합니다.
 */
export async function syncPushPermissionAndSubscription({
  userId,
  isPermissionAsked,
}: SyncPushPermissionParams): Promise<SyncPushPermissionResult> {
  if (!isNotificationSupported()) {
    return {
      status: 'unsupported',
      isPermissionAsked,
      promptedPermission: null,
    };
  }

  const supabase = createClient();
  let permission = Notification.permission;
  let nextPermissionAsked = isPermissionAsked;
  let promptedPermission: NotificationPermission | null = null;

  if (!isPermissionAsked && permission === 'default') {
    promptedPermission = await requestNotificationPermission();
    permission = promptedPermission;
    if (promptedPermission !== 'default') {
      nextPermissionAsked = true;
      await supabase
        .from('notification_preferences')
        .upsert({ user_id: userId, is_permission_asked: true }, { onConflict: 'user_id' });
    }
  } else if (!isPermissionAsked) {
    nextPermissionAsked = true;
    await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, is_permission_asked: true }, { onConflict: 'user_id' });
  }

  if (permission !== 'granted') {
    return {
      status: 'denied',
      isPermissionAsked: nextPermissionAsked,
      promptedPermission,
    };
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return {
      status: 'missing_vapid',
      isPermissionAsked: nextPermissionAsked,
      promptedPermission,
    };
  }

  const subscription = await subscribePush(vapidPublicKey);
  if (!subscription) {
    return {
      status: 'subscription_failed',
      isPermissionAsked: nextPermissionAsked,
      promptedPermission,
    };
  }

  const p256dh = encodePushKey(subscription.getKey('p256dh'));
  const auth = encodePushKey(subscription.getKey('auth'));
  if (!p256dh || !auth) {
    return {
      status: 'subscription_failed',
      isPermissionAsked: nextPermissionAsked,
      promptedPermission,
    };
  }

  // 토큰(endpoint) 변경 시에도 최신 구독으로 안전하게 교체되도록 RPC 사용
  await supabase.rpc('upsert_push_subscription_by_user', {
    p_user_id: userId,
    p_endpoint: subscription.endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
  });

  return {
    status: 'granted',
    isPermissionAsked: nextPermissionAsked,
    promptedPermission,
  };
}

/**
 * @description 권한 요청 결과를 공통 안내 토스트로 표시합니다.
 */
export function showPushPermissionToast(permission: NotificationPermission | null) {
  if (permission === 'granted') {
    Toast.info('알림 설정 권한을 허용하였습니다');
    return;
  }

  if (permission === 'denied') {
    Toast.info('알림 설정 권한을 해제하였습니다');
  }
}
