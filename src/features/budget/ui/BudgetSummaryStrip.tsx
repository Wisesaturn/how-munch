'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/commons/lib';
import { ProgressBar } from '@/commons/ui';

import { toBudgetAmountMap } from '@/entities/budget';

import { useBudgetDailySeriesQuery, useBudgetsQuery } from '../api/queries';
import { formatMonthLabel } from '../lib/budgetMonth';
import { sumSpentByScope } from '../lib/budgetSeries';

/**
 * 예산 0원은 "0원으로 산다"는 명시적 목표다.
 * 0으로 나눌 수 없으므로, 한 푼이라도 썼으면 초과(101%)로 본다.
 */
function resolvePercentage(spent: number, budget: number): number {
  if (budget > 0) return Math.round((spent / budget) * 100);
  return spent > 0 ? 101 : 0;
}

// 로딩 / 미설정 / 설정됨 세 상태의 높이를 같게 고정한다.
// 상태가 바뀔 때 높이가 달라지면 아래 내용이 밀려 올라갔다 내려오는 게 보인다.
const STRIP_CLASS = 'flex h-16 w-full items-center rounded-lg border px-3 text-left';

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
 * 식비 페이지 상단의 예산 요약.
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

  const totalBudget = toBudgetAmountMap(budgets ?? []).total;
  const monthLabel = formatMonthLabel(yearMonth);

  // 아직 모르는 단계에서도 같은 크기의 자리를 잡아둔다.
  if (!isSuccess) {
    return <div className={cn(STRIP_CLASS, 'border-dashed bg-white')} aria-hidden />;
  }

  if (totalBudget === null) {
    return (
      <button
        type="button"
        onClick={onOpenBudgetEdit}
        className={cn(STRIP_CLASS, 'justify-between border-dashed bg-white')}
      >
        <span className="text-base text-gray-600">{monthLabel} 예산이 없어요</span>
        <span className="flex items-center gap-0.5 text-sm font-medium text-emerald-600">
          설정
          <ChevronRight className="size-4" />
        </span>
      </button>
    );
  }

  const spent = sumSpentByScope(series, yearMonth).total;
  const percentage = resolvePercentage(spent, totalBudget);
  const remaining = totalBudget - spent;
  const exceeded = remaining < 0;

  return (
    <button type="button" onClick={onOpenBudget} className={cn(STRIP_CLASS, 'bg-white')}>
      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <ProgressBar value={spent} max={totalBudget} className="flex-1" />
          <span className="shrink-0 text-xs text-gray-500">예산 사용 {percentage}%</span>
          <ChevronRight className="size-3.5 shrink-0 text-gray-400" />
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-gray-400">
            {spent.toLocaleString()} / {totalBudget.toLocaleString()}원
          </span>
          <span className={cn('text-sm font-bold', exceeded ? 'text-red-500' : 'text-gray-900')}>
            {exceeded
              ? `${Math.abs(remaining).toLocaleString()}원 초과`
              : `${remaining.toLocaleString()}원 남음`}
          </span>
        </div>
      </div>
    </button>
  );
}
