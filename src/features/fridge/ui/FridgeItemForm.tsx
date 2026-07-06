'use client';

import { useMemo } from 'react';

import { useForm } from '@tanstack/react-form';
import { ChevronRight } from 'lucide-react';
import { z } from 'zod';

import { cn, ERROR_MSG } from '@/commons/lib';
import { Button, Checkbox, Input, Select } from '@/commons/ui';
import { Form } from '@/commons/ui/Form';

import { type IngredientUnit } from '@/entities/ingredient';
import {
  CategoryFormField,
  resolveDefaultCategoryId,
  useIngredientCategoriesQuery,
} from '@/entities/ingredient-category';

export interface FridgeItemFormValues {
  name: string;
  brand: string;
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
  /** 재료명 검색 Screen 진입 핸들러 — 선택값은 form name 필드에 반영된다 */
  onOpenProductNameSearch?: (currentName: string, onSelect: (name: string) => void) => void;
  /** 브랜드 검색 Screen 진입 핸들러 — 선택값은 form brand 필드에 반영된다 */
  onOpenBrandSearch?: (currentBrand: string, onSelect: (brand: string) => void) => void;
}

function createFridgeItemFormSchema(categoryIds: string[]) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '재료명' }))
      .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '재료명', max: '20자' })),
    brand: z.string().max(30, ERROR_MSG.RANGE.MAX({ fieldName: '브랜드', max: '30자' })),
    category_id: z.string().refine((value) => categoryIds.includes(value), {
      message: ERROR_MSG.SELECT.REQUIRED({ fieldName: '카테고리' }),
    }),
    unit: z.enum(['count', 'g', 'kg', 'ml', 'l']),
    is_subdivided: z.boolean(),
  });
}

/** 냉장고 아이템 폼 (name, brand, category, unit, is_subdivided) */
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
  onOpenProductNameSearch,
  onOpenBrandSearch,
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
      brand: defaultValues?.brand ?? '',
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
              {onOpenProductNameSearch ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenProductNameSearch(field.state.value, (name) => field.handleChange(name))
                  }
                  className={cn(
                    'border-input flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm',
                    'hover:bg-accent transition-colors',
                    field.state.meta.errors.length > 0 && 'border-destructive',
                    !field.state.value && 'text-muted-foreground',
                  )}
                >
                  <span>{field.state.value || '재료명을 검색하세요'}</span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </button>
              ) : (
                <Input
                  type="text"
                  placeholder="예: 감자"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="brand">
        {(field) => (
          <Form.Field field={field}>
            <Form.Label>브랜드</Form.Label>
            <Form.Control>
              {onOpenBrandSearch ? (
                <button
                  type="button"
                  onClick={() =>
                    onOpenBrandSearch(field.state.value, (brand) => field.handleChange(brand))
                  }
                  className={cn(
                    'border-input flex h-10 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm',
                    'hover:bg-accent transition-colors',
                    field.state.meta.errors.length > 0 && 'border-destructive',
                    !field.state.value && 'text-muted-foreground',
                  )}
                >
                  <span>{field.state.value || '브랜드를 검색하세요'}</span>
                  <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                </button>
              ) : (
                <Input
                  type="text"
                  placeholder="예: 풀무원"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            </Form.Control>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="category_id">
        {(field) => <CategoryFormField field={field} options={categoryOptions} />}
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
                <Select.Item value="ml">ml</Select.Item>
                <Select.Item value="l">L</Select.Item>
              </Select.Content>
            </Select>
            <Form.Error />
          </Form.Field>
        )}
      </form.Field>

      <form.Field name="is_subdivided">
        {(field) => (
          <label className="flex items-center gap-2">
            <Checkbox
              checked={field.state.value}
              onCheckedChange={(checked) => field.handleChange(checked as boolean)}
            />
            <span className="text-sm">소분 보관</span>
          </label>
        )}
      </form.Field>

      {shouldRenderInlineEditActions && (
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
      )}
      {shouldRenderInlineCreateSubmit && (
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? '저장 중...' : submitLabel}
        </Button>
      )}
    </form>
  );
}
