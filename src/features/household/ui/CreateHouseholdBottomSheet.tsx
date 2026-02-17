'use client';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { BottomSheet, Button, Input, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { useCreateHouseholdMutation } from '../api/mutations';

interface CreateHouseholdBottomSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCreated?: () => void;
}

const createHouseholdSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '가구 이름' }))
    .max(30, ERROR_MSG.RANGE.MAX({ fieldName: '가구 이름', max: '30자' })),
});

export function CreateHouseholdBottomSheet({
  open,
  onClose,
  userId,
  onCreated,
}: CreateHouseholdBottomSheetProps) {
  const mutation = useCreateHouseholdMutation();

  const form = useForm({
    defaultValues: {
      name: '',
    },
    validators: {
      onSubmit: createHouseholdSchema,
      onChange: createHouseholdSchema,
    },
    onSubmit: ({ value }) => {
      const normalizedName = value.name.trim();

      mutation.mutate(
        { name: normalizedName, userId },
        {
          onSuccess: () => {
            Toast.success('가구가 생성되었습니다');
            onCreated?.();
            onClose();
            form.reset();
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : '가구 생성에 실패했습니다';
            Toast.error(message);
          },
        },
      );
    },
  });

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="가구 생성" />
      <BottomSheet.Content>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <form.Field name="name">
            {(field) => (
              <Form.Field field={field}>
                <Form.Label required>가구 이름</Form.Label>
                <Form.Control>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="예: 우리집"
                    maxLength={30}
                  />
                </Form.Control>
                <Form.Error />
              </Form.Field>
            )}
          </form.Field>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '생성 중...' : '생성'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
