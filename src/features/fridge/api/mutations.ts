import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { Toast } from '@/commons/ui';

import { fridgeItemKeys, type FridgeItem, type FridgeItemBatch } from '@/entities/fridge-item';
import { mealKeys } from '@/entities/meal';

/** 냉장고 아이템 + 첫 배치 동시 추가 */
export function useAddFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { item: Record<string, unknown>; batch: Record<string, unknown> }) =>
      apiClient.post<FridgeItem>('/api/fridge', input),
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
    mutationFn: ({ id, ...updates }: Record<string, unknown> & { id: string }) =>
      apiClient.put<FridgeItem>('/api/fridge', { id, ...updates }),
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
    mutationFn: (id: string) => apiClient.delete(`/api/fridge?id=${id}`),
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
    mutationFn: (input: Record<string, unknown>) =>
      apiClient.post<FridgeItemBatch>('/api/fridge/batches', input),
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
    mutationFn: ({ id, ...updates }: Record<string, unknown> & { id: string }) =>
      apiClient.put<FridgeItemBatch>('/api/fridge/batches', { id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

/** 냉장고 배치 재고 소진 (버리기) */
export function useDiscardBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post('/api/fridge/batches/discard', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

/** 냉장고 아이템 전체 재고 소진 (버리기) */
export function useDiscardFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.post('/api/fridge/discard', { id }),
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
    mutationFn: (id: string) => apiClient.delete(`/api/fridge/batches?id=${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

interface SubdivideFridgeItemInput {
  source_item_id: string;
  consume_amount: number;
  new_item_name: string;
  new_item_quantity: number;
  new_expiry_date?: string | null;
  new_item_unit?: string | null;
}

/** 냉장고 아이템 소분 — FIFO 차감 후 새 독립 fridge_item 생성 */
export function useSubdivideFridgeItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubdivideFridgeItemInput) =>
      apiClient.post<FridgeItem>('/api/fridge/subdivide', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fridgeItemKeys.all });
      queryClient.invalidateQueries({ queryKey: mealKeys.fridgeItemsAll });
    },
  });
}

interface UpsertFridgePreferencesInput {
  userId: string;
  values: { hide_depleted_fridge_items: boolean };
}

/** 냉장고 표시 설정 저장 */
export function useUpsertFridgePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertFridgePreferencesInput) =>
      apiClient.put('/api/fridge/preferences', input.values),
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
