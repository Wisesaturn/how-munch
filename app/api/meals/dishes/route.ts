import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

interface ReorderDishesBody {
  householdId: string;
  updates: Array<{
    dish_id: string;
    sort_order: number;
  }>;
}

/** PATCH /api/meals/dishes — 끼니 내 dish 순서(sort_order) 배치 업데이트 */
export const PATCH = withAuth(async (req: NextRequest, { supabase }) => {
  const body: ReorderDishesBody = await req.json();
  const { householdId, updates } = body;

  if (!householdId || !Array.isArray(updates) || updates.length === 0) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const { error } = await supabase.rpc('reorder_dishes', {
    p_household_id: householdId,
    p_updates: updates,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.NO_CONTENT();
});
