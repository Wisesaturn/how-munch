'use client';

import { BottomSheet, Button } from '@/commons/ui';

import { BUDGET_SCOPES, getBudgetScopeLabel, type BudgetAmountMap } from '@/entities/budget';

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
  const summary = BUDGET_SCOPES.filter((scope) => previousAmounts[scope] !== null)
    .map((scope) => `${getBudgetScopeLabel(scope)} ${previousAmounts[scope]!.toLocaleString()}`)
    .join(' / ');

  return (
    <BottomSheet.Root open={open} onClose={onClose}>
      <BottomSheet.Header heading={`${previousMonthLabel} 예산을 그대로 쓸까요?`} />
      <BottomSheet.Content className="flex flex-col gap-4 px-4 pt-1 pb-6">
        <p className="text-sm text-gray-500">{summary}</p>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            수정하기
          </Button>
          <Button className="flex-1" onClick={onApply}>
            그대로 적용
          </Button>
        </div>
      </BottomSheet.Content>
    </BottomSheet.Root>
  );
}
