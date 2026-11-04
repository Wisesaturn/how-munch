import { type NextRequest } from 'next/server';

import { josa } from 'es-hangul';

import {
  buildDiningExpenseNotificationBody,
  notifyBudgetExceeded,
  respondWithDbError,
  withAuth,
} from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';
import { type Json } from '@/commons/model/types';

import { type MealType } from '@/entities/meal';

import { type VoiceRecordPayload } from '@/features/voice-meal-entry';

const DINING_KINDS = ['restaurant', 'delivery'];
const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};

interface VoiceRecordResult {
  meal_id: string | null;
  purchase_names: string[];
  expense: { kind: string; brand: string; store: string | null; date: string } | null;
}

/**
 * POST /api/assistant/save-record — 음성 기록을 한 트랜잭션으로 저장한다.
 * 재고 정리, 장보기, 식단, 외식비 중 하나라도 실패하면 전부 취소한다.
 * 저장 뒤 알림은 각 항목의 기존 저장 경로와 같게 보낸다.
 */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const body: VoiceRecordPayload = await req.json();
  const { householdId, date, type, purchases, stockUpdates, dishes, purchaseLinks, expense } = body;

  if (!householdId || !date || !type) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }
  if (expense && (!expense.brand || !DINING_KINDS.includes(expense.kind))) {
    return apiResponse.BAD_REQUEST('CMN_002', '외식비의 kind, brand가 필요합니다.');
  }

  const { data, error } = await supabase.rpc('create_voice_record_with_usage', {
    p_household_id: householdId,
    p_date: date,
    p_meal_type: type,
    p_purchases: purchases as unknown as Json,
    p_stock_updates: stockUpdates as unknown as Json,
    p_dishes: dishes as unknown as Json,
    p_purchase_links: purchaseLinks as unknown as Json,
    p_expense: expense as unknown as Json,
  });
  if (error) return respondWithDbError(error, 'POST /api/assistant/save-record');

  const result = data as unknown as VoiceRecordResult;

  // 예산 초과 알림 — 실패해도 저장 흐름을 막지 않는다
  const expenseDates = new Set<string>();
  if (result.purchase_names.length > 0) expenseDates.add(date);
  if (result.expense) expenseDates.add(result.expense.date);
  expenseDates.forEach((expenseDate) => {
    void notifyBudgetExceeded({ supabase, userId, householdId, date: expenseDate });
  });

  // 가구원 활동 알림 — 등록한 본인을 제외한 가구원에게 push를 보낸다
  void (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single();
    const nickname = profile?.nickname ?? '가구원';
    const notify = (
      notification: Pick<
        Parameters<typeof dispatchHouseholdNotification>[0],
        'type' | 'title' | 'body'
      >,
    ) =>
      dispatchHouseholdNotification({
        accessToken: session.access_token,
        householdId,
        triggeredBy: userId,
        ...notification,
      });

    result.purchase_names.forEach((name) =>
      notify({
        type: 'fridge_item_added',
        title: '냉장고 재료 추가',
        body: `${nickname}님이 ${josa(name, '을/를')} 추가했어요`,
      }),
    );
    if (result.meal_id) {
      const mealLabel = MEAL_TYPE_LABEL[type as MealType] ?? type;
      notify({
        type: 'meal_added',
        title: '식단 등록',
        body: `${nickname}님이 ${josa(mealLabel, '을/를')} 등록했어요`,
      });
    }
    if (result.expense) {
      notify({
        type: 'dining_expense_added',
        title: '외식비 등록',
        body: buildDiningExpenseNotificationBody(nickname, result.expense),
      });
    }
  })();

  return apiResponse.CREATED(result);
});
