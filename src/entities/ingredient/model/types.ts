import { type IngredientUnit } from './unit';

/** 장보기 내역 — 가계부 역할, 냉장고 재료의 원천 데이터 */
export interface Ingredient {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** 작성자 (auth.users ID) */
  user_id: string;
  /** 구매 일자 (YYYY-MM-DD) */
  date: string;
  /** 품목명 (예: 삼겹살) */
  name: string;
  /** 구매 가격 (원) */
  price: number;
  /** 구매처 (예: 이마트, 쿠팡) */
  store: string | null;
  /** 카테고리 UUID */
  category_id: string;
  /** 구매 수량 */
  count: number;
  /** 단위 — count: 개, g: 그램, kg: 킬로그램 */
  unit: IngredientUnit;
  /** 연결된 냉장고 아이템 ID (동일 품목 병합 시 N:1 가능) */
  linked_fridge_item_id: string | null;
  /** 연결된 냉장고 배치 ID (장보기-재고 입고 1:1 추적용) */
  linked_fridge_batch_id: string | null;
  /** 소프트 삭제 시각 */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
