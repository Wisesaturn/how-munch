import { addDays, format, parseISO } from 'date-fns';

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
