'use client';

import { useForm } from '@tanstack/react-form';
import { format } from 'date-fns';

import { CATEGORIES } from '@/commons/config';
import { Button, ComboBox, Counter, DatePicker, Input, PriceInput, Select } from '@/commons/ui';

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

  const parseDateValue = (value: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">날짜</span>
            <DatePicker
              value={parseDateValue(field.state.value)}
              onChange={(date) =>
                field.handleChange(date ? format(date, 'yyyy-MM-dd') : field.state.value)
              }
              maxDate={today}
              placeholder="날짜를 선택하세요"
            />
          </label>
        )}
      </form.Field>

      {/* 카테고리 */}
      <form.Field name="category">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">카테고리</span>
            <Select value={field.state.value} onValueChange={field.handleChange}>
              <Select.Trigger>
                <Select.Value placeholder="카테고리를 선택하세요" />
              </Select.Trigger>
              <Select.Content>
                {CATEGORIES.map((cat) => (
                  <Select.Item key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </Select.Item>
                ))}
              </Select.Content>
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
              <Counter value={field.state.value} min={0} step={1} onChange={field.handleChange} />
            </label>
          )}
        </form.Field>
        <form.Field name="unit">
          {(field) => (
            <label className="flex w-24 flex-col gap-1">
              <span className="text-xs font-medium text-gray-600">단위</span>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value as 'count' | 'g')}
              >
                <Select.Trigger>
                  <Select.Value placeholder="단위" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="count">개</Select.Item>
                  <Select.Item value="g">g</Select.Item>
                </Select.Content>
              </Select>
            </label>
          )}
        </form.Field>
      </div>

      {/* 구매처 */}
      <form.Field name="store">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">구매처</span>
            <ComboBox value={field.state.value} onValueChange={field.handleChange}>
              <ComboBox.Input placeholder="구매처를 입력하거나 선택하세요" />
              <ComboBox.List>
                <ComboBox.Empty>검색 결과가 없습니다</ComboBox.Empty>
                {storeNames.map((name) => (
                  <ComboBox.Item key={name} value={name}>
                    {name}
                  </ComboBox.Item>
                ))}
              </ComboBox.List>
            </ComboBox>
          </label>
        )}
      </form.Field>

      {/* 가격 */}
      <form.Field name="price">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">가격</span>
            <PriceInput value={field.state.value} onChange={field.handleChange} />
          </label>
        )}
      </form.Field>

      {isEditMode && (
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
      )}
    </form>
  );
}
