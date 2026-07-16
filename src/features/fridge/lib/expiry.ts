import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns';

import { type FridgeItemBatch } from '@/entities/fridge-item';

/**
 * @description 구매일(YYYY-MM-DD)과 카테고리 기본 유효기간(일수)로 유통기한(YYYY-MM-DD)을 계산한다.
 * 구매일이 없거나 일수가 없으면(미설정) null을 반환한다. 결과가 과거 날짜여도 그대로 반환한다.
 */
export function computeExpiryDate(
  purchasedDate: string,
  days: number | null | undefined,
): string | null {
  if (!purchasedDate || days === null || days === undefined) return null;
  const parsed = parseISO(purchasedDate);
  if (Number.isNaN(parsed.getTime())) return null;
  return format(addDays(parsed, days), 'yyyy-MM-dd');
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
