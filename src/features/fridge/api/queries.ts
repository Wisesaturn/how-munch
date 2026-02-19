import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { type Database } from '@/commons/types';

import { type FridgeItemWithBatches } from '@/entities/fridge-item';

import { fridgeKeys } from './queryKey';

type FridgePreferenceRow = Database['public']['Tables']['fridge_preferences']['Row'];

/**
 * @description 냉장고 조회 관련 DB 에러를 사용자 메시지로 매핑합니다.
 */
function resolveFridgeQueryError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('냉장고 데이터 조회 중 오류가 발생했습니다.');
}

/** 냉장고 재고 전체 조회 (배치 포함) */
export function useFridgeItemsQuery(householdId: string | null, searchInput = '') {
  const normalizedSearchKeyword = searchInput.trim();

  return useQuery({
    queryKey: fridgeKeys.list(householdId ?? '', normalizedSearchKeyword),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id ?? null;

          let hideDepletedFridgeItems = false;
          if (userId) {
            const { data: fridgePreferences, error: fridgePreferenceError } = await supabase
              .from('fridge_preferences')
              .select('hide_depleted_fridge_items')
              .eq('user_id', userId)
              .maybeSingle();

            if (fridgePreferenceError) throw resolveFridgeQueryError(fridgePreferenceError);
            hideDepletedFridgeItems = fridgePreferences?.hide_depleted_fridge_items ?? false;
          }

          let query = supabase
            .from('fridge_items')
            .select('*, fridge_item_batches(*), meal_batch_usages(*)')
            .eq('household_id', householdId)
            .is('deleted_at', null)
            .order('name');

          if (hideDepletedFridgeItems) {
            query = query.gt('total_count', 0);
          }

          if (normalizedSearchKeyword) {
            query = query.ilike('name', `%${normalizedSearchKeyword}%`);
          }

          const { data, error } = await query;

          if (error) throw resolveFridgeQueryError(error);
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
          if (error) throw resolveFridgeQueryError(error);

          return (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        }
      : skipToken,
  });
}

/** 내 냉장고 표시 설정 조회 */
export function useFridgePreferencesQuery(userId: string | null) {
  return useQuery({
    queryKey: fridgeKeys.preferences(userId ?? ''),
    queryFn: userId
      ? async () => {
          const supabase = createClient();
          const { data, error } = await supabase
            .from('fridge_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) throw resolveFridgeQueryError(error);
          return data as FridgePreferenceRow | null;
        }
      : skipToken,
  });
}
