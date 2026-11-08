'use client';

import { useState } from 'react';

import { AppScreen } from '@stackflow/plugin-basic-ui';

import { CTAButton, ConfirmDialog } from '@/commons/ui';

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
  const { tokens, result, pressKey, isDirty, canConfirm, confirmValue } = useAmountCalculator({
    initialValue: value,
    nullable,
  });
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);

  function confirm() {
    if (canConfirm) onConfirm(confirmValue);
  }

  // 입력하던 값이 있으면 바로 닫지 않고 나갈지 한 번 더 묻는다
  function requestClose() {
    if (isDirty) {
      setIsLeaveConfirmOpen(true);
      return;
    }
    onClose();
  }

  function leave() {
    setIsLeaveConfirmOpen(false);
    onClose();
  }

  useCalculatorKeyboard({
    onKeyPress: pressKey,
    onConfirm: confirm,
    onClose: requestClose,
    enabled: !isLeaveConfirmOpen,
  });

  return (
    <AppScreen
      className="pointer-events-auto"
      appBar={{
        title,
        backButton: {
          ariaLabel: '뒤로가기',
          // 기본 pop 대신 onClose로 닫아 대기 중인 콜백을 함께 정리한다
          onClick: (event) => {
            event.preventDefault();
            requestClose();
          },
        },
      }}
    >
      <div className="flex h-full flex-col overflow-y-auto pb-28">
        <AmountCalculatorDisplay tokens={tokens} result={result} nullable={nullable} />
        <AmountCalculatorKeypad onKeyPress={pressKey} />
      </div>
      <CTAButton
        type="button"
        color="confirm"
        variant="filled"
        disabled={!canConfirm}
        onClick={confirm}
      >
        확인
      </CTAButton>
      <ConfirmDialog
        open={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
        title="나가시겠습니까?"
        description="지금 나가면 수정 사항이 반영되지 않아요"
        cancelLabel="계속 수정하기"
        confirmLabel="나가기"
        onConfirm={leave}
      />
    </AppScreen>
  );
}
