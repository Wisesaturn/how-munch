'use client';

import { useMemo } from 'react';

import { useForm } from '@tanstack/react-form';
import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';
import { Button, Input, Select } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { type IngredientUnit } from '@/entities/ingredient';
import {
  resolveDefaultCategoryId,
  useIngredientCategoriesQuery,
} from '@/entities/ingredient-category';

export interface FridgeItemFormValues {
  name: string;
  category_id: string;
  unit: IngredientUnit;
  is_subdivided: boolean;
}

interface FridgeItemFormProps {
  id?: string;
  formId?: string;
  defaultValues?: Partial<FridgeItemFormValues>;
  onSubmit: (values: FridgeItemFormValues) => void;
  onDelete?: (id: string) => void;
  isPending?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
  disableUnitSelect?: boolean;
  householdId?: string | null;
}

function createFridgeItemFormSchema(categoryIds: string[]) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '재료명' }))
      .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '재료명', max: '20자' })),
    category_id: z.string().refine((value) => categoryIds.includes(value), {
      message: ERROR_MSG.SELECT.REQUIRED({ fieldName: '카테고리' }),
    }),
    unit: z.enum(['count', 'g', 'kg']),
    is_subdivided: z.boolean(),
  });
}

/** 냉장고 아이템 폼 (name, category, unit, is_subdivided) */
export function FridgeItemForm({
  id,
  formId,
  defaultValues,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  submitLabel = '저장',
  disableUnitSelect = false,
  householdId = null,
}: FridgeItemFormProps) {
  const { data: categoryOptions = [] } = useIngredientCategoriesQuery(householdId);
  const categoryIds = useMemo(
    () => categoryOptions.map((category) => category.id),
    [categoryOptions],
  );
  const fridgeItemFormSchema = useMemo(
    () => createFridgeItemFormSchema(categoryIds),
    [categoryIds],
  );
  const defaultCategoryId = useMemo(
    () => resolveDefaultCategoryId(categoryOptions, defaultValues?.category_id),
    [categoryOptions, defaultValues?.category_id],
  );
  const form = useForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      category_id: defaultCategoryId,
      unit: defaultValues?.unit ?? ('count' as const),
      is_subdivided: defaultValues?.is_subdivided ?? false,
    },
    validators: {
      onSubmit: fridgeItemFormSchema,
      onChange: fridgeItemFormSchema,
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
      <form.Field name="name">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>재료명</Form.Label>
            <Form.Control>
              <Input
                type="text"
                placeholder="예: 감자"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="category_id">
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
                {categoryOptions.map((cat) => (
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

      <form.Field name="unit">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label required>단위</Form.Label>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as IngredientUnit)}
              disabled={disableUnitSelect}
            >
              <Form.Control>
                <Select.Trigger>
                  <Select.Value placeholder="단위를 선택하세요" />
                </Select.Trigger>
              </Form.Control>
              <Select.Content>
                <Select.Item value="count">개</Select.Item>
                <Select.Item value="g">g</Select.Item>
                <Select.Item value="kg">kg</Select.Item>
              </Select.Content>
            </Select>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="is_subdivided">
        {(field) => (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={field.state.value}
              onChange={(e) => field.handleChange(e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <span className="text-sm">소분 보관</span>
          </label>
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
