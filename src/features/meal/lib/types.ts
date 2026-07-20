import { type IngredientUnit } from '@/entities/ingredient';

type IngredientUsageStatus = 'used' | 'depleted' | 'depleted_batch';

interface EditorIngredient {
  fridge_item_id: string;
  /** 개 단위: 수량. g/kg, ml/L 단위: 0 (사용 안 함) */
  amount: number;
  /**
   * 항상 포함 — 개 단위: 항상 'used'.
   * g/kg, ml/L: 'used'(재고 유지) | 'depleted_batch'(가장 오래된 구매분 1개 소진) | 'depleted'(전부 소진)
   */
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
  brand?: string | null;
  total_count: number | string;
  unit: IngredientUnit;
}

/** 식단 재고 선택 Screen에 전달되는 항목 — 브랜드별로 구분된 개별 fridge_item */
interface FridgeItemSearchOption {
  id: string;
  name: string;
  brand?: string | null;
  depleted: boolean;
}

export type {
  EditorDish,
  EditorIngredient,
  FridgeItemSearchOption,
  FridgeStockInfo,
  IngredientUsageStatus,
  MealFridgeItem,
};
