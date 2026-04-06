import { type NextRequest } from 'next/server';

import { uniq } from 'es-toolkit';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/ingredients/brands?householdId= — 브랜드 목록 조회 (자동완성용) */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('ingredients')
    .select('brand')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .not('brand', 'is', null);

  if (error) return apiResponse.INTERNAL_ERROR();

  const brands = uniq((data ?? []).map((d) => d.brand).filter(Boolean) as string[]);
  return apiResponse.OK(brands);
});
