'use client';

import { useRouter } from 'next/navigation';

import { Button, Toast } from '@/commons/ui';

import { useJoinHouseholdMutation } from '@/features/household';

interface InviteJoinButtonProps {
  code: string;
}

export function InviteJoinButton({ code }: InviteJoinButtonProps) {
  const router = useRouter();
  const mutation = useJoinHouseholdMutation();

  const handleJoin = () => {
    mutation.mutate(
      { code },
      {
        onSuccess: () => {
          Toast.success('가구에 가입되었습니다');
          router.replace('/fridge');
          router.refresh();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '가구 가입에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <Button onClick={handleJoin} disabled={mutation.isPending} className="w-full">
      {mutation.isPending ? '가입 중...' : '가입하기'}
    </Button>
  );
}
