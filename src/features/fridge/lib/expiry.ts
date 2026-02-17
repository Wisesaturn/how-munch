import { differenceInDays, startOfDay } from 'date-fns';

import { type FridgeItemBatch } from '@/entities/fridge-item';

/** 유통기한까지 남은 일수 계산 (음수 = 만료됨) */
export function getDaysUntilExpiry(expiryDate: string): number {
  const today = startOfDay(new Date());
  const expiry = startOfDay(new Date(expiryDate));
  return differenceInDays(expiry, today);
}

/** 배치 목록에서 가장 임박한 유통기한 D-day 반환 (null = 유통기한 입력된 배치 없음) */
export function getWorstExpiry(batches: FridgeItemBatch[]): number | null {
  const batchesWithExpiry = batches.filter((b) => b.expiry_date !== null && b.quantity > 0);
  if (batchesWithExpiry.length === 0) return null;

  const days = batchesWithExpiry.map((b) => getDaysUntilExpiry(b.expiry_date!));
  return Math.min(...days);
}
