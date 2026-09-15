import { skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { diningExpenseKeys, type DiningExpenseKind } from '@/entities/dining-expense';

/**
 * @description 외식비 입력 자동완성 후보 조회.
 * kind로 스코프를 걸어 장보기 구매처("이마트")가 외식 가게 후보로 뜨지 않게 한다.
 */
export function useDiningExpenseSuggestionsQuery(
  householdId: string | null,
  field: 'brand' | 'store',
  kind: DiningExpenseKind,
) {
  return useQuery({
    queryKey: diningExpenseKeys.suggestions(householdId ?? '', field, kind),
    queryFn: householdId
      ? () =>
          apiClient.get<string[]>('/api/food-expenses/suggestions', { householdId, field, kind })
      : skipToken,
  });
}
