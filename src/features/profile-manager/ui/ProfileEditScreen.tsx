'use client';

import { useEffect } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { ChevronLeft } from 'lucide-react';
import { z } from 'zod';

import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { Button, Input, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { formatUpdatedDaysAgo } from '../lib/date';
import { useProfileQuery } from '../api/queries';
import { useUpdateProfileMutation } from '../api/mutations';

interface ProfileEditScreenProps {
  onClose: () => void;
}

const profileEditSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '닉네임을 입력해 주세요')
    .max(20, '닉네임은 20자 이하로 입력해 주세요'),
});

export function ProfileEditScreen({ onClose }: ProfileEditScreenProps) {
  const { data: user } = useUserSuspenseQuery();
  const { data: profile, isLoading } = useProfileQuery(user.id);
  const mutation = useUpdateProfileMutation();
  const form = useForm({
    defaultValues: {
      nickname: profile.nickname,
    },
    validators: {
      onSubmit: profileEditSchema,
      onChange: profileEditSchema,
    },
    onSubmit: ({ value }) => {
      const normalizedNickname = value.nickname.trim();

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
    },
  });

  useEffect(
    function syncProfileNicknameToForm() {
      if (!profile) return;
      form.reset({ nickname: profile.nickname });
    },
    [form, profile],
  );

  const updatedAtText = profile
    ? formatUpdatedDaysAgo(profile.updated_at)
    : isLoading
      ? '불러오는 중...'
      : '';

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '프로필 수정',
        backButton: {
          render: () => (
            <button type="button" onClick={onClose} aria-label="뒤로가기" className="p-1">
              <ChevronLeft className="size-5" />
            </button>
          ),
        },
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3 p-4"
      >
        <form.Field name="nickname">
          {(field) => (
            <Form.Field field={field}>
              <Form.Label required>닉네임</Form.Label>
              <Form.Control>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </Form.Control>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">이메일</span>
          <Input value={profile?.email ?? ''} disabled />
        </label>

        <p className="text-xs text-gray-500">{updatedAtText}</p>

        <Button type="submit" disabled={mutation.isPending} className="mt-2 w-full">
          {mutation.isPending ? '수정 중...' : '수정'}
        </Button>
      </form>
    </AppScreen>
  );
}
