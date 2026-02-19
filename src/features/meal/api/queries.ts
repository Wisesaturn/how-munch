import { skipToken, useQuery } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { type Database } from '@/commons/types';

import { type Meal } from '@/entities/meal';

import { mealKeys } from './queryKey';

type FridgeItem = Database['public']['Tables']['fridge_items']['Row'];
type FridgeItemBatch = Database['public']['Tables']['fridge_item_batches']['Row'];
type MealRow = Database['public']['Tables']['meals']['Row'];
type DishRow = Database['public']['Tables']['dishes']['Row'];
type DishIngredientRow = Database['public']['Tables']['dish_ingredients']['Row'];
type FridgePreferenceRow = Database['public']['Tables']['fridge_preferences']['Row'];

export interface MealFridgeItemOption extends Pick<
  FridgeItem,
  'id' | 'name' | 'total_count' | 'unit'
> {
  fridge_item_batches: Array<Pick<FridgeItemBatch, 'purchased_date' | 'quantity'>>;
}

/**
 * @description 식단 조회 관련 DB 에러를 사용자 메시지로 매핑합니다.
 */
function resolveMealQueryError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('식단 조회 중 오류가 발생했습니다.');
}

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
          if (mealsError) throw resolveMealQueryError(mealsError);

          const typedMeals = (meals ?? []) as MealRow[];
          if (typedMeals.length === 0) return [] as Meal[];

          const mealIds = typedMeals.map((meal) => meal.id);
          const { data: dishes, error: dishesError } = await supabase
            .from('dishes')
            .select('*')
            .in('meal_id', mealIds)
            .order('sort_order', { ascending: true });
          if (dishesError) throw resolveMealQueryError(dishesError);

          const typedDishes = (dishes ?? []) as DishRow[];
          const dishIds = typedDishes.map((dish) => dish.id);

          let typedIngredients: DishIngredientRow[] = [];
          if (dishIds.length > 0) {
            const { data: ingredients, error: ingredientsError } = await supabase
              .from('dish_ingredients')
              .select('*')
              .in('dish_id', dishIds);
            if (ingredientsError) throw resolveMealQueryError(ingredientsError);
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
export function useFridgeItemsForMealQuery(
  householdId: string | null,
  selectedFridgeItemIds: string[] = [],
) {
  const normalizedSelectedFridgeItemIds = [
    ...new Set(selectedFridgeItemIds.filter(Boolean)),
  ].sort();
  const selectedItemIdsKey = normalizedSelectedFridgeItemIds.join(',');

  return useQuery({
    queryKey: mealKeys.fridgeItemsBySelected(householdId ?? '', selectedItemIdsKey),
    queryFn: householdId
      ? async () => {
          const supabase = createClient();

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) throw resolveMealQueryError(userError);

          let hideDepletedFridgeItems = false;
          if (user?.id) {
            const { data: fridgePreferences, error: fridgePreferenceError } = await supabase
              .from('fridge_preferences')
              .select('hide_depleted_fridge_items')
              .eq('user_id', user.id)
              .maybeSingle();
            if (fridgePreferenceError) throw resolveMealQueryError(fridgePreferenceError);

            hideDepletedFridgeItems =
              (fridgePreferences as FridgePreferenceRow | null)?.hide_depleted_fridge_items ??
              false;
          }

          let query = supabase
            .from('fridge_items')
            .select('id, name, total_count, unit, fridge_item_batches(purchased_date, quantity)')
            .eq('household_id', householdId)
            .is('deleted_at', null)
            .order('name', { ascending: true });

          if (hideDepletedFridgeItems) {
            if (normalizedSelectedFridgeItemIds.length > 0) {
              query = query.or(
                `total_count.gt.0,id.in.(${normalizedSelectedFridgeItemIds.join(',')})`,
              );
            } else {
              query = query.gt('total_count', 0);
            }
          }

          const { data, error } = await query;
          if (error) throw resolveMealQueryError(error);
          return (data ?? []) as unknown as MealFridgeItemOption[];
        }
      : skipToken,
  });
}
