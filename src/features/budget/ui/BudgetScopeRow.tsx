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
  const exceeded = percentage > 100;

  return (
    <div className="flex flex-col gap-2.5 py-4">
      <div className="flex items-center gap-3">
        <BudgetScopeIcon scope={scope} />
        <span className="text-base font-medium text-gray-800">{getBudgetScopeLabel(scope)}</span>
        <span className="ml-auto shrink-0 text-sm font-semibold text-gray-700">
          {spent.toLocaleString()} / {amount.toLocaleString()}원
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
