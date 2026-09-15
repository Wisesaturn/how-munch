/** 예산 적용 범위 — 전체 예산과 항목별 예산 */
export type BudgetScope = 'total' | 'grocery' | 'restaurant' | 'delivery';

/** 월 단위 식비 예산 1행 */
export interface Budget {
  id: string;
  household_id: string;
  /** 'YYYY-MM' */
  year_month: string;
  scope: BudgetScope;
  amount: number;
  created_at: string;
  updated_at: string;
}

/**
 * scope별 예산 금액 표. null은 "미설정"이고 0은 "0원으로 산다"는 명시적 목표다.
 * 두 상태를 구분해야 진행바를 숨길지 보여줄지가 갈린다.
 */
export type BudgetAmountMap = Record<BudgetScope, number | null>;

/**
 * 일자 × 종류별 식비 합계 1점.
 * 누적 그래프와 scope별 지출 합계를 모두 이 시리즈에서 파생시킨다.
 */
export interface BudgetDailyPoint {
  /** 'YYYY-MM' */
  year_month: string;
  /** 'YYYY-MM-DD' */
  expense_date: string;
  /** 'grocery' | 'restaurant' | 'delivery' */
  kind: string;
  total: number;
}
