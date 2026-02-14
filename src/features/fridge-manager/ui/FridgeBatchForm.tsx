'use client';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';

import { Button, Input } from '@/commons/ui';

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
}

/** 냉장고 배치 폼 (quantity, expiry_date, purchased_date, memo) */
export function FridgeBatchForm({
  defaultValues,
  onSubmit,
  isPending,
  submitLabel = '저장',
}: FridgeBatchFormProps) {
  const form = useForm({
    defaultValues: {
      quantity: defaultValues?.quantity ?? 1,
      expiry_date: defaultValues?.expiry_date ?? '',
      purchased_date: defaultValues?.purchased_date ?? format(new Date(), 'yyyy-MM-dd'),
      memo: defaultValues?.memo ?? '',
    },
    onSubmit: ({ value }) => {
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
            <Input
              type="number"
              step="any"
              min="0"
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              required
            />
          </label>
        )}
      </form.Field>

      <form.Field name="purchased_date">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">구매일</span>
            <Input
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              required
            />
          </label>
        )}
      </form.Field>

      <form.Field name="expiry_date">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">유통기한 (선택)</span>
            <Input
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      <form.Field name="memo">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">메모 (선택)</span>
            <Input
              type="text"
              placeholder="예: 냉동실 보관"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
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
