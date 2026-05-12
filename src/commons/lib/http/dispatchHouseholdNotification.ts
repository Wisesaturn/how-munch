/**
 * @description 가구원 활동 알림을 dispatch-household-notification Edge Function에 fire-and-forget으로 전송한다.
 * 발송 실패는 무시하며, 메인 저장 흐름을 블로킹하지 않는다.
 */
export function dispatchHouseholdNotification(params: {
  accessToken: string;
  householdId: string;
  triggeredBy: string;
  type: 'fridge_item_added' | 'meal_added';
  title: string;
  body: string;
}): void {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return;

  const { accessToken, ...payload } = params;

  void fetch(`${supabaseUrl}/functions/v1/dispatch-household-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });
}
