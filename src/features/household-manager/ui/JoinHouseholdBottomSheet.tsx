'use client';

import { useState } from 'react';

import { BottomSheet, Button, Input, Toast } from '@/commons/ui';

import { useJoinHouseholdMutation } from '../api/mutations';

interface JoinHouseholdBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export function JoinHouseholdBottomSheet({
  open,
  onClose,
  onJoined,
}: JoinHouseholdBottomSheetProps) {
  const [code, setCode] = useState('');
  const mutation = useJoinHouseholdMutation();

  const handleSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!code.trim()) {
      Toast.warn('초대 코드를 입력해 주세요');
      return;
    }

    mutation.mutate(
      { code },
      {
        onSuccess: () => {
          Toast.success('가구에 가입되었습니다');
          onJoined?.();
          onClose();
          setCode('');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '가구 가입에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="초대 코드로 가입" />
      <BottomSheet.Content>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">초대 코드</span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: A1B2C3"
              maxLength={12}
            />
          </label>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '가입 중...' : '가입하기'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
