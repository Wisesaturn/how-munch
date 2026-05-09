import { type NextRequest } from 'next/server';

import { withAuth } from '@/apps/route';

import { resolveDomainError } from '@/commons/lib';
import { apiResponse } from '@/commons/lib/http/apiResponse';

/** POST /api/fridge/subdivide — 냉장고 재료 소분 (FIFO 차감 + 새 독립 아이템 생성) */
export const POST = withAuth(async (req: NextRequest, { supabase }) => {
  const body = await req.json();
  const { source_item_id, consume_amount, new_item_name, new_item_quantity, new_expiry_date } =
    body as {
      source_item_id: string;
      consume_amount: number;
      new_item_name: string;
      new_item_quantity: number;
      new_expiry_date?: string | null;
    };

  if (!source_item_id || !consume_amount || !new_item_name || !new_item_quantity) {
    return apiResponse.BAD_REQUEST('CMN_002', '필수 항목이 누락되었습니다.');
  }

  const { data, error } = await supabase.rpc('subdivide_fridge_item', {
    p_source_item_id: source_item_id,
    p_consume_amount: consume_amount,
    p_new_item_name: new_item_name,
    p_new_item_quantity: new_item_quantity,
    p_new_expiry_date: new_expiry_date ?? null,
  });

  if (error) {
    const domainError = resolveDomainError(error);
    if (domainError) return apiResponse.CONFLICT(domainError.code, domainError.message);
    return apiResponse.INTERNAL_ERROR();
  }

  return apiResponse.CREATED(data);
});
