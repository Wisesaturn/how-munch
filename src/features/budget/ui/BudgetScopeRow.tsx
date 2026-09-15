'use client';

import { ProgressBar } from '@/commons/ui';

import { getBudgetScopeLabel, type BudgetScope } from '@/entities/budget';

import { resolveBudgetPercentage } from '../lib/budgetSeries';

import { BudgetScopeIcon } from './BudgetScopeIcon';

interface BudgetScopeRowProps {
  scope: BudgetScope;
  spent: number;
  amount: number;
}

/** 예산을 설정한 항목 한 줄. 설정하지 않은 항목은 BudgetUnsetRow로 묶인다. */
export function BudgetScopeRow({ scope, spent, amount }: BudgetScopeRowProps) {
  const percentage = resolveBudgetPercentage(spent, amount);
  const remaining = amount - spent;
  // percentage는 반올림이라 300,001/300,000처럼 근소한 초과를 100%로 뭉갠다.
  // 초과 판정은 반올림을 타지 않는 잔액 기준으로 통일한다.
  const exceeded = remaining < 0;

  return (
    <div className="flex flex-col gap-2.5 py-4">
      <div className="flex items-center gap-3">
        <BudgetScopeIcon scope={scope} />
        <span className="text-base font-medium text-gray-800">{getBudgetScopeLabel(scope)}</span>
        <span
          className={`ml-auto shrink-0 text-sm font-semibold ${
            exceeded ? 'text-red-500' : 'text-gray-700'
          }`}
        >
          {exceeded
            ? `${Math.abs(remaining).toLocaleString()}원 초과`
            : `${remaining.toLocaleString()}원 남음`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={spent} max={amount} className="h-2.5 flex-1" />
        <span
          className={`w-12 shrink-0 text-right text-sm font-bold ${
            exceeded ? 'text-red-500' : 'text-emerald-600'
          }`}
        >
          {percentage}%
        </span>
      </div>
    </div>
  );
}
