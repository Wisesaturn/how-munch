import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';

import { fridgeItemKeys } from '@/entities/fridge-item';
import { type IngredientUnit } from '@/entities/ingredient';
import { mealKeys, type MealType } from '@/entities/meal';

export interface MealEditorDishInput {
  name: string;
  ingredients: Array<{
    fridge_item_id: string;
    /** 개 단위: 수량. g/kg/ml/L 단위: 0 (Route Handler에서 무시) */
    amount?: number;
    /** 항상 포함 — g/kg/ml/L: 'used' | 'depleted'. 개 단위: 항상 'used' */
    usage_status: 'used' | 'depleted';
    /** 냉장고 품목 단위 — Route Handler에서 g/kg/ml/L vs 개 판별에 사용 */
    unit?: IngredientUnit;
  }>;
}

interface UpsertMealInput {
  householdId: string;
  date: string;
  type: MealType;
  dishes: MealEditorDishInput[];
  isNew?: boolean;
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

/**
 * @deprecated MealPage의 드래그앤드롭 UI가 제거되면서 호출처가 없어졌습니다.
 * sort_order 재활용 시 순서 변경 UI를 다시 구현할 때 함께 복구합니다.
 * 서버 RPC(reorder_dishes)와 API 엔드포인트(PATCH /api/meals/dishes)는 유지됩니다.
 */
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
