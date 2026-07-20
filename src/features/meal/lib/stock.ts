import { normalizeAmount } from '../model/amount';

import { type FridgeBatchInfo, type MealFridgeItem } from './types';
import { resolveIngredientUnitLabel } from './unit';

/**
 * @description 재고 배치 목록을 batch_id 기반 조회 맵(품목명/잔여수량/단위)으로 변환합니다.
 */
function createFridgeBatchInfoById(fridgeItems: MealFridgeItem[]) {
  const batchInfoById: Record<string, FridgeBatchInfo> = {};

  fridgeItems.forEach((item) => {
    item.fridge_item_batches.forEach((batch) => {
      const quantity = Number(batch.quantity);
      const normalizedQuantity = normalizeAmount(quantity);

      batchInfoById[batch.id] = {
        itemName: item.name,
        quantity: Number.isFinite(quantity) ? Math.max(0, normalizedQuantity) : 0,
        unit: item.unit,
        unitLabel: resolveIngredientUnitLabel(item.unit),
      };
    });
  });

  return batchInfoById;
}

export { createFridgeBatchInfoById };
