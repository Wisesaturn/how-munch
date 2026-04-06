import { type NextRequest } from 'next/server';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

import { type MealType } from '@/entities/meal';

interface UpsertMealBody {
  householdId: string;
  date: string;
  type: MealType;
  dishes: Array<{
    name: string;
    ingredients: Array<{
      fridge_item_id: string;
      amount: number;
    }>;
  }>;
}

function toSafePositiveAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  return amount;
}

/** GET /api/meals?householdId=&date= — 특정 날짜 식단 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const date = searchParams.get('date');

  if (!householdId || !date) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId와 date가 필요합니다.');
  }

  const { data: meals, error: mealsError } = await supabase
    .from('meals')
    .select('*, dishes(*, dish_ingredients(*))')
    .eq('household_id', householdId)
    .eq('date', date)
    .order('type', { ascending: true });

  if (mealsError) return apiResponse.INTERNAL_ERROR();
  return apiResponse.OK(meals ?? []);
});

/** POST /api/meals — 식단 저장 (해당 meal type 전체 교체) */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body: UpsertMealBody = await req.json();
  const { householdId, date, type, dishes } = body;

  if (!householdId || !date || !type) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const normalizedDishes = dishes.map((dish, index) => ({
    name: dish.name.trim() || '[이름 없음]',
    sort_order: index,
    ingredients: dish.ingredients
      .map((ingredient) => ({
        fridge_item_id: ingredient.fridge_item_id,
        amount: toSafePositiveAmount(ingredient.amount),
      }))
      .filter((ingredient) => !!ingredient.fridge_item_id && ingredient.amount > 0),
  }));

  const { data, error } = await supabase.rpc('upsert_meal_with_usage', {
    p_household_id: householdId,
    p_date: date,
    p_type: type,
    p_dishes: normalizedDishes,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.CREATED(data);
});

/** DELETE /api/meals?id= — 식단 삭제 (재고 복구) */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('delete_meal_with_usage_restore', {
    p_meal_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
