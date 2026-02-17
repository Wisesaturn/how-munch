'use client';

import { Toast } from '@/commons/ui';

import { useLogoutMutation } from '../api/mutations';

import { SettingsActionRow } from './SettingsActionRow';

export function LogoutButton() {
  const logoutMutation = useLogoutMutation();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onError: (error) => {
        const message = error instanceof Error ? error.message : '로그아웃에 실패했습니다';
        Toast.error(message);
      },
    });
  };

  return (
    <SettingsActionRow
      label={logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
    />
  );
}
