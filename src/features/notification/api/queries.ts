import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import {
  notificationKeys,
  type NotificationItem,
  type NotificationPreferenceRow,
  type NotificationPushSubscriptionRow,
} from '@/entities/notification';

/** 내 알림 목록 조회 */
export function useNotificationsQuery(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.list(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return data as NotificationItem[];
        }
      : skipToken,
  });
}

/** 내 읽지 않은 알림 개수 조회 */
export function useUnreadNotificationsCountQuery(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { count, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .is('read_at', null);

          if (error) throw error;
          return count ?? 0;
        }
      : skipToken,
  });
}

/** 내 알림 설정 조회 */
export function useNotificationPreferencesQuery(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.preferences(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) throw error;
          return data as NotificationPreferenceRow | null;
        }
      : skipToken,
  });
}

/** 내 Push 구독 조회 */
export function useNotificationPushSubscriptionQuery(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.pushSubscription(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('notification_push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();

          if (error) throw error;
          return data as NotificationPushSubscriptionRow | null;
        }
      : skipToken,
  });
}
