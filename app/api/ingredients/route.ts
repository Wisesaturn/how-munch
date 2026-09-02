import { type NextRequest } from 'next/server';

import { josa } from 'es-hangul';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';
import { dispatchHouseholdNotification } from '@/commons/lib/http/dispatchHouseholdNotification';
import { type Json, type Page, type PageInfo } from '@/commons/model/types';

import { type Ingredient } from '@/entities/ingredient';

/**
 * PostgREST or 필터에 값을 안전하게 넣기 위해 큰따옴표 안에서 이스케이프한다.
 * 검색어에 쉼표가 들어가면 필터 구문 자체가 깨지기 때문이다.
 */
function toQuotedIlikeFilter(keyword: string): string {
  const escaped = keyword.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `name.ilike."%${escaped}%"`;
}

/**
 * GET /api/ingredients?householdId=&startDate=&endDate=&q=&q=&page=&pageSize= — 장보기 내역 조회
 * q는 반복 파라미터다. 클라이언트가 검색어를 유사어 그룹으로 확장해 여러 개를 보내면 OR로 묶는다.
 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchKeywords = searchParams
    .getAll('q')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.max(1, Number(searchParams.get('pageSize') ?? '200'));

  if (!householdId || !startDate || !endDate) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId, startDate, endDate가 필요합니다.');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('ingredients')
    .select('*', { count: 'exact' })
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })
    .range(from, to);

  if (searchKeywords.length === 1) {
    query = query.ilike('name', `%${searchKeywords[0]}%`);
  } else if (searchKeywords.length > 1) {
    query = query.or(searchKeywords.map(toQuotedIlikeFilter).join(','));
  }

  const { data, count, error } = await query;

  if (error) return apiResponse.INTERNAL_ERROR();

  const ingredients = (data ?? []) as Ingredient[];

  const fridgeItemIds = [
    ...new Set(ingredients.map((i) => i.linked_fridge_item_id).filter((id): id is string => !!id)),
  ];
  const fridgeBatchIds = [
    ...new Set(ingredients.map((i) => i.linked_fridge_batch_id).filter((id): id is string => !!id)),
  ];

  // 식단 사용 여부의 완전한 출처는 dish_ingredients다.
  // meal_batch_usages는 차감 수량 원장이라 g/kg 'used'처럼 차감이 없는 사용은 행이 남지 않는다.
  const [usedByItemResult, usedByBatchResult] = await Promise.all([
    fridgeItemIds.length
      ? supabase
          .from('dish_ingredients')
          .select('fridge_item_id')
          .in('fridge_item_id', fridgeItemIds)
      : Promise.resolve({ data: [] as { fridge_item_id: string }[], error: null }),
    fridgeBatchIds.length
      ? supabase.from('dish_ingredients').select('batch_id').in('batch_id', fridgeBatchIds)
      : Promise.resolve({ data: [] as { batch_id: string | null }[], error: null }),
  ]);

  // 조회에 실패하면 사용 중인 재료가 미사용으로 보여 삭제가 열리므로 에러를 삼키지 않는다
  if (usedByItemResult.error || usedByBatchResult.error) return apiResponse.INTERNAL_ERROR();

  const usedFridgeItemIds = new Set((usedByItemResult.data ?? []).map((row) => row.fridge_item_id));
  const usedFridgeBatchIds = new Set(
    (usedByBatchResult.data ?? [])
      .map((row) => row.batch_id)
      .filter((id): id is string => id !== null),
  );

  const contents = ingredients.map((ingredient) => ({
    ...ingredient,
    has_meal_usage:
      (!!ingredient.linked_fridge_item_id &&
        usedFridgeItemIds.has(ingredient.linked_fridge_item_id)) ||
      (!!ingredient.linked_fridge_batch_id &&
        usedFridgeBatchIds.has(ingredient.linked_fridge_batch_id)),
  }));

  const totalElements = count ?? 0;
  const totalPages = Math.ceil(totalElements / pageSize);

  const pageInfo: PageInfo = {
    page,
    pageSize,
    totalElements,
    totalPages,
    numberOfElements: contents.length,
    empty: contents.length === 0,
    first: page === 1,
    last: page >= totalPages,
  };

  const result: Page<Ingredient[]> = {
    contents,
    pageInfo,
  };

  return apiResponse.OK(result);
});

/** POST /api/ingredients — 장보기 항목 추가 */
export const POST = withAuth(async (req: NextRequest, { userId, supabase }) => {
  const body = await req.json();

  const { data, error } = await supabase.rpc('add_ingredient_with_fridge', {
    p_household_id: body.household_id,
    p_name: body.name,
    p_price: body.price ?? 0,
    p_store: body.store ?? null,
    p_brand: body.brand ?? null,
    p_category_id: body.category_id,
    p_count: body.count ?? 1,
    p_unit: body.unit ?? 'count',
    p_date: body.date ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  if (!body.skipNotification) {
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

      dispatchHouseholdNotification({
        accessToken: session.access_token,
        householdId: body.household_id,
        triggeredBy: userId,
        type: 'fridge_item_added',
        title: '냉장고 재료 추가',
        body: `${nickname}님이 ${josa(body.name, '을/를')} 추가했어요`,
      });
    })();
  }

  return apiResponse.CREATED(data);
});

/** PUT /api/ingredients — 장보기 항목 수정 */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const patch = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as Json;

  const { data, error } = await supabase.rpc('update_ingredient_with_fridge', {
    p_ingredient_id: id,
    p_updates: patch,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** DELETE /api/ingredients?id= — 장보기 항목 삭제 */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('delete_ingredient_with_cleanup', {
    p_ingredient_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
