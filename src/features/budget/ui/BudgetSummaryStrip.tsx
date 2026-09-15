'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/commons/lib';
import { ProgressBar } from '@/commons/ui';

import { toBudgetAmountMap } from '@/entities/budget';

import { useBudgetDailySeriesQuery, useBudgetsQuery } from '../api/queries';
import { formatMonthLabel } from '../lib/budgetMonth';
import { sumSpentByScope } from '../lib/budgetSeries';

// 로딩 / 미설정 / 설정됨 세 상태의 높이를 같게 고정한다.
// 상태가 바뀔 때 높이가 달라지면 아래 내용이 밀려 올라갔다 내려오는 게 보인다.
const STRIP_CLASS = 'flex h-14 w-full items-center rounded-lg border px-3 text-left';

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
  const remaining = totalBudget - spent;
  const exceeded = remaining < 0;

  return (
    <button type="button" onClick={onOpenBudget} className={cn(STRIP_CLASS, 'gap-3 bg-white')}>
      {/* 진행바가 비율을 맡으므로 글자는 "앉아서 쓸 돈" 하나만 말한다 */}
      <ProgressBar value={spent} max={totalBudget} className="flex-1" />
      <span
        className={cn(
          'shrink-0 text-sm font-bold',
          // 진행바와 같은 기준으로 색을 맞춘다. 100%까지 초록, 넘으면 빨강.
          exceeded ? 'text-red-500' : 'text-emerald-600',
        )}
      >
        {exceeded
          ? `${Math.abs(remaining).toLocaleString()}원 초과`
          : `${remaining.toLocaleString()}원 남음`}
      </span>
      <ChevronRight className="size-4 shrink-0 text-gray-400" />
    </button>
  );
}
