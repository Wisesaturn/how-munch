import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/households/members?householdId= — 가구 멤버 목록 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data: members, error: membersError } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: true });

  if (membersError) return apiResponse.INTERNAL_ERROR();

  const userIds = (members ?? []).map((m) => m.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, nickname, email')
    .in('user_id', userIds);

  if (profilesError) return apiResponse.INTERNAL_ERROR();

  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  const result = (members ?? []).map((member) => {
    const profile = profileMap.get(member.user_id);
    return {
      ...member,
      nickname: profile?.nickname ?? '알 수 없음',
      email: profile?.email ?? '-',
    };
  });

  return apiResponse.OK(result);
});
