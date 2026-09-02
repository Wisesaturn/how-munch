import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Page } from '@/commons/model/types';

import { ingredientKeys, type Ingredient } from '@/entities/ingredient';
import { useSynonymExpandedTerms } from '@/entities/search-synonym';

/**
 * @description 기간별 장보기 내역 조회 (I-01).
 * startDate~endDate 범위의 전체 내역을 반환한다. StorePage 월 조회 시 pageSize=200.
 */
export function useIngredientsQuery(
  householdId: string | null,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: ingredientKeys.list(householdId ?? '', startDate, endDate),
    queryFn: householdId
      ? () =>
          apiClient.get<Page<Ingredient[]>>('/api/ingredients', {
            householdId,
            startDate,
            endDate,
            page: '1',
            pageSize: '200',
          })
      : skipToken,
    select: (data) => data.contents,
  });
}

/**
 * @description 기간 + 검색어 기반 장보기 내역 무한 스크롤 조회.
 * q가 비어있으면 쿼리를 실행하지 않는다 (skipToken). pageSize=20으로 페이지네이션.
 */
export function useIngredientSearchInfiniteQuery(
  householdId: string | null,
  startDate: string,
  endDate: string,
  q: string,
) {
  // 검색어를 별칭 그룹으로 확장해 반복 파라미터로 넘긴다.
  // 사전 로드 전에는 검색어 하나만 넘어가므로 기존 동작과 같다.
  const searchKeywords = useSynonymExpandedTerms(q);

  return useInfiniteQuery({
    queryKey: ingredientKeys.search(
      householdId ?? '',
      startDate,
      endDate,
      searchKeywords.join('|'),
    ),
    queryFn:
      householdId && searchKeywords.length > 0
        ? ({ pageParam }: { pageParam: number }) =>
            apiClient.get<Page<Ingredient[]>>('/api/ingredients', {
              householdId,
              startDate,
              endDate,
              q: searchKeywords,
              page: String(pageParam),
              pageSize: '20',
            })
        : skipToken,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.last ? undefined : lastPage.pageInfo.page + 1,
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
