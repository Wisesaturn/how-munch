import { type NextRequest } from 'next/server';

import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

/** GET /api/profile — 내 프로필 조회 */
export const GET = withAuth(async (_req: NextRequest, { userId, supabase }) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116')
      return apiResponse.NOT_FOUND('CMN_003', '프로필을 찾을 수 없습니다.');
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** PUT /api/profile — 프로필 수정 (닉네임) */
export const PUT = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const { nickname } = await req.json();

  if (!nickname) {
    return apiResponse.BAD_REQUEST('CMN_002', '닉네임이 필요합니다.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ nickname, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) return apiResponse.INTERNAL_ERROR();
  return apiResponse.NO_CONTENT();
});

/** DELETE /api/profile — 회원 탈퇴 */
export const DELETE = withAuth(async (_req: NextRequest, { supabase }) => {
  const { data, error } = await supabase.rpc('delete_my_account');

  if (error) {
    if (error.code === '42883') {
      return apiResponse.INTERNAL_ERROR('회원 탈퇴 기능이 아직 연결되지 않았습니다.');
    }
    return apiResponse.INTERNAL_ERROR();
  }

  if (data === false) {
    return apiResponse.INTERNAL_ERROR('회원 탈퇴 처리에 실패했습니다.');
  }

  return apiResponse.NO_CONTENT();
});
