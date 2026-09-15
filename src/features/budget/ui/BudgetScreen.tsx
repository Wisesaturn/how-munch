'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { Button, EmptyState } from '@/commons/ui';

import {
  BUDGET_SCOPES,
  hasAnyBudget,
  toBudgetAmountMap,
  type BudgetAmountMap,
} from '@/entities/budget';

import { useBudgetDailySeriesQuery, useBudgetsQuery } from '../api/queries';
import { formatMonthLabel, getPreviousYearMonth, resolveSeriesDayLimit } from '../lib/budgetMonth';
import { buildCumulativeSeries, getDayCount, sumSpentByScope } from '../lib/budgetSeries';

import { BudgetCumulativeChart } from './BudgetCumulativeChart';
import { BudgetScopeRow } from './BudgetScopeRow';

interface BudgetScreenProps {
  onClose: () => void;
  onOpenEdit: () => void;
  householdId: string;
  /** 'YYYY-MM' — 식비 페이지가 보고 있던 달을 그대로 이어받는다 */
  yearMonth: string;
}

export function BudgetScreen({ onOpenEdit, householdId, yearMonth }: BudgetScreenProps) {
  const previousYearMonth = getPreviousYearMonth(yearMonth);
  const { data: budgets = [] } = useBudgetsQuery(householdId, yearMonth);
  const { data: series = [], isLoading } = useBudgetDailySeriesQuery(householdId, yearMonth);

  const amounts: BudgetAmountMap = toBudgetAmountMap(budgets);
  const spent = sumSpentByScope(series, yearMonth);
  const dayCount = getDayCount(yearMonth);
  const currentSeries = buildCumulativeSeries(
    series,
    yearMonth,
    resolveSeriesDayLimit(yearMonth, dayCount),
  );
  const previousSeries = buildCumulativeSeries(series, previousYearMonth);
  const monthLabel = formatMonthLabel(yearMonth);

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title: `${monthLabel} 예산 현황`,
        renderRight: () => (
          <Button variant="ghost" size="sm" onClick={onOpenEdit}>
            편집
          </Button>
        ),
      }}
    >
      <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span className="text-sm text-gray-400">불러오는 중...</span>
          </div>
        ) : (
          <>
            <section className="rounded-xl border bg-white px-3 py-4">
              <BudgetCumulativeChart
                currentSeries={currentSeries}
                previousSeries={previousSeries}
                dayCount={dayCount}
                budgetAmount={amounts.total}
                currentLabel={monthLabel}
                previousLabel={formatMonthLabel(previousYearMonth)}
              />
            </section>

            {hasAnyBudget(amounts) ? (
              <section className="divide-y rounded-xl border bg-white px-4 py-1">
                {BUDGET_SCOPES.map((scope) => (
                  <BudgetScopeRow
                    key={scope}
                    scope={scope}
                    spent={spent[scope]}
                    amount={amounts[scope]}
                  />
                ))}
              </section>
            ) : (
              <EmptyState.Root>
                <EmptyState.Content>
                  <EmptyState.Title>{monthLabel} 예산이 없어요</EmptyState.Title>
                  <EmptyState.Description>
                    예산을 설정하면 이번 달 지출을 목표와 비교할 수 있어요
                  </EmptyState.Description>
                  <Button className="mt-3" onClick={onOpenEdit}>
                    예산 설정하기
                  </Button>
                </EmptyState.Content>
              </EmptyState.Root>
            )}
          </>
        )}
      </div>
    </AppScreen>
  );
}
