'use client';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';

import { CATEGORIES } from '@/commons/config';
import { Button, Input, Select } from '@/commons/ui';

export interface IngredientFormValues {
  date: string;
  category: string;
  name: string;
  count: number;
  unit: 'count' | 'g';
  store: string;
  price: number;
}

interface IngredientFormProps {
  defaultValues?: Partial<IngredientFormValues>;
  storeNames?: string[];
  onSubmit: (values: IngredientFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function IngredientForm({
  defaultValues,
  storeNames = [],
  onSubmit,
  isSubmitting,
  submitLabel = '저장',
}: IngredientFormProps) {
  const form = useForm({
    defaultValues: {
      date: defaultValues?.date ?? format(new Date(), 'yyyy-MM-dd'),
      category: defaultValues?.category ?? 'other',
      name: defaultValues?.name ?? '',
      count: defaultValues?.count ?? 1,
      unit: (defaultValues?.unit ?? 'count') as 'count' | 'g',
      store: defaultValues?.store ?? '',
      price: defaultValues?.price ?? 0,
    },
    onSubmit: async ({ value }) => {
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
      className="flex flex-col gap-4 p-4"
    >
      {/* 날짜 */}
      <form.Field name="date">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">날짜</span>
            <Input
              type="date"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      {/* 카테고리 */}
      <form.Field name="category">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">카테고리</span>
            <Select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </Select>
          </label>
        )}
      </form.Field>

      {/* 품목명 */}
      <form.Field name="name">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">품목명</span>
            <Input
              placeholder="예: 삼겹살"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </label>
        )}
      </form.Field>

      {/* 수량 + 단위 */}
      <div className="flex gap-2">
        <form.Field name="count">
          {(field) => (
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">수량</span>
              <Input
                type="number"
                step="any"
                min={0}
                value={field.state.value}
                onChange={(e) => field.handleChange(Number(e.target.value))}
              />
            </label>
          )}
        </form.Field>
        <form.Field name="unit">
          {(field) => (
            <label className="flex w-24 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">단위</span>
              <Select
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as 'count' | 'g')}
              >
                <option value="count">개</option>
                <option value="g">g</option>
              </Select>
            </label>
          )}
        </form.Field>
      </div>

      {/* 구매처 (자동완성) */}
      <form.Field name="store">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">구매처</span>
            <Input
              list="store-list"
              placeholder="예: 이마트, 쿠팡"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <datalist id="store-list">
              {storeNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
        )}
      </form.Field>

      {/* 가격 */}
      <form.Field name="price">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">가격 (원)</span>
            <Input
              type="number"
              min={0}
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
            />
          </label>
        )}
      </form.Field>

      {/* 저장 버튼 */}
      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? '저장 중...' : submitLabel}
      </Button>
    </form>
  );
}
