'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { overlay } from 'overlay-kit';

import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { useLoading } from '@/commons/model';
import { Button, Card, ConfirmDialog, Select, Switch, Toast } from '@/commons/ui';
import { cn } from '@/commons/lib';

import { useNotificationPreferencesQuery, useUpsertNotificationPreferencesMutation } from '../api';
import {
  refreshPushSubscription,
  showPushPermissionToast,
  syncPushPermissionAndSubscription,
} from '../lib/pushPermission';
import {
  EXPIRY_NOTIFICATION_OPTIONS,
  toExpiryNotificationOption,
  toExpiryRemindDays,
  type ExpiryNotificationOption,
} from '../model';

interface NotificationSettingsScreenProps {
  onClose: () => void;
}

const DEFAULT_EXPIRY_ENABLED = false;
const DEFAULT_EXPIRY_REMIND_DAYS = [7, 6, 5, 4, 3, 2, 1] as const;

/** 알림 설정 화면 */
export function NotificationSettingsScreen({ onClose }: NotificationSettingsScreenProps) {
  const { data: user } = useUserSuspenseQuery();
  const { data: preferences } = useNotificationPreferencesQuery(user.id);
  const upsertPreferencesMutation = useUpsertNotificationPreferencesMutation();
  const [isSyncing, startSyncing] = useLoading();

  const expiryEnabled = preferences?.expiry_soon_enabled ?? DEFAULT_EXPIRY_ENABLED;
  const expiryOption = toExpiryNotificationOption(
    preferences?.expiry_remind_days ?? [...DEFAULT_EXPIRY_REMIND_DAYS],
  );

  function savePreferences(
    nextEnabled: boolean,
    nextOption: ExpiryNotificationOption,
    isPermissionAsked = preferences?.is_permission_asked ?? false,
  ) {
    upsertPreferencesMutation.mutate({
      userId: user.id,
      values: {
        expiry_soon_enabled: nextEnabled,
        expiry_remind_days: toExpiryRemindDays(nextOption),
        is_permission_asked: isPermissionAsked,
        quiet_hours_start: null,
        quiet_hours_end: null,
      },
    });
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '알림 설정',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="space-y-4 p-4">
        <Card>
          <Card.Content className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">알람 구독 새로고침</p>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={isSyncing}
                onClick={() => {
                  overlay.open(({ isOpen, close, unmount }) => (
                    <ConfirmDialog
                      open={isOpen}
                      onOpenChange={(open) => {
                        if (!open) {
                          close();
                          window.setTimeout(unmount, 200);
                        }
                      }}
                      title="알람 구독 새로고침"
                      description="알람 구독 정보를 갱신하시겠습니까?"
                      confirmLabel="갱신"
                      onConfirm={() => {
                        close();
                        window.setTimeout(unmount, 200);
                        startSyncing(
                          refreshPushSubscription({
                            userId: user.id,
                            isPermissionAsked: preferences?.is_permission_asked ?? false,
                          }),
                        );
                      }}
                    />
                  ));
                }}
                aria-label="알람 구독 새로고침"
              >
                <RefreshCw className={cn('size-4', isSyncing && 'animate-spin')} />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">테스트 알림 발송</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await fetch('/api/notification/test', { method: 'POST' });
                  if (res.status === 204) {
                    Toast.success('테스트 알림을 발송했습니다');
                    return;
                  }

                  const needsResubscribe = res.status === 410 || res.status === 404;
                  if (needsResubscribe) {
                    overlay.open(({ isOpen, close, unmount }) => (
                      <ConfirmDialog
                        open={isOpen}
                        onOpenChange={(open) => {
                          if (!open) {
                            close();
                            window.setTimeout(unmount, 200);
                          }
                        }}
                        title="알림 구독이 해제되었어요"
                        description="구독 정보를 새로고침하시겠습니까?"
                        confirmLabel="새로고침"
                        onConfirm={async () => {
                          close();
                          window.setTimeout(unmount, 200);
                          await refreshPushSubscription({
                            userId: user.id,
                            isPermissionAsked: preferences?.is_permission_asked ?? false,
                          });
                        }}
                      />
                    ));
                    return;
                  }

                  Toast.error('발송 실패 — 잠시 후 다시 시도해주세요');
                }}
              >
                보내기
              </Button>
            </div>
          </Card.Content>
        </Card>
        <Card>
          <Card.Content className="space-y-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">유통기한 알림</p>
              <Switch
                checked={expiryEnabled}
                onCheckedChange={async (checked) => {
                  const nextEnabled = Boolean(checked);

                  if (!nextEnabled) {
                    savePreferences(false, expiryOption);
                    return;
                  }

                  if (!preferences?.is_permission_asked) {
                    const result = await syncPushPermissionAndSubscription({
                      userId: user.id,
                      isPermissionAsked: false,
                    });

                    showPushPermissionToast(result.promptedPermission);
                    if (result.status !== 'granted') {
                      if (result.status === 'unsupported') {
                        Toast.error('브라우저 알림을 지원하지 않습니다');
                      } else if (result.status === 'missing_vapid') {
                        Toast.error('푸시 키가 설정되지 않았습니다');
                      } else if (result.status === 'subscription_failed') {
                        Toast.error('푸시 구독에 실패했습니다');
                      }

                      savePreferences(false, expiryOption, result.isPermissionAsked);
                      return;
                    }

                    savePreferences(true, expiryOption, result.isPermissionAsked);
                    return;
                  }

                  savePreferences(true, expiryOption);
                }}
                disabled={upsertPreferencesMutation.isPending}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">알림 기준</p>
              <Select
                value={expiryOption}
                onValueChange={(value) => {
                  const nextOption = value as ExpiryNotificationOption;
                  savePreferences(expiryEnabled, nextOption);
                }}
                disabled={!expiryEnabled || upsertPreferencesMutation.isPending}
              >
                <Select.Trigger className="h-8 w-28">
                  <Select.Value placeholder="선택" />
                </Select.Trigger>
                <Select.Content>
                  {EXPIRY_NOTIFICATION_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </Card.Content>
        </Card>
      </div>
    </AppScreen>
  );
}
