'use client';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { CATEGORIES } from '@/commons/config';
import { Button, ComboBox, Counter, DatePicker, Input, PriceInput, Select } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { convertIngredientAmount, isWeightUnit, type IngredientUnit } from '@/entities/ingredient';

export interface IngredientFormValues {
  date: string;
  category: string;
  name: string;
  count: number;
  unit: IngredientUnit;
  store: string;
  price: number;
}

interface IngredientFormProps {
  id?: string;
  formId?: string;
  defaultValues?: Partial<IngredientFormValues>;
  storeNames?: string[];
  onSubmit: (values: IngredientFormValues) => void;
  onDelete?: (id: string) => void;
  isSubmitting?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
}

const CATEGORY_IDS: string[] = CATEGORIES.map((category) => category.id);

const ingredientFormSchema = z.object({
  date: z
    .string()
    .min(1, ERROR_MSG.SELECT.REQUIRED({ fieldName: '날짜' }))
    .regex(/^\d{4}-\d{2}-\d{2}$/, ERROR_MSG.FORMAT.INVALID({ fieldName: '날짜' })),
  category: z.string().refine((value) => CATEGORY_IDS.includes(value), {
    message: ERROR_MSG.SELECT.REQUIRED({ fieldName: '카테고리' }),
  }),
  name: z
    .string()
    .trim()
    .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '품목명' }))
    .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '품목명', max: '20자' })),
  count: z
    .number()
    .min(1, ERROR_MSG.RANGE.MIN({ fieldName: '수량', min: 1 }))
    .max(1_000_000, ERROR_MSG.RANGE.MAX({ fieldName: '수량', max: '100만' })),
  unit: z.enum(['count', 'g', 'kg']),
  store: z.string().max(20, ERROR_MSG.RANGE.MAX({ fieldName: '구매처', max: '20자' })),
  price: z
    .number()
    .min(100, ERROR_MSG.RANGE.MIN({ fieldName: '가격', min: '100원' }))
    .max(100_000_000, ERROR_MSG.RANGE.MAX({ fieldName: '가격', max: '1억원' })),
});

function parseDateValue(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function IngredientForm({
  id,
  formId,
  defaultValues,
  storeNames = [],
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
  submitLabel,
}: IngredientFormProps) {
  const today = new Date();
  const form = useForm({
    defaultValues: {
      date: defaultValues?.date ?? format(new Date(), 'yyyy-MM-dd'),
      category: defaultValues?.category ?? 'other',
      name: defaultValues?.name ?? '',
      count: defaultValues?.count ?? 1,
      unit: (defaultValues?.unit ?? 'count') as IngredientUnit,
      store: defaultValues?.store ?? '',
      price: defaultValues?.price ?? 100,
    },
    validators: {
      onSubmit: ingredientFormSchema,
      onChange: ingredientFormSchema,
    },
    onSubmit: async ({ value }) => {
      onSubmit(value);
    },
  });

  const isEditMode = Boolean(id);

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      {/* 날짜 */}
      <form.Field name="date">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>날짜</Form.Label>
            <Form.Control>
              <DatePicker
                value={parseDateValue(field.state.value)}
                onChange={(date) =>
                  field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
                }
                maxDate={today}
                placeholder="날짜를 선택하세요"
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {/* 카테고리 */}
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
                {CATEGORIES.map((cat) => (
                  <Select.Item key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {/* 품목명 */}
      <form.Field name="name">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>품목명</Form.Label>
            <Form.Control>
              <Input
                placeholder="예: 삼겹살"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {/* 수량 + 단위 */}
      <div className="grid gap-1.5">
        <div className="flex gap-2">
          <form.Field name="count">
            {(field) => (
              <Form.Field field={field} className="flex-1">
                <Form.Label required>수량</Form.Label>
                <Form.Control>
                  <Counter
                    value={field.state.value}
                    min={0}
                    step={1}
                    onChange={field.handleChange}
                    invalid={Boolean(field.state.meta.errors[0])}
                  />
                </Form.Control>
              </Form.Field>
            )}
          </form.Field>
          <form.Field name="unit">
            {(field) => (
              <Form.Field field={field} className="w-24">
                <Form.Label required>단위</Form.Label>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => {
                    const nextUnit = value as IngredientUnit;
                    const currentUnit = field.state.value;
                    const currentCount = form.state.values.count;
                    const convertedCount = convertIngredientAmount(
                      currentCount,
                      currentUnit,
                      nextUnit,
                    );

                    field.handleChange(nextUnit);
                    if (convertedCount !== null) {
                      form.setFieldValue('count', Number(convertedCount.toFixed(2)));
                      return;
                    }

                    if (isWeightUnit(currentUnit) || isWeightUnit(nextUnit)) {
                      form.setFieldValue('count', 1);
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
        <form.Field name="count">
          {(field) => (
            <Form.Field field={field}>
              <Form.Error />
            </Form.Field>
          )}
        </form.Field>
      </div>

      {/* 구매처 */}
      <form.Field name="store">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label>구매처</Form.Label>
            <ComboBox value={field.state.value} onValueChange={field.handleChange}>
              <Form.Control>
                <ComboBox.Input placeholder="구매처를 입력하거나 선택하세요" />
              </Form.Control>
              <ComboBox.List>
                <ComboBox.Empty>검색 결과가 없습니다</ComboBox.Empty>
                {storeNames.map((name) => (
                  <ComboBox.Item key={name} value={name}>
                    {name}
                  </ComboBox.Item>
                ))}
              </ComboBox.List>
            </ComboBox>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {/* 가격 */}
      <form.Field name="price">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>가격</Form.Label>
            <Form.Control>
              <PriceInput value={field.state.value} onChange={field.handleChange} />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      {isEditMode && onDelete ? (
        <div className="mt-2 flex gap-2">
          <Button type="submit" className="flex-1" disabled={Boolean(isSubmitting || isDeleting)}>
            {isSubmitting ? '수정 중...' : (submitLabel ?? '수정')}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 text-red-600 hover:text-red-700"
            disabled={Boolean(isSubmitting || isDeleting)}
            onClick={() => {
              if (!id || !onDelete) return;
              onDelete(id);
            }}
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
