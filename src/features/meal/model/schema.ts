import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';

import {
  isWeightUnit,
  resolveAmountMin,
  validateAmountPrecisionByUnit,
} from '@/entities/ingredient';

import { formatIngredientAmountInfo, type FridgeStockInfo } from '../lib';

import { addAmount, isGreaterAmount, normalizeAmount } from './amount';

/**
 * @description 식단 편집 폼의 dishes 배열 검증 스키마를 생성합니다.
 */
function createMealEditorDishesSchema(
  maxIngredientCount: number,
  fridgeStockInfoById: Record<string, FridgeStockInfo>,
  inUseStockAmountByItemId: Record<string, number>,
) {
  return z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, ERROR_MSG.INPUT.REQUIRED({ fieldName: '메뉴명' }))
          .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '메뉴명', max: '20자' })),
        ingredients: z
          .array(
            z.object({
              fridge_item_id: z
                .string()
                .trim()
                .min(1, ERROR_MSG.SELECT.REQUIRED({ fieldName: '재료' })),
              amount: z.number().min(0, ERROR_MSG.RANGE.MIN({ fieldName: '재료 수량', min: 0 })),
              usage_status: z.enum(['used', 'depleted']),
            }),
          )
          .min(1, '메뉴마다 재료를 1개 이상 추가해 주세요'),
      }),
    )
    .min(1, '메뉴를 1개 이상 추가해 주세요')
    .superRefine((parsedDishes, ctx) => {
      const usedAmountByItemId: Record<string, number> = {};

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

          // g/kg 단위는 usage_status로 처리 — amount 검증 건너뜀
          if (isWeightUnit(stockInfo.unit)) return;

          const minAmount = resolveAmountMin(stockInfo.unit);
          if (ingredient.amount < minAmount) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${stockInfo.itemName} 수량은 ${minAmount}${stockInfo.unitLabel} 이상이어야 합니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
            return;
          }

          if (!validateAmountPrecisionByUnit(ingredient.amount, stockInfo.unit)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${stockInfo.itemName} 수량은 정수만 입력할 수 있습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
            return;
          }
          const inUseStockAmount = inUseStockAmountByItemId[ingredient.fridge_item_id] ?? 0;
          // 보유 재고 + 사용 중인 재고
          const maxAvailableAmount = addAmount(stockInfo.availableAmount, inUseStockAmount);
          const accumulatedAmount = usedAmountByItemId[ingredient.fridge_item_id] ?? 0;
          const nextAccumulatedAmount = addAmount(accumulatedAmount, ingredient.amount);
          usedAmountByItemId[ingredient.fridge_item_id] = nextAccumulatedAmount;

          const normalizedMaxAvailableAmount = normalizeAmount(maxAvailableAmount);
          const normalizedNextAccumulatedAmount = normalizeAmount(nextAccumulatedAmount);

          if (isGreaterAmount(normalizedNextAccumulatedAmount, normalizedMaxAvailableAmount)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${stockInfo.itemName}은 ${formatIngredientAmountInfo(normalizedMaxAvailableAmount, stockInfo.unit)}를 초과할 수 없습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
          }
        });
      });
    });
}

export { createMealEditorDishesSchema };
