'use client';

import { useAsyncEffect } from 'react-simplikit';

import { useUserQuery } from '@/commons/api/auth/queries';
import { createClient } from '@/commons/api/supabase/client';

import {
  showPushPermissionToast,
  syncPushPermissionAndSubscription,
} from '@/features/notification-manager';

export function NotificationPermissionSync() {
  const { data: user } = useUserQuery();

  useAsyncEffect(
    async function syncPushSubscriptionOnLogin() {
      if (!user?.id) return;
      const userId = user.id;
      const supabase = createClient();
      const { data: preference } = await supabase
        .from('notification_preferences')
        .select('is_permission_asked')
        .eq('user_id', userId)
        .maybeSingle();

      const result = await syncPushPermissionAndSubscription({
        userId,
        isPermissionAsked: preference?.is_permission_asked ?? false,
      });

      showPushPermissionToast(result.promptedPermission);
    },
    [user?.id],
  );

  return null;
}
