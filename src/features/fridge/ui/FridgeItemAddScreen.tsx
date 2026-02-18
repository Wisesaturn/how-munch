'use client';

import { useMemo, useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { CATEGORIES } from '@/commons/config';
import {
  Button,
  Counter,
  DatePicker,
  Input,
  Select,
  Separator,
  Textarea,
  Toast,
} from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import {
  convertIngredientAmount,
  isWeightUnit,
  normalizeAmountByUnit,
  resolveAmountMin,
  resolveAmountStep,
  validateAmountPrecisionByUnit,
  type IngredientUnit,
} from '@/entities/ingredient';
import { useIngredientCategoriesQuery } from '@/entities/ingredient-category';

import { useAddFridgeItemMutation } from '../api/mutations';

interface FridgeItemAddScreenProps {
  onClose: () => void;
  householdId: string;
}

interface FridgeItemCreateFormValues {
  category: string;
  name: string;
  quantity: number;
  unit: IngredientUnit;
  is_subdivided: boolean;
  purchased_date: string;
  expiry_date: string;
  memo: string;
}

function createFridgeItemCreateFormSchema(categoryIds: string[]) {
  return z
    .object({
      category: z.string().refine((value) => categoryIds.includes(value), {
        message: ERROR_MSG.SELECT.REQUIRED({ fieldName: '카테고리' }),
      }),
      name: z
        .string()
        .trim()
        .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '재료명' }))
        .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '재료명', max: '20자' })),
      quantity: z.number().max(1_000_000, ERROR_MSG.RANGE.MAX({ fieldName: '수량', max: '100만' })),
      unit: z.enum(['count', 'g', 'kg']),
      is_subdivided: z.boolean(),
      purchased_date: z
        .string()
        .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '구매일' }))
        .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MSG.FORMAT.INVALID({ fieldName: '구매일' })),
      expiry_date: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), {
        message: ERROR_MSG.FORMAT.INVALID({ fieldName: '유통기한' }),
      }),
      memo: z.string().max(300, ERROR_MSG.RANGE.MAX({ fieldName: '메모', max: '300자' })),
    })
    .superRefine((value, ctx) => {
      const minQuantity = resolveAmountMin(value.unit);

      if (value.quantity < minQuantity) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message: ERROR_MSG.RANGE.MIN({ fieldName: '수량', min: minQuantity }),
        });
      }

      if (!validateAmountPrecisionByUnit(value.quantity, value.unit)) {
        ctx.addIssue({
          code: 'custom',
          path: ['quantity'],
          message:
            value.unit === 'kg'
              ? '수량은 소수점 첫째 자리까지 입력할 수 있습니다'
              : '수량은 정수만 입력할 수 있습니다',
        });
      }
    });
}

function parseDateValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return '재료 추가 중 오류가 발생했습니다';
}

function createDefaultValues(today: Date): FridgeItemCreateFormValues {
  return {
    category: 'other',
    name: '',
    quantity: 1,
    unit: 'count',
    is_subdivided: false,
    purchased_date: format(today, 'yyyy-MM-dd'),
    expiry_date: '',
    memo: '',
  };
}

/** 냉장고 아이템 + 첫 배치 동시 추가 화면 */
export function FridgeItemAddScreen({ onClose, householdId }: FridgeItemAddScreenProps) {
  const [isPurchasedDateUnknown, setIsPurchasedDateUnknown] = useState(false);
  const mutation = useAddFridgeItemMutation();
  const { data: categoryOptions = CATEGORIES } = useIngredientCategoriesQuery(householdId);
  const categoryIds = useMemo(
    () => categoryOptions.map((category) => category.id),
    [categoryOptions],
  );
  const fridgeItemCreateFormSchema = useMemo(
    () => createFridgeItemCreateFormSchema(categoryIds),
    [categoryIds],
  );

  const today = new Date();
  const defaultValues = createDefaultValues(today);
  const [selectedUnit, setSelectedUnit] = useState<IngredientUnit>(defaultValues.unit);

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: fridgeItemCreateFormSchema,
      onChange: fridgeItemCreateFormSchema,
    },
    onSubmit: ({ value }) => {
      const normalizedName = value.name.trim();

      mutation.mutate(
        {
          item: {
            household_id: householdId,
            name: normalizedName,
            category: value.category,
            unit: value.unit,
            is_subdivided: value.is_subdivided,
          },
          batch: {
            quantity: value.quantity,
            purchased_date: isPurchasedDateUnknown
              ? format(today, 'yyyy-MM-dd')
              : value.purchased_date,
            expiry_date: value.expiry_date || null,
            memo: value.memo.trim() || null,
          },
        },
        {
          onSuccess: () => {
            Toast.success('재료가 추가되었습니다');
            onClose();
          },
          onError: (error) => {
            Toast.error(getErrorMessage(error));
          },
        },
      );
    },
  });
  const quantityStep = resolveAmountStep(selectedUnit);
  const quantityMin = resolveAmountMin(selectedUnit);

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: '재료 추가',
        renderRight: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => form.handleSubmit()}
            disabled={mutation.isPending}
            aria-label="재료 추가"
          >
            {mutation.isPending ? '추가 중...' : '추가'}
          </Button>
        ),
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-5 p-4"
      >
        {/* 기본 정보 */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold text-gray-500">기본 정보</legend>

          <form.Field name="category">
            {(field) => (
              <Form.Field field={field}>
                <Form.Label required>카테고리</Form.Label>
                <Select value={field.state.value} onValueChange={field.handleChange}>
                  <Form.Control>
                    <Select.Trigger>
                      <Select.Value placeholder="카테고리를 선택하세요" />
                    </Select.Trigger>
                  </Form.Control>
                  <Select.Content>
                    {categoryOptions.map((category) => (
                      <Select.Item key={category.id} value={category.id}>
                        {category.emoji} {category.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                <Form.Error />
              </Form.Field>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <Form.Field field={field}>
                <Form.Label required>재료명</Form.Label>
                <Form.Control>
                  <Input
                    type="text"
                    placeholder="예: 감자"
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                </Form.Control>
                <Form.Error />
              </Form.Field>
            )}
          </form.Field>

          <div className="grid gap-1.5">
            <div className="grid grid-cols-[1fr_104px] items-start gap-2">
              <form.Field name="quantity">
                {(field) => (
                  <Form.Field field={field}>
                    <Form.Label required>수량</Form.Label>
                    <Form.Control>
                      <Counter
                        key={`fridge-quantity-${selectedUnit}`}
                        value={field.state.value}
                        min={quantityMin}
                        step={quantityStep}
                        onValueChange={(nextValue) =>
                          field.handleChange(normalizeAmountByUnit(nextValue, selectedUnit))
                        }
                        invalid={Boolean(field.state.meta.errors[0])}
                      />
                    </Form.Control>
                  </Form.Field>
                )}
              </form.Field>

              <form.Field name="unit">
                {(field) => (
                  <Form.Field field={field}>
                    <Form.Label required>단위</Form.Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        const nextUnit = value as IngredientUnit;
                        const currentUnit = field.state.value;
                        const currentQuantity = form.state.values.quantity;
                        const convertedQuantity = convertIngredientAmount(
                          currentQuantity,
                          currentUnit,
                          nextUnit,
                        );

                        field.handleChange(nextUnit);
                        setSelectedUnit(nextUnit);
                        if (convertedQuantity !== null) {
                          form.setFieldValue(
                            'quantity',
                            normalizeAmountByUnit(convertedQuantity, nextUnit),
                          );
                          return;
                        }

                        if (isWeightUnit(currentUnit) || isWeightUnit(nextUnit)) {
                          form.setFieldValue('quantity', resolveAmountMin(nextUnit));
                        }
                      }}
                    >
                      <Form.Control>
                        <Select.Trigger>
                          <Select.Value placeholder="단위" />
                        </Select.Trigger>
                      </Form.Control>
                      <Select.Content>
                        <Select.Item value="count">개</Select.Item>
                        <Select.Item value="g">g</Select.Item>
                        <Select.Item value="kg">kg</Select.Item>
                      </Select.Content>
                    </Select>
                  </Form.Field>
                )}
              </form.Field>
            </div>
            <form.Field name="quantity">
              {(field) => (
                <Form.Field field={field}>
                  <Form.Error />
                </Form.Field>
              )}
            </form.Field>
          </div>

          <form.Field name="is_subdivided">
            {(field) => (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(event) => field.handleChange(event.target.checked)}
                  className="size-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">소분 보관 여부</span>
              </label>
            )}
          </form.Field>
        </fieldset>

        <Separator />

        {/* 날짜 정보 */}
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-xs font-semibold text-gray-500">날짜 정보</legend>

          <form.Field name="purchased_date">
            {(field) => (
              <Form.Field field={field}>
                <Form.Label required>구매일</Form.Label>
                <label className="mb-1 flex items-center gap-2 text-xs text-gray-600">
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
                </label>
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
        </fieldset>

        <Separator />

        {/* 추가 정보 */}
        <form.Field name="memo">
          {(field) => (
            <Form.Field field={field}>
              <Form.Label>메모</Form.Label>
              <Form.Control>
                <Textarea
                  placeholder="예: 냉동실 보관"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  rows={3}
                />
              </Form.Control>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>
      </form>
    </AppScreen>
  );
}
