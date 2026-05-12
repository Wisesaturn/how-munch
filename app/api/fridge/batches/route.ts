import { type NextRequest } from 'next/server';

import { josa } from 'es-hangul';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';
import { type Json } from '@/commons/model/types';

/** POST /api/fridge/batches — 기존 아이템에 배치 추가 */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const body = await req.json();

  const { data, error } = await supabase.from('fridge_item_batches').insert(body).select().single();

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  void (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: fridgeItem } = await supabase
      .from('fridge_items')
      .select('household_id, name')
      .eq('id', data.fridge_item_id)
      .single();
    if (!fridgeItem) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', userId)
      .single();
    const nickname = profile?.nickname ?? '가구원';

    dispatchHouseholdNotification({
      accessToken: session.access_token,
      householdId: fridgeItem.household_id,
      triggeredBy: userId,
      type: 'fridge_item_added',
      title: '냉장고 재료 추가',
      body: `${nickname}님이 ${josa(fridgeItem.name, '을/를')} 추가했어요`,
    });
  })();

  return apiResponse.CREATED(data);
});

/** PUT /api/fridge/batches — 배치 수정 (guarded) */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Json;

  const { data, error } = await supabase.rpc('update_fridge_batch_guarded', {
    p_batch_id: id,
    p_updates: patch,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** DELETE /api/fridge/batches?id= — 배치 소프트 삭제 */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('soft_delete_fridge_batch', {
    p_batch_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
