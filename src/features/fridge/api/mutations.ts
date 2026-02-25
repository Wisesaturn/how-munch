import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createClient } from '@/commons/api/supabase/client';
import { resolveDomainError } from '@/commons/lib';
import { type Database } from '@/commons/types';
import { Toast } from '@/commons/ui';

import { fridgeItemKeys, type FridgeItem, type FridgeItemBatch } from '@/entities/fridge-item';
import { mealKeys } from '@/entities/meal';

type FridgeItemInsert = Database['public']['Tables']['fridge_items']['Insert'];
type FridgeItemUpdate = Database['public']['Tables']['fridge_items']['Update'];
type BatchInsert = Database['public']['Tables']['fridge_item_batches']['Insert'];
type BatchUpdate = Database['public']['Tables']['fridge_item_batches']['Update'];
type FridgePreferenceRow = Database['public']['Tables']['fridge_preferences']['Row'];
type FridgePreferenceInsert = Database['public']['Tables']['fridge_preferences']['Insert'];

/**
 * @description 냉장고 도메인 DB 에러를 사용자 메시지로 매핑합니다.
 */
function resolveFridgeError(error: unknown) {
  const domainError = resolveDomainError(error);
  if (domainError) {
    return new Error(domainError.message);
  }

  if (error instanceof Error) return error;
  return new Error('재고 처리 중 오류가 발생했습니다.');
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
      const { data, error } = await supabase.rpc('create_fridge_item_with_batch', {
        p_household_id: input.item.household_id,
        p_name: input.item.name,
        p_category_id: input.item.category_id,
        p_unit: input.item.unit ?? 'count',
        p_is_subdivided: input.item.is_subdivided ?? false,
        p_from_grocery: input.item.from_grocery ?? false,
        p_quantity: input.batch.quantity,
        p_purchased_date: input.batch.purchased_date,
        p_expiry_date: input.batch.expiry_date ?? null,
        p_memo: input.batch.memo ?? null,
      });
      if (error) throw resolveFridgeError(error);

      return data as FridgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

/** 냉장고 아이템 메타 수정 (name, category_id, unit 등) */
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
      if (error) throw resolveFridgeError(error);
      return data as FridgeItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
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
      if (deleteError) throw resolveFridgeError(deleteError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
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
      if (error) throw resolveFridgeError(error);
      return data as FridgeItemBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

/** 배치 수정 */
export function useUpdateBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BatchUpdate & { id: string }) => {
      const supabase = createClient();
      const patch = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      );
      const { data, error } = await supabase.rpc('update_fridge_batch_guarded', {
        p_batch_id: id,
        p_updates: patch,
      });
      if (error) throw resolveFridgeError(error);

      return data as FridgeItemBatch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
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
      if (error) throw resolveFridgeError(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

interface UpsertFridgePreferencesParams {
  userId: string;
  values: Pick<FridgePreferenceRow, 'hide_depleted_fridge_items'>;
}

/** 냉장고 표시 설정 저장 */
export function useUpsertFridgePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, values }: UpsertFridgePreferencesParams) => {
      const payload: FridgePreferenceInsert = {
        user_id: userId,
        hide_depleted_fridge_items: values.hide_depleted_fridge_items,
        updated_at: new Date().toISOString(),
      };
      const supabase = createClient();
      const { error } = await supabase.from('fridge_preferences').upsert(payload);
      if (error) throw resolveFridgeError(error);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.preferences(variables.userId) });
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
    onError: (error) => {
      Toast.error(error.message);
    },
  });
}
