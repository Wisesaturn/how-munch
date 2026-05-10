import { type IngredientUnit } from '@/entities/ingredient';

type IngredientUsageStatus = 'used' | 'depleted';

interface EditorIngredient {
  fridge_item_id: string;
  /** 개 단위: 수량. g/kg 단위: 0 (사용 안 함) */
  amount: number;
  /** 항상 포함 — g/kg: 'used' | 'depleted'. 개 단위: 항상 'used' */
  usage_status: IngredientUsageStatus;
  /** 냉장고 품목 단위 — 재료 선택 시 fridgeItems에서 주입 */
  unit?: IngredientUnit;
}

interface EditorDish {
  name: string;
  ingredients: EditorIngredient[];
}

interface FridgeStockInfo {
  itemName: string;
  availableAmount: number;
  unit: IngredientUnit;
  unitLabel: string;
}

interface MealFridgeItem {
  id: string;
  name: string;
  total_count: number | string;
  unit: IngredientUnit;
}

export type {
  EditorDish,
  EditorIngredient,
  FridgeStockInfo,
  IngredientUsageStatus,
  MealFridgeItem,
};
