import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** POST /api/notification/test — 현재 유저에게 테스트 push 알림 발송 */
export const POST = withAuth(async (_req, { userId }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return apiResponse.INTERNAL_ERROR();

  const res = await fetch(`${supabaseUrl}/functions/v1/send-test-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ userId }),
  });

  if (res.status === 404) return apiResponse.NOT_FOUND('NTF_001', '활성화된 push 구독이 없습니다.');
  if (!res.ok) return apiResponse.INTERNAL_ERROR('테스트 알림 발송에 실패했습니다.');

  return apiResponse.NO_CONTENT();
});
