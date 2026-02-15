'use client';

import { useState } from 'react';

import { BottomSheet, Button, Input, Toast } from '@/commons/ui';

import { type Profile } from '@/entities/profile';

import { useUpdateProfileMutation } from '../api/mutations';

interface ProfileEditBottomSheetProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

export function ProfileEditBottomSheet({ open, onClose, profile }: ProfileEditBottomSheetProps) {
  const [nickname, setNickname] = useState(profile.nickname);
  const mutation = useUpdateProfileMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!nickname.trim()) {
      Toast.warn('닉네임을 입력해 주세요');
      return;
    }

    mutation.mutate(
      { userId: profile.user_id, nickname: nickname.trim() },
      {
        onSuccess: () => {
          Toast.success('프로필이 수정되었습니다');
          onClose();
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : '프로필 수정에 실패했습니다';
          Toast.error(message);
        },
      },
    );
  };

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="닉네임 수정" />
      <BottomSheet.Content>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">닉네임</span>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
          </label>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
