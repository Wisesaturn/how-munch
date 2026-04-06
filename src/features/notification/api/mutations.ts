import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { Toast } from '@/commons/ui';

import {
  notificationKeys,
  type NotificationItem,
  type NotificationPreferenceRow,
} from '@/entities/notification';

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
    onMutate: async (variables) => {
      const preferenceQueryKey = notificationKeys.preferences(variables.userId);
      await queryClient.cancelQueries({ queryKey: preferenceQueryKey });

      const previousPreferences =
        queryClient.getQueryData<NotificationPreferenceRow | null>(preferenceQueryKey) ?? null;
      const now = new Date().toISOString();

      const optimisticPreferences: NotificationPreferenceRow = {
        user_id: variables.userId,
        expiry_soon_enabled: variables.values.expiry_soon_enabled,
        expiry_remind_days: variables.values.expiry_remind_days,
        is_permission_asked:
          variables.values.is_permission_asked ?? previousPreferences?.is_permission_asked ?? false,
        quiet_hours_start: variables.values.quiet_hours_start ?? null,
        quiet_hours_end: variables.values.quiet_hours_end ?? null,
        created_at: previousPreferences?.created_at ?? now,
        updated_at: now,
      };

      queryClient.setQueryData(preferenceQueryKey, optimisticPreferences);

      return { previousPreferences };
    },
    onSuccess: (_data, variables) => {
      Toast.success('알림 설정이 변경되었습니다');
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(variables.userId),
      });
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        notificationKeys.preferences(variables.userId),
        context?.previousPreferences ?? null,
      );
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

/** Push 구독 저장/갱신 — 토큰 변경 시 기존 구독을 비활성화하고 최신 구독으로 교체 */
export function useUpsertPushSubscriptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, endpoint, p256dh, auth }: UpsertPushSubscriptionParams) => {
      const supabase = createClient();
      const { error } = await supabase.rpc('upsert_push_subscription_by_user', {
        p_user_id: userId,
        p_endpoint: endpoint,
        p_p256dh: p256dh,
        p_auth: auth,
      });

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
