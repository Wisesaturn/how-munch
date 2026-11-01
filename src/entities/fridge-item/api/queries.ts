import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { fridgeItemKeys } from './queryKey';

export interface CategoryExpiryDefaultRow {
  category_id: string;
  default_expiry_days: number;
}

/** categoryId → 기본 유효기간(일수) 맵 */
export type CategoryExpiryDefaultsMap = Record<string, number>;

// 가구 카테고리 기본 유효기간은 자주 바뀌지 않으므로 카테고리 목록과 동일하게 6시간 캐시한다.
const CATEGORY_EXPIRY_DEFAULTS_STALE_TIME = 1000 * 60 * 60 * 6;

/** 가구 카테고리별 기본 유효기간 조회 (categoryId → 일수 맵으로 변환) */
export function useCategoryExpiryDefaultsQuery(householdId: string | null) {
  return useQuery({
    queryKey: fridgeItemKeys.categoryExpiryDefaults(householdId ?? ''),
    staleTime: CATEGORY_EXPIRY_DEFAULTS_STALE_TIME,
    queryFn: householdId
      ? () =>
          apiClient.get<CategoryExpiryDefaultRow[]>('/api/fridge/category-expiry-defaults', {
            householdId,
          })
      : skipToken,
    select: (rows): CategoryExpiryDefaultsMap =>
      Object.fromEntries(rows.map((row) => [row.category_id, row.default_expiry_days])),
  });
}
