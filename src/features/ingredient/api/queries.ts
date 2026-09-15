import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { ingredientKeys } from '@/entities/ingredient';

/** 구매처 목록 조회 — 자동완성용 (I-05) */
export function useStoreNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientKeys.stores(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<string[]>('/api/ingredients/stores', { householdId })
      : skipToken,
  });
}

/** 브랜드 목록 조회 — 자동완성용 */
export function useIngredientBrandNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientKeys.brands(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<string[]>('/api/ingredients/brands', { householdId })
      : skipToken,
  });
}
