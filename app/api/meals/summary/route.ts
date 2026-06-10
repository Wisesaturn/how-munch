import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/meals/summary?householdId=&startDate=&endDate= — 기간 내 식단 존재 여부 요약 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!householdId || !startDate || !endDate) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId, startDate, endDate가 필요합니다.');
  }

  const { data: summaries, error } = await supabase
    .from('meals')
    .select('date, type')
    .eq('household_id', householdId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.OK(summaries ?? []);
});
