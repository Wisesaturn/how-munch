import { type IngredientUnit } from '@/entities/ingredient/@x/fridge-item';

/** 냉장고 재고의 수량 단위 */
export type FridgeItemUnit = IngredientUnit;

/** 냉장고 재고 — 실시간 재고 관리, 소진율 추적 */
export interface FridgeItem {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** 재료명 */
  name: string;
  /** 현재 보유 총량 (트리거로 자동 계산) */
  total_count: number;
  /** 최대 보유 총량 (소진율 계산 기준) */
  max_count: number;
  /** 단위 — count: 개, g: 그램, kg: 킬로그램 */
  unit: FridgeItemUnit;
  /** 소분 보관 여부 (UI 아이콘 변경) */
  is_subdivided: boolean;
  /** 카테고리 ID (meat, veggie 등) */
  category: string;
  /** 장보기 연동 여부 — true일 경우 이름/카테고리 수정 불가 */
  from_grocery: boolean;
  created_at: string;
  updated_at: string;
}

/** 냉장고 재고 배치 — 동일 재료의 구매 차수별 관리 (FIFO) */
export interface FridgeItemBatch {
  id: string;
  fridge_item_id: string;
  /** 수량 */
  quantity: number;
  /** 유통기한 (null이면 미입력) */
  expiry_date: string | null;
  /** 구매일 */
  purchased_date: string;
  /** 메모 */
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealBatchUsage {
  id: string;
  meal_id: string;
  fridge_item_id: string;
  batch_id: string;
  amount: number;
  created_at: string;
}

/** 냉장고 재고 + 배치 목록 (조합 표시용) */
export interface FridgeItemWithBatches extends FridgeItem {
  fridge_item_batches: FridgeItemBatch[];
  meal_batch_usages?: MealBatchUsage[];
}
