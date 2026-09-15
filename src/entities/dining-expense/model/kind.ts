import { type DiningExpenseKind } from './types';

/** 외식비 종류별 UI 라벨 */
export const DINING_EXPENSE_KIND_LABEL: Record<DiningExpenseKind, string> = {
  restaurant: '식당',
  delivery: '배달',
};

/** 외식비 종류별 이모지 — 리스트 카드의 카테고리 슬롯에 들어간다 */
export const DINING_EXPENSE_KIND_EMOJI: Record<DiningExpenseKind, string> = {
  restaurant: '🍽️',
  delivery: '🛵',
};

/**
 * @description 임의의 문자열이 외식비 종류인지 판별한다.
 * 식비 통합 뷰의 kind는 grocery까지 포함하므로 좁히는 데 쓴다.
 */
export function isDiningExpenseKind(value: string): value is DiningExpenseKind {
  return value === 'restaurant' || value === 'delivery';
}
