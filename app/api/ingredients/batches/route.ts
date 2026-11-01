import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/ingredients/batches?ingredientId= — 장보기 항목에 연결된 활성 배치와 식단 사용량 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const ingredientId = req.nextUrl.searchParams.get('ingredientId');

  if (!ingredientId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'ingredientId가 필요합니다.');
  }

  // 한 트랜잭션에서 만든 배치는 created_at이 같으므로 유통기한과 id로 순서를 고정한다.
  const { data: batches, error } = await supabase
    .from('fridge_item_batches')
    .select('id, quantity, initial_quantity, expiry_date')
    .eq('ingredient_id', ingredientId)
    .is('deleted_at', null)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('id', { ascending: true });

  if (error) return apiResponse.INTERNAL_ERROR();

  const batchIds = (batches ?? []).map((batch) => batch.id);
  const { data: usages, error: usageError } = batchIds.length
    ? await supabase.from('meal_batch_usages').select('batch_id, amount').in('batch_id', batchIds)
    : { data: [] as { batch_id: string; amount: number }[], error: null };

  // 사용량을 모르면 등록 수량 하한이 사라지므로 에러를 삼키지 않는다
  if (usageError) return apiResponse.INTERNAL_ERROR();

  const usedAmountByBatchId = new Map<string, number>();
  for (const usage of usages ?? []) {
    usedAmountByBatchId.set(
      usage.batch_id,
      (usedAmountByBatchId.get(usage.batch_id) ?? 0) + Number(usage.amount),
    );
  }

  return apiResponse.OK(
    (batches ?? []).map((batch) => ({
      ...batch,
      used_amount: usedAmountByBatchId.get(batch.id) ?? 0,
    })),
  );
});
