'use client';

import { type ReactNode } from 'react';

import { stackFlowActions, StackFlowStack } from '@/apps/stackflow/StackFlow';

import {
  AmountCalculatorOpenerProvider,
  setPendingAmountCalculatorCallback,
  type OpenAmountCalculatorOptions,
} from '@/entities/amount-calculator';

function openAmountCalculator({ title, value, nullable, onConfirm }: OpenAmountCalculatorOptions) {
  setPendingAmountCalculatorCallback(onConfirm);
  stackFlowActions.push('AmountCalculatorActivity', {
    title,
    // history-sync가 params를 URL로 직렬화하므로 없는 값은 키째 뺀다
    ...(value === null ? {} : { value }),
    ...(nullable ? { nullable } : {}),
  });
}

export function StackFlowProvider({ children }: { children: ReactNode }) {
  return (
    <AmountCalculatorOpenerProvider openAmountCalculator={openAmountCalculator}>
      {children}
      <StackFlowStack />
    </AmountCalculatorOpenerProvider>
  );
}
