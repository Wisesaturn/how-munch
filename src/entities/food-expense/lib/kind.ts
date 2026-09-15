import {
  DINING_EXPENSE_KIND_EMOJI,
  DINING_EXPENSE_KIND_LABEL,
  isDiningExpenseKind,
} from '@/entities/dining-expense/@x/food-expense';

import { type FoodExpenseFilterKind, type FoodExpenseKind } from '../model/types';

/** 세그먼트 필터에 노출되는 순서 — 전체 / 장보기 / 식당 / 배달 */
export const FOOD_EXPENSE_FILTER_KINDS: FoodExpenseFilterKind[] = [
  'all',
  'grocery',
  'restaurant',
  'delivery',
];

const FOOD_EXPENSE_FILTER_LABEL: Record<FoodExpenseFilterKind, string> = {
  all: '전체',
  grocery: '장보기',
  ...DINING_EXPENSE_KIND_LABEL,
};

/**
 * @description 식비 종류(전체 포함)의 UI 라벨을 반환한다.
 */
export function getFoodExpenseFilterLabel(kind: FoodExpenseFilterKind): string {
  return FOOD_EXPENSE_FILTER_LABEL[kind];
}

/**
 * @description 외식비 항목의 카테고리 슬롯에 넣을 이모지를 반환한다.
 * 장보기는 재료 카테고리 이모지를 쓰므로 여기서는 null을 반환한다.
 */
export function getDiningKindEmoji(kind: FoodExpenseKind): string | null {
  return isDiningExpenseKind(kind) ? DINING_EXPENSE_KIND_EMOJI[kind] : null;
}

/**
 * @description 임의의 문자열을 세그먼트 필터 값으로 좁힌다. 알 수 없는 값은 'all'로 떨어진다.
 */
export function toFoodExpenseFilterKind(value: string): FoodExpenseFilterKind {
  return (FOOD_EXPENSE_FILTER_KINDS as string[]).includes(value)
    ? (value as FoodExpenseFilterKind)
    : 'all';
}
