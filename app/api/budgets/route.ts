import { type NextRequest } from 'next/server';

import { respondWithDbError, withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';
import { type Json } from '@/commons/model/types';

import { type Budget } from '@/entities/budget';

const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** GET /api/budgets?householdId=&yearMonth= — 해당 월 예산 조회 (row 없음 = 미설정) */
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

  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('household_id', householdId)
    .eq('year_month', yearMonth);

  if (error) return respondWithDbError(error, 'GET /api/budgets', 'badRequest');

  return apiResponse.OK((data ?? []) as Budget[]);
});

/**
 * PUT /api/budgets — 해당 월 예산 일괄 저장.
 * 4개 scope를 한 트랜잭션으로 쓰는 read-modify-write이므로 RPC로 처리한다.
 * budgets 값이 null이면 해당 scope를 미설정으로 되돌린다.
 */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();

  if (!body.householdId || !body.yearMonth) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId, yearMonth가 필요합니다.');
  }

  const { data, error } = await supabase.rpc('upsert_household_budgets_guarded', {
    p_household_id: body.householdId,
    p_year_month: body.yearMonth,
    p_budgets: (body.budgets ?? {}) as Json,
  });

  if (error) return respondWithDbError(error, 'PUT /api/budgets', 'badRequest');

  return apiResponse.OK(data as unknown as Budget[]);
});
