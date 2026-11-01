import { type Budget, type BudgetAmountMap, type BudgetScope } from '../model/types';

/** 화면에 노출되는 순서 — 전체 다음에 항목별 */
export const BUDGET_SCOPES: BudgetScope[] = ['total', 'grocery', 'restaurant', 'delivery'];

/** 항목별 scope만 — 합계 검증 대상 */
export const BUDGET_ITEM_SCOPES: BudgetScope[] = ['grocery', 'restaurant', 'delivery'];

/**
 * @description 값이 예산 scope인지 확인합니다.
 */
function isBudgetScope(value: unknown): value is BudgetScope {
  return BUDGET_SCOPES.some((scope) => scope === value);
}

/**
 * @description 값이 Budget 한 건의 형태인지 확인합니다.
 */
function isBudget(value: unknown): value is Budget {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'household_id' in value &&
    typeof value.household_id === 'string' &&
    'year_month' in value &&
    typeof value.year_month === 'string' &&
    'scope' in value &&
    isBudgetScope(value.scope) &&
    'amount' in value &&
    typeof value.amount === 'number' &&
    'created_at' in value &&
    typeof value.created_at === 'string' &&
    'updated_at' in value &&
    typeof value.updated_at === 'string'
  );
}

/**
 * @description 타입이 Json으로만 잡히는 RPC 결과가 Budget 목록인지 확인합니다.
 */
export function isBudgetList(value: unknown): value is Budget[] {
  return Array.isArray(value) && value.every(isBudget);
}

const BUDGET_SCOPE_LABEL: Record<BudgetScope, string> = {
  total: '전체',
  grocery: '장보기',
  restaurant: '식당/카페',
  delivery: '포장/배달',
};

/** 미설정 상태의 빈 예산 표 */
export const EMPTY_BUDGET_AMOUNTS: BudgetAmountMap = {
  total: null,
  grocery: null,
  restaurant: null,
  delivery: null,
};

/**
 * @description 예산 scope의 UI 라벨을 반환한다.
 */
export function getBudgetScopeLabel(scope: BudgetScope): string {
  return BUDGET_SCOPE_LABEL[scope];
}

/**
 * @description 예산 row 목록을 scope별 금액 표로 바꾼다.
 * row가 없는 scope는 null(미설정)로 남는다.
 */
export function toBudgetAmountMap(budgets: Budget[]): BudgetAmountMap {
  const amounts: BudgetAmountMap = { ...EMPTY_BUDGET_AMOUNTS };

  for (const budget of budgets) {
    amounts[budget.scope] = budget.amount;
  }

  return amounts;
}

/**
 * @description 예산이 하나라도 설정되어 있는지 확인한다.
 */
export function hasAnyBudget(amounts: BudgetAmountMap): boolean {
  return BUDGET_SCOPES.some((scope) => amounts[scope] !== null);
}

/**
 * @description 항목별(장보기/식당/포장·배달) 예산 합계를 구한다. 미설정 scope는 0으로 센다.
 */
export function sumItemBudgets(amounts: BudgetAmountMap): number {
  return BUDGET_ITEM_SCOPES.reduce((sum, scope) => sum + (amounts[scope] ?? 0), 0);
}
