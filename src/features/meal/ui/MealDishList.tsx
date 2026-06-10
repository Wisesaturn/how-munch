'use client';

import { useIngredientCategory } from '@/entities/ingredient-category';
import { type Dish } from '@/entities/meal';

/* -------------------------------------------------------------------------------------------------
 * Helpers
 * -----------------------------------------------------------------------------------------------*/

interface IngredientPreviewEntry {
  id: string;
  name: string;
  emoji?: string;
}

function buildIngredientPreview(
  dish: Dish,
  getCategoryById: (id: string) => { emoji: string } | null,
): IngredientPreviewEntry[] {
  return dish.ingredients.flatMap((ingredient) => {
    const fridgeItem = ingredient.fridge_items;
    if (!fridgeItem) return [];
    return [
      {
        id: ingredient.id,
        name: fridgeItem.name,
        emoji: getCategoryById(fridgeItem.category_id)?.emoji,
      },
    ];
  });
}

/* -------------------------------------------------------------------------------------------------
 * MealDishList
 * -----------------------------------------------------------------------------------------------*/

interface MealDishListProps {
  householdId: string;
  dishes: Dish[];
}

/** 식단 카드 본문의 메뉴 목록 — 메뉴명과 재료(카테고리 이모지·이름) 미리보기를 표시한다 */
export function MealDishList({ householdId, dishes }: MealDishListProps) {
  const { getCategoryById } = useIngredientCategory(householdId);

  return (
    <ul className="space-y-2">
      {dishes.map((dish) => {
        const ingredientPreview = buildIngredientPreview(dish, getCategoryById);

        return (
          <li key={dish.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
            <p className="font-medium">{dish.name}</p>
            {ingredientPreview.length > 0 && (
              <p className="mt-1 truncate text-xs text-gray-500">
                {ingredientPreview.map((entry, entryIndex) => (
                  <span key={entry.id}>
                    {entryIndex > 0 && <span className="text-gray-300"> · </span>}
                    {entry.emoji && (
                      <span className="font-tossface" aria-hidden>
                        {entry.emoji}{' '}
                      </span>
                    )}
                    {entry.name}
                  </span>
                ))}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
