import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { ingredientKeys } from '@/commons/query-key';
import { type Database } from '@/commons/types';

import { type FridgeItem, type FridgeItemBatch } from '@/entities/fridge-item';

import { fridgeKeys } from './queryKey';

type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type FridgeItemUpdate = Database['public']['Tables']['fridge_items']['Update'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];
type BatchUpdate = Database['public']['Tables']['fridge_item_batches']['Update'];
type IngredientInsert = Database['public']['Tables']['ingredients']['Insert'];

/** 냉장고 아이템 + 첫 배치 동시 추가 */
export function useAddFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      item: FridgeItemInsert;
      batch: Omit<BatchInsert, 'fridge_item_id'>;
      userId: string;
    }) => {
      const supabase = createClient();

      // 1. 아이템 추가
      const { data: item, error: itemError } = await supabase
        .from('fridge_items')
        .insert({
          ...input.item,
          total_count: input.batch.quantity,
        })
        .select()
        .single();
      if (itemError) throw itemError;

      // 2. 첫 배치 추가
      const { error: batchError } = await supabase
        .from('fridge_item_batches')
        .insert({ ...input.batch, fridge_item_id: item.id });
      if (batchError) {
        await supabase.from('fridge_items').delete().eq('id', item.id);
        throw batchError;
      }

      // 3. 장보기에도 동기화 생성
      const ingredientInput: IngredientInsert = {
        household_id: item.household_id,
        user_id: input.userId,
        date: input.batch.purchased_date ?? new Date().toISOString().slice(0, 10),
        name: item.name,
        price: 0,
        store: null,
        category: item.category,
        count: input.batch.quantity ?? 0,
        unit: item.unit,
        linked_fridge_item_id: item.id,
      };

      const { error: ingredientError } = await supabase.from('ingredients').insert(ingredientInput);

      if (ingredientError) {
        await supabase.from('fridge_items').delete().eq('id', item.id);
        throw ingredientError;
      }

      return item as FridgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
      queryClient.invalidateQueries({ queryKey: ingredientKeys.all });
    },
  });
}

/** 냉장고 아이템 메타 수정 (name, category, unit 등) */
export function useUpdateFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FridgeItemUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fridge_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FridgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 냉장고 아이템 삭제 (배치도 CASCADE 삭제) */
export function useDeleteFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('fridge_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 기존 아이템에 배치 추가 */
export function useAddBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BatchInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fridge_item_batches')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as FridgeItemBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 배치 수정 */
export function useUpdateBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BatchUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('fridge_item_batches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FridgeItemBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}

/** 배치 삭제 */
export function useDeleteBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('fridge_item_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
