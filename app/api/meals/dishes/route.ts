import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

import { type MealType } from '@/entities/meal';

interface MoveDishBody {
  dishId: string;
  targetMealType: MealType;
  householdId: string;
  date: string;
}

/** PATCH /api/meals/dishes — 메뉴를 다른 끼니로 이동 */
export const PATCH = withAuth(async (req: NextRequest, { supabase }) => {
  const body: MoveDishBody = await req.json();
  const { dishId, targetMealType, householdId, date } = body;

  if (!dishId || !targetMealType || !householdId || !date) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const { data, error } = await supabase.rpc('move_dish_to_meal', {
    p_dish_id: dishId,
    p_target_meal_type: targetMealType,
    p_household_id: householdId,
    p_date: date,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});
