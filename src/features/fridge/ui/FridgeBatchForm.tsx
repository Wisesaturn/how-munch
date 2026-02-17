'use client';

import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { Button, Counter, DatePicker, Textarea } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  normalizeAmountByUnit,
  resolveAmountMin,
  resolveAmountStep,
  validateAmountPrecisionByUnit,
  type IngredientUnit,
} from '@/entities/ingredient';

export interface FridgeBatchFormValues {
  quantity: number;
  expiry_date: string;
  purchased_date: string;
  memo: string;
}

interface FridgeBatchFormProps {
  id?: string;
  formId?: string;
  defaultValues?: Partial<FridgeBatchFormValues>;
  onSubmit: (values: FridgeBatchFormValues) => void;
  onDelete?: (id: string) => void;
  isPending?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
  quantityMin?: number;
  quantityUnitLabel?: string;
  quantityUnit?: IngredientUnit;
  disableQuantityEdit?: boolean;
}

function parseDateValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function createFridgeBatchSchema(quantityMin: number, quantityUnit: IngredientUnit) {
  const minQuantity = Math.max(quantityMin, resolveAmountMin(quantityUnit));

  return z
    .object({
      quantity: z
        .number({ message: ERROR_MSG.FORMAT.INVALID({ fieldName: '수량' }) })
        .refine((value) => Number.isFinite(value), {
          message: ERROR_MSG.FORMAT.INVALID({ fieldName: '수량' }),
        })
        .min(minQuantity, {
          message: ERROR_MSG.RANGE.MIN({ fieldName: '수량', min: minQuantity }),
        })
        .max(1_000_000, {
          message: ERROR_MSG.RANGE.MAX({ fieldName: '수량', max: '100만' }),
        }),
      expiry_date: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: ERROR_MSG.FORMAT.INVALID({ fieldName: '유통기한' }),
      }),
      purchased_date: z
        .string()
        .min(1, {
          message: ERROR_MSG.INPUT.REQUIRED({ fieldName: '구매일' }),
        })
        .regex(/^\d{4}-\d{2}-\d{2}$/, {
          message: ERROR_MSG.FORMAT.INVALID({ fieldName: '구매일' }),
        }),
      memo: z.string().max(300, {
        message: ERROR_MSG.RANGE.MAX({ fieldName: '메모', max: 300 }),
      }),
    })
    .superRefine((value, ctx) => {
      if (!validateAmountPrecisionByUnit(value.quantity, quantityUnit)) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message:
            quantityUnit === 'kg'
              ? '수량은 소수점 첫째 자리까지 입력할 수 있습니다'
              : '수량은 정수만 입력할 수 있습니다',
        });
      }
    });
}

/** 냉장고 배치 폼 (quantity, expiry_date, purchased_date, memo) */
export function FridgeBatchForm({
  id,
  formId,
  defaultValues,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  submitLabel = '저장',
  quantityMin = 0,
  quantityUnitLabel,
  quantityUnit = 'count',
  disableQuantityEdit = false,
}: FridgeBatchFormProps) {
  const [isPurchasedDateUnknown, setIsPurchasedDateUnknown] = useState(false);
  const today = new Date();
  const batchSchema = createFridgeBatchSchema(quantityMin, quantityUnit);
  const quantityInputMin = Math.max(quantityMin, resolveAmountMin(quantityUnit));
  const quantityInputStep = resolveAmountStep(quantityUnit);

  const form = useForm({
    defaultValues: {
      quantity: defaultValues?.quantity ?? 1,
      expiry_date: defaultValues?.expiry_date ?? '',
      purchased_date: defaultValues?.purchased_date ?? format(new Date(), 'yyyy-MM-dd'),
      memo: defaultValues?.memo ?? '',
    },
    validators: {
      onSubmit: batchSchema,
      onChange: batchSchema,
    },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });
  const shouldRenderInlineEditActions = Boolean(id && onDelete);
  const shouldRenderInlineCreateSubmit = !id;

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field name="quantity">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>
              수량{quantityUnitLabel ? ` (${quantityUnitLabel})` : ''}
            </Form.Label>
            <Form.Control>
              <Counter
                value={field.state.value}
                min={quantityInputMin}
                step={quantityInputStep}
                disabled={disableQuantityEdit}
                onValueChange={(nextValue) =>
                  field.handleChange(normalizeAmountByUnit(nextValue, quantityUnit))
                }
                invalid={Boolean(field.state.meta.errors[0])}
              />
            </Form.Control>
            {disableQuantityEdit ? (
              <p className="text-xs text-gray-500">
                장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.
              </p>
            ) : null}
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="purchased_date">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>구매일</Form.Label>
            <div className="mb-1 flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={isPurchasedDateUnknown}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setIsPurchasedDateUnknown(checked);
                  if (checked) {
                    field.handleChange(format(today, 'yyyy-MM-dd'));
                  }
                }}
                className="size-4 rounded border-gray-300"
              />
              구매일 모름
            </div>
            <Form.Control>
              <DatePicker
                value={parseDateValue(field.state.value)}
                disabled={isPurchasedDateUnknown}
                maxDate={today}
                onChange={(date) =>
                  field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
                }
                placeholder="구매일을 선택하세요"
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="expiry_date">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label>유통기한</Form.Label>
            <Form.Control>
              <DatePicker
                value={parseDateValue(field.state.value)}
                onChange={(date) => field.handleChange(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="유통기한을 선택하세요"
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="memo">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label>메모</Form.Label>
            <Form.Control>
              <Textarea
                placeholder="예: 냉동실 보관"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                rows={3}
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {shouldRenderInlineEditActions ? (
        <div className="mt-2 flex gap-2">
          <Button type="submit" disabled={Boolean(isPending || isDeleting)} className="flex-1">
            {isPending ? '수정 중...' : '수정'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-red-600 hover:text-red-700"
            disabled={Boolean(isPending || isDeleting)}
            onClick={() => {
              if (!id || !onDelete) return;
              onDelete(id);
            }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      ) : shouldRenderInlineCreateSubmit ? (
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? '저장 중...' : submitLabel}
        </Button>
      ) : null}
    </form>
  );
}
