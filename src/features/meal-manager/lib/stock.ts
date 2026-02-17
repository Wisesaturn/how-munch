import { normalizeAmount } from '../model/amount';

import { type FridgeStockInfo, type MealFridgeItem } from './types';
import { resolveIngredientUnitLabel } from './unit';

/**
 * @description 재고 목록을 id 기반 조회 맵(품목명/가용수량/단위)으로 변환합니다.
 */
function createFridgeStockInfoById(fridgeItems: MealFridgeItem[]) {
  const stockInfoById: Record<string, FridgeStockInfo> = {};

  fridgeItems.forEach((item) => {
    const availableAmount = Number(item.total_count);
    const normalizedAvailableAmount = normalizeAmount(availableAmount);

    stockInfoById[item.id] = {
      itemName: item.name,
      availableAmount: Number.isFinite(availableAmount)
        ? Math.max(0, normalizedAvailableAmount)
        : 0,
      unit: item.unit,
      unitLabel: resolveIngredientUnitLabel(item.unit),
    };
  });

  return stockInfoById;
}

export { createFridgeStockInfoById };
