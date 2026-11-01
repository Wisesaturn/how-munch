'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/commons/lib';

import { formatExpression, type ExpressionResult, type ExpressionToken } from '../lib/expression';

const ERROR_MESSAGE: Partial<Record<ExpressionResult['status'], string>> = {
  divideByZero: '0으로 나눌 수 없어요. 나누는 수를 바꿔 주세요.',
  negative: '금액은 0원 이상이어야 해요. 수식을 고쳐 주세요.',
  tooLarge: '입력할 수 있는 금액을 넘었어요. 수식을 고쳐 주세요.',
};

function resolveNotice(result: ExpressionResult, nullable: boolean) {
  if (result.status === 'empty' && nullable) return '비워두고 확인하면 미설정으로 둘 수 있어요';
  if (result.status === 'ok' && result.rounded) return '소수점 아래는 반올림해서 입력해요';
  return '';
}

function hasVisibleExpression(tokens: ExpressionToken[]) {
  return tokens.length > 1 || tokens.some((token) => token.type === 'number' && token.percent);
}

interface AmountCalculatorDisplayProps {
  tokens: ExpressionToken[];
  result: ExpressionResult;
  nullable: boolean;
}

/** 입력한 수식과 계산 결과를 보여주는 영역 */
export function AmountCalculatorDisplay({
  tokens,
  result,
  nullable,
}: AmountCalculatorDisplayProps) {
  const expressionRef = useRef<HTMLDivElement>(null);
  const expression = hasVisibleExpression(tokens) ? formatExpression(tokens) : '';
  const errorMessage = ERROR_MESSAGE[result.status];
  const amountText = 'value' in result ? result.value.toLocaleString('ko-KR') : null;

  useEffect(
    function scrollExpressionToLatest() {
      const element = expressionRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    },
    [expression],
  );

  return (
    <div
      data-slot="amount-calculator-display"
      className="flex min-h-32 flex-1 flex-col justify-end gap-1 px-4 pt-2 pb-3 text-right"
    >
      <div
        ref={expressionRef}
        aria-label="입력한 수식"
        className="max-h-[4.5rem] overflow-y-auto text-lg wrap-anywhere text-gray-600 tabular-nums"
      >
        {expression}
      </div>
      <div
        aria-live="polite"
        className={cn(
          'font-bold wrap-anywhere tabular-nums',
          amountText && amountText.length > 12 ? 'text-3xl' : 'text-4xl',
          result.status === 'empty' && 'text-gray-400',
        )}
      >
        {result.status === 'divideByZero' ? '–' : null}
        {result.status === 'empty' && nullable ? '미설정' : null}
        {result.status === 'empty' && !nullable ? '0원' : null}
        {amountText ? `${amountText}원` : null}
      </div>
      <p
        className={cn(
          'min-h-5 text-sm',
          errorMessage ? 'font-medium text-red-600' : 'text-gray-500',
        )}
      >
        {errorMessage ?? resolveNotice(result, nullable)}
      </p>
    </div>
  );
}
