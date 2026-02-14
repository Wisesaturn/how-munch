import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { type MealType } from '@/entities/meal';

import { mealKeys } from './queryKey';

type MealInsert = Database['public']['Tables']['meals']['Insert'];
type DishInsert = Database['public']['Tables']['dishes']['Insert'];
type DishIngredientInsert = Database['public']['Tables']['dish_ingredients']['Insert'];

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
    mutationFn: async ({ householdId, date, type, dishes }: UpsertMealInput) => {
      const supabase = createClient();

      const mealInput: MealInsert = {
        household_id: householdId,
        date,
        type,
      };

      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .upsert(mealInput, { onConflict: 'household_id,date,type' })
        .select('*')
        .single();

      if (mealError) throw mealError;

      const { error: deleteDishError } = await supabase
        .from('dishes')
        .delete()
        .eq('meal_id', meal.id);
      if (deleteDishError) throw deleteDishError;

      const normalizedDishes = dishes
        .map((dish) => ({
          ...dish,
          name: dish.name.trim() || '[이름 없음]',
          ingredients: dish.ingredients.filter(
            (ingredient) => !!ingredient.fridge_item_id && ingredient.amount > 0,
          ),
        }))
        .filter((dish) => dish.name || dish.ingredients.length > 0);

      if (normalizedDishes.length === 0) {
        return meal.id;
      }

      const dishInputs: DishInsert[] = normalizedDishes.map((dish, index) => ({
        meal_id: meal.id,
        name: dish.name,
        sort_order: index,
      }));

      const { data: insertedDishes, error: insertDishError } = await supabase
        .from('dishes')
        .insert(dishInputs)
        .select('id, sort_order');
      if (insertDishError) throw insertDishError;

      const dishIdBySortOrder = new Map(
        (insertedDishes ?? []).map((dish) => [dish.sort_order, dish.id]),
      );

      const ingredientInputs: DishIngredientInsert[] = normalizedDishes.flatMap(
        (dish, sortOrder) => {
          const dishId = dishIdBySortOrder.get(sortOrder);
          if (!dishId) return [];

          return dish.ingredients.map((ingredient) => ({
            dish_id: dishId,
            fridge_item_id: ingredient.fridge_item_id,
            amount: ingredient.amount,
          }));
        },
      );

      if (ingredientInputs.length > 0) {
        const { error: insertIngredientError } = await supabase
          .from('dish_ingredients')
          .insert(ingredientInputs);
        if (insertIngredientError) throw insertIngredientError;
      }

      return meal.id;
    },
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
    mutationFn: async ({ id }: { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mealKeys.all });
    },
  });
}
