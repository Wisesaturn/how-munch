'use client';

import { CircleDashed } from 'lucide-react';

import { getBudgetScopeLabel, type BudgetScope } from '@/entities/budget';

interface BudgetUnsetRowProps {
  /** 예산을 정하지 않은 항목들 */
  scopes: BudgetScope[];
  /** 그 항목들에서 쓴 금액 합계 */
  spent: number;
}

/**
 * 예산을 정하지 않은 항목을 한 줄로 묶어 맨 아래에 둔다.
 * 항목마다 빈 진행바를 세우면 목록이 길어지기만 하고, 추적하지 않기로 한 것들이라 비교할 기준도 없다.
 */
export function BudgetUnsetRow({ scopes, spent }: BudgetUnsetRowProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <CircleDashed className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-medium text-gray-800">미설정 예산</span>
        <span className="truncate text-xs text-gray-400">
          {scopes.map(getBudgetScopeLabel).join(', ')}
        </span>
      </div>
      <span className="ml-auto shrink-0 text-sm font-semibold text-gray-700">
        {spent.toLocaleString()}원 사용
      </span>
    </div>
  );
}
