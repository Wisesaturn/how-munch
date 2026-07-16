import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/fridge/category-expiry-defaults?householdId= — 가구 카테고리별 기본 유효기간 목록 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const householdId = req.nextUrl.searchParams.get('householdId');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('fridge_category_expiry_defaults')
    .select('category_id, default_expiry_days')
    .eq('household_id', householdId);

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data ?? []);
});

/**
 * PUT /api/fridge/category-expiry-defaults — 카테고리별 기본 유효기간 설정 저장
 * body: { householdId, categoryId, days }
 * days가 null이면 해당 카테고리 설정을 제거(미설정으로 되돌림)한다.
 */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const householdId = body.householdId as string | undefined;
  const categoryId = body.categoryId as string | undefined;
  const days = body.days as number | null | undefined;

  if (!householdId || !categoryId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId와 categoryId가 필요합니다.');
  }

  if (days === null || days === undefined) {
    const { error } = await supabase
      .from('fridge_category_expiry_defaults')
      .delete()
      .eq('household_id', householdId)
      .eq('category_id', categoryId);

    if (error) {
      const domainError = resolveDomainError(error);
      if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
      return apiResponse.INTERNAL_ERROR();
    }

    return apiResponse.NO_CONTENT();
  }

  if (!Number.isInteger(days) || days < 1 || days > 180) {
    return apiResponse.BAD_REQUEST('CMN_002', '기본 유효기간은 1~180일 사이여야 합니다.');
  }

  const { error } = await supabase.from('fridge_category_expiry_defaults').upsert(
    {
      household_id: householdId,
      category_id: categoryId,
      default_expiry_days: days,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'household_id,category_id' },
  );

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
