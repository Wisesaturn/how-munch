/** 외식비 종류 — 식당에서 먹고 왔는지, 포장·배달로 가져와 먹었는지 */
export type DiningExpenseKind = 'restaurant' | 'delivery';

/** 외식비 내역 — 재고에 들어가지 않는 식비. 결제 1건이 1 row다. */
export interface DiningExpense {
  id: string;
  /** 소속 가구 ID */
  household_id: string;
  /** 작성자 (auth.users ID) — 탈퇴 시 null */
  user_id: string | null;
  /** 결제 일자 (YYYY-MM-DD) */
  date: string;
  /** 식당 / 포장·배달 */
  kind: DiningExpenseKind;
  /** 먹은 것 (예: 삼겹살) — 기억나지 않을 수 있어 선택 입력 */
  name: string | null;
  /** 가게명 (예: ○○숯불갈비, 교촌치킨) — 외식 기록의 최소 식별자라 필수 */
  brand: string;
  /** 결제 채널 (예: 배달의민족) — kind가 restaurant이면 비어 있고, 직접 픽업한 포장도 비어 있을 수 있다 */
  store: string | null;
  /** 결제 금액 (원) */
  price: number;
  memo: string | null;
  /** 소프트 삭제 시각 */
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
