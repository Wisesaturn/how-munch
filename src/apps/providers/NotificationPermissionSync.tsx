'use client';

import { useEffect } from 'react';

import { useAsyncEffect } from 'react-simplikit';

import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { createClient } from '@/commons/api/supabase/client';

import {
  showPushPermissionToast,
  syncPushPermissionAndSubscription,
} from '@/features/notification';

export function NotificationPermissionSync() {
  const { data: user } = useUserSuspenseQuery();

  useAsyncEffect(
    async function syncPushSubscriptionOnLogin() {
      const supabase = createClient();
      const { data: preference } = await supabase
        .from('notification_preferences')
        .select('is_permission_asked')
        .eq('user_id', user.id)
        .maybeSingle();

      const result = await syncPushPermissionAndSubscription({
        userId: user.id,
        isPermissionAsked: preference?.is_permission_asked ?? false,
      });

      showPushPermissionToast(result.promptedPermission);
    },
    [user.id],
  );

  useEffect(
    function syncOnSwSubscriptionChange() {
      if (!('serviceWorker' in navigator)) return;

      async function handleSwMessage(event: MessageEvent) {
        if (event.data?.type !== 'PUSH_SUBSCRIPTION_CHANGED') return;
        await syncPushPermissionAndSubscription({ userId: user.id, isPermissionAsked: true });
      }

      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    },
    [user.id],
  );

  return null;
}
