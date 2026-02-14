'use client';

import { Button, Toast } from '@/commons/ui';

import { useLogoutMutation } from '../api/mutations';

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
    <Button
      variant="outline"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      className="w-full"
    >
      {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
    </Button>
  );
}
