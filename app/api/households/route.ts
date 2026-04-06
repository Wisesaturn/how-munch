import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/households?id= — 가구 정보 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { data, error } = await supabase.from('households').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116')
      return apiResponse.NOT_FOUND('CMN_003', '가구를 찾을 수 없습니다.');
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** POST /api/households — 가구 생성 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const { name } = await req.json();

  if (!name) {
    return apiResponse.BAD_REQUEST('CMN_002', '가구 이름이 필요합니다.');
  }

  const { data, error } = await supabase.rpc('create_household_with_owner', {
    p_name: name,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.CREATED(data);
});
