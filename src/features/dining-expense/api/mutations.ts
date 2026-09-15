import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Database } from '@/commons/model/types';

import { diningExpenseKeys, type DiningExpense } from '@/entities/dining-expense';
import { foodExpenseKeys } from '@/entities/food-expense';

type DiningExpenseInsert = Database['public']['Tables']['dining_expenses']['Insert'];
type DiningExpenseUpdate = Database['public']['Tables']['dining_expenses']['Update'];

/** 외식비는 냉장고·식단과 연결되지 않으므로 통합 목록과 자동완성 후보만 갱신하면 된다 */
function useInvalidateDiningExpenses() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: foodExpenseKeys.all });
    queryClient.invalidateQueries({ queryKey: diningExpenseKeys.all });
  };
}

/** 외식비 추가 */
export function useAddDiningExpenseMutation() {
  const invalidate = useInvalidateDiningExpenses();

  return useMutation({
    mutationFn: (input: Omit<DiningExpenseInsert, 'user_id'>) =>
      apiClient.post<DiningExpense>('/api/food-expenses', input),
    onSuccess: invalidate,
  });
}

/** 외식비 수정 */
export function useUpdateDiningExpenseMutation() {
  const invalidate = useInvalidateDiningExpenses();

  return useMutation({
    mutationFn: ({ id, ...updates }: DiningExpenseUpdate & { id: string }) =>
      apiClient.put<DiningExpense>('/api/food-expenses', { id, ...updates }),
    onSuccess: invalidate,
  });
}

/** 외식비 삭제 (소프트 삭제) */
export function useDeleteDiningExpenseMutation() {
  const invalidate = useInvalidateDiningExpenses();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/food-expenses?id=${id}`),
    onSuccess: invalidate,
  });
}
