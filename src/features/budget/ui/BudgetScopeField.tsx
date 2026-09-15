'use client';

import { type ReactNode } from 'react';

import { BudgetAmountInput } from './BudgetAmountInput';

interface BudgetScopeFieldProps {
  icon: ReactNode;
  label: string;
  /** 직전 달 같은 카테고리 지출 — 얼마를 적을지 가늠하는 기준 */
  lastMonthSpent: number;
  value: number | null;
  onValueChange: (value: number | null) => void;
}

/** 예산 편집 화면의 카테고리 한 줄 */
export function BudgetScopeField({
  icon,
  label,
  lastMonthSpent,
  value,
  onValueChange,
}: BudgetScopeFieldProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      {icon}
      <div className="flex min-w-0 flex-col">
        <span className="text-base font-medium text-gray-800">{label}</span>
        <span className="text-xs text-gray-400">지난달 {lastMonthSpent.toLocaleString()}원</span>
      </div>
      <BudgetAmountInput
        className="ml-auto w-44 shrink-0"
        value={value}
        onValueChange={onValueChange}
        aria-label={`${label} 예산`}
      />
    </div>
  );
}
