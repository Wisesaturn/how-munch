import { type Meal } from '@/entities/meal';

import { type EditorDish } from '../lib';

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
        amount: Number(ingredient.amount),
      })),
    }));
}

export { toEditorDishes };
