'use client';

import { type ComponentProps } from 'react';

import { InputGroup } from '@/commons/ui';

interface BudgetAmountInputProps extends Omit<
  ComponentProps<typeof InputGroup.Input>,
  'value' | 'onChange'
> {
  /** null이면 미설정 — 빈칸으로 보여준다 */
  value: number | null;
  onValueChange: (value: number | null) => void;
  invalid?: boolean;
}

/**
 * 예산 금액 입력란.
 * 공용 PriceInput은 빈 입력을 min으로 되돌려서 "미설정"을 표현하지 못한다.
 * 예산은 빈칸(추적 안 함)과 0(0원으로 산다)이 다른 상태라 여기서는 null을 그대로 들고 있는다.
 */
export function BudgetAmountInput({
  value,
  onValueChange,
  invalid = false,
  className,
  ...props
}: BudgetAmountInputProps) {
  return (
    <InputGroup className={className}>
      <InputGroup.Input
        value={value === null ? '' : value.toLocaleString('ko-KR')}
        inputMode="numeric"
        pattern="[0-9,]*"
        placeholder="0"
        aria-invalid={invalid}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, '');
          onValueChange(digits ? Number.parseInt(digits, 10) : null);
        }}
        {...props}
      />
      <InputGroup.Addon align="inline-end">
        <InputGroup.Text className="px-2 text-sm font-medium text-gray-500">원</InputGroup.Text>
      </InputGroup.Addon>
    </InputGroup>
  );
}
