'use client';

import { cn } from '@/commons/lib';
import { BottomSheet, CTAPrimitive, Drawer } from '@/commons/ui';

import {
  BUDGET_ITEM_SCOPES,
  getBudgetScopeLabel,
  sumItemBudgets,
  type BudgetAmountMap,
  type BudgetScope,
} from '@/entities/budget';

import { BudgetScopeIcon } from './BudgetScopeIcon';

/** 비중 막대와 row 점이 같은 색을 쓰도록 scope별로 묶었다 */
const SCOPE_TONE: Record<BudgetScope, string> = {
  total: 'bg-emerald-600',
  grocery: 'bg-emerald-600',
  restaurant: 'bg-emerald-400',
  delivery: 'bg-emerald-200',
};

interface BudgetCopyBottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** 그대로 적용 — 직전 달 금액을 폼에 채운다 */
  onApply: () => void;
  previousMonthLabel: string;
  previousAmounts: BudgetAmountMap;
}

/**
 * 직전 달 예산 복사 제안 시트.
 * 예산 편집 화면에 들어온 사용자는 이미 "예산을 다루겠다"는 의도를 밝힌 상태라,
 * 여기서만 띄우면 dismiss 상태를 어디에 저장할지 같은 문제가 생기지 않는다.
 */
export function BudgetCopyBottomSheet({
  open,
  onClose,
  onApply,
  previousMonthLabel,
  previousAmounts,
}: BudgetCopyBottomSheetProps) {
  const itemSum = sumItemBudgets(previousAmounts);
  // 전체 예산이 없으면 항목 합계를 기준으로 비중을 계산한다
  const base = previousAmounts.total ?? itemSum;

  return (
    <BottomSheet.Root open={open} onClose={onClose}>
      <BottomSheet.Header className="flex-col items-start gap-1 border-b-0 px-5 pt-3 pb-2">
        <Drawer.Title className="text-xl leading-snug font-bold text-gray-900">
          {previousMonthLabel} 예산을
          <br />
          그대로 쓸까요?
        </Drawer.Title>
        <Drawer.Description className="text-sm text-gray-500">
          항목별 금액까지 한 번에 채워져요
        </Drawer.Description>
      </BottomSheet.Header>

      <BottomSheet.Content className="flex flex-col gap-2 px-5 pt-3 pb-2">
        <section className="rounded-2xl bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">
              {getBudgetScopeLabel('total')} 예산
            </span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">
              {base.toLocaleString()}
              <span className="ml-0.5 text-lg font-semibold">원</span>
            </span>
          </div>

          {itemSum > 0 && (
            <div
              aria-hidden
              data-slot="budget-copy-ratio-bar"
              className="mt-3 flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-gray-200"
            >
              {BUDGET_ITEM_SCOPES.map((scope) => {
                const amount = previousAmounts[scope] ?? 0;
                if (amount === 0) return null;
                return (
                  <span
                    key={scope}
                    className={cn('h-full', SCOPE_TONE[scope])}
                    style={{ width: `${(amount / Math.max(base, itemSum)) * 100}%` }}
                  />
                );
              })}
            </div>
          )}
        </section>

        <ul className="flex flex-col">
          {BUDGET_ITEM_SCOPES.map((scope) => {
            const amount = previousAmounts[scope];
            const ratio = amount && base > 0 ? Math.round((amount / base) * 100) : null;

            return (
              <li key={scope} className="flex items-center gap-3 py-3">
                <BudgetScopeIcon scope={scope} className="size-10" />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-medium text-gray-800">
                    {getBudgetScopeLabel(scope)}
                  </span>
                  {ratio !== null && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <span
                        aria-hidden
                        className={cn('size-1.5 rounded-full', SCOPE_TONE[scope])}
                      />
                      {ratio}%
                    </span>
                  )}
                </div>
                {amount === null ? (
                  <span className="ml-auto text-sm text-gray-300">미설정</span>
                ) : (
                  <span className="ml-auto text-base font-semibold text-gray-900 tabular-nums">
                    {amount.toLocaleString()}원
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </BottomSheet.Content>

      <BottomSheet.Footer className="flex-row px-5 pt-2 pb-6">
        <CTAPrimitive type="button" variant="subtle" color="cancel" onClick={onClose}>
          수정하기
        </CTAPrimitive>
        <CTAPrimitive type="button" onClick={onApply}>
          그대로 적용
        </CTAPrimitive>
      </BottomSheet.Footer>
    </BottomSheet.Root>
  );
}
