import { type createClient } from '@/commons/api/supabase/server';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * @description 지출 생성 직후 해당 월의 예산 초과 여부를 판정해 알림을 남기고 push를 발송한다.
 * RPC가 dedupe_key로 월 × scope × 사용자당 1회만 남기므로, 지출을 추가할 때마다 알림이 쏟아지지 않는다.
 * fire-and-forget이라 실패해도 지출 저장 흐름을 막지 않는다.
 */
export async function notifyBudgetExceeded(params: {
  supabase: ServerSupabaseClient;
  userId: string;
  householdId: string;
  /** 지출 일자 (YYYY-MM-DD) — 이 날짜가 속한 달의 예산을 본다 */
  date: string;
}): Promise<void> {
  const { supabase, userId, householdId, date } = params;
  const yearMonth = date.slice(0, 7);

  const { data: insertedCount, error } = await supabase.rpc(
    'create_budget_exceeded_notifications',
    {
      p_household_id: householdId,
      p_year_month: yearMonth,
    },
  );

  // 새로 남은 알림이 없으면(이미 보냈거나 초과 아님) push도 보내지 않는다.
  if (error || !insertedCount) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;

  dispatchHouseholdNotification({
    accessToken: session.access_token,
    householdId,
    triggeredBy: userId,
    type: 'budget_exceeded',
    title: '예산 초과',
    body: '이번 달 예산을 초과했어요!',
  });
}
