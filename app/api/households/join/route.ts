import { type NextRequest } from 'next/server';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

/** POST /api/households/join — 초대 코드로 가구 가입 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const { code } = await req.json();

  if (!code) {
    return apiResponse.BAD_REQUEST('CMN_002', '초대 코드가 필요합니다.');
  }

  const normalizedCode = String(code).trim().toUpperCase();

  const { data, error } = await supabase.rpc('join_household', {
    invite_code: normalizedCode,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});
