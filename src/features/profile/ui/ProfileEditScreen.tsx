'use client';

import { useEffect } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { ChevronLeft } from 'lucide-react';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { useUserSuspenseQuery } from '@/commons/api/auth/queries';
import { Button, CTAButton, Input, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { useProfileQuery } from '@/entities/profile';

import { formatUpdatedDaysAgo } from '../lib/date';
import { useUpdateProfileMutation } from '../api/mutations';

interface ProfileEditScreenProps {
  onClose: () => void;
}

const profileEditSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '닉네임' }))
    .max(10, ERROR_MSG.RANGE.MAX({ fieldName: '닉네임', max: '10자' })),
});

export function ProfileEditScreen({ onClose }: ProfileEditScreenProps) {
  const { data: user } = useUserSuspenseQuery();
  const { data: profile, isLoading } = useProfileQuery(user.id);
  const mutation = useUpdateProfileMutation();
  const formId = 'profile-edit-form';
  const form = useForm({
    defaultValues: {
      nickname: profile?.nickname ?? '',
    },
    validators: {
      onSubmit: profileEditSchema,
      onChange: profileEditSchema,
    },
    onSubmit: ({ value }) => {
      if (!profile) {
        Toast.error('프로필 정보를 불러오지 못했습니다');
        return;
      }

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

  let updatedAtText = '';
  if (profile) {
    updatedAtText = formatUpdatedDaysAgo(profile.updated_at);
  } else if (isLoading) {
    updatedAtText = '불러오는 중...';
  }

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '프로필 수정',
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3 px-4 pt-4 pb-28"
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
                  maxLength={10}
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
      </form>
      <CTAButton
        type="submit"
        form={formId}
        color="confirm"
        variant="filled"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? '수정 중...' : '수정'}
      </CTAButton>
    </AppScreen>
  );
}
