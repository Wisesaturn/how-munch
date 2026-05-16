import { type NextRequest } from 'next/server';

import { josa } from 'es-hangul';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';

/** POST /api/notification/household-activity — 가구 활동 알림 단건 통합 발송 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { householdId, itemNames, triggeredBy } = body as {
    householdId: string;
    itemNames: string[];
    triggeredBy: string;
  };

  if (!householdId || !triggeredBy || !Array.isArray(itemNames) || itemNames.length === 0) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return apiResponse.UNAUTHORIZED();

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('user_id', triggeredBy)
    .single();
  const nickname = profile?.nickname ?? '가구원';

  const notificationBody =
    itemNames.length === 1
      ? `${nickname}님이 ${josa(itemNames[0], '을/를')} 추가했어요`
      : `${nickname}님이 ${itemNames[0]} 외 ${itemNames.length - 1}개를 냉장고에 추가했어요`;

  dispatchHouseholdNotification({
    accessToken: session.access_token,
    householdId,
    triggeredBy,
    type: 'fridge_item_added',
    title: '냉장고 재료 추가',
    body: notificationBody,
  });

  return apiResponse.NO_CONTENT();
});
