import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { ingredientKeys } from '@/entities/ingredient';

/** 장보기 항목에 연결된 활성 배치 */
export interface IngredientBatchSummary {
  id: string;
  quantity: number;
  initial_quantity: number;
  expiry_date: string | null;
  /** 식단에서 사용한 수량 — 등록 수량의 하한 */
  used_amount: number;
}

/** 장보기 항목에 연결된 활성 배치 조회 */
export function useIngredientBatchesQuery(ingredientId: string) {
  return useQuery({
    queryKey: ingredientKeys.batches(ingredientId),
    queryFn: () =>
      apiClient.get<IngredientBatchSummary[]>('/api/ingredients/batches', { ingredientId }),
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

/** 브랜드 목록 조회 — 자동완성용 */
export function useIngredientBrandNamesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientKeys.brands(householdId ?? ''),
    queryFn: householdId
      ? () => apiClient.get<string[]>('/api/ingredients/brands', { householdId })
      : skipToken,
  });
}
