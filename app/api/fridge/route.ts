import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/fridge?householdId=&search= — 냉장고 재고 전체 조회 (배치 포함) */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const householdId = searchParams.get('householdId');
  const search = searchParams.get('search');

  if (!householdId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'householdId가 필요합니다.');
  }

  const { data, error } = await supabase.rpc('get_fridge_items_with_active_batches', {
    p_household_id: householdId,
    p_search_keyword: search || null,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data ?? []);
});

/** POST /api/fridge — 냉장고 아이템 + 첫 배치 동시 추가 */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { item, batch } = body;

  if (!item || !batch) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const { data, error } = await supabase.rpc('create_fridge_item_with_batch', {
    p_household_id: item.household_id,
    p_name: item.name,
    p_brand: item.brand ?? null,
    p_category_id: item.category_id,
    p_unit: item.unit ?? 'count',
    p_is_subdivided: item.is_subdivided ?? false,
    p_from_grocery: item.from_grocery ?? false,
    p_quantity: batch.quantity,
    p_purchased_date: batch.purchased_date,
    p_expiry_date: batch.expiry_date ?? null,
    p_memo: batch.memo ?? null,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.CREATED(data);
});

/** PUT /api/fridge — 냉장고 아이템 메타 수정 */
export const PUT = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('fridge_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.OK(data);
});

/** DELETE /api/fridge?id= — 냉장고 아이템 소프트 삭제 */
export const DELETE = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const id = searchParams.get('id');

  if (!id) {
    return apiResponse.BAD_REQUEST('CMN_002', 'id가 필요합니다.');
  }

  const { error } = await supabase.rpc('soft_delete_fridge_item', {
    p_fridge_item_id: id,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
