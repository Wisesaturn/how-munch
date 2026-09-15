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

/**
 * @description 해당 월의 주차별(1~5주차) 지출 합계를 구한다.
 * 주차는 일자를 7로 나눈 값이라 달력 주와 정확히 겹치지는 않는다.
 */
export function sumWeeklyTotals(
  points: BudgetDailyPoint[],
  yearMonth: string,
): { week: number; total: number }[] {
  const dayCount = getDayCount(yearMonth);
  const totalWeeks = Math.ceil(dayCount / 7);
  const weeks = Array.from({ length: totalWeeks }, (_, index) => ({ week: index + 1, total: 0 }));

  for (const point of points) {
    if (point.year_month !== yearMonth) continue;
    const day = Number(point.expense_date.slice(8, 10));
    const weekIndex = Math.min(Math.ceil(day / 7), totalWeeks) - 1;
    if (weekIndex >= 0) weeks[weekIndex].total += point.total;
  }

  return weeks;
}
