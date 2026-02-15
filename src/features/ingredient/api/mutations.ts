import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { fridgeKeys } from '@/commons/query-key';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];
type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IngredientInsert) => {
      const supabase = createClient();
      const count = input.count ?? 1;
      const date = input.date ?? new Date().toISOString().slice(0, 10);

      const { data: ingredient, error: ingredientError } = await supabase
        .from('ingredients')
        .insert({ ...input, count, date })
        .select()
        .single();
      if (ingredientError) throw ingredientError;

      const fridgeItemInput: FridgeItemInsert = {
        household_id: input.household_id,
        name: input.name,
        category: input.category,
        unit: input.unit,
        total_count: count,
        max_count: count,
        is_subdivided: false,
        from_grocery: true,
      };

      const { data: fridgeItem, error: fridgeItemError } = await supabase
        .from('fridge_items')
        .insert(fridgeItemInput)
        .select()
        .single();

      if (fridgeItemError) {
        await supabase.from('ingredients').delete().eq('id', ingredient.id);
        throw fridgeItemError;
      }

      const batchInput: BatchInsert = {
        fridge_item_id: fridgeItem.id,
        quantity: count,
        purchased_date: date,
        expiry_date: null,
        memo: null,
      };

      const { error: batchError } = await supabase.from('fridge_item_batches').insert({
        ...batchInput,
      });

      if (batchError) {
        await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
        await supabase.from('ingredients').delete().eq('id', ingredient.id);
        throw batchError;
      }

      const { data: linkedIngredient, error: updateError } = await supabase
        .from('ingredients')
        .update({ linked_fridge_item_id: fridgeItem.id })
        .eq('id', ingredient.id)
        .select()
        .single();

      if (updateError) {
        await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
        await supabase.from('ingredients').delete().eq('id', ingredient.id);
        throw updateError;
      }

      return linkedIngredient as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 장보기 항목 수정 (I-06) */
export function useUpdateIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: IngredientUpdate & { id: string }) => {
      const supabase = createClient();

      const { data: currentIngredient, error: currentError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;

      const { data: updatedIngredient, error: updateError } = await supabase
        .from('ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;

      const ingredient = updatedIngredient as Ingredient;
      const linkedFridgeItemId = ingredient.linked_fridge_item_id;

      if (linkedFridgeItemId) {
        const { error: fridgeUpdateError } = await supabase
          .from('fridge_items')
          .update({
            name: ingredient.name,
            category: ingredient.category,
            unit: ingredient.unit,
            total_count: ingredient.count,
            max_count: ingredient.count,
            from_grocery: true,
          })
          .eq('id', linkedFridgeItemId);
        if (fridgeUpdateError) throw fridgeUpdateError;

        const { error: deleteBatchError } = await supabase
          .from('fridge_item_batches')
          .delete()
          .eq('fridge_item_id', linkedFridgeItemId);
        if (deleteBatchError) throw deleteBatchError;

        const { error: insertBatchError } = await supabase.from('fridge_item_batches').insert({
          fridge_item_id: linkedFridgeItemId,
          quantity: ingredient.count,
          purchased_date: ingredient.date,
          expiry_date: null,
          memo: null,
        });
        if (insertBatchError) throw insertBatchError;

        return ingredient;
      }

      const { data: fridgeItem, error: fridgeInsertError } = await supabase
        .from('fridge_items')
        .insert({
          household_id: ingredient.household_id,
          name: ingredient.name,
          category: ingredient.category,
          unit: ingredient.unit,
          total_count: ingredient.count,
          max_count: ingredient.count,
          is_subdivided: false,
          from_grocery: true,
        })
        .select()
        .single();
      if (fridgeInsertError) throw fridgeInsertError;

      const { error: batchInsertError } = await supabase.from('fridge_item_batches').insert({
        fridge_item_id: fridgeItem.id,
        quantity: ingredient.count,
        purchased_date: ingredient.date,
        expiry_date: null,
        memo: null,
      });
      if (batchInsertError) {
        await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
        throw batchInsertError;
      }

      const { data: relinkedIngredient, error: relinkError } = await supabase
        .from('ingredients')
        .update({ linked_fridge_item_id: fridgeItem.id })
        .eq('id', currentIngredient.id)
        .select()
        .single();
      if (relinkError) {
        await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
        throw relinkError;
      }

      return relinkedIngredient as Ingredient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 장보기 항목 삭제 (I-06) */
export function useDeleteIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();

      const { data: ingredient, error: selectError } = await supabase
        .from('ingredients')
        .select('id, linked_fridge_item_id')
        .eq('id', id)
        .single();
      if (selectError) throw selectError;

      const linkedFridgeItemId = ingredient.linked_fridge_item_id;

      const { error: deleteIngredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);
      if (deleteIngredientError) throw deleteIngredientError;

      if (linkedFridgeItemId) {
        const { error: deleteFridgeError } = await supabase
          .from('fridge_items')
          .delete()
          .eq('id', linkedFridgeItemId);
        if (deleteFridgeError) throw deleteFridgeError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
