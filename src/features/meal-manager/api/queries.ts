import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { type Meal } from '@/entities/meal';

import { mealKeys } from './queryKey';

type FridgeItem = Database['public']['Tables']['fridge_items']['Row'];
type MealRow = Database['public']['Tables']['meals']['Row'];
type DishRow = Database['public']['Tables']['dishes']['Row'];
type DishIngredientRow = Database['public']['Tables']['dish_ingredients']['Row'];

/** 특정 날짜 식단 조회 */
export function useMealsByDateQuery(householdId: string | null, date: string) {
  return useQuery({
    queryKey: mealKeys.listByDate(householdId ?? '', date),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data: meals, error: mealsError } = await supabase
            .from('meals')
            .select('*')
            .eq('household_id', householdId)
            .eq('date', date)
            .order('type', { ascending: true });
          if (mealsError) throw mealsError;

          const typedMeals = (meals ?? []) as MealRow[];
          if (typedMeals.length === 0) return [] as Meal[];

          const mealIds = typedMeals.map((meal) => meal.id);
          const { data: dishes, error: dishesError } = await supabase
            .from('dishes')
            .select('*')
            .in('meal_id', mealIds)
            .order('sort_order', { ascending: true });
          if (dishesError) throw dishesError;

          const typedDishes = (dishes ?? []) as DishRow[];
          const dishIds = typedDishes.map((dish) => dish.id);

          let typedIngredients: DishIngredientRow[] = [];
          if (dishIds.length > 0) {
            const { data: ingredients, error: ingredientsError } = await supabase
              .from('dish_ingredients')
              .select('*')
              .in('dish_id', dishIds);
            if (ingredientsError) throw ingredientsError;
            typedIngredients = (ingredients ?? []) as DishIngredientRow[];
          }

          const ingredientsByDishId = new Map<string, DishIngredientRow[]>();
          for (const ingredient of typedIngredients) {
            const prev = ingredientsByDishId.get(ingredient.dish_id) ?? [];
            prev.push(ingredient);
            ingredientsByDishId.set(ingredient.dish_id, prev);
          }

          const dishesByMealId = new Map<
            string,
            Array<DishRow & { ingredients: DishIngredientRow[] }>
          >();
          for (const dish of typedDishes) {
            const prev = dishesByMealId.get(dish.meal_id) ?? [];
            prev.push({
              ...dish,
              ingredients: ingredientsByDishId.get(dish.id) ?? [],
            });
            dishesByMealId.set(dish.meal_id, prev);
          }

          return typedMeals.map((meal) => ({
            ...meal,
            dishes: dishesByMealId.get(meal.id) ?? [],
          })) as Meal[];
        }
      : skipToken,
  });
}

/** 식단 편집용 냉장고 재고 조회 */
export function useFridgeItemsForMealQuery(householdId: string | null) {
  return useQuery({
    queryKey: mealKeys.fridgeItems(householdId ?? ''),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const { data, error } = await supabase
            .from('fridge_items')
            .select('id, name, total_count, unit')
            .eq('household_id', householdId)
            .order('name', { ascending: true });

          if (error) throw error;
          return (data ?? []) as Pick<FridgeItem, 'id' | 'name' | 'total_count' | 'unit'>[];
        }
      : skipToken,
  });
}
