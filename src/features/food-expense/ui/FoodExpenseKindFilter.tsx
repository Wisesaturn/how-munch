'use client';

import { SegmentControl } from '@/commons/ui';

import {
  FOOD_EXPENSE_FILTER_KINDS,
  getFoodExpenseFilterLabel,
  toFoodExpenseFilterKind,
  type FoodExpenseFilterKind,
} from '@/entities/food-expense';

interface FoodExpenseKindFilterProps {
  value: FoodExpenseFilterKind;
  onValueChange: (kind: FoodExpenseFilterKind) => void;
  size?: 'sm' | 'md' | 'lg';
}

/** 전체 / 장보기 / 식당 / 배달 세그먼트 필터 */
export function FoodExpenseKindFilter({
  value,
  onValueChange,
  size = 'sm',
}: FoodExpenseKindFilterProps) {
  return (
    <SegmentControl
      size={size}
      value={value}
      onValueChange={(next) => onValueChange(toFoodExpenseFilterKind(next))}
      aria-label="식비 종류 필터"
    >
      {FOOD_EXPENSE_FILTER_KINDS.map((kind) => (
        <SegmentControl.Item key={kind} value={kind}>
          {getFoodExpenseFilterLabel(kind)}
        </SegmentControl.Item>
      ))}
    </SegmentControl>
  );
}
