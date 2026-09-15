import { addMonths, format, getDate, parseISO, subMonths } from 'date-fns';

/** 대상 월이 현재 기준으로 어디에 있는지 — 그래프에서 이번달 선을 어디까지 그릴지 가른다 */
export type BudgetMonthPosition = 'past' | 'current' | 'future';

/**
 * @description Date를 'YYYY-MM'으로 만든다.
 */
export function toYearMonth(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * @description 'YYYY-MM'의 직전 달을 구한다.
 */
export function getPreviousYearMonth(yearMonth: string): string {
  return toYearMonth(subMonths(parseISO(`${yearMonth}-01`), 1));
}

/**
 * @description 'YYYY-MM'의 다음 달을 구한다.
 */
export function getNextYearMonth(yearMonth: string): string {
  return toYearMonth(addMonths(parseISO(`${yearMonth}-01`), 1));
}

/**
 * @description 'YYYY-MM'을 '9월'처럼 짧은 라벨로 만든다.
 */
export function formatMonthLabel(yearMonth: string): string {
  return `${Number(yearMonth.slice(5, 7))}월`;
}

/**
 * @description 대상 월이 과거/이번달/미래 중 어디인지 판별한다.
 */
export function resolveMonthPosition(yearMonth: string, today = new Date()): BudgetMonthPosition {
  const current = toYearMonth(today);
  if (yearMonth < current) return 'past';
  if (yearMonth > current) return 'future';
  return 'current';
}

/**
 * @description 이번달 선을 며칠까지 그릴지 구한다.
 * 과거 달은 말일까지, 이번 달은 오늘까지, 미래 달은 선을 그리지 않는다(0).
 */
export function resolveSeriesDayLimit(
  yearMonth: string,
  dayCount: number,
  today = new Date(),
): number {
  const position = resolveMonthPosition(yearMonth, today);
  if (position === 'past') return dayCount;
  if (position === 'future') return 0;
  return getDate(today);
}
