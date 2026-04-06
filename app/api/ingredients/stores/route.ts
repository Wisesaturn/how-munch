import { type NextRequest } from 'next/server';

import { uniq } from 'es-toolkit';

import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

/** GET /api/ingredients/stores?householdId= — 구매처 목록 조회 (자동완성용) */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('store')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .not('store', 'is', null);

  if (error) return apiResponse.INTERNAL_ERROR();

  const stores = uniq((data ?? []).map((d) => d.store).filter(Boolean) as string[]);
  return apiResponse.OK(stores);
});
