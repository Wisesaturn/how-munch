'use client';

import { useForm } from '@tanstack/react-form';

import { CATEGORIES } from '@/commons/config';
import { Button, Input, Select } from '@/commons/ui';

export interface FridgeItemFormValues {
  name: string;
  category: string;
  unit: 'count' | 'g';
  is_subdivided: boolean;
}

interface FridgeItemFormProps {
  id?: string;
  defaultValues?: Partial<FridgeItemFormValues>;
  onSubmit: (values: FridgeItemFormValues) => void;
  onDelete?: (id: string) => void;
  isPending?: boolean;
  isDeleting?: boolean;
  submitLabel?: string;
}

/** 냉장고 아이템 폼 (name, category, unit, is_subdivided) */
export function FridgeItemForm({
  id,
  defaultValues,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
  submitLabel = '저장',
}: FridgeItemFormProps) {
  const form = useForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      category: defaultValues?.category ?? 'other',
      unit: defaultValues?.unit ?? ('count' as const),
      is_subdivided: defaultValues?.is_subdivided ?? false,
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
      <form.Field name="name">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">재료명</span>
            <Input
              type="text"
              placeholder="예: 감자"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              required
            />
          </label>
        )}
      </form.Field>

      <form.Field name="category">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">카테고리</span>
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

      <form.Field name="unit">
        {(field) => (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">단위</span>
            <Select
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value as 'count' | 'g')}
            >
              <Select.Trigger>
                <Select.Value placeholder="단위를 선택하세요" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="count">개</Select.Item>
                <Select.Item value="g">g</Select.Item>
              </Select.Content>
            </Select>
          </label>
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

      {id ? (
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
      ) : (
        <Button type="submit" disabled={isPending} className="mt-2">
          {isPending ? '저장 중...' : submitLabel}
        </Button>
      )}
    </form>
  );
}
