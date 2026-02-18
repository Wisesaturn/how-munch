import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { fridgeKeys } from '@/commons/model/queryKey';

import { type MealType } from '@/entities/meal';

import { mealKeys } from './queryKey';

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

function toSafePositiveAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  return amount;
}

/** 식단 저장(해당 meal type 전체 교체) */
export function useUpsertMealMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ householdId, date, type, dishes }: UpsertMealInput) => {
      const supabase = createClient();

      const normalizedDishes = dishes.map((dish, index) => ({
        name: dish.name.trim() || '[이름 없음]',
        sort_order: index,
        ingredients: dish.ingredients
          .map((ingredient) => ({
            fridge_item_id: ingredient.fridge_item_id,
            amount: toSafePositiveAmount(ingredient.amount),
          }))
          .filter((ingredient) => !!ingredient.fridge_item_id && ingredient.amount > 0),
      }));

      const { data, error } = await supabase.rpc('upsert_meal_with_usage', {
        p_household_id: householdId,
        p_date: date,
        p_type: type,
        p_dishes: normalizedDishes,
      });
      if (error) throw error;

      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealKeys.listByDate(variables.householdId, variables.date),
      });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItems(variables.householdId) });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
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
      const supabase = createClient();

      const { error } = await supabase.rpc('delete_meal_with_usage_restore', {
        p_meal_id: id,
      });
      if (error) throw error;

      return { householdId, date };
    },
    onSuccess: ({ householdId, date }) => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.listByDate(householdId, date) });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItems(householdId) });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
