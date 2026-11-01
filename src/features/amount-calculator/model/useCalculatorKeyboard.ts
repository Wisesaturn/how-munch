'use client';

import { useEffect } from 'react';

import { type CalculatorKey } from '../lib/calculatorInput';
import { type ExpressionOperator } from '../lib/expression';

const KEYBOARD_OPERATORS: Record<string, ExpressionOperator> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

/**
 * @description 키보드 입력을 계산기 키로 변환합니다. 계산기 키가 아니면 null을 돌려줍니다.
 */
function resolveCalculatorKey(key: string): CalculatorKey | null {
  if (/^\d$/.test(key)) return { type: 'digits', digits: key };
  if (KEYBOARD_OPERATORS[key]) return { type: 'operator', operator: KEYBOARD_OPERATORS[key] };
  if (key === '%') return { type: 'percent' };
  if (key === 'Backspace') return { type: 'backspace' };
  return null;
}

/**
 * @description 금액 칸이 키보드 입력을 받지 않으므로, PC에서는 계산기 화면이 키보드 입력을 받습니다.
 * Enter는 확인, Esc는 닫기로 동작합니다.
 */
export function useCalculatorKeyboard({
  onKeyPress,
  onConfirm,
  onClose,
}: {
  onKeyPress: (key: CalculatorKey) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(
    function registerCalculatorKeyboard() {
      function handleKeyDown(event: KeyboardEvent) {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        if (event.key === 'Enter') {
          // 포커스된 키패드 버튼이 Enter로 한 번 더 눌리지 않게 막는다
          event.preventDefault();
          onConfirm();
          return;
        }
        if (event.key === 'Escape') {
          onClose();
          return;
        }

        const calculatorKey = resolveCalculatorKey(event.key);
        if (!calculatorKey) return;
        event.preventDefault();
        onKeyPress(calculatorKey);
      }

      window.addEventListener('keydown', handleKeyDown);
      return function unregisterCalculatorKeyboard() {
        window.removeEventListener('keydown', handleKeyDown);
      };
    },
    [onKeyPress, onConfirm, onClose],
  );
}
