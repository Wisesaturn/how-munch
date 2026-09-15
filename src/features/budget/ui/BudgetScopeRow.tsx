'use client';

import { ProgressBar } from '@/commons/ui';

import { getBudgetScopeLabel, type BudgetScope } from '@/entities/budget';

import { BudgetScopeIcon } from './BudgetScopeIcon';

/**
 * 예산 0원은 "0원으로 산다"는 명시적 목표다.
 * 0으로 나눌 수 없으므로, 한 푼이라도 썼으면 초과(101%)로 본다.
 */
function resolvePercentage(spent: number, amount: number): number {
  if (amount > 0) return Math.round((spent / amount) * 100);
  return spent > 0 ? 101 : 0;
}

interface BudgetScopeRowProps {
  scope: BudgetScope;
  spent: number;
  /** null이면 미설정 — 진행바 없이 쓴 금액만 보여준다 */
  amount: number | null;
}

export function BudgetScopeRow({ scope, spent, amount }: BudgetScopeRowProps) {
  const label = getBudgetScopeLabel(scope);

  if (amount === null) {
    return (
      <div className="flex items-center gap-3 py-4">
        <BudgetScopeIcon scope={scope} />
        <div className="flex min-w-0 flex-col">
          <span className="text-base font-medium text-gray-800">{label}</span>
          <span className="text-xs text-gray-400">미설정 예산</span>
        </div>
        <span className="ml-auto shrink-0 text-sm text-gray-400">
          {spent.toLocaleString()}원 사용
        </span>
      </div>
    );
  }

  const percentage = resolvePercentage(spent, amount);
  const exceeded = percentage > 100;

  return (
    <div className="flex flex-col gap-2.5 py-4">
      <div className="flex items-center gap-3">
        <BudgetScopeIcon scope={scope} />
        <span className="text-base font-medium text-gray-800">{label}</span>
        <span className="ml-auto shrink-0 text-sm text-gray-500">
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
