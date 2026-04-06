import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { type IngredientCategoryOption } from '../model/types';

import { ingredientCategoryKeys } from './queryKey';

const INGREDIENT_CATEGORY_STALE_TIME = 1000 * 60 * 60 * 6;
const INGREDIENT_CATEGORY_GC_TIME = 1000 * 60 * 60 * 24;

/** 카테고리 목록 조회 (전역 + 현재 가구 커스텀 병합) */
export function useIngredientCategoriesQuery(householdId: string | null) {
  return useQuery({
    queryKey: ingredientCategoryKeys.list(householdId ?? 'global'),
    staleTime: INGREDIENT_CATEGORY_STALE_TIME,
    gcTime: INGREDIENT_CATEGORY_GC_TIME,
    queryFn: () =>
      apiClient.get<IngredientCategoryOption[]>('/api/ingredient-categories', {
        ...(householdId && { householdId }),
      }),
  });
}
