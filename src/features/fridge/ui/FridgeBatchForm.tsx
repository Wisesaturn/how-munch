'use client';

import { useState } from 'react';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { Button, Checkbox, Counter, DatePicker, Textarea } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  normalizeAmountByUnit,
  resolveAmountMin,
  resolveAmountStep,
  validateAmountPrecisionByUnit,
  type IngredientUnit,
} from '@/entities/ingredient';

import { resolveUnknownPurchasedDate } from '../lib/expiry';

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
  /** 생략하면 단위별 최소 수량을 쓴다 */
  quantityMin?: number;
  quantityMax?: number;
  quantityUnitLabel?: string;
  quantityUnit?: IngredientUnit;
  quantityHint?: string;
  /** 지정하면 읽기 전용 등록 수량을 함께 보여주고 수량 칸은 현재 수량이 된다 */
  initialQuantityLabel?: string;
  /** 지정하면 구매일을 읽기 전용으로 두고 안내 문구를 보여준다 */
  purchasedDateLockedHint?: string;
}

const MAX_BATCH_QUANTITY = 1_000_000;

function parseDateValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function createFridgeBatchSchema(
  quantityMin: number,
  quantityMax: number,
  quantityUnit: IngredientUnit,
  quantityFieldName: string,
) {
  const quantitySchema = z
    .number({ message: ERROR_MSG.FORMAT.INVALID({ fieldName: quantityFieldName }) })
    .refine((value) => Number.isFinite(value), {
      message: ERROR_MSG.FORMAT.INVALID({ fieldName: quantityFieldName }),
    })
    .min(quantityMin, {
      message: ERROR_MSG.RANGE.MIN({ fieldName: quantityFieldName, min: quantityMin }),
    })
    .max(quantityMax, {
      message: ERROR_MSG.RANGE.MAX({
        fieldName: quantityFieldName,
        max: quantityMax === MAX_BATCH_QUANTITY ? '100만' : quantityMax,
      }),
    });

  return z
    .object({
      quantity: quantitySchema,
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
  quantityMin,
  quantityMax = MAX_BATCH_QUANTITY,
  quantityUnitLabel,
  quantityUnit = 'count',
  quantityHint,
  initialQuantityLabel,
  purchasedDateLockedHint,
}: FridgeBatchFormProps) {
  const [isPurchasedDateUnknown, setIsPurchasedDateUnknown] = useState(false);
  const today = new Date();
  const quantityInputMin = quantityMin ?? resolveAmountMin(quantityUnit);
  const quantityFieldName = initialQuantityLabel ? '현재 수량' : '수량';
  const batchSchema = createFridgeBatchSchema(
    quantityInputMin,
    quantityMax,
    quantityUnit,
    quantityFieldName,
  );
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
      {initialQuantityLabel ? (
        <div className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2.5 text-sm">
          <span className="font-medium text-gray-500">등록 수량</span>
          <span className="font-semibold text-gray-700">{initialQuantityLabel}</span>
        </div>
      ) : null}

      <form.Field name="quantity">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>
              {quantityFieldName}
              {quantityUnitLabel ? ` (${quantityUnitLabel})` : ''}
            </Form.Label>
            <Form.Control>
              <Counter
                value={field.state.value}
                min={quantityInputMin}
                max={quantityMax}
                step={quantityInputStep}
                onValueChange={(nextValue) =>
                  field.handleChange(normalizeAmountByUnit(nextValue, quantityUnit))
                }
                invalid={Boolean(field.state.meta.errors[0])}
              />
            </Form.Control>
            {quantityHint ? <p className="text-xs text-gray-500">{quantityHint}</p> : null}
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="purchased_date">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>구매일</Form.Label>
            {purchasedDateLockedHint ? null : (
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-600">
                <Checkbox
                  checked={isPurchasedDateUnknown}
                  onCheckedChange={(checked) => {
                    setIsPurchasedDateUnknown(checked as boolean);
                    if (checked) {
                      field.handleChange(
                        resolveUnknownPurchasedDate(form.state.values.expiry_date),
                      );
                    }
                  }}
                />
                구매일 모름
              </div>
            )}
            <Form.Control>
              <DatePicker
                value={parseDateValue(field.state.value)}
                disabled={isPurchasedDateUnknown || Boolean(purchasedDateLockedHint)}
                maxDate={today}
                onChange={(date) =>
                  field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
                }
                placeholder="구매일을 선택하세요"
              />
            </Form.Control>
            {purchasedDateLockedHint ? (
              <p className="text-xs text-gray-500">{purchasedDateLockedHint}</p>
            ) : null}
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
                onChange={(date) => {
                  const nextExpiry = date ? format(date, 'yyyy-MM-dd') : '';
                  if (isPurchasedDateUnknown) {
                    form.setFieldValue('purchased_date', resolveUnknownPurchasedDate(nextExpiry));
                  }
                  field.handleChange(nextExpiry);
                }}
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
