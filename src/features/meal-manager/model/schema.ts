import { z } from 'zod';

import { type FridgeStockInfo } from '../lib';

/**
 * @description 식단 편집 폼의 dishes 배열 검증 스키마를 생성합니다.
 */
function createMealEditorDishesSchema(
  maxIngredientCount: number,
  fridgeStockInfoById: Record<string, FridgeStockInfo>,
) {
  return z
    .array(
      z.object({
        name: z.string().trim().min(1, '메뉴명을 입력해 주세요'),
        ingredients: z
          .array(
            z.object({
              fridge_item_id: z.string().trim().min(1, '재료를 선택해 주세요'),
              amount: z.number().min(1, '재료 수량은 1 이상이어야 합니다'),
            }),
          )
          .min(1, '메뉴마다 재료를 1개 이상 추가해 주세요'),
      }),
    )
    .min(1, '메뉴를 1개 이상 추가해 주세요')
    .superRefine((parsedDishes, ctx) => {
      parsedDishes.forEach((dish, dishIndex) => {
        const dishLabel = dish.name.trim() || `메뉴 ${dishIndex + 1}`;

        if (dish.ingredients.length > maxIngredientCount) {
          ctx.addIssue({
            code: 'custom',
            message: `${dishLabel}의 재료는 최대 ${maxIngredientCount}개까지 추가할 수 있습니다`,
            path: [dishIndex, 'ingredients'],
          });
        }

        const usedFridgeItemIds = new Set<string>();
        dish.ingredients.forEach((ingredient, ingredientIndex) => {
          if (usedFridgeItemIds.has(ingredient.fridge_item_id)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}에 같은 재료를 중복으로 선택할 수 없습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'fridge_item_id'],
            });
            return;
          }

          usedFridgeItemIds.add(ingredient.fridge_item_id);
          const stockInfo = fridgeStockInfoById[ingredient.fridge_item_id];
          if (!stockInfo) return;

          if (ingredient.amount > stockInfo.availableAmount) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${stockInfo.itemName}은 최대 ${stockInfo.availableAmount}${stockInfo.unitLabel}까지 입력할 수 있습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
          }
        });
      });
    });
}

export { createMealEditorDishesSchema };
