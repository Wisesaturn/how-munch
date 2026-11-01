'use client';

import { AppScreen } from '@stackflow/plugin-basic-ui';
import { ChevronLeft } from 'lucide-react';

import { Button, CTAPrimitive } from '@/commons/ui';

import { useAmountCalculator } from '../model/useAmountCalculator';
import { useCalculatorKeyboard } from '../model/useCalculatorKeyboard';

import { AmountCalculatorDisplay } from './AmountCalculatorDisplay';
import { AmountCalculatorKeypad } from './AmountCalculatorKeypad';

interface AmountCalculatorScreenProps {
  /** 화면 제목 (예: "금액 입력") */
  title: string;
  /** 현재 금액. null이면 빈 상태로 시작한다 */
  value: number | null;
  /** 금액을 비운 채 확인할 수 있는지 여부 */
  nullable: boolean;
  /** 화면 닫기 핸들러 (Activity에서 주입) */
  onClose: () => void;
  /** 금액 확정 핸들러 (Activity에서 주입) */
  onConfirm: (value: number | null) => void;
}

/** 금액 계산기 Screen — onClose/onConfirm을 Activity에서 주입받아 동작한다 */
export function AmountCalculatorScreen({
  title,
  value,
  nullable,
  onClose,
  onConfirm,
}: AmountCalculatorScreenProps) {
  const { tokens, result, pressKey, canConfirm, confirmValue } = useAmountCalculator({
    initialValue: value,
    nullable,
  });

  function confirm() {
    if (canConfirm) onConfirm(confirmValue);
  }

  useCalculatorKeyboard({ onKeyPress: pressKey, onConfirm: confirm, onClose });

  return (
    <AppScreen
      className="pointer-events-auto"
      backgroundColor="#f3f4f6"
      appBar={{
        title,
        backButton: {
          render: () => (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="뒤로가기"
            >
              <ChevronLeft className="size-5" />
            </Button>
          ),
        },
      }}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <AmountCalculatorDisplay tokens={tokens} result={result} nullable={nullable} />
        <AmountCalculatorKeypad onKeyPress={pressKey} />
        <div className="safe-area-padding-bottom shrink-0 px-3 pt-3 pb-3">
          <CTAPrimitive type="button" disabled={!canConfirm} onClick={confirm}>
            확인
          </CTAPrimitive>
        </div>
      </div>
    </AppScreen>
  );
}
