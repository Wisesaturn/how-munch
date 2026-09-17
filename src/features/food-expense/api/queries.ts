import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Page } from '@/commons/model/types';

import {
  foodExpenseKeys,
  type FoodExpense,
  type FoodExpenseFilterKind,
} from '@/entities/food-expense';
import { useSynonymExpandedTerms } from '@/entities/search-synonym';

/**
 * @description 기간 + 종류별 식비 통합 내역 조회 (장보기 + 외식비).
 * StorePage 월 조회용이라 pageSize=200으로 해당 월 전체를 한 번에 받는다.
 */
export function useFoodExpensesQuery(
  householdId: string | null,
  startDate: string,
  endDate: string,
  kind: FoodExpenseFilterKind = 'all',
) {
  return useQuery({
    queryKey: foodExpenseKeys.list(householdId ?? '', startDate, endDate, kind),
    queryFn: householdId
      ? () =>
          apiClient.get<Page<FoodExpense[]>>('/api/food-expenses', {
            householdId,
            startDate,
            endDate,
            kind,
            page: '1',
            pageSize: '200',
          })
      : skipToken,
    select: (data) => data.contents,
  });
}

/**
 * @description 기간 + 종류 + 검색어 기반 식비 통합 내역 무한 스크롤 조회.
 * q가 비어있으면 쿼리를 실행하지 않는다 (skipToken). pageSize=20으로 페이지네이션.
 */
export function useFoodExpenseSearchInfiniteQuery(
  householdId: string | null,
  startDate: string,
  endDate: string,
  kind: FoodExpenseFilterKind,
  q: string,
) {
  // 검색어를 유사어 그룹으로 확장해 반복 파라미터로 넘긴다.
  // 사전 로드 전에는 검색어 하나만 넘어가므로 기존 동작과 같다.
  const searchKeywords = useSynonymExpandedTerms(q);

  return useInfiniteQuery({
    queryKey: foodExpenseKeys.search(
      householdId ?? '',
      startDate,
      endDate,
      kind,
      searchKeywords.join('|'),
    ),
    queryFn:
      householdId && searchKeywords.length > 0
        ? ({ pageParam }: { pageParam: number }) =>
            apiClient.get<Page<FoodExpense[]>>('/api/food-expenses', {
              householdId,
              startDate,
              endDate,
              kind,
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

/**
 * @description 자동완성 후보 조회.
 * 목록과 달리 화면의 종류 필터를 타지 않는다. 포장·배달만 보고 있어도 장보기 품목명을 추천해야 한다.
 */
export function useFoodExpenseSuggestionsQuery(
  householdId: string | null,
  field: 'name' | 'brand' | 'store',
  kind: FoodExpenseFilterKind,
) {
  return useQuery({
    queryKey: foodExpenseKeys.suggestions(householdId ?? '', field, kind),
    queryFn: householdId
      ? () =>
          apiClient.get<string[]>('/api/food-expenses/suggestions', { householdId, field, kind })
      : skipToken,
  });
}
