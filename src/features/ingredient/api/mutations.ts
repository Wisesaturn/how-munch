import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Database } from '@/commons/model/types';

import { fridgeItemKeys } from '@/entities/fridge-item';
import { ingredientKeys, type Ingredient } from '@/entities/ingredient';
import { type IngredientCategoryOption } from '@/entities/ingredient-category';

import { type StagedItem } from '../lib/parseAiResponse';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IngredientInsert & { skipNotification?: boolean }) =>
      apiClient.post<Ingredient>('/api/ingredients', input),
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

/** 영수증 이미지를 Claude Vision으로 분석해 파싱된 항목(StagedItem[])을 받아온다 */
export function useParseReceiptMutation() {
  return useMutation({
    mutationFn: (input: {
      imageBase64: string;
      mimeType: string;
      categories: IngredientCategoryOption[];
    }) => apiClient.post<{ items: StagedItem[] }>('/api/ingredients/parse-receipt', input),
  });
}

/** AI 다중 추가 후 가구 활동 알림 단건 통합 발송 */
export function useDispatchHouseholdActivityMutation() {
  return useMutation({
    mutationFn: (input: { householdId: string; itemNames: string[]; triggeredBy: string }) =>
      apiClient.post('/api/notification/household-activity', input),
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
