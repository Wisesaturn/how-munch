import { getDaysInMonth, parseISO } from 'date-fns';

import { type BudgetDailyPoint, type BudgetScope } from '@/entities/budget';

/**
 * @description 'YYYY-MM'의 일수를 구한다.
 */
export function getDayCount(yearMonth: string): number {
  return getDaysInMonth(parseISO(`${yearMonth}-01`));
}

/**
 * @description 해당 월의 scope별 지출 합계를 구한다.
 * total은 전체 합계이고, 항목 scope는 같은 이름의 kind 합계다.
 */
export function sumSpentByScope(
  points: BudgetDailyPoint[],
  yearMonth: string,
): Record<BudgetScope, number> {
  const spent: Record<BudgetScope, number> = {
    total: 0,
    grocery: 0,
    restaurant: 0,
    delivery: 0,
  };

  for (const point of points) {
    if (point.year_month !== yearMonth) continue;

    spent.total += point.total;
    if (point.kind === 'grocery' || point.kind === 'restaurant' || point.kind === 'delivery') {
      spent[point.kind] += point.total;
    }
  }

  return spent;
}

/**
 * @description 해당 월의 일자별 누적 지출을 1일부터 순서대로 만든다.
 * dayLimit을 주면 그 날짜까지만 만든다 (이번 달은 오늘까지만 선을 그린다).
 */
export function buildCumulativeSeries(
  points: BudgetDailyPoint[],
  yearMonth: string,
  dayLimit?: number,
): number[] {
  const dayCount = getDayCount(yearMonth);
  const limit = Math.min(dayLimit ?? dayCount, dayCount);
  if (limit <= 0) return [];

  const dailyTotals = new Array<number>(dayCount).fill(0);

  for (const point of points) {
    if (point.year_month !== yearMonth) continue;
    const day = Number(point.expense_date.slice(8, 10));
    if (day >= 1 && day <= dayCount) dailyTotals[day - 1] += point.total;
  }

  const cumulative: number[] = [];
  let running = 0;
  for (let index = 0; index < limit; index += 1) {
    running += dailyTotals[index];
    cumulative.push(running);
  }

  return cumulative;
}
