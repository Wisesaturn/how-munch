import { type NextRequest } from 'next/server';

import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

/** GET /api/households/members?householdId= — 가구 멤버 목록 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*, profiles(user_id, nickname, email)')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (membersError) return apiResponse.INTERNAL_ERROR();

  const result = (members ?? []).map((member) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    return {
      ...member,
      profiles: undefined,
      nickname: profile?.nickname ?? '알 수 없음',
      email: profile?.email ?? '-',
    };
  });

  return apiResponse.OK(result);
});
