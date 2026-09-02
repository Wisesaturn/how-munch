import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

import { resolveCurrentHouseholdId } from '../household';

/** POST /api/search-synonyms/reset — 내 가구의 유사어를 기본 시드 상태로 되돌린다 */
export const POST = withAuth(async (_req: NextRequest, { userId, supabase }) => {
  const householdId = await resolveCurrentHouseholdId(supabase, userId);
  if (!householdId) return apiResponse.BAD_REQUEST('CMN_002', '가구 정보를 찾을 수 없습니다.');

  const { data, error } = await supabase.rpc('generate_default_search_synonyms', {
    p_household_id: householdId,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});
