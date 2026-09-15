import { type DiningExpense, isDiningExpenseKind } from '@/entities/dining-expense';
import { type FoodExpense } from '@/entities/food-expense';
import { type Ingredient, type IngredientUnit } from '@/entities/ingredient';

/**
 * @description 식비 통합 행을 장보기 항목으로 되돌린다.
 * 통합 뷰는 장보기 컬럼을 그대로 싣고 있어 재조회 없이 편집 화면으로 넘길 수 있다.
 * 외식비 행이면 null을 반환한다.
 */
export function toIngredient(expense: FoodExpense): Ingredient | null {
  if (expense.kind !== 'grocery') return null;

  return {
    id: expense.id,
    household_id: expense.household_id,
    user_id: expense.user_id ?? '',
    date: expense.date,
    name: expense.name ?? '',
    brand: expense.brand,
    price: expense.price,
    store: expense.store,
    category_id: expense.category_id ?? '',
    count: expense.count ?? 1,
    unit: (expense.unit ?? 'count') as IngredientUnit,
    linked_fridge_item_id: expense.linked_fridge_item_id,
    linked_fridge_batch_id: expense.linked_fridge_batch_id,
    deleted_at: null,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
    has_meal_usage: expense.has_meal_usage,
  };
}

/**
 * @description 식비 통합 행을 외식비 항목으로 되돌린다. 장보기 행이면 null을 반환한다.
 */
export function toDiningExpense(expense: FoodExpense): DiningExpense | null {
  if (!isDiningExpenseKind(expense.kind)) return null;

  return {
    id: expense.id,
    household_id: expense.household_id,
    user_id: expense.user_id,
    date: expense.date,
    kind: expense.kind,
    name: expense.name,
    brand: expense.brand ?? '',
    store: expense.store,
    price: expense.price,
    memo: expense.memo,
    deleted_at: null,
    created_at: expense.created_at,
    updated_at: expense.updated_at,
  };
}

/**
 * @description 식비 목록의 합계 금액을 구한다.
 */
export function sumFoodExpensePrice(expenses: FoodExpense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.price, 0);
}
