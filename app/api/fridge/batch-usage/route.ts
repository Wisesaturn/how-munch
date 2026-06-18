import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { apiResponse } from '@/commons/lib/http/apiResponse';

/** GET /api/fridge/batch-usage?batchId= — 배치별 식단 사용량 합계 조회 */
export const GET = withAuth(async (req: NextRequest, { supabase }) => {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return apiResponse.BAD_REQUEST('CMN_002', 'batchId가 필요합니다.');
  }

  const { data, error } = await supabase
    .from('meal_batch_usages')
    .select('amount')
    .eq('batch_id', batchId);

  if (error) return apiResponse.INTERNAL_ERROR();

  const rows = data ?? [];
  const usedAmount = rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  return apiResponse.OK({ usedAmount, hasUsage: rows.length > 0 });
});
