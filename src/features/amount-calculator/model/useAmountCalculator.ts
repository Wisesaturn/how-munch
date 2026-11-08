'use client';

import { useState } from 'react';

import { isEqual } from 'es-toolkit';

import {
  applyCalculatorKey,
  createCalculatorInput,
  type CalculatorKey,
} from '../lib/calculatorInput';
import { evaluateExpression, type ExpressionResult } from '../lib/expression';

/**
 * @description 결과 상태에 따라 확인 가능 여부와 입력할 금액을 정합니다.
 * 0원이거나 기존 금액과 같으면 확인할 수 없습니다.
 */
function resolveConfirmation(
  result: ExpressionResult,
  { initialValue, nullable }: { initialValue: number | null; nullable: boolean },
) {
  if (result.status === 'ok') {
    const canConfirm = result.value > 0 && result.value !== initialValue;
    return { canConfirm, confirmValue: result.value };
  }
  const canConfirm = result.status === 'empty' && nullable && initialValue !== null;
  return { canConfirm, confirmValue: null };
}

/**
 * @description 계산기 입력 상태를 관리하고, 입력할 때마다 계산한 결과와 확인 가능 여부를 제공합니다.
 * 처음 열었을 때와 입력이 달라졌는지(isDirty)도 함께 알려 줍니다.
 */
export function useAmountCalculator({
  initialValue,
  nullable,
}: {
  initialValue: number | null;
  nullable: boolean;
}) {
  const [initialInput] = useState(() => createCalculatorInput(initialValue));
  const [input, setInput] = useState(initialInput);
  const result = evaluateExpression(input.tokens);

  function pressKey(key: CalculatorKey) {
    setInput((current) => applyCalculatorKey(current, key));
  }

  return {
    tokens: input.tokens,
    result,
    pressKey,
    isDirty: !isEqual(input.tokens, initialInput.tokens),
    ...resolveConfirmation(result, { initialValue, nullable }),
  };
}
