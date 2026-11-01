'use client';

import { createSafeContext } from '@/commons/lib';

export interface OpenAmountCalculatorOptions {
  /** 계산기 화면 제목 */
  title: string;
  /** 현재 금액. null이면 빈 상태로 연다 */
  value: number | null;
  /** 금액을 비운 채 확인할 수 있는지 여부 */
  nullable: boolean;
  onConfirm: (value: number | null) => void;
}

interface AmountCalculatorOpenerContextValue {
  openAmountCalculator: (options: OpenAmountCalculatorOptions) => void;
}

/**
 * @description 계산기를 여는 방법을 앱 레이어에서 주입받는 Context입니다.
 * 금액 칸은 "열어줘"만 요청하고, 화면 전환 방식(Stackflow)은 알지 못합니다.
 */
export const [AmountCalculatorOpenerProvider, useAmountCalculatorOpener] =
  createSafeContext<AmountCalculatorOpenerContextValue>('AmountCalculatorOpener');
