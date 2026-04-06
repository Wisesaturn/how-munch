import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** POST /api/households/leave — 가구 탈퇴 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const { householdId } = await req.json();

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { error } = await supabase.rpc('leave_household', {
    p_household_id: householdId,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
