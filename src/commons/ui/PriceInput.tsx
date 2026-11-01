'use client';

import * as React from 'react';

import { Calculator } from 'lucide-react';

import { cn } from '../lib';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/
interface PriceCalculatorRequest {
  /** 계산기 화면 제목 */
  title: string;
  /** 현재 금액. null이면 빈 상태로 연다 */
  value: number | null;
  /** 금액을 비운 채 확인할 수 있는지 여부 */
  nullable: boolean;
  onConfirm: (value: number | null) => void;
}

/** 계산기 화면을 여는 함수 — 화면 전환 방식은 Activity에서 정해 주입한다 */
type OpenPriceCalculator = (request: PriceCalculatorRequest) => void;

interface PriceInputBaseProps extends Omit<
  React.ComponentProps<'button'>,
  'value' | 'type' | 'onClick' | 'children' | 'title'
> {
  /** 계산기 화면 제목 */
  title?: string;
  invalid?: boolean;
  onOpenCalculator: OpenPriceCalculator;
}

interface RequiredPriceInputProps extends PriceInputBaseProps {
  nullable?: false;
  value: number;
  onValueChange: (value: number) => void;
}

interface NullablePriceInputProps extends PriceInputBaseProps {
  /** 빈칸(미설정)과 0을 구분해야 할 때 사용한다 */
  nullable: true;
  value: number | null;
  onValueChange: (value: number | null) => void;
}

type PriceInputProps = RequiredPriceInputProps | NullablePriceInputProps;

/* -------------------------------------------------------------------------------------------------
 * PriceInput
 * -----------------------------------------------------------------------------------------------*/
/** 금액 칸 — 누르면 계산기 화면을 열고, 확인한 금액을 값으로 받는다 */
function PriceInput(props: PriceInputProps) {
  const {
    title = '금액 입력',
    value,
    nullable = false,
    onValueChange: _onValueChange,
    onOpenCalculator,
    invalid,
    className,
    ...buttonProps
  } = props;

  function applyConfirmedValue(next: number | null) {
    if (props.nullable === true) {
      props.onValueChange(next);
      return;
    }
    if (next !== null) props.onValueChange(next);
  }

  const amountText = value === null ? '미설정' : `${value.toLocaleString('ko-KR')}원`;

  return (
    <button
      type="button"
      data-slot="price-input"
      aria-label={`${title}, 현재 ${amountText}, 계산기 열기`}
      data-invalid={invalid}
      className={cn(
        'flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-xs',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        'data-[invalid=true]:border-red-500',
        'disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400',
        className,
      )}
      onClick={() => onOpenCalculator({ title, value, nullable, onConfirm: applyConfirmedValue })}
      {...buttonProps}
    >
      <span
        className={cn('min-w-0 flex-1 truncate tabular-nums', value === null && 'text-gray-400')}
      >
        {value === null ? '미설정' : value.toLocaleString('ko-KR')}
      </span>
      {value === null ? null : <span className="font-medium text-gray-500">원</span>}
      <Calculator className="size-4 shrink-0 text-gray-400" aria-hidden />
    </button>
  );
}

export { PriceInput, type OpenPriceCalculator, type PriceCalculatorRequest, type PriceInputProps };
