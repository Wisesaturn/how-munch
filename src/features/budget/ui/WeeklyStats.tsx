'use client';

import { useMemo } from 'react';

import { Accordion } from '@/commons/ui';

import { type BudgetDailyPoint } from '@/entities/budget';

import { sumWeeklyTotals } from '../lib/budgetSeries';

interface WeeklyStatsProps {
  /** 대상 월과 직전 월을 함께 담은 일자별 시리즈 */
  series: BudgetDailyPoint[];
  /** 'YYYY-MM' */
  yearMonth: string;
}

/** 해당 월의 주차별 지출 통계 */
export function WeeklyStats({ series, yearMonth }: WeeklyStatsProps) {
  const weeklyData = useMemo(() => sumWeeklyTotals(series, yearMonth), [series, yearMonth]);
  const totalSpending = weeklyData.reduce((sum, { total }) => sum + total, 0);

  return (
    <Accordion type="single" collapsible variant="outlined">
      <Accordion.Item value="weekly-stats">
        <Accordion.Trigger className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">주차별 통계</span>
            <span className="text-xs font-semibold text-emerald-600">
              {totalSpending.toLocaleString()}원
            </span>
          </div>
        </Accordion.Trigger>
        <Accordion.Content>
          <div className="border-t px-4 pt-2">
            {weeklyData.map(({ week, total }) => (
              <div key={week} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-gray-500">{week}주차</span>
                <span className="text-xs font-medium">{total.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}
