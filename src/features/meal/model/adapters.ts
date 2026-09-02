import { type Meal } from '@/entities/meal';

import { type MealFridgeItemOption } from '../api/queries';
import { type EditorDish, type MealFridgeItem } from '../lib';

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
        batch_id: ingredient.batch_id ?? '',
        amount: normalizeAmount(Number(ingredient.amount ?? 0)),
        unit: ingredient.fridge_items?.unit ?? undefined,
        usage_status: ingredient.usage_status ?? 'used',
        orphaned_name: ingredient.is_orphaned
          ? (ingredient.fridge_items?.name ?? '삭제된 재료')
          : undefined,
      })),
    }));
}

/**
 * @description 식단 편집용 재고 조회 결과를 배치(활성·구매일순) 포함 뷰 모델로 변환합니다.
 */
function toMealFridgeItems(options: MealFridgeItemOption[]): MealFridgeItem[] {
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    brand: option.brand,
    total_count: option.total_count,
    unit: option.unit,
    fridge_item_batches: option.fridge_item_batches
      .filter((batch) => batch.deleted_at === null)
      .slice()
      .sort((a, b) => a.purchased_date.localeCompare(b.purchased_date))
      .map((batch) => ({
        id: batch.id,
        purchased_date: batch.purchased_date,
        quantity: Number(batch.quantity),
        expiry_date: batch.expiry_date,
      })),
  }));
}

/**
 * @description dishes 배열에서 배치별 총 사용량 맵을 생성합니다.
 */
function createInUseStockAmountByBatchId(dishes: EditorDish[]) {
  return dishes.reduce<Record<string, number>>((accumulator, dish) => {
    dish.ingredients.forEach((ingredient) => {
      if (!ingredient.batch_id) return;
      accumulator[ingredient.batch_id] = addAmount(
        accumulator[ingredient.batch_id] ?? 0,
        ingredient.amount,
      );
    });

    return accumulator;
  }, {});
}

export { createInUseStockAmountByBatchId, toEditorDishes, toMealFridgeItems };
