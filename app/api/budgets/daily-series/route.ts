import { type NextRequest } from 'next/server';

import { respondWithDbError, withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

import { type BudgetDailyPoint } from '@/entities/budget';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * GET /api/budgets/daily-series?householdId=&yearMonth=
 * 대상 월 + 직전 월의 일자별 식비 합계. 누적 그래프는 클라이언트가 이 값으로 그린다.
 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const yearMonth = searchParams.get('yearMonth');

  if (!householdId || !yearMonth) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId, yearMonth가 필요합니다.');
  }
  if (!YEAR_MONTH_PATTERN.test(yearMonth)) {
    return apiResponse.BAD_REQUEST('BUD_002', '예산 연월 형식이 올바르지 않습니다.');
  }

  const { data, error } = await supabase.rpc('get_food_expense_daily_series', {
    p_household_id: householdId,
    p_year_month: yearMonth,
  });

  if (error) return respondWithDbError(error, 'GET /api/budgets/daily-series', 'badRequest');

  return apiResponse.OK((data ?? []) as BudgetDailyPoint[]);
});
