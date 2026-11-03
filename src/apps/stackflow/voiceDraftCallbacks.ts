import { type DiningExpenseFormValues } from '@/features/dining-expense';
import { type MealDraftDish } from '@/features/meal';

/**
 * 음성 기록 결과 화면에서 연 편집 화면이 고친 값을 돌려줄 콜백.
 * Stackflow params는 함수를 담을 수 없어 영수증 항목 편집처럼 모듈 스코프에 하나씩 둔다.
 */
let pendingDishesCallback: ((dishes: MealDraftDish[]) => void) | null = null;
let pendingExpenseCallback: ((values: DiningExpenseFormValues) => void) | null = null;

export function setPendingVoiceDishesCallback(callback: (dishes: MealDraftDish[]) => void) {
  pendingDishesCallback = callback;
}

export function resolvePendingVoiceDishesCallback(dishes: MealDraftDish[]) {
  pendingDishesCallback?.(dishes);
  pendingDishesCallback = null;
}

export function setPendingVoiceExpenseCallback(
  callback: (values: DiningExpenseFormValues) => void,
) {
  pendingExpenseCallback = callback;
}

export function resolvePendingVoiceExpenseCallback(values: DiningExpenseFormValues) {
  pendingExpenseCallback?.(values);
  pendingExpenseCallback = null;
}
