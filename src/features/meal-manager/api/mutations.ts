import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { fridgeKeys } from '@/commons/model/queryKey';
import { type Database } from '@/commons/types';

import { type MealType } from '@/entities/meal';

import { mealKeys } from './queryKey';

type MealInsert = Database['public']['Tables']['meals']['Insert'];
type DishInsert = Database['public']['Tables']['dishes']['Insert'];
type DishIngredientInsert = Database['public']['Tables']['dish_ingredients']['Insert'];
type MealBatchUsageInsert = Database['public']['Tables']['meal_batch_usages']['Insert'];

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

interface MealBatchUsageRow {
  id: string;
  meal_id: string;
  fridge_item_id: string;
  batch_id: string;
  amount: number;
}

function toSafePositiveAmount(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  if (amount <= 0) return 0;
  return amount;
}

function aggregateIngredientAmounts(
  ingredients: Array<{ fridge_item_id: string; amount: number }>,
) {
  const usageByFridgeItemId = new Map<string, number>();

  for (const ingredient of ingredients) {
    if (!ingredient.fridge_item_id) continue;
    const amount = toSafePositiveAmount(ingredient.amount);
    if (amount <= 0) continue;

    const prev = usageByFridgeItemId.get(ingredient.fridge_item_id) ?? 0;
    usageByFridgeItemId.set(ingredient.fridge_item_id, prev + amount);
  }

  return usageByFridgeItemId;
}

async function restoreMealBatchUsages(supabase: ReturnType<typeof createClient>, mealId: string) {
  const { data: usages, error: usageSelectError } = await supabase
    .from('meal_batch_usages')
    .select('id, batch_id, amount')
    .eq('meal_id', mealId);
  if (usageSelectError) throw usageSelectError;

  const typedUsages = (usages ?? []) as Array<
    Pick<MealBatchUsageRow, 'id' | 'batch_id' | 'amount'>
  >;

  for (const usage of typedUsages) {
    const restoreAmount = toSafePositiveAmount(usage.amount);
    if (restoreAmount <= 0) continue;

    const { data: batch, error: batchSelectError } = await supabase
      .from('fridge_item_batches')
      .select('id, quantity')
      .eq('id', usage.batch_id)
      .single();
    if (batchSelectError) throw batchSelectError;

    const currentQuantity = Number(batch.quantity);
    if (!Number.isFinite(currentQuantity)) {
      throw new Error('재고 수량 형식이 올바르지 않습니다.');
    }

    const { error: batchUpdateError } = await supabase
      .from('fridge_item_batches')
      .update({ quantity: currentQuantity + restoreAmount })
      .eq('id', usage.batch_id);
    if (batchUpdateError) throw batchUpdateError;
  }

  const { error: usageDeleteError } = await supabase
    .from('meal_batch_usages')
    .delete()
    .eq('meal_id', mealId);
  if (usageDeleteError) throw usageDeleteError;
}

async function consumeFridgeItemBatchesWithUsageLog(
  supabase: ReturnType<typeof createClient>,
  mealId: string,
  usageByFridgeItemId: Map<string, number>,
) {
  const usageInserts: MealBatchUsageInsert[] = [];

  for (const [fridgeItemId, totalUsageAmount] of usageByFridgeItemId) {
    let remainingAmount = toSafePositiveAmount(totalUsageAmount);
    if (remainingAmount <= 0) continue;

    const { data: batches, error: batchesError } = await supabase
      .from('fridge_item_batches')
      .select('id, quantity')
      .eq('fridge_item_id', fridgeItemId)
      .order('purchased_date', { ascending: true })
      .order('created_at', { ascending: true });
    if (batchesError) throw batchesError;

    const typedBatches = (batches ?? []) as Array<{ id: string; quantity: number }>;

    for (const batch of typedBatches) {
      if (remainingAmount <= 0) break;

      const batchQuantity = Number(batch.quantity);
      if (!Number.isFinite(batchQuantity) || batchQuantity <= 0) continue;

      const consumedAmount = Math.min(batchQuantity, remainingAmount);
      const nextBatchQuantity = batchQuantity - consumedAmount;

      const { error: batchUpdateError } = await supabase
        .from('fridge_item_batches')
        .update({ quantity: nextBatchQuantity })
        .eq('id', batch.id);
      if (batchUpdateError) throw batchUpdateError;

      usageInserts.push({
        meal_id: mealId,
        fridge_item_id: fridgeItemId,
        batch_id: batch.id,
        amount: consumedAmount,
      });

      remainingAmount -= consumedAmount;
    }

    if (remainingAmount > 0) {
      throw new Error('냉장고 재고가 부족합니다. 식단 재료 수량을 확인해 주세요.');
    }
  }

  if (usageInserts.length === 0) return;

  const { error: insertUsageError } = await supabase.from('meal_batch_usages').insert(usageInserts);
  if (insertUsageError) throw insertUsageError;
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

      await restoreMealBatchUsages(supabase, meal.id);

      const { error: deleteDishError } = await supabase
        .from('dishes')
        .delete()
        .eq('meal_id', meal.id);
      if (deleteDishError) throw deleteDishError;

      const normalizedDishes = dishes
        .map((dish) => ({
          ...dish,
          name: dish.name.trim() || '[이름 없음]',
          ingredients: dish.ingredients
            .map((ingredient) => ({
              ...ingredient,
              amount: toSafePositiveAmount(ingredient.amount),
            }))
            .filter((ingredient) => !!ingredient.fridge_item_id && ingredient.amount > 0),
        }))
        .filter((dish) => dish.name || dish.ingredients.length > 0);

      const usageByFridgeItemId = aggregateIngredientAmounts(
        normalizedDishes.flatMap((dish) => dish.ingredients),
      );

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

      await consumeFridgeItemBatchesWithUsageLog(supabase, meal.id, usageByFridgeItemId);

      return meal.id;
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

      await restoreMealBatchUsages(supabase, id);

      const { error } = await supabase.from('meals').delete().eq('id', id);
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
