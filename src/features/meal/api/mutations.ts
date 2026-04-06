import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { fridgeItemKeys } from '@/entities/fridge-item';
import { mealKeys, type MealType } from '@/entities/meal';

export interface MealEditorDishInput {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    amount: number;
  }>;
}

interface UpsertMealInput {
  householdId: string;
  date: string;
  type: MealType;
  dishes: MealEditorDishInput[];
}

/** 식단 저장(해당 meal type 전체 교체) */
export function useUpsertMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertMealInput) => apiClient.post('/api/meals', input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealKeys.listByDate(variables.householdId, variables.date),
      });
      queryClient.invalidateQueries({
        queryKey: mealKeys.fridgeItems(variables.householdId),
      });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    },
  });
}

interface ReorderDishesInput {
  householdId: string;
  date: string;
  updates: Array<{
    dish_id: string;
    sort_order: number;
  }>;
}

/** 끼니 내 dish 순서(sort_order) 배치 업데이트 */
export function useReorderDishesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ householdId, updates }: ReorderDishesInput) =>
      apiClient.patch('/api/meals/dishes', { householdId, updates }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealKeys.listByDate(variables.householdId, variables.date),
      });
    },
  });
}

/** 식단 삭제 */
export function useDeleteMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      householdId,
      date,
    }: {
      id: string;
      householdId: string;
      date: string;
    }) => {
      await apiClient.delete(`/api/meals?id=${id}`);
      return { householdId, date };
    },
    onSuccess: ({ householdId, date }) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.listByDate(householdId, date) });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItems(householdId) });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
    },
  });
}
