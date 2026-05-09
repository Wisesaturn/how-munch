import { compareAsc } from 'date-fns';

import { type FridgeItemBatch } from '@/entities/fridge-item';

/**
 * @description FIFO 시뮬레이션으로 소분 시 소진되는 배치들의 최소 유통기한을 계산합니다.
 * 소진 대상 배치들(purchased_date asc 정렬)을 순서대로 차감하며,
 * 소진된 배치들 중 가장 빠른 expiry_date를 반환합니다.
 * 소진 배치에 유통기한이 없으면 null을 반환합니다.
 */
export function calcSuggestedExpiryDate(
  batches: FridgeItemBatch[],
  consumeAmount: number,
): string | null {
  if (consumeAmount <= 0) return null;

  const sorted = [...batches]
    .filter((b) => !b.deleted_at && b.quantity > 0)
    .sort((a, b) => {
      const dateDiff = compareAsc(new Date(a.purchased_date), new Date(b.purchased_date));
      if (dateDiff !== 0) return dateDiff;
      return compareAsc(new Date(a.created_at), new Date(b.created_at));
    });

  let remaining = consumeAmount;
  let minExpiry: string | null = null;

  for (const batch of sorted) {
    if (remaining <= 0) break;

    const take = Math.min(batch.quantity, remaining);
    remaining -= take;

    if (batch.expiry_date) {
      if (!minExpiry || batch.expiry_date < minExpiry) {
        minExpiry = batch.expiry_date;
      }
    }
  }

  return minExpiry;
}
