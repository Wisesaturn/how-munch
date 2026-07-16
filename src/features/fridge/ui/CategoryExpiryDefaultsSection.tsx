'use client';

import { useMemo, useState } from 'react';

import { ChevronRight } from 'lucide-react';

import { Card, SingleSelectBottomSheet, type SingleSelectBottomSheetItem } from '@/commons/ui';

import { useIngredientCategoriesQuery } from '@/entities/ingredient-category';

import { useUpsertCategoryExpiryDefaultMutation } from '../api/mutations';
import { useCategoryExpiryDefaultsQuery } from '../api/queries';

const NONE_VALUE = 'none';
const MIN_DAYS = 1;
const MAX_DAYS = 180;

const DAY_ITEMS: SingleSelectBottomSheetItem[] = [
  { value: NONE_VALUE, label: '설정 안 함' },
  ...Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, index) => {
    const day = MIN_DAYS + index;
    return { value: String(day), label: `${day}일` };
  }),
];

interface CategoryExpiryDefaultsSectionProps {
  householdId: string;
}

/** 카테고리별 기본 유효기간 설정 섹션 (가구 공유) */
export function CategoryExpiryDefaultsSection({ householdId }: CategoryExpiryDefaultsSectionProps) {
  const { data: categories = [] } = useIngredientCategoriesQuery(householdId);
  const { data: defaults = {} } = useCategoryExpiryDefaultsQuery(householdId);
  const upsertMutation = useUpsertCategoryExpiryDefaultMutation();

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [sheetValue, setSheetValue] = useState<string>(NONE_VALUE);

  const editingCategory = useMemo(
    () => categories.find((category) => category.id === editingCategoryId) ?? null,
    [categories, editingCategoryId],
  );

  function openEditor(categoryId: string) {
    const currentDays = defaults[categoryId];
    setSheetValue(currentDays !== undefined ? String(currentDays) : NONE_VALUE);
    setEditingCategoryId(categoryId);
  }

  function closeEditor() {
    setEditingCategoryId(null);
  }

  function applyValue(nextValue: string) {
    if (!editingCategoryId) return;
    const days = nextValue === NONE_VALUE ? null : Number(nextValue);
    upsertMutation.mutate({ householdId, categoryId: editingCategoryId, days });
  }

  return (
    <section className="space-y-2">
      <div className="px-1">
        <p className="text-sm font-medium text-gray-900">카테고리별 기본 유효기간</p>
        <p className="text-xs text-gray-500">
          새 재고 등록 시 구매일 기준으로 유통기한이 자동 입력됩니다
        </p>
      </div>
      <Card>
        <Card.Content className="p-0">
          <ul className="divide-y divide-gray-100">
            {categories.map((category) => {
              const days = defaults[category.id];
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => openEditor(category.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-sm text-gray-900">
                      {category.emoji ? (
                        <span className="font-tossface" aria-hidden>
                          {category.emoji}
                        </span>
                      ) : null}
                      {category.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      {days !== undefined ? `${days}일` : '설정 안 함'}
                      <ChevronRight className="size-4 text-gray-400" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card.Content>
      </Card>

      <SingleSelectBottomSheet
        open={editingCategoryId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeEditor();
        }}
        value={sheetValue}
        onValueChange={applyValue}
        items={DAY_ITEMS}
        heading={editingCategory ? `${editingCategory.label} 기본 유효기간` : '기본 유효기간'}
        confirmLabel="확인"
      />
    </section>
  );
}
