'use client';

import { ChevronRight } from 'lucide-react';

import { ProgressBar } from '@/commons/ui';

import { toBudgetAmountMap } from '@/entities/budget';

import { useBudgetDailySeriesQuery, useBudgetsQuery } from '../api/queries';
import { formatMonthLabel } from '../lib/budgetMonth';
import { sumSpentByScope } from '../lib/budgetSeries';

interface BudgetSummaryStripProps {
  householdId: string;
  /** 'YYYY-MM' */
  yearMonth: string;
  /** 예산 현황 화면으로 이동 */
  onOpenBudget: () => void;
  /** 예산 편집 화면으로 직행 (미설정 배너) */
  onOpenBudgetEdit: () => void;
}

/**
 * 식비 페이지 상단의 한 줄 예산 요약.
 * 예산이 없으면 설정 배너로 바뀌어 편집 화면으로 바로 보낸다.
 */
export function BudgetSummaryStrip({
  householdId,
  yearMonth,
  onOpenBudget,
  onOpenBudgetEdit,
}: BudgetSummaryStripProps) {
  const { data: budgets, isSuccess } = useBudgetsQuery(householdId, yearMonth);
  const { data: series = [] } = useBudgetDailySeriesQuery(householdId, yearMonth);

  if (!isSuccess) return null;

  const totalBudget = toBudgetAmountMap(budgets ?? []).total;
  const monthLabel = formatMonthLabel(yearMonth);

  if (totalBudget === null) {
    return (
      <button
        type="button"
        onClick={onOpenBudgetEdit}
        className="flex w-full items-center justify-between rounded-lg border border-dashed bg-white px-3 py-2.5 text-left"
      >
        <span className="text-sm text-gray-500">{monthLabel} 예산이 없어요</span>
        <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600">
          설정
          <ChevronRight className="size-3.5" />
        </span>
      </button>
    );
  }

  const spent = sumSpentByScope(series, yearMonth).total;

  return (
    <button
      type="button"
      onClick={onOpenBudget}
      className="flex w-full items-center gap-3 rounded-lg border bg-white px-3 py-2.5 text-left"
    >
      <ProgressBar value={spent} max={totalBudget} className="flex-1" />
      <span className="shrink-0 text-xs text-gray-500">
        {spent.toLocaleString()} / {totalBudget.toLocaleString()}원
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-gray-400" />
    </button>
  );
}
