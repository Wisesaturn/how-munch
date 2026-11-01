import { differenceInDays, format, startOfDay } from 'date-fns';

import { computeExpiryDate, type FridgeItemBatch } from '@/entities/fridge-item';

export { computeExpiryDate };

/**
 * @description "구매일 모름" 재고에 저장할 구매일(YYYY-MM-DD)을 결정한다.
 * 기본은 오늘이고, 유통기한이 이미 지났으면 구매일이 유통기한보다 늦지 않도록 유통기한 날짜를 쓴다.
 */
export function resolveUnknownPurchasedDate(expiryDate: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  return expiryDate && expiryDate < today ? expiryDate : today;
}

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
