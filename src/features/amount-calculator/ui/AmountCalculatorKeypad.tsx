'use client';

import { type ReactNode } from 'react';

import { motion, useReducedMotion } from 'framer-motion';
import { Delete } from 'lucide-react';

import { cn, cva, type VariantProps } from '@/commons/lib';

import { type CalculatorKey } from '../lib/calculatorInput';

const keyVariants = cva(
  'grid place-items-center rounded-2xl font-medium tabular-nums shadow-xs focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none',
  {
    variants: {
      kind: {
        number: 'bg-gray-100 text-2xl text-gray-900',
        compactNumber: 'bg-gray-100 text-xl text-gray-900',
        utility: 'bg-gray-200 text-lg font-semibold text-gray-900',
        operator: 'bg-emerald-100 text-3xl text-emerald-700',
        tallOperator: 'row-span-2 bg-emerald-100 text-3xl text-emerald-700',
      },
    },
  },
);

interface KeypadKey extends Required<VariantProps<typeof keyVariants>> {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  key: CalculatorKey;
}

function numberKey(digits: string): KeypadKey {
  return {
    id: digits,
    label: digits,
    kind: digits.length > 1 ? 'compactNumber' : 'number',
    key: { type: 'digits', digits },
  };
}

/** 키패드 배치 — 키를 바꿀 때는 이 목록만 수정한다 */
const KEYPAD_KEYS: KeypadKey[] = [
  {
    id: 'backspace',
    label: <Delete className="size-6" aria-hidden />,
    ariaLabel: '한 글자 지우기',
    kind: 'utility',
    key: { type: 'backspace' },
  },
  { id: 'clear', label: 'AC', ariaLabel: '모두 지우기', kind: 'utility', key: { type: 'clear' } },
  { id: 'percent', label: '%', ariaLabel: '퍼센트', kind: 'utility', key: { type: 'percent' } },
  {
    id: 'divide',
    label: '÷',
    ariaLabel: '나누기',
    kind: 'operator',
    key: { type: 'operator', operator: '÷' },
  },
  numberKey('7'),
  numberKey('8'),
  numberKey('9'),
  {
    id: 'multiply',
    label: '×',
    ariaLabel: '곱하기',
    kind: 'operator',
    key: { type: 'operator', operator: '×' },
  },
  numberKey('4'),
  numberKey('5'),
  numberKey('6'),
  {
    id: 'subtract',
    label: '−',
    ariaLabel: '빼기',
    kind: 'operator',
    key: { type: 'operator', operator: '−' },
  },
  numberKey('1'),
  numberKey('2'),
  numberKey('3'),
  {
    id: 'add',
    label: '+',
    ariaLabel: '더하기',
    kind: 'tallOperator',
    key: { type: 'operator', operator: '+' },
  },
  numberKey('00'),
  numberKey('0'),
  numberKey('000'),
];

interface AmountCalculatorKeypadProps {
  onKeyPress: (key: CalculatorKey) => void;
}

/** 계산기 키패드 — 어떤 키가 눌렸는지만 알리고 입력 해석은 하지 않는다 */
export function AmountCalculatorKeypad({ onKeyPress }: AmountCalculatorKeypadProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      data-slot="amount-calculator-keypad"
      className="grid shrink-0 auto-rows-[3.75rem] grid-cols-4 gap-2 px-4"
    >
      {KEYPAD_KEYS.map(({ id, label, ariaLabel, kind, key }) => (
        <motion.button
          key={id}
          type="button"
          aria-label={ariaLabel}
          data-slot="amount-calculator-key"
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
          className={cn(keyVariants({ kind }))}
          onClick={() => onKeyPress(key)}
        >
          {label}
        </motion.button>
      ))}
    </div>
  );
}
