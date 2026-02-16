'use client';

import { useEffect } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { ChevronLeft } from 'lucide-react';
import { z } from 'zod';

import {
  getCurrentPushSubscription,
  requestNotificationPermission,
  subscribePush,
  unsubscribePush,
} from '@/commons/lib';
import { useUserQuery } from '@/commons/api/auth/queries';
import { Card, Select, Switch, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  useDeactivatePushSubscriptionMutation,
  useNotificationPreferencesQuery,
  useNotificationPushSubscriptionQuery,
  useUpsertNotificationPreferencesMutation,
  useUpsertPushSubscriptionMutation,
} from '../api';
import {
  EXPIRY_NOTIFICATION_OPTIONS,
  toExpiryNotificationOption,
  toExpiryRemindDays,
  type ExpiryNotificationOption,
} from '../model';

interface NotificationSettingsScreenProps {
  onClose: () => void;
}

const notificationSettingsSchema = z.object({
  expiryEnabled: z.boolean(),
  expiryOption: z.enum(['today', 'this_week']),
});

function encodePushKey(value: ArrayBuffer | null) {
  if (!value) return '';
  const bytes = new Uint8Array(value);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
}

/** 알림 설정 화면 */
export function NotificationSettingsScreen({ onClose }: NotificationSettingsScreenProps) {
  const { data: user } = useUserQuery();
  const userId = user?.id ?? null;
  const { data: preferences } = useNotificationPreferencesQuery(userId);
  const { data: pushSubscription } = useNotificationPushSubscriptionQuery(userId);
  const upsertPreferencesMutation = useUpsertNotificationPreferencesMutation();
  const upsertPushSubscriptionMutation = useUpsertPushSubscriptionMutation();
  const deactivatePushSubscriptionMutation = useDeactivatePushSubscriptionMutation();

  const form = useForm({
    defaultValues: {
      expiryEnabled: true,
      expiryOption: 'this_week' as ExpiryNotificationOption,
    },
    validators: {
      onSubmit: notificationSettingsSchema,
      onChange: notificationSettingsSchema,
    },
    onSubmit: async () => {},
  });

  function savePreferences(nextEnabled: boolean, nextOption: ExpiryNotificationOption) {
    if (!userId) return;

    upsertPreferencesMutation.mutate(
      {
        userId,
        values: {
          expiry_soon_enabled: nextEnabled,
          expiry_remind_days: toExpiryRemindDays(nextOption),
          quiet_hours_start: null,
          quiet_hours_end: null,
        },
      },
      {
        onError: () => {
          Toast.error('알림 설정 저장에 실패했습니다');
        },
      },
    );
  }

  async function syncPushSubscription(nextEnabled: boolean) {
    if (!userId) return false;

    if (nextEnabled) {
      const permission = await requestNotificationPermission();
      if (permission !== 'granted') {
        Toast.error('브라우저 알림 권한이 필요합니다');
        return false;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        Toast.error('푸시 키가 설정되지 않았습니다');
        return false;
      }

      const subscription = await subscribePush(vapidPublicKey);
      if (!subscription) {
        Toast.error('푸시 구독에 실패했습니다');
        return false;
      }

      const p256dh = encodePushKey(subscription.getKey('p256dh'));
      const auth = encodePushKey(subscription.getKey('auth'));

      if (!p256dh || !auth) {
        Toast.error('푸시 키를 읽을 수 없습니다');
        return false;
      }

      await upsertPushSubscriptionMutation.mutateAsync({
        userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      });

      return true;
    }

    const currentSubscription = await getCurrentPushSubscription();
    const endpoint = currentSubscription?.endpoint ?? pushSubscription?.endpoint ?? null;
    await unsubscribePush();

    if (endpoint) {
      await deactivatePushSubscriptionMutation.mutateAsync({ userId, endpoint });
    }

    return true;
  }

  useEffect(
    function syncPreferencesToForm() {
      if (!preferences) return;

      form.reset({
        expiryEnabled: preferences.expiry_soon_enabled,
        expiryOption: toExpiryNotificationOption(preferences.expiry_remind_days),
      });
    },
    [form, preferences],
  );

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '알림 설정',
        backButton: {
          render: () => (
            <button type="button" onClick={onClose} aria-label="뒤로가기" className="p-1">
              <ChevronLeft className="size-5" />
            </button>
          ),
        },
      }}
    >
      <div className="space-y-4 p-4">
        <Card>
          <Card.Content className="space-y-3 py-3">
            <form.Field name="expiryEnabled">
              {(field) => (
                <Form.Field field={field}>
                  <div className="flex items-center justify-between">
                    <Form.Label>유통기한 알림</Form.Label>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={async (checked) => {
                        const nextEnabled = Boolean(checked);
                        const synced = await syncPushSubscription(nextEnabled);
                        if (!synced) return;
                        field.handleChange(nextEnabled);
                        savePreferences(nextEnabled, form.state.values.expiryOption);
                      }}
                    />
                  </div>
                  <Form.Error />
                </Form.Field>
              )}
            </form.Field>

            <form.Field name="expiryOption">
              {(field) => (
                <Form.Field field={field}>
                  <div className="flex items-center justify-between">
                    <Form.Label>알림 기준</Form.Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        const nextOption = value as ExpiryNotificationOption;
                        field.handleChange(nextOption);
                        savePreferences(form.state.values.expiryEnabled, nextOption);
                      }}
                      disabled={!form.state.values.expiryEnabled}
                    >
                      <Form.Control>
                        <Select.Trigger className="h-8 w-28">
                          <Select.Value placeholder="선택" />
                        </Select.Trigger>
                      </Form.Control>
                      <Select.Content>
                        {EXPIRY_NOTIFICATION_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  </div>
                  <Form.Error />
                </Form.Field>
              )}
            </form.Field>
          </Card.Content>
        </Card>
      </div>
    </AppScreen>
  );
}
