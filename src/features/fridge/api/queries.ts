import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { fridgeItemKeys, type FridgeItemWithBatches } from '@/entities/fridge-item';
import { useSynonymExpandedTerms } from '@/entities/search-synonym';

interface FridgePreferences {
  user_id: string;
  hide_depleted_fridge_items: boolean;
}

/**
 * 냉장고 재고 전체 조회 (배치 포함)
 * 검색어는 유사어 그룹으로 확장해 서버에 반복 파라미터로 넘긴다.
 * 유사어 사전이 로드되기 전에는 검색어 하나만 넘어가므로 기존 동작과 같다.
 */
export function useFridgeItemsQuery({
  householdId,
  userId,
  searchInput = '',
}: {
  householdId: string | null;
  userId: string;
  searchInput?: string;
}) {
  const searchKeywords = useSynonymExpandedTerms(searchInput);

  return useQuery({
    queryKey: fridgeItemKeys.list(householdId ?? '', userId, searchKeywords.join('|')),
    queryFn: householdId
      ? () =>
          apiClient.get<FridgeItemWithBatches[]>('/api/fridge', {
            householdId,
            ...(searchKeywords.length > 0 && { search: searchKeywords }),
          })
      : skipToken,
  });
}

/** 배치별 식단 사용량 합계 및 연결 여부 조회 */
export function useBatchUsedAmountQuery(batchId: string | null) {
  return useQuery({
    queryKey: fridgeItemKeys.batchUsage(batchId ?? ''),
    queryFn: batchId
      ? () =>
          apiClient.get<{ usedAmount: number; hasUsage: boolean }>('/api/fridge/batch-usage', {
            batchId,
          })
      : skipToken,
  });
}

/** 내 냉장고 표시 설정 조회 */
export function useFridgePreferencesQuery(userId: string | null) {
  return useQuery({
    queryKey: fridgeItemKeys.preferences(userId ?? ''),
    queryFn: userId
      ? () => apiClient.get<FridgePreferences | null>('/api/fridge/preferences')
      : skipToken,
  });
}

/** 냉장고 브랜드 목록 조회 — 자동완성용 */
export function useFridgeBrandNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: fridgeItemKeys.brands(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<string[]>('/api/fridge/brands', { householdId })
      : skipToken,
  });
}

export {
  useCategoryExpiryDefaultsQuery,
  type CategoryExpiryDefaultRow,
  type CategoryExpiryDefaultsMap,
} from '@/entities/fridge-item';
