'use client';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { BottomSheet, Button, Input, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { type Profile } from '@/entities/profile';

import { useUpdateProfileMutation } from '../api/mutations';

interface ProfileEditBottomSheetProps {
  open: boolean;
  onClose: () => void;
  profile: Profile;
}

const profileEditSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '닉네임을 입력해 주세요')
    .max(20, '닉네임은 20자 이하로 입력해 주세요'),
});

export function ProfileEditBottomSheet({ open, onClose, profile }: ProfileEditBottomSheetProps) {
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

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="닉네임 수정" />
      <BottomSheet.Content>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
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
                    maxLength={20}
                  />
                </Form.Control>
                <Form.Error />
              </Form.Field>
            )}
          </form.Field>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
