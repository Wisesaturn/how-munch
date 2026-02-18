import { useCallback, useMemo } from 'react';

import { useIngredientCategoriesQuery } from '../api/queries';

import { type IngredientCategoryOption } from './types';

interface UseIngredientCategoryResult {
  categories: IngredientCategoryOption[];
  getCategoryById: (categoryId: string) => IngredientCategoryOption | null;
}

/**
 * @description household 범위 카테고리를 조회하고, id 기반 조회 함수(getCategoryById)를 제공합니다.
 */
export function useIngredientCategory(householdId: string | null): UseIngredientCategoryResult {
  const { data: categories = [] } = useIngredientCategoriesQuery(householdId);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories],
  );

  const getCategoryById = useCallback(
    (categoryId: string) => categoryById.get(categoryId) ?? null,
    [categoryById],
  );

  return {
    categories,
    getCategoryById,
  };
}
