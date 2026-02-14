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
            .select('*, fridge_item_batches(*)')
            .eq('household_id', householdId)
            .order('name');

          if (error) throw error;
          return data as unknown as FridgeItemWithBatches[];
        }
      : skipToken,
  });
}
