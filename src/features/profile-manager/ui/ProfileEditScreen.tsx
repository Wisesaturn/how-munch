'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

import { useUserQuery } from '@/commons/api/auth/queries';
import { Button, Input, ScrollArea, Toast } from '@/commons/ui';

import { useProfileQuery } from '../api/queries';
import { useUpdateProfileMutation } from '../api/mutations';

interface ProfileEditScreenProps {
  onClose: () => void;
}

export function ProfileEditScreen({ onClose }: ProfileEditScreenProps) {
  const [nickname, setNickname] = useState<string | null>(null);
  const { data: user } = useUserQuery();
  const mutation = useUpdateProfileMutation();
  const { data: profile, isLoading } = useProfileQuery(user?.id ?? null);

  function submitProfileUpdate(event: React.ChangeEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      Toast.error('프로필 정보를 불러오지 못했습니다');
      return;
    }

    const normalizedNickname = (nickname ?? profile.nickname).trim();
    if (!normalizedNickname) {
      Toast.warn('닉네임을 입력해 주세요');
      return;
    }

    mutation.mutate(
      { userId: profile.user_id, nickname: normalizedNickname },
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
  }

  function formatUpdatedDaysAgo(updatedAt: string) {
    const updatedDate = new Date(updatedAt);
    if (Number.isNaN(updatedDate.getTime())) return '수정일 정보 없음';

    const daysAgo = differenceInCalendarDays(startOfDay(new Date()), startOfDay(updatedDate));
    if (daysAgo <= 0) return '0일 전 수정';
    return `${daysAgo}일 전 수정`;
  }

  return (
    <AppScreen className="pointer-events-auto" appBar={{ title: '프로필 수정' }}>
      <ScrollArea className="h-full">
        <form onSubmit={submitProfileUpdate} className="flex flex-col gap-3 p-4">
          {isLoading || !profile ? (
            <p className="py-6 text-center text-sm text-gray-400">불러오는 중...</p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">닉네임</span>
                <Input
                  value={nickname ?? profile.nickname}
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">이메일</span>
                <Input value={profile.email} disabled />
              </label>

              <p className="text-xs text-gray-500">{formatUpdatedDaysAgo(profile.updated_at)}</p>

              <Button type="submit" disabled={mutation.isPending} className="mt-2 w-full">
                {mutation.isPending ? '수정 중...' : '수정'}
              </Button>
            </>
          )}
        </form>
      </ScrollArea>
    </AppScreen>
  );
}
