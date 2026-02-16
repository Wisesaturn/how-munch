'use client';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { BottomSheet, Button, Input, Toast } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { useJoinHouseholdMutation } from '../api/mutations';

interface JoinHouseholdBottomSheetProps {
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

const joinHouseholdSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '초대 코드' }))
    .max(12, ERROR_MSG.RANGE.MAX({ fieldName: '초대 코드', max: '12자' }))
    .regex(/^[A-Z0-9]+$/, ERROR_MSG.FORMAT.INVALID({ fieldName: '초대 코드' })),
});

export function JoinHouseholdBottomSheet({
  open,
  onClose,
  onJoined,
}: JoinHouseholdBottomSheetProps) {
  const mutation = useJoinHouseholdMutation();
  const form = useForm({
    defaultValues: {
      code: '',
    },
    validators: {
      onSubmit: joinHouseholdSchema,
      onChange: joinHouseholdSchema,
    },
    onSubmit: ({ value }) => {
      mutation.mutate(
        { code: value.code },
        {
          onSuccess: () => {
            Toast.success('가구에 가입되었습니다');
            onJoined?.();
            onClose();
            form.reset();
          },
          onError: (error) => {
            const message = error instanceof Error ? error.message : '가구 가입에 실패했습니다';
            Toast.error(message);
          },
        },
      );
    },
  });

  return (
    <BottomSheet open={open} onClose={onClose}>
      <BottomSheet.Header heading="초대 코드로 가입" />
      <BottomSheet.Content>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <form.Field name="code">
            {(field) => (
              <Form.Field field={field}>
                <Form.Label required>초대 코드</Form.Label>
                <Form.Control>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                    placeholder="예: A1B2C3"
                    maxLength={12}
                  />
                </Form.Control>
                <Form.Error />
              </Form.Field>
            )}
          </form.Field>
          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? '가입 중...' : '가입하기'}
          </Button>
        </form>
      </BottomSheet.Content>
    </BottomSheet>
  );
}
