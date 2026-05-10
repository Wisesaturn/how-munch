import { type Meal } from '@/entities/meal';

import { type EditorDish } from '../lib';

import { addAmount, normalizeAmount } from './amount';

/**
 * @description Meal 엔티티를 식단 에디터의 dishes 폼 상태 구조로 변환합니다.
 */
function toEditorDishes(meal: Meal | null): EditorDish[] {
  if (!meal) return [{ name: '', ingredients: [] }];
  const dishes = Array.isArray(meal.dishes) ? meal.dishes : [];
  if (!dishes.length) return [{ name: '', ingredients: [] }];

  return dishes
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((dish) => ({
      name: dish.name === '[이름 없음]' ? '' : dish.name,
      ingredients: (dish.ingredients ?? []).map((ingredient) => ({
        fridge_item_id: ingredient.fridge_item_id,
        amount: normalizeAmount(Number(ingredient.amount ?? 0)),
        unit: ingredient.fridge_items?.unit ?? undefined,
        usage_status: ingredient.usage_status ?? 'used',
      })),
    }));
}

/**
 * @description dishes 배열에서 재료별 총 사용량 맵을 생성합니다.
 */
function createInUseStockAmountByItemId(dishes: EditorDish[]) {
  return dishes.reduce<Record<string, number>>((accumulator, dish) => {
    dish.ingredients.forEach((ingredient) => {
      if (!ingredient.fridge_item_id) return;
      accumulator[ingredient.fridge_item_id] = addAmount(
        accumulator[ingredient.fridge_item_id] ?? 0,
        ingredient.amount,
      );
    });

    return accumulator;
  }, {});
}

export { createInUseStockAmountByItemId, toEditorDishes };
