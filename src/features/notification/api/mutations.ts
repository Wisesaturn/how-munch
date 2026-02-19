import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { Toast } from '@/commons/ui';

import { type NotificationItem, type NotificationPreferenceRow } from '@/entities/notification';

import { notificationKeys } from './queryKey';

/** 알림 단건 읽음 처리 */
export function useMarkNotificationReadMutation(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({
          read_at: new Date().toISOString(),
          status: 'read',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      if (!userId) return null;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(userId) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(userId) });

      const listQueryKey = notificationKeys.list(userId);
      const unreadQueryKey = notificationKeys.unreadCount(userId);

      const previousList = queryClient.getQueryData<NotificationItem[]>(listQueryKey) ?? [];
      const previousUnreadCount = queryClient.getQueryData<number>(unreadQueryKey) ?? 0;

      const nextList = previousList.map((notification) => {
        if (notification.id !== notificationId) return notification;
        if (notification.read_at) return notification;

        return {
          ...notification,
          read_at: new Date().toISOString(),
          status: 'read',
          updated_at: new Date().toISOString(),
        };
      });

      queryClient.setQueryData(listQueryKey, nextList);
      queryClient.setQueryData(unreadQueryKey, Math.max(previousUnreadCount - 1, 0));

      return { previousList, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      if (!userId || !context) return;
      queryClient.setQueryData(notificationKeys.list(userId), context.previousList);
      queryClient.setQueryData(notificationKeys.unreadCount(userId), context.previousUnreadCount);
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) });
    },
  });
}

/** 알림 전체 읽음 처리 */
export function useMarkAllNotificationsReadMutation(userId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;

      const now = new Date().toISOString();
      const supabase = createClient();
      const { error } = await supabase
        .from('notifications')
        .update({
          read_at: now,
          status: 'read',
          updated_at: now,
        })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) throw error;
    },
    onMutate: async () => {
      if (!userId) return null;

      await queryClient.cancelQueries({ queryKey: notificationKeys.list(userId) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(userId) });

      const listQueryKey = notificationKeys.list(userId);
      const unreadQueryKey = notificationKeys.unreadCount(userId);

      const previousList = queryClient.getQueryData<NotificationItem[]>(listQueryKey) ?? [];
      const previousUnreadCount = queryClient.getQueryData<number>(unreadQueryKey) ?? 0;
      const now = new Date().toISOString();

      const nextList = previousList.map((notification) => {
        if (notification.read_at) return notification;
        return {
          ...notification,
          read_at: now,
          status: 'read',
          updated_at: now,
        };
      });

      queryClient.setQueryData(listQueryKey, nextList);
      queryClient.setQueryData(unreadQueryKey, 0);

      return { previousList, previousUnreadCount };
    },
    onError: (_error, _variables, context) => {
      if (!userId || !context) return;
      queryClient.setQueryData(notificationKeys.list(userId), context.previousList);
      queryClient.setQueryData(notificationKeys.unreadCount(userId), context.previousUnreadCount);
    },
    onSettled: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) });
    },
  });
}

interface UpdateNotificationPreferencesParams {
  userId: string;
  values: Pick<
    NotificationPreferenceRow,
    | 'expiry_soon_enabled'
    | 'expiry_remind_days'
    | 'is_permission_asked'
    | 'quiet_hours_start'
    | 'quiet_hours_end'
  >;
}

/** 알림 설정 저장 */
export function useUpsertNotificationPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, values }: UpdateNotificationPreferencesParams) => {
      const supabase = createClient();
      const { error } = await supabase.from('notification_preferences').upsert({
        user_id: userId,
        ...values,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(variables.userId),
      });
    },
    onError: () => {
      Toast.error('알림 설정 저장에 실패했습니다');
    },
  });
}

interface UpsertPushSubscriptionParams {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Push 구독 저장/갱신 */
export function useUpsertPushSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, endpoint, p256dh, auth }: UpsertPushSubscriptionParams) => {
      const supabase = createClient();
      const { error } = await supabase.from('notification_push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.pushSubscription(variables.userId),
      });
    },
  });
}

interface DeactivatePushSubscriptionParams {
  userId: string;
  endpoint: string;
}

/** Push 구독 비활성화 */
export function useDeactivatePushSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ endpoint }: DeactivatePushSubscriptionParams) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('notification_push_subscriptions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', endpoint);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.pushSubscription(variables.userId),
      });
    },
  });
}
