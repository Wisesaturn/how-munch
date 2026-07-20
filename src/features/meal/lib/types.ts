import { type IngredientUnit } from '@/entities/ingredient';

type IngredientUsageStatus = 'used' | 'depleted';

/** 냉장고 품목의 배치(구매분) — 식단 편집에서 선택 대상 */
interface MealFridgeBatch {
  id: string;
  purchased_date: string;
  quantity: number;
  expiry_date: string | null;
}

interface EditorIngredient {
  fridge_item_id: string;
  /** 선택한 배치(구매분) ID — 재료 선택 시 지정 (배치 1개면 자동, 2개+면 선택) */
  batch_id: string;
  /** 개 단위: 수량. g/kg, ml/L 단위: 0 (사용 안 함) */
  amount: number;
  /**
   * 항상 포함 — 개 단위: 항상 'used'.
   * g/kg, ml/L: 'used'(재고 유지) | 'depleted'(선택한 배치 소진)
   */
  usage_status: IngredientUsageStatus;
  /** 냉장고 품목 단위 — 재료 선택 시 fridgeItems에서 주입 */
  unit?: IngredientUnit;
}

interface EditorDish {
  name: string;
  ingredients: EditorIngredient[];
}

/** 배치(구매분) 단위 재고 정보 — 스키마 검증/슬라이더 상한 계산용 */
interface FridgeBatchInfo {
  itemName: string;
  quantity: number;
  unit: IngredientUnit;
  unitLabel: string;
}

interface MealFridgeItem {
  id: string;
  name: string;
  brand?: string | null;
  total_count: number | string;
  unit: IngredientUnit;
  /** 활성(미삭제) 배치 목록 — 구매일 오름차순 */
  fridge_item_batches: MealFridgeBatch[];
}

/** 식단 재고 선택 Screen에 전달되는 항목 — 브랜드별로 구분된 개별 fridge_item */
interface FridgeItemSearchOption {
  id: string;
  name: string;
  brand?: string | null;
  depleted: boolean;
}

/** 식단 배치 선택 Screen에 전달되는 항목 — 한 품목의 개별 구매분 */
interface FridgeBatchSelectOption {
  id: string;
  purchasedDate: string;
  quantity: number;
  expiryDate: string | null;
}

export type {
  EditorDish,
  EditorIngredient,
  FridgeBatchInfo,
  FridgeBatchSelectOption,
  FridgeItemSearchOption,
  IngredientUsageStatus,
  MealFridgeBatch,
  MealFridgeItem,
};
