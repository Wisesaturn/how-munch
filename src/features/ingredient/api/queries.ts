import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { ingredientKeys, type Ingredient } from '@/entities/ingredient';

/** 월별 장보기 내역 조회 (I-01) */
export function useIngredientsQuery(householdId: string | null, year: number, month: number) {
  return useQuery({
    queryKey: ingredientKeys.list(householdId ?? '', year, month),
    queryFn: householdId
      ? () =>
          apiClient.get<Ingredient[]>('/api/ingredients', {
            householdId,
            year: String(year),
            month: String(month),
          })
      : skipToken,
  });
}

/** 구매처 목록 조회 — 자동완성용 (I-05) */
export function useStoreNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientKeys.stores(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<string[]>('/api/ingredients/stores', { householdId })
      : skipToken,
  });
}
