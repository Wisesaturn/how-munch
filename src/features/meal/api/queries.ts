import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/commons/lib';
import { type Database } from '@/commons/model/types';

import { type FridgeItemBatch } from '@/entities/fridge-item';
import { mealKeys, type Meal, type MealSummary } from '@/entities/meal';

type FridgeItem = Database['public']['Tables']['fridge_items']['Row'];

export interface MealFridgeItemOption extends Pick<
  FridgeItem,
  'id' | 'name' | 'brand' | 'total_count' | 'unit'
> {
  fridge_item_batches: Array<Pick<FridgeItemBatch, 'purchased_date' | 'quantity'>>;
}

/** 특정 날짜 식단 조회 — 날짜 전환 시 이전 데이터를 유지해 깜빡임을 방지한다 */
export function useMealsByDateQuery(householdId: string | null, date: string) {
  return useQuery({
    queryKey: mealKeys.listByDate(householdId ?? '', date),
    queryFn: householdId
      ? () => apiClient.get<Meal[]>('/api/meals', { householdId, date })
      : skipToken,
    placeholderData: keepPreviousData,
  });
}

/** 기간 내 식단 존재 여부 요약 조회 — 주간 날짜 스트립 dot 표시용 */
export function useMealSummaryByRangeQuery(
  householdId: string | null,
  startDate: string,
  endDate: string,
) {
  return useQuery({
    queryKey: mealKeys.summaryByRange(householdId ?? '', startDate, endDate),
    queryFn: householdId
      ? () =>
          apiClient.get<MealSummary[]>('/api/meals/summary', { householdId, startDate, endDate })
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
      ? () =>
          apiClient.get<MealFridgeItemOption[]>('/api/meals/fridge-items', {
            householdId,
            selectedIds: normalizedSelectedFridgeItemIds,
          })
      : skipToken,
  });
}
