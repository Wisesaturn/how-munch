import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { type Database } from '@/commons/types';

import { type FridgeItem, type FridgeItemBatch } from '@/entities/fridge-item';

import { fridgeKeys } from './queryKey';

type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type FridgeItemUpdate = Database['public']['Tables']['fridge_items']['Update'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];
type BatchUpdate = Database['public']['Tables']['fridge_item_batches']['Update'];

/**
 * @description 식단 사용 이력으로 인한 삭제 불가 에러를 사용자 메시지로 매핑합니다.
 */
function resolveFridgeDeleteError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('재고 삭제 중 오류가 발생했습니다.');
}

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
          max_count: input.batch.quantity,
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
      const { error: deleteError } = await supabase.rpc('soft_delete_fridge_item', {
        p_fridge_item_id: id,
      });
      if (deleteError) throw resolveFridgeDeleteError(deleteError);
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
      const { data: targetBatch, error: batchSelectError } = await supabase
        .from('fridge_item_batches')
        .select('id, fridge_item_id')
        .eq('id', id)
        .single();
      if (batchSelectError) throw batchSelectError;

      const { data: targetItem, error: itemSelectError } = await supabase
        .from('fridge_items')
        .select('id, from_grocery')
        .eq('id', targetBatch.fridge_item_id)
        .single();
      if (itemSelectError) throw itemSelectError;

      if (targetItem.from_grocery && updates.quantity !== undefined) {
        throw new Error('장보기에서 등록한 재고는 장보기에서만 수량을 변경할 수 있습니다.');
      }

      const { data: usedRows, error: usageError } = await supabase
        .from('meal_batch_usages')
        .select('amount')
        .eq('batch_id', id);
      if (usageError) throw usageError;

      const usedAmount = (usedRows ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
      const requestedTotalQuantity = updates.quantity;

      if (requestedTotalQuantity !== undefined) {
        const safeRequestedTotalQuantity = Number(requestedTotalQuantity);
        if (
          !Number.isFinite(safeRequestedTotalQuantity) ||
          safeRequestedTotalQuantity < usedAmount
        ) {
          throw new Error(`식단에서 사용 중인 수량(${usedAmount})보다 작게 설정할 수 없습니다.`);
        }

        updates.quantity = safeRequestedTotalQuantity - usedAmount;
      }

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
      const { error } = await supabase.rpc('soft_delete_fridge_batch', {
        p_batch_id: id,
      });
      if (error) throw resolveFridgeDeleteError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeKeys.all });
    },
  });
}
