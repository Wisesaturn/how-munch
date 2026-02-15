'use client';

import { useMemo, useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { Button, Counter, DatePicker, Message, Textarea } from '@/commons/ui';

export interface FridgeBatchFormValues {
  quantity: number;
  expiry_date: string;
  purchased_date: string;
  memo: string;
}

interface FridgeBatchFormProps {
  defaultValues?: Partial<FridgeBatchFormValues>;
  onSubmit: (values: FridgeBatchFormValues) => void;
  isPending?: boolean;
  submitLabel?: string;
  quantityMin?: number;
}

/** 냉장고 배치 폼 (quantity, expiry_date, purchased_date, memo) */
export function FridgeBatchForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = '저장',
  quantityMin = 0,
}: FridgeBatchFormProps) {
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const parseDateValue = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const batchSchema = useMemo(
    () =>
      z.object({
        quantity: z
          .number({ message: ERROR_MSG.FORMAT.INVALID({ fieldName: '수량' }) })
          .refine((value) => Number.isFinite(value), {
            message: ERROR_MSG.FORMAT.INVALID({ fieldName: '수량' }),
          })
          .min(quantityMin, {
            message: ERROR_MSG.RANGE.MIN({ fieldName: '수량', min: quantityMin }),
          }),
        expiry_date: z.string(),
        purchased_date: z.string().min(1, {
          message: ERROR_MSG.INPUT.REQUIRED({ fieldName: '구매일' }),
        }),
        memo: z.string(),
      }),
    [quantityMin],
  );

  const quantitySchema = useMemo(() => batchSchema.shape.quantity, [batchSchema]);

  function validateQuantity(nextQuantity: number) {
    const parseResult = quantitySchema.safeParse(nextQuantity);
    if (parseResult.success) return null;
    return parseResult.error.issues[0]?.message ?? null;
  }

  const form = useForm({
    defaultValues: {
      quantity: defaultValues?.quantity ?? 1,
      expiry_date: defaultValues?.expiry_date ?? '',
      purchased_date: defaultValues?.purchased_date ?? format(new Date(), 'yyyy-MM-dd'),
      memo: defaultValues?.memo ?? '',
    },
    onSubmit: ({ value }) => {
      const parseResult = batchSchema.safeParse(value);
      if (!parseResult.success) {
        const quantityIssue = parseResult.error.issues.find(
          (issue) => issue.path[0] === 'quantity',
        );
        setQuantityError(quantityIssue?.message ?? parseResult.error.issues[0]?.message ?? null);
        return;
      }

      setQuantityError(null);
      onSubmit(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field name="quantity">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">수량</span>
            <Counter
              value={field.state.value}
              min={0}
              step={1}
              onChange={(nextQuantity) => {
                field.handleChange(nextQuantity);
                setQuantityError(validateQuantity(nextQuantity));
              }}
              invalid={Boolean(quantityError)}
            />
            <Message type="error">{quantityError}</Message>
          </label>
        )}
      </form.Field>

      <form.Field name="purchased_date">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">구매일</span>
            <DatePicker
              value={parseDateValue(field.state.value)}
              onChange={(date) =>
                field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
              }
              placeholder="구매일을 선택하세요"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="expiry_date">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">유통기한 (선택)</span>
            <DatePicker
              value={parseDateValue(field.state.value)}
              onChange={(date) => field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')}
              placeholder="유통기한을 선택하세요"
            />
          </label>
        )}
      </form.Field>

      <form.Field name="memo">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">메모 (선택)</span>
            <Textarea
              placeholder="예: 냉동실 보관"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              rows={3}
            />
          </label>
        )}
      </form.Field>

      <Button type="submit" disabled={isPending} className="mt-2">
        {isPending ? '저장 중...' : submitLabel}
      </Button>
    </form>
  );
}
