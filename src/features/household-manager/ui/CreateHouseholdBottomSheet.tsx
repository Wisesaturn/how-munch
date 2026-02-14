'use client';

import { useState } from 'react';

import { BottomSheet, Button, Input, Toast } from '@/commons/ui';

import { useCreateHouseholdMutation } from '../api/mutations';

interface CreateHouseholdBottomSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated?: () => void;
}

export function CreateHouseholdBottomSheet({
  open,
  onClose,
  userId,
  onCreated,
}: CreateHouseholdBottomSheetProps) {
  const [name, setName] = useState('');
  const mutation = useCreateHouseholdMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      Toast.warn('가구 이름을 입력해 주세요');
      return;
    }

    mutation.mutate(
      { name: name.trim(), userId },
      {
        onSuccess: () => {
          Toast.success('가구가 생성되었습니다');
          onCreated?.();
          onClose();
          setName('');
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '가구 생성에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Content>
        <BottomSheet.Header heading="가구 생성" />
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">가구 이름</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리집"
              maxLength={30}
            />
          </label>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '생성 중...' : '생성'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
