import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Database } from '@/commons/types';

import { fridgeItemKeys } from '@/entities/fridge-item';
import { ingredientKeys, type Ingredient } from '@/entities/ingredient';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IngredientInsert) => apiClient.post<Ingredient>('/api/ingredients', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    },
  });
}

/** 장보기 항목 수정 (I-06) */
export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...updates }: IngredientUpdate & { id: string }) =>
      apiClient.put<Ingredient>('/api/ingredients', { id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    },
  });
}

/** 장보기 항목 삭제 (I-06) */
export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/ingredients?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    },
  });
}
