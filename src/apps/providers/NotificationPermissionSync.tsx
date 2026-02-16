'use client';

import { useAsyncEffect } from 'react-simplikit';

import { useUserQuery } from '@/commons/api/auth/queries';
import { createClient } from '@/commons/api/supabase/client';
import {
  isNotificationSupported,
  requestNotificationPermission,
  subscribePush,
} from '@/commons/lib';
import { Toast } from '@/commons/ui';

function encodePushKey(value: ArrayBuffer | null) {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

export function NotificationPermissionSync() {
  const { data: user } = useUserQuery();

  useAsyncEffect(
    async function syncPushSubscriptionOnLogin() {
      if (!user?.id) return;
      if (!isNotificationSupported()) return;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) return;
      const userId = user.id;
      const vapidKey = vapidPublicKey;
      const supabase = createClient();
      const { data: preference } = await supabase
        .from('notification_preferences')
        .select('is_permission_asked')
        .eq('user_id', userId)
        .maybeSingle();

      const isPermissionAsked = preference?.is_permission_asked ?? false;
      let permission = Notification.permission;

      if (!isPermissionAsked && permission === 'default') {
        permission = await requestNotificationPermission();
        if (permission !== 'default') {
          if (permission === 'granted') {
            Toast.info('알림 설정 권한을 허용하였습니다');
          } else {
            Toast.info('알림 설정 권한을 해제하였습니다');
          }
        }

        await supabase
          .from('notification_preferences')
          .upsert({ user_id: userId, is_permission_asked: true }, { onConflict: 'user_id' });
      } else if (!isPermissionAsked) {
        await supabase
          .from('notification_preferences')
          .upsert({ user_id: userId, is_permission_asked: true }, { onConflict: 'user_id' });
      }
      if (permission !== 'granted') return;

      const subscription = await subscribePush(vapidKey);
      if (!subscription) return;

      const p256dh = encodePushKey(subscription.getKey('p256dh'));
      const auth = encodePushKey(subscription.getKey('auth'));
      if (!p256dh || !auth) return;

      await supabase.from('notification_push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh,
          auth,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
    },
    [user?.id],
  );

  return null;
}
