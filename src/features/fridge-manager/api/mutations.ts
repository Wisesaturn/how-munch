import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { type Database } from '@/commons/types';

import { type FridgeItem, type FridgeItemBatch } from '@/entities/fridge-item';

import { fridgeKeys } from './queryKey';

type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type FridgeItemUpdate = Database['public']['Tables']['fridge_items']['Update'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];
type BatchUpdate = Database['public']['Tables']['fridge_item_batches']['Update'];

/** 냉장고 아이템 + 첫 배치 동시 추가 */
export function useAddFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      item: FridgeItemInsert;
      batch: Omit<BatchInsert, 'fridge_item_id'>;
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

      return item as FridgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
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
