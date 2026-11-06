import { z } from 'zod';

import { ERROR_MSG } from '@/commons/lib';

import {
  isVolumeUnit,
  isWeightUnit,
  resolveAmountMin,
  validateAmountPrecisionByUnit,
} from '@/entities/ingredient';

import { formatIngredientAmountInfo, isFilledIngredient, type FridgeBatchInfo } from '../lib';

import { addAmount, isGreaterAmount, normalizeAmount } from './amount';

/**
 * @description 식단 편집 폼의 dishes 배열 검증 스키마를 생성합니다. (배치 단위)
 */
function createMealEditorDishesSchema(
  maxIngredientCount: number,
  fridgeBatchInfoById: Record<string, FridgeBatchInfo>,
  inUseStockAmountByBatchId: Record<string, number>,
) {
  return z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .max(20, ERROR_MSG.RANGE.MAX({ fieldName: '메뉴명', max: '20자' })),
        ingredients: z.array(
          z.object({
            // 품목을 선택하지 않은 빈 재료 행은 저장 시 무시되므로 빈 값을 허용한다
            fridge_item_id: z.string().trim(),
            batch_id: z.string().trim(),
            amount: z.number().min(0, ERROR_MSG.RANGE.MIN({ fieldName: '재료 수량', min: 0 })),
            usage_status: z.enum(['used', 'depleted']),
          }),
        ),
      }),
    )
    .superRefine((parsedDishes, ctx) => {
      const usedAmountByBatchId: Record<string, number> = {};
      const hasFilledDish = parsedDishes.some((dish) => dish.ingredients.some(isFilledIngredient));

      // 빈 메뉴/빈 재료는 저장 시 제외되므로, 저장할 메뉴가 하나도 없을 때만 막는다
      if (!hasFilledDish) {
        ctx.addIssue({
          code: 'custom',
          message: '재료를 선택한 메뉴를 1개 이상 추가해 주세요',
          path: [],
        });
        return;
      }

      parsedDishes.forEach((dish, dishIndex) => {
        const filledIngredientCount = dish.ingredients.filter(isFilledIngredient).length;
        // 재료가 없는 메뉴는 저장 대상이 아니므로 검증하지 않는다
        if (filledIngredientCount === 0) return;

        const dishLabel = dish.name.trim() || `메뉴 ${dishIndex + 1}`;

        if (!dish.name.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: ERROR_MSG.INPUT.REQUIRED({ fieldName: `${dishLabel}의 메뉴명` }),
            path: [dishIndex, 'name'],
          });
        }

        if (filledIngredientCount > maxIngredientCount) {
          ctx.addIssue({
            code: 'custom',
            message: `${dishLabel}의 재료는 최대 ${maxIngredientCount}개까지 추가할 수 있습니다`,
            path: [dishIndex, 'ingredients'],
          });
        }

        const usedBatchIds = new Set<string>();
        dish.ingredients.forEach((ingredient, ingredientIndex) => {
          // 재료는 선택했지만 배치(구매분)를 고르지 않은 경우
          if (ingredient.fridge_item_id && !ingredient.batch_id) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 재료에서 구매분(재고)을 선택해 주세요`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'batch_id'],
            });
            return;
          }

          if (!ingredient.batch_id) return;

          if (usedBatchIds.has(ingredient.batch_id)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}에 같은 구매분을 중복으로 선택할 수 없습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'batch_id'],
            });
            return;
          }

          usedBatchIds.add(ingredient.batch_id);
          const batchInfo = fridgeBatchInfoById[ingredient.batch_id];
          if (!batchInfo) return;

          // g/kg, ml/L 단위는 usage_status로 처리 — amount 검증 건너뜀
          if (isWeightUnit(batchInfo.unit) || isVolumeUnit(batchInfo.unit)) return;

          const minAmount = resolveAmountMin(batchInfo.unit);
          if (ingredient.amount < minAmount) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${batchInfo.itemName} 수량은 ${minAmount}${batchInfo.unitLabel} 이상이어야 합니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
            return;
          }

          if (!validateAmountPrecisionByUnit(ingredient.amount, batchInfo.unit)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${batchInfo.itemName} 수량은 정수만 입력할 수 있습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
            return;
          }
          const inUseStockAmount = inUseStockAmountByBatchId[ingredient.batch_id] ?? 0;
          // 배치 잔여 재고 + 이 식단이 이미 사용 중인 재고
          const maxAvailableAmount = addAmount(batchInfo.quantity, inUseStockAmount);
          const accumulatedAmount = usedAmountByBatchId[ingredient.batch_id] ?? 0;
          const nextAccumulatedAmount = addAmount(accumulatedAmount, ingredient.amount);
          usedAmountByBatchId[ingredient.batch_id] = nextAccumulatedAmount;

          const normalizedMaxAvailableAmount = normalizeAmount(maxAvailableAmount);
          const normalizedNextAccumulatedAmount = normalizeAmount(nextAccumulatedAmount);

          if (isGreaterAmount(normalizedNextAccumulatedAmount, normalizedMaxAvailableAmount)) {
            ctx.addIssue({
              code: 'custom',
              message: `${dishLabel}의 ${batchInfo.itemName}은 ${formatIngredientAmountInfo(normalizedMaxAvailableAmount, batchInfo.unit)}를 초과할 수 없습니다`,
              path: [dishIndex, 'ingredients', ingredientIndex, 'amount'],
            });
          }
        });
      });
    });
}

export { createMealEditorDishesSchema };
