import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { fridgeKeys } from './queryKey';

/** 냉장고 재고 전체 조회 (배치 포함) */
export function useFridgeItemsQuery(householdId: string | null) {
  return useQuery({
    queryKey: fridgeKeys.list(householdId ?? ''),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data, error } = await supabase
            .from('fridge_items')
            .select('*, fridge_item_batches(*), meal_batch_usages(*)')
            .eq('household_id', householdId)
            .is('deleted_at', null)
            .order('name');

          if (error) throw error;
          return data as unknown as FridgeItemWithBatches[];
        }
      : skipToken,
  });
}

/** 배치별 식단 사용량 합계 조회 */
export function useBatchUsedAmountQuery(batchId: string | null) {
  return useQuery({
    queryKey: fridgeKeys.batchUsage(batchId ?? ''),
    queryFn: batchId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('meal_batch_usages')
            .select('amount')
            .eq('batch_id', batchId);
          if (error) throw error;

          return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        }
      : skipToken,
  });
}
