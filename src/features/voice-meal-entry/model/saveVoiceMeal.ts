import { apiClient } from '@/commons/lib';

import { type Meal, type MealType } from '@/entities/meal';

import { type ParsedDish, type ParsedExpense } from '../lib';

/** 식단 저장 경로와 편집 화면이 받는 메뉴 모양 */
export interface VoiceDraftDish {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    batch_id: string;
    amount: number;
    usage_status: 'used' | 'depleted';
    unit?: ParsedDish['ingredients'][number]['unit'];
  }>;
}

/** @description 결과 화면에서 고친 메뉴 중 저장할 수 있는 것만 남긴다. 재료를 고르지 않은 줄과 재료 없는 메뉴는 뺀다 */
export function toSavableDishes(dishes: VoiceDraftDish[]): VoiceDraftDish[] {
  return dishes
    .map((dish) => ({
      name: dish.name.trim(),
      ingredients: dish.ingredients.filter(
        (ingredient) => ingredient.fridge_item_id && ingredient.batch_id,
      ),
    }))
    .filter((dish) => dish.ingredients.length > 0);
}

/** @description 정리 결과의 메뉴 중 냉장고 재료가 있는 것만 저장 모양으로 바꾼다. 재료 없는 메뉴는 식단 저장 규칙을 통과하지 못한다 */
export function toDraftDishes(dishes: ParsedDish[]): VoiceDraftDish[] {
  return dishes
    .filter((dish) => dish.ingredients.length > 0)
    .map((dish) => ({
      name: dish.name,
      ingredients: dish.ingredients.map(
        ({ fridge_item_id, batch_id, amount, usage_status, unit }) => ({
          fridge_item_id,
          batch_id,
          amount,
          usage_status,
          unit,
        }),
      ),
    }));
}

/** @description 그 날짜, 그 끼니에 이미 저장된 식단을 가져온다. 없으면 null */
export async function fetchExistingMeal(
  householdId: string,
  date: string,
  type: MealType,
): Promise<Meal | null> {
  const meals = await apiClient.get<Meal[]>('/api/meals', { householdId, date });
  return meals.find((meal) => meal.type === type) ?? null;
}

/** 이미 저장된 식단을 저장 경로가 받는 모양으로 되돌린다. 삭제된 품목을 가리키는 재료는 다시 보낼 수 없어 뺀다 */
function toSavedDishes(meal: Meal | null): VoiceDraftDish[] {
  if (!meal) return [];
  return [...(meal.dishes ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((dish) => ({
      name: dish.name,
      ingredients: (dish.ingredients ?? [])
        .filter((ingredient) => ingredient.fridge_items !== null && !ingredient.is_orphaned)
        .map((ingredient) => ({
          fridge_item_id: ingredient.fridge_item_id,
          batch_id: ingredient.batch_id ?? '',
          amount: Number(ingredient.amount ?? 0),
          usage_status: ingredient.usage_status ?? 'used',
          unit: ingredient.fridge_items?.unit,
        })),
    }));
}

/**
 * @description 말로 정리한 메뉴를 그 끼니의 기존 메뉴 뒤에 붙여 저장한다.
 * 저장 경로는 끼니 전체를 바꿔 넣으므로 기존 메뉴를 함께 보내야 지워지지 않는다. 재고는 저장 경로가 뺀다.
 */
export async function saveVoiceMeal(input: {
  householdId: string;
  date: string;
  type: MealType;
  dishes: VoiceDraftDish[];
}) {
  const existing = await fetchExistingMeal(input.householdId, input.date, input.type);
  await apiClient.post('/api/meals', {
    householdId: input.householdId,
    date: input.date,
    type: input.type,
    dishes: [...toSavedDishes(existing), ...input.dishes],
  });
}

/** @description 정리한 외식비를 기존 외식비 추가 경로로 저장한다 */
export async function saveVoiceExpense(householdId: string, expense: ParsedExpense) {
  await apiClient.post('/api/food-expenses', {
    household_id: householdId,
    kind: expense.kind,
    brand: expense.brand.trim(),
    name: expense.name.trim() || null,
    store: expense.kind === 'delivery' ? expense.store.trim() || null : null,
    price: expense.price,
    date: expense.date,
  });
}
