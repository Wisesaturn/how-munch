import { type IngredientUnit } from '@/entities/ingredient';

type IngredientUsageStatus = 'used' | 'depleted';

interface EditorIngredient {
  fridge_item_id: string;
  /** 개 단위: 수량. g/kg 단위: 0 (사용 안 함) */
  amount: number;
  /** g/kg 단위 전용 — 'used' | 'depleted'. 개 단위는 undefined */
  usage_status?: IngredientUsageStatus;
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
