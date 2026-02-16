'use client';

import { useEffect } from 'react';

import { useUserQuery } from '@/commons/api/auth/queries';
import { isNotificationSupported, requestNotificationPermission } from '@/commons/lib';

export function NotificationPermissionSync() {
  const { data: user } = useUserQuery();

  useEffect(
    function requestPermissionOnLogin() {
      if (!user?.id) return;
      if (!isNotificationSupported()) return;
      if (Notification.permission !== 'default') return;

      requestNotificationPermission();
    },
    [user?.id],
  );

  return null;
}
