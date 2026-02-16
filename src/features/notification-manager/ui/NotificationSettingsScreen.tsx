'use client';

import { useEffect } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { ChevronLeft } from 'lucide-react';
import { z } from 'zod';

import { useUserQuery } from '@/commons/api/auth/queries';
import { Button, Card, Select, Switch, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { useNotificationPreferencesQuery, useUpsertNotificationPreferencesMutation } from '../api';
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

/** 알림 설정 화면 */
export function NotificationSettingsScreen({ onClose }: NotificationSettingsScreenProps) {
  const { data: user } = useUserQuery();
  const userId = user?.id ?? null;
  const { data: preferences } = useNotificationPreferencesQuery(userId);
  const upsertPreferencesMutation = useUpsertNotificationPreferencesMutation();

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

  useEffect(
    function syncPreferencesToForm() {
      if (!preferences) return;
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        form.reset({
          expiryEnabled: false,
          expiryOption: toExpiryNotificationOption(preferences.expiry_remind_days),
        });
        return;
      }

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
            <form.Field name="expiryEnabled">
              {(field) => (
                <Form.Field field={field}>
                  <div className="flex items-center justify-between">
                    <Form.Label>유통기한 알림</Form.Label>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={(checked) => {
                        field.handleChange(checked);
                        savePreferences(checked, form.state.values.expiryOption);
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
