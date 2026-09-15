import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { budgetKeys, type Budget, type BudgetAmountMap } from '@/entities/budget';

/** 해당 월 예산 일괄 저장 — 4개 scope가 한 트랜잭션으로 쓰인다 */
export function useUpsertBudgetsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      householdId: string;
      yearMonth: string;
      budgets: Partial<BudgetAmountMap>;
    }) => apiClient.put<Budget[]>('/api/budgets', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
