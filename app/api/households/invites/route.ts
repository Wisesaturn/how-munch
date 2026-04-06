import { type NextRequest } from 'next/server';

import { addDays } from 'date-fns';

import { apiResponse } from '@/commons/lib/apiResponse';
import { withAuth } from '@/commons/lib/routeGuard';

function createInviteCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** POST /api/households/invites — 초대 코드 생성 (유효한 기존 코드 재사용) */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const { householdId } = await req.json();

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const nowIso = new Date().toISOString();

  const { data: existingInvites, error: existingError } = await supabase
    .from('household_invites')
    .select('*')
    .eq('household_id', householdId)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false });

  if (existingError) return apiResponse.INTERNAL_ERROR();

  const reusableInvite = (existingInvites ?? []).find(
    (invite) => invite.use_count < invite.max_uses,
  );

  if (reusableInvite) {
    return apiResponse.OK({ invite: reusableInvite, reused: true });
  }

  const { data, error } = await supabase
    .from('household_invites')
    .insert({
      household_id: householdId,
      created_by: userId,
      code: createInviteCode(6),
      expires_at: addDays(new Date(), 7).toISOString(),
      max_uses: 10,
    })
    .select('*')
    .single();

  if (error) return apiResponse.INTERNAL_ERROR();

  return apiResponse.CREATED({ invite: data, reused: false });
});
