'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

import { useUserQuery } from '@/commons/api/auth/queries';
import { Button, EmptyState } from '@/commons/ui';

import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../api';

function formatNotificationDate(value: string) {
  return format(new Date(value), 'M월 d일 HH:mm', { locale: ko });
}

/** 알림 목록 화면 */
export function NotificationScreen() {
  const { data: user } = useUserQuery();
  const userId = user?.id ?? null;
  const { data: notifications = [], isLoading } = useNotificationsQuery(userId);
  const markReadMutation = useMarkNotificationReadMutation(userId);
  const markAllReadMutation = useMarkAllNotificationsReadMutation(userId);

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  function markNotificationRead(notificationId: string, isUnread: boolean) {
    if (!isUnread) return;
    markReadMutation.mutate(notificationId);
  }

  function markAllRead() {
    if (!userId || unreadCount === 0) return;
    markAllReadMutation.mutate();
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '알림',
        renderRight: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={Boolean(!unreadCount || markAllReadMutation.isPending)}
          >
            모두 읽음
          </Button>
        ),
      }}
    >
      <div className="flex min-h-full flex-col p-4">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : null}
        {!isLoading &&
          (notifications.length === 0 ? (
            <EmptyState.Root>
              <EmptyState.Content className="py-16">
                <EmptyState.Title>알림이 없습니다</EmptyState.Title>
                <EmptyState.Description>
                  새로운 알림이 오면 여기에 표시됩니다
                </EmptyState.Description>
              </EmptyState.Content>
            </EmptyState.Root>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => {
                const isUnread = !notification.read_at;

                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => markNotificationRead(notification.id, isUnread)}
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {notification.title}
                        </p>
                        {isUnread ? (
                          <span className="size-2 shrink-0 rounded-full bg-red-500" />
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600">{notification.description}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          ))}
      </div>
    </AppScreen>
  );
}
