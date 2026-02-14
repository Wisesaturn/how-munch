'use client';

import { Button, Toast } from '@/commons/ui';

import { useLeaveHouseholdMutation } from '../api/mutations';

interface LeaveHouseholdButtonProps {
  householdId: string;
  userId: string;
  onLeft?: () => void;
}

export function LeaveHouseholdButton({ householdId, userId, onLeft }: LeaveHouseholdButtonProps) {
  const mutation = useLeaveHouseholdMutation();

  const handleLeave = () => {
    if (!window.confirm('가구에서 탈퇴하시겠습니까?')) return;

    mutation.mutate(
      { householdId, userId },
      {
        onSuccess: () => {
          Toast.success('가구에서 탈퇴했습니다');
          onLeft?.();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '가구 탈퇴에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <Button
      variant="outline"
      onClick={handleLeave}
      disabled={mutation.isPending}
      className="w-full border-red-200 text-red-600 hover:bg-red-50"
    >
      {mutation.isPending ? '처리 중...' : '가구 탈퇴'}
    </Button>
  );
}
