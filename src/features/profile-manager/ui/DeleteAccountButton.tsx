'use client';

import { Toast } from '@/commons/ui';

import { useDeleteAccountMutation } from '../api/mutations';

import { SettingsActionRow } from './SettingsActionRow';

export function DeleteAccountButton() {
  const deleteMutation = useDeleteAccountMutation();

  const handleDeleteAccount = () => {
    const confirmed = window.confirm(
      '회원 탈퇴 시 프로필과 연결된 데이터가 영구 삭제될 수 있습니다. 계속할까요?',
    );

    if (!confirmed) return;

    deleteMutation.mutate(undefined, {
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : '회원 탈퇴 처리 중 오류가 발생했습니다';
        Toast.error(message);
      },
    });
  };

  return (
    <SettingsActionRow
      label={deleteMutation.isPending ? '처리 중...' : '회원 탈퇴'}
      onClick={handleDeleteAccount}
      disabled={deleteMutation.isPending}
      tone="danger"
    />
  );
}
