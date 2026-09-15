'use client';

import { Bike, ShoppingCart, UtensilsCrossed, Wallet } from 'lucide-react';

import { cn } from '@/commons/lib';

import { type BudgetScope } from '@/entities/budget';

const SCOPE_ICON = {
  total: Wallet,
  grocery: ShoppingCart,
  restaurant: UtensilsCrossed,
  delivery: Bike,
} as const satisfies Record<BudgetScope, typeof Wallet>;

interface BudgetScopeIconProps {
  scope: BudgetScope;
  className?: string;
}

/** 예산 scope 아이콘 — 편집 화면과 현황 화면이 같은 그림을 쓰도록 한곳에 모았다 */
export function BudgetScopeIcon({ scope, className }: BudgetScopeIconProps) {
  const Icon = SCOPE_ICON[scope];

  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600',
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
