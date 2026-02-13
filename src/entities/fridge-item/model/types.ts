/** 냉장고 재고의 수량 단위 */
export type FridgeItemUnit = 'count' | 'g';

/** 냉장고 재고 — 실시간 재고 관리, 소진율 추적 */
export interface FridgeItem {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** 재료명 */
  name: string;
  /** 현재 보유 총량 (소진 시 0) */
  total_count: number;
  /** 단위 — count: 개, g: 그램 */
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
