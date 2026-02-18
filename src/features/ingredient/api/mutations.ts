import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { fridgeKeys } from '@/commons/model/queryKey';
import { type Database } from '@/commons/types';

import { type Ingredient } from '@/entities/ingredient';

import { ingredientKeys } from './queryKey';

type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];
type IngredientUpdate = Database['public']['Tables']['ingredients']['Update'];

/**
 * @description 장보기 삭제 관련 DB 에러를 사용자 메시지로 변환합니다.
 */
function resolveIngredientDeleteError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('장보기 삭제 중 오류가 발생했습니다.');
}

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
  if (softDeleteError) throw resolveIngredientDeleteError(softDeleteError);
}

/** 장보기 항목 추가 (I-04) */
export function useAddIngredientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IngredientInsert) => {
      const supabase = createClient();
      const count = input.count ?? 1;
      const date = input.date ?? new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.rpc('add_ingredient_with_fridge', {
        p_household_id: input.household_id,
        p_name: input.name,
        p_price: input.price ?? 0,
        p_store: input.store ?? null,
        p_category: input.category ?? 'other',
        p_count: count,
        p_unit: input.unit ?? 'count',
        p_date: date,
      });
      if (error) throw error;

      return data as Ingredient;
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
      const patch = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      const { data, error } = await supabase.rpc('update_ingredient_with_fridge', {
        p_ingredient_id: id,
        p_updates: patch,
      });
      if (error) throw error;

      return data as Ingredient;
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

      if (linkedFridgeBatchId) {
        const { error: deleteBatchError } = await supabase.rpc('soft_delete_fridge_batch', {
          p_batch_id: linkedFridgeBatchId,
        });
        if (deleteBatchError) throw resolveIngredientDeleteError(deleteBatchError);
      } else if (linkedFridgeItemId) {
        await cleanupFridgeItemIfNoBatches(linkedFridgeItemId);
      }

      const { error: deleteIngredientError } = await supabase.rpc('soft_delete_ingredient', {
        p_ingredient_id: id,
      });
      if (deleteIngredientError) throw resolveIngredientDeleteError(deleteIngredientError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
