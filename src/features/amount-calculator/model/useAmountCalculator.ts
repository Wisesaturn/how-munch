'use client';

import { useState } from 'react';

import {
  applyCalculatorKey,
  createCalculatorInput,
  type CalculatorKey,
} from '../lib/calculatorInput';
import { evaluateExpression, type ExpressionResult } from '../lib/expression';

/**
 * @description 결과 상태에 따라 확인 가능 여부와 입력할 금액을 정합니다.
 */
function resolveConfirmation(result: ExpressionResult, nullable: boolean) {
  if (result.status === 'ok') return { canConfirm: true, confirmValue: result.value };
  return { canConfirm: result.status === 'empty' && nullable, confirmValue: null };
}

/**
 * @description 계산기 입력 상태를 관리하고, 입력할 때마다 계산한 결과와 확인 가능 여부를 제공합니다.
 */
export function useAmountCalculator({
  initialValue,
  nullable,
}: {
  initialValue: number | null;
  nullable: boolean;
}) {
  const [input, setInput] = useState(() => createCalculatorInput(initialValue));
  const result = evaluateExpression(input.tokens);

  function pressKey(key: CalculatorKey) {
    setInput((current) => applyCalculatorKey(current, key));
  }

  return {
    tokens: input.tokens,
    result,
    pressKey,
    ...resolveConfirmation(result, nullable),
  };
}
