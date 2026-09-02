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
  isOrphaned: boolean;
}

function buildIngredientPreview(
  dish: Dish,
  getCategoryById: (id: string) => { emoji: string } | null,
): IngredientPreviewEntry[] {
  return dish.ingredients.map((ingredient) => {
    const fridgeItem = ingredient.fridge_items;

    // 참조하던 냉장고 품목을 찾지 못한 행도 목록에서 빼지 않는다.
    // 조용히 사라지면 사용자가 기록이 지워졌다고 오해한다.
    if (!fridgeItem) {
      return { id: ingredient.id, name: '삭제된 재료', isOrphaned: true };
    }

    return {
      id: ingredient.id,
      name: fridgeItem.name,
      emoji: getCategoryById(fridgeItem.category_id)?.emoji,
      isOrphaned: ingredient.is_orphaned === true,
    };
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
              <p className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-xs text-gray-500">
                {ingredientPreview.map((entry, entryIndex) => (
                  <span key={entry.id} className="whitespace-nowrap">
                    {entry.emoji && (
                      <span className="font-tossface mr-0.5" aria-hidden>
                        {entry.emoji}
                      </span>
                    )}
                    <span className={entry.isOrphaned ? 'text-gray-400' : undefined}>
                      {entry.name}
                      {entry.isOrphaned && ' (삭제됨)'}
                    </span>
                    {entryIndex < ingredientPreview.length - 1 && (
                      <span className="text-gray-300"> ·</span>
                    )}
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
