import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { fridgeKeys } from '@/commons/model/queryKey';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];
type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];

/**
 * @description 배치가 모두 비어있을 때만 냉장고 아이템을 정리합니다.
 */
async function cleanupFridgeItemIfNoBatches(fridgeItemId: string) {
  const supabase = createClient();

  const { count, error: countError } = await supabase
    .from('fridge_item_batches')
    .select('*', { count: 'exact', head: true })
    .eq('fridge_item_id', fridgeItemId);
  if (countError) throw countError;

  if ((count ?? 0) > 0) return;

  const { error: softDeleteError } = await supabase.rpc('soft_delete_fridge_item', {
    p_fridge_item_id: fridgeItemId,
  });
  if (softDeleteError) throw softDeleteError;
}

/**
 * @description 장보기 항목을 기준으로 냉장고 아이템/배치를 만들고 링크를 갱신합니다.
 */
async function createFridgeLinkFromIngredient(ingredient: Ingredient) {
  const supabase = createClient();

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

  const { data: batch, error: batchInsertError } = await supabase
    .from('fridge_item_batches')
    .insert({
      fridge_item_id: fridgeItem.id,
      quantity: ingredient.count,
      purchased_date: ingredient.date,
      expiry_date: null,
      memo: null,
    })
    .select()
    .single();
  if (batchInsertError) {
    await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
    throw batchInsertError;
  }

  const { data: relinkedIngredient, error: relinkError } = await supabase
    .from('ingredients')
    .update({ linked_fridge_item_id: fridgeItem.id, linked_fridge_batch_id: batch.id })
    .eq('id', ingredient.id)
    .select()
    .single();
  if (relinkError) {
    await supabase.from('fridge_item_batches').delete().eq('id', batch.id);
    await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
    throw relinkError;
  }

  return relinkedIngredient as Ingredient;
}

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

      const { data: batch, error: batchError } = await supabase
        .from('fridge_item_batches')
        .insert({
          ...batchInput,
        })
        .select()
        .single();

      if (batchError) {
        await supabase.from('fridge_items').delete().eq('id', fridgeItem.id);
        await supabase.from('ingredients').delete().eq('id', ingredient.id);
        throw batchError;
      }

      const { data: linkedIngredient, error: updateError } = await supabase
        .from('ingredients')
        .update({ linked_fridge_item_id: fridgeItem.id, linked_fridge_batch_id: batch.id })
        .eq('id', ingredient.id)
        .select()
        .single();

      if (updateError) {
        await supabase.from('fridge_item_batches').delete().eq('id', batch.id);
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
      const linkedFridgeBatchId = ingredient.linked_fridge_batch_id;

      if (linkedFridgeItemId) {
        const { data: activeLinkedItem, error: activeItemError } = await supabase
          .from('fridge_items')
          .select('id')
          .eq('id', linkedFridgeItemId)
          .is('deleted_at', null)
          .maybeSingle();
        if (activeItemError) throw activeItemError;

        if (!activeLinkedItem) {
          const { error: unlinkError } = await supabase
            .from('ingredients')
            .update({ linked_fridge_item_id: null, linked_fridge_batch_id: null })
            .eq('id', ingredient.id);
          if (unlinkError) throw unlinkError;

          const unlinkedIngredient = {
            ...ingredient,
            linked_fridge_item_id: null,
            linked_fridge_batch_id: null,
          } as Ingredient;
          return createFridgeLinkFromIngredient(unlinkedIngredient);
        }

        const { error: fridgeUpdateError } = await supabase
          .from('fridge_items')
          .update({
            name: ingredient.name,
            category: ingredient.category,
            unit: ingredient.unit,
            from_grocery: true,
          })
          .eq('id', linkedFridgeItemId);
        if (fridgeUpdateError) throw fridgeUpdateError;

        if (linkedFridgeBatchId) {
          const { error: batchUpdateError } = await supabase
            .from('fridge_item_batches')
            .update({
              quantity: ingredient.count,
              purchased_date: ingredient.date,
            })
            .eq('id', linkedFridgeBatchId)
            .eq('fridge_item_id', linkedFridgeItemId);
          if (batchUpdateError) throw batchUpdateError;
          return ingredient;
        }

        const { data: createdBatch, error: insertBatchError } = await supabase
          .from('fridge_item_batches')
          .insert({
            fridge_item_id: linkedFridgeItemId,
            quantity: ingredient.count,
            purchased_date: ingredient.date,
            expiry_date: null,
            memo: null,
          })
          .select()
          .single();
        if (insertBatchError) throw insertBatchError;

        const { data: relinkedIngredient, error: relinkError } = await supabase
          .from('ingredients')
          .update({ linked_fridge_batch_id: createdBatch.id })
          .eq('id', ingredient.id)
          .select()
          .single();
        if (relinkError) throw relinkError;

        return relinkedIngredient as Ingredient;
      }

      return createFridgeLinkFromIngredient({
        ...ingredient,
        id: currentIngredient.id,
      } as Ingredient);
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
        .select('id, linked_fridge_item_id, linked_fridge_batch_id')
        .eq('id', id)
        .single();
      if (selectError) throw selectError;

      const linkedFridgeItemId = ingredient.linked_fridge_item_id;
      const linkedFridgeBatchId = ingredient.linked_fridge_batch_id;

      const { error: deleteIngredientError } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id);
      if (deleteIngredientError) throw deleteIngredientError;

      if (linkedFridgeBatchId) {
        const { error: deleteBatchError } = await supabase
          .from('fridge_item_batches')
          .delete()
          .eq('id', linkedFridgeBatchId);
        if (deleteBatchError) throw deleteBatchError;
      }

      if (linkedFridgeItemId) {
        await cleanupFridgeItemIfNoBatches(linkedFridgeItemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
